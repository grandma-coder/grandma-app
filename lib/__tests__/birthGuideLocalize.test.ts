jest.mock('../birthGuideContent/hashes', () => {
  const { fnv1a } = jest.requireActual('../i18nHash')
  return { BIRTH_GUIDE_HASHES: { bg_natural_title: fnv1a('Natural Birth'), bg_natural_s0_title: fnv1a('What is natural birth?') } }
})
jest.mock('../birthGuideContent/pt-BR', () => ({ ptBR: { bg_natural_title: 'Parto natural', bg_natural_s0_title: 'O que é parto natural?' } }))

import { localizedBirthTopic } from '../birthGuideContent'
import { NATURAL_TOPIC } from '../birthGuide/natural'

it('uses the bundled translation when the English is the one it was made from', () => {
  const t = localizedBirthTopic(NATURAL_TOPIC, 'pt-BR')
  expect(t.title).toBe('Parto natural')
  expect(t.sections[0].title).toBe('O que é parto natural?')
})

it('keeps English for text with no bundled translation', () => {
  const t = localizedBirthTopic(NATURAL_TOPIC, 'pt-BR')
  expect(t.sections[0].content).toBe(NATURAL_TOPIC.sections[0].content)
})

it('never shows a translation of older text (topic edited in the command center)', () => {
  const edited = { ...NATURAL_TOPIC, title: 'Natural Birth, gently' }
  expect(localizedBirthTopic(edited, 'pt-BR').title).toBe('Natural Birth, gently')
})

it('returns English topics unchanged', () => {
  expect(localizedBirthTopic(NATURAL_TOPIC, 'en')).toBe(NATURAL_TOPIC)
})
