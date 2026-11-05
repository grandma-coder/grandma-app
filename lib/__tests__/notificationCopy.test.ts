import { displayNotificationText } from '../notificationCopy'

describe('displayNotificationText', () => {
  it('rewrites old graded wellness rows', () => {
    const r = displayNotificationText({ type: 'wellness_drop', title: "Kenji's Nutrition needs attention", body: 'Nutrition score is 3.2/10. Review the analytics for insights.' })
    expect(r.title).toBe("A look at Kenji's week: Nutrition")
    expect(`${r.title} ${r.body}`).not.toMatch(/\/10|score|attention/i)
  })
  it('leaves new neutral rows and other types alone', () => {
    const neutral = { type: 'wellness_drop', title: "A look at Kenji's sleep", body: 'Grandma noticed a pattern.' }
    expect(displayNotificationText(neutral)).toEqual({ title: neutral.title, body: neutral.body })
    const other = { type: 'routine', title: 'Score big', body: '3/10 done' }
    expect(displayNotificationText(other)).toEqual({ title: other.title, body: other.body })
  })
})

describe('displayNotificationText — mentions', () => {
  it('rebuilds a mention title from the structured fields in the app language', () => {
    const r = displayNotificationText({
      type: 'mention',
      title: 'Ana mentioned you in #Two-Week Wait',
      body: 'hi @you',
      data: { channelName: 'Two-Week Wait', authorName: 'Ana' },
    })
    expect(r.title).toContain('Ana')
    expect(r.title).toContain('#Two-Week Wait')
    expect(r.body).toBe('hi @you')
  })
  it('keeps old mention rows without structured fields as stored', () => {
    const old = { type: 'mention', title: 'Ana mentioned you in #x', body: null }
    expect(displayNotificationText(old)).toEqual({ title: old.title, body: null })
  })
})
