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

import { ReactNode, useEffect, useMemo, useRef } from 'react'
import { View, Text, StyleSheet, ViewStyle, StyleProp, TextStyle, TextProps, Platform, Animated, Easing } from 'react-native'
import Svg, { Defs, Filter, FeTurbulence, Rect, RadialGradient, LinearGradient as SvgLinearGradient, Stop, Circle, Ellipse, Path, ClipPath, G } from 'react-native-svg'
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
  /**
   * Overall radius of the gradient as a CSS length (default '60%'). Lower it
   * (e.g. '46%') for icon blooms so the glow hugs the glyph instead of washing
   * across the whole tile. Card/surface washes keep the default.
   */
  radius?: string
  style?: StyleProp<ViewStyle>
}

export function SoftBloom({ color, opacity = 0.5, cx = '50%', cy = '50%', spread = 0.6, radius = '60%', style }: SoftBloomProps) {
  const id = useMemo(() => `sb${bloomSeq++}`, [])
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFillObject, style]}>
      <Svg width="100%" height="100%">
        <Defs>
          <RadialGradient id={id} cx={cx} cy={cy} r={radius}>
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

// ─── IridescentBubble ────────────────────────────────────────────────────────
// A soap-bubble orb: pearlescent multi-hue interior (cyan → lilac → peach), a
// bright off-centre highlight, a saturated rim ring, and a warm kiss on the
// lower edge — all feathered to transparent via layered SVG radial gradients.
// A plain RN View can only ever be a hard disc; this is why it lives in SVG.
//
// The iridescence is intentionally near-fixed (it's what makes it read as a
// bubble). `tint` nudges the whole thing toward the active mode accent so the
// orb still belongs to its journey, without losing the pearl character.

let bubbleSeq = 0
interface IridescentBubbleProps {
  /** Overall diameter in px. */
  size: number
  /** Mode accent to bias the palette toward (rim + ambient halo). */
  tint: string
  isDark?: boolean
  style?: StyleProp<ViewStyle>
}

export function IridescentBubble({ size, tint, isDark = false, style }: IridescentBubbleProps) {
  const seq = useMemo(() => bubbleSeq++, [])
  const halo = `bh${seq}`
  const body = `bb${seq}`
  const hi = `bi${seq}`
  const rim = `br${seq}`
  const kiss = `bk${seq}`

  // Iridescent stops — pearl cyan/mint core, lilac shoulder, transparent edge.
  const cyan = '#BFEAF2'
  const mint = '#CDEFE0'
  const lilac = '#C9BEF0'
  const peach = '#F4C9D2'
  const c = size / 2

  // The bubble body fills most of the frame (r ≈ 0.46) so the sheen has room to
  // show around the ~0.24-radius paper core the caller lays on top. The rim is a
  // WIDE soft band (0.6 → 1.0), not a hard ring, so it feathers like real soap.
  const bodyR = size * 0.46

  return (
    <View pointerEvents="none" style={[{ width: size, height: size }, style]}>
      <Svg width={size} height={size}>
        <Defs>
          {/* Ambient halo — mode-tinted, very soft, fills the whole frame */}
          <RadialGradient id={halo} cx="50%" cy="52%" r="52%">
            <Stop offset="0" stopColor={tint} stopOpacity={isDark ? 0.14 : 0.18} />
            <Stop offset="0.6" stopColor={tint} stopOpacity={isDark ? 0.06 : 0.08} />
            <Stop offset="1" stopColor={tint} stopOpacity={0} />
          </RadialGradient>
          {/* Pearl body — cyan/mint dominant in the upper-left shoulder → lilac →
              transparent. Hotspot skewed up-left so the top of the ring reads
              distinctly cyan-mint (the iridescent tell), not uniform lilac. */}
          <RadialGradient id={body} cx="40%" cy="38%" r="56%">
            <Stop offset="0" stopColor={mint} stopOpacity={isDark ? 0.22 : 0.3} />
            <Stop offset="0.45" stopColor={cyan} stopOpacity={isDark ? 0.46 : 0.64} />
            <Stop offset="0.78" stopColor={lilac} stopOpacity={isDark ? 0.4 : 0.52} />
            <Stop offset="1" stopColor={lilac} stopOpacity={0} />
          </RadialGradient>
          {/* Bright sheen highlight — upper-left crescent, the wet-glass read */}
          <RadialGradient id={hi} cx="36%" cy="32%" r="34%">
            <Stop offset="0" stopColor="#FFFFFF" stopOpacity={isDark ? 0.42 : 0.6} />
            <Stop offset="0.65" stopColor="#FFFFFF" stopOpacity={isDark ? 0.1 : 0.16} />
            <Stop offset="1" stopColor="#FFFFFF" stopOpacity={0} />
          </RadialGradient>
          {/* Rim — wide soft band peaking near the edge (blue → violet), feathered */}
          <RadialGradient id={rim} cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor="#9FB6F0" stopOpacity={0} />
            <Stop offset="0.6" stopColor="#9FB6F0" stopOpacity={0} />
            <Stop offset="0.82" stopColor="#9FB6F0" stopOpacity={isDark ? 0.28 : 0.4} />
            <Stop offset="0.92" stopColor={lilac} stopOpacity={isDark ? 0.24 : 0.34} />
            <Stop offset="1" stopColor={lilac} stopOpacity={0} />
          </RadialGradient>
          {/* Warm kiss — wide peach bloom sweeping the lower-right edge, so the
              bottom of the ring shifts warm (cyan top ↔ peach bottom = iridescent) */}
          <RadialGradient id={kiss} cx="68%" cy="76%" r="52%">
            <Stop offset="0" stopColor={peach} stopOpacity={isDark ? 0.3 : 0.42} />
            <Stop offset="0.6" stopColor={peach} stopOpacity={isDark ? 0.12 : 0.18} />
            <Stop offset="1" stopColor={peach} stopOpacity={0} />
          </RadialGradient>
        </Defs>

        {/* Ambient halo across the whole frame */}
        <Rect width={size} height={size} fill={`url(#${halo})`} />
        {/* Sphere layers, all centred */}
        <Circle cx={c} cy={c} r={bodyR} fill={`url(#${body})`} />
        <Circle cx={c} cy={c} r={bodyR} fill={`url(#${kiss})`} />
        <Circle cx={c} cy={c} r={bodyR} fill={`url(#${rim})`} />
        <Ellipse cx={c * 0.82} cy={c * 0.76} rx={bodyR * 0.5} ry={bodyR * 0.4} fill={`url(#${hi})`} />
      </Svg>
    </View>
  )
}

