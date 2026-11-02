import { mealForHour } from '../mealForHour'

describe('mealForHour', () => {
  it.each([
    [4, 'night_snack'],
    [5, 'breakfast'],
    [9, 'breakfast'],
    [10, 'morning_snack'],
    [11, 'morning_snack'],
    [12, 'lunch'],
    [14, 'lunch'],
    [15, 'afternoon_snack'],
    [17, 'afternoon_snack'],
    [18, 'dinner'],
    [20, 'dinner'],
    [21, 'night_snack'],
    [23, 'night_snack'],
    [0, 'night_snack'],
  ])('hour %i -> %s', (h, expected) => {
    expect(mealForHour(h)).toBe(expected)
  })
})
