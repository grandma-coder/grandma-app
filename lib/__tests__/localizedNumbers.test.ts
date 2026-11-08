import { useLanguageStore } from '../../store/useLanguageStore'
import { formatWeight, formatTemp } from '../units'
import { formatWeight as formatBabyWeight, formatLength } from '../weekStats'

describe('numbers follow the app language', () => {
  afterEach(() => useLanguageStore.setState({ language: 'en' } as never))

  it('uses a decimal comma in es / pt-BR', () => {
    useLanguageStore.setState({ language: 'es' } as never)
    expect(formatWeight(62.5, 'kg')).toBe('62,5 kg')
    expect(formatTemp(36.55, 'c', 2)).toBe('36,55°C')
    expect(formatLength(27.8)).toBe('27,8cm')
    expect(formatBabyWeight(1500)).toBe('1,5kg')
  })

  it('keeps the decimal point in en', () => {
    expect(formatWeight(62.5, 'kg')).toBe('62.5 kg')
    expect(formatLength(27.8)).toBe('27.8cm')
    expect(formatBabyWeight(1500)).toBe('1.5kg')
    expect(formatBabyWeight(430)).toBe('430g')
  })
})
