/**
 * HealthTrackerSheet — standalone health-tracker sheet.
 *
 * Renders three sections extracted verbatim from `KidsHome`'s
 * `HealthDetailModal` — Growth (WHO/CDC percentile charts + latest-growth
 * tiles), Allergies (chips + "+ Add" → profile/kids), Medications — plus a
 * NEW Exam-insights section driven by `useKidsExamInsights`.
 *
 * Deliberately does NOT render Sleep, Activity, or the Vaccine schedule; those
 * live in the parent modal / the standalone `VaccineTrackerSheet`.
 *
 * Shell mirrors `HealthDetailModal` / `VaccineTrackerSheet`: DiffuseSheet under
 * `useIsDiffuse()`, else LogSheet (which supplies the cream paper-sheet chrome).
 */
import { View, Text, Pressable, StyleSheet, Dimensions } from 'react-native'
import { AlertCircle, TrendingUp, Pill } from 'lucide-react-native'
import { router } from 'expo-router'
import { useTheme, brand, font, useDiffuseTheme, diffuseFont, getDiffuseAccent } from '../../../constants/theme'
import { useIsDiffuse, DiffuseArrow } from '../../ui/diffuse/DiffuseKit'
import { DiffuseSectionHeader, DiffuseListRow, DiffuseMetricTile, DiffuseSheet } from '../../ui/diffuse/DiffusePrimitives'
import { Character } from '../../characters/Characters'
import { Heart as HeartSticker, Leaf as LeafSticker, Pill as PillSticker } from '../../ui/Stickers'
import { LogSheet } from '../../calendar/LogSheet'
import { GrowthPercentileChart } from '../../kids/GrowthPercentileChart'
import { resolveSex } from '../../../lib/growthStandards'
import type { ChildWithRole } from '../../../types'
import { useTranslation } from '../../../lib/i18n'
import type { TranslationKeys } from '../../../lib/i18n/keys'
import {
  formatHealthDate,
  type HealthRecord,
  type HealthHistoryData,
} from '../../../lib/vaccineSchedule'
import { useKidsExamInsights } from '../../../lib/examData'

const SW = Dimensions.get('window').width

// These keys are added by Task 7. Referenced verbatim here (do not substitute
// other keys); cast so the file typechecks before the keys land. Until then
// t() returns the key name at runtime, per the task brief.
const KIDS_HEALTH_TITLE_KEY = 'kids_health_title' as keyof TranslationKeys
const KIDS_HEALTH_EXAMS_SECTION_KEY = 'kids_health_exams_section' as keyof TranslationKeys
const KIDS_HEALTH_EXAMS_EMPTY_KEY = 'kids_health_exams_empty' as keyof TranslationKeys
const KIDS_HEALTH_EXAMS_SEE_ALL_KEY = 'kids_health_exams_seeAll' as keyof TranslationKeys
const KIDS_HEALTH_EXAMS_FLAGGED_KEY = 'kids_health_exams_flagged' as keyof TranslationKeys

// Inlined copy of KidsHome's local `parseGrowthValue` helper (not exported from
// KidsHome). Kept byte-for-byte in sync with the source so the "Latest growth"
// tiles read identically to the retired modal.
function parseGrowthValue(entries: HealthRecord[]): { weight: string | null; height: string | null } {
  let weight: string | null = null
  let height: string | null = null

  const numPattern = '([0-9]+(?:[.,][0-9]+)?)'
  const toNum = (raw: string) => parseFloat(raw.replace(',', '.'))

  for (const e of entries) {
    const v = (e.value || '').trim()
    if (!weight) {
      const labeled = v.match(new RegExp(`weight[:\\s]+${numPattern}\\s*(kg|lbs?|lb)`, 'i'))
      const bare = !labeled && v.match(new RegExp(`^${numPattern}\\s*(kg|lbs?|lb)$`, 'i'))
      const m = labeled || bare || null
      if (m) {
        const n = toNum(m[1])
        const unit = m[2].toLowerCase()
        const kg = unit === 'kg' ? n : n * 0.45359237
        weight = `${kg.toFixed(kg < 10 ? 2 : 1)} kg`
      }
    }
    if (!height) {
      const labeled = v.match(new RegExp(`height[:\\s]+${numPattern}\\s*(cm|in|inches?|inch)`, 'i'))
      const bare = !labeled && v.match(new RegExp(`^${numPattern}\\s*(cm|in|inches?|inch)$`, 'i'))
      const m = labeled || bare || null
      if (m) {
        const n = toNum(m[1])
        const unit = m[2].toLowerCase()
        const cm = unit === 'cm' ? n : n * 2.54
        height = `${cm.toFixed(1)} cm`
      }
    }
    if (weight && height) break
  }

  return { weight, height }
}

