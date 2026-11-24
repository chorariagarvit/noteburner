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

// The tool is run with npx at an exact version, fixed here: no dependency to install, no floating "latest",
// and nothing from the command line reaches the command. Lifecycle scripts are not needed and not run.
const spec = 'modern-web-guidance@1.0.2';
// npx sits next to the node that is running this script, so no PATH lookup decides what gets executed
const npx = path.join(path.dirname(process.execPath), 'npx');
const allowed = JSON.parse(fs.readFileSync(path.join(root, 'scripts/modern-web-allowlist.json'), 'utf8'));

const scans = TARGETS.map((target) =>
  JSON.parse(execFileSync(npx, ['--yes', '--ignore-scripts', spec, 'legacy-scan', target, '--json'], { cwd: root, encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 })));

const findings = unlistedFindings(scans, allowed);
const rules = Math.max(...scans.map((s) => s.activeRuleCount ?? 0));
console.log(`${spec}: ${rules} rules checked in ${TARGETS.join(', ')}`);
console.log(formatReport(findings));
process.exit(findings.length ? 1 : 0);
