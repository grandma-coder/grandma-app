/**
 * MenopauseTimeline (E1 / U7) — the agenda surface for the Menopause behavior.
 *
 * Reads useMenopauseLogs() and renders the logged symptom/period entries as a
 * date-grouped timeline (most recent first), mirroring how the cycle/kids
 * calendars render their logged entries. The header "+" opens the log forms:
 * always a symptom form, plus a period-event form for perimenopause users.
 *
 * Design: tokens-only, dual-variant (useMenoPalette). Ember mode color, hard
 * sticker shadow on selectable cards in the current variant only. Semantic
 * icons are Character blobs.
 */

import { useMemo, useState } from 'react'
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { AgendaHeader } from '../calendar/AgendaHeader'
import { LogSheet } from '../calendar/LogSheet'
import { Character, type CharacterName } from '../characters/Characters'
import { useScrollBottomInset } from '../ui/diffuse/DiffuseKit'
import { useMenopauseLogs, type MenopauseLogRow } from '../../lib/menopauseAnalytics'
import { menopauseSymptomLabel, resolveMenopauseSymptomId } from '../../lib/menopauseSymptoms'
import { useMenopauseStore } from '../../store/useMenopauseStore'
import { MenopauseSymptomForm, MenopausePeriodForm } from './MenopauseLogForms'
import { useMenoPalette, STICKER_SHADOW, type MenoPalette } from './menoPalette'
import { logTypeBlob, symptomStickerKey } from './menopauseIcons'
import { useTheme } from '../../constants/theme'

// ─── Copy (English literals — no menopause i18n keys exist yet) ──────────────

const COPY = {
  timelineTitle: 'Your timeline',
  timelineSub: 'Everything you’ve logged, most recent first.',
  emptyTitle: 'Nothing logged yet',
  emptyBody: 'Tap + to note a symptom or how you’re feeling. It all stays private to you.',
  emptyCta: 'Log something',
  chooserTitle: 'What would you like to log?',
  chooserSymptom: 'A symptom',
  chooserSymptomDesc: 'Hot flashes, sleep, mood, and more',
  chooserPeriod: 'A period',
  chooserPeriodDesc: 'Track flow and reset your counter',
  sheetSymptom: 'Log a symptom',
  sheetPeriod: 'Log a period',
  period: 'Period',
  note: 'Note',
  flow: 'flow',
  intensity: 'Intensity',
  today: 'Today',
  yesterday: 'Yesterday',
}

type SheetKind = 'none' | 'chooser' | 'symptom' | 'period'

// ─── Entry title/subtitle derivation ─────────────────────────────────────────

function entryTitle(row: MenopauseLogRow): string {
  if (row.type === 'period') return COPY.period
  if (row.type === 'note') return COPY.note
  const id = resolveMenopauseSymptomId(row.type)
  return id ? menopauseSymptomLabel(id) : COPY.note
}

function entrySubtitle(row: MenopauseLogRow): string | null {
  // useMenopauseLogs (U5) selects date/type/value/severity only — notes aren't
  // fetched here, so the subtitle is derived from flow (period) or severity.
  if (row.type === 'period') return row.value ? `${capitalize(row.value)} ${COPY.flow}` : null
  if (row.severity != null) return `${COPY.intensity} ${row.severity}/5`
  return null
}

function capitalize(s: string): string {
  return s.length ? s[0].toUpperCase() + s.slice(1) : s
}

