/**
 * KidsTodaySummaryCard — the kids "Today at a glance" quick-log launcher.
 *
 * Mirrors the pregnancy TodaySummaryCard / cycle CycleTodaySummaryCard: a
 * tappable chip per enabled log type (opens that log sheet via onLogMetric), a
 * "X/Y routines logged today" hint, an Edit button (opens KidsQuickLogPicker),
 * a completion progress bar, and a "See results" footer that routes to Insights.
 *
 * Differs from pregnancy in that logs are per-child: `todayCounts` comes from
 * useKidsTodayLogs(childId) and a chip is "done" when any of its doneTypes has a
 * count > 0 today. Chips show label + Character icon only (no per-metric value).
 */
import { useState } from 'react'
import { View, Text, Pressable, StyleSheet } from 'react-native'
import { router } from 'expo-router'
import { SlidersHorizontal } from 'lucide-react-native'
import { useTheme, diffuseFont, useDiffuseTheme } from '../../../constants/theme'
import { useIsDiffuse } from '../../ui/diffuse/DiffuseKit'
import { Character, type CharacterName } from '../../characters/Characters'
import { useTranslation } from '../../../lib/i18n'
import { Display } from '../../ui/Typography'
import { QuietPill } from '../../ui/QuietPill'
import { KIDS_QUICK_LOGS } from '../../../lib/kidsQuickLogs'
import { useKidsQuickLogStore } from '../../../store/useKidsQuickLogStore'
import { KidsQuickLogPicker } from './KidsQuickLogPicker'

interface Props {
  /** Active child — keys the today query + scopes the logs. */
  childId: string | undefined
  /** Count-per-type map for today (from useKidsTodayLogs). */
  todayCounts: Record<string, number>
  /** Open the log sheet for a given metric key (KidsHome logSheetType).
      Undefined for a view-only caregiver → the quick-log chips are inert. */
  onLogMetric?: (type: string) => void
}

// Character glyph + hue per quick-log key.
const CHAR_FOR: Record<string, { name: CharacterName; hue: keyof ReturnType<typeof useTheme>['stickers'] }> = {
  sleep:    { name: 'sleep',    hue: 'lilac' },
  mood:     { name: 'mood',     hue: 'peach' },
  feeding:  { name: 'feeding',  hue: 'blue' },
  activity: { name: 'activity', hue: 'green' },
  diaper:   { name: 'diaper',   hue: 'blue' },
  wake_up:  { name: 'sun',      hue: 'yellow' },
  health:   { name: 'checkup',  hue: 'coral' },
  memory:   { name: 'photo',    hue: 'lilac' },
  exam:     { name: 'exam',     hue: 'green' },
}

