/**
 * Pediatric report screen (Phase 2). Gathers a child's medical summary and
 * generates a print-ready PDF for the doctor via expo-print.
 *
 * Reached from Kids analytics ("Report for doctor"). Reads the child from
 * useChildStore, feeding/sleep from useKidsAnalytics, growth + vaccines from
 * child_logs, computes latest-per-metric percentiles, then hands a plain data
 * object to lib/pediatricReport (pure HTML builder + print/share).
 *
 * NOTE: PDF generation needs expo-print (native) → requires an EAS rebuild.
 * Everything else (data gathering, preview) works in any build.
 */

import { useMemo, useState } from 'react'
import { View, Text, Pressable, ScrollView, StyleSheet, ActivityIndicator, Alert } from 'react-native'
import { useLocalSearchParams } from 'expo-router'
import { FileText, Download } from 'lucide-react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useQuery } from '@tanstack/react-query'
import { useTheme, useDiffuseTheme, diffuseFont } from '../constants/theme'
import { useTranslation } from '../lib/i18n'
import { supabase } from '../lib/supabase'
import { useChildStore } from '../store/useChildStore'
import { useKidsAnalytics } from '../lib/analyticsData'
import { ScreenHeader } from '../components/ui/ScreenHeader'
import { Display, DisplayItalic, MonoCaps } from '../components/ui/Typography'
import { useIsDiffuse } from '../components/ui/diffuse/DiffuseKit'
import {
  generateAndShareReport, measurementPercentile, isPdfExportAvailable,
  type PediatricReportData, type ReportMeasurement, type ReportVaccine,
} from '../lib/pediatricReport'
import type { Metric } from '../lib/growthStandards'

function ageMonthsAt(birthISO: string, atISO: string): number {
  const b = new Date(birthISO + 'T00:00:00')
  const a = new Date(atISO + 'T00:00:00')
  return (a.getFullYear() - b.getFullYear()) * 12 + (a.getMonth() - b.getMonth()) + (a.getDate() - b.getDate()) / 30
}

function ageLabel(birthISO: string): string {
  const months = Math.floor(ageMonthsAt(birthISO, new Date().toISOString().slice(0, 10)))
  if (months < 1) return 'Newborn'
  if (months < 24) return `${months} months`
  const y = Math.floor(months / 12)
  const m = months % 12
  return m ? `${y} years, ${m} months` : `${y} years`
}

// Parse a "Weight: 8.5 kg" / "Height: 78 cm" / "Head: 44 cm" growth log value.
function parseGrowth(value: string): { metric: Metric; value: number; unit: string } | null {
  const num = '([0-9]+(?:[.,][0-9]+)?)'
  const w = value.match(new RegExp(`weight[:\\s]+${num}\\s*(kg|lbs?|lb)`, 'i'))
  if (w) {
    const n = parseFloat(w[1].replace(',', '.'))
    return { metric: 'weight', value: Number((w[2].toLowerCase() === 'kg' ? n : n * 0.45359237).toFixed(2)), unit: 'kg' }
  }
  const head = value.match(new RegExp(`head(?:\\s*circumference)?[:\\s]+${num}\\s*(cm|in|inches?|inch)`, 'i'))
  if (head) {
    const n = parseFloat(head[1].replace(',', '.'))
    return { metric: 'head', value: Number((head[2].toLowerCase() === 'cm' ? n : n * 2.54).toFixed(1)), unit: 'cm' }
  }
  const h = value.match(new RegExp(`height[:\\s]+${num}\\s*(cm|in|inches?|inch)`, 'i'))
  if (h) {
    const n = parseFloat(h[1].replace(',', '.'))
    return { metric: 'height', value: Number((h[2].toLowerCase() === 'cm' ? n : n * 2.54).toFixed(1)), unit: 'cm' }
  }
  return null
}

