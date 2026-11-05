import { regularityWord, moodWord, regularityWordKey, moodWordKey } from '../cycleWords'

describe('regularityWord', () => {
  it('maps percent to words', () => {
    expect(regularityWord(null)).toBeNull()
    expect(regularityWord(undefined)).toBeNull()
    expect(regularityWord(100)).toBe('steady')
    expect(regularityWord(80)).toBe('steady')
    expect(regularityWord(79)).toBe('mostly')
    expect(regularityWord(50)).toBe('mostly')
    expect(regularityWord(49)).toBe('varies')
    expect(regularityWord(0)).toBe('varies')
  })
})

describe('moodWord', () => {
  it('maps the 1-5 average to words', () => {
    expect(moodWord(null)).toBeNull()
    expect(moodWord(5)).toBe('lighter')
    expect(moodWord(3.5)).toBe('lighter')
    expect(moodWord(3.4)).toBe('mixed')
    expect(moodWord(2.5)).toBe('mixed')
    expect(moodWord(2.4)).toBe('heavier')
    expect(moodWord(1)).toBe('heavier')
  })
  it('builds i18n keys', () => {
    expect(regularityWordKey('mostly')).toBe('cycleWords_regularity_mostly')
    expect(moodWordKey('lighter')).toBe('cycleWords_mood_lighter')
  })
})
