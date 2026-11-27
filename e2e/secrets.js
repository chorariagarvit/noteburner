/**
 * Throwaway credentials for the end-to-end tests.
 *
 * They are generated on every run instead of written into the test files, so no password-shaped string is
 * committed (secret scanners flag those, even in tests) and no test can pass only because a known password
 * happens to be reused somewhere. Each value satisfies the signup rules: upper and lower case, a digit and a symbol.
 */
import crypto from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';

/** A new strong password, e.g. `Tp7!3fa91c2b8d4e`. `hint` only makes failures easier to read. */
export function randomPassword(hint = 'Tp') {
  const body = crypto.randomBytes(8).toString('hex');
  return `${hint[0].toUpperCase()}${hint.slice(1).toLowerCase()}7!${body}`;
}

/** A new random token-like string. */
export function randomToken(prefix = 'tok') {
  return `${prefix}-${crypto.randomBytes(9).toString('hex')}`;
}

/**
 * A `--var NAME:value` set by the local dev server's start command (backend/package.json), so the tests that must
 * match the dev server read it from there instead of repeating the value.
 */
export function devServerVar(name) {
  const dev = JSON.parse(readFileSync(path.resolve(process.cwd(), 'backend/package.json'), 'utf8')).scripts.dev;
  const match = new RegExp(`--var ${name}:(\\S+)`).exec(dev);
  if (!match) throw new Error(`backend/package.json "dev" script does not set ${name}`);
  return match[1];
}
