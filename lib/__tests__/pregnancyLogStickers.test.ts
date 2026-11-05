import { PREGNANCY_LOG_STICKER, PREGNANCY_MOOD_STICKER } from '../logStickers'
import { PREG_QUICK_LOGS } from '../pregnancyQuickLogs'
import { en } from '../i18n/en'
import { getStandardAppointments } from '../pregnancyAppointments'

describe('pregnancy log stickers', () => {
  it('every quick log has a sticker and no two log types share one', () => {
    const stickers = PREG_QUICK_LOGS.map((q) => PREGNANCY_LOG_STICKER[q.logType])
    expect(stickers.every(Boolean)).toBe(true)
    expect(new Set(stickers).size).toBe(stickers.length)
  })

  it('quick-log key, sheet id and stored type resolve to the same sticker', () => {
    for (const q of PREG_QUICK_LOGS) expect(PREGNANCY_LOG_STICKER[q.key]).toBe(PREGNANCY_LOG_STICKER[q.logType])
    expect(PREGNANCY_LOG_STICKER.exam).toBe(PREGNANCY_LOG_STICKER.exam_result)
  })

  it('five moods, five different stickers', () => {
    const moods = ['excited', 'happy', 'okay', 'anxious', 'energetic'].map((m) => PREGNANCY_MOOD_STICKER[m])
    expect(new Set(moods).size).toBe(5)
  })
})

describe('pregnancy quick-log short labels', () => {
  it('every chip has a short label key that exists', () => {
    for (const q of PREG_QUICK_LOGS) expect(q.shortKey in en).toBe(true)
  })
  it('week-detail hero label has a phrase per trimester', () => {
    for (const k of [1, 2, 3]) expect(`preg_weekDetail_heroLabel_t${k}` in en).toBe(true)
  })
})

describe('standard appointments', () => {
  it('English fallthrough returns the source list', () => {
    expect(getStandardAppointments().length).toBeGreaterThan(5)
  })
})
