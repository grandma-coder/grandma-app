/**
 * BrandedLoader — canonical loading state.
 *
 * Big blinking eye + typewriter label underneath. Replaces ActivityIndicator
 * in full-screen / overlay moments. For tiny inline spinners (buttons, list
 * rows), keep ActivityIndicator.
 */

import { useEffect, useRef, useState } from 'react'
import { AccessibilityInfo, Animated, Easing, StyleSheet, Text, View } from 'react-native'
import { useTheme, useDiffuseTheme, diffuseFont } from '../../constants/theme'
import { useIsDiffuse } from './diffuse/DiffuseKit'
import { GrandmaLogo, type GrandmaLogoMotion } from './GrandmaLogo'
import { useTranslation } from '../../lib/i18n'

interface Props {
  label?: string
  sublabel?: string
  logoSize?: number
  fullscreen?: boolean
  motion?: GrandmaLogoMotion
  /** Hide the typewriter label + cursor + sublabel. Auto-enabled when logoSize < 96. */
  compact?: boolean
}

// Same eye sticker as the native splash + site nav, at a resolution that stays sharp at 120pt.
const EYE = require('../../assets/stickers-site/eye-cut-lg.png')

export function BrandedLoader({
  label,
  sublabel,
  logoSize = 120,
  fullscreen = false,
  motion = 'blinkOnly',
  compact,
}: Props) {
  const { colors, font } = useTheme()
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
  const { t } = useTranslation()
  const isCompact = compact ?? logoSize < 96
  const text = label ?? t('common_loading').replace(/[.…]+$/, '')

  const container = fullscreen
    ? [styles.fullscreen, { backgroundColor: diffuse ? dt.colors.bg : colors.bg }]
    : styles.inline

  const mark = diffuse
    ? <GrandmaLogo size={logoSize} mode={isCompact ? 'auto' : undefined} motion={motion} />
    : <BreathingEye size={logoSize} />

  if (isCompact) {
    return (
      <View style={container} accessibilityRole="progressbar" accessibilityLabel={text}>
        {mark}
      </View>
    )
  }

  return (
    <View style={container} accessibilityRole="progressbar" accessibilityLabel={text}>
      {mark}
      <TypewriterLabel label={text} />
      {sublabel && (
        <Text style={[styles.sublabel, { color: diffuse ? dt.colors.ink3 : colors.textSecondary, fontFamily: diffuse ? diffuseFont.italic : font.italic }]}>
          {sublabel}
        </Text>
      )}
    </View>
  )
}

// ─── Breathing eye (light) — slow swell so the wait reads as alive, not stuck ─

function BreathingEye({ size }: { size: number }) {
  const v = useRef(new Animated.Value(0)).current
  useEffect(() => {
    let loop: Animated.CompositeAnimation | null = null
    let cancelled = false
    AccessibilityInfo.isReduceMotionEnabled().then((reduce) => {
      if (cancelled || reduce) return
      loop = Animated.loop(
        Animated.sequence([
          Animated.timing(v, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(v, { toValue: 0, duration: 900, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        ]),
      )
      loop.start()
    })
    return () => { cancelled = true; loop?.stop() }
  }, [v])
  const scale = v.interpolate({ inputRange: [0, 1], outputRange: [1, 1.06] })
  const translateY = v.interpolate({ inputRange: [0, 1], outputRange: [0, -3] })
  return (
    <Animated.Image
      source={EYE}
      style={{ width: size, height: size, transform: [{ translateY }, { scale }] }}
      resizeMode="contain"
      accessibilityIgnoresInvertColors
    />
  )
}

// ─── Typewriter Label (isolated so the loops only run when labelled) ─────

function TypewriterLabel({ label }: { label: string }) {
  const { colors, font } = useTheme()
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
  const { t } = useTranslation()
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
      <Text style={[styles.label, { color: diffuse ? dt.colors.ink : colors.text, fontFamily: diffuse ? diffuseFont.display : font.display }]}>
        {typed}
      </Text>
      <Animated.Text
        style={[styles.cursor, { color: diffuse ? dt.colors.ink : colors.text, fontFamily: diffuse ? diffuseFont.display : font.display, opacity: cursor }]}
      >
        {t('common_typewriterCursor')}
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
