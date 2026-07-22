import { VACCINE_SCHEDULES } from '../vaccineSchedule'
import { getVaccineInfo } from '../vaccineInfo'

describe('vaccineInfo coverage', () => {
  it('resolves an explanation for every vaccine name in every catalog (incl. WHO)', () => {
    const missing: string[] = []
    for (const [code, entries] of Object.entries(VACCINE_SCHEDULES)) {
      for (const v of entries) {
        if (!getVaccineInfo(v.name)) missing.push(`${code}:${v.name}`)
      }
    }
    expect(missing).toEqual([])
  })
})
