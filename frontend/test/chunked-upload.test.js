// Retry, timeout and chunking behaviour of the large-file upload, with a fake fetch and fake timers.
import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

// The module reads import.meta.env (Vite only): load a copy with that one import replaced.
const src = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../src/utils/chunkedUpload.js');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'chunked-'));
const copy = path.join(tmp, 'chunkedUpload.mjs');
fs.writeFileSync(copy, fs.readFileSync(src, 'utf8').replace("import { API_BASE } from './apiBase';", "const API_BASE = '';"));
const { uploadLargeFile, shouldUseChunkedUpload } = await import(pathToFileURL(copy).href);

const realFetch = globalThis.fetch;
const realSetTimeout = globalThis.setTimeout;
const realWarn = console.warn;
let delays; let calls; let respond;

beforeEach(() => {
  delays = []; calls = []; respond = null;
  console.warn = () => {};
  // Retry back-off waits run immediately but are recorded; the 30s/120s request timeouts fire
  // at once only for the call that wants to time out.
  globalThis.setTimeout = (fn, ms, ...rest) => {
    if (ms < 10000) { delays.push(ms); return realSetTimeout(fn, 0, ...rest); } // back-off waits: instant, but recorded
    if (ms === 120000 && globalThis.__timeoutNext) { globalThis.__timeoutNext = false; return realSetTimeout(fn, 0, ...rest); }
    return realSetTimeout(() => {}, 0); // request timeouts (30 s / 120 s) never fire unless a test asks
  };
  globalThis.fetch = async (url, opts) => {
    const endpoint = String(url).split('/').pop();
    const body = opts.body ? JSON.parse(opts.body) : {};
    calls.push({ endpoint, body, headers: opts.headers });
    return respond(endpoint, body, opts);
  };
});
afterEach(() => { globalThis.fetch = realFetch; globalThis.setTimeout = realSetTimeout; console.warn = realWarn; });

const json = (data, status = 200) => ({ ok: status < 400, status, json: async () => data });
const file = (size = 10) => ({ name: 'big.bin', type: 'application/octet-stream', size });
const upload = (data = 'abcdefghij', onProgress) => uploadLargeFile(file(), data, 'IV', 'SALT', 'tok', 'creator', onProgress);
const chunkCalls = () => calls.filter((c) => c.endpoint === 'chunk');

/** A server that accepts everything, with `chunkSize` characters per chunk; `chunk` can override the chunk response. */
const server = (chunk) => (endpoint, body, opts) => {
  if (endpoint === 'init') return json({ fileId: 'F', uploadId: 'U', chunkSize: 4 });
  if (endpoint === 'complete') return json({ success: true, fileId: 'F' });
  return chunk ? chunk(body, opts) : json({ partNumber: body.chunkIndex + 1, etag: `e${body.chunkIndex}` });
};

test('uploads in order: init, one request per chunk, then complete with every part', async () => {
  respond = server();
  const result = await upload('abcdefghij');
  assert.deepEqual(result, { success: true, fileId: 'F' });
  assert.deepEqual(calls.map((c) => c.endpoint), ['init', 'chunk', 'chunk', 'chunk', 'complete']);
  assert.deepEqual(chunkCalls().map((c) => [c.body.chunkIndex, c.body.chunkData]), [[0, 'abcd'], [1, 'efgh'], [2, 'ij']]);
  assert.deepEqual(calls.at(-1).body.parts, [{ partNumber: 1, etag: 'e0' }, { partNumber: 2, etag: 'e1' }, { partNumber: 3, etag: 'e2' }]);
  for (const c of calls) assert.equal(c.headers['X-Creator-Token'], 'creator');
  assert.deepEqual(delays, []);
});

test('a chunk that fails twice is retried with a growing delay and then succeeds', async () => {
  let failures = 0;
  respond = server((body) => (body.chunkIndex === 1 && failures++ < 2 ? json({ error: 'Storage hiccup' }, 500) : json({ partNumber: body.chunkIndex + 1, etag: `e${body.chunkIndex}` })));
  const result = await upload('abcdefghij');
  assert.equal(result.success, true);
  assert.deepEqual(chunkCalls().map((c) => c.body.chunkIndex), [0, 1, 1, 1, 2], 'only the failing chunk is repeated');
  assert.deepEqual(delays, [1000, 2000]);
  assert.equal(calls.at(-1).body.parts.length, 3);
});

