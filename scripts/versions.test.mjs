// The release version must be the same everywhere, and the changelog must describe it.
// Fails the build if someone bumps one place and forgets another (the API, the extension and the docs used to drift).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8');
const json = (f) => JSON.parse(read(f));
const version = json('package.json').version;

// The extension is published separately and only when it changes, so its version may trail the web app's
// (1.16.0 of the site shipped without a new extension). It must never be ahead, and both manifests must agree.
const extensionVersion = json('extension/manifest.json').version;
const parts = (v) => v.split('.').map(Number);
const notAhead = (a, b) => { const [x, y] = [parts(a), parts(b)]; return x[0] < y[0] || (x[0] === y[0] && (x[1] < y[1] || (x[1] === y[1] && x[2] <= y[2]))); };

test('every package carries the root version', () => {
  for (const f of ['backend/package.json', 'frontend/package.json']) {
    assert.equal(json(f).version, version, f);
  }
  const lock = json('package-lock.json');
  assert.equal(lock.version, version, 'package-lock.json');
  assert.equal(lock.packages[''].version, version, 'package-lock.json (root package)');
  assert.equal(lock.packages.backend.version, version, 'package-lock.json (backend)');
  assert.equal(lock.packages.frontend.version, version, 'package-lock.json (frontend)');
});

test('both extension manifests share one version, and it is not ahead of the web app', () => {
  assert.equal(json('extension/manifest.firefox.json').version, extensionVersion, 'the two manifests must agree');
  assert.ok(notAhead(extensionVersion, version), `extension ${extensionVersion} is ahead of the web app ${version}`);
});

test('the API reports the package version rather than a typed-in constant', () => {
  const src = read('backend/src/index.js');
  assert.match(src, /import pkg from '\.\.\/package\.json'/);
  assert.match(src, /version: pkg\.version/);
  assert.doesNotMatch(src, /version: '\d+\.\d+\.\d+'/);
});

test('CHANGELOG.md has an entry for this version, newest first, with a date', () => {
  const entries = [...read('CHANGELOG.md').matchAll(/^## \[(\d+\.\d+\.\d+)\] - (\d{4}-\d{2}-\d{2})/gm)];
  assert.ok(entries.length > 0, 'no released versions found');
  assert.equal(entries[0][1], version, `the newest changelog entry is ${entries[0][1]}, not ${version}`);
  const dates = entries.map((m) => m[2]);
  assert.deepEqual(dates, [...dates].sort().reverse(), 'entries must be newest first');
});

test('the changelog does not leave an "Unreleased" section behind a release', () => {
  assert.doesNotMatch(read('CHANGELOG.md'), /^## \[Unreleased\]\s*\n+\s*(?=##)/m, 'an empty "Unreleased" heading');
});

test('README and ROADMAP name the current version', () => {
  assert.ok(read('README.md').includes(`v${version}`), 'README.md');
  assert.ok(read('ROADMAP.md').includes(`v${version}`), 'ROADMAP.md');
});

test('the extension docs name the extension version that is being published', () => {
  assert.ok(read('extension/PUBLISHING.md').includes(extensionVersion), 'extension/PUBLISHING.md');
  assert.ok(read('extension/README.md').includes(`v${extensionVersion}`), 'extension/README.md');
});
