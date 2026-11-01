import { useThemeStore } from '../useThemeStore'

type Persist = { getOptions: () => { version?: number; migrate?: (s: unknown, v: number) => unknown } }
const opts = () => (useThemeStore as unknown as { persist: Persist }).persist.getOptions()

describe('useThemeStore — site-look default', () => {
  it('fresh installs start on the restyled cream look, light canvas', () => {
    const s = useThemeStore.getState()
    expect(s.variant).toBe('current')
    expect(s.theme).toBe('light')
  })

  it('migrates v0/v1 installs (diffuse, dark) to current + light once', () => {
    const { version, migrate } = opts()
    expect(version).toBe(2)
    expect(migrate!({ theme: 'dark', variant: 'diffuse' }, 1)).toEqual({ theme: 'light', variant: 'current' })
    expect(migrate!({ theme: 'dark', variant: 'current' }, 0)).toEqual({ theme: 'light', variant: 'current' })
  })

  it('leaves a v2 choice alone', () => {
    expect(opts().migrate!({ theme: 'dark', variant: 'diffuse' }, 2)).toEqual({ theme: 'dark', variant: 'diffuse' })
  })
})
