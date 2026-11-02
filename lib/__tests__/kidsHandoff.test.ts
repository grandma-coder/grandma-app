import { buildKidsHandoff, morningSince, sinceFromClock, handoffFetchFrom, type HandoffLog } from '../kidsHandoff'
import { en } from '../i18n/en'
import type { TranslationKeys } from '../i18n/keys'

const t = (key: keyof TranslationKeys, params?: Record<string, string | number>) =>
  (en[key] as string).replace(/\{\{(\w+)\}\}/g, (_, n: string) => (params && n in params ? String(params[n]) : `{{${n}}}`))

// Node's ICU may use a narrow no-break space before AM/PM — compare on plain spaces.
const plain = (s: string) => s.replace(/[\u202f\u00a0]/g, ' ')

let seq = 0
function log(date: string, type: string, value: unknown, opts: { at?: string; notes?: string } = {}): HandoffLog {
  const [y, m, d] = date.split('-').map(Number)
  const [hh, mm] = (opts.at ?? '12:00').split(':').map(Number)
  return {
    id: `l${++seq}`,
    date,
    type,
    value: value == null ? null : typeof value === 'string' ? value : JSON.stringify(value),
    notes: opts.notes ?? null,
    created_at: new Date(y, m - 1, d, hh, mm).toISOString(),
  }
}

const kenji = { name: 'Kenji' }
const DAY = '2026-11-02'
const at = (date: string, hhmm: string) => {
  const [y, m, d] = date.split('-').map(Number)
  const [hh, mm] = hhmm.split(':').map(Number)
  return new Date(y, m - 1, d, hh, mm)
}

function mixedDay(): HandoffLog[] {
  return [
    log(DAY, 'feeding', { feedType: 'bottle', time: '11:00', amount: '120' }),          // before window
    log(DAY, 'feeding', { feedType: 'bottle', time: '14:15', amount: '180' }),
    log(DAY, 'food', { feedType: 'solids', meal: 'lunch', time: '14:45' }),
    log(DAY, 'sleep', { startTime: '14:30', endTime: '15:40', duration: '1h 10m', quality: 'Good' }, { notes: 'a bit fussy after nap' }),
    log(DAY, 'diaper', { diaperType: 'poop', time: '13:00' }),                            // before window
    log(DAY, 'diaper', { diaperType: 'pee', time: '14:10' }),
    log(DAY, 'diaper', { diaperType: 'mixed', time: '15:50' }),
    log(DAY, 'medicine', 'Paracetamol 4 ml', { at: '15:00' }),
    log(DAY, 'mood', 'happy', { at: '16:00' }),
    log(DAY, 'activity', { activityType: 'playground', duration: '45m', startTime: '16:10' }),
    log(DAY, 'skipped', { routineName: 'Bath' }, { at: '16:30', notes: 'skipped' }),
  ]
}

