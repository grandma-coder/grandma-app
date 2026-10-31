// Device sweep: no horizontal overflow, and the black bar never covers the phone's in-device tab bar.
// BASE_URL (default http://localhost:3000), CHROME_PATH (default macOS Chrome).
import { BASE_URL, LOCALES, devices, launch, watchErrors, unhideOverflow } from './lib.mjs'

const DEVICES = ['iPhone SE', 'iPhone 13', 'iPhone 14 Pro Max', 'Pixel 7']
const STEP = 40
const failures = []
const fail = (label, msg) => { failures.push(`${label}: ${msg}`); console.log(`  FAIL ${msg}`) }

const browser = await launch()
for (const name of DEVICES) {
  if (!devices[name]) throw new Error(`unknown Playwright device: ${name}`)
  for (const loc of LOCALES) {
    const label = `${name} /${loc}`
    const ctx = await browser.newContext({ ...devices[name] })
    const page = await ctx.newPage()
    const errs = []
    watchErrors(page, errs)
    await page.goto(`${BASE_URL}/${loc}`, { waitUntil: 'load' })
    await page.waitForSelector('#phone nav')
    await page.waitForTimeout(600)
    await unhideOverflow(page)

    const m = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: innerWidth, h: document.documentElement.scrollHeight }))
    if (m.sw !== m.iw) fail(label, `scrollWidth ${m.sw} !== innerWidth ${m.iw}`)

    // scroll through the page; the bar counts when it is shown (not data-away) and has a box
    let overlaps = 0, barShown = 0, firstAt = null
    for (let y = 0; y <= m.h; y += STEP) {
      await page.evaluate((top) => scrollTo(0, top), y)
      await page.waitForTimeout(40)
      const r = await page.evaluate(() => {
        const bar = document.getElementById('tabbar'), tabs = document.querySelector('#phone nav')
        if (!bar || !tabs || bar.dataset.away === 'true') return { shown: false }
        const b = bar.getBoundingClientRect(), t = tabs.getBoundingClientRect()
        if (getComputedStyle(bar).visibility === 'hidden' || b.height === 0) return { shown: false }
        // only the part of the in-device tab bar that is on screen can be covered
        const vis = t.bottom > 0 && t.top < innerHeight && t.width > 0
        const hit = vis && b.top < t.bottom && b.bottom > t.top && b.left < t.right && b.right > t.left
        return { shown: true, hit, b: [b.top, b.bottom].map(Math.round), t: [t.top, t.bottom].map(Math.round) }
      })
      if (r.shown) barShown++
      if (r.hit) { overlaps++; firstAt ??= `scrollY ${y}: bar ${r.b} vs phone tabs ${r.t}` }
    }
    if (overlaps) fail(label, `black bar overlaps the phone tab bar in ${overlaps} scroll positions, first at ${firstAt}`)
    if (!barShown) fail(label, 'black bar was never shown while scrolling (check #tabbar / data-away)')
    for (const e of errs) fail(label, e)
    console.log(`${failures.some((f) => f.startsWith(label)) ? 'FAIL' : 'ok  '} ${label} (${devices[name].viewport.width}x${devices[name].viewport.height}, page ${m.h}px, bar shown at ${barShown} positions)`)
    await ctx.close()
  }
}
await browser.close()

if (failures.length) {
  console.log(`\n${failures.length} failure(s):\n${failures.map((f) => ` - ${f}`).join('\n')}`)
  process.exit(1)
}
console.log('\nAll devices clean.')
