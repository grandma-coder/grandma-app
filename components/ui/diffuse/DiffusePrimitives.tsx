/**
 * DiffusePrimitives — reusable Diffuse (v3) building blocks shared across
 * screens. Extracted while migrating the Kids surface; shaped to be reused by
 * Pregnancy and Pre later.
 *
 * All are token-driven (useDiffuseTheme / getModeField) and render Diffuse
 * behavior: soft gradient-field or paper surfaces + grain, hairline geometry,
 * role-driven type (serif title / sans read / mono data), containerless
 * actions. Sticker icons pass straight through as `icon` — they stay the
 * icon system.
 *
 * These are DIFFUSE-ONLY components — callers render them inside a
 * `useIsDiffuse()` branch. They do not gate themselves.
 */

import { ReactNode, useState, useMemo } from 'react'
import { View, Text, Pressable, Modal, ScrollView, StyleSheet, ViewStyle, StyleProp, KeyboardAvoidingView, Platform } from 'react-native'
import Svg, { Circle, Path } from 'react-native-svg'
import { LinearGradient } from 'expo-linear-gradient'
import { X, ChevronLeft, ChevronRight } from 'lucide-react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useDiffuseTheme, getModeField, getDiffuseAccent, diffuseFont } from '../../../constants/theme'
import { useModeStore } from '../../../store/useModeStore'
import { DiffuseGrain, DiffuseArrow, SoftBloom } from './DiffuseKit'

// ─── Shared role-type styles ────────────────────────────────────────────────

