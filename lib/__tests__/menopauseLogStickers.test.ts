import { MENOPAUSE_LOG_STICKER } from '../logStickers'
import { ALL_MENOPAUSE_SYMPTOMS } from '../menopauseSymptoms'
import { en } from '../i18n/en'
import { ptBR as pt } from '../i18n/pt-BR'

const LOG_TYPES = [...ALL_MENOPAUSE_SYMPTOMS.map((s) => s.id), 'period', 'hrt', 'note']

describe('menopause log stickers', () => {
  it('every log type has a sticker and no two share one', () => {
    const stickers = LOG_TYPES.map((id) => MENOPAUSE_LOG_STICKER[id])
    expect(stickers.every(Boolean)).toBe(true)
    expect(new Set(stickers).size).toBe(stickers.length)
  })
})

describe('menopause home short labels', () => {
  it('every symptom has a short dock label that is short in en and pt-BR', () => {
    for (const s of ALL_MENOPAUSE_SYMPTOMS) {
      const key = `meno_h_dock_${s.id}`
      const e = (en as unknown as Record<string, string>)[key]
      const p = (pt as unknown as Record<string, string>)[key]
      expect(e).toBeTruthy()
      expect(p).toBeTruthy()
      expect(e.length).toBeLessThanOrEqual(10)
      expect(p.length).toBeLessThanOrEqual(12)
    }
  })
})
