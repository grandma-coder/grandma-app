/**
 * grandma.app — Design Token System
 *
 * Stack: React Native + Expo Router + TypeScript + NativeWind
 * State: Zustand v5. Data fetching: React Query. Backend: Supabase.
 *
 * RULE: Components NEVER hardcode hex values — always use semantic tokens.
 *
 * Design language (Apr 2026 redesign):
 *   Light default — cream paper canvas, editorial serif display, sticker accents
 *   Dark  — warm ink on dark parchment, same stickers
 */

import { useColorScheme } from 'react-native'
import { useThemeStore } from '../store/useThemeStore'

// ─── BRAND COLORS (never change between modes) ─────────────────────────────

export const brand = {
  primary: '#7048B8',
  primaryLight: '#9B70D4',
  primaryDark: '#4A2880',
  primaryTint: '#EFE6FF',

  secondary: '#3B7DD8',
  secondaryTint: '#E3EDFF',

  accent: '#F59E0B',
  accentTint: '#FEF5E1',

  success: '#4CAF50',
  warning: '#FF9800',
  error: '#F44336',

  // Journey mode colors — softer pastels (2026 redesign)
  prePregnancy: '#E58BB4',   // rose
  pregnancy: '#B7A6E8',      // lavender
  kids: '#8BB8E8',           // powder blue

  // Journey mode soft tints
  prePregnancySoft: '#F7CFDD',
  pregnancySoft: '#E0D5F3',
  kidsSoft: '#D4E3F3',

  // Cycle phase colors
  phase: {
    menstrual: '#E8557A',
    follicular: '#D4A017',
    ovulation: '#3DAA6E',
    luteal: '#7048B8',
  },

  // Trimester colors
  trimester: {
    first: '#F9D77E',
    second: '#81C995',
    third: '#FFAB76',
  },

  // Labor & birth phase colors — used by InsightsScreen birth-stages section.
  // Narrative: dawn → wave → spark → sky → blossom.
  laborPhases: {
    early: '#BDD48C',       // sticker green — dawn / latent
    active: '#C8B6E8',      // sticker lilac — wave / active
    transition: '#F5D652',  // sticker yellow — spark / transition
    birth: '#9DC3E8',       // sticker blue — sky / birth + golden hour
    postpartum: '#F2B2C7',  // sticker pink — blossom / recovery
  },
} as const

// ─── STICKER PALETTE (always available, used as accents) ────────────────────

export const stickers = {
  yellow: '#F5D652',
  yellowSoft: '#FBEA9E',
  yellowInk: '#7C5E0F',       // dark text/icon tint on cream
  blue: '#9DC3E8',
  blueSoft: '#CFE0F0',
  blueInk: '#1F4A7A',         // dark text/icon tint on cream
  pink: '#F2B2C7',
  pinkSoft: '#F9D8E2',
  pinkInk: '#8E3A56',         // dark text/icon tint on cream
  green: '#BDD48C',
  greenSoft: '#DDE7BB',
  greenInk: '#3F5919',        // dark text/icon tint on cream
  lilac: '#C8B6E8',
  lilacSoft: '#E3D8F2',
  lilacInk: '#3A2A6E',        // dark text/icon tint on cream
  peach: '#F5B896',
  peachSoft: '#F9D6C0',
  peachInk: '#8B4A26',        // dark text/icon tint on cream
  coral: '#EE7B6D',
  coralInk: '#B43E2E',        // dark text/icon tint on cream
  charcoal: '#2A2624',
} as const

// Dark mode sticker overrides (slightly brighter)
// `*Ink` in dark uses the regular sticker hue — icons need to brighten, not darken.
export const stickersDark = {
  yellow: '#F0CE4C',
  yellowSoft: '#3A3116',
  yellowInk: '#F0CE4C',
  blue: '#A5C8EC',
  blueSoft: '#1C2A3A',
  blueInk: '#A5C8EC',
  pink: '#F5BBCF',
  pinkSoft: '#36222A',
  pinkInk: '#F5BBCF',
  green: '#C5DA98',
  greenSoft: '#283016',
  greenInk: '#C5DA98',
  lilac: '#D0BFEC',
  lilacSoft: '#2A2340',
  lilacInk: '#D0BFEC',
  peach: '#F7C09D',
  peachSoft: '#3A2618',
  peachInk: '#F7C09D',
  coral: '#F29082',
  coralInk: '#F29082',
  charcoal: '#F5EDDC',
} as const

