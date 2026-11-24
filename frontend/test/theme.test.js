// The colour-scheme logic: the pure helpers, and the early-apply script (public/theme-init.js).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { STORAGE_KEY, SCHEMES, getStorage, readScheme, writeScheme, nextScheme, metaContent, isDark } from '../src/utils/theme.js';

const memoryStorage = (initial = {}) => {
  const data = new Map(Object.entries(initial));
  return {
    getItem: (k) => (data.has(k) ? data.get(k) : null),
    setItem: (k, v) => { data.set(k, String(v)); },
    removeItem: (k) => { data.delete(k); },
    dump: () => Object.fromEntries(data),
  };
};
const blockedStorage = () => ({
  getItem() { throw new Error('SecurityError'); },
  setItem() { throw new Error('SecurityError'); },
  removeItem() { throw new Error('SecurityError'); },
});

test('three states: system, light, dark', () => {
  assert.deepEqual(SCHEMES, ['system', 'light', 'dark']);
  assert.equal(STORAGE_KEY, 'color-scheme');
});

test('readScheme: nothing or anything invalid means "system"', () => {
  assert.equal(readScheme(memoryStorage()), 'system');
  assert.equal(readScheme(memoryStorage({ 'color-scheme': 'light' })), 'light');
  assert.equal(readScheme(memoryStorage({ 'color-scheme': 'dark' })), 'dark');
  for (const bad of ['', 'system', 'DARK', 'true', 'blue', '<script>']) assert.equal(readScheme(memoryStorage({ 'color-scheme': bad })), 'system', bad);
  assert.equal(readScheme(blockedStorage()), 'system');
});

test('getStorage: returns the storage, or null when merely reading it throws (blocked storage)', () => {
  const ok = memoryStorage();
  assert.equal(getStorage({ localStorage: ok }), ok);
  assert.equal(getStorage({}), null);
  const blocked = { get localStorage() { throw new Error('SecurityError'); } };
  assert.equal(getStorage(blocked), null);
  // and everything built on it stays quiet and falls back to "system"
  assert.equal(readScheme(getStorage(blocked)), 'system');
  assert.doesNotThrow(() => writeScheme(getStorage(blocked), 'dark'));
});

test('writeScheme: light and dark are stored, system clears the entry', () => {
  const s = memoryStorage();
  writeScheme(s, 'dark');
  assert.deepEqual(s.dump(), { 'color-scheme': 'dark' });
  writeScheme(s, 'light');
  assert.deepEqual(s.dump(), { 'color-scheme': 'light' });
  writeScheme(s, 'system');
  assert.deepEqual(s.dump(), {});
  assert.doesNotThrow(() => writeScheme(blockedStorage(), 'dark'));
});

test('the button cycles system -> light -> dark -> system', () => {
  assert.equal(nextScheme('system'), 'light');
  assert.equal(nextScheme('light'), 'dark');
  assert.equal(nextScheme('dark'), 'system');
  assert.equal(nextScheme('anything else'), 'system');
});

test('the <meta> says "light dark" (follow the system) unless a scheme is pinned', () => {
  assert.equal(metaContent('system'), 'light dark');
  assert.equal(metaContent('light'), 'light');
  assert.equal(metaContent('dark'), 'dark');
  assert.equal(metaContent(undefined), 'light dark');
});

test('isDark: pinned dark always, pinned light never, system follows the OS', () => {
  assert.equal(isDark('dark', false), true);
  assert.equal(isDark('dark', true), true);
  assert.equal(isDark('light', true), false);
  assert.equal(isDark('light', false), false);
  assert.equal(isDark('system', true), true);
  assert.equal(isDark('system', false), false);
});

// ---- public/theme-init.js, run against a fake page --------------------------------------------------------
const initScript = fs.readFileSync(new URL('../public/theme-init.js', import.meta.url), 'utf8');
function runInit(storage, { withMeta = true } = {}) {
  const meta = { content: 'light dark', setAttribute(name, value) { if (name === 'content') this.content = value; } };
  const document = { querySelector: (selector) => (withMeta && selector === 'meta[name="color-scheme"]' ? meta : null) };
  vm.runInNewContext(initScript, { localStorage: storage, document });
  return meta.content;
}

test('theme-init: applies a saved scheme to the <meta>', () => {
  assert.equal(runInit(memoryStorage({ 'color-scheme': 'light' })), 'light');
  assert.equal(runInit(memoryStorage({ 'color-scheme': 'dark' })), 'dark');
});

test('theme-init: no choice, or an invalid one, leaves the page following the system', () => {
  assert.equal(runInit(memoryStorage()), 'light dark');
  assert.equal(runInit(memoryStorage({ 'color-scheme': 'purple' })), 'light dark');
});

test('theme-init: migrates the old on/off switch once ("true" meant dark, "false" meant no preference)', () => {
  const on = memoryStorage({ darkMode: 'true' });
  assert.equal(runInit(on), 'dark');
  assert.deepEqual(on.dump(), { 'color-scheme': 'dark' });

  const off = memoryStorage({ darkMode: 'false' });
  assert.equal(runInit(off), 'light dark');
  assert.deepEqual(off.dump(), {});

  const both = memoryStorage({ darkMode: 'true', 'color-scheme': 'light' }); // a new choice wins over the old key
  assert.equal(runInit(both), 'light');
});

test('theme-init: never throws (blocked storage, no <meta>)', () => {
  assert.equal(runInit(blockedStorage()), 'light dark');
  assert.doesNotThrow(() => runInit(memoryStorage({ 'color-scheme': 'dark' }), { withMeta: false }));
});

test('theme-init and the app agree on every stored value', () => {
  for (const stored of [undefined, 'light', 'dark', 'garbage']) {
    const storage = memoryStorage(stored === undefined ? {} : { 'color-scheme': stored });
    assert.equal(runInit(storage), metaContent(readScheme(storage)), String(stored));
  }
});

test('theme-init is a plain synchronous script, listed in the offline cache and loaded from index.html', () => {
  const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  const tag = html.match(/<script[^>]*theme-init\.js[^>]*>/)?.[0] ?? '';
  assert.ok(tag, 'index.html loads /theme-init.js');
  assert.ok(!/\b(defer|async)\b|type=["']module/.test(tag), 'it must be synchronous so it runs before first paint');
  assert.ok(html.indexOf('theme-init.js') > html.indexOf('name="color-scheme"'), 'it runs after the <meta> exists');
  assert.match(fs.readFileSync(new URL('../public/sw.js', import.meta.url), 'utf8'), /'\/theme-init\.js'/);
});
