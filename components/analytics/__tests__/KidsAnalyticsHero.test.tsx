import { render } from '@testing-library/react-native'
import { KidsAnalyticsHero } from '../KidsAnalyticsHero'

// Task 10: the hero's caption row carries a "LOW DATA" tag whenever overall
// confidence is thin, so a score off almost no logs doesn't read as
// authoritative. Presentational component — no store/provider setup needed,
// `useDiffuseTheme()` reads straight from useThemeStore (zustand) + useColorScheme.
describe('KidsAnalyticsHero', () => {
  const baseProps = {
    overall: 7.4,
    hasData: true,
    caption: 'THIS WEEK · DEVELOPING',
    childName: 'Bahia',
    band: 'developing',
  }

  it('appends a LOW DATA tag to the caption when lowConfidence is true', () => {
    const { getByText } = render(<KidsAnalyticsHero {...baseProps} lowConfidence />)
    expect(getByText(/LOW DATA/)).toBeTruthy()
  })

  it('omits the LOW DATA tag when lowConfidence is false', () => {
    const { queryByText } = render(<KidsAnalyticsHero {...baseProps} lowConfidence={false} />)
    expect(queryByText(/LOW DATA/)).toBeNull()
  })

  it('omits the LOW DATA tag when lowConfidence is not passed at all', () => {
    const { queryByText } = render(<KidsAnalyticsHero {...baseProps} />)
    expect(queryByText(/LOW DATA/)).toBeNull()
  })
})
