/**
 * Notifications Settings (Apr 2026 redesign)
 *
 * Cream canvas, paper card list, big Fraunces title with italic coral subtitle,
 * sticker-icon rows.
 */

import { useState, useEffect } from 'react'
import { View, ScrollView, Switch, StyleSheet, Pressable, Platform } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker'
import { useTheme, getModeColor, useDiffuseTheme, getDiffuseAccent, diffuseFont } from '../../constants/theme'
import { useModeStore } from '../../store/useModeStore'
import { ScreenHeader } from '../../components/ui/ScreenHeader'
import { Display, DisplayItalic, Body, MonoCaps } from '../../components/ui/Typography'
import { Sun, Sparkle, Star, Moon, Heart, Flower, Leaf } from '../../components/ui/Stickers'
import { Character, type CharacterName } from '../../components/characters/Characters'
import { useIsDiffuse } from '../../components/ui/diffuse/DiffuseKit'
import { DiffuseBloomIcon } from '../../components/ui/diffuse/DiffusePrimitives'
import { useTranslation } from '../../lib/i18n'
import {
  getNotificationPrefs,
  saveNotificationPrefs,
  DEFAULT_NOTIFICATION_PREFS,
  type NotificationPrefs,
} from '../../lib/pushNotifications'

type StickerName = 'sun' | 'sparkle' | 'star' | 'moon' | 'heart' | 'flower' | 'leaf'

// The toggle IDs are keys of NotificationPrefs (minus daily_reminder_time,
// which is edited via the inline time picker under the Daily Log Reminder row).
type ToggleId = Exclude<keyof NotificationPrefs, 'daily_reminder_time'>

interface NotifToggle {
  id: ToggleId
  label: string
  description: string
  group: 'daily' | 'health' | 'community'
  sticker: StickerName
}

const NOTIFICATION_SETTINGS: NotifToggle[] = [
  { id: 'daily_reminder', label: 'Daily Log Reminder', description: 'Remind me to log each day', group: 'daily', sticker: 'sun' },
  { id: 'insights', label: 'New Insights', description: 'When Grandma generates new insights', group: 'daily', sticker: 'sparkle' },
  { id: 'weekly_summary', label: 'Weekly Summary', description: 'Weekly digest of activity and insights', group: 'daily', sticker: 'leaf' },
  { id: 'appointments', label: 'Appointment Reminders', description: 'Before scheduled appointments', group: 'health', sticker: 'star' },
  { id: 'cycle_predictions', label: 'Cycle Predictions', description: 'Period and fertile window alerts', group: 'health', sticker: 'moon' },
  { id: 'milestones', label: 'Milestone Alerts', description: 'Upcoming developmental milestones', group: 'health', sticker: 'flower' },
  { id: 'care_circle', label: 'Care Circle Updates', description: 'When caregivers log activities', group: 'community', sticker: 'heart' },
]

// "HH:MM" ↔ Date helpers for the daily-reminder time picker.
function timeToDate(hhmm: string): Date {
  const [h, m] = (hhmm || '20:00').split(':').map((n) => parseInt(n, 10))
  const d = new Date()
  d.setHours(Number.isFinite(h) ? h : 20, Number.isFinite(m) ? m : 0, 0, 0)
  return d
}
function dateToTime(d: Date): string {
  const h = String(d.getHours()).padStart(2, '0')
  const m = String(d.getMinutes()).padStart(2, '0')
  return `${h}:${m}`
}
function formatTime(hhmm: string): string {
  const d = timeToDate(hhmm)
  return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}

const GROUPS: { id: NotifToggle['group']; label: string }[] = [
  { id: 'daily', label: 'Daily' },
  { id: 'health', label: 'Health' },
  { id: 'community', label: 'Community' },
]

// Character-blob concept per sticker, for the Diffuse branch — chosen for the
// row's meaning, not the legacy sticker shape. The blob sits inside the bloom
// (which carries the sticker's semantic hue).
const DIFFUSE_CHARACTER: Record<StickerName, CharacterName> = {
  sun: 'sun',          // daily reminder
  sparkle: 'sparkle',  // new insights
  star: 'calendar',    // appointment reminders
  moon: 'period',      // cycle predictions
  heart: 'community',  // care-circle updates
  flower: 'growth',    // milestone alerts
  leaf: 'calendar',    // weekly summary
}

