// Full demo walk on /pt and /en, iPhone 13 and 1440x900: every phase, tab, feature screen, log sheet, chat, village,
// exams, memories, Explorar and the hero join (server action mocked at the network level).
// Fails on any page error or console error (Vercel insights ignored). BASE_URL, CHROME_PATH as in lib.mjs.
import { BASE_URL, LOCALES, devices, launch, watchErrors } from './lib.mjs'

const PROFILES = [
  { name: 'iPhone 13', mobile: true, opts: { ...devices['iPhone 13'] } },
  { name: 'desktop 1440x900', mobile: false, opts: { viewport: { width: 1440, height: 900 } } },
]
const ALL_SCREENS = ['home', 'agenda', 'week', 'profile', 'vaccines', 'memories', 'care', 'village', 'community', 'chat', 'exams', 'exam', 'appointments', 'reminders', 'pediatric', 'growth', 'privacy']
const PHASES = ['pre', 'preg', 'kids', 'meno']
// Hand-written RSC flight response for the `joinWaitlist` server action, matching what next@16.2.6 sends back
// (captured from a real call that returned { status: 'error' }, with the payload swapped to success).
// If a Next upgrade changes the wire format, the hero join step fails with "did not flip to the joined state":
// re-capture a real response (page.on('response') on the POST with a Next-Action header) and update this string.
const MOCK_BODY = '0:{"a":"$@1","f":"","q":"","i":false,"b":"qa-mock"}\n1:{"status":"success"}\n'

const P = '#phone'
const failures = []

// the walk must never reach a real backend: only run against a local server unless explicitly allowed
const { hostname } = new URL(BASE_URL)
if (!['localhost', '127.0.0.1', '[::1]'].includes(hostname) && process.env.QA_ALLOW_REMOTE !== '1') {
  console.error(`Refusing to run qa:walk against ${BASE_URL} (not localhost). Set QA_ALLOW_REMOTE=1 to override.`)
  process.exit(2)
}

