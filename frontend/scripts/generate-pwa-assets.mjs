/**
 * Regenerates the PWA images referenced by frontend/public/manifest.json (icons, badge, shortcut
 * icons and, optionally, store screenshots). Rendered with Chromium so no image tools are needed.
 *
 *   node frontend/scripts/generate-pwa-assets.mjs                      # icons, badge, shortcuts
 *   node frontend/scripts/generate-pwa-assets.mjs --screenshots        # + screenshots of the running app
 *   node frontend/scripts/generate-pwa-assets.mjs --screenshots --base http://localhost:5173
 *
 * The screenshots need the dev servers running (`npm run dev:backend` and `npm run dev:frontend`).
 * Commit the generated files; frontend/test/pwa-assets.test.js checks they match the manifest.
 */
import { chromium } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const PUBLIC = path.resolve('frontend/public');
const ICONS = path.join(PUBLIC, 'icons');
const SHOTS = path.join(PUBLIC, 'screenshots');
const args = process.argv.slice(2);
const withScreenshots = args.includes('--screenshots');
const base = args.includes('--base') ? args[args.indexOf('--base') + 1] : 'http://localhost:5173';

const NAVY = '#0f172a';   // manifest background_color
const FLAME = 'M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z';
const TROPHY = ['M6 9H4.5a2.5 2.5 0 0 1 0-5H6', 'M18 9h1.5a2.5 2.5 0 0 0 0-5H18', 'M4 22h16',
  'M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22', 'M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22', 'M18 2H6v7a6 6 0 0 0 12 0V2Z'];

/** A glyph (24x24 design) centred in a square, occupying `fraction` of the width: 0.5 keeps it inside the maskable safe zone. */
const centred = (inner, size, fraction) => {
  const scale = (size * fraction) / 24;
  const offset = (size - 24 * scale) / 2;
  return `<g transform="translate(${offset} ${offset}) scale(${scale})">${inner}</g>`;
};

const defs = `<defs><linearGradient id="g" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="#dc2626"/><stop offset="1" stop-color="#fb923c"/></linearGradient></defs>`;

const flameGradient = `<path d="${FLAME}" fill="url(#g)" stroke="#fecaca" stroke-width="0.6" stroke-linejoin="round"/>`;
const flameWhite = `<path d="${FLAME}" fill="#ffffff"/>`;

const appIcon = (size) => `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">${defs}
  <rect width="${size}" height="${size}" fill="${NAVY}"/>
  ${centred(flameGradient, size, 0.5)}</svg>`;

const badge = (size) => `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  ${centred(flameWhite, size, 0.8)}</svg>`;

const shortcutBase = (size, glyph) => `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">${defs}
  <rect width="${size}" height="${size}" rx="${size * 0.2}" fill="${NAVY}"/>
  <circle cx="${size / 2}" cy="${size / 2}" r="${size * 0.36}" fill="url(#g)"/>
  ${centred(glyph, size, 0.44)}</svg>`;
const plus = `<g stroke="#fff" stroke-width="2.4" stroke-linecap="round"><path d="M12 5v14"/><path d="M5 12h14"/></g>`;
const trophyPaths = TROPHY.map((d) => `<path d="${d}"/>`).join('');
const trophy = `<g fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${trophyPaths}</g>`;

const browser = await chromium.launch();

async function render(svg, size, file, { transparent = false } = {}) {
  const page = await browser.newPage({ viewport: { width: size, height: size }, deviceScaleFactor: 1 });
  await page.setContent(`<html><body style="margin:0;background:transparent">${svg}</body></html>`);
  await page.screenshot({ path: file, omitBackground: transparent, clip: { x: 0, y: 0, width: size, height: size } });
  await page.close();
  console.log('wrote', path.relative(process.cwd(), file));
}

fs.mkdirSync(ICONS, { recursive: true });
for (const size of [72, 96, 128, 144, 152, 192, 384, 512]) await render(appIcon(size), size, path.join(ICONS, `icon-${size}x${size}.png`));
await render(badge(72), 72, path.join(ICONS, 'badge-72x72.png'), { transparent: true });
await render(shortcutBase(96, plus), 96, path.join(ICONS, 'create-shortcut.png'), { transparent: true });
await render(shortcutBase(96, trophy), 96, path.join(ICONS, 'trophy-shortcut.png'), { transparent: true });

if (withScreenshots) {
  fs.mkdirSync(SHOTS, { recursive: true });
  const shoot = async (file, viewport, scale) => {
    const context = await browser.newContext({ viewport, deviceScaleFactor: scale, colorScheme: 'light', serviceWorkers: 'block' });
    await context.addInitScript(() => { try { localStorage.setItem('noteburner_onboarding_complete', 'true'); } catch { /* ignore */ } });
    const page = await context.newPage();
    await page.goto(base);
    await page.getByRole('heading', { level: 1 }).first().waitFor();
    await page.waitForTimeout(1500);
    await page.screenshot({ path: file });
    await context.close();
    console.log('wrote', path.relative(process.cwd(), file));
  };
  await shoot(path.join(SHOTS, 'desktop-1.png'), { width: 1280, height: 720 }, 1);   // 1280x720
  await shoot(path.join(SHOTS, 'mobile-1.png'), { width: 375, height: 667 }, 2);     // 750x1334
}

await browser.close();