const roleType = StyleSheet.create({
  eyebrow: {
    fontFamily: diffuseFont.mono,
    fontSize: 10,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  data: {
    fontFamily: diffuseFont.mono,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  serif: {
    fontFamily: diffuseFont.display,
    letterSpacing: -0.5,
  },
  read: {
    fontFamily: diffuseFont.body,
  },
})

// ─── DiffuseSectionHeader ───────────────────────────────────────────────────
// Eyebrow (mono caps) over a serif title, optional leading sticker + right
// action. Replaces the app's ad-hoc "sticker + Fraunces heading" rows.

interface SectionHeaderProps {
  title: string
  eyebrow?: string
  icon?: ReactNode
  right?: ReactNode
  style?: StyleProp<ViewStyle>
}

export function DiffuseSectionHeader({ title, eyebrow, icon, right, style }: SectionHeaderProps) {
  const { colors } = useDiffuseTheme()
  return (
    <View style={[dp.sectionHeader, style]}>
      {icon ? <View style={dp.sectionIcon}>{icon}</View> : null}
      <View style={{ flex: 1 }}>
        {eyebrow ? <Text style={[roleType.eyebrow, { color: colors.ink3, marginBottom: 3 }]}>{eyebrow}</Text> : null}
        <Text style={[roleType.serif, { fontSize: 24, color: colors.ink }]}>{title}</Text>
      </View>
      {right ? <View>{right}</View> : null}
    </View>
  )
}

// ─── DiffuseSegmentPill ─────────────────────────────────────────────────────
// The Today / 7 Days / 30 Days row. Hairline mono pills; active = --d-hairline
// border + ink + mono-bold. No filled sticker pill.

interface SegmentPillProps<T extends string> {
  options: { key: T; label: string }[]
  value: T
  onChange: (key: T) => void
  style?: StyleProp<ViewStyle>
}

export function DiffuseSegmentPill<T extends string>({ options, value, onChange, style }: SegmentPillProps<T>) {
  const { colors } = useDiffuseTheme()
  return (
    <View style={[dp.segRow, style]}>
      {options.map((o) => {
        const on = o.key === value
        return (
          <Pressable
            key={o.key}
            onPress={() => onChange(o.key)}
            style={({ pressed }) => [
              dp.segPill,
              {
                borderColor: on ? colors.hairline : colors.line,
                backgroundColor: on ? colors.surface : 'transparent',
                opacity: pressed ? 0.7 : 1,
              },
            ]}
          >
            <Text
              style={[
                roleType.data,
                { fontSize: 11, color: on ? colors.ink : colors.ink3, fontFamily: on ? diffuseFont.monoBold : diffuseFont.mono },
              ]}
            >
              {o.label}
            </Text>
          </Pressable>
        )
      })}
    </View>
  )
}

// ─── DiffuseStatCard ────────────────────────────────────────────────────────
// The hero metric card (LAST SLEEP / MOOD / CALORIES / …). Soft field-tinted
// or paper surface + grain, mono label, serif hero number + unit, sub line,
// optional progress bar and/or trailing node (ring, sticker). Sticker `icon`
// sits in a hairline circle. Containerless — the whole card is the Pressable.

interface StatCardProps {
  label: string
  value?: string           // the hero number (serif). Omit → shows `emptyLabel`.
  unit?: string            // small serif unit after the value
  sub?: string             // sub line under the value (mono/read)
  icon?: ReactNode         // sticker, in a hairline circle (left)
  trailing?: ReactNode     // e.g. a ring — replaces the icon slot on the right
  emptyLabel?: string      // shown in place of value when value is empty
  progress?: number        // 0..1 → renders a hairline progress bar
  accent?: string          // the metric's hue — drives a soft per-card bloom
  accent2?: string         // optional second bloom stop (defaults to a warm wash)
  tint?: string            // legacy alias for `accent`
  onPress?: () => void
  flex?: number
  style?: StyleProp<ViewStyle>
}

export function DiffuseStatCard({
  label,
  value,
  unit,
  sub,
  icon,
  trailing,
  emptyLabel = 'Tap to log',
  progress,
  accent,
  accent2,
  tint,
  onPress,
  flex,
  style,
}: StatCardProps) {
  const { colors, isDark } = useDiffuseTheme()
  const mode = useModeStore((s) => s.mode)
  const [g1, g2, g3] = getModeField(mode, isDark)
  // Soft per-metric bloom: the metric's hue → a warm neighbour, low-sat, grainy.
  // Reads as soft color (per the v3 reference), not a grey wash.
  const c1 = accent ?? tint ?? g1
  const c2 = accent2 ?? g2 ?? g3
  const hasValue = value !== undefined && value !== '' && value !== '—'

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        dp.statCard,
        { backgroundColor: colors.surface, opacity: pressed ? 0.92 : 1 },
        flex !== undefined ? { flex } : null,
        style,
      ]}
    >
      {/* soft feathered corner bloom (herotile spec: radial wash top-right) */}
      <SoftBloom color={c1} cx="82%" cy="12%" opacity={isDark ? 0.34 : 0.5} spread={0.55} />
      <SoftBloom color={c2} cx="62%" cy="40%" opacity={isDark ? 0.22 : 0.32} spread={0.5} />
      <DiffuseGrain radius={dp.statCard.borderRadius} opacity={0.05} />

      <View style={dp.statHeaderRow}>
        <Text style={[roleType.eyebrow, { color: colors.ink3 }]} numberOfLines={1}>{label}</Text>
        {icon ? <DiffuseBloomIcon color={c1} size={30} intensity={0.45}>{icon}</DiffuseBloomIcon> : null}
      </View>

      <View style={dp.statBodyRow}>
        {trailing ? <View style={{ marginRight: 12 }}>{trailing}</View> : null}
        <View style={{ flex: 1 }}>
          {hasValue ? (
            <Text style={[roleType.serif, { fontSize: 30, color: colors.ink }]}>
              {value}
              {unit ? <Text style={[roleType.serif, { fontSize: 17, color: colors.ink2 }]}>{' ' + unit}</Text> : null}
            </Text>
          ) : (
            <Text style={[roleType.serif, { fontSize: 24, color: colors.ink3, fontStyle: 'italic', fontFamily: diffuseFont.italic }]}>
              {emptyLabel}
            </Text>
          )}
          {sub ? <Text style={[roleType.data, { fontSize: 9.5, color: colors.ink3, marginTop: 4 }]} numberOfLines={1}>{sub}</Text> : null}
        </View>
      </View>

      {progress !== undefined ? (
        <View style={[dp.progressTrack, { backgroundColor: colors.line }]}>
          <View style={{ width: `${Math.max(0, Math.min(progress, 1)) * 100}%`, height: 2, borderRadius: 999, backgroundColor: colors.ink3 }} />
        </View>
      ) : null}
    </Pressable>
  )
}

