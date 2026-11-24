#!/usr/bin/env node
/**
 * Fails when Google's Modern Web Guidance `legacy-scan` finds legacy web-platform patterns
 * (https://github.com/GoogleChrome/modern-web-guidance-src) in the web app or the extension.
 * The tool runs through npx at the exact version in package.json; accepted exceptions go in
 * scripts/modern-web-allowlist.json as "guideId path" strings, each with a reason in the commit message.
 *
 *   npm run test:modern-web
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { unlistedFindings, formatReport } from './modern-web.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TARGETS = ['frontend/src', 'frontend/public', 'extension'];

// The tool is run with npx at an exact version, given by the npm script (package.json): no dependency to
// install, and no floating "latest" either. Lifecycle scripts are not needed and not run.
const spec = process.argv[2];
if (!/^modern-web-guidance@\d+\.\d+\.\d+$/.test(spec ?? '')) {
  console.error('usage: node scripts/check-modern-web.mjs modern-web-guidance@<exact version>');
  process.exit(2);
}
const allowed = JSON.parse(fs.readFileSync(path.join(root, 'scripts/modern-web-allowlist.json'), 'utf8'));

const scans = TARGETS.map((target) =>
  JSON.parse(execFileSync('npx', ['--yes', '--ignore-scripts', spec, 'legacy-scan', target, '--json'], { cwd: root, encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 })));

const findings = unlistedFindings(scans, allowed);
const rules = Math.max(...scans.map((s) => s.activeRuleCount ?? 0));
console.log(`${spec}: ${rules} rules checked in ${TARGETS.join(', ')}`);
console.log(formatReport(findings));
process.exit(findings.length ? 1 : 0);
