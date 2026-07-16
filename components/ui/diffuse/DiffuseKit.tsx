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
import Svg, { Defs, Filter, FeTurbulence, Rect, RadialGradient, Stop, Circle, Ellipse, ClipPath, G } from 'react-native-svg'
import { LinearGradient } from 'expo-linear-gradient'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
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

// ─── Floating-nav clearance ─────────────────────────────────────────────────
// The Diffuse tab bar is a FLOATING pill. React Navigation ALREADY reserves the
// full tab-bar height for the scene, so a scroll surface's bottom edge already
// sits at the top of the tab-bar wrap (pill + its paddings + safe area). That
// means a screen must NOT re-add the pill height or safe-area inset — doing so
// double-counts and leaves a huge gap (the bug this fixes: screens were guessing
// insets.bottom + 32 … + 120, all of which stacked on top of the already-
// reserved bar height).
//
// So the only value a Diffuse scroll surface needs is the small breathing gap
// between its last element and the pill's top edge. This is the single source of
// truth for that gap. "Snug" = a tight, standard floating-tab feel (~20pt).
export const DIFFUSE_NAV_CONTENT_GAP = 20 // "snug" — space between last content + pill top

/**
 * Bottom padding a scroll container should reserve so its last element clears
 * the floating nav pill by a consistent, standard gap.
 *
 * - Diffuse: just the snug content gap. The tab-bar height is already reserved
 *   by the navigator, so this is the ONLY padding needed — and it's identical on
 *   every screen (the whole point of centralizing it).
 * - Current variant: the strip nav has different geometry, so callers keep their
 *   prior per-screen behavior via the `currentPadding` arg.
 *
 * @param currentPadding value to use when NOT in Diffuse (defaults to a sane 40)
 */
export function useScrollBottomInset(currentPadding?: number): number {
  const insets = useSafeAreaInsets()
  const diffuse = useIsDiffuse()
  if (diffuse) return DIFFUSE_NAV_CONTENT_GAP
  return currentPadding ?? insets.bottom + 40
}

// ─── Grain overlay ─────────────────────────────────────────────────────────
// feTurbulence fractal-noise laid over a gradient field, matching --d-grain.
// NOTE: react-native-svg does NOT implement feTurbulence on native (iOS/Android)
// — the filter is dropped, so the grain renders nothing there AND logs a
// "filters not supported" warning on every mount. It only produces output on
// web. So on native this is a no-op (removing the warning without changing what
// the user sees); web still gets the real grain.
// Absolutely-positioned; place as the LAST child of a field so it sits on top.
// Pointer-events pass through.

interface GrainProps {
  opacity?: number
  radius?: number
}

