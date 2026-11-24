import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseChangelog, getVersionStatus, formatDate } from '../src/utils/parseChangelog.js';

const changelog = readFileSync(new URL('../../CHANGELOG.md', import.meta.url), 'utf8');
const { version } = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));

test('the changelog page shows the released version first', () => {
  const [newest] = parseChangelog(changelog);
  assert.equal(newest.version, `v${version}`);
  assert.ok(newest.title, 'the newest entry needs a title');
  assert.ok(newest.features.length > 0, 'the newest entry lists what was added');
});

test('every entry has a version and a valid date', () => {
  for (const v of parseChangelog(changelog)) {
    assert.match(v.version, /^v\d+\.\d+\.\d+$/);
    assert.ok(!Number.isNaN(new Date(v.date).getTime()), `${v.version} has a bad date: ${v.date}`);
  }
});

test('sections are routed to the right list', () => {
  const [v] = parseChangelog('## [2.0.0] - 2026-01-02\n\n### Added - Big thing\n- one\n### Security\n- two\n### Fixed\n- three\n');
  assert.deepEqual([v.version, v.title, v.features, v.security, v.fixed], ['v2.0.0', 'Big thing', ['one'], ['two'], ['three']]);
});

test('status and date helpers', () => {
  assert.equal(getVersionStatus({ title: 'Planned work' }), 'planned');
  assert.equal(getVersionStatus({ title: 'Release' }), 'released');
  assert.equal(formatDate('not a date'), 'not a date');
});
