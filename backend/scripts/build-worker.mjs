/**
 * Pre-bundle the Cloudflare Workers entry before Wrangler deploys it.
 *
 * Two Cloudflare-specific problems make Wrangler's own bundling unusable for
 * this app, so we bundle first and point `main` at the result:
 *
 * 1) iconv-lite (via express -> body-parser -> raw-body) ships a `browser`
 *    field that maps `./lib/streams` and `./lib/extend-node` to `false`.
 *    Wrangler bundles with the `browser` condition, so those modules become
 *    empty `(disabled)` stubs and the app crashes at boot with
 *    `require_streams(...) is not a function`. We bundle with
 *    `platform: "neutral"` and without the `browser` condition so the browser
 *    field stays inert, while still resolving `@prisma/client` to its WASM
 *    engine variant via the `workerd`/`worker` conditions.
 *
 * 2) In ESM output esbuild turns a CommonJS `require("fs")` into a runtime
 *    `__require("fs")` call, which workerd rejects with
 *    `Dynamic require of "fs" is not supported`. Wrangler avoids this by
 *    resolving Node builtins to virtual CJS shim modules that statically
 *    import the builtin (see the `node-built-in-modules:*` modules it emits).
 *    We replicate that with the plugin below.
 *
 * Node builtins are otherwise left as external `node:*` imports, which
 * nodejs_compat provides at runtime. `cloudflare:*` modules stay external too.
 * The Prisma query engine `.wasm` is copied next to the bundle so Wrangler's
 * own bundler can turn the dynamic import into a Cloudflare wasm module.
 */
import { build } from 'esbuild';
import { copyFileSync, mkdirSync } from 'node:fs';
import { builtinModules } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url)) + '/..';

// Complete list of Node builtins (including subpaths like `fs/promises`).
const nodeBuiltins = new Set(
  builtinModules.map((name) => name.replace(/^node:/, '')),
);

/**
 * Mirror Wrangler's nodejs-compat behaviour: route every Node builtin import
 * to a virtual CommonJS module that statically imports `node:<name>` and
 * re-exports it. This keeps requires resolvable (no runtime `require` calls)
 * while nodejs_compat supplies the actual implementations.
 */
function nodeBuiltinsPlugin() {
  const namespace = 'cf-node-builtin-shim';
  return {
    name: 'cf-node-builtins',
    setup(pluginBuild) {
      // Imports made *from inside* a shim module must be the real builtins,
      // otherwise the shim would resolve to itself.
      pluginBuild.onResolve({ filter: /.*/, namespace }, (args) => ({
        path: args.path,
        external: true,
      }));
      pluginBuild.onResolve({ filter: /.*/ }, (args) => {
        const bare = args.path.replace(/^node:/, '');
        if (nodeBuiltins.has(bare)) {
          return { path: bare, namespace };
        }
        return undefined;
      });
      pluginBuild.onLoad({ filter: /.*/, namespace }, (args) => ({
        loader: 'js',
        contents: `import mod from "node:${args.path}";\nmodule.exports = mod;\n`,
      }));
    },
  };
}

async function main() {
  mkdirSync(join(root, 'dist'), { recursive: true });

  // Prisma's WASM query engine: the generated client dynamically imports
  // `./query_engine_bg.wasm`. We keep that import external so Wrangler's own
  // bundler can turn it into a Cloudflare wasm module (default export =
  // WebAssembly.Module). Because our pre-bundle collapses the graph into
  // dist/worker.bundle.mjs, the relative specifier is re-based there, so the
  // .wasm file must sit next to the bundle for Wrangler to resolve it.
  const wasmSource = join(root, 'node_modules/.prisma/client/query_engine_bg.wasm');
  copyFileSync(wasmSource, join(root, 'dist', 'query_engine_bg.wasm'));

  await build({
    entryPoints: [join(root, 'worker.mjs')],
    bundle: true,
    format: 'esm',
    platform: 'neutral',
    // Deliberately omit "browser": it activates package `browser` fields,
    // which is what breaks iconv-lite. Keep the workerd/worker conditions so
    // Prisma selects its WASM engine client (and the `workerd` wasm loader).
    conditions: ['workerd', 'worker'],
    mainFields: ['module', 'main'],
    target: 'es2022',
    outfile: join(root, 'dist', 'worker.bundle.mjs'),
    external: ['cloudflare:workers', 'cloudflare:node', '*.wasm'],
    plugins: [nodeBuiltinsPlugin()],
    logLevel: 'warning',
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});