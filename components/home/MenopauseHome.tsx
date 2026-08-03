/**
 * MenopauseHome (E1 / U8) — the Menopause behavior home surface.
 *
 * Dual-variant, mirroring CycleHome / KidsHome. In the CURRENT (cream) variant it
 * renders PaperCard sections; in DIFFUSE it renders the shared Diffuse primitives
 * (DiffuseStatCard / DiffuseSectionHeader / DiffuseListRow / DiffuseEmptyState),
 * so it belongs to the same design language as the other behavior homes. Both
 * variants resolve every color/font from useMenoPalette() (Ember `meno` field).
 *
 * Top → bottom:
 *   1. Hero          — stage label + "months since last period" (gentle "—" when
 *                      unknown). DiffuseStatCard in Diffuse.
 *   2. 12-month offer — non-blocking; only when shouldOfferMenopauseUpdate() is
 *                      true (peri + >=12mo). Confirm sets stage 'meno'. NEVER auto-flips.
 *   3. Quick log     — the user's tracked symptoms (fallback vasomotor + sleep)
 *                      → tap → MenopauseSymptomForm → saveMenopauseLog.
 *   4. Recent        — last few menopause_logs entries (DiffuseListRow in Diffuse).
 *   5. Grandma Wisdom — one stage-appropriate line (inline; E3 deepens).
 *   6. (Peri only)   — "log a period" affordance → MenopausePeriodForm.
 *   7. Wallet        — the shared "Quick access" stack every behavior home carries.
 */

