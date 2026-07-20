/**
 * LogActivitySheet — the shared "what do you want to log?" launcher.
 *
 * A bottom sheet of quick-log tiles (temperature, symptoms, mood, intimacy,
 * period, …). Tapping a tile calls onSelect(type); the host then opens the
 * matching LogSheet + CycleLogForms for the active date.
 *
 * Extracted from CycleCalendar so the Cycle HOME and the Calendar tab share ONE
 * logging launcher — a woman can backfill a past day from either surface with
 * the identical flow. Both import LogType + LOG_ENTRIES from here.
 */
import { View, Text, Pressable, Modal, StyleSheet } from 'react-native'
import { X } from 'lucide-react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme, useDiffuseTheme, diffuseFont } from '../../constants/theme'
import { useIsDiffuse } from '../ui/diffuse/DiffuseKit'
import { useTranslation } from '../../lib/i18n'
import type { TranslationKeys } from '../../lib/i18n/keys'
import { Display } from '../ui/Typography'
import { LogTile, LogTileGrid } from './LogTile'
import { logSticker } from './logStickers'
import { Character } from '../characters/Characters'
import { DIFFUSE_LOG_CHARACTER, diffuseLogHue } from './DiffuseLogTimeline'

export type LogType =
  | 'period_start' | 'period_end' | 'symptom' | 'mood' | 'basal_temp'
  | 'intercourse' | 'exam' | 'pregnancy_test' | 'sex_drive' | 'clots'
  | 'weight' | 'water' | 'activity' | 'lh' | 'cm'

interface LogEntry {
  id: LogType
  labelKey: keyof TranslationKeys
  subtitleKey: keyof TranslationKeys
  tint: string
}

export const LOG_ENTRIES: LogEntry[] = [
  { id: 'basal_temp',   labelKey: 'cycleCalendar_logEntry_temperature',  subtitleKey: 'cycleCalendar_logEntry_temperatureSub', tint: 'temperature' },
  { id: 'lh',           labelKey: 'cycleCalendar_logEntry_lh',           subtitleKey: 'cycleCalendar_logEntry_lhSub',           tint: 'ovulation' },
  { id: 'cm',           labelKey: 'cycleCalendar_logEntry_cm',           subtitleKey: 'cycleCalendar_logEntry_cmSub',           tint: 'symptom' },
  { id: 'symptom',      labelKey: 'cycleCalendar_logEntry_symptoms',     subtitleKey: 'cycleCalendar_logEntry_symptomsSub',    tint: 'symptom' },
  { id: 'mood',         labelKey: 'cycleCalendar_logEntry_mood',         subtitleKey: 'cycleCalendar_logEntry_moodSub',        tint: 'mood' },
  { id: 'intercourse',  labelKey: 'cycleCalendar_logEntry_intimacy',     subtitleKey: 'cycleCalendar_logEntry_intimacySub',    tint: 'intimacy' },
  { id: 'period_start', labelKey: 'cycleCalendar_logEntry_periodStart',  subtitleKey: 'cycleCalendar_logEntry_periodStartSub', tint: 'period' },
  { id: 'period_end',   labelKey: 'cycleCalendar_logEntry_periodEnd',    subtitleKey: 'cycleCalendar_logEntry_periodEndSub',   tint: 'period' },
  { id: 'pregnancy_test', labelKey: 'cycleCalendar_logEntry_pregTest',   subtitleKey: 'cycleCalendar_logEntry_pregTestSub',   tint: 'ovulation' },
  { id: 'sex_drive',    labelKey: 'cycleCalendar_logEntry_sexDrive',     subtitleKey: 'cycleCalendar_logEntry_sexDriveSub',   tint: 'intimacy' },
  { id: 'clots',        labelKey: 'cycleCalendar_logEntry_clots',        subtitleKey: 'cycleCalendar_logEntry_clotsSub',      tint: 'period' },
  { id: 'weight',       labelKey: 'cycleCalendar_logEntry_weight',       subtitleKey: 'cycleCalendar_logEntry_weightSub',     tint: 'growth' },
  { id: 'water',        labelKey: 'cycleCalendar_logEntry_water',        subtitleKey: 'cycleCalendar_logEntry_waterSub',      tint: 'water' },
  { id: 'activity',     labelKey: 'cycleCalendar_logEntry_activity',     subtitleKey: 'cycleCalendar_logEntry_activitySub',   tint: 'activity' },
  { id: 'exam',         labelKey: 'cycleCalendar_logEntry_exam',         subtitleKey: 'cycleCalendar_logEntry_examSub',        tint: 'exam' },
]

interface Props {
  open: boolean
  onClose: () => void
  onSelect: (type: LogType) => void
  /** Optional heading override (e.g. "Log for Fri, Jul 24"). Defaults to the
   *  shared "Log activity" title used by the calendar. */
  title?: string
}

export function LogActivitySheet({ open, onClose, onSelect, title }: Props) {
  const { colors, isDark } = useTheme()
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
  const { t } = useTranslation()
  const insets = useSafeAreaInsets()

  const paper = isDark ? colors.surface : '#FFFEF8'
  const paperBorder = isDark ? colors.border : 'rgba(20,19,19,0.08)'
  const bg = diffuse ? dt.colors.bg : (isDark ? colors.bg : '#F3ECD9')
  const ink = diffuse ? dt.colors.ink : (isDark ? colors.text : '#141313')

  function handleSelect(type: LogType) {
    onClose()
    onSelect(type)
  }

  const heading = title ?? t('cycleCalendar_logActivity')

  return (
    <Modal visible={open} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.sheetBackdrop} onPress={onClose} />
      <View style={[styles.sheet, { backgroundColor: bg, paddingBottom: insets.bottom + 16 }, diffuse ? { borderTopWidth: 1, borderColor: dt.colors.line } : null]}>
        <View style={styles.handleWrap}>
          <View style={[styles.handle, { backgroundColor: diffuse ? dt.colors.line2 : paperBorder }]} />
        </View>
        <View style={styles.sheetHeader}>
          {diffuse ? (
            <Text style={{ fontFamily: diffuseFont.display, fontSize: 22, color: dt.colors.ink, letterSpacing: -0.3 }}>{heading}</Text>
          ) : (
            <Display size={22} color={ink}>{heading}</Display>
          )}
          <Pressable onPress={onClose} style={[styles.closeBtn, diffuse ? { backgroundColor: 'transparent', borderColor: dt.colors.hairline } : { backgroundColor: paper, borderColor: paperBorder }]}>
            <X size={18} color={ink} />
          </Pressable>
        </View>
        <View style={styles.sheetBody}>
          <LogTileGrid>
            {LOG_ENTRIES.map((e) => (
              <LogTile
                key={e.id}
                label={t(e.labelKey)}
                tint={e.tint}
                icon={diffuse && DIFFUSE_LOG_CHARACTER[e.id]
                  ? <Character name={DIFFUSE_LOG_CHARACTER[e.id]} size={34} color={diffuseLogHue(e.id)} />
                  : logSticker(e.id, 36, isDark)}
                onPress={() => handleSelect(e.id)}
              />
            ))}
          </LogTileGrid>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  sheetBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(10,8,6,0.55)' },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    maxHeight: '85%',
  },
  handleWrap: { alignItems: 'center', paddingTop: 10, paddingBottom: 6 },
  handle: { width: 42, height: 4, borderRadius: 2 },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 16,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetBody: { paddingHorizontal: 20 },
})
