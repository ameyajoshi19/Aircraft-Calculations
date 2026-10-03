/**
 * Renders every Green Arc brand asset from scripts/brand-mark.mjs.
 *
 *   node scripts/generate-brand-assets.mjs
 *   node scripts/generate-brand-assets.mjs --preview
 *
 * --preview additionally writes assets/brand/preview.png, showing each asset
 * composited the way the platform actually composites it. That exists because
 * two of these layers are TRANSPARENT and only legible over the background
 * they ship with: viewing android-icon-foreground.png on a light page makes
 * its cream needle look invisible when nothing is wrong with it.
 *
 * Rasterising needs a headless Chromium. This resolves Playwright from the
 * project first and then from a global install, and says so plainly if it
 * finds neither — the SVG sources are written either way, so the vectors can
 * always be regenerated even where the PNGs cannot.
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  androidForeground, androidMonochrome, bundleMark, splashIcon, squareIcon, COLOURS,
} from './brand-mark.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const images = path.join(root, 'assets', 'images');
const vectors = path.join(root, 'assets', 'brand');

/** SVG source, then the PNGs Expo asks for. */
const SVGS = [
  ['icon.svg', squareIcon()],
  ['android-foreground.svg', androidForeground()],
  ['android-monochrome.svg', androidMonochrome()],
  ['splash.svg', splashIcon()],
  ['mark.svg', bundleMark()],
];

const PNGS = [
  // [source svg, output path, pixel size, transparent?]
  [squareIcon(), path.join(images, 'icon.png'), 1024, false],
  [androidForeground(), path.join(images, 'android-icon-foreground.png'), 1024, true],
  [androidMonochrome(), path.join(images, 'android-icon-monochrome.png'), 1024, true],
  [splashIcon(), path.join(images, 'splash-icon.png'), 512, true],
  [squareIcon(), path.join(images, 'favicon.png'), 64, false],
];

async function loadChromium() {
  const require = createRequire(import.meta.url);
  for (const spec of ['playwright', '/opt/node22/lib/node_modules/playwright/index.mjs']) {
    try {
      const mod = spec.startsWith('/') ? await import(spec) : require(spec);
      if (mod?.chromium) return mod.chromium;
    } catch {
      // Try the next location.
    }
  }
  return null;
}

async function main() {
  await mkdir(vectors, { recursive: true });
  for (const [name, body] of SVGS) {
    await writeFile(path.join(vectors, name), `${body}\n`, 'utf8');
  }
  console.log(`wrote ${SVGS.length} SVG sources to assets/brand/`);

  const chromium = await loadChromium();
  if (!chromium) {
    console.error('\nPlaywright not found, so the PNGs were not rendered.');
    console.error('Install it (npm i -D playwright && npx playwright install chromium) and re-run.');
    process.exitCode = 1;
    return;
  }

  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || undefined,
    args: ['--no-sandbox'],
  });
  try {
    for (const [body, out, size, transparent] of PNGS) {
      const page = await browser.newPage({ viewport: { width: size, height: size } });
      const html = `<!doctype html><meta charset="utf-8">`
        + `<style>html,body{margin:0;padding:0;background:${transparent ? 'transparent' : COLOURS.face}}`
        + `svg{display:block;width:${size}px;height:${size}px}</style>${body}`;
      await page.setContent(html, { waitUntil: 'load' });
      await page.screenshot({ path: out, omitBackground: transparent });
      await page.close();
      console.log(`  ${path.relative(root, out)}  ${size}x${size}`);
    }
  } finally {
    await browser.close();
  }
  console.log(`rendered ${PNGS.length} PNGs`);

  if (process.argv.includes('--preview')) await preview(browserFor(chromium));
}

function browserFor(chromium) {
  return chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ['--no-sandbox'] });
}

/**
 * Each asset over the background it actually ships against. The Android
 * layers are masked, because launchers mask them.
 */
async function preview(browserPromise) {
  const browser = await browserPromise;
  const tile = (label, inner) =>
    `<figure><div class="t">${inner}</div><figcaption>${label}</figcaption></figure>`;
  // Inlined rather than linked: a page delivered through setContent has an
  // opaque origin, and Chromium refuses to fetch file:// subresources into it.
  const inline = async (f) =>
    `data:image/png;base64,${(await readFile(path.join(images, f))).toString('base64')}`;
  const src = Object.fromEntries(
    await Promise.all(
      ['android-icon-foreground.png', 'android-icon-monochrome.png', 'icon.png', 'splash-icon.png']
        .map(async (f) => [f, await inline(f)])
    )
  );
  const img = (f) => src[f];
  const html = `<!doctype html><meta charset="utf-8"><style>
    body{margin:0;padding:28px;background:#F8F6F3;font:12px/1.4 system-ui,sans-serif;color:#79736B;
         display:flex;gap:22px}
    figure{margin:0;text-align:center} figcaption{margin-top:10px;max-width:180px}
    .t{width:180px;height:180px;position:relative;overflow:hidden}
    .t img{position:absolute;inset:0;width:100%;height:100%}
    .circle{border-radius:50%} .squircle{border-radius:44px}
    .adaptive{background:${COLOURS.face}}
    </style>
    ${tile('adaptive icon, circle mask', `<div class="t adaptive circle"><img src="${img('android-icon-foreground.png')}"></div>`)}
    ${tile('adaptive icon, squircle mask', `<div class="t adaptive squircle"><img src="${img('android-icon-foreground.png')}"></div>`)}
    ${tile('themed icon, dark', `<div class="t circle" style="background:#1A1A1C"><img src="${img('android-icon-monochrome.png')}" style="filter:invert(1) opacity(.85)"></div>`)}
    ${tile('themed icon, light', `<div class="t circle" style="background:#DCD6CA"><img src="${img('android-icon-monochrome.png')}"></div>`)}
    ${tile('icon.png', `<div class="t squircle"><img src="${img('icon.png')}"></div>`)}
    ${tile('splash, light', `<div class="t" style="background:#F8F6F3"><img src="${img('splash-icon.png')}"></div>`)}
    ${tile('splash, dark', `<div class="t" style="background:#0E0E10"><img src="${img('splash-icon.png')}"></div>`)}`;
  const page = await browser.newPage({ viewport: { width: 1480, height: 260 }, deviceScaleFactor: 2 });
  await page.setContent(html, { waitUntil: 'load' });
  const out = path.join(vectors, 'preview.png');
  await page.screenshot({ path: out, fullPage: true });
  await browser.close();
  console.log(`  ${path.relative(root, out)}`);
}

await main();
