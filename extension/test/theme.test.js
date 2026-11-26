import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { read } from './helpers.js';

const { readColorScheme, nextColorScheme, isDarkScheme, COLOR_SCHEME_LABELS, COLOR_SCHEME_ICONS } = vm.compileFunction(
  `${read('theme.js')}\nreturn { readColorScheme, nextColorScheme, isDarkScheme, COLOR_SCHEME_LABELS, COLOR_SCHEME_ICONS };`,
)();

test('nothing stored means follow the system', () => {
  assert.equal(readColorScheme(), 'system');
  assert.equal(readColorScheme({}), 'system');
});

test('a saved choice wins', () => {
  assert.equal(readColorScheme({ colorScheme: 'light' }), 'light');
  assert.equal(readColorScheme({ colorScheme: 'dark' }), 'dark');
  assert.equal(readColorScheme({ colorScheme: 'system', darkMode: true }), 'system');
});

test('an invalid saved value falls back to the system', () => {
  assert.equal(readColorScheme({ colorScheme: 'purple' }), 'system');
});

test('the old darkMode setting is migrated: true keeps dark, false becomes system', () => {
  assert.equal(readColorScheme({ darkMode: true }), 'dark');
  assert.equal(readColorScheme({ darkMode: false }), 'system');
});

test('the button cycles system, light, dark and back', () => {
  assert.equal(nextColorScheme('system'), 'light');
  assert.equal(nextColorScheme('light'), 'dark');
  assert.equal(nextColorScheme('dark'), 'system');
});

test('dark when pinned dark, or when following a dark system; never when pinned light', () => {
  assert.equal(isDarkScheme('dark', false), true);
  assert.equal(isDarkScheme('light', true), false);
  assert.equal(isDarkScheme('system', true), true);
  assert.equal(isDarkScheme('system', false), false);
});

test('every scheme has a label and an icon', () => {
  for (const scheme of ['system', 'light', 'dark']) {
    assert.ok(COLOR_SCHEME_LABELS[scheme]);
    assert.ok(COLOR_SCHEME_ICONS[scheme]);
  }
});

test('the popup loads theme.js before popup.js, and the build ships it', () => {
  const html = read('popup.html');
  assert.ok(html.indexOf('theme.js') > -1 && html.indexOf('theme.js') < html.indexOf('popup.js'));
  assert.match(read('build.sh'), /FILES=\([^)]*\btheme\.js\b/);
});
