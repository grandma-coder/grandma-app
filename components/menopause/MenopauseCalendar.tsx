/**
 * MenopauseCalendar — the Calendar-tab surface for the Menopause behavior, the
 * flat (non-cyclical) analogue of cycle's CycleCalendar. A month grid where a day
 * you logged carries group-colored dots, today is ringed, the selected day is
 * bordered; below it a day-detail panel lists that day's entries and a "Log
 * activity" affordance logs for the SELECTED day (threaded via logDate).
 *
 * Design: tokens-only, dual-variant (useMenoPalette). Per-symptom-group sticker
 * hues (like the home + cycle calendar); Character blobs for icons.
 */
import { useMemo, useState } from 'react'
import { View, Text, Pressable, ScrollView, StyleSheet, Alert } from 'react-native'
import { Trash2 } from 'lucide-react-native'
import { deleteMenopauseLog, deleteMenopauseLogEntry } from '../../lib/menopauseLogs'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { AgendaHeader } from '../calendar/AgendaHeader'
import { LogSheet } from '../calendar/LogSheet'
import { Character, type CharacterName } from '../characters/Characters'
import { diffuseFont, useTheme, useDiffuseTheme, getDiffuseAccent, getModeColorSoft } from '../../constants/theme'
import { AgendaCalendar, DayMarks } from '../calendar/AgendaCalendar'
import { menopauseDayMarks } from '../../lib/logStickers'
import { menopauseDayLevel, menopauseDayTint, type MenopauseDayLevel } from '../../lib/menopauseDayLoad'
import { useTranslation, t as tNow } from '../../lib/i18n'
import { useLanguageStore } from '../../store/useLanguageStore'
import { useScrollBottomInset } from '../ui/diffuse/DiffuseKit'
import { DiffuseDotCalendar } from '../ui/diffuse/DiffusePrimitives'
import { useMenopauseLogs, type MenopauseLogRow } from '../../lib/menopauseAnalytics'
import { isMultiPerDayType, menopauseEntryTime, menopauseSymptomLabel, resolveMenopauseSymptomId, type MenopauseSymptomId } from '../../lib/menopauseSymptoms'
import { useMenopauseStore } from '../../store/useMenopauseStore'
import { MenopauseSymptomForm, MenopausePeriodForm } from './MenopauseLogForms'
import { MenopauseLogSheet, menoSticker, type MenopauseLogPick } from './MenopauseLogSheet'
import { SiteSticker } from '../stickers/SiteSticker'
import { useMenoPalette, STICKER_SHADOW } from './menoPalette'
import { logTypeBlob, symptomStickerKey } from './menopauseIcons'
import { isFutureDate } from '../../lib/futureDate'
import { lastPeriodAfterDelete } from '../../lib/menopauseStage'
import { supabase } from '../../lib/supabase'

const COPY = {
  get loggedThisDay() { return tNow('meno_c_logged_this_day') },
  get empty() { return tNow('meno_c_empty') },
  get logActivity() { return tNow('meno_h_log_symptom') },
  get chooserTitle() { return tNow('meno_c_chooser_title') },
  get chooserSymptom() { return tNow('meno_c_chooser_symptom') },
  get chooserSymptomDesc() { return tNow('meno_c_chooser_symptom_desc') },
  get chooserPeriod() { return tNow('meno_c_chooser_period') },
  get chooserPeriodDesc() { return tNow('meno_c_chooser_period_desc') },
  get sheetSymptom() { return tNow('meno_h_log_symptom') },
  get sheetPeriod() { return tNow('meno_h_log_period') },
  get period() { return tNow('meno_s_period') },
  get note() { return tNow('meno_c_note') },
  get today() { return tNow('meno_c_today') },
}

// ─── Date helpers (local, never toISOString) ─────────────────────────────────

function localDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
function formatLongDate(dateStr: string): string {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString(useLanguageStore.getState().language, { weekday: 'long', month: 'short', day: 'numeric' })
}

