/**
 * PillButton — the primary CTA primitive.
 *
 * Current variant: 58px filled pill, sticker-on-paper (ink border + hard
 * offset shadow that presses down on tap). Variants ink / paper / accent.
 *
 * Diffuse variant (v3, behind the flag): CONTAINERLESS. No filled pill, no
 * hard shadow. `ink` becomes a mono-caps label + arrow on a top hairline rule
 * (.solid); `accent` becomes a soft gradient-glass spray behind the label
 * (.gradpill); `paper` becomes a quiet mono text link (.txtlink). The public
 * API — label, variant, leading/trailing, loading, disabled, height — is
 * unchanged.
 */

import { ReactNode } from 'react'
import { Pressable, Text, StyleSheet, ViewStyle, StyleProp, View } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { useTheme, useDiffuseTheme, getModeField, getDiffuseAccent, diffuseFont } from '../../constants/theme'
import { useModeStore } from '../../store/useModeStore'
import { useIsDiffuse, DiffuseArrow } from './diffuse/DiffuseKit'

export type PillButtonVariant = 'ink' | 'paper' | 'accent'

interface PillButtonProps {
  label: string
  onPress?: () => void
  variant?: PillButtonVariant
  disabled?: boolean
  loading?: boolean
  leading?: ReactNode
  trailing?: ReactNode
  accentColor?: string
  style?: StyleProp<ViewStyle>
  height?: number
}

export function PillButton(props: PillButtonProps) {
  const diffuse = useIsDiffuse()
  return diffuse ? <DiffusePillButton {...props} /> : <CurrentPillButton {...props} />
}

// ─── Current (filled sticker pill) ─────────────────────────────────────────

function CurrentPillButton({
  label,
  onPress,
  variant = 'ink',
  disabled = false,
  loading = false,
  leading,
  trailing,
  accentColor,
  style,
  height = 58,
}: PillButtonProps) {
  const { colors, font, isDark } = useTheme()

  const ink = colors.text
  const paper = colors.surface
  const bgCanvas = colors.bg
  const borderInk = isDark ? colors.border : colors.text

  const variants: Record<PillButtonVariant, { bg: string; fg: string; border: string; shadow: string }> = {
    ink:    { bg: ink, fg: bgCanvas, border: borderInk, shadow: borderInk },
    paper:  { bg: paper, fg: ink, border: borderInk, shadow: borderInk },
    accent: { bg: accentColor ?? ink, fg: colors.text, border: borderInk, shadow: borderInk },
  }

  const v = variants[variant]
  const isInactive = disabled || loading

  return (
    <Pressable
      onPress={onPress}
      disabled={isInactive}
      style={({ pressed }) => [
        styles.base,
        {
          height,
          backgroundColor: v.bg,
          borderColor: v.border,
          borderWidth: 1.5,
          shadowColor: v.shadow,
          shadowOffset: { width: 0, height: pressed ? 1 : 3 },
          shadowOpacity: 1,
          shadowRadius: 0,
          elevation: 4,
          opacity: isInactive ? 0.55 : 1,
          transform: [{ translateY: pressed && !isInactive ? 2 : 0 }],
        },
        style,
      ]}
    >
      {leading ? <View style={styles.slot}>{leading}</View> : null}
      <Text style={[styles.label, { fontFamily: font.bodySemiBold, color: v.fg }]}>
        {loading ? '…' : label}
      </Text>
      {trailing ? <View style={styles.slot}>{trailing}</View> : null}
    </Pressable>
  )
}

// ─── Diffuse (containerless) ───────────────────────────────────────────────

