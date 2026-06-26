import AsyncStorage from '@react-native-async-storage/async-storage'
import { useCaregiverStore } from '../useCaregiverStore'

const STORAGE_KEY = 'grandma-caregiver'

describe('useCaregiverStore', () => {
  beforeEach(async () => {
    await AsyncStorage.clear()
    // Reset to a clean synchronous baseline between tests.
    useCaregiverStore.setState({ accountRole: 'parent', hydrated: false })
  })

  it('defaults to the parent account role', () => {
    expect(useCaregiverStore.getState().accountRole).toBe('parent')
  })

  it('setAccountRole stores the role; empty values fall back to parent', () => {
    useCaregiverStore.getState().setAccountRole('nanny')
    expect(useCaregiverStore.getState().accountRole).toBe('nanny')

    useCaregiverStore.getState().setAccountRole('')
    expect(useCaregiverStore.getState().accountRole).toBe('parent')
  })

  it('clear() resets accountRole to parent (sign-out path)', () => {
    useCaregiverStore.getState().setAccountRole('family')
    useCaregiverStore.getState().clear()
    expect(useCaregiverStore.getState().accountRole).toBe('parent')
  })

  it('persists only accountRole (not the hydrated flag)', async () => {
    useCaregiverStore.getState().setAccountRole('nanny')
    // persist writes asynchronously; give the middleware a tick to flush.
    await new Promise((r) => setTimeout(r, 0))
    const raw = await AsyncStorage.getItem(STORAGE_KEY)
    expect(raw).toBeTruthy()
    const parsed = JSON.parse(raw as string)
    expect(parsed.state.accountRole).toBe('nanny')
    expect(parsed.state.hydrated).toBeUndefined()
  })

  it('rehydrate() restores a persisted role and flips hydrated to true', async () => {
    await AsyncStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ state: { accountRole: 'nanny' }, version: 0 }),
    )
    expect(useCaregiverStore.getState().hydrated).toBe(false)

    await useCaregiverStore.persist.rehydrate()

    expect(useCaregiverStore.getState().accountRole).toBe('nanny')
    expect(useCaregiverStore.getState().hydrated).toBe(true)
  })

  it('flips hydrated to true even with nothing persisted (fresh install)', async () => {
    expect(useCaregiverStore.getState().hydrated).toBe(false)
    await useCaregiverStore.persist.rehydrate()
    expect(useCaregiverStore.getState().hydrated).toBe(true)
    expect(useCaregiverStore.getState().accountRole).toBe('parent')
  })
})