// ─── CHART SERIES — canonical ordered palette for data viz ─────────────────
// Use in order for series 1, 2, 3, … in any chart. Colors are picked from the
// sticker palette for visual coherence with the rest of the system.

export const chartSeries = [
  stickers.lilac,   // #C8B6E8  primary series — matches pregnancy brand
  stickers.peach,   // #F5B896  secondary
  stickers.green,   // #BDD48C  tertiary
  stickers.blue,    // #9DC3E8  quaternary
  stickers.yellow,  // #F5D652  quinary
  stickers.coral,   // #EE7B6D  sixth — also the destructive accent, use last
] as const

// ─── LIGHT MODE TOKENS — cream paper canvas ─────────────────────────────────

export const lightTokens = {
  // Canvas
  bg: '#F3ECD9',             // cream
  bgWarm: '#EFE5CC',         // slightly deeper cream
  surface: '#FFFEF8',        // card paper white
  surfaceRaised: '#F7F0DF',  // nested cards
  surfaceGlass: 'rgba(20,19,19,0.04)',

  // Borders
  border: 'rgba(20,19,19,0.08)',
  borderLight: 'rgba(20,19,19,0.05)',
  borderStrong: 'rgba(20,19,19,0.14)',

  // Text — near-black ink on cream
  text: '#141313',
  textSecondary: '#3A3533',
  textMuted: '#6E6763',
  textFaint: '#A69E93',
  textInverse: '#F5EDDC',

  // Interactive
  primary: '#7048B8',
  primaryLight: '#9B70D4',
  primaryTint: '#EFE6FF',

  secondary: '#3B7DD8',
  secondaryTint: '#E3EDFF',

  accent: brand.pregnancy,   // mode-driven — lavender default
  accentSoft: brand.pregnancySoft,

  success: '#2E7D32',
  successTint: '#E8F5E9',
  warning: '#E65100',
  error: '#C62828',

  // Tab bar
  tabBg: 'rgba(20,19,19,0.96)',
  tabBorder: 'rgba(20,19,19,0.06)',
  tabActive: brand.pregnancy,
  tabInactive: 'rgba(245,237,220,0.55)',
} as const

// ─── DARK MODE TOKENS — warm ink on parchment ──────────────────────────────

export const darkTokens = {
  // Canvas
  bg: '#1A1713',             // warm dark
  bgWarm: '#13110E',         // deeper warm dark
  surface: '#232019',        // card parchment
  surfaceRaised: '#2C2820',  // elevated cards
  surfaceGlass: 'rgba(245,237,220,0.06)',

  // Borders — bumped for dark-mode sticker-on-paper definition.
  // The light theme draws hard ink borders; in dark we use a brighter cream
  // hairline so cards/pills/chips read as paper rather than fading out.
  border: 'rgba(245,237,220,0.18)',
  borderLight: 'rgba(245,237,220,0.10)',
  borderStrong: 'rgba(245,237,220,0.30)',

  // Text — cream on dark
  text: '#F5EDDC',
  textSecondary: '#D6CCB5',
  textMuted: '#9E9684',
  textFaint: '#6E6757',
  textInverse: '#141313',

  // Interactive
  primary: '#C4B5EF',        // lavender brightened for dark
  primaryLight: '#D8CCFA',
  primaryTint: 'rgba(196,181,239,0.15)',

  secondary: '#A5C9F0',
  secondaryTint: 'rgba(165,201,240,0.15)',

  accent: '#C4B5EF',
  accentSoft: '#2D2842',

  success: '#6EC96E',
  successTint: 'rgba(110,201,110,0.15)',
  warning: '#FFB347',
  error: '#FF7070',

  // Tab bar
  tabBg: 'rgba(26,23,19,0.96)',
  tabBorder: 'rgba(245,237,220,0.06)',
  tabActive: '#C4B5EF',
  tabInactive: 'rgba(245,237,220,0.45)',
} as const

// ─── COLOR TOKEN TYPE ──────────────────────────────────────────────────────

export type ColorTokens = { [K in keyof typeof lightTokens]: string }

// ─── STATIC TOKENS (same in both modes) ────────────────────────────────────

