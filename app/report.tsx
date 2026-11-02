/**
 * Report for the doctor — one generic screen for Pregnancy, Cycle and
 * Menopause (`/report?behavior=pregnancy|pre-pregnancy|menopause`). Kids has
 * its own pediatric screen (app/child-report.tsx); both share the PDF plumbing
 * and print styles in lib/reports/reportKit.
 *
 * Light site look: sticker header · period chips (30 / 90 / All) · an
 * "include" checklist of sections with counts · the EyeAction "Make PDF" disc
 * → share sheet. Without expo-print (Expo Go / old builds) the disc is disabled
 * and the friendly "needs the next update" line shows. First load = skeleton.
 */

import { useMemo, useState } from 'react'
import { View, Text, Pressable, ScrollView, StyleSheet, Alert } from 'react-native'
import { useLocalSearchParams } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Svg, { Path } from 'react-native-svg'
import { useTheme, getModeColorSoft } from '../constants/theme'
import { useTranslation } from '../lib/i18n'
import { InkBackButton } from '../components/ui/InkBackButton'
import { SiteSticker } from '../components/stickers/SiteSticker'
import { SiteChoice } from '../components/ui/SiteChoice'
import { EyeAction, ACTION_TONES } from '../components/ui/AuthDock'
import { Skeleton, SkeletonRow } from '../components/ui/Skeleton'
import { Display, MonoCaps } from '../components/ui/Typography'
import {
  isMissingPdfModuleError, isPdfExportAvailable, REPORT_PERIODS, shareReportPdf,
  type ReportBehavior, type ReportPeriod, type ReportSection,
} from '../lib/reports/reportKit'
import {
  useCycleReport, useMenopauseReport, usePregnancyReport, type JourneyReportResult,
} from '../lib/reports/useJourneyReport'

const MODE: Record<ReportBehavior, string> = { pregnancy: 'preg', 'pre-pregnancy': 'pre', menopause: 'meno' }

function parseBehavior(raw: string | string[] | undefined): ReportBehavior {
  const b = Array.isArray(raw) ? raw[0] : raw
  return b === 'pregnancy' || b === 'menopause' ? b : 'pre-pregnancy'
}

export default function ReportScreen() {
  const params = useLocalSearchParams<{ behavior?: string }>()
  const behavior = parseBehavior(params.behavior)
  const [period, setPeriod] = useState<ReportPeriod>('90')
  // One data hook per journey, each in its own component so hooks stay unconditional.
  if (behavior === 'pregnancy') return <PregnancyReportScreen period={period} setPeriod={setPeriod} />
  if (behavior === 'menopause') return <MenopauseReportScreen period={period} setPeriod={setPeriod} />
  return <CycleReportScreen period={period} setPeriod={setPeriod} />
}

interface PeriodProps { period: ReportPeriod; setPeriod: (p: ReportPeriod) => void }

function PregnancyReportScreen(p: PeriodProps) {
  return <ReportBody behavior="pregnancy" {...p} result={usePregnancyReport(p.period)} />
}
function CycleReportScreen(p: PeriodProps) {
  return <ReportBody behavior="pre-pregnancy" {...p} result={useCycleReport(p.period)} />
}
function MenopauseReportScreen(p: PeriodProps) {
  return <ReportBody behavior="menopause" {...p} result={useMenopauseReport(p.period)} />
}

