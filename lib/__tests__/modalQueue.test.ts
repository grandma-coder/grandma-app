import { beginClosing, whenNoneClosing, DISMISS_GAP_MS } from '../modalQueue'

beforeEach(() => jest.useFakeTimers())
afterEach(() => jest.useRealTimers())

it('opens on the next tick when no sheet is closing', () => {
  const open = jest.fn()
  whenNoneClosing(open)
  jest.advanceTimersByTime(0)
  expect(open).toHaveBeenCalledTimes(1)
})

it('sees a sheet that starts closing in the same render (picker onClose + onSelect)', () => {
  const open = jest.fn()
  whenNoneClosing(open) // the form's effect runs first…
  const end = beginClosing() // …then the picker starts closing
  jest.advanceTimersByTime(0)
  expect(open).not.toHaveBeenCalled()
  end()
  jest.advanceTimersByTime(DISMISS_GAP_MS)
  expect(open).toHaveBeenCalledTimes(1)
})

it('waits for a closing sheet to finish before opening the next one', () => {
  const end = beginClosing()
  const open = jest.fn()
  whenNoneClosing(open)
  jest.advanceTimersByTime(0)
  expect(open).not.toHaveBeenCalled()
  end()
  expect(open).not.toHaveBeenCalled() // the old Modal's dismissal commits first
  jest.advanceTimersByTime(DISMISS_GAP_MS)
  expect(open).toHaveBeenCalledTimes(1)
})

it('never waits forever (safety timeout)', () => {
  beginClosing() // never ends
  const open = jest.fn()
  whenNoneClosing(open, 700)
  jest.advanceTimersByTime(699)
  expect(open).not.toHaveBeenCalled()
  jest.advanceTimersByTime(1)
  expect(open).toHaveBeenCalledTimes(1)
})

it('can be cancelled, and ending twice is harmless', () => {
  const end = beginClosing()
  const open = jest.fn()
  const cancel = whenNoneClosing(open)
  cancel()
  end(); end()
  jest.advanceTimersByTime(1000)
  expect(open).not.toHaveBeenCalled()
})
