/**
 * EmptyState — sticker-icon + display title + body + optional CTA.
 *
 * Use for empty lists, no-content screens, "you haven't logged anything yet"
 * states. Sticker socket is 80×80 with a sticker-soft fill and the matching
 * sticker glyph inside.
 */

import { ReactNode } from 'react'
import { View, StyleSheet, type ViewStyle, type StyleProp } from 'react-native'
import { useTheme, useDiffuseTheme, spacing } from '../../constants/theme'
import { useIsDiffuse } from './diffuse/DiffuseKit'
import { Display, Body } from './Typography'
import { PillButton } from './PillButton'

interface EmptyStateProps {
  /** Sticker glyph to render centered in the socket (e.g. <Heart fill={stickers.lilac} size={36} />) */
  icon?: ReactNode
  /** Background fill of the sticker socket (e.g. stickers.lilacSoft). Defaults to surfaceRaised. */
  iconBg?: string
  title: string
  message?: string
  ctaLabel?: string
  onCtaPress?: () => void
  style?: StyleProp<ViewStyle>
}

export function EmptyState({
  icon,
  iconBg,
  title,
  message,
  ctaLabel,
  onCtaPress,
  style,
}: EmptyStateProps) {
  const { colors } = useTheme()
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
  const socketBg = iconBg ?? colors.surfaceRaised

  return (
    <View style={[styles.wrap, style]}>
      {icon ? (
        // Diffuse: hairline ring (no filled soft-disc socket).
        <View style={[styles.iconSocket, diffuse
          ? { backgroundColor: 'transparent', borderWidth: 1, borderColor: dt.colors.line2 }
          : { backgroundColor: socketBg }]}>{icon}</View>
      ) : null}
      <Display size={20} align="center">{title}</Display>
      {message ? (
        <Body size={14} color={colors.textMuted} align="center" style={styles.message}>
          {message}
        </Body>
      ) : null}
      {ctaLabel && onCtaPress ? (
        <View style={styles.cta}>
          <PillButton label={ctaLabel} onPress={onCtaPress} variant="ink" />
        </View>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  iconSocket: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  message: {
    maxWidth: 280,
    lineHeight: 20,
  },
  cta: {
    marginTop: spacing.sm,
    alignSelf: 'stretch',
    maxWidth: 320,
  },
})
