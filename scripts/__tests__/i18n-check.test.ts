import { checkKeyParity } from '../i18n-check'

test('every locale has exactly the same keys as en', () => {
  const report = checkKeyParity()
  const broken = report.filter((r) => r.missing.length > 0 || r.extra.length > 0)
  expect(broken).toEqual([])
})
