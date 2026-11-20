#!/usr/bin/env node
/**
 * Checks a DEPLOYED site against frontend/public/_headers:
 *   1. every header in the `/*` block is served with exactly that value, and the path rules
 *      (/sw.js, /m/*) are applied;
 *   2. real pages load in a browser with no Content-Security-Policy violations.
 * (`npm run test:csp` does the second part against a local production build with the headers
 * emulated; this proves the real deployment applies them.)
 *
 *   node frontend/scripts/check-live-csp.mjs [https://noteburner.work]
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const base = (process.argv[2] || 'https://noteburner.work').replace(/\/$/, '');
const headersFile = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../public/_headers');

function parseHeaders(text) {
  const rules = {}; let current = null;
  for (const raw of text.split('\n')) {
    if (!raw.trim() || raw.trim().startsWith('#')) continue;
    if (!/^\s/.test(raw)) { current = raw.trim(); rules[current] = {}; continue; }
    const i = raw.indexOf(':');
    rules[current][raw.slice(0, i).trim().toLowerCase()] = raw.slice(i + 1).trim();
  }
  return rules;
}
const norm = (v) => String(v ?? '').replace(/\s+/g, ' ').trim();
const rules = parseHeaders(fs.readFileSync(headersFile, 'utf8'));
const problems = [];

async function headersOf(urlPath) {
  const res = await fetch(base + urlPath, { redirect: 'follow' });
  return { status: res.status, headers: res.headers };
}

// 1. header values
const home = await headersOf('/');
if (home.status !== 200) problems.push(`GET / returned ${home.status}`);
for (const [name, expected] of Object.entries(rules['/*'] || {})) {
  const actual = home.headers.get(name);
  if (norm(actual) !== norm(expected)) problems.push(`/ header "${name}":\n    expected ${norm(expected)}\n    served   ${norm(actual) || '(missing)'}`);
}
for (const [rule, wanted] of [['/sw.js', '/sw.js'], ['/m/*', '/m/example-token']]) {
  const { headers } = await headersOf(wanted);
  for (const [name, expected] of Object.entries(rules[rule] || {})) {
    if (!norm(headers.get(name)).includes(norm(expected))) problems.push(`${wanted} header "${name}": expected "${expected}", served "${headers.get(name) ?? '(missing)'}"`);
  }
}

// 2. real browser, real headers: no violations
const browser = await chromium.launch();
const context = await browser.newContext({ serviceWorkers: 'block' });
await context.addInitScript(() => {
  window.__csp = [];
  document.addEventListener('securitypolicyviolation', (e) => window.__csp.push(`${e.violatedDirective} blocked ${e.blockedURI || 'inline'}`));
  try { localStorage.setItem('noteburner_onboarding_complete', 'true'); } catch { /* ignore */ }
});
for (const p of ['/', '/create', '/login', '/signup', '/leaderboard', '/m/example-token']) {
  const page = await context.newPage();
  await page.goto(base + p, { waitUntil: 'networkidle' }).catch((err) => problems.push(`${p}: ${err.message.split('\n')[0]}`));
  const violations = await page.evaluate(() => window.__csp).catch(() => []);
  for (const v of violations) problems.push(`${p}: CSP violation: ${v}`);
  await page.close();
}
await browser.close();

if (problems.length) {
  console.error(`✘ ${base} does not match frontend/public/_headers:\n- ${problems.join('\n- ')}`);
  process.exit(1);
}
console.log(`✔ ${base}: all headers from _headers are served, and 6 pages load with no CSP violations.`);
