/**
 * TodaySummaryCard — single "Today" tracker card.
 *
 * Merges the old horizontal routine chip strip and the glance row into one
 * card: each metric pill is tappable and opens that log sheet directly
 * (via onLogMetric). Tapping the header chevron opens the full daily
 * dashboard modal with charts and metrics for today's logs.
 */

import { useState } from 'react'
import { View, Text, Pressable, StyleSheet } from 'react-native'
import { ChevronRight, SlidersHorizontal } from 'lucide-react-native'
import { useTheme, radius, diffuseFont, useDiffuseTheme, getDiffuseAccent } from '../../../constants/theme'
import { useIsDiffuse, DiffuseFieldSurface } from '../../ui/diffuse/DiffuseKit'
import { Character } from '../../characters/Characters'
import { useTranslation } from '../../../lib/i18n'
import { PaperCard } from '../../ui/PaperCard'
import { Display, MonoCaps } from '../../ui/Typography'
import {
  MoodFace, LogWeight, LogWater, LogSleep, LogKicks, LogNutrition,
} from '../../stickers/RewardStickers'
import { moodFaceVariant, moodFaceFill } from '../../../lib/moodFace'
import type { TodayLogEntry } from '../../../lib/analyticsData'
import { TodayDashboardModal } from './TodayDashboardModal'
import { QuickLogPicker } from './QuickLogPicker'
import { PREG_QUICK_LOGS } from '../../../lib/pregnancyQuickLogs'
import { useQuickLogStore } from '../../../store/useQuickLogStore'

interface Props {
  todayLogs: Record<string, TodayLogEntry>
  weekNumber: number
  userId: string | undefined
  /** Open the log sheet for a given metric. Maps pill key → InlineLogType. */
  onLogMetric: (type: string) => void
  /** Render just the inner content (no PaperCard/DiffuseFieldSurface chrome).
   *  Used when embedded inside another card, e.g. the Week Wallet. */
  bare?: boolean
}

const MOOD_LABELS: Record<string, string> = {
  excited: 'Excited', happy: 'Happy', okay: 'Okay',
  anxious: 'Anxious', nauseous: 'Nauseous', energetic: 'Energetic', sad: 'Sad',
}