function DiffusePillButton({
  label,
  onPress,
  variant = 'ink',
  disabled = false,
  loading = false,
  leading,
  trailing,
  accentColor,
  style,
  height = 58,
}: PillButtonProps) {
  const { colors, isDark } = useDiffuseTheme()
  const mode = useModeStore((s) => s.mode)
  const isInactive = disabled || loading
  const displayLabel = loading ? '…' : label

  // ACCENT → gradient-glass spray (.gradpill). The hero / emphasised action.
  if (variant === 'accent') {
    const [g1, g2, g3] = getModeField(mode, isDark)
    const accent = accentColor ?? getDiffuseAccent(mode, isDark)
    return (
      <Pressable
        onPress={onPress}
        disabled={isInactive}
        style={({ pressed }) => [
          diffuseStyles.glassBase,
          { height, opacity: isInactive ? 0.5 : pressed ? 0.9 : 1, borderColor: colors.line },
          style,
        ]}
      >
        <LinearGradient
          colors={[g1, g2, g3]}
          start={{ x: 0.1, y: 0 }}
          end={{ x: 0.95, y: 1 }}
          style={[StyleSheet.absoluteFillObject, { opacity: 0.55 }]}
        />
        <View style={[StyleSheet.absoluteFillObject, { backgroundColor: colors.surface, opacity: 0.28 }]} />
        {leading ? <View style={diffuseStyles.slot}>{leading}</View> : null}
        <Text style={[diffuseStyles.monoLabel, { color: colors.ink, letterSpacing: 2 }]}>{displayLabel}</Text>
        {trailing ? <View style={diffuseStyles.slot}>{trailing}</View> : <DiffuseArrow color={accent} />}
      </Pressable>
    )
  }

  // PAPER → quiet mono text link (.txtlink). Secondary / cancel.
  if (variant === 'paper') {
    return (
      <Pressable
        onPress={onPress}
        disabled={isInactive}
        style={({ pressed }) => [
          diffuseStyles.linkBase,
          { minHeight: Math.min(height, 48), opacity: isInactive ? 0.5 : pressed ? 0.6 : 1 },
          style,
        ]}
      >
        {leading ? <View style={diffuseStyles.slot}>{leading}</View> : null}
        <Text style={[diffuseStyles.monoLabel, { color: colors.ink3, letterSpacing: 2.2 }]}>{displayLabel}</Text>
        {trailing ? <View style={diffuseStyles.slot}>{trailing}</View> : null}
      </Pressable>
    )
  }

  // INK (default) → containerless CTA on a top hairline rule (.solid).
  const accent = accentColor ?? getDiffuseAccent(mode, isDark)
  return (
    <Pressable
      onPress={onPress}
      disabled={isInactive}
      style={({ pressed }) => [
        diffuseStyles.solidBase,
        { borderTopColor: colors.line2, opacity: isInactive ? 0.45 : 1, minHeight: Math.min(height, 52) },
        pressed && !isInactive ? { opacity: 0.7 } : null,
        style,
      ]}
    >
      {leading ? <View style={diffuseStyles.slot}>{leading}</View> : null}
      <Text style={[diffuseStyles.monoLabel, { color: isInactive ? colors.ink4 : colors.ink, letterSpacing: 2.4, flex: 1 }]}>
        {displayLabel}
      </Text>
      {trailing ? <View style={diffuseStyles.slot}>{trailing}</View> : <DiffuseArrow color={isInactive ? colors.ink4 : accent} size={20} />}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  base: {
    borderRadius: 999,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 20,
  },
  label: { fontSize: 16, letterSpacing: -0.2 },
  slot: { alignItems: 'center', justifyContent: 'center' },
})

const diffuseStyles = StyleSheet.create({
  monoLabel: {
    fontFamily: diffuseFont.mono,
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  slot: { alignItems: 'center', justifyContent: 'center' },
  // .solid — mono label + arrow on a top hairline, containerless
  solidBase: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    borderTopWidth: 1,
    paddingTop: 18,
    paddingHorizontal: 2,
    paddingBottom: 2,
  },
  // .gradpill — gradient-glass spray
  glassBase: {
    borderRadius: 999,
    borderWidth: 1,
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 22,
  },
  // .txtlink — quiet centered mono link
  linkBase: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
  },
})
