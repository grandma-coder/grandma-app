import React, { useEffect, useRef } from 'react'
import { View, Text, Pressable, ScrollView, StyleSheet, Animated, Easing } from 'react-native'
import { useTheme, useDiffuseTheme, diffuseFont } from '../../constants/theme'
import { useIsDiffuse } from '../ui/diffuse/DiffuseKit'
import { BadgeIcon } from '../stickers/BadgeIcon'
import { useTranslation } from '../../lib/i18n'

export interface BadgeEntry {
  badgeId: string
  label: string
}

interface BadgesStripProps {
  badges: BadgeEntry[]
  total: number
  onSeeAll?: () => void
}

/**
 * Paper card with "BADGES" header + "All N →" link, followed by a
 * horizontal row of 58px circles each containing the badge's own sticker.
 */
export function BadgesStrip({ badges, total, onSeeAll }: BadgesStripProps) {
  const { colors, radius } = useTheme()
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
  const { t } = useTranslation()

  const circleBg = diffuse ? dt.colors.surface : colors.surfaceRaised
  const circleBorder = diffuse ? dt.colors.line2 : colors.border

  return (
    <View
      style={[
        styles.card,
        diffuse ? {
          backgroundColor: dt.colors.surface,
          borderColor: dt.colors.line,
          borderRadius: radius.lg,
        } : {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          borderRadius: radius.lg,
        },
      ]}
    >
      <View style={styles.header}>
        <Text style={[styles.headerLabel, diffuse
          ? { color: dt.colors.ink3, fontFamily: diffuseFont.mono, letterSpacing: 1.6 }
          : { color: colors.textMuted }]}>{t('badges_title')}</Text>
        <Pressable onPress={onSeeAll} hitSlop={8}>
          <Text style={[styles.allLink, diffuse
            ? { color: dt.colors.ink3, fontFamily: diffuseFont.mono, letterSpacing: 1.2, textTransform: 'uppercase', fontSize: 10 }
            : { color: colors.textMuted }]}>
            {t('badges_stripAllCount', { total })}
          </Text>
        </Pressable>
      </View>

      {badges.length === 0 ? (
        <View style={styles.emptyWrap}>
          <View
            style={[
              styles.circle,
              { backgroundColor: circleBg, borderColor: circleBorder },
            ]}
          />
          <Text style={[styles.emptyText, diffuse
            ? { color: dt.colors.ink3, fontFamily: diffuseFont.body }
            : { color: colors.textMuted }]}>
            {t('badges_stripEmpty')}
          </Text>
        </View>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {badges.map((b) => (
            <View key={b.badgeId} style={styles.item}>
              <View
                style={[
                  styles.circle,
                  { backgroundColor: circleBg, borderColor: circleBorder },
                ]}
              >
                <BreathingBadge>
                  <BadgeIcon badgeId={b.badgeId} size={40} />
                </BreathingBadge>
              </View>
              <Text style={[styles.dayLabel, diffuse
                ? { color: dt.colors.ink3, fontFamily: diffuseFont.mono, letterSpacing: 0.4 }
                : { color: colors.textMuted }]}>
                {b.label}
              </Text>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  )
}

/** Subtle scale-breathe wrapper. Random phase delay so badges don't pulse together. */
function BreathingBadge({ children }: { children: React.ReactNode }) {
  const v = useRef(new Animated.Value(0)).current
  const delay = useRef(Math.random() * 2200).current

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(v, {
          toValue: 1,
          duration: 2200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(v, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
      ])
    )
    const t = setTimeout(() => loop.start(), delay)
    return () => {
      clearTimeout(t)
      loop.stop()
    }
  }, [v, delay])

  const scale = v.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 1.05, 1] })

  return <Animated.View style={{ transform: [{ scale }] }}>{children}</Animated.View>
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 20,
    marginTop: 18,
    padding: 16,
    borderWidth: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 10,
  },
  headerLabel: {
    fontSize: 10,
    fontWeight: '500',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  allLink: { fontSize: 11, fontWeight: '500' },
  scrollContent: { gap: 10, paddingRight: 10 },
  item: { alignItems: 'center' },
  circle: {
    width: 58,
    height: 58,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayLabel: { fontSize: 10, marginTop: 4 },
  emptyWrap: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  emptyText: { fontSize: 12 },
})