// ─── DiffuseMetricTile ──────────────────────────────────────────────────────
// Compact stat cell for grids/sheets: serif value + mono label, hairline box.

interface MetricTileProps {
  value: string | number
  label: string
  icon?: ReactNode
  highlighted?: boolean
  style?: StyleProp<ViewStyle>
}

export function DiffuseMetricTile({ value, label, icon, highlighted, style }: MetricTileProps) {
  const { colors } = useDiffuseTheme()
  return (
    <View style={[dp.metricTile, { borderColor: highlighted ? colors.hairline : colors.line, backgroundColor: colors.surface }, style]}>
      {icon ? <View style={{ marginBottom: 4 }}>{icon}</View> : null}
      <Text style={[roleType.serif, { fontSize: 24, color: colors.ink, textAlign: 'center' }]} numberOfLines={1}>{value}</Text>
      {/* Tighter tracking + single-line so long labels (e.g. ACTIVITIES) fit
          the narrow tile at full size instead of wrapping mid-word. */}
      <Text style={[roleType.eyebrow, { color: colors.ink3, textAlign: 'center', marginTop: 3, letterSpacing: 1, fontSize: 9 }]} numberOfLines={1} adjustsFontSizeToFit>{label}</Text>
    </View>
  )
}

// ─── DiffuseListRow ─────────────────────────────────────────────────────────
// Hairline row: leading sticker/dot, title (read) + optional sub (mono),
// trailing value (mono) / chevron / custom node. Replaces filled list cards.

interface ListRowProps {
  title: string
  sub?: string
  icon?: ReactNode         // sticker or dot (left)
  dotColor?: string        // if no icon: a small dot in this color
  value?: string           // trailing mono value
  valueColor?: string
  trailing?: ReactNode     // custom trailing (overrides value/chevron)
  onPress?: () => void
  showArrow?: boolean
  last?: boolean           // drop the bottom hairline on the last row
  style?: StyleProp<ViewStyle>
}

export function DiffuseListRow({
  title,
  sub,
  icon,
  dotColor,
  value,
  valueColor,
  trailing,
  onPress,
  showArrow,
  last,
  style,
}: ListRowProps) {
  const { colors } = useDiffuseTheme()
  const Container: any = onPress ? Pressable : View
  return (
    <Container
      onPress={onPress}
      style={({ pressed }: { pressed?: boolean }) => [
        dp.listRow,
        { borderBottomColor: colors.line, borderBottomWidth: last ? 0 : StyleSheet.hairlineWidth, opacity: pressed ? 0.6 : 1 },
        style,
      ]}
    >
      {icon ? (
        <View style={[dp.listIcon, { borderColor: colors.line2 }]}>{icon}</View>
      ) : dotColor ? (
        <View style={[dp.listDot, { backgroundColor: dotColor }]} />
      ) : null}
      <View style={{ flex: 1 }}>
        <Text style={[roleType.read, { fontSize: 15, color: colors.ink }]} numberOfLines={1}>{title}</Text>
        {sub ? <Text style={[roleType.data, { fontSize: 9.5, color: colors.ink3, marginTop: 3 }]} numberOfLines={1}>{sub}</Text> : null}
      </View>
      {trailing ? trailing
        : value !== undefined ? <Text style={[roleType.data, { fontSize: 13, color: valueColor ?? colors.ink, fontFamily: diffuseFont.monoBold }]}>{value}</Text>
        : showArrow && onPress ? <DiffuseArrow color={colors.ink3} size={16} />
        : null}
    </Container>
  )
}

// ─── DiffuseCircularMetric ──────────────────────────────────────────────────
// SVG progress ring with a serif center value + mono unit + mono label below.
// Used for the sleep circle / activity ring. Accent stroke from the mode field.

interface CircularMetricProps {
  progress: number          // 0..1
  value: string             // center number (serif)
  unit?: string             // small mono unit under the value
  label?: string            // mono caption below the ring
  size?: number
  color?: string            // ring stroke (defaults to mode accent)
  strokeWidth?: number
}