test('a network error is retried like a server error', async () => {
  let failures = 0;
  respond = server((body) => { if (failures++ < 1) throw new TypeError('Failed to fetch'); return json({ partNumber: 1, etag: 'e' }); });
  await upload('abcd');
  assert.equal(chunkCalls().length, 2);
});

test('gives up after 3 attempts with a clear error, and never completes the upload', async () => {
  respond = server(() => json({ error: 'Quota exceeded' }, 507));
  await assert.rejects(upload('abcdefghij'), /Failed to upload chunk 1\/3 after 3 attempts: Quota exceeded/);
  assert.equal(chunkCalls().length, 3);
  assert.deepEqual(delays, [1000, 2000], 'no delay after the final attempt');
  assert.ok(!calls.some((c) => c.endpoint === 'complete'));
});

test('a non-JSON error page counts as a failed attempt and is retried', async () => {
  respond = server(() => ({ ok: false, status: 502, json: async () => { throw new SyntaxError('Unexpected token <'); } }));
  await assert.rejects(upload('abcd'), /after 3 attempts: Unexpected token </);
  assert.equal(chunkCalls().length, 3);
});

test('a request that never answers is aborted and retried', async () => {
  let first = true;
  respond = (endpoint, body, opts) => {
    if (endpoint === 'chunk' && first) {
      first = false;
      globalThis.__timeoutNext = true; // fire the 120 s timeout for this request only
      return new Promise((resolve, reject) => opts.signal.addEventListener('abort', () => reject(Object.assign(new Error('aborted'), { name: 'AbortError' }))));
    }
    return server()(endpoint, body, opts);
  };
  // the timeout is armed when fetchWithTimeout starts, i.e. before respond() runs: arm it up front
  globalThis.__timeoutNext = true;
  const result = await upload('abcd');
  assert.equal(result.success, true);
  assert.equal(chunkCalls().length, 2);
});

test('timeouts surface as a friendly message after the last attempt', async () => {
  respond = (endpoint, body, opts) => (endpoint === 'chunk'
    ? new Promise((resolve, reject) => { globalThis.__timeoutNext = true; opts.signal.addEventListener('abort', () => reject(Object.assign(new Error('aborted'), { name: 'AbortError' }))); })
    : server()(endpoint, body, opts));
  globalThis.__timeoutNext = true;
  await assert.rejects(upload('abcd'), /Upload timeout - please check your connection/);
});

test('a failed init stops everything, with the server message', async () => {
  respond = (endpoint) => json({ error: 'Not authorized to upload to this message' }, 403);
  await assert.rejects(upload(), /Not authorized to upload to this message/);
  assert.deepEqual(calls.map((c) => c.endpoint), ['init']);
});

test('a failed complete is reported, not swallowed', async () => {
  respond = (endpoint, body, opts) => (endpoint === 'complete' ? json({ error: 'Upload incomplete' }, 400) : server()(endpoint, body, opts));
  await assert.rejects(upload('abcd'), /Upload incomplete/);
});

test('files over 2 GB are refused before any request is made', async () => {
  respond = server();
  await assert.rejects(uploadLargeFile(file(2 * 1024 ** 3 + 1), 'abcd', 'IV', 'SALT', 'tok', 'creator'), /exceeds maximum of 2GB/);
  assert.equal(calls.length, 0);
});

test('progress only moves forward and ends at 100', async () => {
  respond = server();
  const seen = [];
  await upload('abcdefghij', (p) => seen.push(p));
  assert.equal(seen.at(-1), 100);
  assert.deepEqual(seen, [...seen].sort((a, b) => a - b));
});

test('chunked upload is used only above 100 MB', () => {
  assert.equal(shouldUseChunkedUpload(100 * 1024 * 1024), false);
  assert.equal(shouldUseChunkedUpload(100 * 1024 * 1024 + 1), true);
  assert.equal(shouldUseChunkedUpload(0), false);
});