export const radius = {
  sm: 12,
  md: 20,
  lg: 28,
  xl: 36,
  xxl: 48,
  full: 999,
  // Legacy aliases
  '2xl': 48,
} as const

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  // Legacy aliases
  '2xl': 24,
  '3xl': 32,
  '4xl': 40,
  '5xl': 48,
  '6xl': 64,
} as const

export const fontSize = {
  xs: 11,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 22,
  xxl: 28,
  display: 36,
  hero: 48,
} as const

export const fontWeight = {
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
  black: '900' as const,
}

// 2026 redesign fonts
export const font = {
  display: 'Fraunces_600SemiBold',         // serif editorial display
  displayBold: 'Fraunces_700Bold',         // heavier display weight (hero numbers, big titles)
  displayExtraBold: 'Fraunces_800ExtraBold', // heaviest display weight (jumbo hero numbers) — loaded in app/_layout.tsx
  italic: 'InstrumentSerif_400Regular_Italic', // italic accent
  body: 'DMSans_400Regular',               // UI body
  bodyMedium: 'DMSans_500Medium',          // medium weight UI
  bodySemiBold: 'DMSans_600SemiBold',      // semibold UI labels
  bodyBold: 'DMSans_700Bold',              // bold UI labels (chip text, emphasised pills)
} as const

// ─── MOTION ────────────────────────────────────────────────────────────────
// Shared animation tokens so motion feels cohesive across the app instead of
// every component inventing its own spring. Spring shapes are reanimated
// `withSpring` configs.
//
//   press      — the "sticker pushes down" feel on a tap (buttons, day cells)
//   entrance   — modal / toast / card pop-in
//   pressTranslateY / restShadowY / pressShadowY — the displacement the press
//                animation drives (button moves down, hard shadow collapses)
export const motion = {
  press: { damping: 18, stiffness: 320, mass: 0.5 },
  entrance: { damping: 14, stiffness: 140, mass: 0.8 },
  pressTranslateY: 2,
  restShadowY: 3,
  pressShadowY: 1,
  breatheDuration: 4000,
} as const

// ─── useTheme() HOOK ───────────────────────────────────────────────────────

export function useTheme() {
  const systemScheme = useColorScheme()
  const storeTheme = useThemeStore((s) => s.theme)
  const hydrated = useThemeStore((s) => s.hydrated)

  const isDark = hydrated ? storeTheme === 'dark' : systemScheme === 'dark'
  const colors: ColorTokens = isDark ? darkTokens : lightTokens
  const st = isDark ? stickersDark : stickers

  return {
    colors,
    brand,
    stickers: st,
    radius,
    spacing,
    fontSize,
    fontWeight,
    font,
    isDark,
  }
}

// ─── MODE COLOR HELPERS ────────────────────────────────────────────────────

export function getModeColor(mode: 'pre' | 'preg' | 'kids' | 'care' | string, isDark = false): string {
  if (mode === 'pre' || mode === 'pre-pregnancy') return isDark ? '#EFA2C2' : brand.prePregnancy
  if (mode === 'preg' || mode === 'pregnancy') return isDark ? '#C4B5EF' : brand.pregnancy
  if (mode === 'kids') return isDark ? '#A5C9F0' : brand.kids
  // Caregiver — scaffold. Uses the Diffuse care accent so a caller passing
  // 'care' gets a sensible color instead of the pregnancy fallback. No screens
  // pass 'care' yet; existing callers are unaffected.
  if (mode === 'care' || mode === 'caregiver') return isDark ? '#6FAEBE' : '#4A8496'
  return isDark ? '#C4B5EF' : brand.pregnancy
}

export function getModeColorSoft(mode: 'pre' | 'preg' | 'kids' | 'care' | string, isDark = false): string {
  if (mode === 'pre' || mode === 'pre-pregnancy') return isDark ? '#3A2730' : brand.prePregnancySoft
  if (mode === 'preg' || mode === 'pregnancy') return isDark ? '#2D2842' : brand.pregnancySoft
  if (mode === 'kids') return isDark ? '#1F2A3A' : brand.kidsSoft
  if (mode === 'care' || mode === 'caregiver') return isDark ? '#18302F' : '#D2EAEE'
  return isDark ? '#2D2842' : brand.pregnancySoft
}

// ─── LEGACY EXPORTS ────────────────────────────────────────────────────────
// Kept for existing components. Prefer useTheme() for new code.

