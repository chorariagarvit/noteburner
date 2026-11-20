import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

export const EXT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const read = (f) => fs.readFileSync(path.join(EXT, f), 'utf8');

/**
 * extension/crypto.js is a classic browser script (top-level function declarations, no exports).
 * Evaluate it in this realm with an injectable `fetch` and return the functions we want to test.
 */
export function loadCrypto(fetchImpl = () => { throw new Error('fetch not mocked'); }) {
  const quiet = { log() {}, error() {}, warn() {}, info() {} }; // the script logs a lot; keep test output readable
  // Compile the classic script as a function body in this realm (so results compare equal with
  // host objects) with only `fetch` and `console` overridden.
  const factory = vm.compileFunction(
    `${read('crypto.js')}\nreturn { createSecureMessage, encryptMessage, deriveAuthTag, deriveKey, generatePassword };`,
    ['fetch', 'console'],
    { filename: path.join(EXT, 'crypto.js') },
  );
  return factory(fetchImpl, quiet);
}

/** Minimal fetch Response stand-in. */
export function res(status, body, headers = {}) {
  const isJson = body !== undefined && typeof body === 'object';
  const text = isJson ? JSON.stringify(body) : String(body ?? '');
  const h = { 'content-type': isJson ? 'application/json' : 'text/html', ...headers };
  return {
    ok: status >= 200 && status < 300, status, statusText: `status ${status}`,
    headers: { get: (k) => h[k.toLowerCase()] ?? null },
    text: async () => text, json: async () => JSON.parse(text),
  };
}
