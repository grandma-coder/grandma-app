/**
 * Notifications Settings — toggle notification types.
 */

import { useState } from 'react'
import {
  View,
  Text,
  Pressable,
  ScrollView,
  Switch,
  StyleSheet,
} from 'react-native'
import { router } from 'expo-router'
import { ArrowLeft, Bell } from 'lucide-react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme, brand } from '../../constants/theme'

interface NotifToggle {
  id: string
  label: string
  description: string
  default: boolean
}

const NOTIFICATION_SETTINGS: NotifToggle[] = [
  { id: 'daily_reminder', label: 'Daily Log Reminder', description: 'Remind me to log activities each day', default: true },
  { id: 'insights', label: 'New Insights', description: 'When Grandma generates new insights', default: true },
  { id: 'appointments', label: 'Appointment Reminders', description: 'Remind me before scheduled appointments', default: true },
  { id: 'cycle_predictions', label: 'Cycle Predictions', description: 'Period and fertile window alerts', default: true },
  { id: 'care_circle', label: 'Care Circle Updates', description: 'When caregivers log activities', default: true },
  { id: 'milestones', label: 'Milestone Alerts', description: 'Upcoming developmental milestones', default: false },
  { id: 'weekly_summary', label: 'Weekly Summary', description: 'Weekly digest of activity and insights', default: false },
]

export default function NotificationsScreen() {
  const { colors, radius } = useTheme()
  const insets = useSafeAreaInsets()

  const [toggles, setToggles] = useState<Record<string, boolean>>(
    Object.fromEntries(NOTIFICATION_SETTINGS.map((n) => [n.id, n.default]))
  )

  function handleToggle(id: string) {
    setToggles((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={24} color={colors.text} />
        </Pressable>
        <Text style={[styles.title, { color: colors.text }]}>Notifications</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={[styles.card, { backgroundColor: colors.surface, borderRadius: radius.xl }]}>
          {NOTIFICATION_SETTINGS.map((notif, i) => (
            <View
              key={notif.id}
              style={[
                styles.row,
                i < NOTIFICATION_SETTINGS.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.borderLight },
              ]}
            >
              <View style={styles.rowText}>
                <Text style={[styles.rowLabel, { color: colors.text }]}>{notif.label}</Text>
                <Text style={[styles.rowDesc, { color: colors.textMuted }]}>{notif.description}</Text>
              </View>
              <Switch
                value={toggles[notif.id]}
                onValueChange={() => handleToggle(notif.id)}
                trackColor={{ false: colors.surfaceRaised, true: colors.primary + '60' }}
                thumbColor={toggles[notif.id] ? colors.primary : colors.textMuted}
              />
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 12 },
  backBtn: { width: 40, alignItems: 'center' },
  title: { fontSize: 18, fontWeight: '700' },
  scroll: { paddingHorizontal: 20, paddingBottom: 40 },
  card: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 16, gap: 12 },
  rowText: { flex: 1, gap: 2 },
  rowLabel: { fontSize: 15, fontWeight: '600' },
  rowDesc: { fontSize: 12, fontWeight: '400' },
})
