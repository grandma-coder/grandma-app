/**
 * Renders stickers from site/components/stickers/paths.ts to the app's PNGs
 * (assets/stickers-site/<name>.png and <name>-cut.png, 168×168), with the same
 * wobble and die-cut filters the site applies in the browser.
 *
 *   node scripts/stickers/render.cjs worry bone        # render these names
 *   node scripts/stickers/render.cjs --all              # render every path
 *
 * Needs a Playwright Chromium. Set PLAYWRIGHT_CORE to a playwright-core install and
 * CHROME to a chromium/headless-shell binary if they aren't resolvable here.
 * After adding a name, list it in components/stickers/SiteSticker.tsx (PLAIN + CUT).
 */
const fs = require('fs')
const path = require('path')
const { chromium } = require(process.env.PLAYWRIGHT_CORE || 'playwright-core')

const ROOT = path.resolve(__dirname, '../..')
const OUT = path.join(ROOT, 'assets/stickers-site')
const FILTERS = `<filter id="wob" x="-10%" y="-10%" width="120%" height="120%"><feTurbulence type="fractalNoise" baseFrequency=".045" numOctaves="2" seed="7"/><feDisplacementMap in="SourceGraphic" scale="2.4"/></filter><filter id="cut" x="-25%" y="-25%" width="150%" height="150%"><feMorphology in="SourceAlpha" operator="dilate" radius="3.4" result="d"/><feFlood flood-color="#fff"/><feComposite in2="d" operator="in" result="w"/><feGaussianBlur in="d" stdDeviation="2.4" result="b"/><feOffset in="b" dy="2.6" result="o"/><feFlood flood-color="#3a2c10" flood-opacity=".28"/><feComposite in2="o" operator="in" result="s"/><feMerge><feMergeNode in="s"/><feMergeNode in="w"/><feMergeNode in="SourceGraphic"/></feMerge></filter>`

function readPaths() {
  const src = fs.readFileSync(path.join(ROOT, 'site/components/stickers/paths.ts'), 'utf8')
  const out = {}
  for (const line of src.split('\n')) {
    const m = line.match(/^\s*([a-z0-9]+): (".*"),?$/)
    if (m) out[m[1]] = JSON.parse(m[2])
  }
  return out
}

;(async () => {
  const paths = readPaths()
  const args = process.argv.slice(2)
  const names = args[0] === '--all' ? Object.keys(paths) : args
  if (!names.length) throw new Error('Pass sticker names or --all')
  for (const n of names) if (!paths[n]) throw new Error(`No path for "${n}" in site/components/stickers/paths.ts`)
  const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {})
  const page = await browser.newPage({ viewport: { width: 168, height: 168 }, deviceScaleFactor: 1 })
  for (const n of names) {
    for (const cut of [false, true]) {
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="168" height="168" viewBox="-6 -6 76 76"><defs>${FILTERS}</defs><g${cut ? ' filter="url(#cut)"' : ''}><g filter="url(#wob)">${paths[n]}</g></g></svg>`
      await page.setContent(`<html><body style="margin:0;background:transparent">${svg}</body></html>`)
      await page.locator('svg').screenshot({ path: path.join(OUT, `${n}${cut ? '-cut' : ''}.png`), omitBackground: true })
    }
    console.log('rendered', n)
  }
  await browser.close()
})()
