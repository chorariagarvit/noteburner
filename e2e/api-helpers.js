/** Shared helpers for the API-level specs (security-api, concurrency, api-v1, account-lifecycle). */
import { expect } from '@playwright/test';
import { execSync } from 'node:child_process';
import crypto from 'node:crypto';
import path from 'node:path';
import { encryptMessage, deriveAuthTag } from '../frontend/src/utils/crypto.js';

export const API = 'http://localhost:8787/api';
export const IV = Buffer.alloc(16).toString('base64'); // 16 zero bytes (a valid, fixed test IV)
// Random per run: satisfies the password policy (upper, lower, digit, symbol, length) without a fixed credential in the repo.
export const PASSWORD = `Aa1!${crypto.randomBytes(12).toString('base64url')}`;

export const uniq = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

/** A fresh random address that can't collide with the per-test IPs from fixtures.js. */
export const randomIp = () => {
  const b = crypto.randomBytes(3);
  return `172.${16 + (b[0] % 16)}.${b[1]}.${(b[2] % 253) + 1}`;
};

export const sha256 = (s) => crypto.createHash('sha256').update(s).digest('hex');

/** Run SQL against the LOCAL test D1 (the same file the dev Worker uses). Retries on transient locks. */
export function d1(sql, { json = false } = {}) {
  if (/["`$\\]/.test(sql)) throw new Error('d1(): keep the SQL free of double quotes, backticks, $ and backslashes');
  let lastError;
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      const out = execSync(`npx wrangler d1 execute noteburner-db --local ${json ? '--json ' : ''}--command "${sql}"`, {
        cwd: path.resolve(process.cwd(), 'backend'), stdio: 'pipe', timeout: 90_000,
      }).toString();
      return json ? JSON.parse(out.slice(out.indexOf('[')))[0].results : out;
    } catch (err) {
      lastError = err;
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 1000 * attempt);
    }
  }
  throw new Error(`d1() failed after 4 attempts: ${lastError.stderr?.toString().slice(-500) || lastError.message}`);
}

export async function createMessage(request, { password = `Bb2#${crypto.randomBytes(9).toString('base64url')}`, text = 'top secret', body = {}, tag = true, headers = {} } = {}) {
  const enc = await encryptMessage(text, password);
  const authTag = tag ? await deriveAuthTag(password, enc.salt) : undefined;
  const res = await request.post(`${API}/messages`, { headers, data: { ...enc, expiresIn: 3600, authTag, ...body } });
  expect(res.status(), await res.text()).toBe(201);
  return { ...(await res.json()), enc, authTag, password, text };
}

export async function newUser(request) {
  const email = `t-${uniq()}@example.com`;
  const signup = await request.post(`${API}/auth/signup`, { data: { email, password: PASSWORD } });
  expect(signup.status(), await signup.text()).toBe(201);
  const login = await request.post(`${API}/auth/login`, { data: { email, password: PASSWORD } });
  expect(login.status()).toBe(200);
  const body = await login.json();
  return { email, userId: body.user.id, token: body.sessionToken, headers: { 'X-Session-Token': body.sessionToken } };
}

/** Create an API key for a user; returns { key, id, headers } where headers authenticate as that key. */
export async function newApiKey(request, user, rate_limit = 1000) {
  const res = await request.post(`${API}/api-keys`, { headers: user.headers, data: { name: 'e2e', rate_limit } });
  expect(res.status()).toBe(201);
  const { key, api_key } = await res.json();
  return { key, id: api_key.id, headers: { 'X-API-Key': key } };
}

export async function bareContext(playwright) {
  return playwright.request.newContext({ baseURL: 'http://localhost:8787', extraHTTPHeaders: { 'CF-Connecting-IP': randomIp() } });
}
