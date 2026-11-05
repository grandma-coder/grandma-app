// Gate: every language offered in the app has every UI string and every bundled content
// string, translated from the current English. Fix failures with `npm run i18n:sync`.
import { checkAll } from '../../scripts/i18n/check'

it('every active language is fully and freshly translated', () => {
  const problems = checkAll()
  expect(problems.slice(0, 20)).toEqual([])
})