export function DiffuseCircularMetric({
  progress,
  value,
  unit,
  label,
  size = 120,
  color,
  strokeWidth = 4,
}: CircularMetricProps) {
  const { colors, isDark } = useDiffuseTheme()
  const mode = useModeStore((s) => s.mode)
  const [, g2] = getModeField(mode, isDark)
  const stroke = color ?? g2
  const r = (size - strokeWidth) / 2
  const c = 2 * Math.PI * r
  const clamped = Math.max(0, Math.min(progress, 1))

  return (
    <View style={{ alignItems: 'center', gap: 8 }}>
      <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
        <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
          <Circle cx={size / 2} cy={size / 2} r={r} stroke={colors.line} strokeWidth={strokeWidth} fill="none" />
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            stroke={stroke}
            strokeWidth={strokeWidth}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={`${c} ${c}`}
            strokeDashoffset={c * (1 - clamped)}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        </Svg>
        <Text style={[roleType.serif, { fontSize: size * 0.28, color: colors.ink }]}>{value}</Text>
        {unit ? <Text style={[roleType.data, { fontSize: 9, color: colors.ink3, marginTop: 2 }]}>{unit}</Text> : null}
      </View>
      {label ? <Text style={[roleType.eyebrow, { color: colors.ink3 }]}>{label}</Text> : null}
    </View>
  )
}

// ─── DiffuseSheet ───────────────────────────────────────────────────────────
// Bottom-sheet shell: dimmed backdrop, paper sheet with hairline top, drag
// handle, serif title + optional chip, hairline close node, scrollable body.
// The Diffuse counterpart to LogSheet — for detail sheets / pickers / forms.

interface SheetProps {
  visible: boolean
  title: string
  onClose: () => void
  children: ReactNode
  chip?: string
  right?: ReactNode
  scroll?: boolean          // wrap children in a ScrollView (default true)
}

export function DiffuseSheet({ visible, title, onClose, children, chip, right, scroll = true }: SheetProps) {
  const { colors } = useDiffuseTheme()
  const insets = useSafeAreaInsets()
  const Body: any = scroll ? ScrollView : View

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView style={dp.sheetOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={[dp.sheet, { backgroundColor: colors.bg, borderColor: colors.line, paddingBottom: insets.bottom + 16 }]}>
          <View style={dp.sheetHandleWrap}>
            <View style={[dp.sheetHandle, { backgroundColor: colors.line2 }]} />
          </View>
          <View style={dp.sheetHeader}>
            <View style={dp.sheetTitleRow}>
              <Text style={[roleType.serif, { fontSize: 24, color: colors.ink }]} numberOfLines={1}>{title}</Text>
              {chip ? (
                <View style={[dp.sheetChip, { borderColor: colors.line2 }]}>
                  <Text style={[roleType.data, { fontSize: 10, color: colors.ink3 }]}>{chip}</Text>
                </View>
              ) : null}
              {right}
            </View>
            <Pressable onPress={onClose} hitSlop={8} style={[dp.sheetClose, { borderColor: colors.hairline }]}>
              <X size={18} color={colors.ink} />
            </Pressable>
          </View>
          <Body
            {...(scroll ? { keyboardShouldPersistTaps: 'handled', showsVerticalScrollIndicator: false, contentContainerStyle: dp.sheetContent } : { style: dp.sheetContent })}
          >
            {children}
          </Body>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  )
}

// ─── DiffuseEmptyState ──────────────────────────────────────────────────────
// Centered sticker + serif title + read message + optional containerless CTA.

interface EmptyStateProps {
  icon?: ReactNode          // sticker
  title: string
  message?: string
  ctaLabel?: string
  onCta?: () => void
  style?: StyleProp<ViewStyle>
}

