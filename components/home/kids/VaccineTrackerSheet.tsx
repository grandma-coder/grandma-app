/**
 * VaccineTrackerSheet — standalone vaccine-schedule sheet.
 *
 * A thin shell around the shared `VaccineScheduleTree` component. Renders ONLY
 * the vaccine schedule: the age-milestone tree, per-dose rows with "Set date" /
 * mark-given actions, the inline date picker, the empty state, and the
 * per-vaccine info modal — all owned by `./VaccineScheduleTree`.
 *
 * The schedule catalog + engine (`buildVaccineScheduleTree`, the country
 * catalog, the pure helpers) live in `lib/vaccineSchedule.ts`; the tree +
 * info-modal components live in `./VaccineScheduleTree`. Both are shared with
 * `KidsHome` so there is a single source of truth (this file previously inlined
 * verbatim copies of all of it).
 *
 * Shell mirrors `HealthDetailModal`: DiffuseSheet under `useIsDiffuse()`, else
 * LogSheet (which itself renders the cream paper-sheet chrome).
 */
import { useMemo } from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { useQuery } from '@tanstack/react-query'
import { useTheme, font, useDiffuseTheme, getDiffuseAccent } from '../../../constants/theme'
import { useIsDiffuse } from '../../ui/diffuse/DiffuseKit'
import { DiffuseSectionHeader, DiffuseSheet } from '../../ui/diffuse/DiffusePrimitives'
import { Character } from '../../characters/Characters'
import { Cross as CrossSticker } from '../../ui/Stickers'
import { LogSheet } from '../../calendar/LogSheet'
import { supabase } from '../../../lib/supabase'
import type { ChildWithRole } from '../../../types'
import { useTranslation } from '../../../lib/i18n'
import type { TranslationKeys } from '../../../lib/i18n/keys'
import { VaccineScheduleTree } from './VaccineScheduleTree'
import type { HealthRecord, HealthHistoryData } from '../../../lib/vaccineSchedule'

// `kids_vaccines_title` is added by Task 7. Referenced verbatim here (do not
// substitute another key); cast so the file typechecks before the key lands.
// Until then t() returns the key name at runtime, per the Task 2 brief.
const KIDS_VACCINES_TITLE_KEY = 'kids_vaccines_title' as keyof TranslationKeys

// ─── VaccineTrackerSheet — exported shell ───────────────────────────────────

interface VaccineTrackerSheetProps {
  visible: boolean
  onClose: () => void
  child: ChildWithRole
  childColor?: string
  scheduledVaccines: Record<string, string>
  onSetVaccineDate: (key: string, date: string | null) => void
  onMarkVaccineGiven: (name: string, date: string, key: string) => Promise<void>
}

/**
 * Standalone vaccine-schedule sheet. Reads the child's vaccine history from the
 * child store so the parent only has to pass the schedule/handler props.
 */
export function VaccineTrackerSheet({
  visible,
  onClose,
  child,
  childColor,
  scheduledVaccines,
  onSetVaccineDate,
  onMarkVaccineGiven,
}: VaccineTrackerSheetProps) {
  const { colors, isDark } = useTheme()
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
  const { t } = useTranslation()

  // The tree derives per-dose "done" status from the child's recorded vaccine
  // history (child_logs, type='vaccine'). HealthDetailModal received this as a
  // `healthHistory` prop from KidsHome's main component; this standalone sheet
  // (props deliberately omit healthHistory) fetches the vaccine records itself
  // via the same child_logs query, so it stays self-contained for Task 5's
  // mount. Only `vaccines` is read by VaccineScheduleTree.
  const { data: vaccineRecords } = useQuery({
    queryKey: ['vaccine-tracker-history', child.id],
    queryFn: async (): Promise<HealthRecord[]> => {
      const { data } = await supabase
        .from('child_logs')
        .select('id, type, value, notes, date')
        .eq('child_id', child.id)
        .eq('type', 'vaccine')
        .order('date', { ascending: false })
        .limit(50)
      if (!data) return []
      return (data as any[]).map((r) => ({
        id: r.id,
        type: r.type,
        value: typeof r.value === 'string' ? r.value : JSON.stringify(r.value ?? ''),
        notes: r.notes ?? '',
        date: String(r.date ?? '').substring(0, 10),
      }))
    },
    enabled: visible && !!child.id,
  })

  const healthHistory: HealthHistoryData = useMemo(
    () => ({
      vaccines: vaccineRecords ?? [],
      meds: [],
      growth: [],
      temps: [],
      milestones: [],
    }),
    [vaccineRecords],
  )

  const stickerInk = isDark ? 'rgba(255,255,255,0.18)' : '#141313'

  if (diffuse) {
    const acc = getDiffuseAccent('kids', dt.isDark)
    return (
      <DiffuseSheet
        visible={visible}
        title={t(KIDS_VACCINES_TITLE_KEY)}
        onClose={onClose}
        chip={childColor ? child.name : undefined}
      >
        <DiffuseSectionHeader
          title={t('kids_home_health_vaccine_schedule')}
          icon={<Character name="vaccine" size={21} color={acc} />}
        />
        <VaccineScheduleTree
          child={child}
          healthHistory={healthHistory}
          scheduledVaccines={scheduledVaccines}
          onSetVaccineDate={onSetVaccineDate}
          onMarkVaccineGiven={onMarkVaccineGiven}
        />
      </DiffuseSheet>
    )
  }

  return (
    <LogSheet
      visible={visible}
      title={t(KIDS_VACCINES_TITLE_KEY)}
      onClose={onClose}
      chip={childColor ? child.name : undefined}
      chipColor={childColor}
    >
      <View style={styles.modalSectionRow}>
        <View style={{ transform: [{ rotate: '-6deg' }] }}>
          <CrossSticker size={22} fill="#F5D652" stroke={stickerInk} />
        </View>
        <Text style={[styles.modalSectionTitle, { color: colors.text, marginTop: 0, marginBottom: 0 }]}>{t('kids_home_health_vaccine_schedule')}</Text>
      </View>
      <VaccineScheduleTree
        child={child}
        healthHistory={healthHistory}
        scheduledVaccines={scheduledVaccines}
        onSetVaccineDate={onSetVaccineDate}
        onMarkVaccineGiven={onMarkVaccineGiven}
      />
    </LogSheet>
  )
}

const styles = StyleSheet.create({
  modalSectionTitle: { fontSize: 17, fontFamily: font.displayBold, marginTop: 20, marginBottom: 10, letterSpacing: -0.3 },
  modalSectionRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 22, marginBottom: 8 },
})
