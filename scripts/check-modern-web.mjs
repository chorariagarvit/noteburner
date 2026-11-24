#!/usr/bin/env node
/**
 * Fails when Google's Modern Web Guidance `legacy-scan` finds legacy web-platform patterns
 * (https://github.com/GoogleChrome/modern-web-guidance-src) in the web app or the extension.
 * The tool is a pinned devDependency (see package.json); accepted exceptions go in
 * scripts/modern-web-allowlist.json as "guideId path" strings, each with a reason in the commit message.
 *
 *   npm run test:modern-web
 */
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { unlistedFindings, formatReport } from './modern-web.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TARGETS = ['frontend/src', 'frontend/public', 'extension'];

const require = createRequire(import.meta.url);
const pkgFile = require.resolve('modern-web-guidance/package.json');
const pkg = JSON.parse(fs.readFileSync(pkgFile, 'utf8'));
const bin = path.join(path.dirname(pkgFile), typeof pkg.bin === 'string' ? pkg.bin : pkg.bin['modern-web-guidance']);
const allowed = JSON.parse(fs.readFileSync(path.join(root, 'scripts/modern-web-allowlist.json'), 'utf8'));

const scans = TARGETS.map((target) =>
  JSON.parse(execFileSync(process.execPath, [bin, 'legacy-scan', target, '--json'], { cwd: root, encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 })));

const findings = unlistedFindings(scans, allowed);
const rules = Math.max(...scans.map((s) => s.activeRuleCount ?? 0));
console.log(`modern-web-guidance ${pkg.version}: ${rules} rules checked in ${TARGETS.join(', ')}`);
console.log(formatReport(findings));
process.exit(findings.length ? 1 : 0);
