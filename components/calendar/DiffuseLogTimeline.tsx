/**
 * DiffuseLogTimeline — the shared v4 "choice timeline" for a day's logs.
 *
 * A vertical connector spine with a bordered node per entry (thin Lucide glyph
 * over a soft feathered bloom). Serif title + italic value accent, mono time
 * above, muted sub below. The active/current entry's node border firms to ink.
 * Matches §06 of design-system-v4.html.
 *
 * Extracted from KidsCalendar so Cycle + Pregnancy render logs through the
 * SAME system. The glyph/hue maps are a SUPERSET covering kids + cycle +
 * pregnancy log types.
 */
import { View, Text, Pressable, StyleSheet } from 'react-native'
import {
  Utensils, Moon, Sun, Heart, Thermometer, Pill, Syringe, Smile, Camera,
  Baby, Sparkles, Dumbbell, FileText, MinusCircle, Circle, Check,
  Droplets, Thermometer as ThermoIcon, Activity, Footprints, Timer,
  Sprout, HeartHandshake, Flower2, Waves,
} from 'lucide-react-native'
import { useDiffuseTheme, diffuseFont, getDiffuseAccent, stickers } from '../../constants/theme'
import { SoftBloom } from '../ui/diffuse/DiffuseKit'
import { DiffuseBloomIcon } from '../ui/diffuse/DiffusePrimitives'

// ─── Glyph + hue maps (superset: kids · cycle · pregnancy) ─────────────────

/** Lucide line glyph per log type. */
export const DIFFUSE_LOG_GLYPH: Record<string, typeof Utensils> = {
  // kids
  feeding: Utensils, food: Utensils, sleep: Moon, wake_up: Sun,
  health: Heart, temperature: Thermometer, medicine: Pill, vaccine: Syringe,
  mood: Smile, memory: Camera, photo: Camera, diaper: Baby,
  growth: Heart, milestone: Sparkles, activity: Dumbbell,
  note: FileText, exam: Sprout, skipped: MinusCircle,
  // cycle
  basal_temp: ThermoIcon, lh: Droplets, cervical_mucus: Waves,
  intercourse: HeartHandshake, symptom: Activity,
  period_start: Droplets, period_end: Droplets, ovulation: Flower2,
  // pregnancy
  weight: Activity, kick_count: Footprints, contraction: Timer,
  water: Droplets, exercise: Dumbbell, vitamins: Pill, kegel: HeartHandshake,
  nutrition: Utensils, appointment: Sprout,
}

/** Soft bloom hue per log type (from the sticker palette). */
export function diffuseLogHue(type: string): string {
  const map: Record<string, string> = {
    // kids
    feeding: stickers.blue, food: stickers.blue, sleep: stickers.lilac,
    wake_up: stickers.yellow, health: stickers.pink, temperature: stickers.pink,
    medicine: stickers.pink, vaccine: stickers.pink, mood: stickers.peach,
    memory: stickers.lilac, photo: stickers.lilac, diaper: stickers.blue,
    growth: stickers.green, milestone: stickers.lilac, activity: stickers.green,
    note: stickers.peach, exam: stickers.green, skipped: stickers.charcoal,
    // cycle
    basal_temp: stickers.blue, lh: stickers.yellow, cervical_mucus: stickers.green,
    intercourse: stickers.pink, symptom: stickers.peach,
    period_start: stickers.coral, period_end: stickers.coral, ovulation: stickers.peach,
    // pregnancy
    weight: stickers.blue, kick_count: stickers.pink, contraction: stickers.coral,
    water: stickers.blue, exercise: stickers.green, vitamins: stickers.green,
    kegel: stickers.lilac, nutrition: stickers.yellow, appointment: stickers.lilac,
  }
  return map[type] ?? stickers.blue
}

/** A Diffuse bloom-icon for a log type — the shared icon treatment (no spine). */
export function DiffuseLogIcon({ type, size = 34, inkColor }: { type: string; size?: number; inkColor: string }) {
  const Glyph = DIFFUSE_LOG_GLYPH[type] ?? Circle
  return (
    <DiffuseBloomIcon color={diffuseLogHue(type)} size={size}>
      <Glyph size={size * 0.5} color={inkColor} strokeWidth={1.6} />
    </DiffuseBloomIcon>
  )
}

// ─── Timeline node + row + now-marker ──────────────────────────────────────

const TL_NODE = 46                    // node diameter
const TL_SPINE_LEFT = TL_NODE / 2     // 23 → spine passes through node center

/** One node circle on the connector: bordered disc, bg fill, bloom behind glyph. */
export function DiffuseTimelineNode({ type, active }: { type: string; active?: boolean }) {
  const { colors } = useDiffuseTheme()
  const Glyph = DIFFUSE_LOG_GLYPH[type] ?? Circle
  return (
    <View
      style={{
        width: TL_NODE,
        height: TL_NODE,
        borderRadius: TL_NODE / 2,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.bg,
        borderWidth: 1.5,
        borderColor: active ? colors.ink : colors.line2,
        overflow: 'hidden',
      }}
    >
      <View pointerEvents="none" style={StyleSheet.absoluteFillObject}>
        <SoftBloom color={diffuseLogHue(type)} opacity={active ? 0.9 : 0.62} spread={0.42} radius="50%" />
      </View>
      <Glyph size={20} color={colors.ink2} strokeWidth={1.6} style={{ zIndex: 1 }} />
    </View>
  )
}

