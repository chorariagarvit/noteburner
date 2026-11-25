import test from 'node:test';
import assert from 'node:assert/strict';

function memoryArea() {
  const data = new Map();
  return {
    getItem: (k) => (data.has(k) ? data.get(k) : null),
    setItem: (k, v) => { data.set(k, String(v)); },
    removeItem: (k) => { data.delete(k); },
  };
}

test('reads, writes and removes values', async () => {
  globalThis.localStorage = memoryArea();
  const { localStore } = await import('../src/utils/storage.js');
  assert.equal(localStore.get('a'), null);
  assert.equal(localStore.set('a', '1'), true);
  assert.equal(localStore.get('a'), '1');
  localStore.remove('a');
  assert.equal(localStore.get('a'), null);
});

test('blocked storage (the getter throws) degrades to nothing stored', async () => {
  Object.defineProperty(globalThis, 'sessionStorage', { configurable: true, get() { throw new DOMException('blocked', 'SecurityError'); } });
  const { sessionStore } = await import('../src/utils/storage.js');
  assert.equal(sessionStore.get('x'), null);
  assert.equal(sessionStore.set('x', '1'), false);
  assert.doesNotThrow(() => sessionStore.remove('x'));
});

test('a full quota makes set() report failure instead of throwing', async () => {
  globalThis.localStorage = { getItem: () => null, setItem() { throw new DOMException('full', 'QuotaExceededError'); }, removeItem() {} };
  const { localStore } = await import('../src/utils/storage.js');
  assert.equal(localStore.set('k', 'v'), false);
});
