import { emailLocaleUpdate } from '../emailLocale'

describe('emailLocaleUpdate', () => {
  it('asks to save the language when the account has none', () => {
    expect(emailLocaleUpdate({}, 'pt-BR')).toEqual({ locale: 'pt-BR' })
  })
  it('asks to save it when the language changed', () => {
    expect(emailLocaleUpdate({ locale: 'en' }, 'es')).toEqual({ locale: 'es' })
  })
  it('does nothing when it already matches', () => {
    expect(emailLocaleUpdate({ locale: 'es' }, 'es')).toBeNull()
  })
  it('does nothing without a user', () => {
    expect(emailLocaleUpdate(undefined, 'es')).toBeNull()
  })
})