function StickerFor({ name, size = 34 }: { name: StickerName; size?: number }) {
  const { stickers } = useTheme()
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()

  if (diffuse) {
    const bloom: Record<StickerName, string> = {
      sun: dt.stickers.yellow,
      sparkle: dt.stickers.yellow,
      star: dt.stickers.blue,
      moon: dt.stickers.lilac,
      heart: dt.stickers.pink,
      flower: dt.stickers.pink,
      leaf: dt.stickers.green,
    }
    return (
      <DiffuseBloomIcon color={bloom[name]} size={size} intensity={0.5}>
        <Character name={DIFFUSE_CHARACTER[name]} size={Math.round(size * 0.62)} />
      </DiffuseBloomIcon>
    )
  }

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
  const { colors, font, stickers, radius, spacing, isDark } = useTheme()
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
  const { t } = useTranslation()
  const insets = useSafeAreaInsets()
  const mode = useModeStore((s) => s.mode)
  const accent = diffuse ? getDiffuseAccent(mode, dt.isDark) : getModeColor(mode, isDark)

  // Prefs live in profiles.notification_prefs (server-readable so the command
  // center + local scheduling both honor them). saveNotificationPrefs persists
  // AND re-syncs on-device schedules.
  const [prefs, setPrefs] = useState<NotificationPrefs>(DEFAULT_NOTIFICATION_PREFS)
  const [hydrated, setHydrated] = useState(false)
  const [showTimePicker, setShowTimePicker] = useState(false)

  useEffect(() => {
    let alive = true
    getNotificationPrefs()
      .then((p) => { if (alive) { setPrefs(p); setHydrated(true) } })
      .catch(() => { if (alive) setHydrated(true) })
    return () => { alive = false }
  }, [])

  // Apply a change optimistically, then persist (+ reschedule) in the background.
  function apply(next: NotificationPrefs) {
    setPrefs(next)
    saveNotificationPrefs(next).catch(() => {})
  }

  function handleToggle(id: ToggleId) {
    apply({ ...prefs, [id]: !prefs[id] })
  }

  function handleTimeChange(_e: DateTimePickerEvent, date?: Date) {
    if (Platform.OS !== 'ios') setShowTimePicker(false)
    if (date) apply({ ...prefs, daily_reminder_time: dateToTime(date) })
  }

  return (
    <View style={[styles.root, { backgroundColor: diffuse ? dt.colors.bg : colors.bg }]}>
      <View style={[styles.headerWrap, { paddingTop: insets.top + 8 }]}>
        <ScreenHeader title="" />
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Big serif title */}
        <View style={styles.titleBlock}>
          <Display size={34} color={diffuse ? dt.colors.ink : colors.text}>{t('notifications_title')}</Display>
          <DisplayItalic size={18} color={diffuse ? accent : stickers.coral} style={{ marginTop: 6 }}>
            {t('notificationsSettings_subtitle')}
          </DisplayItalic>
        </View>

        {GROUPS.map((group) => {
          const items = NOTIFICATION_SETTINGS.filter((n) => n.group === group.id)
          return (
            <View key={group.id} style={{ marginBottom: spacing.lg }}>
              <View style={{ marginTop: spacing.sm, marginBottom: spacing.sm }}>
                <MonoCaps color={diffuse ? dt.colors.ink3 : colors.textMuted} style={{ letterSpacing: 1.5 }}>
                  {group.label}
                </MonoCaps>
              </View>
              <View style={[
                styles.card,
                diffuse
                  ? { backgroundColor: dt.colors.surface, borderColor: dt.colors.line, borderRadius: radius.lg }
                  : { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg },
              ]}>
                {items.map((notif, i) => (
                  <View key={notif.id}>
                    <View style={styles.row}>
                      <View style={styles.stickerWrap}>
                        <StickerFor name={notif.sticker} size={34} />
                      </View>
                      <View style={styles.rowText}>
                        <Body
                          size={16}
                          color={diffuse ? dt.colors.ink : colors.text}
                          style={{ fontFamily: diffuse ? diffuseFont.bodySemiBold : font.bodySemiBold, marginBottom: 2 }}
                        >
                          {notif.label}
                        </Body>
                        <Body
                          size={13}
                          color={diffuse ? dt.colors.ink3 : colors.textMuted}
                          style={{ fontFamily: diffuse ? diffuseFont.body : font.body }}
                        >
                          {notif.description}
                        </Body>
                      </View>
                      <Switch
                        value={prefs[notif.id]}
                        onValueChange={() => handleToggle(notif.id)}
                        trackColor={{ false: diffuse ? dt.colors.line2 : colors.borderStrong, true: accent }}
                        thumbColor={diffuse ? dt.colors.surface : colors.surface}
                        ios_backgroundColor={diffuse ? dt.colors.line2 : colors.borderStrong}
                        accessibilityLabel={notif.label}
                      />
                    </View>

                    {/* Inline time picker for the daily log reminder */}
                    {notif.id === 'daily_reminder' && prefs.daily_reminder && (
                      <View style={styles.timeRow}>
                        <Pressable
                          onPress={() => setShowTimePicker((s) => !s)}
                          style={[
                            styles.timePill,
                            {
                              backgroundColor: diffuse ? 'transparent' : colors.surfaceRaised,
                              borderColor: diffuse ? dt.colors.line2 : colors.border,
                            },
                          ]}
                          accessibilityLabel="Set daily reminder time"
                        >
                          <Body size={13} color={diffuse ? dt.colors.ink3 : colors.textMuted} style={{ fontFamily: diffuse ? diffuseFont.mono : font.bodyMedium }}>
                            {'Remind me at '}
                          </Body>
                          <Body size={14} color={diffuse ? dt.colors.ink : colors.text} style={{ fontFamily: diffuse ? diffuseFont.monoBold : font.bodySemiBold }}>
                            {formatTime(prefs.daily_reminder_time)}
                          </Body>
                        </Pressable>
                        {showTimePicker && (
                          <DateTimePicker
                            value={timeToDate(prefs.daily_reminder_time)}
                            mode="time"
                            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                            themeVariant={(diffuse ? dt.isDark : isDark) ? 'dark' : 'light'}
                            accentColor={accent}
                            style={{ height: 140 }}
                            onChange={handleTimeChange}
                          />
                        )}
                      </View>
                    )}

                    {i < items.length - 1 && (
                      <View style={[styles.divider, { backgroundColor: diffuse ? dt.colors.line : colors.borderLight }]} />
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
  timeRow: { paddingHorizontal: 18, paddingBottom: 14, paddingLeft: 68 },
  timePill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
  },
})