// ─── Entry title/subtitle (shared with the old timeline) ─────────────────────

function entryTitle(row: MenopauseLogRow): string {
  if (row.type === 'period') return COPY.period
  if (row.type === 'note') return COPY.note
  const id = resolveMenopauseSymptomId(row.type)
  return id ? menopauseSymptomLabel(id) : COPY.note
}
function entrySubtitle(row: MenopauseLogRow): string | null {
  if (row.type === 'period') {
    if (!row.value) return null
    return row.value === 'light' || row.value === 'medium' || row.value === 'heavy'
      ? tNow(`meno_c_flow_${row.value}` as const)
      : row.value
  }
  // The same word the log form shows for that level ("Forte"), never a 4/5 grade.
  const level = row.severity != null
    ? tNow(`meno_f_sev_${Math.min(5, Math.max(1, Math.round(row.severity)))}` as Parameters<typeof tNow>[0])
    : null
  // Hot flashes / night sweats stack — the time tells the day's entries apart.
  const time = isMultiPerDayType(row.type) ? menopauseEntryTime(row) : null
  const clock = time
    ? new Date(2000, 0, 1, time.hours, time.minutes).toLocaleTimeString(useLanguageStore.getState().language, { hour: 'numeric', minute: '2-digit' })
    : null
  return [clock, level].filter(Boolean).join(' · ') || null
}

/**
 * Delete one day's entry. Deleting a period that had become the stored last-period date (older
 * builds wrote each logged period there) rolls that date back too, or the "months since last
 * period" counter stays stuck on a period that was removed.
 */
async function removeLog(row: MenopauseLogRow, all: MenopauseLogRow[]): Promise<void> {
  // A hot flash among several that day: remove just that entry.
  if (row.id && isMultiPerDayType(row.type)) {
    await deleteMenopauseLogEntry(row.id)
    return
  }
  await deleteMenopauseLog(row.date, row.type)
  if (row.type !== 'period') return
  const store = useMenopauseStore.getState()
  const next = lastPeriodAfterDelete(store.lastPeriodDate, row.date, all)
  if (next === store.lastPeriodDate) return
  store.setLastPeriodDate(next)
  // Mirror to profiles, or the next fresh-install boot restores the deleted date. Best-effort.
  const { data } = await supabase.auth.getSession()
  const userId = data.session?.user.id
  if (!userId) return
  const { error } = await supabase.from('profiles').upsert({ id: userId, last_period_date: next }, { onConflict: 'id' })
  if (error) console.warn('[menopause] profiles last_period_date rollback failed:', error.message)
}

// ─── Main component ───────────────────────────────────────────────────────────

