import { test } from 'node:test';
import assert from 'node:assert/strict';
import { unlistedFindings, formatReport } from './modern-web.mjs';

const scan = (targetDir, guideId, findings) => ({
  targetDir, totalFindings: findings.length,
  guides: findings.length ? [{ guideId, retrieveCommand: `npx modern-web-guidance retrieve ${guideId}`, rules: [{ ruleId: guideId, findings }] }] : [],
});

test('findings from every scanned folder are flattened with full paths', () => {
  const out = unlistedFindings([
    scan('frontend/src', 'dark-mode-toggle', [{ file: 'App.jsx', line: 47, message: 'toggle' }]),
    scan('extension', 'customize-scrollbar-color-and-thickness', [{ file: 'popup.css', line: 388, message: 'a' }, { file: 'popup.css', line: 397, message: 'b' }]),
    scan('frontend/public', 'x', []),
  ]);
  assert.deepEqual(out.map((f) => `${f.guideId} ${f.file}:${f.line}`), [
    'dark-mode-toggle frontend/src/App.jsx:47',
    'customize-scrollbar-color-and-thickness extension/popup.css:388',
    'customize-scrollbar-color-and-thickness extension/popup.css:397',
  ]);
});

test('an allowlisted "guideId path" is ignored whatever its line number, others still count', () => {
  const scans = [scan('extension', 'g', [{ file: 'a.css', line: 1, message: 'm' }, { file: 'b.css', line: 9, message: 'm' }])];
  const out = unlistedFindings(scans, ['g extension/a.css']);
  assert.deepEqual(out.map((f) => f.file), ['extension/b.css']);
  assert.equal(unlistedFindings(scans, ['g extension/a.css', 'g extension/b.css']).length, 0);
});

test('a clean scan gives an empty list and a clear message', () => {
  assert.deepEqual(unlistedFindings([scan('frontend/src', 'g', [])]), []);
  assert.match(formatReport([]), /No legacy web platform patterns/);
});

test('the report names the guide and the command that fetches the fix', () => {
  const text = formatReport(unlistedFindings([scan('extension', 'g1', [{ file: 'p.css', line: 3, message: 'use scrollbar-color' }])]));
  assert.match(text, /g1 \(1\)/);
  assert.match(text, /npx modern-web-guidance retrieve g1/);
  assert.match(text, /extension\/p\.css:3/);
});

test('tolerates scans without guides or rules', () => {
  assert.deepEqual(unlistedFindings([{ targetDir: 'x' }, { targetDir: 'y', guides: [{ guideId: 'g' }] }]), []);
});
