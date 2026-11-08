import { useLanguageStore } from '../../store/useLanguageStore'
import { VACCINE_SCHEDULES, VACCINE_NAME_KEY, localizeVaccineName } from '../vaccineSchedule'

describe('localizeVaccineName', () => {
  afterEach(() => useLanguageStore.setState({ language: 'en' } as never))

  it('every catalog vaccine has a display name', () => {
    for (const list of Object.values(VACCINE_SCHEDULES)) {
      for (const v of list) expect(VACCINE_NAME_KEY[v.name]).toBeTruthy()
    }
  })

  it('shows Portuguese names in Portuguese, whatever the country catalog', () => {
    useLanguageStore.setState({ language: 'pt-BR' } as never)
    expect(localizeVaccineName('Hepatitis B')).toBe('Hepatite B')
    expect(localizeVaccineName('Varicella')).toMatch(/Catapora/)
  })

  it('leaves unknown names as they are', () => {
    expect(localizeVaccineName('Some local vaccine')).toBe('Some local vaccine')
  })
})
