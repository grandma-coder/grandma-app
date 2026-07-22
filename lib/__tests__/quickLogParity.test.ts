import { CYCLE_QUICK_LOGS } from '../cycleQuickLogs'
import { PREG_QUICK_LOGS } from '../pregnancyQuickLogs'
import { KIDS_QUICK_LOGS } from '../kidsQuickLogs'

describe('home quick-log catalogs reach full calendar parity', () => {
  it('cycle offers all 14 calendar log types (as sheet ids)', () => {
    const sheets = new Set(CYCLE_QUICK_LOGS.map((q) => q.sheet))
    for (const s of ['mood','symptom','basal_temp','lh','cm','intercourse','period_start','period_end','pregnancy_test','sex_drive','clots','weight','water','activity']) {
      expect(sheets.has(s as never)).toBe(true)
    }
  })

  it('pregnancy offers all 15 calendar log types', () => {
    const types = new Set(PREG_QUICK_LOGS.map((q) => q.logType))
    for (const t of ['mood','water','sleep','nutrition','weight','kick_count','symptom','exercise','vitamins','kegel','contraction','appointment','exam_result','nesting','birth_prep']) {
      expect(types.has(t)).toBe(true)
    }
  })

  it('kids offers the 8 calendar log types (wake_up folded into sleep)', () => {
    const types = new Set(KIDS_QUICK_LOGS.map((q) => q.logType))
    for (const t of ['feeding','sleep','health','mood','memory','activity','diaper','exam']) {
      expect(types.has(t)).toBe(true)
    }
    // wake_up is intentionally NOT offered — Sleep Log captures wake time.
    expect(types.has('wake_up')).toBe(false)
  })

  it('every entry has a unique key', () => {
    for (const cat of [CYCLE_QUICK_LOGS, PREG_QUICK_LOGS, KIDS_QUICK_LOGS]) {
      const keys = cat.map((q) => q.key)
      expect(new Set(keys).size).toBe(keys.length)
    }
  })
})
