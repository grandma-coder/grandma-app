import { displayNotificationText } from '../notificationCopy'

describe('displayNotificationText', () => {
  it('rewrites old graded wellness rows', () => {
    const r = displayNotificationText({ type: 'wellness_drop', title: "Kenji's Nutrition needs attention", body: 'Nutrition score is 3.2/10. Review the analytics for insights.' })
    expect(r.title).toBe("A look at Kenji's nutrition")
    expect(`${r.title} ${r.body}`).not.toMatch(/\/10|score|attention/i)
  })
  it('leaves new neutral rows and other types alone', () => {
    const neutral = { type: 'wellness_drop', title: "A look at Kenji's sleep", body: 'Grandma noticed a pattern.' }
    expect(displayNotificationText(neutral)).toEqual({ title: neutral.title, body: neutral.body })
    const other = { type: 'routine', title: 'Score big', body: '3/10 done' }
    expect(displayNotificationText(other)).toEqual({ title: other.title, body: other.body })
  })
})
