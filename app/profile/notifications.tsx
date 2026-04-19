/**
 * Notifications Settings (Apr 2026 redesign)
 *
 * Cream canvas, paper card list, ScreenHeader with back + title.
 */

import { useState } from 'react'
import { View, ScrollView, Switch, StyleSheet } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme } from '../../constants/theme'
import { ScreenHeader } from '../../components/ui/ScreenHeader'
import { Body } from '../../components/ui/Typography'

interface NotifToggle {
  id: string
  label: string
  description: string
  default: boolean
}

const NOTIFICATION_SETTINGS: NotifToggle[] = [
  { id: 'daily_reminder', label: 'Daily Log Reminder', description: 'Remind me to log each day', default: true },
  { id: 'insights', label: 'New Insights', description: 'When Grandma generates new insights', default: true },
  { id: 'appointments', label: 'Appointment Reminders', description: 'Before scheduled appointments', default: true },
  { id: 'cycle_predictions', label: 'Cycle Predictions', description: 'Period and fertile window alerts', default: true },
  { id: 'care_circle', label: 'Care Circle Updates', description: 'When caregivers log activities', default: true },
  { id: 'milestones', label: 'Milestone Alerts', description: 'Upcoming developmental milestones', default: false },
  { id: 'weekly_summary', label: 'Weekly Summary', description: 'Weekly digest of activity and insights', default: false },
]

export default function NotificationsScreen() {
  const { colors, font, isDark } = useTheme()
  const insets = useSafeAreaInsets()

  const [toggles, setToggles] = useState<Record<string, boolean>>(
    Object.fromEntries(NOTIFICATION_SETTINGS.map((n) => [n.id, n.default]))
  )

  const bg = isDark ? colors.bg : '#F3ECD9'
  const paper = isDark ? colors.surface : '#FFFEF8'
  const paperBorder = isDark ? colors.border : 'rgba(20,19,19,0.08)'
  const ink = isDark ? colors.text : '#141313'
  const ink3 = isDark ? colors.textMuted : '#6E6763'

  function handleToggle(id: string) {
    setToggles((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  return (
    <View style={[styles.root, { backgroundColor: bg }]}>
      <View style={[styles.headerWrap, { paddingTop: insets.top + 8 }]}>
        <ScreenHeader title="Notifications" />
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        {NOTIFICATION_SETTINGS.map((notif) => (
          <View
            key={notif.id}
            style={[styles.row, { backgroundColor: paper, borderColor: paperBorder }]}
          >
            <View style={styles.rowText}>
              <Body size={15} color={ink} style={{ fontFamily: font.bodySemiBold, marginBottom: 2 }}>
                {notif.label}
              </Body>
              <Body size={12} color={ink3}>
                {notif.description}
              </Body>
            </View>
            <Switch
              value={toggles[notif.id]}
              onValueChange={() => handleToggle(notif.id)}
              trackColor={{ false: paperBorder, true: ink }}
              thumbColor={'#FFFEF8'}
              ios_backgroundColor={paperBorder}
            />
          </View>
        ))}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  headerWrap: { paddingHorizontal: 16 },
  scroll: {
    paddingHorizontal: 20,
    paddingTop: 16,
    gap: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    borderWidth: 1,
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 12,
  },
  rowText: { flex: 1, gap: 2 },
})
