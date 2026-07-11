import { DAILY_TAGS } from '../tags'

describe('DAILY_TAGS', () => {
  it('has the 15 vocabulary tags and no duplicates', () => {
    expect(DAILY_TAGS).toContain('reassurance')
    expect(DAILY_TAGS.length).toBe(15)
    expect(new Set(DAILY_TAGS).size).toBe(DAILY_TAGS.length)
  })
})
