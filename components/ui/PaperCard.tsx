/**
 * PaperCard — the card container used across the redesign.
 *
 * Current variant: paper background, hairline border, 20-28px radius, subtle
 * shadow. Pass `flat` to drop the shadow, `tint` to override the background.
 *
 * Diffuse variant (v3, behind the theme flag): the same box, but softer — a
 * near-borderless paper surface with the delicate --d-hairline, a barely-there
 * two-layer shadow, and a light grain wash. `tint` still overrides the fill.
 * API is identical in both variants.
 */

import { ReactNode } from 'react'
import { View, ViewStyle, StyleProp, StyleSheet } from 'react-native'
import { useTheme, useDiffuseTheme, diffuseShadows } from '../../constants/theme'
import { useIsDiffuse, DiffuseGrain } from './diffuse/DiffuseKit'

interface PaperCardProps {
  children: ReactNode
  style?: StyleProp<ViewStyle>
  tint?: string
  flat?: boolean
  radius?: number
  padding?: number
  borderColor?: string
}

export function PaperCard(props: PaperCardProps) {
  const diffuse = useIsDiffuse()
  return diffuse ? <DiffusePaperCard {...props} /> : <CurrentPaperCard {...props} />
}

// ─── Current (cream-paper / sticker-collage) ───────────────────────────────

function CurrentPaperCard({
  children,
  style,
  tint,
  flat = false,
  radius = 20,
  padding = 16,
  borderColor,
}: PaperCardProps) {
  const { colors } = useTheme()

  const bg = tint ?? colors.surface
  const border = borderColor ?? colors.border

  return (
    <View
      style={[
        {
          backgroundColor: bg,
          borderColor: border,
          borderRadius: radius,
          borderWidth: 1,
          padding,
        },
        !flat && styles.shadow,
        style,
      ]}
    >
      {children}
    </View>
  )
}

// ─── Diffuse (v3) ──────────────────────────────────────────────────────────
// Softer, calmer: hairline border, gentler shadow, faint grain. When a `tint`
// is passed (mode-soft hero cards) we honor it but keep the grain so the
// surface still reads as a diffuse field rather than a flat block.

function DiffusePaperCard({
  children,
  style,
  tint,
  flat = false,
  radius = 20,
  padding = 16,
  borderColor,
}: PaperCardProps) {
  const { colors } = useDiffuseTheme()

  const bg = tint ?? colors.surface
  const border = borderColor ?? colors.line

  return (
    <View
      style={[
        {
          backgroundColor: bg,
          borderColor: border,
          borderRadius: radius,
          borderWidth: 1,
          padding,
          overflow: 'hidden',
        },
        !flat && diffuseShadows.card,
        style,
      ]}
    >
      <DiffuseGrain radius={radius} opacity={tint ? 0.10 : 0.06} />
      {children}
    </View>
  )
}

const styles = StyleSheet.create({
  shadow: {
    shadowColor: '#141313',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 2,
  },
})
