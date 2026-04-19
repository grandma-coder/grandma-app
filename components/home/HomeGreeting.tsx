/**
 * HomeGreeting — animated GrandmaLogo + "Hi, {name}" serif greeting with
 * mono-caps sub-label below.
 *
 *   🫘  Hi, {name}   ← Fraunces 28 + italic name
 *       MONO-CAPS    ← ink-3, 10px, uppercase
 */

import { View, StyleSheet } from 'react-native'
import { Display, DisplayItalic, MonoCaps } from '../ui/Typography'
import { GrandmaLogo } from '../ui/GrandmaLogo'
import { useTheme, stickers } from '../../constants/theme'

interface HomeGreetingProps {
  name?: string | null
  /** Sub-label rendered below greeting — e.g. "RIO'S WEEK", "WEEK 24 · FRIDAY" */
  microLabel?: string
  size?: number
  /** Show the animated heart-eye logo to the left of the greeting */
  showLogo?: boolean
  logoSize?: number
}

export function HomeGreeting({
  name,
  microLabel,
  size = 30,
  showLogo = true,
  logoSize = 44,
}: HomeGreetingProps) {
  const { colors, isDark } = useTheme()
  const ink = isDark ? colors.text : '#141313'
  const displayName = name?.trim() || 'dear'

  return (
    <View style={styles.wrap}>
      {showLogo ? (
        <View style={styles.logo}>
          <GrandmaLogo
            size={logoSize}
            body={isDark ? stickers.yellow : '#F5D652'}
            outline={ink}
            accent={stickers.coral}
            motion="default"
          />
        </View>
      ) : null}
      <View style={{ flex: 1 }}>
        <View style={styles.row}>
          <Display size={size} color={ink}>Hi,</Display>
          <DisplayItalic size={size} color={ink} style={{ marginLeft: 8 }}>
            {displayName}
          </DisplayItalic>
        </View>
        {microLabel ? <MonoCaps style={{ marginTop: 2 }}>{microLabel}</MonoCaps> : null}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: 16,
    paddingHorizontal: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logo: {
    flexShrink: 0,
  },
  row: { flexDirection: 'row', alignItems: 'baseline' },
})