export function DiffuseEmptyState({ icon, title, message, ctaLabel, onCta, style }: EmptyStateProps) {
  const { colors } = useDiffuseTheme()
  return (
    <View style={[dp.empty, style]}>
      {icon ? <View style={[dp.emptyIcon, { borderColor: colors.line2 }]}>{icon}</View> : null}
      <Text style={[roleType.serif, { fontSize: 20, color: colors.ink, textAlign: 'center' }]}>{title}</Text>
      {message ? (
        <Text style={[roleType.read, { fontSize: 14, color: colors.ink3, textAlign: 'center', lineHeight: 20, maxWidth: 280 }]}>{message}</Text>
      ) : null}
      {ctaLabel && onCta ? (
        <Pressable onPress={onCta} style={({ pressed }) => [dp.emptyCta, { borderTopColor: colors.line2, opacity: pressed ? 0.6 : 1 }]}>
          <Text style={[roleType.data, { fontSize: 12, color: colors.ink, letterSpacing: 2 }]}>{ctaLabel}</Text>
          <DiffuseArrow color={colors.ink3} size={16} />
        </Pressable>
      ) : null}
    </View>
  )
}

// ─── styles ─────────────────────────────────────────────────────────────────

const dp = StyleSheet.create({
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  sectionIcon: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segRow: {
    flexDirection: 'row',
    gap: 8,
  },
  segPill: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 999,
    borderWidth: 1,
  },
  statCard: {
    borderRadius: 26,
    padding: 18,
    minHeight: 132,
    overflow: 'hidden',
  },
  statHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  statGlyph: {
    opacity: 0.75,
  },
  statBodyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 'auto',
    paddingTop: 14,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressTrack: {
    height: 2,
    borderRadius: 999,
    marginTop: 12,
    overflow: 'hidden',
  },
  metricTile: {
    flex: 1,
    padding: 14,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 14,
  },
  listIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  // sheet
  sheetOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(20,19,19,0.45)',
  },
  sheet: {
    maxHeight: '92%',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    overflow: 'hidden',
  },
  sheetHandleWrap: { alignItems: 'center', paddingTop: 10, paddingBottom: 6 },
  sheetHandle: { width: 40, height: 4, borderRadius: 2 },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 22,
    paddingTop: 6,
    paddingBottom: 14,
    gap: 10,
  },
  sheetTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  sheetChip: { paddingVertical: 5, paddingHorizontal: 12, borderRadius: 999, borderWidth: 1 },
  sheetClose: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  sheetContent: { paddingHorizontal: 22, paddingBottom: 8 },
  // empty state
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    paddingVertical: 32,
    paddingHorizontal: 24,
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderTopWidth: 1,
    paddingTop: 16,
    marginTop: 4,
  },
  // dot calendar
  calHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  calNav: { width: 34, height: 34, borderRadius: 17, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  calDowRow: { flexDirection: 'row', marginBottom: 6 },
  calDow: { flex: 1, textAlign: 'center', fontFamily: diffuseFont.mono, fontSize: 8.5, letterSpacing: 0.5, textTransform: 'uppercase' },
  calGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  calCellWrap: { width: `${100 / 7}%`, aspectRatio: 1, alignItems: 'center', justifyContent: 'center', padding: 3 },
  calCell: { width: '100%', aspectRatio: 1, borderRadius: 999, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  calBloom: { position: 'absolute', width: '128%', height: '128%', borderRadius: 999 },
  calPeriodDot: { position: 'absolute', bottom: 6, width: 4, height: 4, borderRadius: 2 },
})

// ─── DiffuseBloomIcon ───────────────────────────────────────────────────────
// The signature v4 treatment: a thin Lucide line glyph (currentColor) sitting
// over a soft radial color bloom. Used in hero tiles, summary rows, banners,
// list rows. `color` tints the bloom (defaults to mode accent); the glyph is
// passed as children and inherits `glyphColor` (ink-3 by default, per spec:
// icons read quieter than their label).
//
//   <DiffuseBloomIcon color={stickers.blue}><Moon size={18} color={ink3}/></DiffuseBloomIcon>

interface BloomIconProps {
  children: ReactNode        // a Lucide line icon
  color?: string             // bloom hue (defaults to mode accent)
  size?: number              // bloom box (default 34)
  intensity?: number         // bloom opacity (default 0.5)
}

