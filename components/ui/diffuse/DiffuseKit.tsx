/**
 * DiffuseKit — shared building blocks for the v3 "Diffuse" variant.
 *
 * These are internal helpers the re-authored shared primitives compose with
 * when `useThemeStore().variant === 'diffuse'`. They are NOT public design-
 * system components — screens should keep using PaperCard / PillButton / etc.,
 * which switch to Diffuse internals automatically behind the flag.
 *
 * Everything here is token-driven (constants/theme.ts → useDiffuseTheme).
 */

import { ReactNode, useMemo } from 'react'
import { View, Text, StyleSheet, ViewStyle, StyleProp, TextStyle, TextProps, Platform } from 'react-native'
import Svg, { Defs, Filter, FeTurbulence, Rect, RadialGradient, Stop } from 'react-native-svg'
import { LinearGradient } from 'expo-linear-gradient'
import { useThemeStore } from '../../../store/useThemeStore'
import {
  useDiffuseTheme,
  getModeField,
  diffuseGrain,
  diffuseFont,
} from '../../../constants/theme'

// ─── Variant gate ──────────────────────────────────────────────────────────
// One place to ask "are we rendering Diffuse right now?". Every re-authored
// primitive branches on this at the top; when false the current path runs
// unchanged.
export function useIsDiffuse(): boolean {
  return useThemeStore((s) => s.variant) === 'diffuse'
}

// ─── Grain overlay ─────────────────────────────────────────────────────────
// feTurbulence fractal-noise laid over a gradient field, matching --d-grain.
// Rendered with react-native-svg so it works on both platforms without an
// image asset. Absolutely-positioned; place as the LAST child of a field so
// it sits on top. Pointer-events pass through.

interface GrainProps {
  opacity?: number
  radius?: number
}

export function DiffuseGrain({ opacity, radius = 0 }: GrainProps) {
  const { isDark } = useDiffuseTheme()
  const op = opacity ?? (isDark ? diffuseGrain.opacityDark : diffuseGrain.opacityLight)
  return (
    <View
      pointerEvents="none"
      style={[StyleSheet.absoluteFillObject, { borderRadius: radius, overflow: 'hidden', opacity: op }]}
    >
      <Svg width="100%" height="100%">
        <Defs>
          <Filter id="diffuseGrain">
            <FeTurbulence
              type="fractalNoise"
              baseFrequency={String(diffuseGrain.baseFrequency)}
              numOctaves={diffuseGrain.numOctaves}
              stitchTiles="stitch"
            />
          </Filter>
        </Defs>
        <Rect width="100%" height="100%" filter="url(#diffuseGrain)" />
      </Svg>
    </View>
  )
}

// ─── SoftBloom ──────────────────────────────────────────────────────────────
// A single feathered radial bloom via SVG RadialGradient — fades to transparent
// at the edge (the real diffuse glow; a plain RN View renders a hard disc). Fills
// its parent; position/size the parent. cx/cy move the hotspot for corner blooms.

let bloomSeq = 0
interface SoftBloomProps {
  color: string
  opacity?: number
  cx?: string
  cy?: string
  spread?: number
  style?: StyleProp<ViewStyle>
}

export function SoftBloom({ color, opacity = 0.5, cx = '50%', cy = '50%', spread = 0.6, style }: SoftBloomProps) {
  const id = useMemo(() => `sb${bloomSeq++}`, [])
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFillObject, style]}>
      <Svg width="100%" height="100%">
        <Defs>
          <RadialGradient id={id} cx={cx} cy={cy} r="60%">
            <Stop offset="0" stopColor={color} stopOpacity={opacity} />
            <Stop offset={String(spread)} stopColor={color} stopOpacity={opacity * 0.4} />
            <Stop offset="1" stopColor={color} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect width="100%" height="100%" fill={`url(#${id})`} />
      </Svg>
    </View>
  )
}

// ─── Gradient-field surface ────────────────────────────────────────────────
// The soft, low-saturation generative field behind Diffuse surfaces. Uses the
// active mode's 4 field stops, blurred by low opacity + a paper wash so it
// reads as a delicate bloom rather than a loud gradient. Grain on top.
//
//   intensity — 0..1 how present the field is (default 0.5, "card" strength).
//   mode      — override the behavior; defaults to the active mode via prop.

interface FieldSurfaceProps {
  mode: string
  isDark?: boolean
  intensity?: number
  radius?: number
  grain?: boolean
  style?: StyleProp<ViewStyle>
  children?: ReactNode
}

