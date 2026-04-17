import React from 'react'
import { View, Text, Pressable, StyleSheet } from 'react-native'
import { ChevronRight } from 'lucide-react-native'
import { router } from 'expo-router'
import { useTheme, brand } from '../../../constants/theme'
import { getUpcomingAppointment } from '../../../lib/pregnancyAppointments'
import { getWeekData } from '../../../lib/pregnancyData'
import type { TodayLogEntry } from '../../../lib/analyticsData'

interface ReminderItem {
  id: string
  icon: string
  title: string
  subtitle: string
  color: string
  onPress: () => void
}

interface Props {
  weekNumber: number
  todayLogs: Record<string, TodayLogEntry>
  onOpenWeekDetail: () => void
}

export function RemindersSection({ weekNumber, todayLogs, onOpenWeekDetail }: Props) {
  const { colors } = useTheme()

  const items: ReminderItem[] = []

  // Upcoming appointment
  const appt = getUpcomingAppointment(weekNumber)
  if (appt) {
    items.push({
      id: 'appointment',
      icon: '📅',
      title: appt.name,
      subtitle: `Week ${appt.week} · ${appt.prepNote}`,
      color: '#FBBF24',
      onPress: () => router.push('/(tabs)/agenda'),
    })
  }

  // Week tip from pregnancyData
  const weekData = getWeekData(weekNumber)
  if (weekData?.momTip) {
    items.push({
      id: 'week_tip',
      icon: '💡',
      title: `Week ${weekNumber} Tip`,
      subtitle: weekData.momTip,
      color: brand.pregnancy,
      onPress: onOpenWeekDetail,
    })
  }

  // Kick count reminder (W28+, not logged today)
  if (weekNumber >= 28 && !todayLogs['kick_count']) {
    items.push({
      id: 'kicks',
      icon: '👶',
      title: 'Log your kick count',
      subtitle: 'Track 10 movements — aim to finish within 2 hours',
      color: '#A2FF86',
      onPress: () => router.push('/(tabs)/agenda'),
    })
  }

  // Water reminder (less than 4 glasses)
  const waterVal = todayLogs['water']?.value ? parseInt(todayLogs['water'].value, 10) : 0
  if (waterVal < 4) {
    items.push({
      id: 'water',
      icon: '💧',
      title: 'Stay hydrated',
      subtitle: `You've had ${waterVal}/8 glasses today — keep going`,
      color: '#6AABF7',
      onPress: () => {},
    })
  }

  // Vitamins not taken
  if (!todayLogs['vitamins']) {
    items.push({
      id: 'vitamins',
      icon: '💊',
      title: 'Take your prenatal vitamins',
      subtitle: 'Best taken with food to avoid nausea',
      color: '#FF8AD8',
      onPress: () => {},
    })
  }

  if (items.length === 0) return null

  return (
    <View style={styles.root}>
      {items.slice(0, 4).map((item) => (
        <Pressable
          key={item.id}
          onPress={item.onPress}
          style={({ pressed }) => [
            styles.item,
            {
              backgroundColor: item.color + '0D',
              borderColor: item.color + '30',
              opacity: pressed ? 0.75 : 1,
            },
          ]}
        >
          <Text style={styles.itemIcon}>{item.icon}</Text>
          <View style={styles.itemBody}>
            <Text style={[styles.itemTitle, { color: colors.text }]} numberOfLines={1}>
              {item.title}
            </Text>
            <Text style={[styles.itemSubtitle, { color: colors.textMuted }]} numberOfLines={2}>
              {item.subtitle}
            </Text>
          </View>
          <ChevronRight size={14} color={item.color} strokeWidth={2} />
        </Pressable>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  root: { gap: 8 },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    gap: 12,
  },
  itemIcon: { fontSize: 22, flexShrink: 0 },
  itemBody: { flex: 1 },
  itemTitle: {
    fontSize: 13,
    fontFamily: 'Satoshi-Variable',
    fontWeight: '700',
    marginBottom: 2,
  },
  itemSubtitle: {
    fontSize: 11,
    fontFamily: 'Satoshi-Variable',
    lineHeight: 15,
  },
})