export const colors = {
  background: darkTokens.bg,
  surface: darkTokens.surface,
  surfaceLight: darkTokens.surfaceRaised,
  surfaceGlass: darkTokens.surfaceGlass,
  accent: darkTokens.primary,
  accentGlow: darkTokens.primary,
  accentMuted: darkTokens.primaryTint,
  accentDark: brand.primaryDark,
  text: darkTokens.text,
  textSecondary: darkTokens.textSecondary,
  textTertiary: darkTokens.textMuted,
  textOnAccent: darkTokens.textInverse,
  border: darkTokens.border,
  borderLight: darkTokens.borderLight,
  borderAccent: darkTokens.borderStrong,
  success: darkTokens.success,
  error: darkTokens.error,
  warning: darkTokens.warning,
  info: darkTokens.secondary,
  pillar: {
    milk: brand.kids,
    food: stickers.green,
    nutrition: brand.accent,
    vaccines: brand.prePregnancy,
    clothes: stickers.coral,
    recipes: darkTokens.surface,
    habits: stickers.green,
    milestones: brand.pregnancy,
    medicine: brand.prePregnancy,
  },
  role: {
    parent: 'rgba(189, 212, 140, 0.15)',  // stickers.green @ 15%
    nanny: 'rgba(200, 182, 232, 0.15)',   // stickers.lilac @ 15%
    family: 'rgba(238, 123, 109, 0.15)',  // stickers.coral @ 15%
  },
  tabBar: darkTokens.tabBg,
  tabBarInactive: darkTokens.tabInactive,
} as const

export type AppColors = {
  [K in keyof typeof colors]: (typeof colors)[K] extends Record<string, string>
    ? Record<string, string>
    : string
}

export function getColors(theme: 'dark' | 'light'): AppColors {
  return colors as unknown as AppColors
}

export const gradients = {
  background: [darkTokens.bg, '#13110E', '#0D0B08'] as const,
  card: [darkTokens.surface, darkTokens.bg] as const,
  cardHover: [darkTokens.surfaceRaised, darkTokens.surface] as const,
  accent: [brand.primary, brand.primaryDark] as const,
  accentSoft: ['rgba(112,72,184,0.15)', 'rgba(59,125,216,0.08)'] as const,
  glass: ['rgba(245, 237, 220, 0.06)', 'rgba(245, 237, 220, 0.02)'] as const,
  pregnancy: [darkTokens.bg, '#1A1520'] as const,
  insight: [darkTokens.secondary, brand.prePregnancy, brand.pregnancy] as const,
} as const

export const lightGradients = {
  background: [lightTokens.bg, '#EFE5CC', '#E8DFC2'] as const,
  card: [lightTokens.surface, lightTokens.surfaceRaised] as const,
  cardHover: [lightTokens.surfaceRaised, '#ECE2C8'] as const,
  accent: [brand.primary, brand.primaryDark] as const,
  accentSoft: ['rgba(183,166,232,0.15)', 'rgba(139,184,232,0.08)'] as const,
  glass: ['rgba(20,19,19,0.04)', 'rgba(20,19,19,0.02)'] as const,
  pregnancy: [lightTokens.bg, '#F0E8FF'] as const,
  insight: [brand.secondary, brand.prePregnancy, brand.pregnancy] as const,
} as const

export function getGradients(theme: 'dark' | 'light') {
  return theme === 'light' ? lightGradients : gradients
}

// Legacy aliases
export const borderRadius = radius
export const typography = {
  hero: { fontSize: fontSize.hero, fontFamily: font.display, color: colors.text, letterSpacing: -1 },
  heading: { fontSize: fontSize.display, fontFamily: font.display, color: colors.text, letterSpacing: -0.8 },
  title: { fontSize: fontSize.xl, fontFamily: font.display, color: colors.text, letterSpacing: -0.3 },
  subtitle: { fontSize: fontSize.lg, fontFamily: font.bodySemiBold, color: colors.text },
  body: { fontSize: fontSize.md, fontFamily: font.body, color: colors.text, lineHeight: 24 },
  bodySecondary: { fontSize: fontSize.md, fontFamily: font.body, color: colors.textSecondary, lineHeight: 24 },
  caption: { fontSize: fontSize.xs, fontFamily: font.bodySemiBold, color: colors.textTertiary, letterSpacing: 2, textTransform: 'uppercase' as const },
  label: { fontSize: 10 as number, fontFamily: font.bodySemiBold, color: colors.textTertiary, letterSpacing: 3, textTransform: 'uppercase' as const },
} as const