export function DiffuseFieldSurface({
  mode,
  isDark = false,
  intensity = 0.5,
  radius = 20,
  grain = true,
  style,
  children,
}: FieldSurfaceProps) {
  const { colors } = useDiffuseTheme()
  const [g1] = getModeField(mode, isDark)

  // v4 "soft wash": clean PAPER + ONE subtle feathered pool bleeding from the
  // right edge (SVG radial, fades to transparent). Restraint — the reference
  // banner is almost entirely paper with a whisper of color trailing off-right.
  const washOpacity = (isDark ? 0.18 : 0.26) * (intensity / 0.5)

  return (
    <View style={[{ borderRadius: radius, overflow: 'hidden', backgroundColor: colors.surface }, style]}>
      <SoftBloom color={g1} cx="92%" cy="45%" opacity={washOpacity} spread={0.45} />
      {grain ? <DiffuseGrain radius={radius} opacity={0.03} /> : null}
      {children}
    </View>
  )
}

// ─── Type helpers — role-driven (title=serif, read=sans, data=mono) ────────
// Thin wrappers so primitives don't repeat fontFamily/tracking. All sizes are
// passed by the caller; these fix only the family + the tracking each role
// wants (mono is tracked-out uppercase; serif is tight; sans is neutral).

type RoleTextProps = TextProps & {
  size?: number
  color?: string
  weight?: 'light' | 'regular' | 'medium' | 'semibold' | 'bold'
  children?: ReactNode
  style?: StyleProp<TextStyle>
}

const HANKEN: Record<NonNullable<RoleTextProps['weight']>, string> = {
  light: diffuseFont.bodyLight,
  regular: diffuseFont.body,
  medium: diffuseFont.bodyMedium,
  semibold: diffuseFont.bodySemiBold,
  bold: diffuseFont.bodyBold,
}

/** SERIF — titles + feeling words + the one hero number. */
export function DiffuseTitle({ size = 22, color, style, children, ...rest }: RoleTextProps) {
  const { colors } = useDiffuseTheme()
  return (
    <Text {...rest} style={[{ fontFamily: diffuseFont.display, fontSize: size, letterSpacing: -0.3, color: color ?? colors.ink }, style]}>
      {children}
    </Text>
  )
}

/** SERIF ITALIC — expressive accent line. */
export function DiffuseTitleItalic({ size = 22, color, style, children, ...rest }: RoleTextProps) {
  const { colors } = useDiffuseTheme()
  return (
    <Text {...rest} style={[{ fontFamily: diffuseFont.italic, fontSize: size, letterSpacing: -0.2, color: color ?? colors.ink }, style]}>
      {children}
    </Text>
  )
}

/** SANS — reading copy + selectable row labels. */
export function DiffuseRead({ size = 15, color, weight = 'regular', style, children, ...rest }: RoleTextProps) {
  const { colors } = useDiffuseTheme()
  return (
    <Text {...rest} style={[{ fontFamily: HANKEN[weight], fontSize: size, color: color ?? colors.ink, lineHeight: size * 1.4 }, style]}>
      {children}
    </Text>
  )
}

/** MONO — the data voice: labels, chips, numbers, units, timestamps. */
export function DiffuseData({ size = 12, color, style, children, ...rest }: RoleTextProps & { tracking?: number }) {
  const { colors } = useDiffuseTheme()
  const tracking = (rest as { tracking?: number }).tracking
  return (
    <Text
      {...rest}
      style={[
        {
          fontFamily: diffuseFont.mono,
          fontSize: size,
          letterSpacing: tracking ?? size * 0.16,
          textTransform: 'uppercase',
          color: color ?? colors.ink3,
        },
        style,
      ]}
    >
      {children}
    </Text>
  )
}

// ─── Containerless action row ──────────────────────────────────────────────
// The `.solid` primary CTA: mono uppercase label on a top hairline rule, arrow
// glyph trailing. Used by PillButton's Diffuse path. Kept here so the arrow +
// hairline geometry lives in one place.

interface ActionRowProps {
  label: string
  onPress?: () => void
  disabled?: boolean
  color?: string
  arrow?: boolean
}

export function DiffuseArrow({ color, size = 18 }: { color: string; size?: number }) {
  // Simple → glyph; kept as text so no icon dependency and it inherits color.
  return (
    <Text style={{ fontFamily: diffuseFont.body, fontSize: size, color, marginTop: Platform.OS === 'ios' ? -1 : 0 }}>→</Text>
  )
}

export type { ActionRowProps }
