/**
 * BrandedLoader — canonical loading state.
 *
 * Big blinking eye + typewriter label underneath. Replaces ActivityIndicator
 * in full-screen / overlay moments. For tiny inline spinners (buttons, list
 * rows), keep ActivityIndicator.
 */

import { useEffect, useRef, useState } from 'react'
import { Animated, StyleSheet, Text, View } from 'react-native'
import { useTheme } from '../../constants/theme'
import { GrandmaLogo, type GrandmaLogoMotion } from './GrandmaLogo'

interface Props {
  label?: string
  sublabel?: string
  logoSize?: number
  fullscreen?: boolean
  motion?: GrandmaLogoMotion
  /** Hide the typewriter label + cursor + sublabel. Auto-enabled when logoSize < 96. */
  compact?: boolean
}

export function BrandedLoader({
  label = 'Loading',
  sublabel,
  logoSize = 120,
  fullscreen = false,
  motion = 'blinkOnly',
  compact,
}: Props) {
  const { colors, font } = useTheme()
  const isCompact = compact ?? logoSize < 96

  const container = fullscreen
    ? [styles.fullscreen, { backgroundColor: colors.bg }]
    : styles.inline

  if (isCompact) {
    return (
      <View style={container}>
        <GrandmaLogo size={logoSize} motion={motion} />
      </View>
    )
  }

  return (
    <View style={container}>
      <GrandmaLogo size={logoSize} motion={motion} />
      <TypewriterLabel label={label} />
      {sublabel && (
        <Text style={[styles.sublabel, { color: colors.textSecondary, fontFamily: font.italic }]}>
          {sublabel}
        </Text>
      )}
    </View>
  )
}

// ─── Typewriter Label (isolated so the loops only run when labelled) ─────

function TypewriterLabel({ label }: { label: string }) {
  const { colors, font } = useTheme()
  const [typed, setTyped] = useState('')

  useEffect(() => {
    let i = 0
    let forward = true
    const tick = () => {
      if (forward) {
        i += 1
        setTyped(label.slice(0, i))
        if (i >= label.length) {
          forward = false
          setTimeout(tick, 900)
          return
        }
      } else {
        i -= 1
        setTyped(label.slice(0, i))
        if (i <= 0) {
          forward = true
          setTimeout(tick, 280)
          return
        }
      }
      setTimeout(tick, forward ? 80 : 40)
    }
    const id = setTimeout(tick, 200)
    return () => {
      clearTimeout(id)
    }
  }, [label])

  const cursor = useRef(new Animated.Value(1)).current
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(cursor, { toValue: 0, duration: 420, useNativeDriver: true }),
        Animated.timing(cursor, { toValue: 1, duration: 420, useNativeDriver: true }),
      ]),
    )
    loop.start()
    return () => loop.stop()
  }, [cursor])

  return (
    <View style={styles.labelRow}>
      <Text style={[styles.label, { color: colors.text, fontFamily: font.display }]}>
        {typed}
      </Text>
      <Animated.Text
        style={[styles.cursor, { color: colors.text, fontFamily: font.display, opacity: cursor }]}
      >
        |
      </Animated.Text>
    </View>
  )
}

const styles = StyleSheet.create({
  fullscreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  inline: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
    paddingHorizontal: 24,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 18,
  },
  label: {
    fontSize: 20,
    letterSpacing: -0.2,
  },
  cursor: {
    fontSize: 20,
    marginLeft: 2,
  },
  sublabel: {
    fontSize: 15,
    marginTop: 8,
    textAlign: 'center',
    fontStyle: 'italic',
  },
})
