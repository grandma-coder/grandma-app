/**
 * MenopauseHome (E1 / U8) — the Menopause behavior home surface.
 *
 * Mirrors the composition of CycleHome / KidsHome: a hydration gate on the
 * durable store, PaperCard sections, and a Quick-Log Kit that reuses the U7
 * log forms inside the shared <LogSheet>. Top → bottom:
 *
 *   1. Hero          — stage label + "months since last period" (gentle "—" when
 *                      unknown). Ember mode color.
 *   2. 12-month offer — non-blocking; only when shouldOfferMenopauseUpdate() is
 *                      true (peri + >=12mo). Confirm sets stage 'meno' (store +
 *                      profiles upsert, best-effort); dismiss hides for the
 *                      session. NEVER auto-flips.
 *   3. Quick log     — the user's tracked symptoms (fallback vasomotor + sleep)
 *                      → tap → MenopauseSymptomForm → saveMenopauseLog.
 *   4. Recent        — last few menopause_logs entries.
 *   5. Grandma Wisdom — one stage-appropriate line (inline; E3 deepens).
 *   6. (Peri only)   — "log a period" affordance → MenopausePeriodForm.
 *
 * Design: tokens-only, dual-variant via the shared useMenoPalette() (not
 * re-derived here). Ember mode color, radius.full pills (current) / radius.xl
 * (Diffuse), sticker shadow current-only, Character blobs for every semantic
 * icon (never Lucide). Recolored current shapes under Diffuse — no bespoke
 * Diffuse primitives.
 */

import { useMemo, useState } from 'react'
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { PaperCard } from '../ui/PaperCard'
import { PillButton } from '../ui/PillButton'
import { BrandedLoader } from '../ui/BrandedLoader'
import { LogSheet } from '../calendar/LogSheet'
import { Character } from '../characters/Characters'
import { HomeGreeting } from './HomeGreeting'
import { HomeJourneySwitcher } from './HomeJourneySwitcher'
import { useProfile } from '../../lib/useProfile'
import { useJourneyStore } from '../../store/useJourneyStore'
import { useScrollBottomInset } from '../ui/diffuse/DiffuseKit'
import { useMenoPalette, STICKER_SHADOW, type MenoPalette } from '../menopause/menoPalette'
import { MenopauseSymptomForm, MenopausePeriodForm } from '../menopause/MenopauseLogForms'
import { symptomBlob, logTypeBlob } from '../menopause/menopauseIcons'
import { useMenopauseStore } from '../../store/useMenopauseStore'
import {
  monthsSinceDate,
  shouldOfferMenopauseUpdate,
  type MenopauseStage,
} from '../../lib/menopauseStage'
import { useMenopauseLogs, computeSymptomStats, type MenopauseLogRow } from '../../lib/menopauseAnalytics'
import {
  ALL_MENOPAUSE_SYMPTOMS,
  menopauseSymptomLabel,
  resolveMenopauseSymptomId,
  type MenopauseSymptomId,
} from '../../lib/menopauseSymptoms'
import { supabase } from '../../lib/supabase'

// ─── Static copy (no menopause i18n keys exist yet — English literals) ───────

const STAGE_LABEL: Record<MenopauseStage, string> = {
  peri: 'Perimenopause',
  meno: 'Menopause',
  post: 'Postmenopause',
}

// One warm, non-prescriptive line per stage. E3 replaces this with real content.
const WISDOM: Record<MenopauseStage, string> = {
  peri: 'Perimenopause can feel like a moving target. Noticing your patterns, gently, is how you find steady ground.',
  meno: 'This is a season of change, not decline. A few small notes each week help you — and your clinician — see the whole picture.',
  post: 'You have crossed a threshold. Tending to sleep, movement, and rest keeps this next chapter strong.',
}

const WISDOM_FALLBACK = 'However this season arrives, you do not have to navigate it alone.'

