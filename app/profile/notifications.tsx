/**
 * Notifications Settings (Apr 2026 redesign)
 *
 * Cream canvas, paper card list, big Fraunces title with italic coral subtitle,
 * sticker-icon rows.
 */

import { useState } from 'react'
import { View, ScrollView, Switch, StyleSheet } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme } from '../../constants/theme'
import { ScreenHeader } from '../../components/ui/ScreenHeader'
import { Display, DisplayItalic, Body, MonoCaps } from '../../components/ui/Typography'
import { Sun, Sparkle, Star, Moon, Heart, Flower, Leaf } from '../../components/ui/Stickers'

type StickerName = 'sun' | 'sparkle' | 'star' | 'moon' | 'heart' | 'flower' | 'leaf'

interface NotifToggle {
  id: string
  label: string
  description: string
  default: boolean
  group: 'daily' | 'health' | 'community'
  sticker: StickerName
}

const NOTIFICATION_SETTINGS: NotifToggle[] = [
  { id: 'daily_reminder', label: 'Daily Log Reminder', description: 'Remind me to log each day', default: true, group: 'daily', sticker: 'sun' },
  { id: 'insights', label: 'New Insights', description: 'When Grandma generates new insights', default: true, group: 'daily', sticker: 'sparkle' },
  { id: 'weekly_summary', label: 'Weekly Summary', description: 'Weekly digest of activity and insights', default: false, group: 'daily', sticker: 'leaf' },
  { id: 'appointments', label: 'Appointment Reminders', description: 'Before scheduled appointments', default: true, group: 'health', sticker: 'star' },
  { id: 'cycle_predictions', label: 'Cycle Predictions', description: 'Period and fertile window alerts', default: true, group: 'health', sticker: 'moon' },
  { id: 'milestones', label: 'Milestone Alerts', description: 'Upcoming developmental milestones', default: false, group: 'health', sticker: 'flower' },
  { id: 'care_circle', label: 'Care Circle Updates', description: 'When caregivers log activities', default: true, group: 'community', sticker: 'heart' },
]

const GROUPS: { id: NotifToggle['group']; label: string }[] = [
  { id: 'daily', label: 'Daily' },
  { id: 'health', label: 'Health' },
  { id: 'community', label: 'Community' },
]

function StickerFor({ name, size = 34 }: { name: StickerName; size?: number }) {
  const { stickers } = useTheme()
  switch (name) {
    case 'sun': return <Sun size={size} fill={stickers.yellow} />
    case 'sparkle': return <Sparkle size={size} fill={stickers.yellow} />
    case 'star': return <Star size={size} fill={stickers.blue} />
    case 'moon': return <Moon size={size} fill={stickers.lilac} />
    case 'heart': return <Heart size={size} fill={stickers.pink} />
    case 'flower': return <Flower size={size} petal={stickers.pink} center={stickers.yellow} />
    case 'leaf': return <Leaf size={size} fill={stickers.green} />
  }
}

export default function NotificationsScreen() {
  const { colors, font, brand, stickers, radius, spacing } = useTheme()
  const insets = useSafeAreaInsets()

  const [toggles, setToggles] = useState<Record<string, boolean>>(
    Object.fromEntries(NOTIFICATION_SETTINGS.map((n) => [n.id, n.default]))
  )

  function handleToggle(id: string) {
    setToggles((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      <View style={[styles.headerWrap, { paddingTop: insets.top + 8 }]}>
        <ScreenHeader title="" />
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Big Fraunces title */}
        <View style={styles.titleBlock}>
          <Display size={34} color={colors.text}>Notifications</Display>
          <DisplayItalic size={18} color={stickers.coral} style={{ marginTop: 6 }}>
            how grandma reaches you
          </DisplayItalic>
        </View>

        {GROUPS.map((group) => {
          const items = NOTIFICATION_SETTINGS.filter((n) => n.group === group.id)
          return (
            <View key={group.id} style={{ marginBottom: spacing.lg }}>
              <View style={{ marginTop: spacing.sm, marginBottom: spacing.sm }}>
                <MonoCaps color={colors.textMuted} style={{ letterSpacing: 1.5 }}>
                  {group.label}
                </MonoCaps>
              </View>
              <View style={[
                styles.card,
                { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg },
              ]}>
                {items.map((notif, i) => (
                  <View key={notif.id}>
                    <View style={styles.row}>
                      <View style={styles.stickerWrap}>
                        <StickerFor name={notif.sticker} size={34} />
                      </View>
                      <View style={styles.rowText}>
                        <Body size={16} color={colors.text} style={{ fontFamily: font.bodySemiBold, marginBottom: 2 }}>
                          {notif.label}
                        </Body>
                        <Body size={13} color={colors.textMuted} style={{ fontFamily: font.body }}>
                          {notif.description}
                        </Body>
                      </View>
                      <Switch
                        value={toggles[notif.id]}
                        onValueChange={() => handleToggle(notif.id)}
                        trackColor={{ false: colors.borderStrong, true: brand.pregnancy }}
                        thumbColor="#FFFFFF"
                        ios_backgroundColor={colors.borderStrong}
                      />
                    </View>
                    {i < items.length - 1 && (
                      <View style={[styles.divider, { backgroundColor: colors.borderLight }]} />
                    )}
                  </View>
                ))}
              </View>
            </View>
          )
        })}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  headerWrap: { paddingHorizontal: 16 },
  scroll: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  titleBlock: {
    marginTop: 4,
    marginBottom: 18,
    paddingHorizontal: 4,
  },
  card: {
    borderWidth: 1,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 18,
    gap: 12,
  },
  stickerWrap: {
    width: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: { flex: 1, gap: 2 },
  divider: { height: 1, marginHorizontal: 20 },
})
