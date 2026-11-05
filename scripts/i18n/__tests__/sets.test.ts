import { existsSync } from 'node:fs'

import { SETS, activeLanguages } from '../sets'
import { birthGuideEnglish } from '../../../lib/birthGuideContent/english'

it('active languages are the launch set without English', () => {
  expect(activeLanguages()).toEqual(['pt-BR', 'es'])
})

it.each(SETS.map((s) => [s.name, s] as const))('%s has English text and locale files', (_n, set) => {
  const en = set.english()
  expect(Object.keys(en).length).toBeGreaterThan(10)
  for (const v of Object.values(en)) expect(typeof v).toBe('string')
  for (const lang of activeLanguages()) expect(existsSync(set.localePath(lang))).toBe(true)
})

it('birth guide keys are position-based and readable', () => {
  const en = birthGuideEnglish()
  expect(en.bg_natural_title).toBe('Natural Birth')
  expect(en.bg_natural_s0_title).toBe('What is natural birth?')
  expect(Object.keys(en).length).toBeGreaterThan(300)
})
