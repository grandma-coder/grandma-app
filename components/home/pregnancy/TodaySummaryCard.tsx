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
import { ChevronRight } from 'lucide-react-native'
import { useTheme, radius, diffuseFont, useDiffuseTheme, getDiffuseAccent } from '../../../constants/theme'
import { useIsDiffuse, DiffuseFieldSurface } from '../../ui/diffuse/DiffuseKit'
import { useTranslation } from '../../../lib/i18n'
import { PaperCard } from '../../ui/PaperCard'
import { Display } from '../../ui/Typography'
import {
  MoodFace, LogWeight, LogWater, LogSleep, LogKicks, LogNutrition,
} from '../../stickers/RewardStickers'
import { moodFaceVariant, moodFaceFill } from '../../../lib/moodFace'
import type { TodayLogEntry } from '../../../lib/analyticsData'
import { TodayDashboardModal } from './TodayDashboardModal'

interface Props {
  todayLogs: Record<string, TodayLogEntry>
  weekNumber: number
  userId: string | undefined
  /** Open the log sheet for a given metric. Maps pill key → InlineLogType. */
  onLogMetric: (type: string) => void
}

const MOOD_LABELS: Record<string, string> = {
  excited: 'Excited', happy: 'Happy', okay: 'Okay',
  anxious: 'Anxious', nauseous: 'Nauseous', energetic: 'Energetic', sad: 'Sad',
}

export function TodaySummaryCard({ todayLogs, weekNumber, userId, onLogMetric }: Props) {
  const { colors, font, stickers } = useTheme()
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)

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

  const pills: Pill[] = [
    {
      key: 'mood',
      logType: 'mood',
      icon: moodKey
        ? <MoodFace size={20} variant={moodFaceVariant(moodKey)} fill={moodFaceFill(moodKey)} />
        : <MoodFace size={20} variant="okay" fill={stickers.yellowSoft} />,
      label: moodKey ? (MOOD_LABELS[moodKey] ?? moodKey) : '+',
      done: moodKey !== null,
    },
    {
      key: 'water',
      logType: 'water',
      icon: <LogWater size={22} />,
      label: `${waterVal}/8`,
      done: waterVal >= 8,
    },
    {
      key: 'sleep',
      logType: 'sleep',
      icon: <LogSleep size={22} />,
      label: sleepVal !== null ? `${sleepVal.toFixed(1)}h` : '+',
      done: sleepVal !== null,
    },
    {
      key: 'meals',
      logType: 'nutrition',
      icon: <LogNutrition size={22} />,
      label: `${nutritionVal}/3`,
      done: nutritionVal >= 3,
    },
    {
      key: 'weight',
      logType: 'weight',
      icon: <LogWeight size={22} />,
      label: weightVal !== null ? `${weightVal.toFixed(1)}kg` : '+',
      done: weightVal !== null,
    },
    ...(weekNumber >= 28 ? [{
      key: 'kicks',
      logType: 'kick_count',
      icon: <LogKicks size={22} />,
      label: kicksVal !== null ? String(kicksVal) : '+',
      done: kicksVal !== null,
    }] : []),
  ]

  // Quick read on how complete today feels (mood / water / sleep / meals / weight).
  const completed = [
    moodKey !== null,
    waterVal >= 8,
    sleepVal !== null,
    nutritionVal >= 3,
    weightVal !== null,
  ].filter(Boolean).length
  const totalTrackable = 5
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
      {/* Header — tapping the chevron opens the full dashboard */}
      <Pressable
        onPress={() => setOpen(true)}
        style={({ pressed }) => [styles.headerRow, { opacity: pressed ? 0.7 : 1 }]}
      >
        <View style={{ flex: 1 }}>
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
        </View>
        <ChevronRight size={20} color={chevronColor} strokeWidth={2} />
      </Pressable>

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

      {/* Subtle progress bar — completion of today's 5 core routines */}
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
    </>
  )

  return (
    <View style={styles.wrap}>
      {diffuse ? (
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
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: 20 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
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
