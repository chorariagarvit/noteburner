// Every language must have exactly the keys English has, none empty, with the same {{placeholders}}.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../src/locales');
const LANGS = ['en', 'es', 'fr', 'de', 'hi', 'zh'];
const load = (l) => JSON.parse(fs.readFileSync(path.join(dir, `${l}.json`), 'utf8'));

/** { a: { b: 'x' } } -> { 'a.b': 'x' } (arrays are leaves) */
function flatten(obj, prefix = '', out = {}) {
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) flatten(v, key, out);
    else out[key] = v;
  }
  return out;
}
// a set, not a count: a language may repeat a placeholder (e.g. Spanish uses {s} three times for plurals)
const placeholders = (s) => (typeof s === 'string' ? [...new Set([...s.matchAll(/\{\{\s*(\w+)\s*\}\}|\{(\w+)\}/g)].map((m) => m[1] || m[2]))].sort() : []);

const en = flatten(load('en'));

test('the locale folder holds exactly the supported languages', () => {
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.json')).map((f) => f.replace('.json', '')).sort();
  assert.deepEqual(files, [...LANGS].sort());
});

for (const lang of LANGS.filter((l) => l !== 'en')) {
  const other = flatten(load(lang));

  test(`${lang}: no key is missing compared with English`, () => {
    const missing = Object.keys(en).filter((k) => !(k in other));
    assert.deepEqual(missing, [], `${missing.length} missing in ${lang}.json: ${missing.slice(0, 15).join(', ')}`);
  });

  test(`${lang}: no key that English does not have`, () => {
    const extra = Object.keys(other).filter((k) => !(k in en));
    assert.deepEqual(extra, [], `${extra.length} extra in ${lang}.json: ${extra.slice(0, 15).join(', ')}`);
  });

  test(`${lang}: no empty or non-text values`, () => {
    const bad = Object.entries(other).filter(([, v]) => !Array.isArray(v) && (typeof v !== 'string' || v.trim() === '')).map(([k]) => k);
    assert.deepEqual(bad, [], `${bad.length} empty in ${lang}.json: ${bad.slice(0, 15).join(', ')}`);
  });

  test(`${lang}: placeholders match English`, () => {
    const bad = Object.keys(en).filter((k) => k in other && JSON.stringify(placeholders(en[k])) !== JSON.stringify(placeholders(other[k])));
    assert.deepEqual(bad, [], `placeholders differ in ${lang}.json for: ${bad.slice(0, 15).join(', ')}`);
  });
}

test('English has no empty values', () => {
  const bad = Object.entries(en).filter(([, v]) => !Array.isArray(v) && (typeof v !== 'string' || v.trim() === '')).map(([k]) => k);
  assert.deepEqual(bad, []);
});