export function MenopauseCalendar() {
  useTranslation() // re-render on language change (COPY reads the current language)
  const pal = useMenoPalette()
  const { stickers, colors, font, isDark } = useTheme()
  const dt = useDiffuseTheme()
  const s = stickers as Record<string, string>
  const insets = useSafeAreaInsets()
  const bottomInset = useScrollBottomInset(insets.bottom + 40)

  const { data: rows, isLoading: logsLoading } = useMenopauseLogs()
  const hydrated = useMenopauseStore((st) => st.hydrated)
  const stage = useMenopauseStore((st) => st.stage)
  const isPeri = hydrated && stage === 'peri'

  const today = localDateStr(new Date())
  const [selectedDate, setSelectedDate] = useState(today)
  const [visibleMonth, setVisibleMonth] = useState(() => {
    const d = new Date()
    return { year: d.getFullYear(), month: d.getMonth() }
  })
  const [gridOpen, setGridOpen] = useState(false)
  const [pickedSymptom, setPickedSymptom] = useState<MenopauseSymptomId | null>(null)
  // The one saved entry being edited (stacking types: one hot flash of several on the day).
  const [editId, setEditId] = useState<string | null>(null)
  const [periodOpen, setPeriodOpen] = useState(false)

  const logsByDate = useMemo(() => {
    const m = new Map<string, MenopauseLogRow[]>()
    for (const r of rows ?? []) {
      const a = m.get(r.date) ?? []
      a.push(r)
      m.set(r.date, a)
    }
    return m
  }, [rows])

  const selectedLogs = logsByDate.get(selectedDate) ?? []

  function openAdd() {
    if (isFutureDate(selectedDate)) return // logs describe what happened; no future entries
    setGridOpen(true)
  }
  function onPick(type: MenopauseLogPick, entryId?: string) {
    if (type === 'period') setPeriodOpen(true)
    else {
      setEditId(entryId ?? null)
      setPickedSymptom(type)
    }
  }
  function closeSymptom() {
    setPickedSymptom(null)
    setEditId(null)
  }

  return (
    <View style={[styles.root, { backgroundColor: pal.bg }]}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 12, paddingBottom: bottomInset }]}
        showsVerticalScrollIndicator={false}
      >
        <AgendaHeader onAdd={openAdd} />

        {/* ─── Month grid — the SHARED DiffuseDotCalendar primitive (exact cycle-
            calendar parity: same header, nav, weekday row, grid, fonts) in the
            Diffuse variant; the shared AgendaCalendar (Week | Month) in the site look. */}
        {pal.diffuse ? (
          <View style={{ marginTop: 4 }}>
            <DiffuseDotCalendar
              value={new Date(selectedDate + 'T12:00:00')}
              month={new Date(visibleMonth.year, visibleMonth.month, 1)}
              accent={getDiffuseAccent('menopause', dt.isDark)}
              onChange={(d) => setSelectedDate(localDateStr(d))}
              onMonthChange={(d) => setVisibleMonth({ year: d.getFullYear(), month: d.getMonth() })}
              dayField={(date) => {
                const logs = logsByDate.get(localDateStr(date)) ?? []
                return logs.length ? { color: s[symptomStickerKey(logs[0].type)], intensity: 0.5 } : null
              }}
              dayMarker={(date) => {
                const logs = logsByDate.get(localDateStr(date)) ?? []
                if (!logs.length) return null
                // The day's primary logged symptom, as a crisp Ink blob (the
                // dayField soft-tints the cell in the same hue behind it).
                const key = symptomStickerKey(logs[0].type)
                return <Character name={logTypeBlob(logs[0].type)} size={15} color={s[`${key}Ink`]} />
              }}
            />
          </View>
        ) : (
        // Site look: the shared agenda calendar (Week | Month). Each day is tinted peach by how
        // heavy it was (sum of symptom intensities) and marks only what stands out: period,
        // HRT, then the day's strongest symptom (max 2 + overflow dot).
        <View style={{ marginTop: 4 }}>
          <AgendaCalendar
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
            tone={getModeColorSoft('meno', isDark)}
            loading={logsLoading && !rows}
            dayTint={(date) => menopauseDayTint(menopauseDayLevel(logsByDate.get(date) ?? []), stickers.peach, isDark)}
            renderDayDecoration={(date) => {
              const dayLogs = logsByDate.get(date)
              return dayLogs?.length ? <DayMarks stickers={menopauseDayMarks(dayLogs)} max={2} /> : null
            }}
            footer={<MenopauseDayLegend />}
          />
        </View>
        )}

        {/* ─── Selected-day detail ───────────────────────────────────────── */}
        {!pal.diffuse ? (
          <View style={styles.detail}>
            <Text style={{ color: colors.text, fontFamily: font.display, fontSize: 20, letterSpacing: 0.3, textTransform: 'uppercase' }}>
              {formatLongDate(selectedDate)}
              {selectedDate === today ? ` · ${COPY.today}` : ''}
            </Text>
            <Text style={{ color: colors.textMuted, fontFamily: 'SpaceMono_400Regular', fontSize: 10, letterSpacing: 1.4, textTransform: 'uppercase', marginTop: 8 }}>
              {COPY.loggedThisDay}
            </Text>

            {selectedLogs.length > 0 ? (
              <View style={{ marginTop: 6 }}>
                {selectedLogs.map((row, i) => {
                  const sub = entrySubtitle(row)
                  // Tap re-opens the pre-filled form, the bin removes it. Most symptoms and periods are
                  // one row per day; hot flashes / night sweats stack, so each entry is edited or
                  // removed on its own. Free notes stay read-only here.
                  const editable = row.type !== 'note'
                  const label = entryTitle(row)
                  return (
                    <Pressable
                      key={`${row.type}-${i}`}
                      disabled={!editable}
                      onPress={() => onPick(
                        row.type === 'period' ? 'period' : (row.type as MenopauseLogPick),
                        isMultiPerDayType(row.type) ? row.id : undefined,
                      )}
                      accessibilityRole={editable ? 'button' : undefined}
                      accessibilityLabel={editable ? tNow('meno_c_editA11y', { label }) : label}
                      style={({ pressed }) => [styles.siteRow, i > 0 && { borderTopWidth: 1, borderTopColor: colors.border }, pressed && { opacity: 0.6 }]}
                    >
                      <SiteSticker name={menoSticker(row.type)} size={38} />
                      <View style={{ flex: 1, gap: 2 }}>
                        <Text numberOfLines={1} style={{ fontFamily: font.bodyBold, fontSize: 15, color: colors.text }}>{label}</Text>
                        {sub ? <Text numberOfLines={2} style={{ fontFamily: font.body, fontSize: 13, color: colors.textSecondary }}>{sub}</Text> : null}
                      </View>
                      {editable ? (
                        <Pressable
                          hitSlop={10}
                          accessibilityRole="button"
                          accessibilityLabel={tNow('common_delete')}
                          onPress={() => Alert.alert(tNow('meno_c_deleteTitle'), tNow('meno_c_deleteBody', { label }), [
                            { text: tNow('common_cancel'), style: 'cancel' },
                            { text: tNow('common_delete'), style: 'destructive', onPress: () => {
                              removeLog(row, rows ?? []).catch(() => Alert.alert(tNow('common_error'), tNow('common_checkConnection')))
                            } },
                          ])}
                        >
                          <Trash2 size={18} color={colors.textSecondary} strokeWidth={2} />
                        </Pressable>
                      ) : null}
                    </Pressable>
                  )
                })}
              </View>
            ) : (
              <View style={{ alignItems: 'center', gap: 8, paddingVertical: 14 }}>
                <SiteSticker name="cal" size={44} />
                <Text style={[styles.detailEmpty, { color: colors.textSecondary, fontFamily: font.body, textAlign: 'center' }]}>{COPY.empty}</Text>
              </View>
            )}

            {/* No logging on future days — they'd enter the history as fact. */}
            {!isFutureDate(selectedDate) && (
            <Pressable
              onPress={openAdd}
              accessibilityRole="button"
              style={({ pressed }) => [styles.siteAdd, { backgroundColor: pal.accentSoft, borderColor: colors.text, opacity: pressed ? 0.7 : 1 }]}
            >
              <SiteSticker name="pencil" size={24} cut />
              <Text style={{ fontFamily: font.bodyBold, fontSize: 14, color: colors.text }}>{COPY.logActivity}</Text>
            </Pressable>
            )}
          </View>
        ) : (
        <View style={styles.detail}>
          <Text style={[styles.detailTitle, { color: pal.text, fontFamily: pal.fontDisplay }]}>
            {formatLongDate(selectedDate)}
            {selectedDate === today ? ` · ${COPY.today}` : ''}
          </Text>
          <Text style={[styles.detailLabel, { color: pal.textMuted, fontFamily: pal.diffuse ? diffuseFont.mono : pal.fontBodySemiBold }]}>
            {COPY.loggedThisDay.toUpperCase()}
          </Text>

          {selectedLogs.length > 0 ? (
            <View style={styles.detailList}>
              {selectedLogs.map((row, i) => {
                const key = symptomStickerKey(row.type)
                const sub = entrySubtitle(row)
                return (
                  <View
                    key={`${row.type}-${i}`}
                    style={[
                      styles.detailCard,
                      !pal.diffuse && { ...STICKER_SHADOW, shadowColor: pal.text },
                      { backgroundColor: pal.surface, borderColor: pal.border, borderRadius: pal.radius.lg },
                    ]}
                  >
                    <View style={[styles.detailBlob, { backgroundColor: s[`${key}Soft`] }]}>
                      <Character name={logTypeBlob(row.type) as CharacterName} size={18} color={s[`${key}Ink`]} bg={s[`${key}Soft`]} />
                    </View>
                    <View style={styles.detailCopy}>
                      <Text style={[styles.detailEntryTitle, { color: pal.text, fontFamily: pal.fontBodySemiBold }]}>{entryTitle(row)}</Text>
                      {sub ? <Text style={[styles.detailEntrySub, { color: pal.textMuted, fontFamily: pal.fontBody }]}>{sub}</Text> : null}
                    </View>
                  </View>
                )
              })}
            </View>
          ) : (
            <Text style={[styles.detailEmpty, { color: pal.textMuted, fontFamily: pal.fontBody }]}>{COPY.empty}</Text>
          )}

          <Pressable
            onPress={openAdd}
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.addBtn,
              !pal.diffuse && { ...STICKER_SHADOW, shadowColor: pal.text },
              {
                backgroundColor: pal.accentSoft,
                borderColor: pal.accent,
                borderRadius: pal.diffuse ? pal.radius.xl : pal.radius.full,
                transform: [{ translateY: pressed && !pal.diffuse ? 2 : 0 }],
                opacity: pressed ? 0.8 : 1,
              },
            ]}
          >
            <Ionicons name="add" size={16} color={pal.accent} />
            <Text style={[styles.addBtnText, { color: pal.accent, fontFamily: pal.fontBodySemiBold }]}>{COPY.logActivity}</Text>
          </Pressable>
        </View>
        )}
      </ScrollView>

      {/* ─── Log flow: tile grid → per-symptom / period form, all for the
          SELECTED day (via logDate) — the cycle LogActivitySheet pattern. ── */}
      <MenopauseLogSheet
        open={gridOpen}
        onClose={() => setGridOpen(false)}
        onPick={onPick}
        isPeri={isPeri}
        title={COPY.sheetSymptom}
      />
      <LogSheet visible={!!pickedSymptom} sticker={pickedSymptom ? menoSticker(pickedSymptom) : 'pencil'} title={COPY.sheetSymptom} onClose={closeSymptom}>
        {pickedSymptom ? (
          <MenopauseSymptomForm
            key={editId ?? 'new'}
            initialId={pickedSymptom}
            logDate={selectedDate}
            editId={editId ?? undefined}
            onSaved={closeSymptom}
          />
        ) : null}
      </LogSheet>
      <LogSheet visible={periodOpen} sticker="drop" title={COPY.sheetPeriod} onClose={() => setPeriodOpen(false)}>
        <MenopausePeriodForm logDate={selectedDate} onSaved={() => setPeriodOpen(false)} />
      </LogSheet>
    </View>
  )
}

