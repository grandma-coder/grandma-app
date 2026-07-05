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

import { ReactNode } from 'react'
import { View, Text, Pressable, Modal, ScrollView, StyleSheet, ViewStyle, StyleProp, KeyboardAvoidingView, Platform } from 'react-native'
import Svg, { Circle } from 'react-native-svg'
import { LinearGradient } from 'expo-linear-gradient'
import { X } from 'lucide-react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useDiffuseTheme, getModeField, diffuseFont } from '../../../constants/theme'
import { useModeStore } from '../../../store/useModeStore'
import { DiffuseGrain, DiffuseArrow } from './DiffuseKit'

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
      {/* soft field bloom (corner-to-corner) + grain — borderless tile */}
      <View pointerEvents="none" style={[StyleSheet.absoluteFillObject, { opacity: isDark ? 0.40 : 0.55 }]}>
        <LinearGradient colors={[c1, c2]} start={{ x: 0.15, y: 0 }} end={{ x: 0.9, y: 1 }} style={StyleSheet.absoluteFillObject} />
      </View>
      {/* gentle paper veil so ink stays legible over the bloom */}
      <View pointerEvents="none" style={[StyleSheet.absoluteFillObject, { backgroundColor: colors.surface, opacity: isDark ? 0.30 : 0.28 }]} />
      <DiffuseGrain radius={dp.statCard.borderRadius} opacity={0.06} />

      <View style={dp.statHeaderRow}>
        <Text style={[roleType.eyebrow, { color: colors.ink3 }]} numberOfLines={1}>{label}</Text>
        {icon ? <View style={dp.statGlyph}>{icon}</View> : null}
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
      <Text style={[roleType.serif, { fontSize: 24, color: colors.ink, textAlign: 'center' }]}>{value}</Text>
      <Text style={[roleType.eyebrow, { color: colors.ink3, textAlign: 'center', marginTop: 3 }]}>{label}</Text>
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
})
