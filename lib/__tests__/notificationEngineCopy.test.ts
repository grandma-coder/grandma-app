import { translations } from '../i18n'
import { en } from '../i18n/en'
import { useLanguageStore, type AppLanguage } from '../../store/useLanguageStore'
import {
  appointmentCopy, caregiverActivityCopy, dailySummaryCopy, dueDateCopy, kickCountCopy, kidsQuietCopy,
  latePeriodCopy, ovulationCopy, periodSoonCopy, pregnancyWeekCopy, routineMissedCopy, streakCopy,
  streakPausedCopy, strongSymptomsCopy, temperatureCopy, wellnessDropCopy, type NotificationCopy,
} from '../notificationCopy'

const setLang = (language: AppLanguage) => useLanguageStore.setState({ language })
const text = (c: NotificationCopy) => `${c.title} ${c.body}`

afterEach(() => setLang('en'))

// Every engine template, every language: same {{params}} as English, no grades,
// no normal/abnormal verdicts, no hype/streak pressure.
const BANNED = /\bnormal|abnormal|normale|\/10|score|needs attention|amazing|streak|peak fertility|正常|异常|異常|정상|طبيعي|सामान्य/i
const notifKeys = (Object.keys(en) as (keyof typeof en)[]).filter((k) => k.startsWith('notifEng_'))
const params = (s: string): string => (s.match(/\{\{\w+\}\}/g) ?? []).sort().join(',')

describe('notification engine i18n', () => {
  it('has the keys', () => {
    expect(notifKeys.length).toBeGreaterThan(70)
  })
  for (const [lang, table] of Object.entries(translations)) {
    it(`${lang}: translated, same params as English, calm wording`, () => {
      for (const k of notifKeys) {
        const v = String(table[k])
        expect(v).not.toMatch(BANNED)
        if (k.endsWith('_one')) continue // singular forms may spell the number out
        expect(params(v)).toBe(params(String(en[k])))
      }
    })
  }
})

describe('notification copy builders', () => {
  it('writes in the current app language', () => {
    expect(wellnessDropCopy('Kenji', 'sleep').title).toBe("A look at Kenji's week: Sleep")
    setLang('pt-BR')
    expect(wellnessDropCopy('Kenji', 'sleep').title).toBe('Um olhar na semana de Kenji: Sono')
    expect(kidsQuietCopy('Kenji', 3).title).toBe('Faz 3 dias desde o último registro de Kenji')
    setLang('de')
    expect(streakPausedCopy('Kenji').title).toBe('Gestern keine Einträge für Kenji')
  })

  it('picks singular / plural forms', () => {
    expect(kidsQuietCopy('Mia', 1).title).toBe("It's been a day since Mia's last log")
    expect(kidsQuietCopy('Mia', 2).title).toBe("It's been 2 days since Mia's last log")
    expect(dueDateCopy(0).title).toBe('Today is your estimated due date')
    expect(dueDateCopy(1).title).toBe('1 day until your estimated due date')
    expect(periodSoonCopy(1).title).toBe('Your period may start tomorrow')
    expect(periodSoonCopy(2).title).toBe('Your period may start in about 2 days')
  })

  it('keeps health rows factual: what was logged + see your doctor, no verdicts', () => {
    const temp = temperatureCopy('Mia', 38.4, new Date(2026, 10, 3))
    expect(temp.title).toBe('Mia: 38.4°C logged')
    expect(temp.body).toMatch(/pediatrician/)
    expect(text(temp)).not.toMatch(/high|monitor closely/i)
    setLang('pt-BR')
    expect(temperatureCopy('Mia', 38.4, new Date(2026, 10, 3)).title).toBe('Mia: 38,4°C registrado')
    setLang('en')
    const kicks = kickCountCopy(4, 9.6)
    expect(kicks.body).toMatch(/Today: 4 · recent average: 10/)
    expect(kicks.body).toMatch(/midwife or maternity unit/)
    expect(kicks.body).not.toMatch(/left side/)
  })

  it('localizes stored English values (log types, symptoms, routine time)', () => {
    setLang('pt-BR')
    expect(dailySummaryCopy(5, [['food', 3], ['sleep', 2]]).body).toMatch(/^Comida 3 · Sono 2\./)
    expect(caregiverActivityCopy(null, 2, ['diaper'], ['Mia', null]).body).toBe('Fralda para Mia & seu pequeno. Veja os detalhes no calendário.')
    expect(strongSymptomsCopy(['Nausea, Back pain', 'Nausea']).body.startsWith('Náusea, Dor nas costas.')).toBe(true)
    expect(routineMissedCopy('Mia', 'Banho', '19:30:00').body).toMatch(/19:30/)
    expect(routineMissedCopy('Mia', 'Banho', '19:30:00').body).not.toMatch(/:00\./)
  })

  it('no hype or streak pressure', () => {
    expect(text(streakCopy('Mia', 7))).not.toMatch(/!|amazing|streak/i)
    expect(text(streakPausedCopy('Mia'))).not.toMatch(/streak|start a new/i)
  })

  it('cycle copy says estimate, no "peak fertility"', () => {
    expect(ovulationCopy(true, 14).title).toBe('Estimated ovulation day')
    expect(text(ovulationCopy(true, 14))).not.toMatch(/peak|probability/i)
    expect(text(latePeriodCopy(5, true))).not.toMatch(/consider taking/i)
  })

  it('appointment day label uses calendar days, not a 24h window', () => {
    const now = new Date(2026, 10, 4, 23, 0)
    expect(appointmentCopy({ date: new Date(2026, 10, 5, 9, 0), now }).title).toMatch(/^Appointment tomorrow at/)
    expect(appointmentCopy({ date: new Date(2026, 10, 4, 23, 30), now }).title).toMatch(/^Appointment today at/)
    expect(appointmentCopy({ date: new Date(2026, 10, 6, 8, 0), now, doctor: 'Dr. Ana' }).title).toMatch(/^Appointment with Dr\. Ana on /)
  })

  it('pregnancy week: localized size, English fact only in English', () => {
    const enCopy = pregnancyWeekCopy(12)
    expect(enCopy.title).toMatch(/^Week 12: /)
    setLang('pt-BR')
    const pt = pregnancyWeekCopy(12)
    expect(pt.title).toMatch(/^Semana 12: /)
    expect(pt.body).toBe('Uma nova semana juntos. Toque para ver as novidades do bebê.')
  })
})