export const shadows = {
  card: { shadowColor: '#141313', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 0, elevation: 2,
          // second shadow via iOS only
  },
  cardPop: { shadowColor: '#141313', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.12, shadowRadius: 24, elevation: 10 },
  pop: { shadowColor: '#141313', shadowOffset: { width: 0, height: 18 }, shadowOpacity: 0.22, shadowRadius: 36, elevation: 14 },
  // Legacy glow shadows
  glow: { shadowColor: brand.primary, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.5, shadowRadius: 25, elevation: 12 },
  glowPink: { shadowColor: brand.prePregnancy, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.3, shadowRadius: 20, elevation: 10 },
  glowBlue: { shadowColor: brand.kids, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.3, shadowRadius: 20, elevation: 10 },
  subtle: { shadowColor: '#141313', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 8, elevation: 6 },
} as const

export const fonts = font
export const inputStyles = {
  selectionColor: brand.secondary,
  placeholderTextColor: lightTokens.textMuted,
  field: {
    backgroundColor: lightTokens.surface,
    borderWidth: 1,
    borderColor: lightTokens.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    height: 64,
    fontSize: fontSize.md,
    fontFamily: font.bodyMedium,
    color: lightTokens.text,
  },
} as const

// ═══════════════════════════════════════════════════════════════════════════
//  DIFFUSE (design-system-v3) — ADDITIVE
// ═══════════════════════════════════════════════════════════════════════════
//
//  v3 "Diffuse" is a SECOND, opt-in visual language that lives ALONGSIDE the
//  current cream-paper / sticker-collage system. Nothing above this line is
//  mutated. Consumers select it via `useThemeStore().variant === 'diffuse'`.
//
//  Direction (see docs/design/design-system-v3.html + HANDOFF.md):
//    - ONE delicate, sophisticated type language for every behavior.
//    - Behaviors differ ONLY by color + shape + blur — soft, grainy,
//      generative gradient FIELDS (g1..g4) with a single per-mode accent.
//    - Serif = titles + feeling words · Sans = reading · Mono = the data voice
//      (labels, chips, numbers, units, timestamps) · Serif = the one hero number.
//    - Stickers/icons stay ACTIVE — they remain the icon system under Diffuse.
//
//  Source of truth for the raw values: src/tokens-v3.css in the handoff bundle.
// ═══════════════════════════════════════════════════════════════════════════

// ─── DIFFUSE FONTS ─────────────────────────────────────────────────────────
// Three new families, loaded in app/_layout.tsx alongside the existing ones.
// Space Mono was already loaded (affirmation templates) — reused here as the
// Diffuse "data" voice. The current families (Fraunces/DM Sans/Instrument
// Serif) are NOT removed — stickers/icons + the legacy theme still use them.

export const diffuseFont = {
  // Cormorant Garamond — delicate serif. Per v4 the base weight for titles /
  // section-headers is Regular (400); only big hero display numbers drop to
  // Light (300) via `displayLight`.
  display: 'CormorantGaramond_400Regular',
  displayLight: 'CormorantGaramond_300Light', // huge hero numbers only
  displayRegular: 'CormorantGaramond_400Regular',
  displayMedium: 'CormorantGaramond_500Medium',
  italic: 'CormorantGaramond_400Regular_Italic', // accent / feeling words
  // Hanken Grotesk — reading sans.
  body: 'HankenGrotesk_400Regular',
  bodyLight: 'HankenGrotesk_300Light',
  bodyMedium: 'HankenGrotesk_500Medium',
  bodySemiBold: 'HankenGrotesk_600SemiBold',
  bodyBold: 'HankenGrotesk_700Bold',
  // Space Mono — the dominant DATA voice (already loaded).
  mono: 'SpaceMono_400Regular',
  monoBold: 'SpaceMono_700Bold',
} as const

// TYPE ROLES — assign by MEANING, never by size (the one clear v3 rule).
//   title    → serif  (screen/section titles + feeling words)
//   read     → sans   (body copy + selectable row labels)
//   data     → mono   (every pill, chip, eyebrow, label, number, unit, date)
//   numHero  → serif  (the single large focal number of a data tile)
export const diffuseTypeRole = {
  title: diffuseFont.display,
  read: diffuseFont.body,
  data: diffuseFont.mono,
  numHero: diffuseFont.display,
} as const

