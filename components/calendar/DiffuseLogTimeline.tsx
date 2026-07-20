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
  Sparkles, Dumbbell, FileText, MinusCircle, Circle, Check,
  Droplets, Droplet, Thermometer as ThermoIcon, Activity, Footprints, Timer,
  Sprout, HeartHandshake, Flower2, Waves, Ruler, Stethoscope, Milk,
} from 'lucide-react-native'
import { useDiffuseTheme, diffuseFont, getDiffuseAccent, stickers } from '../../constants/theme'
import { SoftBloom } from '../ui/diffuse/DiffuseKit'
import { DiffuseBloomIcon } from '../ui/diffuse/DiffusePrimitives'
import { Character, type CharacterName } from '../characters/Characters'

// ─── Glyph + hue maps (superset: kids · cycle · pregnancy) ─────────────────

/** Lucide line glyph per log type. */
export const DIFFUSE_LOG_GLYPH: Record<string, typeof Utensils> = {
  // kids — each type gets a distinct, recognizable glyph (no shared faces):
  //   feeding=Milk (bottle/breast) vs food=Utensils (solids); diaper=Droplet
  //   (not a baby-face, so it never clashes with mood=Smile); health=Stethoscope
  //   and growth=Ruler (both were Heart before — ambiguous).
  feeding: Milk, food: Utensils, sleep: Moon, wake_up: Sun,
  health: Stethoscope, temperature: Thermometer, medicine: Pill, vaccine: Syringe,
  mood: Smile, memory: Camera, photo: Camera, diaper: Droplet,
  growth: Ruler, milestone: Sparkles, activity: Dumbbell,
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

/** Log type → character-blob concept. Types not listed fall back to the Lucide
 *  glyph above (so nothing regresses). Exported so the month grid can render the
 *  same blob per log type in day cells. */
export const DIFFUSE_LOG_CHARACTER: Record<string, CharacterName> = {
  // kids
  feeding: 'feeding', food: 'nutrition', sleep: 'sleep', wake_up: 'sun',
  health: 'checkup', temperature: 'temperature', medicine: 'medicine', vaccine: 'vaccine',
  mood: 'mood', memory: 'photo', photo: 'photo', diaper: 'diaper',
  growth: 'growth', milestone: 'sparkle', activity: 'activity', note: 'note', exam: 'exam',
  // cycle
  basal_temp: 'temperature', lh: 'water', cm: 'water', cervical_mucus: 'water',
  intercourse: 'heart', symptom: 'activity',
  // period_start/end share the droplet but differ by hue (see diffuseLogHue);
  // clots is a flow SYMPTOM, not the flow itself → distinct 'warning' blob.
  period_start: 'period', period_end: 'period', ovulation: 'ovulation',
  pregnancy_test: 'ovulation', sex_drive: 'heart', clots: 'warning',
  // pregnancy
  weight: 'growth', kick_count: 'kick', contraction: 'contraction',
  water: 'water', exercise: 'activity', vitamins: 'medicine', kegel: 'soothe',
  nutrition: 'nutrition', appointment: 'checkup', bath: 'bath', potty: 'potty', milk: 'milk',
  nesting: 'soothe', birth_prep: 'note',
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
    period_start: stickers.coral, period_end: stickers.pink, ovulation: stickers.peach,
    pregnancy_test: stickers.peach, sex_drive: stickers.pink, clots: stickers.coral,
    // pregnancy
    weight: stickers.blue, kick_count: stickers.pink, contraction: stickers.coral,
    water: stickers.blue, exercise: stickers.green, vitamins: stickers.green,
    kegel: stickers.lilac, nutrition: stickers.yellow, appointment: stickers.lilac,
  }
  return map[type] ?? stickers.blue
}

/** A Diffuse bloom-icon for a log type — the shared icon treatment (no spine).
 *  Prefers a character-blob when the type has a concept; else the Lucide glyph. */
export function DiffuseLogIcon({ type, size = 34, inkColor }: { type: string; size?: number; inkColor: string }) {
  const hue = diffuseLogHue(type)
  const character = DIFFUSE_LOG_CHARACTER[type]
  const Glyph = DIFFUSE_LOG_GLYPH[type] ?? Circle
  return (
    <DiffuseBloomIcon color={hue} size={size} noBloom={!!character}>
      {character
        ? <Character name={character} size={size * 0.62} color={hue} />
        : <Glyph size={size * 0.5} color={inkColor} strokeWidth={1.6} />}
    </DiffuseBloomIcon>
  )
}

// A clock time token like "1:17 AM" / "12:22 PM" (used to de-dupe the accent
// detail line against the row's time eyebrow).
const TIME_TOKEN = /\d{1,2}:\d{2}\s?(?:AM|PM)/i

/** Strip a leading/trailing "· <time>" token from an accent detail string so
 *  it doesn't repeat the time already shown in the row's eyebrow. */
function stripDupTime(accent?: string, _time?: string): string | undefined {
  if (!accent) return accent
  const parts = accent.split('·').map((s) => s.trim()).filter(Boolean)
  // Drop any standalone part that is purely a clock time (front or back edge).
  const kept = parts.filter((p) => !(TIME_TOKEN.test(p) && p.replace(TIME_TOKEN, '').trim() === ''))
  const out = kept.join(' · ')
  return out || undefined
}

// ─── Timeline node + row + now-marker ──────────────────────────────────────

const TL_NODE = 46                    // node diameter (default)
const TL_NODE_COMPACT = 30            // node diameter (compact)
const TL_SPINE_LEFT = TL_NODE / 2     // 23 → spine passes through node center
const TL_SPINE_LEFT_COMPACT = TL_NODE_COMPACT / 2

