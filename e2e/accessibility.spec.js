/**
 * Accessibility (WCAG 2.1 A/AA, via axe-core) of every page, in light AND dark mode.
 * Colour contrast is part of AA, so this is also the light/dark contrast check.
 * Fails on serious and critical violations; lesser ones are attached to the report.
 */
import { test, expect } from './fixtures.js';
import { AxeBuilder } from '@axe-core/playwright';
import { API, newUser, d1 } from './api-helpers.js';

test.describe.configure({ timeout: 120_000 });
test.beforeEach(async ({}, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'one engine is enough for an axe scan');
});

const PUBLIC_PAGES = ['/', '/create', '/login', '/signup', '/forgot-password', '/reset-password?token=sample', '/verify-email?token=sample',
  '/achievements', '/leaderboard', '/referrals', '/invite', '/privacy', '/changelog', '/support', '/docs/api', '/pricing', '/premium',
  '/m/sample-token-for-the-scan', '/page-that-does-not-exist'];
const TEAM_PAGES = ['/api-keys', '/teams', '/teams/new', '/teams/:id', '/teams/:id/branding', '/teams/:id/compliance'];
const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

async function scan(page, path, theme, testInfo, session) {
  await page.emulateMedia({ colorScheme: theme, reducedMotion: 'reduce' });
  await page.addInitScript(({ theme, session }) => {
    localStorage.setItem('color-scheme', theme); // pin the scheme (no .dark class any more: the page follows <meta name=color-scheme>)
    localStorage.setItem('noteburner_onboarding_complete', 'true');
    if (session) sessionStorage.setItem('sessionToken', session);
  }, { theme, session });
  await page.goto(path, { waitUntil: 'networkidle' });
  await page.addStyleTag({ content: '*, *::before, *::after { animation: none !important; transition: none !important; }' });
  await page.waitForTimeout(400);
  expect(await page.evaluate(() => getComputedStyle(document.documentElement).colorScheme), `colour scheme for ${theme}`).toBe(theme);

  const results = await new AxeBuilder({ page }).withTags(TAGS).analyze();
  const summary = (v) => `${v.id} [${v.impact}] x${v.nodes.length}: ${v.help} | e.g. ${v.nodes.slice(0, 2).map((n) => n.target.join(' ')).join(' ; ')}`;
  const minor = results.violations.filter((v) => !['serious', 'critical'].includes(v.impact));
  if (minor.length) await testInfo.attach('minor-and-moderate.txt', { body: minor.map(summary).join('\n') });
  const blocking = results.violations.filter((v) => ['serious', 'critical'].includes(v.impact));
  expect(blocking.map(summary), `${path} (${theme})`).toEqual([]);
}

for (const theme of ['light', 'dark']) {
  test.describe(`${theme} mode`, () => {
    for (const path of PUBLIC_PAGES) {
      test(`${path} has no serious accessibility violations`, async ({ page }, testInfo) => scan(page, path, theme, testInfo));
    }
    test('signed-in team pages have no serious accessibility violations', async ({ page, request }, testInfo) => {
      const user = await newUser(request);
      const { team } = await (await request.post(`${API}/teams`, { headers: user.headers, data: { name: 'Axe Team' } })).json();
      d1(`UPDATE teams SET plan = 'enterprise' WHERE id = '${team.id}'`);
      const failures = [];
      for (const p of TEAM_PAGES) {
        try { await scan(page, p.replace(':id', team.id), theme, testInfo, user.token); } catch (err) { failures.push(String(err.message).split('\n').slice(0, 12).join('\n')); }
      }
      expect(failures, failures.join('\n---\n')).toEqual([]);
    });
  });
}