function formatDateHeader(dateStr: string): string {
  const today = new Date()
  const todayStr = toLocalDateStr(today)
  if (dateStr === todayStr) return COPY.today
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  if (dateStr === toLocalDateStr(yesterday)) return COPY.yesterday
  const d = new Date(dateStr + 'T12:00:00')
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

function toLocalDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// ─── Main component ───────────────────────────────────────────────────────────

export function MenopauseTimeline() {
  const pal = useMenoPalette()
  const insets = useSafeAreaInsets()
  const bottomInset = useScrollBottomInset(insets.bottom + 40)

  const { data: rows } = useMenopauseLogs()
  const hydrated = useMenopauseStore((s) => s.hydrated)
  const stage = useMenopauseStore((s) => s.stage)
  const isPeri = hydrated && stage === 'peri'

  const [sheet, setSheet] = useState<SheetKind>('none')

  // Group rows by date, most recent first. useMenopauseLogs returns ascending,
  // so we reverse the grouped keys.
  const groups = useMemo(() => {
    const byDate = new Map<string, MenopauseLogRow[]>()
    for (const r of rows ?? []) {
      const list = byDate.get(r.date) ?? []
      list.push(r)
      byDate.set(r.date, list)
    }
    return [...byDate.entries()].sort((a, b) => b[0].localeCompare(a[0]))
  }, [rows])

  const isEmpty = (rows ?? []).length === 0

  function openAdd() {
    // Only perimenopause users get the period option, so a non-peri user skips
    // the chooser and goes straight to the symptom form.
    setSheet(isPeri ? 'chooser' : 'symptom')
  }

  return (
    <View style={[styles.root, { backgroundColor: pal.bg }]}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 12, paddingBottom: bottomInset }]}
        showsVerticalScrollIndicator={false}
      >
        <AgendaHeader onAdd={openAdd} />

        <Text style={[styles.title, { color: pal.text, fontFamily: pal.fontDisplay }]}>{COPY.timelineTitle}</Text>
        <Text style={[styles.sub, { color: pal.textMuted, fontFamily: pal.fontBody }]}>{COPY.timelineSub}</Text>

        {isEmpty ? (
          <EmptyState pal={pal} onLog={openAdd} />
        ) : (
          <View style={styles.groups}>
            {groups.map(([date, entries]) => (
              <View key={date} style={styles.group}>
                <Text style={[styles.dateHeader, { color: pal.textMuted, fontFamily: pal.fontBodySemiBold }]}>
                  {formatDateHeader(date)}
                </Text>
                <View style={styles.entryList}>
                  {entries.map((row, i) => (
                    <EntryRow key={`${date}-${i}`} row={row} pal={pal} />
                  ))}
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* ─── Chooser sheet (peri only) ─────────────────────────────────── */}
      <LogSheet visible={sheet === 'chooser'} title={COPY.chooserTitle} onClose={() => setSheet('none')}>
        <View style={styles.chooser}>
          <ChooserCard
            icon="temperature"
            title={COPY.chooserSymptom}
            desc={COPY.chooserSymptomDesc}
            pal={pal}
            onPress={() => setSheet('symptom')}
          />
          <ChooserCard
            icon="period"
            title={COPY.chooserPeriod}
            desc={COPY.chooserPeriodDesc}
            pal={pal}
            onPress={() => setSheet('period')}
          />
        </View>
      </LogSheet>

      {/* ─── Symptom + period forms ────────────────────────────────────── */}
      <LogSheet visible={sheet === 'symptom'} title={COPY.sheetSymptom} onClose={() => setSheet('none')}>
        <MenopauseSymptomForm onSaved={() => setSheet('none')} />
      </LogSheet>
      <LogSheet visible={sheet === 'period'} title={COPY.sheetPeriod} onClose={() => setSheet('none')}>
        <MenopausePeriodForm onSaved={() => setSheet('none')} />
      </LogSheet>
    </View>
  )
}

// ─── Entry row ────────────────────────────────────────────────────────────────

function EntryRow({ row, pal }: { row: MenopauseLogRow; pal: MenoPalette }) {
  const subtitle = entrySubtitle(row)
  // Per-group sticker hue so the timeline reads with varied colour like the home
  // + cycle calendar (each signal its own tone).
  const { stickers } = useTheme()
  const s = stickers as Record<string, string>
  const key = symptomStickerKey(row.type)
  return (
    <View
      style={[
        styles.entry,
        !pal.diffuse && { ...STICKER_SHADOW, shadowColor: pal.text },
        { backgroundColor: pal.surface, borderColor: pal.border, borderRadius: pal.radius.lg },
      ]}
    >
      <View style={[styles.entryIcon, { backgroundColor: s[`${key}Soft`], borderColor: pal.border }]}>
        <Character name={logTypeBlob(row.type)} size={24} color={s[key]} bg={s[`${key}Soft`]} />
      </View>
      <View style={styles.entryText}>
        <Text style={[styles.entryTitle, { color: pal.text, fontFamily: pal.fontBodySemiBold }]}>
          {entryTitle(row)}
        </Text>
        {subtitle ? (
          <Text
            style={[styles.entrySub, { color: pal.textMuted, fontFamily: pal.fontBody }]}
            numberOfLines={2}
          >
            {subtitle}
          </Text>
        ) : null}
      </View>
    </View>
  )
}

// ─── Empty state ────────────────────────────────────────────────────────────

function EmptyState({ pal, onLog }: { pal: MenoPalette; onLog: () => void }) {
  return (
    <View style={[styles.empty, { backgroundColor: pal.surface, borderColor: pal.border, borderRadius: pal.radius.lg }]}>
      <View style={[styles.emptyIcon, { backgroundColor: pal.accentSoft, borderColor: pal.border }]}>
        <Character name="empty" size={44} color={pal.accent} bg={pal.accentSoft} />
      </View>
      <Text style={[styles.emptyTitle, { color: pal.text, fontFamily: pal.fontDisplay }]}>{COPY.emptyTitle}</Text>
      <Text style={[styles.emptyBody, { color: pal.textMuted, fontFamily: pal.fontBody }]}>{COPY.emptyBody}</Text>
      <Pressable
        onPress={onLog}
        accessibilityRole="button"
        style={({ pressed }) => [
          styles.emptyCta,
          !pal.diffuse && { ...STICKER_SHADOW, shadowColor: pal.text },
          {
            backgroundColor: pal.accentSoft,
            borderColor: pal.accent,
            borderRadius: pal.diffuse ? pal.radius.xl : pal.radius.full,
            // sticker press-stamp: dip down on tap (current variant), matching
            // the canonical button contract; Diffuse presses with opacity only.
            transform: [{ translateY: pressed && !pal.diffuse ? 2 : 0 }],
            opacity: pressed ? 0.75 : 1,
          },
        ]}
      >
        <Text style={[styles.emptyCtaText, { color: pal.accent, fontFamily: pal.fontBodySemiBold }]}>
          {COPY.emptyCta}
        </Text>
      </Pressable>
    </View>
  )
}

// ─── Chooser card ─────────────────────────────────────────────────────────────

function ChooserCard({
  icon,
  title,
  desc,
  pal,
  onPress,
}: {
  icon: CharacterName
  title: string
  desc: string
  pal: MenoPalette
  onPress: () => void
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.chooserCard,
        !pal.diffuse && { ...STICKER_SHADOW, shadowColor: pal.text },
        { backgroundColor: pal.surface, borderColor: pal.border, borderRadius: pal.radius.lg, opacity: pressed ? 0.7 : 1 },
      ]}
    >
      <View style={[styles.entryIcon, { backgroundColor: pal.accentSoft, borderColor: pal.border }]}>
        <Character name={icon} size={26} color={pal.accent} bg={pal.accentSoft} />
      </View>
      <View style={styles.entryText}>
        <Text style={[styles.entryTitle, { color: pal.text, fontFamily: pal.fontBodySemiBold }]}>{title}</Text>
        <Text style={[styles.entrySub, { color: pal.textMuted, fontFamily: pal.fontBody }]}>{desc}</Text>
      </View>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingHorizontal: 16 },

  title: { fontSize: 24, letterSpacing: -0.4, marginTop: 4 },
  sub: { fontSize: 14, lineHeight: 20, marginTop: 4, marginBottom: 16 },

  groups: { gap: 20 },
  group: { gap: 10 },
  dateHeader: { fontSize: 12, letterSpacing: 0.8, textTransform: 'uppercase', paddingHorizontal: 4 },
  entryList: { gap: 10 },

  entry: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14, borderWidth: 1 },
  entryIcon: { width: 46, height: 46, borderRadius: 23, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  entryText: { flex: 1, gap: 3 },
  entryTitle: { fontSize: 16, letterSpacing: -0.2 },
  entrySub: { fontSize: 13, lineHeight: 18 },

  empty: { alignItems: 'center', gap: 12, padding: 28, borderWidth: 1, marginTop: 8 },
  emptyIcon: { width: 84, height: 84, borderRadius: 42, borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  emptyTitle: { fontSize: 22, letterSpacing: -0.4, textAlign: 'center' },
  emptyBody: { fontSize: 14, lineHeight: 20, textAlign: 'center', maxWidth: 300 },
  emptyCta: { paddingVertical: 12, paddingHorizontal: 24, borderWidth: 1.5, marginTop: 6 },
  emptyCtaText: { fontSize: 15 },

  chooser: { gap: 12, paddingBottom: 8 },
  chooserCard: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, borderWidth: 1 },
})
