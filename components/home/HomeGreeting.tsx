/**
 * HomeGreeting — animated GrandmaLogo + "Hi, {name}" serif greeting with
 * mono-caps sub-label below.
 *
 *   🫘  Hi, {name}   ← Fraunces 28 + italic name
 *       MONO-CAPS    ← ink-3, 10px, uppercase
 */

import type { ReactNode } from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { Display, DisplayItalic, MonoCaps } from '../ui/Typography'
import { GrandmaLogo } from '../ui/GrandmaLogo'
import { useTheme, useDiffuseTheme, diffuseFont } from '../../constants/theme'
import { useIsDiffuse } from '../ui/diffuse/DiffuseKit'
import { useTranslation } from '../../lib/i18n'

interface HomeGreetingProps {
  name?: string | null
  /** Sub-label rendered below greeting — e.g. "RIO'S WEEK", "WEEK 24 · FRIDAY" */
  microLabel?: string
  size?: number
  /** Show the animated heart-eye logo to the left of the greeting */
  showLogo?: boolean
  logoSize?: number
  /** Optional right-aligned control (e.g. the journey switcher). */
  trailing?: ReactNode
}

export function HomeGreeting({
  name,
  microLabel,
  size = 30,
  showLogo = true,
  logoSize = 44,
  trailing,
}: HomeGreetingProps) {
  const { colors, isDark } = useTheme()
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
  const { t } = useTranslation()
  const ink = diffuse ? dt.colors.ink : (isDark ? colors.text : '#141313')
  // Page canvas behind the greeting — used as the logo's "empty" body so the
  // black line-art heart stays legible instead of filling solid.
  const canvas = diffuse ? dt.colors.bg : colors.bg
  const displayName = name?.trim().split(/\s+/)[0] || 'dear'

  return (
    <View style={styles.wrap}>
      {showLogo ? (
        <View style={styles.logo}>
          {/* Monochrome line-art mark — ink outline + ink heart on an empty
              (canvas-colored) body, no animation. A quiet static brand glyph. */}
          <GrandmaLogo
            size={logoSize}
            body={canvas}
            accent={ink}
            outline={ink}
            motion="none"
            animate={false}
          />
        </View>
      ) : null}
      <View style={{ flex: 1 }}>
        <View style={styles.row}>
          {diffuse ? (
            <>
              {/* Swiss display font is wider than the serif — cap the size a
                  touch and let the name shrink/truncate so it never clips. */}
              <Text style={{ fontFamily: diffuseFont.display, fontSize: size - 2, color: ink, letterSpacing: -0.6 }}>{t('home_hi')}</Text>
              <Text
                style={{ fontFamily: diffuseFont.italic, fontSize: size - 2, color: ink, marginLeft: 8, flexShrink: 1 }}
                numberOfLines={1}
              >{displayName}</Text>
            </>
          ) : (
            <>
              <Display size={size} color={ink}>{t('home_hi')}</Display>
              <DisplayItalic size={size} color={ink} style={{ marginLeft: 8 }}>{displayName}</DisplayItalic>
            </>
          )}
        </View>
        {microLabel ? (
          diffuse
            ? <Text style={{ fontFamily: diffuseFont.mono, fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', color: dt.colors.ink3, marginTop: 3 }}>{microLabel}</Text>
            : <MonoCaps style={{ marginTop: 2 }}>{microLabel}</MonoCaps>
        ) : null}
      </View>
      {trailing ? <View style={{ flexShrink: 0 }}>{trailing}</View> : null}
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