import { useMemo, useState } from 'react'
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { PaperCard } from '../ui/PaperCard'
import { PillButton } from '../ui/PillButton'
import { BrandedLoader } from '../ui/BrandedLoader'
import { LogSheet } from '../calendar/LogSheet'
import { Character } from '../characters/Characters'
import { Ionicons } from '@expo/vector-icons'
import { HomeGreeting } from './HomeGreeting'
import { HomeJourneySwitcher } from './HomeJourneySwitcher'
import { MenopauseWallet } from './MenopauseWallet'
import { useProfile } from '../../lib/useProfile'
import { useJourneyStore } from '../../store/useJourneyStore'
import { useScrollBottomInset } from '../ui/diffuse/DiffuseKit'
import { DiffuseSectionHeader } from '../ui/diffuse/DiffusePrimitives'
import { diffuseFont, useTheme } from '../../constants/theme'
import { useTranslation } from '../../lib/i18n'
import { useMenoPalette, STICKER_SHADOW, type MenoPalette } from '../menopause/menoPalette'
import { MenopauseRing } from '../menopause/MenopauseRing'
import { MenopauseWeekStrip } from '../menopause/MenopauseWeekStrip'
import { QuietPill } from '../ui/QuietPill'
import { WalletPicker, type WalletPickerItem } from './WalletPicker'
import { SlidersHorizontal } from 'lucide-react-native'
import { useMenopauseQuickLogStore, DEFAULT_MENOPAUSE_QUICK_LOG_KEYS } from '../../store/useMenopauseQuickLogStore'
import { MenopauseSymptomForm, MenopausePeriodForm } from '../menopause/MenopauseLogForms'
import { symptomBlob, symptomStickerKey } from '../menopause/menopauseIcons'
import { useMenopauseStore } from '../../store/useMenopauseStore'
import {
  monthsSinceDate,
  shouldOfferMenopauseUpdate,
  type MenopauseStage,
} from '../../lib/menopauseStage'
import { useMenopauseLogs, type MenopauseLogRow } from '../../lib/menopauseAnalytics'
import {
  ALL_MENOPAUSE_SYMPTOMS,
  menopauseSymptomLabel,
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

function getMicroLabel(): string {
  const d = new Date()
  const day = d.toLocaleDateString('en-US', { weekday: 'long' })
  const date = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  return `${day.toUpperCase()} · ${date.toUpperCase()} · MENOPAUSE`
}

// ═══════════════════════════════════════════════════════════════════════════

export function MenopauseHome() {
  const insets = useSafeAreaInsets()
  const bottomInset = useScrollBottomInset(insets.bottom + 120)
  const pal = useMenoPalette()
  const { t } = useTranslation()
  // Per-symptom-group hues from the shared sticker palette (active both variants),
  // so signals read with varied colour like the other behaviors.
  const { stickers } = useTheme()
  const hueOf = (type: string) => (stickers as Record<string, string>)[symptomStickerKey(type)]
  const hueSoftOf = (type: string) => (stickers as Record<string, string>)[`${symptomStickerKey(type)}Soft`]

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
  // Quick-log signals = the user's pinned set (editable via the picker), falling
  // back to the broad defaults until the store rehydrates. Filtered to valid ids.
  const quickHydrated = useMenopauseQuickLogStore((s) => s.hydrated)
  const quickEnabled = useMenopauseQuickLogStore((s) => s.enabledKeys)
  const setQuickEnabled = useMenopauseQuickLogStore((s) => s.setEnabled)
  const [quickPickerOpen, setQuickPickerOpen] = useState(false)

  const trackedIds = useMemo<MenopauseSymptomId[]>(() => {
    const keys = quickHydrated ? quickEnabled : DEFAULT_MENOPAUSE_QUICK_LOG_KEYS
    return keys.filter((id): id is MenopauseSymptomId =>
      ALL_MENOPAUSE_SYMPTOMS.some((s) => s.id === id))
  }, [quickHydrated, quickEnabled])

  // Full symptom catalog for the quick-log Edit picker.
  const quickPickerItems = useMemo<WalletPickerItem[]>(
    () =>
      ALL_MENOPAUSE_SYMPTOMS.map((s) => ({
        key: s.id,
        label: menopauseSymptomLabel(s.id),
        icon: <Character name={symptomBlob(s.id)} size={26} color={hueOf(s.id)} />,
        soft: hueSoftOf(s.id),
      })),
    [stickers], // eslint-disable-line react-hooks/exhaustive-deps
  )

  // Which log sheet (if any) is open. Both reuse U7's forms verbatim.
  const [activeSheet, setActiveSheet] = useState<'symptom' | 'period' | null>(null)
  // The symptom a quick-log chip pre-selects, so the sheet opens on severity.
  const [pendingSymptom, setPendingSymptom] = useState<MenopauseSymptomId | null>(null)
  // The date a week-strip tap targets (null = today, for the quick-log chips).
  const [logDate, setLogDate] = useState<string | null>(null)
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

  const openSymptom = (id: MenopauseSymptomId) => { setLogDate(null); setPendingSymptom(id); setActiveSheet('symptom') }
  // "More" opens the symptom sheet with nothing pre-selected → the full grouped
  // catalog (all 13 signals + severity + note), so anything can be logged.
  const openMore = () => { setLogDate(null); setPendingSymptom(null); setActiveSheet('symptom') }
  // A week-strip tap logs for THAT day (threaded to the form via logDate).
  const openLogForDate = (date: string) => { setLogDate(date); setPendingSymptom(null); setActiveSheet('symptom') }

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

        {/* ─── Ring — the menopause "wheel": last 28 days on a hairline ring,
            logged days carry their symptom blob, empty days a soft check, today
            ringed; stage + months-since-last-period counter in the center. The
            flat-time analogue of cycle's phase ring (both variants). */}
        <View style={styles.ringSection}>
          <MenopauseRing
            rows={rows}
            pal={pal}
            stageLabel={stageLabel}
            months={months}
            monthsCaption={monthsCaption}
          />
        </View>

        {/* Week strip — tap a day to log for it (cycle-home parity). */}
        <View style={styles.section}>
          <MenopauseWeekStrip rows={rows} pal={pal} onDatePress={openLogForDate} />
        </View>

        {/* ─── 12-month offer — never automatic; a warm, dismissible prompt ─── */}
        {showOffer && (
          pal.diffuse ? (
            <View style={[styles.section, styles.diffuseSoftCard, { backgroundColor: pal.accentSoft, borderColor: pal.accent, borderRadius: pal.radius.lg }]}>
              <DiffuseSectionHeader
                title="A gentle milestone"
                icon={<Character name="celebrate" size={21} color={pal.accent} />}
              />
              <Text style={[styles.offerBody, { color: pal.textSecondary, fontFamily: pal.fontBody }]}>
                It&apos;s been 12 months since your last period — many people consider this menopause.
                Update your stage?
              </Text>
              <View style={styles.offerActions}>
                <PillButton label="Update to menopause" variant="ink" onPress={confirmMenopause} loading={confirming} style={styles.offerCta} />
                <Pressable
                  onPress={() => setOfferDismissed(true)}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel="Dismiss the menopause update prompt"
                  style={styles.dismiss}
                >
                  <Text style={[styles.dismissText, { color: pal.textMuted, fontFamily: pal.fontBodyMedium }]}>Not now</Text>
                </Pressable>
              </View>
            </View>
          ) : (
            <PaperCard tint={pal.accentSoft} radius={pal.radius.lg} padding={18} borderColor={pal.accent} style={styles.section}>
              <View style={styles.rowHead}>
                <Character name="celebrate" size={22} color={pal.accent} bg={pal.accentSoft} />
                <Text style={[styles.cardTitle, { color: pal.text, fontFamily: pal.fontDisplay }]}>A gentle milestone</Text>
              </View>
              <Text style={[styles.offerBody, { color: pal.textSecondary, fontFamily: pal.fontBody }]}>
                It&apos;s been 12 months since your last period — many people consider this menopause.
                Update your stage?
              </Text>
              <View style={styles.offerActions}>
                <PillButton label="Update to menopause" variant="ink" onPress={confirmMenopause} loading={confirming} style={styles.offerCta} />
                <Pressable
                  onPress={() => setOfferDismissed(true)}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel="Dismiss the menopause update prompt"
                  style={styles.dismiss}
                >
                  <Text style={[styles.dismissText, { color: pal.textMuted, fontFamily: pal.fontBodyMedium }]}>Not now</Text>
                </Pressable>
              </View>
            </PaperCard>
          )
        )}

        {/* ─── Quick log — tracked symptoms → reuse U7's symptom form ───────── */}
        {pal.diffuse ? (
          <View style={styles.section}>
            <DiffuseSectionHeader
              eyebrow="TODAY"
              title="Quick log"
              right={
                <QuietPill
                  leading={<SlidersHorizontal size={16} color={pal.textMuted} strokeWidth={2} />}
                  onPress={() => setQuickPickerOpen(true)}
                  accessibilityLabel="Edit quick-log signals"
                />
              }
            />
            <Text style={[styles.cardSub, { color: pal.textMuted, fontFamily: pal.fontBody }]}>
              Tap a signal to note how you&apos;re feeling today.
            </Text>
            <View style={styles.chipWrap}>
              {trackedIds.map((id) => (
                <QuickChip key={id} id={id} pal={pal} onPress={() => openSymptom(id)} />
              ))}
              <MoreChip pal={pal} onPress={openMore} />
            </View>
          </View>
        ) : (
          <PaperCard radius={pal.radius.lg} padding={18} style={styles.section}>
            <View style={styles.quickHead}>
              <Text style={[styles.cardTitle, { color: pal.text, fontFamily: pal.fontDisplay }]}>Quick log</Text>
              <QuietPill
                leading={<SlidersHorizontal size={16} color={pal.textMuted} strokeWidth={2} />}
                onPress={() => setQuickPickerOpen(true)}
                accessibilityLabel="Edit quick-log signals"
              />
            </View>
            <Text style={[styles.cardSub, { color: pal.textMuted, fontFamily: pal.fontBody }]}>
              Tap a signal to note how you&apos;re feeling today.
            </Text>
            <View style={styles.chipWrap}>
              {trackedIds.map((id) => (
                <QuickChip key={id} id={id} pal={pal} onPress={() => openSymptom(id)} />
              ))}
              <MoreChip pal={pal} onPress={openMore} />
            </View>
          </PaperCard>
        )}

        {/* Recent moved to the Agenda tab (MenopauseTimeline) — the date-grouped
            log timeline, mirroring where cycle/kids surface their logged entries. */}

        {/* ─── Grandma Wisdom — one stage-appropriate line ─────────────────── */}
        {pal.diffuse ? (
          <View style={[styles.section, styles.diffuseSoftCard, { backgroundColor: pal.accentSoft, borderColor: pal.border, borderRadius: pal.radius.lg }]}>
            <DiffuseSectionHeader
              eyebrow="FROM GRANDMA"
              title="A note for today"
              icon={<Character name="selfcare" size={21} color={pal.accent} />}
            />
            <Text style={[styles.wisdomText, { color: pal.text, fontFamily: pal.fontDisplay }]}>{wisdomLine}</Text>
          </View>
        ) : (
          <PaperCard tint={pal.accentSoft} radius={pal.radius.lg} padding={18} style={styles.section}>
            <View style={styles.rowHead}>
              <Character name="selfcare" size={22} color={pal.accent} bg={pal.accentSoft} />
              <Text style={[styles.eyebrow, { color: pal.accent, fontFamily: pal.fontBodySemiBold }]}>FROM GRANDMA</Text>
            </View>
            <Text style={[styles.wisdomText, { color: pal.text, fontFamily: pal.fontDisplay }]}>{wisdomLine}</Text>
          </PaperCard>
        )}

        {/* ─── Peri only — log a period affordance ─────────────────────────── */}
        {stage === 'peri' && (
          pal.diffuse ? (
            <View style={[styles.section, styles.diffuseSoftCard, { backgroundColor: pal.surface, borderColor: pal.border, borderRadius: pal.radius.lg }]}>
              <View style={styles.periodRow}>
                <View style={[styles.periodBlob, { backgroundColor: pal.accentSoft, borderColor: pal.border }]}>
                  <Character name="period" size={24} color={pal.accent} bg={pal.accentSoft} />
                </View>
                <View style={styles.periodCopy}>
                  <Text style={[styles.cardTitle, { color: pal.text, fontFamily: pal.fontDisplay }]}>Still spotting?</Text>
                  <Text style={[styles.cardSub, { color: pal.textMuted, fontFamily: pal.fontBody }]}>
                    Log a period to keep your counter accurate.
                  </Text>
                </View>
              </View>
              <PillButton label="Log a period" variant="ink" onPress={() => setActiveSheet('period')} style={styles.periodCta} />
            </View>
          ) : (
            <PaperCard radius={pal.radius.lg} padding={18} style={styles.section}>
              <View style={styles.periodRow}>
                <View style={[styles.periodBlob, { backgroundColor: pal.accentSoft, borderColor: pal.border }]}>
                  <Character name="period" size={24} color={pal.accent} bg={pal.accentSoft} />
                </View>
                <View style={styles.periodCopy}>
                  <Text style={[styles.cardTitle, { color: pal.text, fontFamily: pal.fontDisplay }]}>Still spotting?</Text>
                  <Text style={[styles.cardSub, { color: pal.textMuted, fontFamily: pal.fontBody }]}>
                    Log a period to keep your counter accurate.
                  </Text>
                </View>
              </View>
              <PillButton label="Log a period" variant="ink" onPress={() => setActiveSheet('period')} style={styles.periodCta} />
            </PaperCard>
          )
        )}

        {/* ─── Wallet — the shared "Quick access" stack every behavior home has ─ */}
        <View style={styles.section}>
          <Text style={[styles.walletHeading, { color: pal.text, fontFamily: pal.fontDisplay }]}>
            {t('home_wallet_label')}
          </Text>
          <MenopauseWallet />
        </View>
      </ScrollView>

      {/* Reused U7 log sheets — the parent supplies the sheet shell + title. */}
      <LogSheet
        visible={activeSheet === 'symptom'}
        title="Log a symptom"
        onClose={() => { setActiveSheet(null); setLogDate(null) }}
      >
        <MenopauseSymptomForm
          initialId={pendingSymptom ?? undefined}
          logDate={logDate ?? undefined}
          onSaved={() => { setActiveSheet(null); setPendingSymptom(null); setLogDate(null) }}
        />
      </LogSheet>
      <LogSheet
        visible={activeSheet === 'period'}
        title="Log a period"
        onClose={() => setActiveSheet(null)}
      >
        <MenopausePeriodForm onSaved={() => setActiveSheet(null)} />
      </LogSheet>

      {/* Quick-log Edit picker — choose which signals are pinned (shared with the
          cycle/kids quick-log + wallet editors via WalletPicker). */}
      <WalletPicker
        visible={quickPickerOpen}
        onClose={() => setQuickPickerOpen(false)}
        items={quickPickerItems}
        enabledKeys={trackedIds}
        onSave={setQuickEnabled}
      />
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
  const { stickers } = useTheme()
  const hue = (stickers as Record<string, string>)[symptomStickerKey(id)]
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
          // Diffuse uses the softer 12px chip radius (matches CycleTodaySummaryCard);
          // current keeps the sticker pill (radius.full).
          borderRadius: pal.diffuse ? 12 : pal.radius.full,
          opacity: pressed ? 0.7 : 1,
        },
      ]}
    >
      <Character name={symptomBlob(id)} size={18} color={hue} bg={pal.surface} />
      <Text
        style={[
          styles.quickChipText,
          pal.diffuse
            ? { color: pal.text, fontFamily: diffuseFont.mono, textTransform: 'uppercase', letterSpacing: 0.5, fontSize: 12.5 }
            : { color: pal.textSecondary, fontFamily: pal.fontBodyMedium },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  )
}

