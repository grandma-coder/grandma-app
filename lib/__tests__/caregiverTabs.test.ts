import { getCaregiverTabVisibility } from '../modeConfig'

describe('getCaregiverTabVisibility', () => {
  it('always shows Home (index) and You (settings)', () => {
    const v = getCaregiverTabVisibility({ view: true, log_activity: false, chat: false })
    expect(v.index).toBe(true)
    expect(v.settings).toBe(true)
  })
  it('always hides library (education) and vault (analytics) for caregivers', () => {
    const v = getCaregiverTabVisibility({ view: true, log_activity: true, chat: true })
    expect(v.library).toBe(false)
    expect(v.vault).toBe(false)
  })
  it('shows the agenda tab only when the caregiver can log', () => {
    expect(getCaregiverTabVisibility({ view: true, log_activity: true, chat: false }).agenda).toBe(true)
    expect(getCaregiverTabVisibility({ view: true, log_activity: false, chat: false }).agenda).toBe(false)
  })
  it('hides the agenda tab for a paused caregiver even if log_activity was granted', () => {
    expect(getCaregiverTabVisibility({ view: true, log_activity: true, chat: true, _paused: true }).agenda).toBe(false)
  })
})
