/**
 * Renders every Green Arc brand asset from scripts/brand-mark.mjs.
 *
 *   node scripts/generate-brand-assets.mjs
 *
 * Rasterising needs a headless Chromium. This resolves Playwright from the
 * project first and then from a global install, and says so plainly if it
 * finds neither — the SVG sources are written either way, so the vectors can
 * always be regenerated even where the PNGs cannot.
 */
import { mkdir, writeFile } from 'node:fs/promises';
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
}

await main();