function ReportBody({ behavior, period, setPeriod, result }: PeriodProps & { behavior: ReportBehavior; result: JourneyReportResult }) {
  const { colors, font } = useTheme()
  const { t } = useTranslation()
  const insets = useSafeAreaInsets()
  const tone = getModeColorSoft(MODE[behavior])
  const ink = colors.text
  const { model, isLoading } = result

  // Sections the user unticked (everything with entries is included by default).
  const [excluded, setExcluded] = useState<Set<string>>(() => new Set())
  const [generating, setGenerating] = useState(false)
  // PDF needs the native expo-print module — absent on un-rebuilt clients / Expo Go.
  const pdfAvailable = isPdfExportAvailable()

  const included = useMemo(
    () => (model?.sections ?? []).filter((s) => s.count > 0 && !excluded.has(s.id)).map((s) => s.id),
    [model, excluded],
  )
  const hasAnyData = !!model?.sections.some((s) => s.count > 0)

  const journeyTitle =
    behavior === 'pregnancy' ? t('report_preg_title') : behavior === 'menopause' ? t('report_meno_title') : t('report_cycle_title')

  function toggle(id: string) {
    setExcluded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function handleMake() {
    if (!model || !included.length) return
    setGenerating(true)
    try {
      await shareReportPdf(model, included)
    } catch (e) {
      Alert.alert(t('report_errorTitle'), isMissingPdfModuleError(e) ? t('report_errorRebuild') : t('report_errorGeneric'))
    } finally {
      setGenerating(false)
    }
  }

  const periodLabel = (p: ReportPeriod) =>
    p === '30' ? t('report_period_30') : p === '90' ? t('report_period_90') : t('report_period_all')

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <InkBackButton ink={ink} paper={colors.surface} style={{ marginBottom: 0 }} />
        <SiteSticker name="doc" size={30} cut />
        <Display size={24} color={ink} style={styles.title} numberOfLines={2}>{t('report_cardTitle')}</Display>
      </View>

      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 48 }]} showsVerticalScrollIndicator={false}>
        <MonoCaps color={colors.textMuted} style={styles.eyebrow}>{journeyTitle}</MonoCaps>
        <Text style={[styles.intro, { color: colors.textSecondary, fontFamily: font.body }]}>{t('report_screenIntro')}</Text>

        <MonoCaps color={colors.textMuted} style={[styles.eyebrow, { marginTop: 26 }]}>{t('report_period')}</MonoCaps>
        <View style={styles.chips}>
          {REPORT_PERIODS.map((p) => (
            <SiteChoice
              key={p}
              label={periodLabel(p)}
              selected={period === p}
              onPress={() => setPeriod(p)}
              tone={tone}
              compact
              tick={false}
              style={{ flex: 1 }}
            />
          ))}
        </View>

        <MonoCaps color={colors.textMuted} style={[styles.eyebrow, { marginTop: 26 }]}>{t('report_include')}</MonoCaps>
        {isLoading && !model ? (
          // First load: ghost rows shaped like the checklist.
          <View style={{ marginTop: 10, gap: 14 }}>
            {[0, 1, 2, 3, 4].map((i) => <SkeletonRow key={i} />)}
            <Skeleton width={120} height={120} radius={60} style={{ alignSelf: 'center', marginTop: 18 }} />
          </View>
        ) : (
          <>
            <View style={[styles.list, { borderTopColor: colors.borderLight }]}>
              {(model?.sections ?? []).map((s) => (
                <IncludeRow
                  key={s.id}
                  section={s}
                  checked={s.count > 0 && !excluded.has(s.id)}
                  onToggle={() => toggle(s.id)}
                  tone={tone}
                />
              ))}
            </View>

            {model && !hasAnyData && (
              <Text style={[styles.note, { color: colors.textSecondary, fontFamily: font.body }]}>{t('report_noDataPeriod')}</Text>
            )}

            <View style={styles.action}>
              <EyeAction
                label={t('report_makePdf')}
                onPress={handleMake}
                ink={ink}
                loading={generating}
                disabled={!pdfAvailable || !included.length}
                sticker="doc"
                fill={ACTION_TONES.yellow}
                size={76}
              />
            </View>

            {!pdfAvailable && (
              <Text style={[styles.note, { color: colors.textMuted, fontFamily: font.body, textAlign: 'center' }]}>
                {t('report_needsUpdate')}
              </Text>
            )}
          </>
        )}

        <Text style={[styles.disclaimer, { color: colors.textMuted, fontFamily: font.body }]}>{t('disclaimer_short')}</Text>
      </ScrollView>
    </View>
  )
}

/** One quiet checklist row: ink box (soft tone + tick when on) · sticker · label · count. */
function IncludeRow({ section, checked, onToggle, tone }: { section: ReportSection; checked: boolean; onToggle: () => void; tone: string }) {
  const { colors, font } = useTheme()
  const { t } = useTranslation()
  const ink = colors.text
  const empty = section.count === 0
  return (
    <Pressable
      onPress={empty ? undefined : onToggle}
      disabled={empty}
      accessibilityRole="checkbox"
      accessibilityState={{ checked, disabled: empty }}
      accessibilityLabel={section.title}
      style={({ pressed }) => [styles.row, { borderBottomColor: colors.borderLight }, empty && { opacity: 0.45 }, pressed && { opacity: 0.7 }]}
    >
      <View style={[styles.box, { borderColor: ink, backgroundColor: checked ? tone : 'transparent' }]}>
        {checked && (
          <Svg width={14} height={14} viewBox="0 0 18 18">
            <Path d="M3.5 9.5 L7.5 13 L14.5 4.5" stroke={ink} strokeWidth={2.8} fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
        )}
      </View>
      <SiteSticker name={section.sticker} size={28} cut />
      <Text style={[styles.rowLabel, { color: ink, fontFamily: font.bodyBold }]} numberOfLines={2}>{section.title}</Text>
      <Text style={[styles.rowCount, { color: ink }]}>
        {empty ? t('report_none') : t(section.count === 1 ? 'report_entries_one' : 'report_entries_other', { count: section.count })}
      </Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 10 },
  title: { textTransform: 'uppercase', letterSpacing: 0.3, flexShrink: 1 },
  scroll: { paddingHorizontal: 24, paddingTop: 18 },
  eyebrow: { letterSpacing: 1.4, textTransform: 'uppercase' },
  intro: { fontSize: 14, lineHeight: 21, marginTop: 8 },
  chips: { flexDirection: 'row', gap: 8, marginTop: 10 },
  list: { marginTop: 8, borderTopWidth: StyleSheet.hairlineWidth },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13, borderBottomWidth: StyleSheet.hairlineWidth },
  box: { width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  rowLabel: { flex: 1, fontSize: 15 },
  rowCount: { fontFamily: 'SpaceMono_400Regular', fontSize: 10, letterSpacing: 1.2, textTransform: 'uppercase' },
  action: { alignItems: 'center', marginTop: 28 },
  note: { fontSize: 13, lineHeight: 19, marginTop: 12 },
  disclaimer: { fontSize: 11, lineHeight: 16, marginTop: 28, textAlign: 'center' },
})