export function TodaySummaryCard({ todayLogs, weekNumber, userId, onLogMetric, bare = false }: Props) {
  const { colors, font, stickers } = useTheme()
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)
  const enabledKeys = useQuickLogStore((s) => s.enabledKeys)

  const weightVal = todayLogs['weight']?.value ? parseFloat(todayLogs['weight'].value) : null
  const waterVal = todayLogs['water']?.value ? parseInt(todayLogs['water'].value, 10) : 0
  const sleepVal = todayLogs['sleep']?.value ? parseFloat(todayLogs['sleep'].value) : null
  const kicksVal = todayLogs['kick_count']?.value ? parseInt(todayLogs['kick_count'].value, 10) : null
  const moodKey = (todayLogs['mood']?.notes ?? todayLogs['mood']?.value ?? null) as string | null
  const nutritionVal = todayLogs['nutrition']?.value ? parseInt(todayLogs['nutrition'].value, 10) : 0

  const ink = colors.text
  const paper = colors.surface

  // Each pill: sticker + value + the log type it opens when tapped.
  // `done` drives the green tint; `logType` maps to the inline log sheet.
  interface Pill {
    key: string
    logType: string
    icon: React.ReactElement
    label: string
    done: boolean
  }

  // One pill definition per catalog key — the card renders whichever the user
  // has enabled (in their chosen order), gated by pregnancy week.
  const pillByKey: Record<string, Pill> = {
    mood: {
      key: 'mood', logType: 'mood',
      icon: moodKey
        ? <MoodFace size={20} variant={moodFaceVariant(moodKey)} fill={moodFaceFill(moodKey)} />
        : <MoodFace size={20} variant="okay" fill={stickers.yellowSoft} />,
      label: moodKey ? (MOOD_LABELS[moodKey] ?? moodKey) : '+',
      done: moodKey !== null,
    },
    water: {
      key: 'water', logType: 'water',
      icon: diffuse ? <Character name="water" size={24} color={stickers.blue} /> : <LogWater size={22} />,
      label: `${waterVal}/8`, done: waterVal >= 8,
    },
    sleep: {
      key: 'sleep', logType: 'sleep',
      icon: diffuse ? <Character name="sleep" size={24} color={stickers.lilac} /> : <LogSleep size={22} />,
      label: sleepVal !== null ? `${sleepVal.toFixed(1)}h` : '+', done: sleepVal !== null,
    },
    meals: {
      key: 'meals', logType: 'nutrition',
      icon: diffuse ? <Character name="nutrition" size={24} color={stickers.green} /> : <LogNutrition size={22} />,
      label: `${nutritionVal}/3`, done: nutritionVal >= 3,
    },
    weight: {
      key: 'weight', logType: 'weight',
      icon: diffuse ? <Character name="growth" size={24} color={stickers.peach} /> : <LogWeight size={22} />,
      label: weightVal !== null ? `${weightVal.toFixed(1)}kg` : '+', done: weightVal !== null,
    },
    kicks: {
      key: 'kicks', logType: 'kick_count',
      icon: diffuse ? <Character name="kick" size={24} color={stickers.coral} /> : <LogKicks size={22} />,
      label: kicksVal !== null ? String(kicksVal) : '+', done: kicksVal !== null,
    },
  }

  // Resolve the user's enabled keys → pills, keeping their order, dropping any
  // that aren't in the catalog or are gated by a later week.
  const pills: Pill[] = enabledKeys
    .map((k) => {
      const def = PREG_QUICK_LOGS.find((q) => q.key === k)
      if (!def) return null
      if (def.minWeek !== undefined && weekNumber < def.minWeek) return null
      return pillByKey[k] ?? null
    })
    .filter((p): p is Pill => p !== null)

  // Completion + progress compute over whatever the user is tracking.
  const completed = pills.filter((p) => p.done).length
  const totalTrackable = Math.max(pills.length, 1)
  const summaryHint =
    completed === totalTrackable
      ? t('pregnancy_summaryHint_balanced')
      : completed >= 3
        ? t('pregnancy_summaryHint_progress', { done: completed, total: totalTrackable })
        : completed >= 1
          ? t('pregnancy_summaryHint_started', { remaining: totalTrackable - completed })
          : t('pregnancy_summaryHint_empty')

  // ── Variant-resolved tokens (Diffuse vs current) ──
  const dAccent = getDiffuseAccent('preg', dt.isDark)
  const titleColor = diffuse ? dt.colors.ink : ink
  const hintColor = diffuse ? dt.colors.ink3 : colors.textMuted
  const hintFont = diffuse ? diffuseFont.italic : font.italic
  const chevronColor = diffuse ? dt.colors.ink3 : colors.textMuted
  const neutralBg = diffuse ? dt.colors.surfaceRaised : colors.surfaceGlass
  const trackColor = diffuse ? dt.colors.line : colors.border
  const labelFont = diffuse ? diffuseFont.mono : font.bodySemiBold

  const inner = (
    <>
      {/* Header — title + Edit (opens the picker); chevron opens the dashboard */}
      <View style={styles.headerRow}>
        <Pressable onPress={() => setOpen(true)} style={({ pressed }) => [{ flex: 1, opacity: pressed ? 0.7 : 1 }]}>
          {diffuse ? (
            <Text style={{ fontFamily: diffuseFont.display, fontSize: 24, letterSpacing: -0.3, color: titleColor }}>
              {t('pregnancy_todayAtGlance')}
            </Text>
          ) : (
            <Display size={22} color={ink}>{t('pregnancy_todayAtGlance')}</Display>
          )}
          <Text style={{ marginTop: 3, fontFamily: hintFont, fontSize: 12, color: hintColor }}>
            {summaryHint}
          </Text>
        </Pressable>
        <Pressable onPress={() => setPickerOpen(true)} hitSlop={10} style={({ pressed }) => [styles.editBtn, { opacity: pressed ? 0.6 : 1 }]}>
          <SlidersHorizontal size={15} color={chevronColor} strokeWidth={2} />
          <Text style={{ fontFamily: labelFont, fontSize: 12, color: chevronColor, textTransform: diffuse ? 'uppercase' : 'none', letterSpacing: diffuse ? 0.8 : 0 }}>
            {t('pregnancy_quickLogs_edit')}
          </Text>
        </Pressable>
        <ChevronRight size={20} color={chevronColor} strokeWidth={2} />
      </View>

      {/* Tappable metric pills — each opens its log sheet directly */}
      <View style={styles.chipsRow}>
        {pills.map((p) => {
          const bg = p.done
            ? (diffuse ? getDiffuseAccent('preg', dt.isDark) + '22' : stickers.greenSoft)
            : neutralBg
          const border = p.done
            ? (diffuse ? dAccent : stickers.green)
            : (diffuse ? dt.colors.line : colors.border)
          const textColor = p.done
            ? (diffuse ? dAccent : stickers.greenInk)
            : titleColor
          return (
            <Pressable
              key={p.key}
              onPress={() => onLogMetric(p.logType)}
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

      {/* Subtle progress bar — completion over the user's tracked logs */}
      <View style={[styles.progressTrack, { backgroundColor: trackColor }]}>
        <View
          style={[
            styles.progressFill,
            {
              width: `${(completed / totalTrackable) * 100}%`,
              backgroundColor: diffuse
                ? dAccent
                : (completed === totalTrackable ? stickers.green : stickers.lilac),
            },
          ]}
        />
      </View>

      {/* Footer title — small label like the other home cards */}
      <View style={[styles.footer, { borderTopColor: trackColor }]}>
        <MonoCaps color={hintColor}>{t('pregnancy_quickLogs_footer')}</MonoCaps>
      </View>
    </>
  )

  return (
    <View style={bare ? undefined : styles.wrap}>
      {bare ? (
        inner
      ) : diffuse ? (
        <DiffuseFieldSurface
          mode="preg"
          isDark={dt.isDark}
          intensity={0.45}
          radius={radius.lg}
          style={{ padding: 18, borderWidth: 1, borderColor: dt.colors.line }}
        >
          {inner}
        </DiffuseFieldSurface>
      ) : (
        <PaperCard tint={paper} radius={radius.lg} padding={18}>
          {inner}
        </PaperCard>
      )}

      {userId && (
        <TodayDashboardModal
          visible={open}
          onClose={() => setOpen(false)}
          todayLogs={todayLogs}
          weekNumber={weekNumber}
          userId={userId}
        />
      )}

      <QuickLogPicker visible={pickerOpen} onClose={() => setPickerOpen(false)} weekNumber={weekNumber} />
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: 20 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  editBtn: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  footer: { marginTop: 16, paddingTop: 14, borderTopWidth: StyleSheet.hairlineWidth },
  chipsRow: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 8,
  },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 10, paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
    minWidth: 0,
  },
  chipIcon: { width: 22, height: 22, alignItems: 'center', justifyContent: 'center' },
  chipLabel: { fontSize: 12, maxWidth: 70 },
  progressTrack: { height: 4, borderRadius: 2, marginTop: 14, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 2 },
})