/** One node circle on the connector: bordered disc, bg fill, bloom behind glyph. */
export function DiffuseTimelineNode({ type, active, compact }: { type: string; active?: boolean; compact?: boolean }) {
  const { colors } = useDiffuseTheme()
  const character = DIFFUSE_LOG_CHARACTER[type]
  const Glyph = DIFFUSE_LOG_GLYPH[type] ?? Circle
  const node = compact ? TL_NODE_COMPACT : TL_NODE
  return (
    <View
      style={{
        width: node,
        height: node,
        borderRadius: node / 2,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.bg,
        borderWidth: 1.5,
        borderColor: active ? colors.ink : colors.line2,
        overflow: 'hidden',
      }}
    >
      {/* Solid character glyphs sit clean — no bloom behind them. */}
      {character ? null : (
        <View pointerEvents="none" style={StyleSheet.absoluteFillObject}>
          <SoftBloom color={diffuseLogHue(type)} opacity={active ? 0.9 : 0.62} spread={0.42} radius="50%" />
        </View>
      )}
      {character
        ? <View style={{ zIndex: 1 }}><Character name={character} size={compact ? 18 : 26} color={diffuseLogHue(type)} bg={colors.bg} /></View>
        : <Glyph size={compact ? 14 : 20} color={colors.ink2} strokeWidth={1.6} style={{ zIndex: 1 }} />}
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
  compact?: boolean      // smaller node + tighter spacing (day-summary use)
  first?: boolean
  last?: boolean
  onPress?: () => void
}

/** A single timeline entry: node on the spine + text block. */
export function DiffuseTimelineRow({
  type, time, title, accent, sub, chip, logged, active, compact, first, last, onPress,
}: DiffuseTimelineRowProps) {
  const { colors } = useDiffuseTheme()
  const showTime = time && time !== '—'
  const Container: any = onPress ? Pressable : View
  // De-dupe: the time already shows as the eyebrow, so strip any leading or
  // trailing "· 12:22 AM" token from the accent detail line to avoid repeating
  // it (e.g. "Food · 12:22 AM · Lunch" → "Lunch · good · ~90 kcal").
  const cleanAccent = stripDupTime(accent, showTime ? time : undefined)
  // Compact geometry — smaller node, tighter node padding, narrower gap so the
  // spine still passes through the (smaller) node center.
  const node = compact ? TL_NODE_COMPACT : TL_NODE
  const nodePadV = compact ? 4 : 12
  const spineLeft = compact ? TL_SPINE_LEFT_COMPACT : TL_SPINE_LEFT
  return (
    <Container
      onPress={onPress}
      style={({ pressed }: { pressed?: boolean }) => [tlStyles.row, compact ? tlStyles.rowCompact : null, { opacity: pressed ? 0.6 : 1 }]}
    >
      {/* Spine segments — half-height above/below the node, trimmed at ends. */}
      <View pointerEvents="none" style={[tlStyles.spineCol, { left: spineLeft - 0.5 }]}>
        {!first && <View style={[tlStyles.spineSeg, { top: 0, height: node / 2 + nodePadV, backgroundColor: colors.line2 }]} />}
        {!last && <View style={[tlStyles.spineSeg, { top: node / 2 + nodePadV, bottom: 0, backgroundColor: colors.line2 }]} />}
      </View>

      <View style={{ paddingVertical: nodePadV }}>
        <DiffuseTimelineNode type={type} active={active} compact={compact} />
      </View>

      <View style={compact ? tlStyles.bodyCompact : tlStyles.body}>
        {showTime ? (
          <Text style={[tlStyles.time, { color: colors.ink3 }]}>{time}</Text>
        ) : null}
        <View style={tlStyles.titleRow}>
          <Text style={[compact ? tlStyles.titleCompact : tlStyles.title, { color: colors.ink }]} numberOfLines={1}>
            {title}
            {cleanAccent ? <Text style={[compact ? tlStyles.accentCompact : tlStyles.accent, { color: colors.ink2 }]}>{'  ·  '}{cleanAccent}</Text> : null}
          </Text>
          {chip ? (
            <View style={[tlStyles.chip, { borderColor: colors.line2 }]}>
              <Text style={[tlStyles.chipTxt, { color: colors.ink3 }]}>{chip.label}</Text>
            </View>
          ) : null}
          {logged ? <Check size={compact ? 12 : 13} color={colors.success} strokeWidth={2} style={{ marginLeft: 6 }} /> : null}
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
  rowCompact: { gap: 11 },
  spineCol: { position: 'absolute', left: TL_SPINE_LEFT - 0.5, top: 0, bottom: 0, width: 1 },
  spineSeg: { position: 'absolute', left: 0, width: 1 },
  body: { flex: 1, paddingTop: 14, paddingBottom: 4 },
  bodyCompact: { flex: 1, paddingTop: 4, paddingBottom: 10, justifyContent: 'center', minHeight: 34 },
  time: { fontFamily: diffuseFont.mono, fontSize: 10, letterSpacing: 1.4, textTransform: 'uppercase', marginBottom: 4 },
  titleRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'nowrap' },
  title: { fontFamily: diffuseFont.display, fontSize: 18, letterSpacing: -0.3, flexShrink: 1 },
  titleCompact: { fontFamily: diffuseFont.display, fontSize: 15, letterSpacing: -0.2, flexShrink: 1 },
  accent: { fontFamily: diffuseFont.italic, fontSize: 18, letterSpacing: -0.2 },
  accentCompact: { fontFamily: diffuseFont.italic, fontSize: 15, letterSpacing: -0.2 },
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
