// Applies the Cloudflare Pages headers from frontend/public/_headers to every document, as production does
// (`vite preview` does not serve them).
import fs from 'node:fs';
import path from 'node:path';

export function parseHeadersFile(file) {
  const rules = {}; let current = null;
  for (const raw of fs.readFileSync(file, 'utf8').split('\n')) {
    if (!raw.trim() || raw.trim().startsWith('#')) continue;
    if (!/^\s/.test(raw)) { current = raw.trim(); rules[current] = {}; continue; }
    const i = raw.indexOf(':');
    rules[current][raw.slice(0, i).trim().toLowerCase()] = raw.slice(i + 1).trim();
  }
  return rules;
}

export const POLICY = parseHeadersFile(path.resolve('frontend/public/_headers'))['/*'];

export async function applyProductionHeaders(context) {
  await context.route('**/*', async (route) => {
    if (route.request().resourceType() !== 'document') return route.continue();
    const response = await route.fetch();
    await route.fulfill({ response, headers: { ...response.headers(), ...POLICY } });
  });
}
