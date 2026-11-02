import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { SITE_STICKER_NAMES } from '../SiteSticker'

describe('SiteSticker', () => {
  it('ships a plain and a die-cut PNG for every sticker', () => {
    expect(SITE_STICKER_NAMES.length).toBe(67) // 56 from the site + 11 drawn for the app (poop, pee, scale, pill, dumbbell, glass, foot, sun, stopwatch, headache, notebook)
    for (const n of SITE_STICKER_NAMES) {
      for (const f of [`${n}.png`, `${n}-cut.png`]) expect(existsSync(join(__dirname, '../../../assets/stickers-site', f))).toBe(true)
    }
  })
})
