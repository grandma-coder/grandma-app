jest.mock('../widgets/storage', () => ({ writeSnapshot: jest.fn(async () => {}) }))
jest.mock('../widgets/collect', () => ({ collectSnapshotInput: jest.fn() }))
jest.mock('../sentry', () => ({ reportError: jest.fn() }))
jest.mock('../widgets/quickActions', () => ({ setQuickActionsFor: jest.fn() }))

import { writeSnapshot } from '../widgets/storage'
import { collectSnapshotInput } from '../widgets/collect'
import { reportError } from '../sentry'
import { publishWidgets, publishNow, clearWidgets } from '../widgets/publish'

const input = { now: new Date('2026-11-09T10:00:00'), isMinor: false, enrolled: [], activeMode: 'kids', activeChildId: null }

beforeEach(() => {
  jest.useFakeTimers()
  jest.clearAllMocks()
  ;(collectSnapshotInput as jest.Mock).mockResolvedValue(input)
})
afterEach(() => jest.useRealTimers())

describe('widget publishing', () => {
  it('debounces bursts into one write', async () => {
    publishWidgets('a'); publishWidgets('b'); publishWidgets('c')
    await jest.advanceTimersByTimeAsync(1600)
    expect(writeSnapshot).toHaveBeenCalledTimes(1)
    expect(JSON.parse((writeSnapshot as jest.Mock).mock.calls[0][0])).toMatchObject({ signedIn: true, version: 1 })
  })
  it('clearWidgets writes a signed-out snapshot and cancels a pending publish', async () => {
    publishWidgets('x')
    await clearWidgets()
    await jest.advanceTimersByTimeAsync(1600)
    expect(writeSnapshot).toHaveBeenCalledTimes(1)
    expect(JSON.parse((writeSnapshot as jest.Mock).mock.calls[0][0])).toMatchObject({ signedIn: false, entries: [] })
  })
  it('a collect failure is reported, never thrown', async () => {
    ;(collectSnapshotInput as jest.Mock).mockRejectedValueOnce(new Error('offline'))
    await expect(publishNow()).resolves.toBeUndefined()
    expect(reportError).toHaveBeenCalled()
    expect(writeSnapshot).not.toHaveBeenCalled()
  })
  it('signed out (no input) writes the signed-out snapshot', async () => {
    ;(collectSnapshotInput as jest.Mock).mockResolvedValueOnce(null)
    await publishNow()
    expect(JSON.parse((writeSnapshot as jest.Mock).mock.calls[0][0])).toMatchObject({ signedIn: false })
  })
})

import { isWidgetRelevantQuery } from '../../hooks/useWidgetPublisher'

describe('which query refreshes trigger a publish', () => {
  it('log queries do, unrelated ones do not', () => {
    for (const k of [['cycleLogs'], ['pregnancy-today-logs', 'u'], ['kids-today-logs', 'c'], ['menopause-logs'], ['profile', 'u']]) {
      expect(isWidgetRelevantQuery(k)).toBe(true)
    }
    expect(isWidgetRelevantQuery(['channels'])).toBe(false)
    expect(isWidgetRelevantQuery(['leaderboard', 'x'])).toBe(false)
  })
})

describe('sign-out while a publish is in flight', () => {
  it('the late publish does not overwrite the wiped snapshot', async () => {
    let release!: (v: unknown) => void
    ;(collectSnapshotInput as jest.Mock).mockReturnValueOnce(new Promise((r) => { release = r }))
    const running = publishNow()
    await clearWidgets()
    release(input)
    await running
    const writes = (writeSnapshot as jest.Mock).mock.calls.map((c) => JSON.parse(c[0]).signedIn)
    expect(writes).toEqual([false])
  })
})