export function DiffuseBloomIcon({ children, color, size = 34, intensity = 0.55 }: BloomIconProps) {
  const { isDark } = useDiffuseTheme()
  const mode = useModeStore((s) => s.mode)
  const bloom = color ?? getDiffuseAccent(mode, isDark)
  // The bloom box extends just past the glyph so the feathered edge hugs the
  // icon (a tighter halo, not a wash across the whole tile).
  const box = size * 1.3
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View pointerEvents="none" style={{ position: 'absolute', width: box, height: box, left: (size - box) / 2, top: (size - box) / 2 }}>
        <SoftBloom color={bloom} opacity={isDark ? intensity * 0.8 : intensity} spread={0.42} radius="50%" />
      </View>
      <View style={{ zIndex: 1 }}>{children}</View>
    </View>
  )
}

// ─── DiffuseDotCalendar ─────────────────────────────────────────────────────
// The v4 `.dotcal`: a hairline dot grid. Every day is a thin hairline circle;
// selected = accent ring + soft radial bloom behind; period/range days get a
// small accent dot beneath the number; leading/trailing days are muted.
// Fully custom (not the native picker). Mon-first, matches the reference.

interface DotCalendarProps {
  value: Date                        // selected day
  onChange: (d: Date) => void
  month?: Date                       // month to show (defaults to value's month)
  minimumDate?: Date
  periodDays?: number[]              // day-of-month numbers to mark with an accent dot
  accent?: string
  onMonthChange?: (firstOfMonth: Date) => void  // fired when the ‹ › nav changes month (additive; optional)
}

const DOW = ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU']

export function DiffuseDotCalendar({ value, onChange, month, minimumDate, periodDays, accent, onMonthChange }: DotCalendarProps) {
  const { colors, isDark } = useDiffuseTheme()
  const mode = useModeStore((s) => s.mode)
  const acc = accent ?? getDiffuseAccent(mode, isDark)
  const [viewMonth, setViewMonth] = useState<Date>(() => month ?? new Date(value.getFullYear(), value.getMonth(), 1))

  const goToMonth = (d: Date) => { setViewMonth(d); onMonthChange?.(d) }

  const { cells, monthLabel } = useMemo(() => {
    const y = viewMonth.getFullYear()
    const m = viewMonth.getMonth()
    const first = new Date(y, m, 1)
    // Mon-first offset
    const startDow = (first.getDay() + 6) % 7
    const daysInMonth = new Date(y, m + 1, 0).getDate()
    const daysInPrev = new Date(y, m, 0).getDate()
    const out: { day: number; inMonth: boolean; date: Date }[] = []
    for (let i = startDow - 1; i >= 0; i--) out.push({ day: daysInPrev - i, inMonth: false, date: new Date(y, m - 1, daysInPrev - i) })
    for (let d = 1; d <= daysInMonth; d++) out.push({ day: d, inMonth: true, date: new Date(y, m, d) })
    let next = 1
    while (out.length % 7 !== 0 || out.length < 42) { out.push({ day: next, inMonth: false, date: new Date(y, m + 1, next) }); next++; if (out.length >= 42) break }
    return { cells: out, monthLabel: viewMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) }
  }, [viewMonth])

  const sameDay = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
  const isBefore = (a: Date, b: Date) => a.setHours(0, 0, 0, 0) < new Date(b).setHours(0, 0, 0, 0)

  return (
    <View>
      {/* month header */}
      <View style={dp.calHeader}>
        <Text style={[roleType.serif, { fontSize: 20, color: colors.ink }]}>{monthLabel}</Text>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          <Pressable onPress={() => goToMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1, 1))} hitSlop={8} style={[dp.calNav, { borderColor: colors.line2 }]}>
            <ChevronLeft size={16} color={colors.ink3} strokeWidth={1.8} />
          </Pressable>
          <Pressable onPress={() => goToMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1))} hitSlop={8} style={[dp.calNav, { borderColor: colors.line2 }]}>
            <ChevronRight size={16} color={colors.ink3} strokeWidth={1.8} />
          </Pressable>
        </View>
      </View>
      {/* day-of-week row */}
      <View style={dp.calDowRow}>
        {DOW.map((d) => (
          <Text key={d} style={[dp.calDow, { color: colors.ink3 }]}>{d}</Text>
        ))}
      </View>
      {/* grid */}
      <View style={dp.calGrid}>
        {cells.map((c, i) => {
          const selected = c.inMonth && sameDay(c.date, value)
          const disabled = minimumDate ? isBefore(new Date(c.date), minimumDate) : false
          const isPeriod = c.inMonth && periodDays?.includes(c.day)
          return (
            <Pressable
              key={i}
              disabled={!c.inMonth || disabled}
              onPress={() => onChange(c.date)}
              style={dp.calCellWrap}
            >
              {selected ? (
                <View pointerEvents="none" style={dp.calBloom}>
                  <SoftBloom color={acc} opacity={0.55} spread={0.34} radius="50%" />
                </View>
              ) : null}
              <View
                style={[
                  dp.calCell,
                  {
                    borderColor: selected ? acc : (c.inMonth && !isPeriod ? colors.line : 'transparent'),
                  },
                ]}
              >
                <Text
                  style={{
                    fontFamily: selected ? diffuseFont.bodySemiBold : diffuseFont.body,
                    fontSize: 13,
                    color: !c.inMonth || disabled ? colors.ink4 : selected ? colors.ink : colors.ink2,
                  }}
                >
                  {c.day}
                </Text>
              </View>
              {isPeriod && !selected ? <View style={[dp.calPeriodDot, { backgroundColor: acc }]} /> : null}
            </Pressable>
          )
        })}
      </View>
    </View>
  )
}



