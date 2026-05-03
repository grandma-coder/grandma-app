/**
 * TodaySummaryCard — single "Today at a glance" card.
 *
 * Replaces the old VitalsCarousel. Logging now lives exclusively in the
 * Today's Routines chips above. Tapping this card opens a full daily
 * dashboard modal with charts and metrics for today's logs.
 */

import { useState } from 'react'
import { View, Text, Pressable, StyleSheet } from 'react-native'
import { ChevronRight } from 'lucide-react-native'
import { useTheme } from '../../../constants/theme'
import { PaperCard } from '../../ui/PaperCard'
import { Display, MonoCaps, Body } from '../../ui/Typography'
import {
  MoodFace, LogWeight, LogWater, LogSleep, LogKicks, LogNutrition, LogExercise,
} from '../../stickers/RewardStickers'
import { moodFaceVariant, moodFaceFill } from '../../../lib/moodFace'
import type { TodayLogEntry } from '../../../lib/analyticsData'
import { TodayDashboardModal } from './TodayDashboardModal'

interface Props {
  todayLogs: Record<string, TodayLogEntry>
  weekNumber: number
  userId: string | undefined
}

const MOOD_LABELS: Record<string, string> = {
  excited: 'Excited', happy: 'Happy', okay: 'Okay',
  anxious: 'Anxious', nauseous: 'Nauseous', energetic: 'Energetic', sad: 'Sad',
}

export function TodaySummaryCard({ todayLogs, weekNumber, userId }: Props) {
  const { colors, font, stickers, isDark } = useTheme()
  const [open, setOpen] = useState(false)

  const weightVal = todayLogs['weight']?.value ? parseFloat(todayLogs['weight'].value) : null
  const waterVal = todayLogs['water']?.value ? parseInt(todayLogs['water'].value, 10) : 0
  const sleepVal = todayLogs['sleep']?.value ? parseFloat(todayLogs['sleep'].value) : null
  const kicksVal = todayLogs['kick_count']?.value ? parseInt(todayLogs['kick_count'].value, 10) : null
  const moodKey = (todayLogs['mood']?.notes ?? todayLogs['mood']?.value ?? null) as string | null
  const nutritionVal = todayLogs['nutrition']?.value ? parseInt(todayLogs['nutrition'].value, 10) : 0
  const exerciseLogged = !!todayLogs['exercise']

  const ink = isDark ? colors.text : '#141313'
  const paper = isDark ? colors.surface : '#FFFEF8'

  // Build the metric chips (sticker + value). Order optimized: things you log most often first.
  const chips = [
    {
      key: 'mood',
      icon: moodKey
        ? <MoodFace size={20} variant={moodFaceVariant(moodKey)} fill={moodFaceFill(moodKey)} />
        : <MoodFace size={20} variant="okay" fill={stickers.yellowSoft} />,
      label: moodKey ? (MOOD_LABELS[moodKey] ?? moodKey) : '—',
    },
    {
      key: 'water',
      icon: <LogWater size={22} />,
      label: `${waterVal}/8`,
    },
    {
      key: 'sleep',
      icon: <LogSleep size={22} />,
      label: sleepVal !== null ? `${sleepVal.toFixed(1)}h` : '—',
    },
    {
      key: 'meals',
      icon: <LogNutrition size={22} />,
      label: `${nutritionVal}/3`,
    },
    {
      key: 'exercise',
      icon: <LogExercise size={22} />,
      label: exerciseLogged ? '✓' : '—',
    },
    {
      key: 'weight',
      icon: <LogWeight size={22} />,
      label: weightVal !== null ? `${weightVal.toFixed(1)}kg` : '—',
    },
    ...(weekNumber >= 28 ? [{
      key: 'kicks',
      icon: <LogKicks size={22} />,
      label: kicksVal !== null ? String(kicksVal) : '—',
    }] : []),
  ]

  // Quick read on how complete today feels (mood / water / sleep / meals / exercise).
  const completed = [
    moodKey !== null,
    waterVal >= 8,
    sleepVal !== null,
    nutritionVal >= 3,
    exerciseLogged,
  ].filter(Boolean).length
  const totalTrackable = 5
  const summaryHint =
    completed === totalTrackable ? 'Beautifully balanced day.'
    : completed >= 3 ? `${completed}/${totalTrackable} routines logged today.`
    : completed >= 1 ? `Started — ${totalTrackable - completed} more to round out the day.`
    : 'Tap a routine above to log your first.'

  return (
    <View style={styles.wrap}>
      <Pressable
        onPress={() => setOpen(true)}
        style={({ pressed }) => [{ opacity: pressed ? 0.92 : 1 }]}
      >
        <PaperCard tint={paper} radius={24} padding={18}>
          <View style={styles.headerRow}>
            <View style={{ flex: 1 }}>
              <Display size={22} color={ink}>Today at a glance</Display>
              <Body size={12} color={colors.textMuted} style={{ marginTop: 2, fontFamily: font.italic }}>
                {summaryHint}
              </Body>
            </View>
            <ChevronRight size={20} color={colors.textMuted} strokeWidth={2} />
          </View>

          <View style={styles.chipsRow}>
            {chips.map((c) => (
              <View key={c.key} style={styles.chip}>
                <View style={styles.chipIcon}>{c.icon}</View>
                <Text
                  numberOfLines={1}
                  style={[styles.chipLabel, { color: ink, fontFamily: font.bodySemiBold }]}
                >
                  {c.label}
                </Text>
              </View>
            ))}
          </View>

          {/* Subtle progress bar — completion of today's 5 core routines */}
          <View style={[styles.progressTrack, { backgroundColor: isDark ? colors.border : 'rgba(20,19,19,0.06)' }]}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${(completed / totalTrackable) * 100}%`,
                  backgroundColor: completed === totalTrackable ? stickers.green : stickers.lilac,
                },
              ]}
            />
          </View>
        </PaperCard>
      </Pressable>

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
    paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(20,19,19,0.04)',
    minWidth: 0,
  },
  chipIcon: { width: 22, height: 22, alignItems: 'center', justifyContent: 'center' },
  chipLabel: { fontSize: 12, maxWidth: 70 },
  progressTrack: { height: 4, borderRadius: 2, marginTop: 14, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 2 },
})
