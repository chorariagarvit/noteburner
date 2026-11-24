/**
 * Stamps a unique build id into the built service worker.
 *
 * public/sw.js contains the placeholder `__BUILD_ID__`. Hand-editing a cache version meant a deploy
 * without a manual bump shipped a byte-identical sw.js, so browsers never noticed an update and kept
 * serving old cached files. Now every build gets a new id, so the browser installs the new worker and
 * the old caches are cleaned up by its `activate` handler.
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

export const PLACEHOLDER = '__BUILD_ID__';

export const stampServiceWorker = (source, buildId) => source.split(PLACEHOLDER).join(buildId);

// Absolute locations only, so nothing on the caller's PATH can stand in for `git`
const GIT_LOCATIONS = ['/usr/bin/git', '/usr/local/bin/git', '/opt/homebrew/bin/git'];

const readGitRef = () => {
  const git = GIT_LOCATIONS.find((candidate) => fs.existsSync(candidate));
  if (!git) return '';
  try { return execFileSync(git, ['rev-parse', '--short=8', 'HEAD'], { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim(); } catch { return ''; }
};

/**
 * "<package version>-<commit>" in CI (GITHUB_SHA); locally "<version>-<commit>-<timestamp>" so that
 * every local build is distinct even when the working tree has uncommitted changes.
 */
export function makeBuildId(version, env = process.env, gitRef = readGitRef, now = Date.now) {
  if (env.GITHUB_SHA) return `${version}-${env.GITHUB_SHA.slice(0, 8)}`;
  const ref = gitRef();
  const refPart = ref ? `${ref}-` : '';
  return `${version}-${refPart}${now().toString(36)}`;
}

export function swVersionPlugin(version) {
  let outDir = 'dist';
  let root = process.cwd();
  return {
    name: 'sw-build-version',
    apply: 'build',
    configResolved(config) { outDir = config.build.outDir; root = config.root; },
    closeBundle() {
      const file = path.resolve(root, outDir, 'sw.js');
      if (!fs.existsSync(file)) return;
      const stamped = stampServiceWorker(fs.readFileSync(file, 'utf8'), makeBuildId(version));
      if (stamped.includes(PLACEHOLDER)) throw new Error('sw.js still contains the build id placeholder');
      fs.writeFileSync(file, stamped);
    },
  };
}