describe('buildKidsHandoff', () => {
  it('summarises a mixed afternoon, grouped by type, facts only', () => {
    const h = buildKidsHandoff(mixedDay(), kenji, at(DAY, '14:00'), at(DAY, '17:00'), t, 'en')
    expect(h.empty).toBe(false)
    expect(plain(h.title)).toBe('Kenji since 2:00 PM')
    expect(h.lines.map((l) => l.kind)).toEqual(['feeding', 'sleep', 'diaper', 'health', 'mood', 'activity', 'note'])
    expect(plain(h.text).split('\n')).toEqual([
      'Kenji since 2:00 PM',
      '🍼 Fed 2× — 180 ml bottle, Lunch',
      '😴 Slept 1 h 10 (2:30 PM–3:40 PM)',
      '🧷 Diapers: 2 wet, 1 dirty',
      '💊 Paracetamol 4 ml at 3:00 PM',
      '🙂 Mood: Happy',
      '🧸 Activities: Playground (45 min)',
      '📝 Note: "a bit fussy after nap"',
      '— sent from grandma.app',
    ])
    // In-app rows carry stickers, never emoji.
    expect(h.lines.map((l) => l.sticker)).toEqual(['bottle', 'moon', 'diaper', 'pill', 'face3', 'shoe', 'pencil'])
    for (const l of h.lines) expect(l.text).not.toMatch(/\p{Extended_Pictographic}/u)
  })

  it('says nothing was logged for an empty period', () => {
    const logs = [log(DAY, 'feeding', { feedType: 'bottle', time: '09:00', amount: '120' })]
    const h = buildKidsHandoff(logs, kenji, at(DAY, '14:00'), at(DAY, '17:00'), t, 'en')
    expect(h.empty).toBe(true)
    expect(h.lines).toEqual([])
    expect(plain(h.text)).toBe('Nothing logged for Kenji since 2:00 PM.\n— sent from grandma.app')
  })

  it('handles a window crossing midnight, including an overnight sleep', () => {
    const logs = [
      log('2026-11-01', 'feeding', { feedType: 'bottle', time: '19:00', amount: '100' }),   // before window
      log('2026-11-01', 'feeding', { feedType: 'bottle', time: '21:00', amount: '120' }),
      log('2026-11-01', 'sleep', { startTime: '21:30', endTime: '06:30', duration: '9h' }),
      log(DAY, 'diaper', { diaperType: 'pee', time: '02:00' }),
      log(DAY, 'feeding', { feedType: 'bottle', time: '02:05', amount: '90' }),
    ]
    const since = at('2026-11-01', '20:00')
    const h = buildKidsHandoff(logs, kenji, since, at(DAY, '07:00'), t, 'en')
    const text = plain(h.text)
    // Since is on the previous day → the title carries the weekday.
    expect(plain(h.title)).toMatch(/^Kenji since Sun 8:00 PM$/)
    expect(text).toContain('🍼 Fed 2× — 210 ml in 2 bottles')
    expect(text).toContain('😴 Slept 9 h (9:30 PM–6:30 AM)')
    expect(text).toContain('🧷 Diapers: 1 wet, 0 dirty')
    expect(handoffFetchFrom(since)).toBe('2026-10-31')
  })

  it('shows a sleep still in progress without inventing an end', () => {
    const logs = [log(DAY, 'sleep', { startTime: '15:20' })]
    const h = buildKidsHandoff(logs, kenji, at(DAY, '14:00'), at(DAY, '16:00'), t, 'en')
    expect(plain(h.lines[0].text)).toBe('Asleep since 3:20 PM')
  })

  it('uses the locale clock format', () => {
    const h = buildKidsHandoff(mixedDay(), kenji, at(DAY, '14:00'), at(DAY, '17:00'), t, 'pt-BR')
    expect(h.title).toBe('Kenji since 14:00')
    expect(h.text).toContain('Paracetamol 4 ml at 15:00')
  })

  it('never uses judgement words', () => {
    const logs = [
      ...mixedDay(),
      log(DAY, 'temperature', '38.6', { at: '15:30' }),
      log(DAY, 'note', { eventType: 'Doctor visit', description: 'Check-up' }, { at: '16:20' }),
      log(DAY, 'food', { feedType: 'solids', meal: 'afternoon_snack', quality: 'did_not_eat', time: '16:40' }),
    ]
    const banned = /\b(normal|abnormal|too (little|much|few|many|short|long)|not enough|enough|should|fever|worr\w*|concern\w*|healthy|unhealthy|good|bad|great|poor|needs?|risk\w*|warning|alert|low|high)\b/i
    const h = buildKidsHandoff(logs, kenji, at(DAY, '14:00'), at(DAY, '17:00'), t, 'en')
    expect(h.text).not.toMatch(banned)
    expect(plain(h.text)).toContain('🌡️ Temperature 38.6 °C at 3:30 PM')
    expect(plain(h.text)).toContain('🩺 Doctor visit: Check-up at 4:20 PM')
    // Every shipped handoff string, not just this sample.
    for (const [key, value] of Object.entries(en)) {
      if (key.startsWith('handoff_')) expect(`${key}: ${value}`).not.toMatch(banned)
    }
  })
})

describe('since presets', () => {
  it('morning is today 6:00, or yesterday before 6 am', () => {
    expect(morningSince(at(DAY, '10:00')).getTime()).toBe(at(DAY, '06:00').getTime())
    expect(morningSince(at(DAY, '05:00')).getTime()).toBe(at('2026-11-01', '06:00').getTime())
  })
  it('a picked clock time ahead of now means yesterday', () => {
    expect(sinceFromClock(13, 30, at(DAY, '16:00')).getTime()).toBe(at(DAY, '13:30').getTime())
    expect(sinceFromClock(22, 0, at(DAY, '07:00')).getTime()).toBe(at('2026-11-01', '22:00').getTime())
  })
})
