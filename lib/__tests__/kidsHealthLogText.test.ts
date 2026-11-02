import { healthLogText } from '../kidsHealthLogText'

describe('healthLogText', () => {
  it('reads free-form health events stored with `text`', () => {
    expect(healthLogText('{"eventType":"Other","text":"Routine visit, all good"}')).toEqual({ kind: 'Other', text: 'Routine visit, all good' })
  })
  it('reads the older `description` shape', () => {
    expect(healthLogText('{"eventType":"Injury","description":"Scraped knee"}')).toEqual({ kind: 'Injury', text: 'Scraped knee' })
  })
  it('event with no description → kind only', () => {
    expect(healthLogText('{"eventType":"Doctor visit"}')).toEqual({ kind: 'Doctor visit', text: null })
  })
  it('plain strings and numbers pass through', () => {
    expect(healthLogText('37.2')).toEqual({ kind: null, text: '37.2' })
    expect(healthLogText('MMR')).toEqual({ kind: null, text: 'MMR' })
  })
  it('value / name objects', () => {
    expect(healthLogText('{"value":"38.1"}').text).toBe('38.1')
    expect(healthLogText('{"name":"Paracetamol 4 ml","routineId":"abc"}').text).toBe('Paracetamol 4 ml')
  })
  it('never returns raw JSON or internal ids', () => {
    const r = healthLogText('{"routineId":"8f1c-uuid","dose":"5 ml"}')
    expect(r.text).toBe('5 ml')
    expect(r.text).not.toContain('{')
    expect(r.text).not.toContain('8f1c')
  })
  it('empty value falls back to notes', () => {
    expect(healthLogText(null, 'checked ears')).toEqual({ kind: null, text: 'checked ears' })
  })
})
