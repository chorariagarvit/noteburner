import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseHex, luminance, contrastRatio, readableTextColor } from '../src/utils/color.js';

test('parseHex reads 3- and 6-digit colours and rejects everything else', () => {
  assert.deepEqual(parseHex('#ffffff'), [255, 255, 255]);
  assert.deepEqual(parseHex('#F59E0B'), [245, 158, 11]);
  assert.deepEqual(parseHex('#0f0'), [0, 255, 0]);
  for (const bad of ['red', '#12', '#GGGGGG', 'f59e0b', '#f59e0b00', '', null, undefined, 'javascript:alert(1)']) assert.equal(parseHex(bad), null, String(bad));
});

test('contrast ratios match the WCAG reference values', () => {
  assert.equal(contrastRatio([0, 0, 0], [255, 255, 255]).toFixed(1), '21.0');
  assert.equal(contrastRatio([255, 255, 255], [255, 255, 255]).toFixed(1), '1.0');
  assert.equal(contrastRatio([119, 119, 119], [255, 255, 255]).toFixed(2), '4.48'); // #777 on white: just under AA
  assert.ok(luminance([255, 255, 255]) > luminance([0, 0, 0]));
});

test('readableTextColor chooses the text that reads best on the background', () => {
  assert.equal(readableTextColor('#ffffff'), '#000000');
  assert.equal(readableTextColor('#f59e0b'), '#000000'); // the default amber needs dark text
  assert.equal(readableTextColor('#ffeb3b'), '#000000');
  assert.equal(readableTextColor('#000000'), '#ffffff');
  assert.equal(readableTextColor('#1f2937'), '#ffffff');
  assert.equal(readableTextColor('#2563eb'), '#ffffff');
  assert.equal(readableTextColor('not a colour'), '#ffffff');
});

test('whatever it picks reaches at least 4.5:1 on every colour of a coarse grid', () => {
  for (let r = 0; r <= 255; r += 51) for (let g = 0; g <= 255; g += 51) for (let b = 0; b <= 255; b += 51) {
    const bg = [r, g, b]; const text = parseHex(readableTextColor(`#${[r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')}`));
    assert.ok(contrastRatio(bg, text) >= 4.5, `rgb(${bg}) -> ${contrastRatio(bg, text).toFixed(2)}`);
  }
});
