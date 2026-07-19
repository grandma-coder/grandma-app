import AsyncStorage from '@react-native-async-storage/async-storage'
import { useUnlockStore } from '../useUnlockStore'

const STORAGE_KEY = 'unlock-storage'

describe('useUnlockStore', () => {
  beforeEach(async () => {
    await AsyncStorage.clear()
    // Reset to a clean baseline between tests.
    useUnlockStore.setState({ celebrated: [], hydrated: false })
  })

  it('initializes with empty celebrated array', () => {
    expect(useUnlockStore.getState().celebrated).toEqual([])
  })

  it('hasCelebrated returns false for uncelebrated keys', () => {
    expect(useUnlockStore.getState().hasCelebrated('cycle:regularity')).toBe(false)
    expect(useUnlockStore.getState().hasCelebrated('cycle:mood')).toBe(false)
  })

  it('markCelebrated adds a key to celebrated array', () => {
    useUnlockStore.getState().markCelebrated('cycle:bbt')
    expect(useUnlockStore.getState().hasCelebrated('cycle:bbt')).toBe(true)
    expect(useUnlockStore.getState().hasCelebrated('cycle:mood')).toBe(false)
  })

  it('markCelebrated with same key twice results in no duplicate', () => {
    useUnlockStore.getState().markCelebrated('cycle:bbt')
    useUnlockStore.getState().markCelebrated('cycle:bbt')
    const celebrated = useUnlockStore.getState().celebrated
    const count = celebrated.filter((k) => k === 'cycle:bbt').length
    expect(count).toBe(1)
    expect(celebrated.length).toBe(1)
  })

  it('markManyCelebrated adds multiple keys idempotently', () => {
    useUnlockStore.getState().markManyCelebrated(['a', 'b', 'a'])
    const celebrated = useUnlockStore.getState().celebrated
    expect(celebrated).toContain('a')
    expect(celebrated).toContain('b')
    expect(celebrated.length).toBe(2)
  })

  it('markManyCelebrated is idempotent when called again with subset + new', () => {
    useUnlockStore.getState().markManyCelebrated(['a', 'b'])
    expect(useUnlockStore.getState().celebrated.length).toBe(2)

    useUnlockStore.getState().markManyCelebrated(['b', 'c'])
    const celebrated = useUnlockStore.getState().celebrated
    expect(celebrated).toContain('a')
    expect(celebrated).toContain('b')
    expect(celebrated).toContain('c')
    expect(celebrated.length).toBe(3)
  })

  it('setHydrated flips the hydrated flag', () => {
    useUnlockStore.getState().setHydrated(true)
    expect(useUnlockStore.getState().hydrated).toBe(true)

    useUnlockStore.getState().setHydrated(false)
    expect(useUnlockStore.getState().hydrated).toBe(false)
  })

  it('persists only celebrated (not hydrated)', async () => {
    useUnlockStore.getState().markCelebrated('cycle:regularity')
    useUnlockStore.getState().setHydrated(true)
    // Give persist middleware a tick to flush.
    await new Promise((r) => setTimeout(r, 0))

    const raw = await AsyncStorage.getItem(STORAGE_KEY)
    expect(raw).toBeTruthy()
    const parsed = JSON.parse(raw as string)
    expect(parsed.state.celebrated).toEqual(['cycle:regularity'])
    expect(parsed.state.hydrated).toBeUndefined()
  })

  it('rehydrate() restores persisted celebrated and flips hydrated to true', async () => {
    await AsyncStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ state: { celebrated: ['cycle:regularity', 'kids:sleep'] }, version: 0 }),
    )
    expect(useUnlockStore.getState().hydrated).toBe(false)

    await useUnlockStore.persist.rehydrate()

    expect(useUnlockStore.getState().celebrated).toEqual(['cycle:regularity', 'kids:sleep'])
    expect(useUnlockStore.getState().hydrated).toBe(true)
  })

  it('flips hydrated to true even with nothing persisted (fresh install)', async () => {
    expect(useUnlockStore.getState().hydrated).toBe(false)
    await useUnlockStore.persist.rehydrate()
    expect(useUnlockStore.getState().hydrated).toBe(true)
    expect(useUnlockStore.getState().celebrated).toEqual([])
  })
})