async function runScenario(browser, loc, profile) {
  const label = `/${loc} ${profile.name}`
  const ctx = await browser.newContext(profile.opts)
  const page = await ctx.newPage()
  const problems = []
  const seen = new Set()
  const done = []
  let mocked = 0
  watchErrors(page, problems)

  // the waitlist server action never reaches Supabase: POSTs carrying a Next-Action header are answered here
  await page.route('**/*', (route) => {
    const req = route.request()
    const url = req.url()
    if (url.includes('supabase')) { problems.push(`unexpected request to ${url}`); return route.abort() }
    if (req.method() === 'POST' && req.headers()['next-action']) {
      mocked++
      return route.fulfill({ status: 200, contentType: 'text/x-component', body: MOCK_BODY })
    }
    // fail-safe: any other write (POST/PUT/PATCH/DELETE) is blocked and fails the run
    if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method())) {
      problems.push(`blocked unexpected ${req.method()} ${url}`)
      return route.abort()
    }
    return route.continue()
  })

  // ---- helpers (clicks go through element.click(): the tour's breathing target never passes actionability) ----
  const click = (sel, i = 0) => page.evaluate(([s, n]) => {
    const els = document.querySelectorAll(s)
    if (!els[n]) throw new Error(`no element for ${s}[${n}] (found ${els.length})`)
    els[n].click()
  }, [sel, i])
  const count = (sel) => page.evaluate((s) => document.querySelectorAll(s).length, sel)
  const text = (sel) => page.evaluate((s) => document.querySelector(s)?.textContent ?? null, sel)
  const setValue = (sel, v, i = 0) => page.evaluate(([s, val, n]) => {
    const el = document.querySelectorAll(s)[n]
    if (!el) throw new Error(`no input ${s}[${n}]`)
    const proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype
    Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, val)
    el.dispatchEvent(new Event('input', { bubbles: true }))
  }, [sel, String(v), i])
  const screen = () => page.evaluate(() => document.querySelector('#phone [data-screen]')?.getAttribute('data-screen') ?? null)
  const snap = async () => { const s = await screen(); if (s) seen.add(s); return s }
  const settle = (ms = 150) => page.waitForTimeout(ms)
  const expect = (cond, msg) => { if (!cond) throw new Error(msg) }
  // iOS Safari zooms the page into any text field under 16px on focus
  const font16 = async (sel) => {
    const px = await page.evaluate((s) => [...document.querySelectorAll(s)].map((e) => parseFloat(getComputedStyle(e).fontSize)), sel)
    expect(px.length > 0, `no field for ${sel}`)
    expect(px.every((p) => p >= 16), `${sel} font-size ${px.join(', ')}px < 16px (iOS zooms on focus)`)
  }
  const waitScreen = async (want) => {
    await page.waitForFunction((w) => document.querySelector('#phone [data-screen]')?.getAttribute('data-screen') === w, want, { timeout: 5000 })
      .catch(async () => { throw new Error(`expected screen "${want}", got "${await screen()}"`) })
    await snap()
  }
  const sheetOpen = (open) => page.waitForFunction(([o]) => {
    const d = document.querySelector('#phone [role=dialog]')
    return !!d && (d.getAttribute('aria-hidden') === 'false') === o
  }, [open], { timeout: 5000 })
  const step = async (name, fn) => {
    try { await fn(); done.push(name) } catch (e) { problems.push(`step "${name}": ${e.message.split('\n')[0]}`) }
  }
  const tab = async (i) => { await click(`${P} nav button`, i); await settle(); return snap() } // 0 home, 1 agenda, 3 week, 4 profile
  const home = async () => {
    if (await page.evaluate(() => document.querySelector('#phone [role=dialog]')?.getAttribute('aria-hidden') === 'false')) {
      await click('#phone [role=dialog] [class*="shTop"] button:last-child'); await sheetOpen(false)
    }
    await tab(0)
  }
  const mode = async (i) => { await click('#modes button', i); await settle(250); await home() }
  const bottom = () => page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight))
  const top = () => page.evaluate(() => scrollTo(0, 0))
  /** Click every button of the current screen in turn (up to `max`), recording where each lands and coming back via `back`. */
  const pokeAll = async (sel, back, max = 40) => {
    const n = Math.min(await count(sel), max)
    for (let i = 0; i < n; i++) {
      await click(sel, i); await settle(120)
      const s = await snap()
      if (await page.evaluate(() => document.querySelector('#phone [role=dialog]')?.getAttribute('aria-hidden') === 'false')) { await click('#phone [role=dialog] [class*="shTop"] button:last-child'); await sheetOpen(false) }
      await back()
    }
  }

  // ---- load, skip the tour once ----
  await page.goto(`${BASE_URL}/${loc}`, { waitUntil: 'load' })
  await page.waitForSelector(`${P} nav button`)
  await page.waitForSelector('[data-coach] small button', { state: 'attached' })
  await settle(400)
  // With the tour running, a sheet's focus() used to scroll the overflow:hidden phone ~500px (content stuck shifted up).
  await step('tour on: opening a sheet leaves the phone unscrolled', async () => {
    await click(`${P} [data-screen=home] button[class*="chip"]`, 0)
    await sheetOpen(true)
    await settle(700)
    const scrolled = await page.evaluate(() => [...document.querySelectorAll('#phone *')]
      .filter((e) => e.scrollTop > 0 && !e.matches('[role=dialog], [data-screen]'))
      .map((e) => `${String(e.className).split(' ')[0]}=${e.scrollTop}`))
    expect(scrolled.length === 0, `phone containers scrolled: ${scrolled.join(', ')}`)
    await click('#phone [role=dialog] [class*="shTop"] button:last-child'); await sheetOpen(false)
  })
  await step('skip tour', async () => {
    await click('[data-coach] small button')
    await page.waitForFunction(() => !document.querySelector('[data-coach]'), null, { timeout: 3000 })
  })
  await step('phone hydrated, home screen', async () => { await waitScreen('home') })

  // ---- log sheets: every chip of the current home screen, whatever its sheet type ----
  const logAllChips = async (tag) => {
    const chips = await count(`${P} [data-screen=home] button[class*="chip"]`)
    expect(chips > 0, `${tag}: no chips`)
    for (let i = 0; i < chips; i++) {
      await step(`${tag} log chip ${i}`, async () => {
        const rows = await count(`${P} [data-testid=today] li`)
        await click(`${P} [data-screen=home] button[class*="chip"]`, i)
        await sheetOpen(true)
        const kinds = await page.evaluate(() => {
          const d = document.querySelector('#phone [role=dialog]')
          return ['faces', 'tile2', 'input[type=range]', 'kick'].filter((k) => d.querySelector(k.includes('[') ? k : `[class*="${k}"]`))
        })
        const dlg = `${P} [role=dialog]`
        if (kinds.includes('faces')) await click(`${dlg} [class*="faces"] button`, 3)
        if (kinds.includes('tile2')) await click(`${dlg} button[class*="tile2"]`, 1)
        if (kinds.includes('input[type=range]')) await page.evaluate(() => {
          const el = document.querySelector('#phone [role=dialog] input[type=range]')
          Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, el.max)
          el.dispatchEvent(new Event('input', { bubbles: true }))
        })
        if (kinds.includes('kick')) for (let k = 0; k < 3; k++) await click(`${dlg} button[class*="kick"]`)
        await font16(`${dlg} textarea`)
        await setValue(`${dlg} textarea`, `qa note <b>x</b> ${tag} ${i}`)
        await click(`${dlg} button[class*="save"]`)
        await sheetOpen(false)
        await settle(200)
        const after = await count(`${P} [data-testid=today] li`)
        expect(after === rows + 1 || tag.startsWith('kids'), `${tag} chip ${i} (${kinds.join(',') || 'no input'}): rows ${rows} -> ${after}`)
        seen.add(`sheet:${kinds[0] ?? 'none'}`)
      })
    }
  }

  // ---- phases ----
  for (let m = 0; m < PHASES.length; m++) {
    const ph = PHASES[m]
    await step(`phase ${ph}: switch`, async () => { await mode(m); await waitScreen('home') })

    if (ph === 'pre') {
      for (const g of [1, 0]) {
        await step(`pre goal ${g}`, async () => {
          await click(`${P} [data-screen=home] [class*="sw"] button`, g); await settle()
          expect(await page.evaluate((n) => document.querySelectorAll('#phone [data-screen=home] [class*="sw"] button')[n].getAttribute('aria-pressed') === 'true', g), `goal ${g} not pressed`)
          await logAllChips(`pre goal ${g}`)
        })
      }
    }
    if (ph === 'preg') {
      await step('preg week slider', async () => {
        const slider = `${P} [data-screen=home] input[type=range]`
        const facts = []
        for (const v of ['0', '12', '24', '39']) {
          await setValue(slider, v); await settle(120)
          facts.push(await text(`${P} [data-screen=home] [class*="fact"]`))
        }
        expect(new Set(facts).size > 1, 'week slider did not change the fact line')
      })
      await logAllChips('preg')
    }
    if (ph === 'kids') {
      await step('kids switch', async () => {
        for (const k of [1, 2, 0]) {
          await click(`${P} [data-screen=home] [role=group] button`, k); await settle()
          expect(await page.evaluate((n) => document.querySelectorAll('#phone [data-screen=home] [role=group] button')[n].getAttribute('aria-pressed') === 'true', k), `kid ${k} not pressed`)
        }
        await click(`${P} [data-screen=home] [role=group] button`, 0)
        // duo card -> single kid
        await click(`${P} [data-screen=home] button[class*="kidc"]`, 0); await settle()
      })
      await logAllChips('kids')
    }
    if (ph === 'meno') await logAllChips('meno')

    await step(`${ph}: tabs`, async () => {
      for (const [i, want] of [[1, 'agenda'], [3, 'week'], [4, 'profile'], [0, 'home']]) {
        const got = await tab(i)
        expect(got === want, `tab ${i}: expected ${want}, got ${got}`)
      }
    })
    await step(`${ph}: shortcuts sheet`, async () => {
      await click(`${P} nav button`, 2); await sheetOpen(true)
      const n = await count('#phone [role=dialog] [class*="shortcuts"] button')
      expect(n > 0, 'no shortcut buttons')
      await home()
      for (let i = 0; i < n; i++) {
        await click(`${P} nav button`, 2); await sheetOpen(true)
        await click('#phone [role=dialog] [class*="shortcuts"] button', i); await settle(150)
        await snap(); await sheetOpen(false); await home()
      }
    })
    await step(`${ph}: poke week`, async () => { await tab(3); await pokeAll(`${P} [data-screen=week] button`, () => tab(3)); await home() })
    await step(`${ph}: poke agenda`, async () => { await tab(1); await pokeAll(`${P} [data-screen=agenda] button`, () => tab(1)); await home() })
    await step(`${ph}: poke profile`, async () => { await tab(4); await pokeAll(`${P} [data-screen=profile] button:not([class*="back"])`, () => tab(4)); await home() })
    await step(`${ph}: home quick access`, async () => {
      const n = await count(`${P} [data-screen=home] button[class*="qa"]`)
      for (let i = 0; i < n; i++) { await click(`${P} [data-screen=home] button[class*="qa"]`, i); await settle(150); await snap(); await home() }
    })
  }

  // ---- feature screens (12 stickers: phases + 8 screens), via the desktop sticker sheet or phone Explorar ----
  const runFeat = async (n) => {
    if (profile.mobile) {
      await bottom()
      await page.waitForFunction(() => document.getElementById('tabbar')?.dataset.away === 'false', null, { timeout: 5000 })
      await click('#tabbar [data-tab=explore]')
      await page.waitForFunction(() => document.getElementById('explore')?.getAttribute('aria-hidden') === 'false', null, { timeout: 3000 })
      await click(`#explore [data-feat="${n}"]`)
      await page.waitForFunction(() => document.getElementById('explore')?.getAttribute('aria-hidden') === 'true', null, { timeout: 3000 })
    } else {
      await click('button[class*="stk"]', n)
    }
    await settle(500)
    return snap()
  }
  const FEAT_SCREEN = { 4: 'vaccines', 5: 'memories', 6: 'care', 7: 'village', 8: 'community', 9: 'pediatric', 10: 'growth', 11: 'privacy' }
  for (let n = 0; n < 12; n++) {
    await step(`feat ${n}`, async () => {
      if (n === 4 || n === 9 || n === 10) { await top(); await mode(0) } // kids-only screens must switch the phase themselves
      const got = await runFeat(n)
      if (FEAT_SCREEN[n]) expect(got === FEAT_SCREEN[n], `feat ${n}: expected ${FEAT_SCREEN[n]}, got ${got}`)
      else expect((await page.evaluate(() => [...document.querySelectorAll('#modes button')].findIndex((b) => b.getAttribute('aria-pressed') === 'true'))) === n, `feat ${n}: phase not switched`)
      expect((await text(`${P} [data-screen]`) ?? '').trim().length > 0, `feat ${n}: empty screen`)
    })
  }
  await step('growth chart from week (kids)', async () => { await top(); await mode(2); await tab(3); await pokeAll(`${P} [data-screen=week] button`, () => tab(3)); await home() })

  // ---- village: like, comment ----
  await step('village like + comment', async () => {
    await top(); await mode(2); await runFeat(7); await waitScreen('village')
    const like = `${P} [data-screen=village] article button[aria-pressed]`
    const before = await page.evaluate((s) => document.querySelector(s).getAttribute('aria-pressed'), like)
    await click(like); await settle(120)
    expect(await page.evaluate((s) => document.querySelector(s).getAttribute('aria-pressed'), like) !== before, 'like did not toggle')
    await click(`${P} [data-screen=village] article button[aria-expanded]`); await settle(150)
    const cm = await count(`${P} [data-screen=village] article [class*="cmts"] p`)
    await font16(`${P} [data-screen=village] article [class*="cmtIn"] input`)
    await setValue(`${P} [data-screen=village] article [class*="cmtIn"] input`, 'qa comment <i>x</i>')
    await click(`${P} [data-screen=village] article [class*="cmtIn"] button`); await settle(150)
    expect((await count(`${P} [data-screen=village] article [class*="cmts"] p`)) === cm + 1, 'comment not added')
  })

  // ---- chat: community -> channel -> send, wait for the reply ----
  await step('chat send + reply', async () => {
    await top(); await runFeat(8); await waitScreen('community')
    await click(`${P} [data-screen=community] button[class*="chan"]`); await waitScreen('chat')
    const msgs = `${P} [data-screen=chat] div[class*="msg"]`
    const n0 = await count(msgs)
    await font16(`${P} [data-screen=chat] form input`)
    await setValue(`${P} [data-screen=chat] form input`, 'hello from the qa walk')
    await click(`${P} [data-screen=chat] form button`); await settle(150)
    expect((await count(msgs)) === n0 + 1, 'sent message not shown')
    await page.waitForFunction(([s, n]) => document.querySelectorAll(s).length >= n, [msgs, n0 + 2], { timeout: 8000 })
      .catch(() => { throw new Error('no reply to the chat message within 8 s') })
    await click(`${P} [data-screen=chat] button[class*="back"]`); await waitScreen('community')
  })

  // ---- exams: quick access in a phase that has it, add an exam; memories: new memory ----
  await step('add exam', async () => {
    await top(); await mode(1)
    const n = await count(`${P} [data-screen=home] button[class*="qa"]`)
    let found = false
    for (let i = 0; i < n && !found; i++) {
      await click(`${P} [data-screen=home] button[class*="qa"]`, i); await settle(150)
      if ((await snap()) === 'exams') found = true; else await home()
    }
    expect(found, 'no exams quick access in preg')
    const rows = await count(`${P} [data-screen=exams] button[class*="exam"]`)
    await click(`${P} [data-screen=exams] button[class*="add"]`); await sheetOpen(true)
    await click(`${P} [role=dialog] button[class*="save"]`)
    await waitScreen('exam')
    await click(`${P} [data-screen=exam] button[class*="back"]`); await waitScreen('exams')
    expect((await count(`${P} [data-screen=exams] button[class*="exam"]`)) === rows + 1, 'exam list did not grow')
    await home()
  })
  await step('new memory', async () => {
    await top(); await mode(2); await runFeat(5); await waitScreen('memories')
    const n = await count(`${P} [data-memory]`)
    await click(`${P} [data-screen=memories] button[class*="newmem"]`); await settle(200)
    expect((await count(`${P} [data-memory]`)) === n + 1, 'memory not added')
  })

  // ---- coverage: every screen id of the registry and every sheet type was reached ----
  const missing = ALL_SCREENS.filter((s) => !seen.has(s))
  if (missing.length) problems.push(`screens never reached: ${missing.join(', ')}`)
  const sheets = ['faces', 'tile2', 'input[type=range]', 'kick'].filter((k) => !seen.has(`sheet:${k}`))
  if (sheets.length) problems.push(`sheet types never saved: ${sheets.join(', ')}`)

  // ---- phones: black bar, Explorar, list pop-up ----
  if (profile.mobile) {
    await step('list pop-up + Explorar join', async () => {
      await bottom()
      await page.waitForFunction(() => document.getElementById('tabbar')?.dataset.away === 'false', null, { timeout: 5000 })
      await click('#tabbar [data-tab=list]')
      await page.waitForFunction(() => document.getElementById('list-pop')?.getAttribute('aria-hidden') === 'false', null, { timeout: 3000 })
      await page.keyboard.press('Escape')
      await page.waitForFunction(() => document.getElementById('list-pop')?.getAttribute('aria-hidden') === 'true', null, { timeout: 3000 })
      await click('#tabbar [data-tab=explore]')
      await page.waitForFunction(() => document.getElementById('explore')?.getAttribute('aria-hidden') === 'false', null, { timeout: 3000 })
      await click('#explore button[class*="xpJoin"]')
      await page.waitForFunction(() => document.getElementById('list-pop')?.getAttribute('aria-hidden') === 'false', null, { timeout: 3000 })
      await click('#list-pop [class*="shTop"] button')
      await page.waitForFunction(() => document.getElementById('list-pop')?.getAttribute('aria-hidden') === 'true', null, { timeout: 3000 })
    })
    await step('bar tabs Home / Log / Memories', async () => {
      await bottom()
      await page.waitForFunction(() => document.getElementById('tabbar')?.dataset.away === 'false', null, { timeout: 5000 })
      await click('#tabbar [data-tab=memories]'); await waitScreen('memories')
      await bottom()
      await page.waitForFunction(() => document.getElementById('tabbar')?.dataset.away === 'false', null, { timeout: 5000 })
      await click('#tabbar [data-tab=log]'); await sheetOpen(true)
      await home()
    })
  }

  // ---- join through the hero field (mocked server action) ----
  await step('hero join (mocked)', async () => {
    await top(); await settle(200)
    await font16('input[type=email]')
    await setValue('form[data-tour=join] input[type=email]', 'qa@example.com')
    await click('form[data-tour=join] button[type=submit]')
    await page.waitForFunction(() => !document.querySelector('form[data-tour=join]') && document.querySelector('[role=status]'), null, { timeout: 5000 })
      .catch(() => { throw new Error('hero did not flip to the joined state') })
    expect(mocked === 1, `expected exactly 1 mocked action call, saw ${mocked}`)
    expect((await count('input[type=email]')) === 0, 'email fields still visible after joining')
  })

  await ctx.close()
  const ok = problems.length === 0
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${label}: ${done.length} steps ok, ${seen.size} distinct screens/sheet types seen`)
  for (const p of problems) { console.log(`  - ${p}`); failures.push(`${label}: ${p}`) }
}

const browser = await launch()
for (const loc of LOCALES) for (const profile of PROFILES) await runScenario(browser, loc, profile)
await browser.close()

if (failures.length) {
  console.log(`\n${failures.length} problem(s)`)
  process.exit(1)
}
console.log('\nWalk clean: zero page errors, zero console errors.')
