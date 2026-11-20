/** Shared helpers for the API-level specs (security-api, concurrency, api-v1, account-lifecycle). */
import { expect } from '@playwright/test';
import { execSync } from 'node:child_process';
import crypto from 'node:crypto';
import path from 'node:path';
import { encryptMessage, deriveAuthTag } from '../frontend/src/utils/crypto.js';

export const API = 'http://localhost:8787/api';
export const IV = 'AAAAAAAAAAAAAAAAAAAAAA==';
export const PASSWORD = 'Str0ng!Passw0rd#1';

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

export async function createMessage(request, { password = 'correct-horse-1', text = 'top secret', body = {}, tag = true, headers = {} } = {}) {
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

/** Run the hourly cleanup job (needs the dev Worker's --test-scheduled) until `done()` holds; each run is bounded, so a backlog needs several. */
export async function runCleanupUntil(request, done, maxRuns = 40) {
  for (let i = 0; i < maxRuns; i++) {
    const res = await request.get('http://localhost:8787/__scheduled?cron=0+*+*+*+*');
    if (res.status() === 404) throw new Error('dev Worker was started without --test-scheduled');
    if (done()) return;
  }
  throw new Error(`cleanup did not reach the expected state after ${maxRuns} runs`);
}

/** Minimal RFC 4180 CSV parser (quoted fields, doubled quotes, newlines inside quotes). */
export function parseCsv(text) {
  const rows = []; let row = []; let field = ''; let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else quoted = false; } else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') { row.push(field); field = ''; }
    else if (ch === '\n' || ch === '\r') { if (ch === '\r' && text[i + 1] === '\n') i++; row.push(field); rows.push(row); row = []; field = ''; }
    else field += ch;
  }
  if (field !== '' || row.length) { row.push(field); rows.push(row); }
  return rows;
}
