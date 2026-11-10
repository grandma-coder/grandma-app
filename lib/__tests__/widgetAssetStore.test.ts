import { needsFruitCapture } from '../../store/useWidgetAssetStore'

describe('needsFruitCapture', () => {
  it('re-captures when the week changes', () => expect(needsFruitCapture(23, { fruitWeek: 22, fruitPng: 'x' })).toBe(true))
  it('keeps the same week', () => expect(needsFruitCapture(23, { fruitWeek: 23, fruitPng: 'x' })).toBe(false))
  it('captures when the image is missing', () => expect(needsFruitCapture(23, { fruitWeek: 23, fruitPng: null })).toBe(true))
})