export default function ChildReportScreen() {
  const { childId } = useLocalSearchParams<{ childId?: string }>()
  const { colors, font, stickers, radius } = useTheme()
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
  const insets = useSafeAreaInsets()
  const { t } = useTranslation()

  const children = useChildStore((s) => s.children)
  const activeChild = useChildStore((s) => s.activeChild)
  const child = children.find((c) => c.id === childId) ?? activeChild ?? children[0]

  const analytics = useKidsAnalytics(child?.id ?? 'all', { kind: 'last', days: 14 })
  const [generating, setGenerating] = useState(false)
  // PDF needs the native expo-print module — absent on un-rebuilt clients / Expo Go.
  const pdfAvailable = isPdfExportAvailable()

  // Raw growth + vaccine logs for this child.
  const { data: logs } = useQuery({
    queryKey: ['child-report-logs', child?.id],
    enabled: !!child?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('child_logs')
        .select('type, value, date')
        .eq('child_id', child!.id)
        .in('type', ['growth', 'vaccine'])
        .order('date', { ascending: false })
      if (error) throw error
      return data ?? []
    },
  })

  // Latest measurement per metric, with percentile.
  const growth = useMemo<ReportMeasurement[]>(() => {
    if (!logs || !child?.birthDate) return []
    const latest: Partial<Record<Metric, ReportMeasurement>> = {}
    for (const l of logs) {
      if (l.type !== 'growth') continue
      const parsed = parseGrowth((l.value ?? '').toString())
      if (!parsed || latest[parsed.metric]) continue // logs are date-desc, so first = latest
      const ageM = ageMonthsAt(child.birthDate, l.date)
      latest[parsed.metric] = {
        ...parsed,
        date: l.date,
        ageMonths: ageM,
        percentile: measurementPercentile(parsed.metric, child.sex, ageM, parsed.value),
      }
    }
    return (['weight', 'height', 'head'] as Metric[]).map((m) => latest[m]).filter(Boolean) as ReportMeasurement[]
  }, [logs, child?.birthDate, child?.sex])

  const vaccines = useMemo<ReportVaccine[]>(() => {
    if (!logs) return []
    return logs
      .filter((l) => l.type === 'vaccine')
      .map((l) => ({ name: (l.value ?? '').toString(), date: l.date, status: 'given' as const }))
  }, [logs])

  // Plain-language feeding + sleep summary from analytics.
  const feedingSummary = useMemo(() => {
    const n = analytics.data?.nutrition
    if (!n?.hasData) return undefined
    const avgFeeds = n.mealFrequency.length ? Math.round(n.mealFrequency.reduce((a, b) => a + b, 0) / n.mealFrequency.length) : 0
    const modeWord = n.mode === 'milk' ? 'milk feeds' : n.mode === 'solids' ? 'meals' : 'milk feeds and meals'
    return `About ${avgFeeds} ${modeWord} per day (age-typical target ≈ ${n.feedTarget}).`
  }, [analytics.data])

  const sleepSummary = useMemo(() => {
    const s = analytics.data?.sleep
    if (!s?.hasData) return undefined
    return `Averaging ${s.avgHours.toFixed(1)} hours of sleep per day over the last two weeks.`
  }, [analytics.data])

  async function handleGenerate() {
    if (!child) return
    setGenerating(true)
    try {
      const data: PediatricReportData = {
        childName: child.name,
        birthDate: child.birthDate ?? '—',
        ageLabel: child.birthDate ? ageLabel(child.birthDate) : '',
        sex: child.sex ?? '',
        bloodType: child.bloodType,
        allergies: child.allergies ?? [],
        conditions: child.conditions ?? [],
        medications: child.medications ?? [],
        pediatrician: child.pediatrician,
        growth,
        vaccines,
        feedingSummary,
        sleepSummary,
        generatedOn: new Date().toLocaleDateString(),
      }
      await generateAndShareReport(data)
    } catch (e: any) {
      // expo-print native module missing (un-rebuilt client) surfaces here.
      Alert.alert(
        t('report_errorTitle'),
        /native module|ExpoPrint/i.test(e?.message ?? '') ? t('report_errorRebuild') : (e?.message ?? t('report_errorGeneric')),
      )
    } finally {
      setGenerating(false)
    }
  }

  const ink = diffuse ? dt.colors.ink : colors.text
  const inkMuted = diffuse ? dt.colors.ink3 : colors.textMuted
  const line = diffuse ? dt.colors.line : colors.borderLight
  const accent = diffuse ? dt.stickers.blue : stickers.blue
  const cardBg = diffuse ? dt.colors.surface : colors.surface
  const cardBorder = diffuse ? dt.colors.line : colors.border

  if (!child) {
    return (
      <View style={[styles.root, { backgroundColor: diffuse ? dt.colors.bg : colors.bg }]}>
        <View style={[styles.headerWrap, { paddingTop: insets.top + 8 }]}><ScreenHeader title="" /></View>
        <Text style={[styles.empty, { color: inkMuted, fontFamily: diffuse ? diffuseFont.body : font.body }]}>{t('report_noChild')}</Text>
      </View>
    )
  }

  function Section({ label, children: kids }: { label: string; children: React.ReactNode }) {
    return (
      <View style={{ marginTop: 18 }}>
        <MonoCaps color={inkMuted} style={{ letterSpacing: 1.5 }}>{label}</MonoCaps>
        <View style={[styles.card, diffuse && styles.cardFlat, { backgroundColor: cardBg, borderColor: cardBorder, borderRadius: radius.lg }]}>{kids}</View>
      </View>
    )
  }

  function KV({ k, v, muted }: { k: string; v: string; muted?: boolean }) {
    return (
      <View style={styles.kv}>
        <Text style={[styles.kvK, { color: inkMuted, fontFamily: diffuse ? diffuseFont.body : font.body }]}>{k}</Text>
        <Text style={[styles.kvV, { color: muted ? inkMuted : ink, fontFamily: diffuse ? diffuseFont.body : font.body }]}>{v}</Text>
      </View>
    )
  }

  return (
    <View style={[styles.root, { backgroundColor: diffuse ? dt.colors.bg : colors.bg }]}>
      <View style={[styles.headerWrap, { paddingTop: insets.top + 8 }]}><ScreenHeader title="" /></View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.titleBlock}>
          <Display size={32} color={ink}>{t('report_title')}</Display>
          <DisplayItalic size={17} color={diffuse ? dt.colors.ink : stickers.coral} style={{ marginTop: 6 }}>
            {child.name}{child.birthDate ? ` · ${ageLabel(child.birthDate)}` : ''}
          </DisplayItalic>
        </View>

        <Text style={[styles.intro, { color: inkMuted, fontFamily: diffuse ? diffuseFont.body : font.body }]}>
          {t('report_intro')}
        </Text>

        <Section label={t('report_sectionGrowth')}>
          {growth.length ? growth.map((g, i) => (
            <View key={g.metric}>
              {i > 0 && <View style={[styles.divider, { backgroundColor: line }]} />}
              <KV
                k={g.metric === 'weight' ? t('report_weight') : g.metric === 'height' ? t('report_height') : t('report_head')}
                v={`${g.value} ${g.unit}${g.percentile != null ? `  ·  ${g.percentile}${t('report_percentileSuffix')}` : ''}`}
              />
            </View>
          )) : <KV k={t('report_growth')} v={t('report_none')} muted />}
        </Section>

        <Section label={t('report_sectionVaccines')}>
          {vaccines.length ? vaccines.slice(0, 8).map((v, i) => (
            <View key={`${v.name}-${i}`}>
              {i > 0 && <View style={[styles.divider, { backgroundColor: line }]} />}
              <KV k={v.name || '—'} v={v.date} />
            </View>
          )) : <KV k={t('report_vaccines')} v={t('report_none')} muted />}
        </Section>

        {(feedingSummary || sleepSummary) && (
          <Section label={t('report_sectionRoutine')}>
            {feedingSummary && <KV k={t('report_feeding')} v={feedingSummary} />}
            {feedingSummary && sleepSummary && <View style={[styles.divider, { backgroundColor: line }]} />}
            {sleepSummary && <KV k={t('report_sleep')} v={sleepSummary} />}
          </Section>
        )}

        <Pressable
          onPress={generating || !pdfAvailable ? undefined : handleGenerate}
          style={[styles.cta, { backgroundColor: accent, borderRadius: radius.full, opacity: generating || !pdfAvailable ? 0.5 : 1 }]}
        >
          {generating
            ? <ActivityIndicator size="small" color={diffuse ? dt.colors.bg : colors.textInverse} />
            : <Download size={18} color={diffuse ? dt.colors.bg : colors.textInverse} strokeWidth={2} />}
          <Text style={[styles.ctaText, { color: diffuse ? dt.colors.bg : colors.textInverse, fontFamily: diffuse ? diffuseFont.bodySemiBold : font.bodySemiBold }]}>
            {t('report_generate')}
          </Text>
        </Pressable>

        {!pdfAvailable && (
          <Text style={[styles.unavailable, { color: inkMuted, fontFamily: diffuse ? diffuseFont.body : font.body }]}>
            {t('report_needsUpdate')}
          </Text>
        )}

        <View style={styles.disclaimerRow}>
          <FileText size={13} color={inkMuted} strokeWidth={1.6} />
          <Text style={[styles.disclaimer, { color: inkMuted, fontFamily: diffuse ? diffuseFont.body : font.body }]}>
            {t('report_disclaimer')}
          </Text>
        </View>
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
  empty: { fontSize: 14, textAlign: 'center', marginTop: 40 },
  card: {
    padding: 4, marginTop: 8, borderWidth: 1,
    shadowColor: '#141313', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 2,
  },
  cardFlat: { shadowOpacity: 0, elevation: 0 },
  divider: { height: 1, marginHorizontal: 18 },
  kv: { flexDirection: 'row', paddingVertical: 13, paddingHorizontal: 18, gap: 12, alignItems: 'flex-start' },
  kvK: { fontSize: 13, width: 96, flexShrink: 0 },
  kvV: { fontSize: 14, flex: 1, lineHeight: 19 },
  cta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, height: 56, marginTop: 26 },
  ctaText: { fontSize: 15 },
  unavailable: { fontSize: 12, textAlign: 'center', marginTop: 10, lineHeight: 17, paddingHorizontal: 20 },
  disclaimerRow: { flexDirection: 'row', gap: 8, marginTop: 18, paddingHorizontal: 4, alignItems: 'flex-start' },
  disclaimer: { fontSize: 11, lineHeight: 16, flex: 1 },
})