export function KidsTodaySummaryCard({ childId, todayCounts, onLogMetric }: Props) {
  const { colors, font, stickers } = useTheme()
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
  const { t } = useTranslation()
  const [pickerOpen, setPickerOpen] = useState(false)
  const enabledKeys = useKidsQuickLogStore((s) => s.enabledKeys)

  const ink = colors.text

  interface Pill {
    key: string
    logType: string
    icon: React.ReactElement
    label: string
    done: boolean
  }

  // Resolve the user's enabled keys (in their chosen order) → renderable pills.
  const pills: Pill[] = enabledKeys
    .map((key): Pill | null => {
      const def = KIDS_QUICK_LOGS.find((q) => q.key === key)
      if (!def) return null
      const glyph = CHAR_FOR[key] ?? { name: 'activity' as CharacterName, hue: 'green' as const }
      const done = def.doneTypes.some((type) => (todayCounts[type] ?? 0) > 0)
      return {
        key,
        logType: def.logType,
        icon: <Character name={glyph.name} size={20} color={stickers[glyph.hue]} />,
        label: t(def.labelKey),
        done,
      }
    })
    .filter((p): p is Pill => p !== null)

  const completed = pills.filter((p) => p.done).length
  const totalTrackable = Math.max(pills.length, 1)
  const summaryHint =
    completed === totalTrackable
      ? t('kids_summaryHint_balanced')
      : completed >= 3
        ? t('kids_summaryHint_progress', { done: completed, total: totalTrackable })
        : completed >= 1
          ? t('kids_summaryHint_started', { remaining: totalTrackable - completed })
          : t('kids_summaryHint_empty')

  // ── Variant-resolved tokens (Diffuse vs current) — same as pregnancy card ──
  const titleColor = diffuse ? dt.colors.ink : ink
  const hintColor = diffuse ? dt.colors.ink3 : colors.textMuted
  const hintFont = diffuse ? diffuseFont.italic : font.italic
  const chevronColor = diffuse ? dt.colors.ink3 : colors.textMuted
  const neutralBg = diffuse ? dt.colors.surfaceRaised : colors.surfaceGlass
  const trackColor = diffuse ? dt.colors.line : colors.border
  const labelFont = diffuse ? diffuseFont.mono : font.bodySemiBold

  return (
    // No wrapper padding: KidsHome mounts this inside a section that already
    // applies horizontal padding (matches the pregnancy card).
    <View>
      {/* Header — title + hint; Edit (picker) sits to the right. */}
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          {diffuse ? (
            <Text style={{ fontFamily: diffuseFont.display, fontSize: 22, letterSpacing: -0.3, color: titleColor }}>
              {t('cycleLog_todayTitle')}
            </Text>
          ) : (
            <Display size={22} color={ink}>{t('cycleLog_todayTitle')}</Display>
          )}
          <Text style={{ marginTop: 3, fontFamily: hintFont, fontSize: 12, color: hintColor }}>
            {t('cycleLog_hint')}
          </Text>
        </View>
        {/* Compact "See results" pill + icon-only edit on the header row
            (replaces the old footer band that left dead space). Matches the
            cycle + pregnancy cards exactly. See results → kids analytics tab. */}
        <QuietPill
          label={t('kids_quickLogs_seeResults')}
          onPress={() => router.push('/vault')}
          accessibilityLabel={t('kids_quickLogs_seeResults')}
        />
        <QuietPill
          leading={<SlidersHorizontal size={16} color={chevronColor} strokeWidth={2} />}
          onPress={() => setPickerOpen(true)}
          accessibilityLabel={t('kids_quickLogs_edit')}
        />
      </View>

      {/* Tappable log chips — neutral hairline; a completed log tints soft green. */}
      <View style={styles.chipsRow}>
        {pills.map((p) => {
          const bg = p.done ? stickers.greenSoft : neutralBg
          const border = p.done ? stickers.green : (diffuse ? dt.colors.line : colors.border)
          const textColor = p.done ? stickers.greenInk : titleColor
          return (
            <Pressable
              key={p.key}
              onPress={onLogMetric ? () => onLogMetric(p.logType) : undefined}
              disabled={!onLogMetric}
              style={({ pressed }) => [
                styles.chip,
                { backgroundColor: bg, borderColor: border, borderRadius: diffuse ? 12 : 999, opacity: pressed ? 0.8 : 1 },
              ]}
            >
              <View style={styles.chipIcon}>{p.icon}</View>
              <Text
                numberOfLines={1}
                style={[styles.chipLabel, { color: textColor, fontFamily: labelFont, textTransform: diffuse ? 'uppercase' : 'none', letterSpacing: diffuse ? 0.5 : 0 }]}
              >
                {p.label}
              </Text>
            </Pressable>
          )
        })}
      </View>

      {/* Subtle progress bar — completion over the user's tracked logs. */}
      <View style={[styles.progressTrack, { backgroundColor: trackColor }]}>
        <View
          style={[
            styles.progressFill,
            {
              width: `${(completed / totalTrackable) * 100}%`,
              backgroundColor: completed === totalTrackable ? stickers.green : (diffuse ? dt.colors.ink3 : colors.textMuted),
            },
          ]}
        />
      </View>

      {/* (See results moved to the header row; no footer band — it left dead
          space. Matches the cycle + pregnancy cards.) */}

      <KidsQuickLogPicker visible={pickerOpen} onClose={() => setPickerOpen(false)} />
    </View>
  )
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  editBtn: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 10, paddingVertical: 7,
    borderRadius: 999, borderWidth: 1, minWidth: 0,
  },
  chipIcon: { width: 22, height: 22, alignItems: 'center', justifyContent: 'center' },
  chipLabel: { fontSize: 12, maxWidth: 80 },
  progressTrack: { height: 4, borderRadius: 2, marginTop: 14, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 2 },
})