// ─── LiveOrb ──────────────────────────────────────────────────────────────────
// A solid glossy iridescent sphere (no paper core, no text inside) with animated
// "electronic wave" streaks flowing across its surface so it reads as alive.
// Warm sheen top-left → magenta body → deep violet lower-right, mode-tinted.
// The waves are SVG paths translated horizontally under a circular clip.

const AnimatedG = Animated.createAnimatedComponent(G)

let liveOrbSeq = 0
interface LiveOrbProps {
  /** Sphere diameter in px. */
  size: number
  /** Mode accent — biases the body + halo hue. */
  tint: string
  isDark?: boolean
  /** Wave speed multiplier — raise while thinking, lower when idle. Default 1. */
  speed?: number
  style?: StyleProp<ViewStyle>
}

export function LiveOrb({ size, tint, isDark = false, speed = 1, style }: LiveOrbProps) {
  const seq = useMemo(() => liveOrbSeq++, [])
  const halo = `lo-h${seq}`
  const sphere = `lo-s${seq}`
  const sheen = `lo-sh${seq}`
  const deep = `lo-d${seq}`
  const clip = `lo-c${seq}`
  const wave1 = `lo-w1${seq}`
  const wave2 = `lo-w2${seq}`

  // Drift animation for the wave layers (0→1 loops). Two layers at different
  // phases give a living, non-repeating shimmer.
  const drift = useRef(new Animated.Value(0)).current
  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(drift, {
        toValue: 1,
        duration: 4200 / Math.max(0.4, speed),
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    )
    loop.start()
    return () => loop.stop()
  }, [speed])

  const c = size / 2
  const r = size * 0.34 // solid sphere radius (halo feathers beyond)
  const cx = c
  const cy = c

  // Wave band geometry — drawn wider than the sphere so translation never
  // reveals an edge; the clip keeps it on the sphere.
  const bandW = r * 2.6
  const w1x = drift.interpolate({ inputRange: [0, 1], outputRange: [0, r * 0.9] })
  const w2x = drift.interpolate({ inputRange: [0, 1], outputRange: [0, -r * 0.9] })

  // A gentle sine-ish streak path spanning the band, repeated as several close
  // parallel lines — delicate brushed-light curves, not bold rings.
  const streak = (yOff: number) => {
    const y = cy + yOff
    const a = r * 0.1 // amplitude — subtle
    return `M ${cx - bandW / 2} ${y} `
      + `C ${cx - bandW / 4} ${y - a}, ${cx - bandW / 8} ${y + a}, ${cx} ${y} `
      + `C ${cx + bandW / 8} ${y - a}, ${cx + bandW / 4} ${y + a}, ${cx + bandW / 2} ${y}`
  }

  return (
    <View pointerEvents="none" style={[{ width: size, height: size }, style]}>
      <Svg width={size} height={size}>
        <Defs>
          {/* Ambient halo — soft mode-tinted glow feathering off the sphere */}
          <RadialGradient id={halo} cx="50%" cy="50%" r="50%">
            <Stop offset="0.55" stopColor={tint} stopOpacity={isDark ? 0.22 : 0.28} />
            <Stop offset="0.8" stopColor={tint} stopOpacity={isDark ? 0.1 : 0.13} />
            <Stop offset="1" stopColor={tint} stopOpacity={0} />
          </RadialGradient>
          {/* Sphere body — magenta/pink core biased warm at top-left */}
          <RadialGradient id={sphere} cx="38%" cy="34%" r="72%">
            <Stop offset="0" stopColor="#FF7AB8" stopOpacity={1} />
            <Stop offset="0.42" stopColor={tint} stopOpacity={1} />
            <Stop offset="0.82" stopColor="#8A4FD8" stopOpacity={1} />
            <Stop offset="1" stopColor="#5B2F9E" stopOpacity={1} />
          </RadialGradient>
          {/* Warm sheen — orange/coral bright kiss upper-left (the light source) */}
          <RadialGradient id={sheen} cx="34%" cy="28%" r="42%">
            <Stop offset="0" stopColor="#FFD08A" stopOpacity={0.95} />
            <Stop offset="0.4" stopColor="#FF9A6B" stopOpacity={0.5} />
            <Stop offset="1" stopColor="#FF9A6B" stopOpacity={0} />
          </RadialGradient>
          {/* Deep shade — violet weight lower-right for the 3D roundness */}
          <RadialGradient id={deep} cx="72%" cy="78%" r="52%">
            <Stop offset="0" stopColor="#4A2088" stopOpacity={0.55} />
            <Stop offset="1" stopColor="#4A2088" stopOpacity={0} />
          </RadialGradient>
          {/* Wave stroke gradient — bright warm fading out at the band ends */}
          <SvgLinearGradient id={wave1} x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor="#FFFFFF" stopOpacity={0} />
            <Stop offset="0.5" stopColor="#FFE1C4" stopOpacity={isDark ? 0.5 : 0.62} />
            <Stop offset="1" stopColor="#FFFFFF" stopOpacity={0} />
          </SvgLinearGradient>
          <SvgLinearGradient id={wave2} x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor="#FFFFFF" stopOpacity={0} />
            <Stop offset="0.5" stopColor="#FFC7E6" stopOpacity={isDark ? 0.4 : 0.5} />
            <Stop offset="1" stopColor="#FFFFFF" stopOpacity={0} />
          </SvgLinearGradient>
          <ClipPath id={clip}>
            <Circle cx={cx} cy={cy} r={r} />
          </ClipPath>
        </Defs>

        {/* Ambient halo behind the sphere */}
        <Rect width={size} height={size} fill={`url(#${halo})`} />

        {/* Solid sphere + shading */}
        <Circle cx={cx} cy={cy} r={r} fill={`url(#${sphere})`} />
        <G clipPath={`url(#${clip})`}>
          <Circle cx={cx} cy={cy} r={r} fill={`url(#${deep})`} />

          {/* Animated electronic waves — fine parallel light-lines, two drifting
              layers at opposite phase for a living shimmer */}
          <AnimatedG translateX={w1x}>
            <Path d={streak(-r * 0.3)} stroke={`url(#${wave1})`} strokeWidth={size * 0.006} fill="none" strokeLinecap="round" />
            <Path d={streak(-r * 0.12)} stroke={`url(#${wave1})`} strokeWidth={size * 0.008} fill="none" strokeLinecap="round" />
            <Path d={streak(r * 0.06)} stroke={`url(#${wave1})`} strokeWidth={size * 0.007} fill="none" strokeLinecap="round" />
            <Path d={streak(r * 0.26)} stroke={`url(#${wave1})`} strokeWidth={size * 0.006} fill="none" strokeLinecap="round" />
          </AnimatedG>
          <AnimatedG translateX={w2x}>
            <Path d={streak(-r * 0.02)} stroke={`url(#${wave2})`} strokeWidth={size * 0.006} fill="none" strokeLinecap="round" />
            <Path d={streak(r * 0.16)} stroke={`url(#${wave2})`} strokeWidth={size * 0.007} fill="none" strokeLinecap="round" />
          </AnimatedG>

          {/* Warm sheen on top of the waves so the light source stays crisp */}
          <Circle cx={cx} cy={cy} r={r} fill={`url(#${sheen})`} />
        </G>
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
