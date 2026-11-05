import { CYCLE_LOG_STICKER, CYCLE_MOOD_STICKER } from '../logStickers'
import { CYCLE_QUICK_LOGS } from '../cycleQuickLogs'
import { ALL_SYMPTOMS, resolveSymptomId, symptomLabel } from '../cycleSymptoms'
import { en } from '../i18n/en'

describe('cycle log stickers', () => {
  it('every quick-log sheet has a sticker, and no two log types share one', () => {
    const stickers = CYCLE_QUICK_LOGS.map((q) => CYCLE_LOG_STICKER[q.sheet])
    expect(stickers.every(Boolean)).toBe(true)
    expect(new Set(stickers).size).toBe(stickers.length)
  })

  it('the quick-log key, the sheet id and the stored type resolve to the same sticker', () => {
    for (const q of CYCLE_QUICK_LOGS) expect(CYCLE_LOG_STICKER[q.key]).toBe(CYCLE_LOG_STICKER[q.sheet])
    expect(CYCLE_LOG_STICKER.cervical_mucus).toBe(CYCLE_LOG_STICKER.cm)
    expect(CYCLE_LOG_STICKER.basal_temp).toBe(CYCLE_LOG_STICKER.bbt)
  })

  it('five moods, five different faces', () => {
    const faces = ['low', 'down', 'okay', 'good', 'great'].map((m) => CYCLE_MOOD_STICKER[m])
    expect(new Set(faces).size).toBe(5)
  })
})

describe('cycle quick-log short labels', () => {
  it('every chip has a short label key that exists', () => {
    for (const q of CYCLE_QUICK_LOGS) expect(q.shortKey in en).toBe(true)
  })
})

describe('cycle symptoms are translated, ids unchanged', () => {
  it('symptomLabel reads the translation, not the legacy English label', () => {
    for (const s of ALL_SYMPTOMS) {
      expect(s.labelKey in en).toBe(true)
      expect(symptomLabel(s.id)).toBe(en[s.labelKey])
    }
  })

  it('legacy English labels still resolve to their id', () => {
    expect(resolveSymptomId('Tender')).toBe('tender-breasts')
    expect(resolveSymptomId('Low mood')).toBe('low-mood')
  })
})
