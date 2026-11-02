import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { SITE_STICKER_NAMES } from '../SiteSticker'

describe('SiteSticker', () => {
  it('ships a plain and a die-cut PNG for every sticker', () => {
    expect(SITE_STICKER_NAMES.length).toBe(58) // 56 from the site + poop, pee drawn for the app
    for (const n of SITE_STICKER_NAMES) {
      for (const f of [`${n}.png`, `${n}-cut.png`]) expect(existsSync(join(__dirname, '../../../assets/stickers-site', f))).toBe(true)
    }
  })
})