// ─── DiffuseLeapGraph ───────────────────────────────────────────────────────
// Growth-leaps as a clean line-path graph (in the spirit of the v4 basal-temp
// coverline reference): a rising line across the N leaps, a soft gradient wash
// under it, small nodes per leap — done = filled ink, current = open ring,
// upcoming = faint hollow. Mono caption below. Replaces the sticker-dot strip.

interface LeapGraphProps {
  total: number
  completedCount: number
  currentIndex: number       // 0-based index of the active/next leap
  isActive: boolean          // current leap is in progress (open ring)
  accent?: string
  height?: number
}

export function DiffuseLeapGraph({ total, completedCount, currentIndex, isActive, accent, height = 88 }: LeapGraphProps) {
  const { colors, isDark } = useDiffuseTheme()
  const mode = useModeStore((s) => s.mode)
  const acc = accent ?? getDiffuseAccent(mode, isDark)
  const W = 320
  const padX = 14
  const padY = 16
  const innerW = W - padX * 2
  const innerH = height - padY * 2

  // Rising path: y climbs gently as leaps complete (a growth curve).
  const pts = Array.from({ length: total }, (_, i) => {
    const x = padX + (innerW * (total === 1 ? 0 : i / (total - 1)))
    // progress 0..1 up the curve, with a soft ease
    const t = total === 1 ? 0 : i / (total - 1)
    const y = padY + innerH * (1 - Math.pow(t, 0.85))
    return { x, y }
  })
  const linePath = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
  const areaPath = `${linePath} L${pts[pts.length - 1].x.toFixed(1)},${height - padY} L${pts[0].x.toFixed(1)},${height - padY} Z`

  return (
    <View style={{ width: '100%', aspectRatio: W / height }}>
      <Svg width="100%" height="100%" viewBox={`0 0 ${W} ${height}`}>
        {/* soft wash under the line */}
        <Path d={areaPath} fill={acc} opacity={isDark ? 0.1 : 0.08} />
        {/* the line itself */}
        <Path d={linePath} stroke={colors.ink} strokeWidth={1.5} fill="none" strokeLinejoin="round" strokeLinecap="round" opacity={0.85} />
        {/* nodes */}
        {pts.map((p, i) => {
          const done = i < completedCount
          const current = i === currentIndex && isActive
          if (current) {
            return <Circle key={i} cx={p.x} cy={p.y} r={5} fill={colors.bg} stroke={acc} strokeWidth={2} />
          }
          return (
            <Circle
              key={i}
              cx={p.x}
              cy={p.y}
              r={done ? 4 : 3}
              fill={done ? colors.ink : colors.bg}
              stroke={done ? colors.ink : colors.line2}
              strokeWidth={1.5}
            />
          )
        })}
      </Svg>
    </View>
  )
}
