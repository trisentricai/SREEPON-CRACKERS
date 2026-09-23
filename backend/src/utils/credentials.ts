import path from 'node:path';

/** Resolve a value from the masked Firebase private key (see docs/setup.md). */
export function unmaskPrivateKey(value: string | undefined): string | undefined {
  if (!value) return undefined;
  if (value.includes('\\n')) {
    return value.replace(/\\n/g, '\n');
  }
  return value;
}

/** In development, allow loading a service-account JSON file from disk. */
export function resolveFirebaseCredential(
  projectId: string | undefined,
  clientEmail: string | undefined,
  privateKey: string | undefined,
  serviceAccountPath: string | undefined,
):
  | { type: 'file'; path: string }
  | { type: 'env'; projectId: string; clientEmail: string; privateKey: string }
  | undefined {
  if (serviceAccountPath) {
    return { type: 'file', path: path.isAbsolute(serviceAccountPath) ? serviceAccountPath : path.resolve(serviceAccountPath) };
  }
  if (projectId && clientEmail && privateKey) {
    return { type: 'env', projectId, clientEmail, privateKey: unmaskPrivateKey(privateKey) ?? privateKey };
  }
  return undefined;
}