// Every migration from 0013 on must ship a rollback file, so a bad release can be undone (docs/DISASTER_RECOVERY.md).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const up = fs.readdirSync(path.join(root, 'migrations')).filter((f) => f.endsWith('.sql')).sort();
const down = fs.readdirSync(path.join(root, 'migrations-rollback')).filter((f) => f.endsWith('.down.sql'));
const FIRST_WITH_ROLLBACK = 13;

test('every migration from 0013 on has a rollback file', () => {
  const missing = up
    .filter((f) => Number(f.slice(0, 4)) >= FIRST_WITH_ROLLBACK)
    .filter((f) => !down.includes(f.replace(/\.sql$/, '.down.sql')));
  assert.deepEqual(missing, [], `add backend/migrations-rollback/<name>.down.sql for: ${missing.join(', ')}`);
});

test('every rollback file belongs to a real migration', () => {
  const orphans = down.filter((f) => !up.includes(f.replace(/\.down\.sql$/, '.sql')));
  assert.deepEqual(orphans, []);
});

test('every rollback file forgets its migration, so it can be applied again', () => {
  for (const file of down) {
    const sql = fs.readFileSync(path.join(root, 'migrations-rollback', file), 'utf8');
    const name = file.replace(/\.down\.sql$/, '.sql');
    assert.match(sql, new RegExp(`DELETE FROM d1_migrations WHERE name = '${name}'`), `${file} must remove its d1_migrations row`);
  }
});
