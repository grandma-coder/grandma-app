/**
 * KidsAnalyticsHero — the editorial hero stat for the Diffuse Analytics screen.
 *
 * Big serif overall score, a mono caption (period · band), and one serif read
 * line ("Bahia is developing."). Replaces the score wheel. Presentational —
 * takes plain data, reads only Diffuse tokens. Rendered inside a `useIsDiffuse()`
 * branch by the caller.
 */

import { View, Text, StyleSheet } from 'react-native'
import { useDiffuseTheme, diffuseFont } from '../../constants/theme'

interface Props {
  overall: number
  hasData: boolean
  /** Uppercase mono caption, e.g. "THIS WEEK · DEVELOPING". */
  caption: string
  /** Serif read line, e.g. "Bahia is developing." — `emphasis` renders bold. */
  childName: string
  band: string          // the plain band word: "thriving" | "on track" | "developing" | "needs care"
}

export function KidsAnalyticsHero({ overall, hasData, caption, childName, band }: Props) {
  const { colors } = useDiffuseTheme()
  return (
    <View style={styles.wrap}>
      <Text style={[styles.cap, { color: colors.ink3 }]}>{caption}</Text>
      <Text style={[styles.hero, { color: colors.ink }]}>
        {hasData ? overall.toFixed(1) : '—'}
        <Text style={[styles.slash, { color: colors.ink3 }]}> / 10</Text>
      </Text>
      <Text style={[styles.read, { color: colors.ink2 }]}>
        {childName} is <Text style={[styles.readBold, { color: colors.ink }]}>{band.toLowerCase()}</Text>.
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { paddingTop: 4, paddingBottom: 6 },
  cap: {
    fontFamily: diffuseFont.mono,
    fontSize: 10,
    letterSpacing: 1.8,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  hero: {
    fontFamily: diffuseFont.displayLight,
    fontSize: 84,
    lineHeight: 82,
    letterSpacing: -3,
  },
  slash: {
    fontFamily: diffuseFont.displayLight,
    fontSize: 28,
    letterSpacing: -1,
  },
  read: {
    fontFamily: diffuseFont.display,
    fontSize: 20,
    letterSpacing: -0.2,
    marginTop: 10,
  },
  readBold: {
    fontFamily: diffuseFont.displayMedium,
  },
})