/** Site-look legend under the calendar: light → heavier day swatches · period drop. */
export function MenopauseDayLegend() {
  const { colors, stickers, isDark } = useTheme()
  const { t } = useTranslation()
  const levels: MenopauseDayLevel[] = [1, 2, 3]
  const label = { color: colors.textMuted, fontFamily: 'SpaceMono_400Regular', fontSize: 10, letterSpacing: 1.2, textTransform: 'uppercase' as const }
  return (
    <View style={styles.legend}>
      <View style={styles.legendItem}>
        <Text style={label}>{t('meno_calendar_lightDay')}</Text>
        <View style={styles.legendRamp}>
          {levels.map((lv) => (
            <View key={lv} style={[styles.legendSwatch, { backgroundColor: menopauseDayTint(lv, stickers.peach, isDark) }]} />
          ))}
        </View>
        <Text style={label}>{t('meno_calendar_heavierDay')}</Text>
      </View>
      <View style={styles.legendItem}>
        <SiteSticker name="drop" size={13} />
        <Text style={label}>{t('prepreg_period')}</Text>
      </View>
    </View>
  )
}

const CELL = `${100 / 7}%`

const styles = StyleSheet.create({
  root: { flex: 1 },
  legend: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', columnGap: 16, rowGap: 6, marginTop: 10 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendRamp: { flexDirection: 'row', gap: 3 },
  legendSwatch: { width: 12, height: 12, borderRadius: 6 },
  scroll: { paddingHorizontal: 16 },

  card: { padding: 16, borderWidth: 1, marginTop: 4 },
  siteMonth: { marginTop: 8, paddingHorizontal: 4 },
  cellWrap: { width: CELL as unknown as number, aspectRatio: 1, alignItems: 'center', justifyContent: 'center' },
  siteSlot: { height: 16, alignItems: 'center', justifyContent: 'center' },
  siteRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 4 },
  siteAdd: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 10, paddingHorizontal: 18, borderWidth: 1.5, borderRadius: 999, marginTop: 18, alignSelf: 'center' },
  monthHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  monthLabel: { fontSize: 22, letterSpacing: -0.4 },
  navRow: { flexDirection: 'row', gap: 8 },
  navBtn: { width: 34, height: 34, borderRadius: 17, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },

  dowRow: { flexDirection: 'row', marginBottom: 4 },
  dow: { width: CELL as unknown as number, textAlign: 'center', fontSize: 10, letterSpacing: 0.6, textTransform: 'uppercase' },

  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: {
    width: CELL as unknown as number,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    gap: 3,
  },
  dayNum: { fontSize: 15, letterSpacing: -0.2 },
  dotSlot: { flexDirection: 'row', gap: 2, height: 5, alignItems: 'center' },
  dot: { width: 5, height: 5, borderRadius: 2.5 },
  // Diffuse day markers (rendered inside DiffuseDotCalendar cells).
  markerRow: { flexDirection: 'row', gap: 2, justifyContent: 'center' },
  marker: { width: 4, height: 4, borderRadius: 2 },
  todayRing: {
    position: 'absolute',
    top: 3,
    left: 3,
    right: 3,
    bottom: 3,
    borderRadius: 12,
    borderWidth: 1.5,
  },

  detail: { marginTop: 20, paddingHorizontal: 4 },
  detailTitle: { fontSize: 20, letterSpacing: -0.3 },
  detailLabel: { fontSize: 11, letterSpacing: 0.8, textTransform: 'uppercase', marginTop: 14 },
  detailList: { gap: 10, marginTop: 10 },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  detailCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderWidth: 1 },
  detailBlob: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  detailCopy: { flex: 1, gap: 2 },
  detailEntryTitle: { fontSize: 15, letterSpacing: -0.2 },
  detailEntrySub: { fontSize: 13, lineHeight: 18 },
  detailEmpty: { fontSize: 14, lineHeight: 20, marginTop: 10 },

  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 13,
    borderWidth: 1.5,
    marginTop: 18,
  },
  addBtnText: { fontSize: 15 },

  chooser: { gap: 12, paddingBottom: 8 },
  chooserCard: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, borderWidth: 1 },
  chooserIcon: { width: 46, height: 46, borderRadius: 23, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
})