export interface DiffuseTimelineRowProps {
  type: string
  time?: string          // display time, e.g. "7:10 AM" ("—" or empty hides it)
  title: string          // main serif title
  accent?: string        // italic value accent appended as "· accent"
  sub?: string           // muted sub-line below
  chip?: { label: string } | null
  logged?: boolean
  active?: boolean       // firms node border to ink (e.g. the current/next entry)
  first?: boolean
  last?: boolean
  onPress?: () => void
}

/** A single timeline entry: node on the spine + text block. */
export function DiffuseTimelineRow({
  type, time, title, accent, sub, chip, logged, active, first, last, onPress,
}: DiffuseTimelineRowProps) {
  const { colors } = useDiffuseTheme()
  const showTime = time && time !== '—'
  const Container: any = onPress ? Pressable : View
  return (
    <Container
      onPress={onPress}
      style={({ pressed }: { pressed?: boolean }) => [tlStyles.row, { opacity: pressed ? 0.6 : 1 }]}
    >
      {/* Spine segments — half-height above/below the node, trimmed at ends. */}
      <View pointerEvents="none" style={tlStyles.spineCol}>
        {!first && <View style={[tlStyles.spineSeg, { top: 0, height: TL_NODE / 2 + 12, backgroundColor: colors.line2 }]} />}
        {!last && <View style={[tlStyles.spineSeg, { top: TL_NODE / 2 + 12, bottom: 0, backgroundColor: colors.line2 }]} />}
      </View>

      <View style={{ paddingVertical: 12 }}>
        <DiffuseTimelineNode type={type} active={active} />
      </View>

      <View style={tlStyles.body}>
        {showTime ? (
          <Text style={[tlStyles.time, { color: colors.ink3 }]}>{time}</Text>
        ) : null}
        <View style={tlStyles.titleRow}>
          <Text style={[tlStyles.title, { color: colors.ink }]} numberOfLines={1}>
            {title}
            {accent ? <Text style={[tlStyles.accent, { color: colors.ink2 }]}>{'  ·  '}{accent}</Text> : null}
          </Text>
          {chip ? (
            <View style={[tlStyles.chip, { borderColor: colors.line2 }]}>
              <Text style={[tlStyles.chipTxt, { color: colors.ink3 }]}>{chip.label}</Text>
            </View>
          ) : null}
          {logged ? <Check size={13} color={colors.success} strokeWidth={2} style={{ marginLeft: 6 }} /> : null}
        </View>
        {sub ? (
          <Text style={[tlStyles.sub, { color: colors.ink3 }]} numberOfLines={2}>{sub}</Text>
        ) : null}
      </View>
    </Container>
  )
}

/** The "NOW · 2:10 PM" divider: filled accent node on the spine + label + rule. */
export function DiffuseNowMarker({ label, time, mode = 'kids' }: { label: string; time: string; mode?: string }) {
  const { colors, isDark } = useDiffuseTheme()
  const acc = getDiffuseAccent(mode, isDark)
  return (
    <View style={tlStyles.nowRow}>
      {/* Spine passthrough keeps the connector continuous behind the marker. */}
      <View pointerEvents="none" style={[tlStyles.nowSpine, { backgroundColor: colors.line2 }]} />
      <View style={tlStyles.nowNodeCol}>
        <View style={[tlStyles.nowDot, { backgroundColor: acc }]} />
      </View>
      <Text style={[tlStyles.nowLabel, { color: acc }]}>{label.toUpperCase()} · {time}</Text>
      <View style={[tlStyles.nowRule, { backgroundColor: colors.line2 }]} />
    </View>
  )
}

const tlStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 16, position: 'relative' },
  spineCol: { position: 'absolute', left: TL_SPINE_LEFT - 0.5, top: 0, bottom: 0, width: 1 },
  spineSeg: { position: 'absolute', left: 0, width: 1 },
  body: { flex: 1, paddingTop: 14, paddingBottom: 4 },
  time: { fontFamily: diffuseFont.mono, fontSize: 10, letterSpacing: 1.4, textTransform: 'uppercase', marginBottom: 3 },
  titleRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'nowrap' },
  title: { fontFamily: diffuseFont.display, fontSize: 18, letterSpacing: -0.3, flexShrink: 1 },
  accent: { fontFamily: diffuseFont.italic, fontSize: 18, letterSpacing: -0.2 },
  sub: { fontFamily: diffuseFont.body, fontSize: 13, lineHeight: 18, marginTop: 3 },
  chip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, borderWidth: 1, marginLeft: 8 },
  chipTxt: { fontFamily: diffuseFont.mono, fontSize: 9, letterSpacing: 0.8, textTransform: 'uppercase' },
  nowRow: { flexDirection: 'row', alignItems: 'center', minHeight: 32, position: 'relative' },
  nowSpine: { position: 'absolute', left: TL_SPINE_LEFT - 0.5, top: 0, bottom: 0, width: 1 },
  nowNodeCol: { width: TL_NODE, alignItems: 'center' },
  nowDot: { width: 11, height: 11, borderRadius: 6 },
  nowLabel: { fontFamily: diffuseFont.monoBold, fontSize: 11, letterSpacing: 1.4, marginLeft: 16 },
  nowRule: { flex: 1, height: 1, marginLeft: 12 },
})
