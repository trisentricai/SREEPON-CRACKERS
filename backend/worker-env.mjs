// Worker bindings -> process.env bridge (ESM so `cloudflare:workers` is a
// static import — workerd rejects dynamic `require()` of `cloudflare:*`
// modules, which is what would happen from inside the CommonJS `dist/` code).
//
// This module MUST be imported before `./dist/app.js` in `worker.mjs`: ESM
// sibling modules evaluate in source order, so `src/config/env` (which parses
// `process.env` at module load) sees the bindings.

import { env as workerEnv } from 'cloudflare:workers';

for (const [key, value] of Object.entries(workerEnv)) {
  if (typeof value === 'string' && process.env[key] === undefined) {
    process.env[key] = value;
  }
}

export {};