// ─── DIFFUSE NEUTRALS (paper + ink) — resolved per theme ───────────────────

export const diffuseLightTokens = {
  // Canvas — warm off-white paper
  bg: '#F4F1E8',            // --d-paper
  bgDeep: '#EDE9DD',        // --bg-deep
  surface: '#FBFAF5',       // --d-paper-2 (raised card)
  surfaceRaised: '#F7F4EC', // --paper-2 (nested)

  // Ink ramp (near-black warm → faint)
  ink: '#1A1916',           // --d-ink
  ink2: '#4A463E',          // --d-ink-2
  ink3: '#807A6E',          // --d-ink-3
  ink4: '#B3AC9C',          // --d-ink-4

  // Lines — the sophisticated hairline system
  line: 'rgba(26,25,22,0.12)',     // --d-line
  line2: 'rgba(26,25,22,0.20)',    // --d-line-2
  hairline: 'rgba(26,25,22,0.55)', // --d-hairline — signature strong rule

  // ── carried forward — v3 leaves these undefined ──
  // Semantic status (reused from the current system so Diffuse screens can
  // still show success/warning/error without inventing values).
  success: '#2E7D32',
  successTint: '#E8F5E9',
  warning: '#E65100',
  error: '#C62828',
  // Tab / nav (revisited when the Diffuse nav lands; kept for continuity).
  tabBg: 'rgba(26,25,22,0.96)',
  tabBorder: 'rgba(26,25,22,0.06)',
  tabInactive: 'rgba(244,241,232,0.55)',
} as const

export const diffuseDarkTokens = {
  bg: '#16140F',
  bgDeep: '#100E0A',
  surface: '#211E18',
  surfaceRaised: '#2A261F',

  ink: '#F4F1E8',
  ink2: '#D8D2C4',
  ink3: '#A39C8C',
  ink4: '#6E685C',

  line: 'rgba(244,241,232,0.12)',
  line2: 'rgba(244,241,232,0.22)',
  hairline: 'rgba(244,241,232,0.55)',

  success: '#6EC96E',
  successTint: 'rgba(110,201,110,0.15)',
  warning: '#FFB347',
  error: '#FF7070',
  tabBg: 'rgba(22,20,15,0.96)',
  tabBorder: 'rgba(244,241,232,0.06)',
  tabInactive: 'rgba(244,241,232,0.45)',
} as const

export type DiffuseColorTokens = { [K in keyof typeof diffuseLightTokens]: string }

// ─── DIFFUSE SHAPES + BLUR + SHADOWS + GRAIN ───────────────────────────────

export const diffuseRadius = {
  sm: 14,   // --d-r-sm
  md: 20,   // --d-r-md
  lg: 28,   // --d-r-lg
  xl: 40,   // --d-r-xl
} as const

// Blur radii — a token category the current system doesn't have. Central to
// the Diffuse "soft grainy gradient field" look.
export const diffuseBlur = {
  soft: 40,   // --d-blur-soft   (surfaces/blooms)
  field: 70,  // --d-blur-field  (generative-field blob blur)
  glass: 18,  // --d-blur-glass  (glass sprays)
} as const

export const diffuseShadows = {
  // Two tiers only (v3 defines --sh-card and --sh-pop). Re-derived for RN:
  // RN can't express negative spread, so the second layer is approximated
  // with a larger radius + tuned opacity.
  card: { shadowColor: '#1A1916', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.10, shadowRadius: 18, elevation: 3 },
  pop: { shadowColor: '#1A1916', shadowOffset: { width: 0, height: 18 }, shadowOpacity: 0.22, shadowRadius: 34, elevation: 10 },
} as const

// Grain overlay — feTurbulence noise laid over gradient fields. The SVG data
// URI is consumed by a native grain layer (react-native-svg / expo-image);
// components import the opacity + frequency, not the raw CSS filter.
export const diffuseGrain = {
  // Same feTurbulence params as --d-grain (fractalNoise, baseFrequency 0.9,
  // 2 octaves). Rendered by a <DiffuseGrain> layer in the component phase.
  baseFrequency: 0.9,
  numOctaves: 2,
  opacityLight: 0.22, // --d-grain-opacity
  opacityDark: 0.16,
  // Inline SVG data URI, ready for an <Image source={{ uri }}> grain tile.
  uri:
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E",
} as const

