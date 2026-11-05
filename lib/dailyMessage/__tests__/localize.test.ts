// Every shipping language must carry every bundled question + card, with the
// same option count, so a non-English user never sees an English word.
jest.mock('../../supabase', () => ({ supabase: {} }))

import { PREGNANCY_QUESTIONS } from '../questions.pregnancy'
import { PREPREGNANCY_QUESTIONS } from '../questions.prePregnancy'
import { PREGNANCY_CARDS } from '../cards.pregnancy'
import { PREPREGNANCY_CARDS } from '../cards.prePregnancy'
import { DAILY_CONTENT } from '../content'
import { localizeQuestion, localizeCard, isQuestionTranslated } from '../localize'
import { getQuestionsForMode } from '../index'
import { dailyScript } from '../typeface'
import * as remote from '../questions.remote'
import type { DailyQuestion } from '../types'

const QUESTIONS = [...PREGNANCY_QUESTIONS, ...PREPREGNANCY_QUESTIONS]
const CARDS = [...PREGNANCY_CARDS, ...PREPREGNANCY_CARDS]
const LANGS = Object.keys(DAILY_CONTENT) as (keyof typeof DAILY_CONTENT)[]

describe.each(LANGS)('daily content: %s', (lang) => {
  const loc = DAILY_CONTENT[lang]

  it('translates every question with the same option count, all distinct', () => {
    for (const q of QUESTIONS) {
      const tr = loc.questions[q.id]
      expect(tr).toBeDefined()
      expect(tr.prompt.trim()).not.toBe('')
      expect(tr.prompt).not.toBe(q.prompt)
      expect(tr.options).toHaveLength(q.options.length)
      expect(new Set(tr.options).size).toBe(tr.options.length)
      for (const o of tr.options) expect(o.trim()).not.toBe('')
    }
  })

  it('translates every card', () => {
    for (const c of CARDS) {
      expect(loc.cards[c.id]?.trim()).toBeTruthy()
      expect(loc.cards[c.id]).not.toBe(c.text)
    }
  })

  it('has no stray ids', () => {
    const qids = new Set(QUESTIONS.map((q) => q.id))
    const cids = new Set(CARDS.map((c) => c.id))
    for (const id of Object.keys(loc.questions)) expect(qids.has(id)).toBe(true)
    for (const id of Object.keys(loc.cards)) expect(cids.has(id)).toBe(true)
  })

  it('localize keeps ids, tags, colours and option order', () => {
    const q = QUESTIONS[0]
    const lq = localizeQuestion(q, lang)
    expect(lq.id).toBe(q.id)
    expect(lq.options.map((o) => o.tags)).toEqual(q.options.map((o) => o.tags))
    expect(lq.options[0].label).toBe(loc.questions[q.id].options[0])
    const c = CARDS[0]
    const lc = localizeCard(c, lang)
    expect({ ...lc, text: c.text }).toEqual(c)
    expect(lc.text).toBe(loc.cards[c.id])
  })
})

it('English is the bundled copy itself', () => {
  expect(localizeQuestion(QUESTIONS[0], 'en')).toBe(QUESTIONS[0])
  expect(localizeCard(CARDS[0], 'en')).toBe(CARDS[0])
})

describe('remote (English-only DB) questions', () => {
  const unknown: DailyQuestion = {
    id: 'db_new_1', mode: 'pregnancy', prompt: 'A brand new English-only question?',
    options: [{ label: 'Yes', tags: ['joy'] }, { label: 'No', tags: ['calm'] }],
  }
  afterEach(() => jest.restoreAllMocks())

  it('English users get the DB bank as-is', () => {
    jest.spyOn(remote, 'getRemoteQuestionsForMode').mockReturnValue([unknown])
    expect(getQuestionsForMode('pregnancy', 'en')).toEqual([unknown])
  })

  it('other languages never get an untranslated DB question — bundled bank instead', () => {
    jest.spyOn(remote, 'getRemoteQuestionsForMode').mockReturnValue([unknown])
    const bank = getQuestionsForMode('pregnancy', 'pt-BR')
    expect(bank).toBe(PREGNANCY_QUESTIONS)
    expect(bank.every((q) => isQuestionTranslated(q, 'pt-BR'))).toBe(true)
  })

  it('other languages keep DB questions that share a bundled id (translated)', () => {
    jest.spyOn(remote, 'getRemoteQuestionsForMode').mockReturnValue([unknown, PREGNANCY_QUESTIONS[2]])
    expect(getQuestionsForMode('pregnancy', 'de').map((q) => q.id)).toEqual([PREGNANCY_QUESTIONS[2].id])
  })
})

describe('typeface script detection', () => {
  it('keeps Latin-1 languages on the hand face and routes the rest to one safe face', () => {
    expect(dailyScript(DAILY_CONTENT['pt-BR'].cards.c_001)).toBe('hand')
    expect(dailyScript(DAILY_CONTENT.de.cards.c_001)).toBe('hand')
    expect(dailyScript(DAILY_CONTENT.fr.cards.c_001)).toBe('hand')
    expect(dailyScript('Bugün kendine nasıl şefkat gösterdin?')).toBe('latin')
    expect(dailyScript(DAILY_CONTENT.ja.cards.c_001)).toBe('cjk')
    expect(dailyScript(DAILY_CONTENT.ko.cards.c_001)).toBe('cjk')
    expect(dailyScript(DAILY_CONTENT.zh.cards.c_001)).toBe('cjk')
    expect(dailyScript(DAILY_CONTENT.hi.cards.c_001)).toBe('tall')
    expect(dailyScript(DAILY_CONTENT.ar.cards.c_001)).toBe('tall')
  })
})
