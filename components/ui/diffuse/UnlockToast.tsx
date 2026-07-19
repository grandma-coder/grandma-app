/**
 * UnlockToast — a small Diffuse-styled pill that floats above content to
 * celebrate a metric unlocking (e.g. "Unlocked ✨ Regularity is ready").
 *
 * Presentational only: no store access, no unlock-detection logic. The
 * caller decides when to render it and owns the celebration bookkeeping
 * (see useUnlockStore). Auto-dismisses itself after ~2.6s via onDone.
 */

import { useEffect, useRef } from 'react'
import { View, Text, StyleSheet } from 'react-native'
import Animated, { FadeInDown, FadeOut } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useDiffuseTheme, diffuseFont } from '../../../constants/theme'
import { useTranslation } from '../../../lib/i18n'

const AUTO_DISMISS_MS = 2600

interface UnlockToastProps {
  metricLabel: string
  onDone: () => void
}

export function UnlockToast({ metricLabel, onDone }: UnlockToastProps) {
  const { colors } = useDiffuseTheme()
  const { t } = useTranslation()
  const insets = useSafeAreaInsets()
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    timerRef.current = setTimeout(onDone, AUTO_DISMISS_MS)
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <Animated.View
      entering={FadeInDown.duration(280)}
      exiting={FadeOut.duration(180)}
      pointerEvents="none"
      style={[styles.wrap, { top: insets.top + 8 }]}
    >
      <View
        style={[
          styles.pill,
          { backgroundColor: colors.surface, borderColor: colors.line, shadowColor: colors.ink },
        ]}
      >
        <Text style={[styles.sparkle]}>✨</Text>
        <Text style={[styles.text, { color: colors.ink }]} numberOfLines={1}>
          {t('cycleInsights_unlocked_toast', { metric: metricLabel })}
        </Text>
      </View>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 50,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 999,
    borderWidth: 1,
    maxWidth: '86%',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.14,
    shadowRadius: 16,
    elevation: 6,
  },
  sparkle: {
    fontSize: 14,
  },
  text: {
    fontFamily: diffuseFont.bodyMedium,
    fontSize: 13,
    letterSpacing: 0.1,
  },
})
