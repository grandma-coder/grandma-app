// Module-level constants (menu item tones, StyleSheets) read `stickers` at import time, before the
// theme store hydrates. They must get the light palette then, not the phone's system scheme:
// a dark-mode iPhone running the app in light showed dark Village/Community cards in the centre menu.
import { Appearance } from 'react-native'
import { stickers, stickersDark } from '../../constants/theme'
import { useThemeStore } from '../../store/useThemeStore'

describe('stickers palette', () => {
  afterEach(() => {
    jest.restoreAllMocks()
    useThemeStore.setState({ theme: 'light', hydrated: false })
  })

  it('stays light before the theme store hydrates, even when the system is dark', () => {
    jest.spyOn(Appearance, 'getColorScheme').mockReturnValue('dark')
    useThemeStore.setState({ theme: 'light', hydrated: false })
    expect(stickers.greenSoft).not.toBe(stickersDark.greenSoft)
  })

  it('follows the chosen dark theme once hydrated', () => {
    useThemeStore.setState({ theme: 'dark', hydrated: true })
    expect(stickers.greenSoft).toBe(stickersDark.greenSoft)
  })

  it('stays light when the chosen theme is light and the system is dark', () => {
    jest.spyOn(Appearance, 'getColorScheme').mockReturnValue('dark')
    useThemeStore.setState({ theme: 'light', hydrated: true })
    expect(stickers.greenSoft).not.toBe(stickersDark.greenSoft)
  })
})
