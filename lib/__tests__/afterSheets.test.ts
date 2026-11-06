import { Alert } from 'react-native'
import { beginClosing } from '../modalQueue'
import { afterSheets, alertAfterSheets } from '../afterSheets'

describe('afterSheets', () => {
  beforeEach(() => { jest.useFakeTimers(); jest.spyOn(Alert, 'alert').mockImplementation(() => {}) })
  afterEach(() => { jest.useRealTimers(); jest.restoreAllMocks() })

  it('runs on next tick when nothing is closing', () => {
    const fn = jest.fn()
    afterSheets(fn)
    expect(fn).not.toHaveBeenCalled()
    jest.advanceTimersByTime(1)
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('waits for a closing sheet, then shows the alert', () => {
    const end = beginClosing()
    alertAfterSheets('t', 'm')
    jest.advanceTimersByTime(100)
    expect(Alert.alert).not.toHaveBeenCalled()
    end()
    jest.advanceTimersByTime(100)
    expect(Alert.alert).toHaveBeenCalledWith('t', 'm', undefined, undefined)
  })
})
