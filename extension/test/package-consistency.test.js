import { spawnSync } from 'node:child_process';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { EXT, read } from './helpers.js';

const chrome = JSON.parse(read('manifest.json'));
const firefox = JSON.parse(read('manifest.firefox.json'));
const rootPkg = JSON.parse(fs.readFileSync(path.join(EXT, '..', 'package.json'), 'utf8'));
const sources = fs.readdirSync(EXT).filter((f) => f.endsWith('.js') && f !== 'generate-icons.js');

test('both manifests are Manifest V3 and carry the app version', () => {
  assert.equal(chrome.manifest_version, 3);
  assert.equal(firefox.manifest_version, 3);
  assert.equal(chrome.version, rootPkg.version);
  assert.equal(firefox.version, chrome.version);
});

test('Chrome and Firefox manifests grant the same permissions and hosts', () => {
  assert.deepEqual([...chrome.permissions].sort(), [...firefox.permissions].sort());
  assert.deepEqual([...chrome.host_permissions].sort(), [...firefox.host_permissions].sort());
});

test('the API host the extension calls is declared, and no dev host ships', () => {
  const apiHost = new URL(/const apiUrl = '([^']+)'/.exec(read('crypto.js'))[1]).host;
  for (const m of [chrome, firefox]) {
    assert.ok(m.host_permissions.some((h) => h.includes(apiHost)), `${apiHost} missing from host_permissions`);
    assert.ok(!m.host_permissions.some((h) => /localhost|127\.0\.0\.1/.test(h)), 'localhost must not ship');
  }
});

test('every chrome.* API the code uses has its permission declared', () => {
  const code = sources.map(read).join('\n');
  const needs = { notifications: /chrome\.notifications\./, contextMenus: /chrome\.contextMenus\./, storage: /chrome\.storage\./, scripting: /chrome\.scripting\./ };
  for (const [perm, re] of Object.entries(needs)) {
    if (re.test(code)) {
      assert.ok(chrome.permissions.includes(perm), `chrome manifest lacks "${perm}"`);
      assert.ok(firefox.permissions.includes(perm), `firefox manifest lacks "${perm}"`);
    }
  }
});

test('Firefox manifest has an add-on id and a background script entry', () => {
  assert.ok(firefox.browser_specific_settings?.gecko?.id);
  assert.ok(Array.isArray(firefox.background?.scripts) && firefox.background.scripts.length > 0);
  assert.ok(chrome.background?.service_worker);
});

test('no file referenced by the manifests is missing', () => {
  const files = new Set([chrome.background.service_worker, ...firefox.background.scripts, chrome.action.default_popup,
    ...Object.values(chrome.icons)]);
  for (const f of files) assert.ok(fs.existsSync(path.join(EXT, f)), `${f} is referenced but missing`);
});

test('source hygiene: no innerHTML, no secrets in logs, plaintext only travels in the URL fragment', () => {
  for (const f of sources) {
    const code = read(f);
    assert.ok(!/\.innerHTML\s*=/.test(code), `${f} assigns innerHTML`);
    assert.ok(!/console\.\w+\([^)]*(creatorToken|appToken|authTag|password\b)/i.test(code), `${f} logs a secret`);
    assert.ok(!/\/create\?text=/.test(code), `${f} puts the secret text in the query string (use #text=)`);
  }
});

test('the popup hands off to the website (text in the URL fragment) when a human check is required', () => {
  const popup = read('popup.js');
  assert.match(popup, /CHALLENGE_REQUIRED/);
  assert.match(popup, /chrome\.tabs\.create\(\{ url: `https:\/\/noteburner\.work\/create#text=\$\{encodeURIComponent\(message\)\}` \}\)/);
});

test('no content script is injected into every site, and nothing is exposed to web pages', () => {
  for (const m of [chrome, firefox]) {
    assert.equal(m.content_scripts, undefined, 'content_scripts would run on every page');
    assert.equal(m.web_accessible_resources, undefined);
    assert.ok(!m.host_permissions.some((h) => /<all_urls>|\*:\/\/\*\/|https?:\/\/\*\//.test(h)), 'host access must stay limited to noteburner.work');
    assert.ok(!m.permissions.includes('tabs'), 'the tabs permission would expose every URL');
  }
  assert.ok(!fs.existsSync(path.join(EXT, 'content.js')));
});

test('the popup reads the selection through activeTab + scripting, only when opened', () => {
  const popup = read('popup.js');
  assert.match(popup, /chrome\.scripting\.executeScript/);
  assert.ok(!/tabs\.sendMessage/.test(popup + read('background.js')));
});

test('every shipped script parses', () => {
  for (const f of sources) {
    const r = spawnSync(process.execPath, ['--check', path.join(EXT, f)], { encoding: 'utf8' });
    assert.equal(r.status, 0, `${f} has a syntax error:\n${r.stderr}`);
  }
});
