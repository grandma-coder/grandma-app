import React from 'react'
import { View, Text, Pressable, StyleSheet } from 'react-native'
import { ChevronRight } from 'lucide-react-native'
import { useTheme } from '../../../constants/theme'
import { PaperCard } from '../../ui/PaperCard'
import {
  NotifyAppointmentDue, TipRead, LogKicks, LogWater, LogVitamins,
} from '../../stickers/RewardStickers'
import { getUpcomingAppointment } from '../../../lib/pregnancyAppointments'
import type { StandardAppointment } from '../../../lib/pregnancyAppointments'
import { getWeekData } from '../../../lib/pregnancyData'
import type { TodayLogEntry } from '../../../lib/analyticsData'

export type ReminderLogType =
  | 'water' | 'vitamins' | 'kick_count' | 'symptom' | 'mood' | 'weight' | 'sleep'

type StickerFn = (props: { size?: number; fill?: string; stroke?: string }) => React.ReactElement

interface ReminderItem {
  id: string
  Sticker: StickerFn
  title: string
  subtitle: string
  tint: string
  accent: string
  onPress: () => void
}

interface Props {
  weekNumber: number
  todayLogs: Record<string, TodayLogEntry>
  onOpenWeekDetail: () => void
  onLog: (type: ReminderLogType) => void
  onOpenAppointment: (appt: StandardAppointment) => void
}

export function RemindersSection({
  weekNumber,
  todayLogs,
  onOpenWeekDetail,
  onLog,
  onOpenAppointment,
}: Props) {
  const { colors, stickers } = useTheme()

  const items: ReminderItem[] = []

  // Upcoming appointment
  const appt = getUpcomingAppointment(weekNumber)
  if (appt) {
    items.push({
      id: 'appointment',
      Sticker: NotifyAppointmentDue,
      title: appt.name,
      subtitle: `Week ${appt.week} · ${appt.prepNote}`,
      tint: stickers.yellowSoft,
      accent: stickers.yellow,
      onPress: () => onOpenAppointment(appt),
    })
  }

  // Week tip from pregnancyData
  const weekData = getWeekData(weekNumber)
  if (weekData?.momTip) {
    items.push({
      id: 'week_tip',
      Sticker: TipRead,
      title: `Week ${weekNumber} tip`,
      subtitle: weekData.momTip,
      tint: stickers.lilacSoft,
      accent: stickers.lilac,
      onPress: onOpenWeekDetail,
    })
  }

  // Kick count reminder (W28+, not logged today)
  if (weekNumber >= 28 && !todayLogs['kick_count']) {
    items.push({
      id: 'kicks',
      Sticker: LogKicks,
      title: 'Log your kick count',
      subtitle: 'Track 10 movements — aim to finish within 2 hours',
      tint: stickers.greenSoft,
      accent: stickers.green,
      onPress: () => onLog('kick_count'),
    })
  }

  // Water reminder (less than 4 glasses)
  const waterVal = todayLogs['water']?.value ? parseInt(todayLogs['water'].value, 10) : 0
  if (waterVal < 4) {
    items.push({
      id: 'water',
      Sticker: LogWater,
      title: 'Stay hydrated',
      subtitle: `You've had ${waterVal}/8 glasses today — keep going`,
      tint: stickers.blueSoft,
      accent: stickers.blue,
      onPress: () => onLog('water'),
    })
  }

  // Vitamins not taken
  if (!todayLogs['vitamins']) {
    items.push({
      id: 'vitamins',
      Sticker: LogVitamins,
      title: 'Take your prenatal vitamins',
      subtitle: 'Best taken with food to avoid nausea',
      tint: stickers.pinkSoft,
      accent: stickers.pink,
      onPress: () => onLog('vitamins' as ReminderLogType),
    })
  }

  if (items.length === 0) return null

  return (
    <View style={styles.root}>
      {items.slice(0, 4).map((item) => (
        <Pressable
          key={item.id}
          onPress={item.onPress}
          style={({ pressed }) => [{ opacity: pressed ? 0.8 : 1 }]}
        >
          <PaperCard tint={item.tint} radius={20} padding={14} flat style={styles.item}>
            <View style={styles.iconWrap}>
              <item.Sticker size={32} />
            </View>
            <View style={styles.itemBody}>
              <Text style={[styles.itemTitle, { color: colors.text }]} numberOfLines={1}>
                {item.title}
              </Text>
              <Text style={[styles.itemSubtitle, { color: colors.textMuted }]} numberOfLines={2}>
                {item.subtitle}
              </Text>
            </View>
            <ChevronRight size={14} color={item.accent} strokeWidth={2} />
          </PaperCard>
        </Pressable>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  root: { gap: 10 },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconWrap: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  itemBody: { flex: 1 },
  itemTitle: {
    fontSize: 14,
    fontFamily: 'DMSans_600SemiBold',
    marginBottom: 2,
  },
  itemSubtitle: {
    fontSize: 12,
    fontFamily: 'DMSans_400Regular',
    lineHeight: 16,
  },
})
