/**
 * Cycle settings (Phase 2 / cycle completeness). Lets the user override the
 * cycle parameters the fertility engine uses: average cycle length, period
 * length, and luteal-phase length. Persisted in useCycleSettingsStore; read by
 * CycleHome + CycleCalendar (override the measured average + old hardcoded 5/14).
 *
 * Cream + diffuse. Stepper rows (− value +) — simple, dual-themed, no slider dep.
 */

import { useEffect, useState } from 'react'
import { View, Text, Pressable, ScrollView, Switch, StyleSheet, AppState, Linking } from 'react-native'
import { Minus, Plus } from 'lucide-react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme, useDiffuseTheme, diffuseFont, getModeColorSoft } from '../../constants/theme'
import { useTranslation } from '../../lib/i18n'
import { ScreenHeader } from '../../components/ui/ScreenHeader'
import { Display, DisplayItalic, MonoCaps } from '../../components/ui/Typography'
import { useIsDiffuse } from '../../components/ui/diffuse/DiffuseKit'
import { SiteHeader, SiteEyebrow, SiteToggle, SiteRow } from '../../components/profile/SiteSettingsKit'
import { SiteChoice } from '../../components/ui/SiteChoice'
import {
  useCycleSettingsStore,
  CYCLE_LENGTH_RANGE, PERIOD_LENGTH_RANGE, LUTEAL_RANGE,
  REMINDER_DAYS_OPTIONS, type ReminderDaysBefore,
} from '../../store/useCycleSettingsStore'
import { useCycleHistory } from '../../lib/cycleAnalytics'
import { resolvePeriodReminderEnabled, resyncPeriodReminder, syncPeriodReminder } from '../../lib/cycleReminders'
import {
  getNotificationPermissionStatus, requestNotificationPermission, type NotificationPermissionStatus,
} from '../../lib/pushNotifications'