// ─── HealthTrackerSheet — exported shell ────────────────────────────────────

interface HealthTrackerSheetProps {
  visible: boolean
  onClose: () => void
  child: ChildWithRole
  childColor?: string
  healthHistory: HealthHistoryData
}

export function HealthTrackerSheet({ visible, onClose, child, childColor, healthHistory }: HealthTrackerSheetProps) {
  const { colors, isDark } = useTheme()
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
  const { t } = useTranslation()
  const { weight, height } = parseGrowthValue(healthHistory.growth)
  const { data: insights } = useKidsExamInsights(child.id)

  const paperBorder = isDark ? colors.border : 'rgba(20,19,19,0.12)'
  const ink = colors.text
  const ink3 = isDark ? colors.textMuted : 'rgba(20,19,19,0.5)'
  const stickerInk = isDark ? 'rgba(255,255,255,0.18)' : '#141313'

  // ─── Diffuse branch ───────────────────────────────────────────────────────
  if (diffuse) {
    const dCol = dt.colors
    const acc = getDiffuseAccent('kids', dt.isDark)
    const warn = isDark ? '#F5A97F' : '#C4562E'
    const showGrowthCharts = (child.sex === 'male' || child.sex === 'female') && healthHistory.growth.length > 0 && !!child.birthDate
    return (
      <DiffuseSheet
        visible={visible}
        title={t(KIDS_HEALTH_TITLE_KEY)}
        onClose={onClose}
        chip={childColor ? child.name : undefined}
      >
        {/* Growth percentile charts — shared chart component (kept) */}
        {showGrowthCharts ? (() => {
          // sex='other'/null falls back to a reference sex for the curves.
          const { sex } = resolveSex(child.sex)
          const weightPts: { ageMonths: number; value: number; date: string }[] = []
          const heightPts: { ageMonths: number; value: number; date: string }[] = []
          const headPts: { ageMonths: number; value: number; date: string }[] = []
          const birth = new Date(child.birthDate! + 'T00:00:00')
          const num = '([0-9]+(?:[.,][0-9]+)?)'
          // Keyword-anchored so "Head: 44 cm" can't be mis-parsed as height.
          const wRe = new RegExp(`weight[:\\s]+${num}\\s*(kg|lbs?|lb)`, 'i')
          const hRe = new RegExp(`height[:\\s]+${num}\\s*(cm|in|inches?|inch)`, 'i')
          const headRe = new RegExp(`head(?:\\s*circumference)?[:\\s]+${num}\\s*(cm|in|inches?|inch)`, 'i')
          for (const g of healthHistory.growth) {
            if (!g.date) continue
            const measured = new Date(g.date + 'T00:00:00')
            if (isNaN(measured.getTime())) continue
            const ageMonths = (measured.getFullYear() - birth.getFullYear()) * 12 + (measured.getMonth() - birth.getMonth()) + (measured.getDate() - birth.getDate()) / 30
            const raw = g.value || ''
            const wMatch = raw.match(wRe)
            const hMatch = raw.match(hRe)
            const headMatch = raw.match(headRe)
            if (wMatch) {
              const n = parseFloat(wMatch[1].replace(',', '.'))
              const kg = wMatch[2].toLowerCase() === 'kg' ? n : n * 0.45359237
              if (Number.isFinite(kg) && kg > 0) weightPts.push({ ageMonths, value: kg, date: g.date })
            }
            if (headMatch) {
              const n = parseFloat(headMatch[1].replace(',', '.'))
              const cm = headMatch[2].toLowerCase() === 'cm' ? n : n * 2.54
              if (Number.isFinite(cm) && cm > 0) headPts.push({ ageMonths, value: cm, date: g.date })
            } else if (hMatch) {
              const n = parseFloat(hMatch[1].replace(',', '.'))
              const cm = hMatch[2].toLowerCase() === 'cm' ? n : n * 2.54
              if (Number.isFinite(cm) && cm > 0) heightPts.push({ ageMonths, value: cm, date: g.date })
            }
          }
          const ageMonths = (new Date().getFullYear() - birth.getFullYear()) * 12 + (new Date().getMonth() - birth.getMonth())
          const chartWidth = SW - 64
          return (
            <View style={{ gap: 12, marginTop: 4 }}>
              {weightPts.length > 0 ? <GrowthPercentileChart title="Weight-for-age" metric="weight" sex={sex} childAgeMonths={ageMonths} childName={child.name} points={weightPts} width={chartWidth} /> : null}
              {heightPts.length > 0 ? <GrowthPercentileChart title="Height-for-age" metric="height" sex={sex} childAgeMonths={ageMonths} childName={child.name} points={heightPts} width={chartWidth} /> : null}
              {headPts.length > 0 ? <GrowthPercentileChart title="Head-for-age" metric="head" sex={sex} childAgeMonths={ageMonths} childName={child.name} points={headPts} width={chartWidth} /> : null}
            </View>
          )
        })() : null}

        {/* Latest growth */}
        {(weight || height) ? (
          <View style={{ marginTop: 24 }}>
            <DiffuseSectionHeader
              title={t('kids_home_health_latest_growth')}
              icon={<Character name="growth" size={21} color={acc} />}
              right={<Text style={{ fontFamily: diffuseFont.mono, fontSize: 9.5, letterSpacing: 0.5, color: dCol.ink3 }}>{healthHistory.growth[0]?.date ? formatHealthDate(healthHistory.growth[0].date) : ''}</Text>}
            />
            <View style={{ flexDirection: 'row', gap: 10 }}>
              {weight ? <DiffuseMetricTile value={weight} label={t('kids_home_health_weight_label')} /> : null}
              {height ? <DiffuseMetricTile value={height} label={t('kids_home_health_height_label')} /> : null}
            </View>
          </View>
        ) : null}

        {/* Allergies */}
        <View style={{ marginTop: 24 }}>
          <DiffuseSectionHeader
            title={t('kids_home_health_allergies')}
            icon={<Character name="heart" size={21} color={acc} />}
          />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {child.allergies.map((a, i) => (
              <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 7, borderWidth: 1, borderColor: dCol.line2, borderRadius: 999, paddingVertical: 6, paddingHorizontal: 12 }}>
                <Character name="warning" size={11} color={dCol.ink3} />
                <Text style={{ fontFamily: diffuseFont.body, fontSize: 13, color: dCol.ink }}>{a}</Text>
              </View>
            ))}
            <Pressable
              onPress={() => { onClose(); router.push('/profile/kids') }}
              style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderStyle: 'dashed', borderColor: dCol.line2, borderRadius: 999, paddingVertical: 6, paddingHorizontal: 12, opacity: pressed ? 0.6 : 1 })}
            >
              <Text style={{ fontFamily: diffuseFont.mono, fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', color: dCol.ink3 }}>
                {child.allergies.length === 0 ? '+ Add allergy' : '+ Add'}
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Medications */}
        {child.medications.length > 0 ? (
          <View style={{ marginTop: 24 }}>
            <DiffuseSectionHeader
              title={t('kids_home_health_medications')}
              icon={<Character name="medicine" size={21} color={acc} />}
            />
            {child.medications.map((m, i) => (
              <DiffuseListRow
                key={i}
                title={m}
                value={t('kids_home_health_medication_active')}
                icon={<Character name="medicine" size={22} color={brand.secondary} />}
                last={i === child.medications.length - 1}
              />
            ))}
          </View>
        ) : null}

        {/* Exam insights — NEW */}
        <View style={{ marginTop: 24 }}>
          <DiffuseSectionHeader
            title={t(KIDS_HEALTH_EXAMS_SECTION_KEY)}
            icon={<Character name="scan" size={21} color={acc} />}
          />
          {insights.recent.length === 0 ? (
            <DiffuseListRow title={t(KIDS_HEALTH_EXAMS_EMPTY_KEY)} last />
          ) : (
            insights.recent.map((e, i) => (
              <DiffuseListRow
                key={e.id}
                title={e.title}
                sub={formatHealthDate(e.examDate)}
                value={e.result ?? undefined}
                icon={<Character name="scan" size={22} color={acc} />}
                last={i === insights.recent.length - 1 && insights.flagged.length === 0}
              />
            ))
          )}
          {insights.flagged.map((e) => (
            <DiffuseListRow
              key={`flag-${e.id}`}
              title={e.title}
              sub={t(KIDS_HEALTH_EXAMS_FLAGGED_KEY)}
              icon={<Character name="warning" size={22} color={warn} />}
              valueColor={warn}
              last
            />
          ))}
          <Pressable
            onPress={() => { onClose(); router.push('/exams?behavior=kids' as any) }}
            style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: dCol.line2, paddingTop: 18, marginTop: 14, opacity: pressed ? 0.6 : 1 })}
          >
            <Text style={{ fontFamily: diffuseFont.mono, fontSize: 12, letterSpacing: 2, textTransform: 'uppercase', color: dCol.ink }}>{t(KIDS_HEALTH_EXAMS_SEE_ALL_KEY)}</Text>
            <DiffuseArrow color={dCol.ink3} size={16} />
          </Pressable>
        </View>
      </DiffuseSheet>
    )
  }

  // ─── Cream branch ─────────────────────────────────────────────────────────
  const warn = isDark ? '#F5A97F' : '#C4562E'
  return (
    <LogSheet
      visible={visible}
      title={t(KIDS_HEALTH_TITLE_KEY)}
      onClose={onClose}
      chip={childColor ? child.name : undefined}
      chipColor={childColor}
    >
      {/* WHO/CDC growth percentile charts.
          Rendered before Latest Growth so the chart's context is visible above
          the numeric summary. sex='other'/null falls back to a reference sex
          (the standards have no neutral table). */}
      {healthHistory.growth.length > 0 &&
        child.birthDate && (() => {
          const { sex } = resolveSex(child.sex)
          // Build {ageMonths, value} arrays for weight + height + head.
          const weightPts: { ageMonths: number; value: number; date: string }[] = []
          const heightPts: { ageMonths: number; value: number; date: string }[] = []
          const headPts: { ageMonths: number; value: number; date: string }[] = []
          const birth = new Date(child.birthDate + 'T00:00:00')
          const num = '([0-9]+(?:[.,][0-9]+)?)'
          // Keyword-anchored so "Head: 44 cm" isn't mis-read as height.
          const wRe = new RegExp(`weight[:\\s]+${num}\\s*(kg|lbs?|lb)`, 'i')
          const hRe = new RegExp(`height[:\\s]+${num}\\s*(cm|in|inches?|inch)`, 'i')
          const headRe = new RegExp(`head(?:\\s*circumference)?[:\\s]+${num}\\s*(cm|in|inches?|inch)`, 'i')
          for (const g of healthHistory.growth) {
            if (!g.date) continue
            const measured = new Date(g.date + 'T00:00:00')
            if (isNaN(measured.getTime())) continue
            const ageMonths =
              (measured.getFullYear() - birth.getFullYear()) * 12 +
              (measured.getMonth() - birth.getMonth()) +
              (measured.getDate() - birth.getDate()) / 30
            const raw = g.value || ''
            const wMatch = raw.match(wRe)
            const hMatch = raw.match(hRe)
            const headMatch = raw.match(headRe)
            if (wMatch) {
              const n = parseFloat(wMatch[1].replace(',', '.'))
              const kg = wMatch[2].toLowerCase() === 'kg' ? n : n * 0.45359237
              if (Number.isFinite(kg) && kg > 0) weightPts.push({ ageMonths, value: kg, date: g.date })
            }
            if (headMatch) {
              const n = parseFloat(headMatch[1].replace(',', '.'))
              const cm = headMatch[2].toLowerCase() === 'cm' ? n : n * 2.54
              if (Number.isFinite(cm) && cm > 0) headPts.push({ ageMonths, value: cm, date: g.date })
            } else if (hMatch) {
              const n = parseFloat(hMatch[1].replace(',', '.'))
              const cm = hMatch[2].toLowerCase() === 'cm' ? n : n * 2.54
              if (Number.isFinite(cm) && cm > 0) heightPts.push({ ageMonths, value: cm, date: g.date })
            }
          }
          const ageMonths =
            (new Date().getFullYear() - birth.getFullYear()) * 12 +
            (new Date().getMonth() - birth.getMonth())
          const chartWidth = SW - 64
          return (
            <View style={{ gap: 12, marginTop: 4 }}>
              {weightPts.length > 0 && (
                <GrowthPercentileChart
                  title="Weight-for-age"
                  metric="weight"
                  sex={sex}
                  childAgeMonths={ageMonths}
                  childName={child.name}
                  points={weightPts}
                  width={chartWidth}
                />
              )}
              {heightPts.length > 0 && (
                <GrowthPercentileChart
                  title="Height-for-age"
                  metric="height"
                  sex={sex}
                  childAgeMonths={ageMonths}
                  childName={child.name}
                  points={heightPts}
                  width={chartWidth}
                />
              )}
              {headPts.length > 0 && (
                <GrowthPercentileChart
                  title="Head-for-age"
                  metric="head"
                  sex={sex}
                  childAgeMonths={ageMonths}
                  childName={child.name}
                  points={headPts}
                  width={chartWidth}
                />
              )}
            </View>
          )
        })()}

      {/* Latest Growth */}
      {(weight || height) && (
        <>
          <View style={styles.modalSectionRow}>
            <View style={{ transform: [{ rotate: '-8deg' }] }}>
              <LeafSticker size={22} fill="#BDD48C" stroke={stickerInk} />
            </View>
            <Text style={[styles.modalSectionTitle, { color: ink, marginTop: 0, marginBottom: 0 }]}>{t('kids_home_health_latest_growth')}</Text>
          </View>
          <View style={{
            flexDirection: 'row', alignItems: 'center', gap: 14,
            backgroundColor: isDark ? '#1F2A3A' : '#EBF3FC',
            borderColor: isDark ? colors.border : 'rgba(20,19,19,0.12)',
            borderWidth: 1.5, borderRadius: 22, padding: 14, marginTop: 4,
            shadowColor: '#141313', shadowOpacity: isDark ? 0 : 0.05,
            shadowRadius: 6, shadowOffset: { width: 0, height: 2 },
          }}>
            <View style={{
              width: 44, height: 44, borderRadius: 22,
              backgroundColor: '#9DC3E8', borderWidth: 1.5, borderColor: stickerInk,
              alignItems: 'center', justifyContent: 'center',
            }}>
              <TrendingUp size={18} color={isDark ? '#FFFFFF' : '#141313'} strokeWidth={2.2} />
            </View>
            <View style={{ flex: 1, flexDirection: 'row', gap: 16 }}>
              {weight && (
                <View>
                  <Text style={[styles.hdGrowthLabel, { color: ink3 }]}>{t('kids_home_health_weight_label')}</Text>
                  <Text style={[styles.hdGrowthValue, { color: ink }]}>{weight}</Text>
                </View>
              )}
              {height && (
                <View>
                  <Text style={[styles.hdGrowthLabel, { color: ink3 }]}>{t('kids_home_health_height_label')}</Text>
                  <Text style={[styles.hdGrowthValue, { color: ink }]}>{height}</Text>
                </View>
              )}
            </View>
            <Text style={[styles.hdGrowthDate, { color: ink3 }]}>
              {healthHistory.growth[0]?.date ? formatHealthDate(healthHistory.growth[0].date) : ''}
            </Text>
          </View>
        </>
      )}

      {/* Allergies. Section renders even when empty so the parent has a one-tap
          path to add the first allergy (routes to profile/kids where the full
          editor lives). */}
      <>
        <View style={styles.modalSectionRow}>
          <View style={{ transform: [{ rotate: '-10deg' }] }}>
            <HeartSticker size={22} fill="#F2B2C7" stroke={stickerInk} />
          </View>
          <Text style={[styles.modalSectionTitle, { color: ink, marginTop: 0, marginBottom: 0 }]}>{t('kids_home_health_allergies')}</Text>
        </View>
        <View style={[styles.healthTagsRow, { marginTop: 4 }]}>
          {child.allergies.map((a, i) => (
            <View key={i} style={{
              flexDirection: 'row', alignItems: 'center', gap: 6,
              paddingVertical: 7, paddingHorizontal: 12, borderRadius: 999, borderWidth: 1.5,
              backgroundColor: isDark ? '#36222A' : '#FDEEF2',
              borderColor: isDark ? '#F5BBCF40' : 'rgba(20,19,19,0.18)',
            }}>
              <View style={{
                width: 16, height: 16, borderRadius: 8,
                backgroundColor: '#F2B2C7', borderWidth: 1, borderColor: stickerInk,
                alignItems: 'center', justifyContent: 'center',
              }}>
                <AlertCircle size={9} color={isDark ? '#FFFFFF' : '#141313'} strokeWidth={2.5} />
              </View>
              <Text style={{ fontSize: 13, fontFamily: font.bodyBold, color: isDark ? '#F5BBCF' : '#141313' }}>{a}</Text>
            </View>
          ))}
          <Pressable
            onPress={() => { onClose(); router.push('/profile/kids') }}
            style={{
              flexDirection: 'row', alignItems: 'center', gap: 6,
              paddingVertical: 7, paddingHorizontal: 12, borderRadius: 999, borderWidth: 1.5,
              backgroundColor: 'transparent',
              borderColor: isDark ? 'rgba(245,187,207,0.4)' : 'rgba(20,19,19,0.18)',
              borderStyle: 'dashed',
            }}
          >
            <Text style={{ fontSize: 13, fontFamily: font.bodySemiBold, color: isDark ? '#F5BBCF' : '#6E6763' }}>
              {child.allergies.length === 0 ? '+ Add allergy' : '+ Add'}
            </Text>
          </Pressable>
        </View>
      </>

      {/* Medications from child profile */}
      {child.medications.length > 0 && (
        <>
          <View style={styles.modalSectionRow}>
            <View style={{ transform: [{ rotate: '10deg' }] }}>
              <PillSticker size={22} fill="#F5D652" stroke={stickerInk} />
            </View>
            <Text style={[styles.modalSectionTitle, { color: ink, marginTop: 0, marginBottom: 0 }]}>{t('kids_home_health_medications')}</Text>
          </View>
          {child.medications.map((m, i) => (
            <View key={i} style={[styles.modalTaskRow, { borderBottomColor: paperBorder }]}>
              <Pill size={14} color={brand.secondary} strokeWidth={2} />
              <Text style={[styles.modalTaskLabel, { color: ink }]}>{m}</Text>
              <Text style={[styles.modalTaskStatus, { color: brand.secondary }]}>{t('kids_home_health_medication_active')}</Text>
            </View>
          ))}
        </>
      )}

      {/* Exam insights — NEW */}
      <>
        <View style={styles.modalSectionRow}>
          <View style={{ transform: [{ rotate: '-6deg' }] }}>
            <LeafSticker size={22} fill="#9DC3E8" stroke={stickerInk} />
          </View>
          <Text style={[styles.modalSectionTitle, { color: ink, marginTop: 0, marginBottom: 0 }]}>{t(KIDS_HEALTH_EXAMS_SECTION_KEY)}</Text>
        </View>
        {insights.recent.length === 0 ? (
          <View style={[styles.modalTaskRow, { borderBottomColor: paperBorder }]}>
            <Text style={[styles.modalTaskLabel, { color: ink3 }]}>{t(KIDS_HEALTH_EXAMS_EMPTY_KEY)}</Text>
          </View>
        ) : (
          insights.recent.map((e) => (
            <View key={e.id} style={[styles.modalTaskRow, { borderBottomColor: paperBorder, alignItems: 'flex-start' }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.modalTaskLabel, { color: ink }]}>{e.title}</Text>
                {e.result ? <Text style={{ fontSize: 12, fontFamily: font.bodyMedium, color: ink3, marginTop: 2 }} numberOfLines={2}>{e.result}</Text> : null}
              </View>
              <Text style={[styles.modalTaskStatus, { color: ink3 }]}>{formatHealthDate(e.examDate)}</Text>
            </View>
          ))
        )}
        {insights.flagged.map((e) => (
          <View key={`flag-${e.id}`} style={[styles.modalTaskRow, { borderBottomColor: paperBorder }]}>
            <AlertCircle size={14} color={warn} strokeWidth={2.2} />
            <Text style={[styles.modalTaskLabel, { color: ink }]}>{e.title}</Text>
            <Text style={[styles.modalTaskStatus, { color: warn }]}>{t(KIDS_HEALTH_EXAMS_FLAGGED_KEY)}</Text>
          </View>
        ))}
        <Pressable
          onPress={() => { onClose(); router.push('/exams?behavior=kids' as any) }}
          style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, marginTop: 4, opacity: pressed ? 0.6 : 1 })}
        >
          <Text style={{ fontSize: 13, fontFamily: font.bodySemiBold, color: brand.secondary }}>{t(KIDS_HEALTH_EXAMS_SEE_ALL_KEY)}</Text>
        </Pressable>
      </>
    </LogSheet>
  )
}

const styles = StyleSheet.create({
  modalSectionTitle: { fontSize: 17, fontFamily: font.displayBold, marginTop: 20, marginBottom: 10, letterSpacing: -0.3 },
  modalSectionRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 22, marginBottom: 8 },
  modalTaskRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, borderBottomWidth: 1 },
  modalTaskLabel: { flex: 1, fontSize: 14, fontFamily: font.bodyMedium },
  modalTaskStatus: { fontSize: 12, fontFamily: font.bodySemiBold },
  healthTagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  hdGrowthLabel: { fontSize: 9, fontFamily: font.bodySemiBold, letterSpacing: 1.2, textTransform: 'uppercase' },
  hdGrowthValue: { fontSize: 18, fontFamily: font.displayBold, letterSpacing: -0.3, marginTop: 2 },
  hdGrowthDate: { fontSize: 11, fontFamily: font.bodyMedium },
})
