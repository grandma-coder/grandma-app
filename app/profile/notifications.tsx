/**
 * Notifications Settings (Apr 2026 redesign)
 *
 * Cream canvas, paper card list, big Fraunces title with italic coral subtitle,
 * sticker-icon rows.
 */

import { useState, useEffect } from 'react'
import { View, ScrollView, Switch, StyleSheet, Pressable, Platform, Alert, AppState, Linking } from 'react-native'
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
import { useTranslation, type TranslationKey } from '../../lib/i18n'
import { SiteHeader, SiteEyebrow, SiteRow, SiteToggle } from '../../components/profile/SiteSettingsKit'
import type { SiteStickerName } from '../../components/stickers/SiteSticker'
import {
  getNotificationPrefs,
  saveNotificationPrefs,
  DEFAULT_NOTIFICATION_PREFS,
  getNotificationPermissionStatus,
  requestNotificationPermission,
  type NotificationPrefs,
  type NotificationPermissionStatus,
} from '../../lib/pushNotifications'
import { useBehaviorStore } from '../../store/useBehaviorStore'
import { useCycleSettingsStore } from '../../store/useCycleSettingsStore'
import { useCycleHistory } from '../../lib/cycleAnalytics'
import { resolvePeriodReminderEnabled } from '../../lib/cycleReminders'
import { dateLoc } from '../../lib/kpLocale'

type StickerName = 'sun' | 'sparkle' | 'star' | 'moon' | 'heart' | 'flower' | 'leaf'

// The toggle IDs are keys of NotificationPrefs (minus daily_reminder_time,
// which is edited via the inline time picker under the Daily Log Reminder row).
type ToggleId = Exclude<keyof NotificationPrefs, 'daily_reminder_time'>

interface NotifToggle {
  id: ToggleId
  label: TranslationKey
  description: TranslationKey
  group: 'daily' | 'health' | 'community'
  sticker: StickerName
}

const NOTIFICATION_SETTINGS: NotifToggle[] = [
  { id: 'daily_reminder', label: 'app_notif_dailyLog_label', description: 'app_notif_dailyLog_desc', group: 'daily', sticker: 'sun' },
  { id: 'insights', label: 'app_notif_insights_label', description: 'app_notif_insights_desc', group: 'daily', sticker: 'sparkle' },
  { id: 'weekly_summary', label: 'app_notif_weekly_label', description: 'app_notif_weekly_desc', group: 'daily', sticker: 'leaf' },
  { id: 'appointments', label: 'app_notif_appointments_label', description: 'app_notif_appointments_desc', group: 'health', sticker: 'star' },
  { id: 'cycle_predictions', label: 'app_notif_cycle_label', description: 'app_notif_cycle_desc', group: 'health', sticker: 'moon' },
  { id: 'milestones', label: 'app_notif_milestones_label', description: 'app_notif_milestones_desc', group: 'health', sticker: 'flower' },
  { id: 'care_circle', label: 'app_notif_careCircle_label', description: 'app_notif_careCircle_desc', group: 'community', sticker: 'heart' },
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
  return d.toLocaleTimeString(dateLoc(), { hour: 'numeric', minute: '2-digit' })
}

const SITE_STICKER: Record<StickerName, SiteStickerName> = {
  sun: 'pencil',
  sparkle: 'brain',
  star: 'cal',
  moon: 'drop',
  heart: 'love',
  flower: 'star',
  leaf: 'doc',
}

