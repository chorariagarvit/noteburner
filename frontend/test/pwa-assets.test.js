import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const PUBLIC = new URL('../public/', import.meta.url).pathname;
const manifest = JSON.parse(fs.readFileSync(path.join(PUBLIC, 'manifest.json'), 'utf8'));

/** Width, height and PNG colour type from the file header. */
function pngInfo(file) {
  const buf = fs.readFileSync(file);
  assert.equal(buf.subarray(0, 8).toString('hex'), '89504e470d0a1a0a', `${file} is not a PNG`);
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20), colorType: buf[25] };
}
const onDisk = (src) => path.join(PUBLIC, src.replace(/^\//, ''));
const sizeOf = (sizes) => sizes.split('x').map(Number);

test('every icon in the manifest exists, is a PNG, and has exactly the declared size', () => {
  assert.ok(manifest.icons.length >= 8);
  for (const icon of manifest.icons) {
    const { width, height } = pngInfo(onDisk(icon.src));
    assert.deepEqual([width, height], sizeOf(icon.sizes), icon.src);
  }
});

test('the install requirements are met: a 192 and a 512 icon', () => {
  const sizes = manifest.icons.map((i) => i.sizes);
  assert.ok(sizes.includes('192x192') && sizes.includes('512x512'));
});

test('shortcut icons and store screenshots exist at their declared sizes', () => {
  for (const shortcut of manifest.shortcuts || []) {
    for (const icon of shortcut.icons || []) assert.ok(fs.existsSync(onDisk(icon.src)), icon.src);
  }
  for (const shot of manifest.screenshots || []) {
    const { width, height } = pngInfo(onDisk(shot.src));
    assert.deepEqual([width, height], sizeOf(shot.sizes), shot.src);
  }
});

test('the notification badge is a transparent PNG (Android uses only its alpha channel)', () => {
  const { width, height, colorType } = pngInfo(path.join(PUBLIC, 'icons/badge-72x72.png'));
  assert.deepEqual([width, height], [72, 72]);
  assert.ok([4, 6].includes(colorType), 'badge needs an alpha channel');
});

test('every /icons/... or /screenshots/... file referenced by the app, service worker and index.html exists', () => {
  const sources = ['sw.js', '../index.html', '../src/utils/pwa.js'].map((f) => fs.readFileSync(path.join(PUBLIC, f), 'utf8')).join('\n');
  const refs = [...new Set(sources.match(/\/(icons|screenshots)\/[A-Za-z0-9_.-]+\.(png|svg)/g) || [])];
  assert.ok(refs.length > 0);
  for (const ref of refs) assert.ok(fs.existsSync(onDisk(ref)), `${ref} is referenced but missing`);
});

test('the manifest parts a browser needs to offer installation are present', () => {
  assert.equal(manifest.display, 'standalone');
  assert.ok(manifest.start_url && manifest.name && manifest.short_name);
  assert.match(manifest.theme_color, /^#[0-9a-f]{6}$/i);
  assert.match(manifest.background_color, /^#[0-9a-f]{6}$/i);
});