// ─── "More" chip — opens the full symptom catalog (accent-tinted, "+") ───────

function MoreChip({ pal, onPress }: { pal: MenoPalette; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Log another symptom"
      style={({ pressed }) => [
        styles.quickChip,
        !pal.diffuse && { ...STICKER_SHADOW, shadowColor: pal.text },
        {
          backgroundColor: pal.accentSoft,
          borderColor: pal.accent,
          borderRadius: pal.diffuse ? 12 : pal.radius.full,
          opacity: pressed ? 0.7 : 1,
        },
      ]}
    >
      <Ionicons name="add" size={16} color={pal.accent} />
      <Text
        style={[
          styles.quickChipText,
          pal.diffuse
            ? { color: pal.accent, fontFamily: diffuseFont.mono, textTransform: 'uppercase', letterSpacing: 0.5, fontSize: 12.5 }
            : { color: pal.accent, fontFamily: pal.fontBodyMedium },
        ]}
      >
        More
      </Text>
    </Pressable>
  )
}

// One consistent vertical rhythm between stacked sections (matches CycleHome).
const SECTION_GAP = 16

const styles = StyleSheet.create({
  root: { flex: 1 },
  loaderRoot: { alignItems: 'center', justifyContent: 'center' },
  scroll: { paddingHorizontal: 20 },
  section: { marginTop: SECTION_GAP },
  ringSection: { marginTop: 8, marginBottom: 4 },

  // Diffuse soft card wrapper (hairline box; used for offer / wisdom / period).
  diffuseSoftCard: { borderWidth: 1, padding: 18 },

  // Hero (cream)
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
  quickHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
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

  // Recent (cream)
  recentList: { marginTop: 12, gap: 12 },
  recentRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  recentBlob: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  recentCopy: { flex: 1, gap: 1 },
  recentLabel: { fontSize: 15 },
  recentDetail: { fontSize: 13 },
  emptyText: { fontSize: 14, lineHeight: 20, marginTop: 10 },

  // Wisdom
  wisdomText: { fontSize: 18, lineHeight: 26, letterSpacing: -0.2, marginTop: 6 },

  // Wallet
  walletHeading: { fontSize: 22, letterSpacing: -0.3, marginBottom: 12 },

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