export default function CycleSettingsScreen() {
  const { colors, font, stickers, radius } = useTheme()
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
  const insets = useSafeAreaInsets()
  const { t } = useTranslation()

  const s = useCycleSettingsStore()

  const ink = diffuse ? dt.colors.ink : colors.text
  const inkMuted = diffuse ? dt.colors.ink3 : colors.textMuted
  const line = diffuse ? dt.colors.line : colors.borderLight
  const accent = diffuse ? dt.stickers.pink : stickers.pink
  const cardBg = diffuse ? dt.colors.surface : colors.surface
  const cardBorder = diffuse ? dt.colors.line : colors.border

  const autoCycle = s.cycleLength === null

  // ── Period reminder ──
  // Default ON once there is cycle history (store keeps null until the user
  // chooses). Permission is only requested from a user action here — never on
  // launch; the background sync in CycleHome just skips when not granted.
  const { data: history } = useCycleHistory()
  const reminderOn = resolvePeriodReminderEnabled(s.periodReminder, !!history?.cycles.length)
  const [permission, setPermission] = useState<NotificationPermissionStatus>('unavailable')
  useEffect(() => {
    let alive = true
    const refresh = () => { void getNotificationPermissionStatus().then((p) => { if (alive) setPermission(p) }) }
    refresh()
    // Back from the OS Settings app → pick up a newly granted permission.
    const sub = AppState.addEventListener('change', (st) => { if (st === 'active') refresh() })
    return () => { alive = false; sub.remove() }
  }, [])

  async function askPermission() {
    const granted = await requestNotificationPermission()
    setPermission(granted ? 'granted' : await getNotificationPermissionStatus())
    if (granted) void resyncPeriodReminder(history)
  }

  function onReminderToggle(on: boolean) {
    s.setPeriodReminder(on)
    if (!on) {
      void syncPeriodReminder(null) // cancel right away
      return
    }
    if (permission !== 'granted') void askPermission()
    else void resyncPeriodReminder(history)
  }

  function onDaysBeforeChange(n: ReminderDaysBefore) {
    s.setPeriodReminderDaysBefore(n)
    void resyncPeriodReminder(history)
  }

  function Stepper({
    label, desc, value, unit, min, max, onChange, disabled,
  }: {
    label: string; desc?: string; value: number; unit: string
    min: number; max: number; onChange: (n: number) => void; disabled?: boolean
  }) {
    const dec = () => onChange(Math.max(min, value - 1))
    const inc = () => onChange(Math.min(max, value + 1))
    const btn = (active: boolean, onPress: () => void, icon: React.ReactNode) => (
      <Pressable
        onPress={active ? onPress : undefined}
        style={({ pressed }) => [
          styles.stepBtn,
          diffuse
            ? { borderColor: line, backgroundColor: 'transparent' }
            : { borderColor: colors.text, borderWidth: 1.5, backgroundColor: colors.surface },
          { opacity: active ? (pressed ? 0.6 : 1) : 0.35 },
        ]}
      >
        {icon}
      </Pressable>
    )
    return (
      <View style={[styles.row, !diffuse && { paddingHorizontal: 0 }, disabled && { opacity: 0.4 }]}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.rowLabel, { color: ink, fontFamily: diffuse ? diffuseFont.bodySemiBold : font.bodySemiBold }]}>{label}</Text>
          {desc ? <Text style={[styles.rowDesc, { color: inkMuted, fontFamily: diffuse ? diffuseFont.body : font.body }]}>{desc}</Text> : null}
        </View>
        <View style={styles.stepper}>
          {btn(!disabled && value > min, dec, <Minus size={16} color={ink} strokeWidth={2} />)}
          <Text style={[styles.stepValue, { color: ink, fontFamily: diffuse ? diffuseFont.mono : font.displayBold }]}>
            {disabled ? '—' : `${value}`}<Text style={[styles.stepUnit, { color: inkMuted, fontFamily: diffuse ? diffuseFont.body : font.body }]}> {unit}</Text>
          </Text>
          {btn(!disabled && value < max, inc, <Plus size={16} color={ink} strokeWidth={2} />)}
        </View>
      </View>
    )
  }

  return (
    <View style={[styles.root, { backgroundColor: diffuse ? dt.colors.bg : colors.bg }]}>
      {diffuse ? (
        <View style={[styles.headerWrap, { paddingTop: insets.top + 8 }]}><ScreenHeader title="" /></View>
      ) : (
        <SiteHeader title={t('cycleSettings_title')} sticker="drop" subtitle={t('cycleSettings_subtitle')} />
      )}

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {!diffuse && (
          <View>
            <Text style={[styles.intro, { color: colors.textSecondary, fontFamily: font.body, paddingHorizontal: 0, fontSize: 15, marginTop: 4 }]}>
              {t('cycleSettings_intro')}
            </Text>

            <SiteEyebrow>{t('cycleSettings_sectionCycle')}</SiteEyebrow>
            <View style={styles.row2}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.rowLabel, { color: colors.text, fontFamily: font.bodySemiBold }]}>{t('cycleSettings_autoLabel')}</Text>
                <Text style={[styles.rowDesc, { color: colors.textMuted, fontFamily: font.body }]}>{t('cycleSettings_autoDesc')}</Text>
              </View>
              <SiteToggle value={autoCycle} onValueChange={(on) => s.setCycleLength(on ? null : 28)} label={t('cycleSettings_autoLabel')} />
            </View>
            <View style={[styles.hair, { backgroundColor: colors.border }]} />
            <Stepper
              label={t('cycleSettings_cycleLength')}
              value={s.cycleLength ?? 28}
              unit={t('cycleSettings_days')}
              min={CYCLE_LENGTH_RANGE.min}
              max={CYCLE_LENGTH_RANGE.max}
              onChange={s.setCycleLength}
              disabled={autoCycle}
            />

            <SiteEyebrow>{t('cycleSettings_sectionPhases')}</SiteEyebrow>
            <Stepper
              label={t('cycleSettings_periodLength')}
              desc={t('cycleSettings_periodDesc')}
              value={s.periodLength}
              unit={t('cycleSettings_days')}
              min={PERIOD_LENGTH_RANGE.min}
              max={PERIOD_LENGTH_RANGE.max}
              onChange={s.setPeriodLength}
            />
            <View style={[styles.hair, { backgroundColor: colors.border }]} />
            <Stepper
              label={t('cycleSettings_lutealLength')}
              desc={t('cycleSettings_lutealDesc')}
              value={s.lutealPhase}
              unit={t('cycleSettings_days')}
              min={LUTEAL_RANGE.min}
              max={LUTEAL_RANGE.max}
              onChange={s.setLutealPhase}
            />

            <SiteEyebrow>{t('cycleSettings_sectionReminders')}</SiteEyebrow>
            <SiteRow
              sticker="bell"
              label={t('cycleSettings_reminderLabel')}
              desc={t('cycleSettings_reminderDesc')}
              right={<SiteToggle value={reminderOn} onValueChange={onReminderToggle} label={t('cycleSettings_reminderLabel')} />}
              last={!reminderOn}
            />
            {reminderOn && (
              <>
                <SiteRow
                  label={t('cycleSettings_reminderDaysBefore')}
                  right={
                    <View style={styles.daysRow}>
                      {REMINDER_DAYS_OPTIONS.map((n) => (
                        <SiteChoice
                          key={n}
                          compact
                          tick={false}
                          label={String(n)}
                          selected={s.periodReminderDaysBefore === n}
                          onPress={() => onDaysBeforeChange(n)}
                          tone={getModeColorSoft('pre-pregnancy')}
                          style={styles.dayPill}
                        />
                      ))}
                    </View>
                  }
                  last={permission !== 'undetermined' && permission !== 'denied'}
                />
                {permission === 'undetermined' && (
                  <SiteRow
                    label={t('cycleSettings_reminderAllow')}
                    desc={t('cycleSettings_reminderAllowDesc')}
                    onPress={() => void askPermission()}
                    last
                  />
                )}
                {permission === 'denied' && (
                  <SiteRow
                    label={t('cycleSettings_reminderDenied')}
                    desc={t('cycleSettings_reminderDeniedDesc')}
                    onPress={() => void Linking.openSettings()}
                    last
                  />
                )}
              </>
            )}

            <Text style={[styles.footer, { color: colors.textMuted, fontFamily: font.body }]}>
              {t('cycleSettings_footer')}
            </Text>
          </View>
        )}

        {diffuse && (<>
        <View style={styles.titleBlock}>
          <Display size={32} color={ink}>{t('cycleSettings_title')}</Display>
          <DisplayItalic size={17} color={diffuse ? dt.colors.ink : stickers.coral} style={{ marginTop: 6 }}>
            {t('cycleSettings_subtitle')}
          </DisplayItalic>
        </View>

        <Text style={[styles.intro, { color: inkMuted, fontFamily: diffuse ? diffuseFont.body : font.body }]}>
          {t('cycleSettings_intro')}
        </Text>

        {/* Cycle length */}
        <View style={{ marginTop: 16 }}>
          <MonoCaps color={inkMuted} style={{ letterSpacing: 1.5 }}>{t('cycleSettings_sectionCycle')}</MonoCaps>
        </View>
        <View style={[styles.card, diffuse && styles.cardFlat, { backgroundColor: cardBg, borderColor: cardBorder, borderRadius: radius.lg }]}>
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.rowLabel, { color: ink, fontFamily: diffuse ? diffuseFont.bodySemiBold : font.bodySemiBold }]}>{t('cycleSettings_autoLabel')}</Text>
              <Text style={[styles.rowDesc, { color: inkMuted, fontFamily: diffuse ? diffuseFont.body : font.body }]}>{t('cycleSettings_autoDesc')}</Text>
            </View>
            <Switch
              value={autoCycle}
              onValueChange={(on) => s.setCycleLength(on ? null : 28)}
              trackColor={{ false: diffuse ? dt.colors.line2 : colors.borderStrong, true: accent }}
              thumbColor={diffuse ? dt.colors.surface : '#FFFFFF'}
              ios_backgroundColor={diffuse ? dt.colors.line2 : colors.borderStrong}
            />
          </View>
          <View style={[styles.divider, { backgroundColor: line }]} />
          <Stepper
            label={t('cycleSettings_cycleLength')}
            value={s.cycleLength ?? 28}
            unit={t('cycleSettings_days')}
            min={CYCLE_LENGTH_RANGE.min}
            max={CYCLE_LENGTH_RANGE.max}
            onChange={s.setCycleLength}
            disabled={autoCycle}
          />
        </View>

        {/* Period + luteal */}
        <View style={{ marginTop: 18 }}>
          <MonoCaps color={inkMuted} style={{ letterSpacing: 1.5 }}>{t('cycleSettings_sectionPhases')}</MonoCaps>
        </View>
        <View style={[styles.card, diffuse && styles.cardFlat, { backgroundColor: cardBg, borderColor: cardBorder, borderRadius: radius.lg }]}>
          <Stepper
            label={t('cycleSettings_periodLength')}
            desc={t('cycleSettings_periodDesc')}
            value={s.periodLength}
            unit={t('cycleSettings_days')}
            min={PERIOD_LENGTH_RANGE.min}
            max={PERIOD_LENGTH_RANGE.max}
            onChange={s.setPeriodLength}
          />
          <View style={[styles.divider, { backgroundColor: line }]} />
          <Stepper
            label={t('cycleSettings_lutealLength')}
            desc={t('cycleSettings_lutealDesc')}
            value={s.lutealPhase}
            unit={t('cycleSettings_days')}
            min={LUTEAL_RANGE.min}
            max={LUTEAL_RANGE.max}
            onChange={s.setLutealPhase}
          />
        </View>

        {/* Period reminder — the opt-out must exist in every look. */}
        <View style={{ marginTop: 18 }}>
          <MonoCaps color={inkMuted} style={{ letterSpacing: 1.5 }}>{t('cycleSettings_sectionReminders')}</MonoCaps>
        </View>
        <View style={[styles.card, diffuse && styles.cardFlat, { backgroundColor: cardBg, borderColor: cardBorder, borderRadius: radius.lg }]}>
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.rowLabel, { color: ink, fontFamily: diffuse ? diffuseFont.bodySemiBold : font.bodySemiBold }]}>{t('cycleSettings_reminderLabel')}</Text>
              <Text style={[styles.rowDesc, { color: inkMuted, fontFamily: diffuse ? diffuseFont.body : font.body }]}>{t('cycleSettings_reminderDesc')}</Text>
            </View>
            <Switch
              value={reminderOn}
              onValueChange={onReminderToggle}
              trackColor={{ false: diffuse ? dt.colors.line2 : colors.borderStrong, true: accent }}
              thumbColor={diffuse ? dt.colors.surface : '#FFFFFF'}
              ios_backgroundColor={diffuse ? dt.colors.line2 : colors.borderStrong}
            />
          </View>
          {reminderOn && (
            <>
              <View style={[styles.divider, { backgroundColor: line }]} />
              <Stepper
                label={t('cycleSettings_reminderDaysBefore')}
                value={s.periodReminderDaysBefore}
                unit={t('cycleSettings_days')}
                min={REMINDER_DAYS_OPTIONS[0]}
                max={REMINDER_DAYS_OPTIONS[REMINDER_DAYS_OPTIONS.length - 1]}
                onChange={(n) => onDaysBeforeChange(n as ReminderDaysBefore)}
              />
            </>
          )}
        </View>

        <Text style={[styles.footer, { color: inkMuted, fontFamily: diffuse ? diffuseFont.body : font.body }]}>
          {t('cycleSettings_footer')}
        </Text>
        </>)}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  headerWrap: { paddingHorizontal: 16 },
  scroll: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 48 },
  titleBlock: { marginTop: 4, marginBottom: 12, paddingHorizontal: 4 },
  intro: { fontSize: 14, lineHeight: 21, paddingHorizontal: 4 },
  card: {
    padding: 4, marginTop: 8, borderWidth: 1,
    shadowColor: '#141313', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 2,
  },
  cardFlat: { shadowOpacity: 0, elevation: 0 },
  hair: { height: 1 },
  row2: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, gap: 12 },
  divider: { height: 1, marginHorizontal: 18 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 18, gap: 12 },
  rowLabel: { fontSize: 15 },
  rowDesc: { fontSize: 12, marginTop: 2, lineHeight: 16 },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stepBtn: { width: 34, height: 34, borderRadius: 17, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  stepValue: { fontSize: 19, minWidth: 58, textAlign: 'center' },
  stepUnit: { fontSize: 12 },
  daysRow: { flexDirection: 'row', gap: 8 },
  dayPill: { minWidth: 44 },
  footer: { fontSize: 12, textAlign: 'center', marginTop: 22, lineHeight: 18, paddingHorizontal: 20 },
})