// ─── DIFFUSE BEHAVIOR FIELDS ───────────────────────────────────────────────
// The ONLY thing that changes per behavior: a 4-stop generative gradient
// field (g1..g4) + one accent (+ soft) pulled from the field for CTA/ink
// moments. Type + icons stay identical across behaviors.
//
//   'pre'  — Cycle (pre-pregnancy)
//   'preg' — Pregnancy
//   'kids' — Raising
//   'care' — Caregiver  (SCAFFOLD ONLY — no screens/tabs/store wiring yet)

export interface DiffuseField {
  g1: string
  g2: string
  g3: string
  g4: string
  accent: string
  accentSoft: string
}

export const diffuseFields: Record<'pre' | 'preg' | 'kids' | 'care', DiffuseField> = {
  // CYCLE — coral → rose → lilac → peach
  pre: { g1: '#F0A99A', g2: '#F0B8C8', g3: '#C9B7E6', g4: '#F7DCC0', accent: '#C25872', accentSoft: '#F6DCE4' },
  // PREGNANCY — peach → blush → plum → gold
  preg: { g1: '#F8C9A6', g2: '#F2AEC6', g3: '#BDA4E2', g4: '#F8E1B2', accent: '#8F5FC6', accentSoft: '#E7D8F5' },
  // RAISING — yellow → green → blue → orange
  kids: { g1: '#F4D888', g2: '#A2D8B4', g3: '#A6BCE6', g4: '#F4B396', accent: '#4C79CE', accentSoft: '#CBDCF7' },
  // CAREGIVER — teal → blue → mint → sky  (scaffold)
  care: { g1: '#A6D6DC', g2: '#B0C0E4', g3: '#C6E7D9', g4: '#D4E1F0', accent: '#4A8496', accentSoft: '#D2EAEE' },
} as const

// ─── DIFFUSE MODE HELPERS ──────────────────────────────────────────────────
// Maps the app's JourneyMode keys ('pre-pregnancy' | 'pregnancy' | 'kids')
// and the short v3 keys ('pre'|'preg'|'kids'|'care') onto a field.

function resolveFieldKey(mode: string): 'pre' | 'preg' | 'kids' | 'care' {
  if (mode === 'pre' || mode === 'pre-pregnancy') return 'pre'
  if (mode === 'preg' || mode === 'pregnancy') return 'preg'
  if (mode === 'kids') return 'kids'
  if (mode === 'care' || mode === 'caregiver') return 'care'
  return 'preg'
}

/** The 4 generative-field stops [g1,g2,g3,g4] for a behavior. */
export function getModeField(mode: string, _isDark = false): [string, string, string, string] {
  const f = diffuseFields[resolveFieldKey(mode)]
  return [f.g1, f.g2, f.g3, f.g4]
}

/** The single per-mode accent under Diffuse (CTA/ink moments). */
export function getDiffuseAccent(mode: string, _isDark = false): string {
  return diffuseFields[resolveFieldKey(mode)].accent
}

/** The per-mode soft accent (tinted backgrounds) under Diffuse. */
export function getDiffuseAccentSoft(mode: string, _isDark = false): string {
  return diffuseFields[resolveFieldKey(mode)].accentSoft
}

// ─── useDiffuseTheme() HOOK ────────────────────────────────────────────────
// Parallel to useTheme(), returns the resolved Diffuse token set. Screens that
// opt into Diffuse read from here. Existing screens keep using useTheme().

export function useDiffuseTheme() {
  const systemScheme = useColorScheme()
  const storeTheme = useThemeStore((s) => s.theme)
  const hydrated = useThemeStore((s) => s.hydrated)

  const isDark = hydrated ? storeTheme === 'dark' : systemScheme === 'dark'
  const colors: DiffuseColorTokens = isDark ? diffuseDarkTokens : diffuseLightTokens

  return {
    colors,
    fields: diffuseFields,
    font: diffuseFont,
    typeRole: diffuseTypeRole,
    radius: diffuseRadius,
    blur: diffuseBlur,
    shadows: diffuseShadows,
    grain: diffuseGrain,
    spacing,            // shared — v3 defines no spacing scale of its own
    stickers: isDark ? stickersDark : stickers, // icons stay active under Diffuse
    isDark,
  }
}