// Fallback quick-log set when the user has logged nothing yet: top vasomotor +
// sleep — the signals most people track first.
const FALLBACK_SYMPTOMS: MenopauseSymptomId[] = ['hot_flash', 'night_sweat', 'sleep']

function getMicroLabel(): string {
  const d = new Date()
  const day = d.toLocaleDateString('en-US', { weekday: 'long' })
  const date = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  return `${day.toUpperCase()} · ${date.toUpperCase()} · MENOPAUSE`
}

function formatLogDate(iso: string): string {
  return new Date(iso + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function logRowLabel(type: string): string {
  if (type === 'period') return 'Period'
  if (type === 'note') return 'Note'
  const id = resolveMenopauseSymptomId(type)
  return id ? menopauseSymptomLabel(id) : type
}

// ═══════════════════════════════════════════════════════════════════════════

export function MenopauseHome() {
  const insets = useSafeAreaInsets()
  const bottomInset = useScrollBottomInset(insets.bottom + 120)
  const pal = useMenoPalette()

  const hydrated = useMenopauseStore((s) => s.hydrated)
  const stage = useMenopauseStore((s) => s.stage)
  const lastPeriodDate = useMenopauseStore((s) => s.lastPeriodDate)

  const parentName = useJourneyStore((s) => s.parentName)
  const { data: profile } = useProfile()
  const displayName = profile?.name ?? parentName

  const { data } = useMenopauseLogs()
  const rows = useMemo<MenopauseLogRow[]>(() => data ?? [], [data])

  const microLabel = useMemo(() => getMicroLabel(), [])

  // Quick-log set: the symptoms the user actually logs (their tracked signals),
  // most-frequent first; fall back to the vasomotor + sleep starter set when
  // there's nothing logged yet. Derived from U7's analytics — no store change.
  const trackedIds = useMemo<MenopauseSymptomId[]>(() => {
    const logged = computeSymptomStats(rows)
      .map((s) => s.id)
      .filter((id): id is MenopauseSymptomId =>
        ALL_MENOPAUSE_SYMPTOMS.some((s) => s.id === id))
    return (logged.length ? logged : FALLBACK_SYMPTOMS).slice(0, 6)
  }, [rows])

  const recent = useMemo<MenopauseLogRow[]>(() => rows.slice(-4).reverse(), [rows])

  // Which log sheet (if any) is open. Both reuse U7's forms verbatim.
  const [activeSheet, setActiveSheet] = useState<'symptom' | 'period' | null>(null)
  // The symptom a quick-log chip pre-selects, so the sheet opens on severity.
  const [pendingSymptom, setPendingSymptom] = useState<MenopauseSymptomId | null>(null)
  // The 12-month offer is dismissible for the session only (never persisted —
  // it re-surfaces next launch until the user updates their stage).
  const [offerDismissed, setOfferDismissed] = useState(false)
  const [confirming, setConfirming] = useState(false)

  const now = new Date()
  const months = monthsSinceDate(lastPeriodDate, now)
  const showOffer =
    !offerDismissed && stage != null && shouldOfferMenopauseUpdate(stage, lastPeriodDate, now)

  // Confirm-only stage flip. setStage('meno') makes shouldOfferMenopauseUpdate
  // false on the next render (stage !== 'peri'), so the card self-hides. The
  // profile write mirrors U7's period write: upsert onConflict 'id' (a
  // menopause-first user may have no profiles row yet), best-effort.
  async function confirmMenopause() {
    if (confirming) return
    setConfirming(true)
    useMenopauseStore.getState().setStage('meno')
    try {
      const { data: s } = await supabase.auth.getSession()
      const userId = s.session?.user.id
      if (userId) {
        const { error } = await supabase
          .from('profiles')
          .upsert({ id: userId, menopause_stage: 'meno' }, { onConflict: 'id' })
        if (error) console.warn('[menopause] profiles menopause_stage write failed:', error.message)
      }
    } catch (e) {
      console.warn('[menopause] stage update failed:', e)
    } finally {
      setConfirming(false)
    }
  }

  // Hydration gate — never render store-derived UI (stage / months / offer)
  // before AsyncStorage rehydrates, or the home flashes a null stage first.
  if (!hydrated) {
    return (
      <View style={[styles.root, styles.loaderRoot, { backgroundColor: pal.bg }]}>
        <BrandedLoader label="Loading" />
      </View>
    )
  }

  const stageLabel = stage ? STAGE_LABEL[stage] : 'Your journey'
  const wisdomLine = stage ? WISDOM[stage] : WISDOM_FALLBACK
  const monthsCaption =
    months === null
      ? 'Log a period to start your counter'
      : months === 1
        ? 'month since your last period'
        : 'months since your last period'

  return (
    <View style={[styles.root, { backgroundColor: pal.bg }]}>
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + 12, paddingBottom: bottomInset },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <HomeGreeting name={displayName} microLabel={microLabel} trailing={<HomeJourneySwitcher />} />

        {/* ─── Hero — stage + months-since-last-period counter ─────────────── */}
        <PaperCard tint={pal.accentSoft} radius={pal.radius.lg} padding={20} style={styles.section}>
          <View style={styles.heroTop}>
            <View style={[styles.heroBlob, { backgroundColor: pal.surface, borderColor: pal.border }]}>
              <Character name="phase" size={30} color={pal.accent} bg={pal.surface} />
            </View>
            <View style={styles.heroTitleWrap}>
              <Text style={[styles.eyebrow, { color: pal.accent, fontFamily: pal.fontBodySemiBold }]}>
                {microLabel}
              </Text>
              <Text style={[styles.heroStage, { color: pal.text, fontFamily: pal.fontDisplay }]}>
                {stageLabel}
              </Text>
            </View>
          </View>

          <View style={styles.heroCount}>
            <Text style={[styles.heroNumber, { color: pal.accent, fontFamily: pal.fontDisplay }]}>
              {months === null ? '—' : months}
            </Text>
            <Text style={[styles.heroCaption, { color: pal.textSecondary, fontFamily: pal.fontBody }]}>
              {monthsCaption}
            </Text>
          </View>
        </PaperCard>

        {/* ─── 12-month offer — never automatic; a warm, dismissible prompt ─── */}
        {showOffer && (
          <PaperCard
            tint={pal.accentSoft}
            radius={pal.radius.lg}
            padding={18}
            borderColor={pal.accent}
            style={styles.section}
          >
            <View style={styles.rowHead}>
              <Character name="celebrate" size={22} color={pal.accent} bg={pal.accentSoft} />
              <Text style={[styles.cardTitle, { color: pal.text, fontFamily: pal.fontDisplay }]}>
                A gentle milestone
              </Text>
            </View>
            <Text style={[styles.offerBody, { color: pal.textSecondary, fontFamily: pal.fontBody }]}>
              It&apos;s been 12 months since your last period — many people consider this menopause.
              Update your stage?
            </Text>
            <View style={styles.offerActions}>
              <PillButton
                label="Update to menopause"
                variant="ink"
                onPress={confirmMenopause}
                loading={confirming}
                style={styles.offerCta}
              />
              <Pressable
                onPress={() => setOfferDismissed(true)}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Dismiss the menopause update prompt"
                style={styles.dismiss}
              >
                <Text style={[styles.dismissText, { color: pal.textMuted, fontFamily: pal.fontBodyMedium }]}>
                  Not now
                </Text>
              </Pressable>
            </View>
          </PaperCard>
        )}

        {/* ─── Quick log — tracked symptoms → reuse U7's symptom form ───────── */}
        <PaperCard radius={pal.radius.lg} padding={18} style={styles.section}>
          <Text style={[styles.cardTitle, { color: pal.text, fontFamily: pal.fontDisplay }]}>
            Quick log
          </Text>
          <Text style={[styles.cardSub, { color: pal.textMuted, fontFamily: pal.fontBody }]}>
            Tap a signal to note how you&apos;re feeling today.
          </Text>
          <View style={styles.chipWrap}>
            {trackedIds.map((id) => (
              <QuickChip key={id} id={id} pal={pal} onPress={() => { setPendingSymptom(id); setActiveSheet('symptom') }} />
            ))}
          </View>
        </PaperCard>

        {/* ─── Recent — last few logged entries ────────────────────────────── */}
        <PaperCard radius={pal.radius.lg} padding={18} style={styles.section}>
          <Text style={[styles.cardTitle, { color: pal.text, fontFamily: pal.fontDisplay }]}>
            Recent
          </Text>
          {recent.length === 0 ? (
            <Text style={[styles.emptyText, { color: pal.textMuted, fontFamily: pal.fontBody }]}>
              Nothing logged yet. Your notes will show up here.
            </Text>
          ) : (
            <View style={styles.recentList}>
              {recent.map((r, i) => (
                <RecentRow key={`${r.date}-${r.type}-${i}`} row={r} pal={pal} />
              ))}
            </View>
          )}
        </PaperCard>

        {/* ─── Grandma Wisdom — one stage-appropriate line ─────────────────── */}
        <PaperCard tint={pal.accentSoft} radius={pal.radius.lg} padding={18} style={styles.section}>
          <View style={styles.rowHead}>
            <Character name="selfcare" size={22} color={pal.accent} bg={pal.accentSoft} />
            <Text style={[styles.eyebrow, { color: pal.accent, fontFamily: pal.fontBodySemiBold }]}>
              FROM GRANDMA
            </Text>
          </View>
          <Text style={[styles.wisdomText, { color: pal.text, fontFamily: pal.fontDisplay }]}>
            {wisdomLine}
          </Text>
        </PaperCard>

        {/* ─── Peri only — log a period affordance ─────────────────────────── */}
        {stage === 'peri' && (
          <PaperCard radius={pal.radius.lg} padding={18} style={styles.section}>
            <View style={styles.periodRow}>
              <View style={[styles.periodBlob, { backgroundColor: pal.accentSoft, borderColor: pal.border }]}>
                <Character name="period" size={24} color={pal.accent} bg={pal.accentSoft} />
              </View>
              <View style={styles.periodCopy}>
                <Text style={[styles.cardTitle, { color: pal.text, fontFamily: pal.fontDisplay }]}>
                  Still spotting?
                </Text>
                <Text style={[styles.cardSub, { color: pal.textMuted, fontFamily: pal.fontBody }]}>
                  Log a period to keep your counter accurate.
                </Text>
              </View>
            </View>
            <PillButton
              label="Log a period"
              variant="ink"
              onPress={() => setActiveSheet('period')}
              style={styles.periodCta}
            />
          </PaperCard>
        )}
      </ScrollView>

      {/* Reused U7 log sheets — the parent supplies the sheet shell + title. */}
      <LogSheet
        visible={activeSheet === 'symptom'}
        title="Log a symptom"
        onClose={() => setActiveSheet(null)}
      >
        <MenopauseSymptomForm initialId={pendingSymptom ?? undefined} onSaved={() => { setActiveSheet(null); setPendingSymptom(null) }} />
      </LogSheet>
      <LogSheet
        visible={activeSheet === 'period'}
        title="Log a period"
        onClose={() => setActiveSheet(null)}
      >
        <MenopausePeriodForm onSaved={() => setActiveSheet(null)} />
      </LogSheet>
    </View>
  )
}

// ─── Quick-log chip — tappable tracked symptom (group blob + label) ──────────

function QuickChip({
  id,
  pal,
  onPress,
}: {
  id: MenopauseSymptomId
  pal: MenoPalette
  onPress: () => void
}) {
  const label = menopauseSymptomLabel(id)
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Log ${label}`}
      style={({ pressed }) => [
        styles.quickChip,
        // Hard-offset sticker shadow — CURRENT variant only; Diffuse stays flat.
        !pal.diffuse && { ...STICKER_SHADOW, shadowColor: pal.text },
        {
          backgroundColor: pal.surface,
          borderColor: pal.border,
          // radius.full resolves to the pill (current) / xl outline (Diffuse)
          // inside the shared palette — one token, correct per variant.
          borderRadius: pal.radius.full,
          opacity: pressed ? 0.7 : 1,
        },
      ]}
    >
      <Character name={symptomBlob(id)} size={18} color={pal.accent} bg={pal.surface} />
      <Text style={[styles.quickChipText, { color: pal.textSecondary, fontFamily: pal.fontBodyMedium }]}>
        {label}
      </Text>
    </Pressable>
  )
}

// ─── Recent row — blob + label + date/detail ─────────────────────────────────

function RecentRow({ row, pal }: { row: MenopauseLogRow; pal: MenoPalette }) {
  const detail =
    row.severity != null
      ? `${formatLogDate(row.date)} · intensity ${row.severity}/5`
      : row.value
        ? `${formatLogDate(row.date)} · ${row.value}`
        : formatLogDate(row.date)
  return (
    <View style={styles.recentRow}>
      <View style={[styles.recentBlob, { backgroundColor: pal.accentSoft }]}>
        <Character name={logTypeBlob(row.type)} size={18} color={pal.accent} bg={pal.accentSoft} />
      </View>
      <View style={styles.recentCopy}>
        <Text style={[styles.recentLabel, { color: pal.text, fontFamily: pal.fontBodySemiBold }]}>
          {logRowLabel(row.type)}
        </Text>
        <Text style={[styles.recentDetail, { color: pal.textMuted, fontFamily: pal.fontBody }]}>
          {detail}
        </Text>
      </View>
    </View>
  )
}

// One consistent vertical rhythm between stacked sections (matches CycleHome).
const SECTION_GAP = 16

const styles = StyleSheet.create({
  root: { flex: 1 },
  loaderRoot: { alignItems: 'center', justifyContent: 'center' },
  scroll: { paddingHorizontal: 20 },
  section: { marginTop: SECTION_GAP },

  // Hero
  heroTop: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  heroBlob: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTitleWrap: { flex: 1, gap: 4 },
  eyebrow: { fontSize: 11, letterSpacing: 0.8, textTransform: 'uppercase' },
  heroStage: { fontSize: 26, letterSpacing: -0.4 },
  heroCount: { marginTop: 18, alignItems: 'center', gap: 2 },
  heroNumber: { fontSize: 64, lineHeight: 68, letterSpacing: -1 },
  heroCaption: { fontSize: 14 },

  // Shared card bits
  rowHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  cardTitle: { fontSize: 20, letterSpacing: -0.3 },
  cardSub: { fontSize: 13.5, lineHeight: 19, marginTop: 3 },

  // 12-month offer
  offerBody: { fontSize: 14.5, lineHeight: 21, marginTop: 6 },
  offerActions: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 16 },
  offerCta: { flex: 1 },
  dismiss: { paddingVertical: 10, paddingHorizontal: 6 },
  dismissText: { fontSize: 14.5 },

  // Quick log
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 14 },
  quickChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
  },
  quickChipText: { fontSize: 14.5 },

  // Recent
  recentList: { marginTop: 12, gap: 12 },
  recentRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  recentBlob: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  recentCopy: { flex: 1, gap: 1 },
  recentLabel: { fontSize: 15 },
  recentDetail: { fontSize: 13 },
  emptyText: { fontSize: 14, lineHeight: 20, marginTop: 10 },

  // Wisdom
  wisdomText: { fontSize: 18, lineHeight: 26, letterSpacing: -0.2 },

  // Period affordance
  periodRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  periodBlob: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  periodCopy: { flex: 1 },
  periodCta: { marginTop: 14 },
})