export function DiffuseGrain({ opacity, radius = 0 }: GrainProps) {
  const { isDark } = useDiffuseTheme()
  const op = opacity ?? (isDark ? diffuseGrain.opacityDark : diffuseGrain.opacityLight)
  // feTurbulence is unsupported on native — skip the SVG entirely (it would
  // render nothing and spam the unsupported-filter warning).
  if (Platform.OS !== 'web') return null
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
// A smooth thermal-aura orb: warm cream/peach core → coral → pink/magenta band
// → gold → a teal/mint rim that darkens toward the edge, wrapped in a thin bright
// outline. No paper core, no text inside. It slowly breathes/rotates its aura so
// it reads as alive (no hard wave lines — the reference is a smooth gradient blob).

const AnimatedG = Animated.createAnimatedComponent(G)

let liveOrbSeq = 0
interface LiveOrbProps {
  /** Sphere diameter in px. */
  size: number
  /** Mode accent — biases the ambient halo hue only (the aura palette is fixed). */
  tint: string
  isDark?: boolean
  /** Aura drift speed multiplier — raise while thinking, lower when idle. */
  speed?: number
  style?: StyleProp<ViewStyle>
}

export function LiveOrb({ size, tint, isDark = false, speed = 1, style }: LiveOrbProps) {
  const seq = useMemo(() => liveOrbSeq++, [])
  const halo = `lo-h${seq}`
  const core = `lo-core${seq}`
  const pink = `lo-p${seq}`
  const gold = `lo-g${seq}`
  const teal = `lo-t${seq}`
  const clip = `lo-c${seq}`

  // Slow aura drift — two offset layers gently counter-rotate so the thermal
  // bands shift like a living lava-lamp blob. Rotation, not wave lines.
  const drift = useRef(new Animated.Value(0)).current
  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(drift, {
        toValue: 1,
        duration: 14000 / Math.max(0.4, speed),
        easing: Easing.inOut(Easing.sin),
        useNativeDriver: true,
      }),
    )
    loop.start()
    return () => loop.stop()
  }, [speed])

  const c = size / 2
  const r = size * 0.34 // sphere radius (halo feathers beyond)
  const cx = c
  const cy = c

  const spinA = drift.interpolate({ inputRange: [0, 1], outputRange: [0, 10] })
  const spinB = drift.interpolate({ inputRange: [0, 1], outputRange: [0, -8] })

  return (
    <View pointerEvents="none" style={[{ width: size, height: size }, style]}>
      <Svg width={size} height={size}>
        <Defs>
          {/* Ambient halo — soft mode-tinted glow feathering off the sphere */}
          <RadialGradient id={halo} cx="50%" cy="50%" r="50%">
            <Stop offset="0.6" stopColor={tint} stopOpacity={isDark ? 0.18 : 0.22} />
            <Stop offset="0.82" stopColor={tint} stopOpacity={isDark ? 0.08 : 0.1} />
            <Stop offset="1" stopColor={tint} stopOpacity={0} />
          </RadialGradient>
          {/* Core — soft cream/peach glow at the very centre only, so the pink
              and gold thermal bands stay visible around it. */}
          <RadialGradient id={core} cx="48%" cy="52%" r="40%">
            <Stop offset="0" stopColor="#FDEBCB" stopOpacity={0.95} />
            <Stop offset="0.6" stopColor="#FBD3A6" stopOpacity={0.6} />
            <Stop offset="1" stopColor="#FBD3A6" stopOpacity={0} />
          </RadialGradient>
          {/* Pink/coral band — bold hot-pink arc sweeping the upper-left, the
              dominant warm colour of the reference. */}
          <RadialGradient id={pink} cx="40%" cy="30%" r="62%">
            <Stop offset="0" stopColor="#FF4E7E" stopOpacity={0} />
            <Stop offset="0.42" stopColor="#FF4E7E" stopOpacity={0.95} />
            <Stop offset="0.7" stopColor="#FF6F97" stopOpacity={0.6} />
            <Stop offset="1" stopColor="#FF6F97" stopOpacity={0} />
          </RadialGradient>
          {/* Gold band — warm yellow ring between the pink and the teal rim */}
          <RadialGradient id={gold} cx="50%" cy="50%" r="50%">
            <Stop offset="0.52" stopColor="#FFC23C" stopOpacity={0} />
            <Stop offset="0.74" stopColor="#FFC23C" stopOpacity={0.92} />
            <Stop offset="0.9" stopColor="#FFD466" stopOpacity={0.55} />
            <Stop offset="1" stopColor="#FFD466" stopOpacity={0} />
          </RadialGradient>
          {/* Teal rim — mint/green outer ring darkening toward the edge, the
              signature of the reference. Wider band, peaks at the sphere edge. */}
          <RadialGradient id={teal} cx="50%" cy="50%" r="50%">
            <Stop offset="0.66" stopColor="#5CC2A8" stopOpacity={0} />
            <Stop offset="0.85" stopColor="#4FB89E" stopOpacity={0.9} />
            <Stop offset="1" stopColor="#1B6857" stopOpacity={1} />
          </RadialGradient>
          <ClipPath id={clip}>
            <Circle cx={cx} cy={cy} r={r} />
          </ClipPath>
        </Defs>

        {/* Ambient halo behind the sphere */}
        <Rect width={size} height={size} fill={`url(#${halo})`} />

        {/* Thin bright outline just outside the aura */}
        <Circle cx={cx} cy={cy} r={r + 0.5} fill="none" stroke="#FFFFFF" strokeWidth={size * 0.006} strokeOpacity={isDark ? 0.5 : 0.85} />

        {/* Aura layers, clipped to the sphere. Two counter-drifting groups keep
            the thermal bands alive without hard lines. */}
        <G clipPath={`url(#${clip})`}>
          <Circle cx={cx} cy={cy} r={r} fill="#F6D9B0" />
          <AnimatedG originX={cx} originY={cy} rotation={spinA}>
            <Circle cx={cx} cy={cy} r={r} fill={`url(#${pink})`} />
            <Circle cx={cx} cy={cy} r={r} fill={`url(#${gold})`} />
          </AnimatedG>
          <AnimatedG originX={cx} originY={cy} rotation={spinB}>
            <Circle cx={cx} cy={cy} r={r} fill={`url(#${teal})`} />
          </AnimatedG>
          <Circle cx={cx} cy={cy} r={r} fill={`url(#${core})`} />
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
