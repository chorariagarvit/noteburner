import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { stampServiceWorker, makeBuildId, PLACEHOLDER } from '../tooling/swVersion.js';

const swSource = fs.readFileSync(new URL('../public/sw.js', import.meta.url), 'utf8');

/** Run only the constants at the top of sw.js (before any service-worker API is touched). */
const cacheNames = (source) => {
  const header = source.slice(0, source.indexOf('// Assets to cache immediately'));
  return Array.from(vm.runInNewContext(`${header}\n[CACHE_NAME, STATIC_CACHE, DYNAMIC_CACHE]`, {}));
};

test('the source service worker carries the placeholder, not a hand-edited version', () => {
  assert.ok(swSource.includes(PLACEHOLDER));
  assert.ok(!/noteburner-(static-|dynamic-)?v\d/.test(swSource), 'a literal cache version crept back in');
});

test('unstamped (dev) it is labelled "dev"', () => {
  assert.deepEqual(cacheNames(swSource), ['noteburner-dev', 'noteburner-static-dev', 'noteburner-dynamic-dev']);
});

test('stamping puts the build id into every cache name and leaves no placeholder behind', () => {
  const stamped = stampServiceWorker(swSource, '1.14.0-abc12345');
  assert.ok(!stamped.includes(PLACEHOLDER));
  assert.deepEqual(cacheNames(stamped), ['noteburner-1.14.0-abc12345', 'noteburner-static-1.14.0-abc12345', 'noteburner-dynamic-1.14.0-abc12345']);
  assert.doesNotThrow(() => new vm.Script(stamped), 'stamped worker must still be valid JavaScript');
});

test('different builds produce different workers (so browsers see an update)', () => {
  assert.notEqual(stampServiceWorker(swSource, '1.14.0-aaaaaaaa'), stampServiceWorker(swSource, '1.14.0-bbbbbbbb'));
});

test('build ids: the commit in CI, commit + timestamp locally, timestamp alone outside git', () => {
  assert.equal(makeBuildId('1.2.3', { GITHUB_SHA: '0123456789abcdef' }), '1.2.3-01234567');
  assert.equal(makeBuildId('1.2.3', {}, () => 'deadbeef', () => 36), '1.2.3-deadbeef-10');
  assert.equal(makeBuildId('1.2.3', {}, () => '', () => 36), '1.2.3-10');
  const a = makeBuildId('1.2.3', {}, () => 'deadbeef', () => 1000);
  const b = makeBuildId('1.2.3', {}, () => 'deadbeef', () => 2000);
  assert.notEqual(a, b, 'two local builds of the same commit must differ');
});

test('the old caches are still cleaned up by the activate handler', () => {
  assert.match(swSource, /name\.startsWith\('noteburner-'\) && name !== STATIC_CACHE && name !== DYNAMIC_CACHE/);
});