const GROUP_DEFS: { id: NotifToggle['group']; label: TranslationKey }[] = [
  { id: 'daily', label: 'app_notif_groupDaily' },
  { id: 'health', label: 'app_notif_groupHealth' },
  { id: 'community', label: 'app_notif_groupCommunity' },
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
  const GROUPS = GROUP_DEFS.map((g) => ({ ...g, label: t(g.label) }))

  // Only show toggles that actually do something: daily + weekly are scheduled on-device,
  // cycle predictions need the Cycle journey. The light look filters; Diffuse is left as it was.
  const enrolled = useBehaviorStore((st) => st.enrolledBehaviors)
  const cycleEnrolled = enrolled.includes('pre-pregnancy')
  const relevant = (id: ToggleId) => {
    if (diffuse) return true
    // Nothing reads these prefs to schedule or send a notification (the in-app list is
    // generated regardless; no push sender reads them), so a switch would be a lie.
    // The stored keys stay in profiles.notification_prefs. Re-enable when a sender exists.
    if (id === 'insights' || id === 'appointments' || id === 'milestones' || id === 'care_circle') return false
    if (id === 'cycle_predictions') return cycleEnrolled
    return true
  }
  const NOTIFS = NOTIFICATION_SETTINGS
    .filter((n) => relevant(n.id))
    .map((n) => ({ ...n, label: t(n.label), description: t(n.description) }))

  // "Cycle predictions" for a Cycle user IS the on-device period reminder (the
  // same switch as Cycle settings → Reminders) — the server pref alone sends nothing.
  const periodReminderPref = useCycleSettingsStore((st) => st.periodReminder)
  const setPeriodReminder = useCycleSettingsStore((st) => st.setPeriodReminder)
  const { data: cycleHistory } = useCycleHistory()
  const periodReminderOn = resolvePeriodReminderEnabled(periodReminderPref, !!cycleHistory?.cycles.length)
  const valueOf = (id: ToggleId): boolean =>
    !diffuse && id === 'cycle_predictions' && cycleEnrolled ? periodReminderOn : prefs[id]

  // OS permission — every toggle here is silent without it.
  const [permission, setPermission] = useState<NotificationPermissionStatus>('unavailable')
  useEffect(() => {
    let alive = true
    const refresh = () => { void getNotificationPermissionStatus().then((p) => { if (alive) setPermission(p) }) }
    refresh()
    // Back from the phone's Settings app → pick up a newly granted permission.
    const sub = AppState.addEventListener('change', (st) => { if (st === 'active') refresh() })
    return () => { alive = false; sub.remove() }
  }, [])
  async function askPermission() {
    const granted = await requestNotificationPermission()
    setPermission(granted ? 'granted' : await getNotificationPermissionStatus())
    // Now that alerts can be delivered, schedule the local ones from the saved prefs.
    // (only once the saved prefs are loaded — before that `prefs` is the defaults)
    if (granted && hydrated) void saveNotificationPrefs(prefs)
  }
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
      // Saved prefs couldn't be read: stay un-hydrated so a tap can't write the defaults over them.
      .catch(() => { if (alive) Alert.alert(t('common_error'), t('common_checkConnection')) })
    return () => { alive = false }
  }, [])

  // Apply a change optimistically, then persist (+ reschedule) in the background.
  function apply(next: NotificationPrefs) {
    const prev = prefs
    setPrefs(next)
    // saveNotificationPrefs returns false on failure (it doesn't throw); ignoring it left the toggle
    // showing OFF while the server and the local schedule kept the old setting.
    saveNotificationPrefs(next)
      .then((ok) => {
        if (!ok) {
          setPrefs(prev)
          Alert.alert(t('common_error'), t('common_tryAgain'))
        }
      })
      .catch(() => {
        setPrefs(prev)
        Alert.alert(t('common_error'), t('common_tryAgain'))
      })
  }

  function handleToggle(id: ToggleId) {
    // Before the saved prefs arrive, a tap would write the defaults over them.
    if (!hydrated) return
    if (!diffuse && id === 'cycle_predictions' && cycleEnrolled) {
      const next = !periodReminderOn
      // CycleHome's reminder sync watches this store and (re)schedules / cancels.
      setPeriodReminder(next)
      apply({ ...prefs, cycle_predictions: next })
      return
    }
    apply({ ...prefs, [id]: !prefs[id] })
  }

  function handleTimeChange(_e: DateTimePickerEvent, date?: Date) {
    if (Platform.OS !== 'ios') setShowTimePicker(false)
    if (date && hydrated) apply({ ...prefs, daily_reminder_time: dateToTime(date) })
  }

  return (
    <View style={[styles.root, { backgroundColor: diffuse ? dt.colors.bg : colors.bg }]}>
      {diffuse ? (
        <View style={[styles.headerWrap, { paddingTop: insets.top + 8 }]}>
          <ScreenHeader title="" />
        </View>
      ) : (
        <SiteHeader title={t('notifications_title')} sticker="bell" subtitle={t('notificationsSettings_subtitle')} />
      )}

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Big serif title */}
        {diffuse && <View style={styles.titleBlock}>
          <Display size={34} color={diffuse ? dt.colors.ink : colors.text}>{t('notifications_title')}</Display>
          <DisplayItalic size={18} color={diffuse ? accent : stickers.coral} style={{ marginTop: 6 }}>
            {t('notificationsSettings_subtitle')}
          </DisplayItalic>
        </View>}

        {!diffuse && permission === 'undetermined' && (
          <SiteRow
            sticker="bell"
            label={t('cycleSettings_reminderAllow')}
            desc={t('notifSettings_permAllowDesc')}
            onPress={() => void askPermission()}
            last
          />
        )}
        {!diffuse && permission === 'denied' && (
          <SiteRow
            sticker="bell"
            label={t('cycleSettings_reminderDenied')}
            desc={t('cycleSettings_reminderDeniedDesc')}
            onPress={() => void Linking.openSettings()}
            last
          />
        )}

        {!diffuse && GROUPS.map((group) => {
          const items = NOTIFS.filter((n) => n.group === group.id)
          if (items.length === 0) return null
          return (
            <View key={group.id}>
              <SiteEyebrow>{group.label}</SiteEyebrow>
              {items.map((notif, i) => (
                <View key={notif.id}>
                  <SiteRow
                    sticker={SITE_STICKER[notif.sticker]}
                    label={notif.label}
                    desc={notif.description}
                    right={<SiteToggle value={valueOf(notif.id)} onValueChange={() => handleToggle(notif.id)} label={notif.label} />}
                    last={i === items.length - 1 && !(notif.id === 'daily_reminder' && prefs.daily_reminder)}
                  />
                  {notif.id === 'daily_reminder' && prefs.daily_reminder && (
                    <View style={[styles.timeRow, { paddingLeft: 42, borderBottomWidth: i === items.length - 1 ? 0 : 1, borderBottomColor: colors.border }]}>
                      <Pressable
                        onPress={() => setShowTimePicker((s) => !s)}
                        style={[styles.timePill, { backgroundColor: colors.surface, borderColor: colors.text, borderWidth: 1.5 }]}
                        accessibilityLabel={t('app_notif_setTimeA11y')}
                      >
                        <Body size={13} color={colors.textMuted} style={{ fontFamily: font.bodyMedium }}>{t('app_notif_remindAt') + ' '}</Body>
                        <Body size={14} color={colors.text} style={{ fontFamily: font.bodyBold }}>{formatTime(prefs.daily_reminder_time)}</Body>
                      </Pressable>
                      {showTimePicker && (
                        <DateTimePicker
                          value={timeToDate(prefs.daily_reminder_time)}
                          mode="time"
                          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                          themeVariant={isDark ? 'dark' : 'light'}
                          accentColor={colors.text}
                          style={{ height: 140 }}
                          onChange={handleTimeChange}
                        />
                      )}
                    </View>
                  )}
                </View>
              ))}
            </View>
          )
        })}

        {diffuse && GROUPS.map((group) => {
          const items = NOTIFS.filter((n) => n.group === group.id)
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
                          accessibilityLabel={t('a11y_dailyReminderTime')}
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
