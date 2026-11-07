/**
 * Health History — Command Center Dashboard
 *
 * Sections: Next Vaccines, Medication Schedule, Growth Chart,
 * Milestones Timeline, Recent Events. Tap any section for detail popup.
 */

import { useUnitsStore } from '../../store/useUnitsStore'
import { kgToDisplay, displayToKg, weightLabel } from '../../lib/units'
import { dateLoc } from '../../lib/kpLocale'
import { useState, useCallback, useMemo } from 'react'
import { healthLogText } from '../../lib/kidsHealthLogText'
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  Alert,
  StyleSheet,
  Dimensions,
  Modal,
  Platform,
} from 'react-native'
import DateTimePicker from '@react-native-community/datetimepicker'
import { router, useFocusEffect } from 'expo-router'
import {
  Syringe, Thermometer, Pill, TrendingUp, Calendar,
  AlertTriangle, FileText, ChevronRight, Check, Star,
} from 'lucide-react-native'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Character, type CharacterName } from '../../components/characters/Characters'
import { useTheme, brand, useDiffuseTheme, diffuseFont, getModeColorSoft } from '../../constants/theme'
import { SiteSticker, type SiteStickerName } from '../../components/stickers/SiteSticker'
import { InkBackButton } from '../../components/ui/InkBackButton'
import { SiteChoice } from '../../components/ui/SiteChoice'
import { StickerChoice } from '../../components/calendar/QuickLogKit'
import { EyeAction, ACTION_TONES } from '../../components/ui/AuthDock'
import { useTranslation, t as tNow } from '../../lib/i18n'
import { useChildStore } from '../../store/useChildStore'
import { supabase } from '../../lib/supabase'
import { toDateStr } from '../../lib/cycleLogic'
import { LogSheet, SheetFooterAction } from '../../components/calendar/LogSheet'
import { ScreenHeader } from '../../components/ui/ScreenHeader'
import { PillButton } from '../../components/ui/PillButton'
import { Display, MonoCaps, Body } from '../../components/ui/Typography'
import { ChildPill, childColor } from '../../components/ui/ChildPills'
import { useIsDiffuse } from '../../components/ui/diffuse/DiffuseKit'
import { DiffuseBloomIcon, DiffuseListRow, DiffuseEmptyState } from '../../components/ui/diffuse/DiffusePrimitives'
import {
  Cross as CrossSticker,
  Heart as HeartSticker,
  Star as StarSticker,
  Drop as DropSticker,
  Flower as FlowerSticker,
} from '../../components/ui/Stickers'
import { invalidateKidsLogQueries } from '../../lib/queryClient'
import { parseLocalDate } from '../../lib/localDate'
import { AfterTransition } from '../../components/ui/AfterTransition'

const SCREEN_W = Dimensions.get('window').width

// Site stickers per health-event kind (light look).
const SITE_STICKER: Record<string, SiteStickerName> = {
  vaccine: 'syringe', medicine: 'pill', temperature: 'thermo', growth: 'ruler',
  star: 'star', milestone: 'star', note: 'doc', warning: 'bell',
}

// ─── Types & Config ───────────────────────────────────────────────────────

interface HealthEvent {
  id: string; childId: string; childName: string
  date: string; type: string; value: string; notes: string
}

const TYPE_CFG: Record<string, { label: string; icon: typeof Syringe; charName: CharacterName; color: string; placeholder: string }> = {
  vaccine:     { get label() { return tNow('kids_logForm_healthVaccine') },  icon: Syringe,     charName: 'vaccine',     color: brand.success,        get placeholder() { return tNow('kp_hh_phVaccine') } },
  medicine:    { get label() { return tNow('kids_logForm_healthMedicine') }, icon: Pill,         charName: 'medicine',    color: brand.secondary,      get placeholder() { return tNow('kp_hh_phMedicine') } },
  temperature: { get label() { return tNow('kids_logForm_healthTemp') },     icon: Thermometer, charName: 'temperature', color: brand.error,           get placeholder() { return tNow('kp_hh_phTemp') } },
  growth:      { get label() { return tNow('kids_calendar_labelGrowth') },   icon: TrendingUp,  charName: 'growth',      color: brand.kids,            get placeholder() { return tNow('kp_hh_phGrowth') } },
  milestone:   { get label() { return tNow('kids_calendar_labelMilestone') }, icon: Star,        charName: 'star',        color: brand.accent,          get placeholder() { return tNow('kp_hh_phMilestone') } },
  note:        { get label() { return tNow('kp_hh_typeNote') },              icon: FileText,     charName: 'note',        color: brand.phase.luteal,   get placeholder() { return tNow('kp_hh_phNote') } },
}

/** Display text for a schedule age like "Birth", "6 months", "15-18 months", "4-6 years". */
function ageLabel(raw: string): string {
  if (raw === 'Birth') return tNow('kp_hh_ageBirth')
  const m = raw.match(/^([\d-]+) (month|months|years)( \(yearly\))?$/)
  if (!m) return raw
  if (m[2] === 'years') return tNow('kp_hh_ageYears', { n: m[1] })
  if (m[3]) return tNow('kp_hh_ageMonthsYearly', { n: m[1] })
  return tNow(m[2] === 'month' ? 'kp_hh_ageMonth' : 'kp_hh_ageMonths', { n: m[1] })
}

// Common vaccine schedule for reference
const VACCINE_SCHEDULE: { name: string; labelKey: Parameters<typeof tNow>[0]; ages: string[] }[] = [
  { name: 'Hepatitis B', labelKey: 'sw2_hh_vacHepB', ages: ['Birth', '1 month', '6 months'] },
  { name: 'DTaP', labelKey: 'sw2_hh_vacDTaP', ages: ['2 months', '4 months', '6 months', '15-18 months', '4-6 years'] },
  { name: 'IPV (Polio)', labelKey: 'sw2_hh_vacIPV', ages: ['2 months', '4 months', '6-18 months', '4-6 years'] },
  { name: 'MMR', labelKey: 'sw2_hh_vacMMR', ages: ['12-15 months', '4-6 years'] },
  { name: 'Varicella', labelKey: 'sw2_hh_vacVaricella', ages: ['12-15 months', '4-6 years'] },
  { name: 'Hib', labelKey: 'sw2_hh_vacHib', ages: ['2 months', '4 months', '6 months', '12-15 months'] },
  { name: 'PCV13', labelKey: 'sw2_hh_vacPCV13', ages: ['2 months', '4 months', '6 months', '12-15 months'] },
  { name: 'Rotavirus', labelKey: 'sw2_hh_vacRotavirus', ages: ['2 months', '4 months', '6 months'] },
  { name: 'Influenza', labelKey: 'sw2_hh_vacInfluenza', ages: ['6 months (yearly)'] },
  { name: 'Hepatitis A', labelKey: 'sw2_hh_vacHepA', ages: ['12-23 months'] },
]

// ─── Main Screen ──────────────────────────────────────────────────────────

export default function HealthHistoryScreen() {
  const weightUnit = useUnitsStore((u) => u.weightUnit)
  const kgNum = (raw: string) => kgToDisplay(parseFloat(raw.replace(/[^0-9.]/g, '')) || 0, weightUnit)
  const { colors, font, stickers, isDark, radius } = useTheme()
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
  const { t } = useTranslation()
  const insets = useSafeAreaInsets()
  const children = useChildStore((s) => s.children)
  const paper = diffuse ? dt.colors.surface : colors.surface
  const paperBorder = diffuse ? dt.colors.line : colors.border
  const soft = getModeColorSoft('kids')
  const ink = colors.text

  const [events, setEvents] = useState<HealthEvent[]>([])
  const [filterChild, setFilterChild] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  // Add sheet
  const [showAddSheet, setShowAddSheet] = useState(false)

  // Detail popup
  const [detailSection, setDetailSection] = useState<string | null>(null)

  useFocusEffect(useCallback(() => { loadEvents() }, []))

  async function loadEvents() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    const childIds = children.map((c) => c.id)
    if (childIds.length === 0) { setEvents([]); setLoading(false); return }

    const { data } = await supabase
      .from('child_logs')
      .select('id, child_id, date, type, value, notes, created_at')
      .in('child_id', childIds)
      .in('type', ['vaccine', 'medicine', 'temperature', 'growth', 'milestone', 'note'])
      .order('date', { ascending: false })
      .limit(500)

    setEvents(((data ?? []) as any[]).map((log) => {
      const child = children.find((c) => c.id === log.child_id)
      return { id: log.id, childId: log.child_id, childName: child?.name ?? tNow('kp_kc_child'), date: log.date, type: log.type, value: healthLogText(log.value, null).text ?? healthLogText(log.value, null).kind ?? '', notes: log.notes ?? '' }
    }))
    setLoading(false)
  }

  const filtered = filterChild ? events.filter((e) => e.childId === filterChild) : events

  // Section data
  const vaccines = filtered.filter((e) => e.type === 'vaccine')
  const medications = filtered.filter((e) => e.type === 'medicine')
  const growthEntries = filtered.filter((e) => e.type === 'growth')
  const milestones = filtered.filter((e) => e.type === 'milestone')
  const temperatures = filtered.filter((e) => e.type === 'temperature')
  const recentEvents = filtered.slice(0, 8)

  // Given vaccines for display
  const givenVaccineNames = new Set(vaccines.map((v) => v.value.split(/[,(]/)[0].trim()))

  return (
    <View style={[styles.root, { backgroundColor: diffuse ? dt.colors.bg : colors.bg }]}>
      <View style={[styles.headerWrap, { paddingTop: insets.top + 8 }]}>
        {diffuse ? (
        <ScreenHeader
          title={t('kp_hh_title')}
          right={
            <Pressable onPress={() => setShowAddSheet(true)} hitSlop={10}>
              <View style={[styles.headerAddBtn, { backgroundColor: 'transparent', borderColor: dt.colors.line2 }]}>
                <Ionicons name="add" size={20} color={dt.colors.ink} />
              </View>
            </Pressable>
          }
        />
        ) : (
          <View style={styles.siteHeader}>
            <InkBackButton ink={ink} paper={colors.surface} style={{ marginBottom: 0 }} />
            <SiteSticker name="syringe" size={30} cut />
            <Text style={[styles.siteTitle, { color: ink, fontFamily: font.display }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>{t('kp_hh_title')}</Text>
            <Pressable onPress={() => setShowAddSheet(true)} hitSlop={10} accessibilityRole="button" accessibilityLabel={t('healthHistory_logEvent')}>
              <View style={[styles.headerAddBtn, { backgroundColor: paper, borderColor: ink, borderWidth: 1.5 }]}>
                <Ionicons name="add" size={20} color={ink} />
              </View>
            </Pressable>
          </View>
        )}
      </View>

      {/* Child filter */}
      {children.length > 1 && (
        <View style={styles.filterRow}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterContent}>
            {diffuse ? (
              <>
                <DiffuseChoicePill label={t('kp_hh_allKids')} active={!filterChild} onPress={() => setFilterChild(null)} />
                {children.map((c) => (
                  <DiffuseChoicePill
                    key={c.id}
                    label={c.name}
                    active={filterChild === c.id}
                    onPress={() => setFilterChild(filterChild === c.id ? null : c.id)}
                  />
                ))}
              </>
            ) : (
              <>
                <SiteChoice compact tick={false} label={t('kp_hh_allKids')} selected={!filterChild} tone={soft} onPress={() => setFilterChild(null)} />
                {children.map((c) => (
                  <SiteChoice
                    key={c.id}
                    compact
                    tick={false}
                    label={c.name}
                    selected={filterChild === c.id}
                    tone={soft}
                    onPress={() => setFilterChild(filterChild === c.id ? null : c.id)}
                  />
                ))}
              </>
            )}
          </ScrollView>
        </View>
      )}

      <AfterTransition>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* ─── Quick Stats ──────────────────────────────────────────── */}
        <View style={styles.statsRow}>
          <StatCard icon={Syringe} charName="vaccine" color={stickers.greenInk} bg={stickers.green} num={vaccines.length} label={t('kp_hh_statVaccines')} onPress={() => setDetailSection('vaccine')} />
          <StatCard icon={Pill} charName="medicine" color={stickers.blueInk} bg={stickers.blue} num={medications.length} label={t('kp_hh_statMeds')} onPress={() => setDetailSection('medicine')} />
          <StatCard icon={Thermometer} charName="temperature" color={stickers.coralInk} bg={stickers.coral} num={temperatures.length} label={t('kp_hh_statTemps')} onPress={() => setDetailSection('temperature')} />
          <StatCard icon={Star} charName="star" color={stickers.yellowInk} bg={stickers.yellow} num={milestones.length} label={t('kp_hh_statMilestones')} onPress={() => setDetailSection('milestone')} />
        </View>

        {/* ─── Vaccine Tracker ──────────────────────────────────────── */}
        <Pressable onPress={() => setDetailSection('vaccine')} style={[styles.sectionCard, { backgroundColor: paper, borderColor: paperBorder }, diffuse ? styles.diffuseCard : styles.siteSection]}>
          <SectionHeader icon={Syringe} charName="vaccine" color={stickers.greenInk} title={t('vault_vaccines')} />
          {vaccines.length > 0 ? (
            <View style={styles.vaccineList}>
              {vaccines.slice(0, 3).map((v) => (
                <View key={v.id} style={styles.vaccineItem}>
                  <Check size={14} color={diffuse ? dt.colors.ink3 : ink} strokeWidth={diffuse ? 1.6 : 2.5} />
                  <Text style={[styles.vaccineText, { color: diffuse ? dt.colors.ink : colors.text, fontFamily: diffuse ? diffuseFont.body : font.bodyMedium }]}>{v.value}</Text>
                  <Text style={[styles.vaccineDate, { color: diffuse ? dt.colors.ink3 : colors.textMuted, fontFamily: diffuse ? diffuseFont.mono : font.body, letterSpacing: diffuse ? 0.5 : 0 }]}>{parseLocalDate(v.date).toLocaleDateString(dateLoc(), { month: 'short', year: 'numeric' })}</Text>
                </View>
              ))}
              {vaccines.length > 3 && (
                <View style={[styles.moreChip, diffuse
                  ? { backgroundColor: 'transparent', borderColor: dt.colors.line2 }
                  : { backgroundColor: isDark ? stickers.green + '24' : stickers.greenSoft, borderColor: isDark ? stickers.green + '40' : ink }]}>
                  <Text style={[styles.moreChipText, { color: diffuse ? dt.colors.ink3 : (isDark ? stickers.greenInk : ink), fontFamily: diffuse ? diffuseFont.mono : font.bodySemiBold, letterSpacing: diffuse ? 1.2 : 0.2, textTransform: diffuse ? 'uppercase' : 'none' }]}>{t('healthHistory_nMore', { n: vaccines.length - 3 })}</Text>
                </View>
              )}
            </View>
          ) : diffuse ? (
            <View style={[styles.emptyState, { backgroundColor: 'transparent', borderColor: dt.colors.line2, borderStyle: 'solid' }]}>
              <DiffuseBloomIcon color={stickers.green} size={30} intensity={0.4}>
                <Character name="vaccine" size={20} color={stickers.green} />
              </DiffuseBloomIcon>
              <Text style={[styles.emptyText, { color: dt.colors.ink3, fontFamily: diffuseFont.body }]}>{t('healthHistory_noVaccinesYet')}</Text>
            </View>
          ) : (
            <View style={styles.emptySite}>
              <SiteSticker name="syringe" size={34} cut />
              <Text style={[styles.emptyText, { color: colors.textSecondary, fontFamily: font.body }]}>{t('healthHistory_noVaccinesYet')}</Text>
            </View>
          )}
          {/* Next recommended */}
          <View style={[styles.nextVaccine, diffuse
            ? { backgroundColor: 'transparent', borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: dt.colors.line, borderRadius: 0, paddingHorizontal: 0 }
            : { backgroundColor: 'transparent', borderTopWidth: 1, borderTopColor: paperBorder, borderRadius: 0, paddingHorizontal: 0 }]}>
            <Text style={[styles.nextLabel, { color: diffuse ? dt.colors.ink3 : colors.textMuted, fontFamily: diffuse ? diffuseFont.mono : 'SpaceMono_400Regular', letterSpacing: diffuse ? 1.4 : 1.4, textTransform: 'uppercase', fontSize: diffuse ? undefined : 10 }]}>{t('healthHistory_recommendedSchedule')}</Text>
            <Text style={[styles.nextText, { color: diffuse ? dt.colors.ink2 : colors.text, fontFamily: diffuse ? diffuseFont.body : font.body }]}>
              {VACCINE_SCHEDULE.filter((v) => !givenVaccineNames.has(v.name)).slice(0, 2).map((v) => `${t(v.labelKey)} (${ageLabel(v.ages[0])})`).join(', ') || t('kp_hh_upToDate')}
            </Text>
          </View>
        </Pressable>

        {/* ─── Medications ──────────────────────────────────────────── */}
        <Pressable onPress={() => setDetailSection('medicine')} style={[styles.sectionCard, { backgroundColor: paper, borderColor: paperBorder }, diffuse ? styles.diffuseCard : styles.siteSection]}>
          <SectionHeader icon={Pill} charName="medicine" color={stickers.blueInk} title={t('kp_hh_medications')} />
          {medications.length > 0 ? (
            medications.slice(0, 3).map((m) => (
              <View key={m.id} style={styles.medItem}>
                <View style={[styles.medDot, diffuse
                  ? { backgroundColor: dt.colors.ink3, borderColor: 'transparent' }
                  : { backgroundColor: stickers.blueSoft, borderColor: ink }]} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.medName, { color: diffuse ? dt.colors.ink : colors.text, fontFamily: diffuse ? diffuseFont.body : font.bodyMedium }]}>{m.value}</Text>
                  {m.notes ? <Text style={[styles.medNotes, { color: diffuse ? dt.colors.ink3 : colors.textMuted, fontFamily: diffuse ? diffuseFont.body : font.body }]} numberOfLines={1}>{m.notes}</Text> : null}
                </View>
                <Text style={[styles.medDate, { color: diffuse ? dt.colors.ink3 : colors.textMuted, fontFamily: diffuse ? diffuseFont.mono : font.body, letterSpacing: diffuse ? 0.5 : 0 }]}>{parseLocalDate(m.date).toLocaleDateString(dateLoc(), { month: 'short', day: 'numeric' })}</Text>
              </View>
            ))
          ) : diffuse ? (
            <View style={[styles.emptyState, { backgroundColor: 'transparent', borderColor: dt.colors.line2, borderStyle: 'solid' }]}>
              <DiffuseBloomIcon color={stickers.blue} size={30} intensity={0.4}>
                <Character name="medicine" size={20} color={stickers.blue} />
              </DiffuseBloomIcon>
              <Text style={[styles.emptyText, { color: dt.colors.ink3, fontFamily: diffuseFont.body }]}>{t('healthHistory_noMedicationsLogged')}</Text>
            </View>
          ) : (
            <View style={styles.emptySite}>
              <SiteSticker name="pill" size={34} cut />
              <Text style={[styles.emptyText, { color: colors.textSecondary, fontFamily: font.body }]}>{t('healthHistory_noMedicationsLogged')}</Text>
            </View>
          )}
          {/* Active meds from child profiles */}
          {children.some((c) => c.medications.length > 0) && (
            <View style={[styles.activeMeds, diffuse
              ? { backgroundColor: 'transparent', borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: dt.colors.line, borderRadius: 0, paddingHorizontal: 0 }
              : { backgroundColor: 'transparent', borderTopWidth: 1, borderTopColor: paperBorder, borderRadius: 0, paddingHorizontal: 0 }]}>
              <Text style={[styles.nextLabel, { color: diffuse ? dt.colors.ink3 : colors.textMuted, fontFamily: diffuse ? diffuseFont.mono : 'SpaceMono_400Regular', letterSpacing: 1.4, textTransform: 'uppercase', fontSize: diffuse ? undefined : 10 }]}>{t('healthHistory_currentMedications')}</Text>
              {children.filter((c) => c.medications.length > 0).map((c) => (
                <Text key={c.id} style={[styles.nextText, { color: diffuse ? dt.colors.ink2 : colors.text, fontFamily: diffuse ? diffuseFont.body : font.body }]}>{c.name}: {c.medications.join(', ')}</Text>
              ))}
            </View>
          )}
        </Pressable>

        {/* ─── Growth ───────────────────────────────────────────────── */}
        <Pressable onPress={() => setDetailSection('growth')} style={[styles.sectionCard, { backgroundColor: paper, borderColor: paperBorder }, diffuse ? styles.diffuseCard : styles.siteSection]}>
          <SectionHeader icon={TrendingUp} charName="growth" color={stickers.blueInk} title={t('kp_hh_growth')} />
          {growthEntries.length > 0 ? (
            <>
              {/* Separate weight + height lines */}
              {(() => {
                const weights = growthEntries.filter((g) => g.value.toLowerCase().includes('weight')).slice(0, 6).reverse()
                const heights = growthEntries.filter((g) => g.value.toLowerCase().includes('height')).slice(0, 6).reverse()
                const latestWeight = growthEntries.find((g) => g.value.toLowerCase().includes('weight'))
                const latestHeight = growthEntries.find((g) => g.value.toLowerCase().includes('height'))

                const wColor = diffuse ? dt.colors.ink2 : ink
                const hColor = diffuse ? dt.colors.ink2 : ink
                const subFont = diffuse ? diffuseFont.mono : 'SpaceMono_400Regular'
                const subExtra = diffuse ? { letterSpacing: 1.4, textTransform: 'uppercase' as const, fontSize: 10 } : { letterSpacing: 1.4, textTransform: 'uppercase' as const, fontSize: 10, color: colors.textMuted }
                return (
                  <>
                    {/* Weight bars */}
                    {weights.length > 0 && (
                      <>
                        <Text style={[styles.chartSubtitle, { color: wColor, fontFamily: subFont }, subExtra]}>{`${t('pedReport_weight')} (${weightLabel(weightUnit)})`}</Text>
                        <View style={styles.miniChart}>
                          {weights.map((g) => {
                            const num = kgNum(g.value) || kgToDisplay(5, weightUnit)
                            const h = Math.min(50, Math.max(10, (num / (weightUnit === 'lb' ? 44 : 20)) * 50))
                            return (
                              <View key={g.id} style={styles.barCol}>
                                <Text style={[styles.barValue, { color: wColor, fontFamily: diffuse ? diffuseFont.mono : font.bodyBold }]}>{diffuse ? num : Math.round(num * 10) / 10}</Text>
                                <View style={[styles.bar, { height: h, backgroundColor: diffuse ? dt.colors.line2 : stickers.blueSoft, borderColor: diffuse ? 'transparent' : ink, borderWidth: diffuse ? 1 : 1.5, borderTopLeftRadius: 8, borderTopRightRadius: 8 }]} />
                                <Text style={[styles.barLabel, { color: diffuse ? dt.colors.ink3 : colors.textSecondary, fontFamily: diffuse ? diffuseFont.mono : font.bodyMedium }]}>{parseLocalDate(g.date).toLocaleDateString(dateLoc(), diffuse ? { month: 'short' } : { month: 'short', day: 'numeric' })}</Text>
                              </View>
                            )
                          })}
                        </View>
                      </>
                    )}
                    {/* Height bars */}
                    {heights.length > 0 && (
                      <>
                        <Text style={[styles.chartSubtitle, { color: hColor, fontFamily: subFont }, subExtra]}>{t('healthHistory_heightCm')}</Text>
                        <View style={styles.miniChart}>
                          {heights.map((g) => {
                            const num = parseFloat(g.value.replace(/[^0-9.]/g, '')) || 50
                            const h = Math.min(50, Math.max(10, (num / 120) * 50))
                            return (
                              <View key={g.id} style={styles.barCol}>
                                <Text style={[styles.barValue, { color: hColor, fontFamily: diffuse ? diffuseFont.mono : font.bodyBold }]}>{diffuse ? num : Math.round(num * 10) / 10}</Text>
                                <View style={[styles.bar, { height: h, backgroundColor: diffuse ? dt.colors.line2 : stickers.peachSoft, borderColor: diffuse ? 'transparent' : ink, borderWidth: diffuse ? 1 : 1.5, borderTopLeftRadius: 8, borderTopRightRadius: 8 }]} />
                                <Text style={[styles.barLabel, { color: diffuse ? dt.colors.ink3 : colors.textSecondary, fontFamily: diffuse ? diffuseFont.mono : font.bodyMedium }]}>{parseLocalDate(g.date).toLocaleDateString(dateLoc(), diffuse ? { month: 'short' } : { month: 'short', day: 'numeric' })}</Text>
                              </View>
                            )
                          })}
                        </View>
                      </>
                    )}
                    <Text style={[styles.lastMeasure, { color: diffuse ? dt.colors.ink2 : colors.text, fontFamily: diffuse ? diffuseFont.body : font.body }]}>
                      {latestWeight ? t('kp_hh_weightLine', { v: `${Math.round(kgNum(latestWeight.value) * 10) / 10} ${weightLabel(weightUnit)}` }) : ''}
                      {latestWeight && latestHeight ? '  ·  ' : ''}
                      {latestHeight ? t('kp_hh_heightLine', { v: latestHeight.value.replace(/height:?\s*/i, '') }) : ''}
                    </Text>
                  </>
                )
              })()}
            </>
          ) : diffuse ? (
            <View style={[styles.emptyState, { backgroundColor: 'transparent', borderColor: dt.colors.line2, borderStyle: 'solid' }]}>
              <DiffuseBloomIcon color={stickers.blue} size={30} intensity={0.4}>
                <Character name="growth" size={20} color={stickers.blue} />
              </DiffuseBloomIcon>
              <Text style={[styles.emptyText, { color: dt.colors.ink3, fontFamily: diffuseFont.body }]}>{t('healthHistory_noGrowthEntries')}</Text>
            </View>
          ) : (
            <View style={styles.emptySite}>
              <SiteSticker name="ruler" size={34} cut />
              <Text style={[styles.emptyText, { color: colors.textSecondary, fontFamily: font.body }]}>{t('healthHistory_noGrowthEntries')}</Text>
            </View>
          )}
        </Pressable>

        {/* ─── Milestones ───────────────────────────────────────────── */}
        <Pressable onPress={() => setDetailSection('milestone')} style={[styles.sectionCard, { backgroundColor: paper, borderColor: paperBorder }, diffuse ? styles.diffuseCard : styles.siteSection]}>
          <SectionHeader icon={Star} charName="star" color={stickers.yellowInk} title={t('kp_hh_milestones')} />
          {milestones.length > 0 ? (
            <View style={styles.milestoneList}>
              {milestones.slice(0, 4).map((m) => (
                <View key={m.id} style={styles.milestoneItem}>
                  <View style={[styles.milestoneDot, diffuse
                    ? { backgroundColor: dt.colors.ink3, borderColor: 'transparent' }
                    : { backgroundColor: stickers.yellowSoft, borderColor: ink }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.milestoneText, { color: diffuse ? dt.colors.ink : colors.text, fontFamily: diffuse ? diffuseFont.body : font.bodySemiBold }]}>{m.value}</Text>
                    <Text style={[styles.milestoneDate, { color: diffuse ? dt.colors.ink3 : colors.textMuted, fontFamily: diffuse ? diffuseFont.mono : font.body, letterSpacing: diffuse ? 0.5 : 0 }]}>
                      {`${m.childName} · ${parseLocalDate(m.date).toLocaleDateString(dateLoc(), { month: 'short', day: 'numeric', year: 'numeric' })}`}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          ) : diffuse ? (
            <View style={[styles.emptyState, { backgroundColor: 'transparent', borderColor: dt.colors.line2, borderStyle: 'solid' }]}>
              <DiffuseBloomIcon color={stickers.yellow} size={30} intensity={0.4}>
                <Character name="star" size={20} color={stickers.yellow} />
              </DiffuseBloomIcon>
              <Text style={[styles.emptyText, { color: dt.colors.ink3, fontFamily: diffuseFont.body }]}>{t('healthHistory_noMilestones')}</Text>
            </View>
          ) : (
            <View style={styles.emptySite}>
              <SiteSticker name="star" size={34} cut />
              <Text style={[styles.emptyText, { color: colors.textSecondary, fontFamily: font.body }]}>{t('healthHistory_noMilestones')}</Text>
            </View>
          )}
        </Pressable>

        {/* ─── Quick Reference ──────────────────────────────────────── */}
        {(() => {
          const alertKids = (filterChild
            ? children.filter((c) => c.id === filterChild)
            : children
          ).filter((c) =>
            c.allergies.filter((a) => a && a.toLowerCase() !== 'no').length > 0 ||
            c.medications.length > 0
          )
          if (alertKids.length === 0) return null
          return (
          <View style={[styles.sectionCard, { backgroundColor: paper, borderColor: paperBorder }, diffuse ? styles.diffuseCard : styles.siteSection]}>
            <SectionHeader icon={AlertTriangle} charName="warning" color={stickers.coralInk} title={t('kp_hh_alerts')} showChevron={false} />
            {alertKids.map((c) => (
              <View key={c.id} style={styles.refChild}>
                <Text style={[styles.refChildName, { color: diffuse ? dt.colors.ink : colors.text, fontFamily: diffuse ? diffuseFont.display : font.display, letterSpacing: diffuse ? -0.5 : 0.3 }, !diffuse && { textTransform: 'uppercase' }]}>{c.name}</Text>
                {c.allergies.filter((a) => a && a.toLowerCase() !== 'no').length > 0 && (
                  <View style={styles.refChipRow}>
                    {c.allergies.filter((a) => a && a.toLowerCase() !== 'no').map((a) => (
                      <View key={a} style={[styles.refChip, diffuse
                        ? { backgroundColor: 'transparent', borderWidth: StyleSheet.hairlineWidth, borderColor: dt.colors.line2 }
                        : { backgroundColor: isDark ? stickers.coral + '28' : stickers.pinkSoft, borderWidth: 1.5, borderColor: isDark ? 'transparent' : ink }]}>
                        <Text style={[styles.refChipText, { color: diffuse ? dt.colors.ink2 : (isDark ? stickers.coralInk : ink), fontFamily: diffuse ? diffuseFont.mono : font.bodySemiBold, letterSpacing: diffuse ? 1 : 0, textTransform: diffuse ? 'uppercase' : 'none' }]}>{a}</Text>
                      </View>
                    ))}
                  </View>
                )}
                {c.medications.length > 0 && (
                  <View style={styles.refChipRow}>
                    {c.medications.map((m) => (
                      <View key={m} style={[styles.refChip, diffuse
                        ? { backgroundColor: 'transparent', borderWidth: StyleSheet.hairlineWidth, borderColor: dt.colors.line2 }
                        : { backgroundColor: isDark ? stickers.blue + '28' : stickers.blueSoft, borderWidth: 1.5, borderColor: isDark ? 'transparent' : ink }]}>
                        {diffuse || isDark ? <Character name="medicine" size={10} color={diffuse ? dt.colors.ink3 : stickers.blueInk} /> : <SiteSticker name="pill" size={14} />}
                        <Text style={[styles.refChipText, { color: diffuse ? dt.colors.ink2 : (isDark ? stickers.blueInk : ink), fontFamily: diffuse ? diffuseFont.mono : font.bodySemiBold, letterSpacing: diffuse ? 1 : 0, textTransform: diffuse ? 'uppercase' : 'none' }]}>{m}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            ))}
          </View>
          )
        })()}
      </ScrollView>
      </AfterTransition>

      {/* ─── Detail Popup ──────────────────────────────────────────── */}
      {detailSection && (
        <DetailPopup
          section={detailSection}
          events={filtered.filter((e) => e.type === detailSection)}
          onClose={() => setDetailSection(null)}
        />
      )}

      {/* ─── Add Sheet ─────────────────────────────────────────────── */}
      <AddHealthEventSheet
        visible={showAddSheet}
        onClose={() => setShowAddSheet(false)}
        onSaved={() => { setShowAddSheet(false); loadEvents() }}
      />
    </View>
  )
}

// ─── Section Header ───────────────────────────────────────────────────────

function SectionHeader({ icon: Icon, charName, color, title, showChevron = true }: { icon: any; charName?: CharacterName; color: string; title: string; showChevron?: boolean }) {
  const { colors, font, isDark } = useTheme()
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
  const paper = colors.surface
  const paperBorder = colors.borderStrong
  if (diffuse) {
    return (
      <View style={styles.sectionHeader}>
        <DiffuseBloomIcon color={color} size={32} intensity={0.45}>
          {charName ? <Character name={charName} size={20} color={color} /> : <Icon size={16} color={dt.colors.ink3} strokeWidth={1.6} />}
        </DiffuseBloomIcon>
        <Text style={[styles.sectionTitle, { color: dt.colors.ink, fontFamily: diffuseFont.display, letterSpacing: -0.5 }]}>{title}</Text>
        {showChevron ? <ChevronRight size={16} color={dt.colors.ink3} strokeWidth={1.6} /> : null}
      </View>
    )
  }
  return (
    <View style={styles.sectionHeader}>
      <SiteSticker name={(charName && SITE_STICKER[charName]) || 'doc'} size={32} cut />
      <Text style={[styles.sectionTitle, { color: colors.text, fontFamily: font.display, textTransform: 'uppercase', letterSpacing: 0.3, fontSize: 17 }]}>{title}</Text>
      {showChevron ? <ChevronRight size={16} color={colors.text} /> : null}
    </View>
  )
}

// ─── Stat Card ────────────────────────────────────────────────────────────

function StatCard({ icon: Icon, charName, color, bg, num, label, onPress }: any) {
  const { colors, font, isDark } = useTheme()
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
  const paper = colors.surface
  const paperBorder = colors.borderStrong
  if (diffuse) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          styles.statCard,
          {
            backgroundColor: dt.colors.surface,
            borderColor: dt.colors.line,
            opacity: pressed ? 0.92 : 1,
          },
        ]}
      >
        <DiffuseBloomIcon color={bg} size={30} intensity={0.45}>
          {charName ? <Character name={charName} size={20} color={bg} /> : <Icon size={16} color={dt.colors.ink3} strokeWidth={1.6} />}
        </DiffuseBloomIcon>
        <Text style={[styles.statNum, { color: dt.colors.ink, fontFamily: diffuseFont.display }]}>{num}</Text>
        <Text style={[styles.statLabel, { color: dt.colors.ink3, fontFamily: diffuseFont.mono, letterSpacing: 1, textTransform: 'uppercase', fontSize: 9 }]} numberOfLines={1}>{label}</Text>
      </Pressable>
    )
  }
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.statSite, { opacity: pressed ? 0.7 : 1 }]}
    >
      <SiteSticker name={(charName && SITE_STICKER[charName]) || 'doc'} size={40} cut />
      <Text style={[styles.statNum, { color: colors.text, fontFamily: font.displayBold }]}>{num}</Text>
      <Text style={[styles.statLabel, { color: colors.textSecondary, fontFamily: font.bodySemiBold }]} numberOfLines={1}>{label}</Text>
    </Pressable>
  )
}

// ─── Diffuse choice pill (hairline child/type selector) ─────────────────────

function DiffuseChoicePill({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  const dt = useDiffuseTheme()
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        formStyles.diffusePill,
        {
          borderColor: active ? dt.colors.hairline : dt.colors.line2,
          backgroundColor: active ? dt.colors.surface : 'transparent',
          opacity: pressed ? 0.7 : 1,
        },
      ]}
    >
      <Text
        style={{
          fontFamily: active ? diffuseFont.monoBold : diffuseFont.mono,
          fontSize: 11,
          letterSpacing: 1.4,
          textTransform: 'uppercase',
          color: active ? dt.colors.ink : dt.colors.ink3,
        }}
        numberOfLines={1}
      >
        {label}
      </Text>
    </Pressable>
  )
}

// ─── Detail Popup ─────────────────────────────────────────────────────────

function DetailPopup({ section, events, onClose }: { section: string; events: HealthEvent[]; onClose: () => void }) {
  const { colors, font, stickers, isDark } = useTheme()
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
  const { t } = useTranslation()
  const insets = useSafeAreaInsets()
  const paper = diffuse ? dt.colors.surface : colors.surface
  const paperBorder = diffuse ? dt.colors.line : colors.border
  const cfg = TYPE_CFG[section] ?? { label: section, icon: FileText, charName: 'note' as CharacterName, color: colors.textMuted, placeholder: '' }
  const Icon = cfg.icon

  return (
    <Modal visible animationType={diffuse ? 'slide' : 'fade'} presentationStyle="overFullScreen">
      <View style={[styles.detailRoot, { backgroundColor: diffuse ? dt.colors.bg : colors.bg }]}>
        <View style={[styles.detailHeader, { paddingTop: insets.top + 8 }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            {diffuse ? (
              <DiffuseBloomIcon color={cfg.color} size={30} intensity={0.45}>
                <Character name={cfg.charName} size={19} color={cfg.color} />
              </DiffuseBloomIcon>
            ) : (
              <SiteSticker name={SITE_STICKER[cfg.charName] ?? 'doc'} size={32} cut />
            )}
            <Display size={22} color={colors.text} style={!diffuse ? { textTransform: 'uppercase', letterSpacing: 0.3 } : undefined}>{cfg.label}</Display>
          </View>
          {diffuse ? (
            <Pressable onPress={onClose} hitSlop={10}>
              <View style={[styles.detailClose, { backgroundColor: 'transparent', borderColor: dt.colors.line2 }]}>
                <Ionicons name="close" size={20} color={dt.colors.ink} />
              </View>
            </Pressable>
          ) : (
            <InkBackButton icon="close" ink={colors.text} paper={colors.surface} label={t('common_close')} onPress={onClose} style={{ marginBottom: 0 }} />
          )}
        </View>

        {/* Summary */}
        <View style={[styles.detailSummary, diffuse
          ? { backgroundColor: dt.colors.surface, borderColor: dt.colors.line, marginHorizontal: 20 }
          : { backgroundColor: 'transparent', borderColor: 'transparent', borderBottomColor: paperBorder, borderBottomWidth: 1, borderRadius: 0, marginHorizontal: 20 }]}>
          <Text style={[styles.detailSummaryNum, { color: diffuse ? dt.colors.ink : colors.text, fontFamily: diffuse ? diffuseFont.display : font.displayBold }]}>{events.length}</Text>
          <Text style={[styles.detailSummaryLabel, { color: diffuse ? dt.colors.ink3 : colors.textSecondary, fontFamily: diffuse ? diffuseFont.mono : font.bodyMedium, letterSpacing: diffuse ? 1.4 : 0, textTransform: diffuse ? 'uppercase' : 'none' }]}>{t('healthHistory_totalEntries', { label: cfg.label.toLowerCase() })}</Text>
        </View>

        <ScrollView
          style={styles.detailScrollView}
          contentContainerStyle={styles.detailScroll}
          bounces={false}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {events.length === 0 && (
            <Text style={[styles.emptyText, { color: diffuse ? dt.colors.ink3 : colors.textMuted, textAlign: 'center', marginTop: 40, fontFamily: diffuse ? diffuseFont.body : font.body }]}>{t('healthHistory_noEntries', { label: cfg.label.toLowerCase() })}</Text>
          )}
          {events.map((e) => (
            <View
              key={e.id}
              style={[styles.detailItem, diffuse
                ? {
                    backgroundColor: dt.colors.surface,
                    borderColor: dt.colors.line,
                    borderLeftColor: cfg.color,
                    borderLeftWidth: 3,
                    shadowOpacity: 0,
                    elevation: 0,
                  }
                : styles.detailItemSite]}
            >
              <View style={styles.detailItemTop}>
                <Text style={[styles.detailItemValue, { color: diffuse ? dt.colors.ink : colors.text, fontFamily: diffuse ? diffuseFont.display : font.bodyBold, letterSpacing: diffuse ? -0.5 : 0 }]}>{e.value}</Text>
                <View style={[styles.detailChildBadge, diffuse
                  ? { backgroundColor: 'transparent', borderWidth: StyleSheet.hairlineWidth, borderColor: dt.colors.line2 }
                  : { backgroundColor: isDark ? stickers.blue + '28' : stickers.blueSoft, borderWidth: 1.5, borderColor: isDark ? 'transparent' : colors.text }]}>
                  <Text style={[styles.detailChildText, { color: diffuse ? dt.colors.ink3 : (isDark ? stickers.blueInk : colors.text), fontFamily: diffuse ? diffuseFont.mono : font.bodySemiBold, letterSpacing: diffuse ? 1 : 0, textTransform: diffuse ? 'uppercase' : 'none' }]}>{e.childName}</Text>
                </View>
              </View>
              {e.notes ? <Text style={[styles.detailItemNotes, { color: diffuse ? dt.colors.ink3 : colors.textSecondary, fontFamily: diffuse ? diffuseFont.body : font.body }]}>{e.notes}</Text> : null}
              <Text style={[styles.detailItemDate, { color: diffuse ? dt.colors.ink3 : colors.textMuted, fontFamily: diffuse ? diffuseFont.mono : font.body, letterSpacing: diffuse ? 0.5 : 0 }]}>
                {parseLocalDate(e.date).toLocaleDateString(dateLoc(), { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' })}
              </Text>
            </View>
          ))}
        </ScrollView>
      </View>
    </Modal>
  )
}

// ─── Add Health Event Sheet ───────────────────────────────────────────────

const ADD_TYPES = Object.entries(TYPE_CFG).map(([id, cfg]) => ({ id, ...cfg }))

function AddHealthEventSheet({ visible, onClose, onSaved }: { visible: boolean; onClose: () => void; onSaved: () => void }) {
  const weightUnit = useUnitsStore((u) => u.weightUnit)
  const { colors, font, stickers, isDark } = useTheme()
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
  const { t } = useTranslation()
  const children = useChildStore((s) => s.children)
  const paper = diffuse ? dt.colors.surface : colors.surface
  const paperBorder = diffuse ? dt.colors.line : colors.text
  const bw = diffuse ? 1 : 1.5
  const soft = getModeColorSoft('kids')
  const siteField = !diffuse ? { borderWidth: bw, borderRadius: 16, height: 52, paddingHorizontal: 16, fontSize: 16 } : null

  const [eventType, setEventType] = useState<string | null>(null)
  const [selectedChild, setSelectedChild] = useState(children.length === 1 ? children[0]?.id ?? '' : '')
  const [eventDate, setEventDate] = useState(new Date())
  const [showDatePicker, setShowDatePicker] = useState(Platform.OS === 'ios')
  const [value, setValue] = useState('')
  const [weight, setWeight] = useState('')
  const [height, setHeight] = useState('')
  const [headCirc, setHeadCirc] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  function reset() {
    setEventType(null); setSelectedChild(children.length === 1 ? children[0]?.id ?? '' : '')
    setEventDate(new Date()); setValue(''); setWeight(''); setHeight(''); setHeadCirc(''); setNotes('')
    setShowDatePicker(Platform.OS === 'ios')
  }

  async function handleSave() {
    if (!eventType) return Alert.alert(t('kp_hh_missingType'), t('kp_hh_missingTypeBody'))
    if (!selectedChild) return Alert.alert(t('kp_hh_missingChild'), t('kp_hh_missingChildBody'))

    // Growth: need at least weight, height, or head circumference
    if (eventType === 'growth') {
      if (!weight.trim() && !height.trim() && !headCirc.trim()) return Alert.alert(t('kp_hh_missingData'), t('kp_hh_missingDataBody'))
    } else {
      if (!value.trim()) return Alert.alert(t('kp_hh_missingDetails'), t('kp_hh_missingDetailsBody', { what: (TYPE_CFG[eventType]?.label ?? t('kp_hh_event')).toLocaleLowerCase(dateLoc()) }))
    }

    setSaving(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error(tNow('kp_pk_notAuth'))
      const dateStr = toDateStr(eventDate)

      if (eventType === 'growth') {
        // Save weight and height as separate entries for independent chart lines
        const entries = []
        if (weight.trim()) {
          entries.push({
            child_id: selectedChild, user_id: session.user.id,
            date: dateStr, type: 'growth',
            value: `Weight: ${Math.round(displayToKg(parseFloat(weight.trim().replace(',', '.')) || 0, weightUnit) * 100) / 100} kg`, notes: notes.trim() || null,
            logged_by: session.user.id,
          })
        }
        if (height.trim()) {
          entries.push({
            child_id: selectedChild, user_id: session.user.id,
            date: dateStr, type: 'growth',
            value: `Height: ${height.trim()} cm`, notes: notes.trim() || null,
            logged_by: session.user.id,
          })
        }
        if (headCirc.trim()) {
          entries.push({
            child_id: selectedChild, user_id: session.user.id,
            date: dateStr, type: 'growth',
            value: `Head: ${headCirc.trim()} cm`, notes: notes.trim() || null,
            logged_by: session.user.id,
          })
        }
        const { error } = await supabase.from('child_logs').insert(entries)
        if (error) throw error
      } else {
        const { error } = await supabase.from('child_logs').insert({
          child_id: selectedChild, user_id: session.user.id,
          date: dateStr, type: eventType,
          value: value.trim(), notes: notes.trim() || null, logged_by: session.user.id,
        })
        if (error) throw error
      }

      reset(); onSaved()
      void invalidateKidsLogQueries()
    } catch (e: any) { Alert.alert(t('common_error'), t('error_generic')) }
    finally { setSaving(false) }
  }

  const selCfg = ADD_TYPES.find((t) => t.id === eventType)

  return (
    <LogSheet visible={visible} title={t('kp_hh_logEvent')} onClose={() => { reset(); onClose() }} sticker="syringe">
      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={formStyles.form}>
          <MonoCaps color={diffuse ? dt.colors.ink3 : colors.textMuted}>{t('emergencyInsurance_fieldType')}</MonoCaps>
          <View style={formStyles.typeGrid}>
            {!diffuse ? ADD_TYPES.map((t) => (
              <StickerChoice key={t.id} width="33.33%" label={t.label} sticker={SITE_STICKER[t.charName] ?? 'doc'} on={eventType === t.id} tone={soft} onPress={() => setEventType(t.id)} />
            )) : ADD_TYPES.map((t) => {
              const active = eventType === t.id
              const tintBg = active ? (paper) : paper
              return (
                <Pressable
                  key={t.id}
                  onPress={() => setEventType(t.id)}
                  style={[
                    formStyles.typeBtn,
                    diffuse
                      ? {
                          backgroundColor: active ? dt.colors.surface : 'transparent',
                          borderColor: active ? dt.colors.hairline : dt.colors.line2,
                          borderWidth: active ? 1.5 : StyleSheet.hairlineWidth,
                        }
                      : {
                          backgroundColor: tintBg,
                          borderColor: active ? colors.text : paperBorder,
                          borderWidth: active ? 1.5 : 1,
                        },
                  ]}
                >
                  {diffuse ? (
                    <Character name={t.charName} size={22} color={active ? dt.colors.ink : dt.colors.ink3} />
                  ) : (
                    <t.icon size={20} color={active ? colors.text : colors.textMuted} strokeWidth={2} />
                  )}
                  <Text style={[formStyles.typeLabel, diffuse
                    ? { color: active ? dt.colors.ink : dt.colors.ink3, fontFamily: active ? diffuseFont.monoBold : diffuseFont.mono, letterSpacing: 0.8, textTransform: 'uppercase', fontSize: 10 }
                    : { color: active ? colors.text : colors.textSecondary, fontFamily: active ? font.bodySemiBold : font.bodyMedium }]}>{t.label}</Text>
                </Pressable>
              )
            })}
          </View>

          {children.length > 1 && (
            <>
              <MonoCaps color={diffuse ? dt.colors.ink3 : colors.textMuted}>{t('healthHistory_fieldChild')}</MonoCaps>
              <View style={formStyles.childRow}>
                {diffuse
                  ? children.map((c) => (
                      <DiffuseChoicePill
                        key={c.id}
                        label={c.name}
                        active={selectedChild === c.id}
                        onPress={() => setSelectedChild(c.id)}
                      />
                    ))
                  : children.map((c) => (
                      <SiteChoice
                        key={c.id}
                        compact
                        sticker="baby"
                        label={c.name}
                        selected={selectedChild === c.id}
                        tone={soft}
                        onPress={() => setSelectedChild(c.id)}
                      />
                    ))}
              </View>
            </>
          )}

          <MonoCaps color={diffuse ? dt.colors.ink3 : colors.textMuted}>{t('memories_labelDate')}</MonoCaps>
          <Pressable
            onPress={() => setShowDatePicker(!showDatePicker)}
            style={[formStyles.dateBtn, { backgroundColor: paper, borderColor: paperBorder }, !diffuse && { borderWidth: bw, borderRadius: 16, height: 52, paddingHorizontal: 16 }]}
          >
            {diffuse ? <Calendar size={16} color={dt.colors.ink3} strokeWidth={1.6} /> : <SiteSticker name="cal" size={24} />}
            <Text style={[formStyles.dateBtnText, { color: diffuse ? dt.colors.ink : colors.text, fontFamily: diffuse ? diffuseFont.body : font.body }, !diffuse && { fontSize: 16 }]}>{eventDate.toLocaleDateString(dateLoc(), { month: 'long', day: 'numeric', year: 'numeric' })}</Text>
          </Pressable>
          {showDatePicker && (
            <DateTimePicker
              value={eventDate}
              mode="date"
              maximumDate={new Date()}
              minimumDate={new Date(2015, 0, 1)}
              display={Platform.OS === 'ios' ? 'inline' : 'default'}
              themeVariant={(diffuse ? dt.isDark : isDark) ? 'dark' : 'light'}
              onChange={(_, d) => { if (Platform.OS === 'android') setShowDatePicker(false); if (d) setEventDate(d) }}
            />
          )}

          {eventType === 'growth' ? (
            <>
              <MonoCaps color={diffuse ? dt.colors.ink3 : colors.textMuted}>{`${t('pedReport_weight')} (${weightLabel(weightUnit)})`}</MonoCaps>
              <TextInput
                value={weight}
                onChangeText={setWeight}
                placeholder="e.g. 10.5"
                placeholderTextColor={diffuse ? dt.colors.ink4 : colors.textMuted}
                keyboardType="decimal-pad"
                style={[formStyles.input, { color: diffuse ? dt.colors.ink : colors.text, backgroundColor: paper, borderColor: paperBorder, fontFamily: diffuse ? diffuseFont.body : font.body }, siteField]}
              />
              <MonoCaps color={diffuse ? dt.colors.ink3 : colors.textMuted}>{t('healthHistory_heightCm')}</MonoCaps>
              <TextInput
                value={height}
                onChangeText={setHeight}
                placeholder="e.g. 78"
                placeholderTextColor={diffuse ? dt.colors.ink4 : colors.textMuted}
                keyboardType="decimal-pad"
                style={[formStyles.input, { color: diffuse ? dt.colors.ink : colors.text, backgroundColor: paper, borderColor: paperBorder, fontFamily: diffuse ? diffuseFont.body : font.body }, siteField]}
              />
              <MonoCaps color={diffuse ? dt.colors.ink3 : colors.textMuted}>{t('healthHistory_headCm')}</MonoCaps>
              <TextInput
                value={headCirc}
                onChangeText={setHeadCirc}
                placeholder="e.g. 44"
                placeholderTextColor={diffuse ? dt.colors.ink4 : colors.textMuted}
                keyboardType="decimal-pad"
                style={[formStyles.input, { color: diffuse ? dt.colors.ink : colors.text, backgroundColor: paper, borderColor: paperBorder, fontFamily: diffuse ? diffuseFont.body : font.body }, siteField]}
              />
            </>
          ) : (
            <>
              <MonoCaps color={diffuse ? dt.colors.ink3 : colors.textMuted}>{t('preg_weight_details')}</MonoCaps>
              <TextInput
                value={value}
                onChangeText={setValue}
                placeholder={selCfg?.placeholder ?? t('kp_hh_describe')}
                placeholderTextColor={diffuse ? dt.colors.ink4 : colors.textMuted}
                style={[formStyles.input, { color: diffuse ? dt.colors.ink : colors.text, backgroundColor: paper, borderColor: paperBorder, fontFamily: diffuse ? diffuseFont.body : font.body }, siteField]}
              />
            </>
          )}

          <MonoCaps color={diffuse ? dt.colors.ink3 : colors.textMuted}>{t('emergencyInsurance_fieldNotesOptional')}</MonoCaps>
          <TextInput
            value={notes}
            onChangeText={setNotes}
            placeholder={t('kp_hh_extra')}
            placeholderTextColor={diffuse ? dt.colors.ink4 : colors.textMuted}
            multiline
            style={[formStyles.inputMulti, { color: diffuse ? dt.colors.ink : colors.text, backgroundColor: paper, borderColor: paperBorder, fontFamily: diffuse ? diffuseFont.body : font.body }, !diffuse && { borderWidth: bw, borderRadius: 16, fontSize: 16, paddingHorizontal: 16 }]}
          />

          {diffuse ? (
            <PillButton
              label={saving ? t('account_saving') : t('common_save')}
              variant="ink"
              onPress={handleSave}
              disabled={saving}
              leading={<Ionicons name="save-outline" size={18} color={colors.bg} />}
              style={{ marginTop: 6 }}
            />
          ) : (
            <SheetFooterAction>
              <EyeAction label={saving ? t('account_saving') : t('common_save')} onPress={handleSave} ink={colors.text} loading={saving} sticker={selCfg ? (SITE_STICKER[selCfg.charName] ?? 'pencil') : 'pencil'} fill={ACTION_TONES.yellow} size={64} />
            </SheetFooterAction>
          )}
        </View>
      </ScrollView>
    </LogSheet>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1 },
  headerWrap: { paddingHorizontal: 16, paddingBottom: 6 },
  siteHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingBottom: 8 },
  siteTitle: { flex: 1, fontSize: 26, textTransform: 'uppercase', letterSpacing: 0.3 },
  siteSection: {
    backgroundColor: 'transparent',
    borderWidth: 0,
    borderTopWidth: 1,
    borderRadius: 0,
    shadowOpacity: 0,
    elevation: 0,
    paddingHorizontal: 0,
    paddingVertical: 16,
  },
  statSite: { flex: 1, alignItems: 'center', gap: 4 },
  emptySite: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 4 },
  detailItemSite: {
    backgroundColor: 'transparent',
    borderWidth: 0,
    borderBottomWidth: 1,
    borderRadius: 0,
    shadowOpacity: 0,
    elevation: 0,
    paddingHorizontal: 0,
    paddingVertical: 14,
  },
  headerAddBtn: {
    width: 38,
    height: 38,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  filterRow: { height: 44, marginBottom: 8 },
  filterContent: { paddingHorizontal: 20, gap: 8, alignItems: 'center' },
  chip: { paddingVertical: 8, paddingHorizontal: 14, borderWidth: 1, borderRadius: 999 },
  chipText: { fontSize: 13 },

  scroll: { paddingHorizontal: 20, paddingBottom: 40, gap: 14 },

  statsRow: { flexDirection: 'row', gap: 8 },
  statCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 6,
    gap: 6,
    borderRadius: 22,
    borderWidth: 1.5,
  },
  statIconBadge: {
    width: 30, height: 30, borderRadius: 999,
    borderWidth: 1.5,
    alignItems: 'center', justifyContent: 'center',
  },
  statNum: { fontSize: 28, letterSpacing: -0.5, lineHeight: 30 },
  statLabel: { fontSize: 11 },

  sectionCard: {
    padding: 18,
    gap: 12,
    borderRadius: 28,
    borderWidth: 1,
    shadowColor: '#141313',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
  },
  diffuseCard: {
    shadowOpacity: 0,
    elevation: 0,
    borderRadius: 26,
  },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  sectionIconBadge: {
    width: 32, height: 32, borderRadius: 999,
    borderWidth: 1.5,
    alignItems: 'center', justifyContent: 'center',
  },
  sectionTitle: { fontSize: 20, flex: 1, letterSpacing: -0.3 },
  emptyText: { fontSize: 13, lineHeight: 18, flex: 1 },
  emptyState: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 22,
    borderWidth: 1.5,
    borderStyle: 'dashed',
  },

  vaccineList: { gap: 8 },
  vaccineItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  vaccineText: { fontSize: 14, flex: 1 },
  vaccineDate: { fontSize: 11 },
  nextVaccine: { padding: 12, marginTop: 4, borderRadius: 18 },
  nextLabel: { fontSize: 12, marginBottom: 4 },
  nextText: { fontSize: 13, lineHeight: 18 },
  moreChip: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12, paddingVertical: 5,
    borderRadius: 999, borderWidth: 1.5,
    marginTop: 4,
  },
  moreChipText: { fontSize: 12, letterSpacing: 0.2 },

  medItem: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 4 },
  medDot: { width: 10, height: 10, borderRadius: 999, borderWidth: 1.5 },
  medName: { fontSize: 14 },
  medNotes: { fontSize: 12 },
  medDate: { fontSize: 11 },
  activeMeds: { padding: 12, marginTop: 4, borderRadius: 18 },

  chartSubtitle: { fontSize: 12, marginTop: 4 },
  miniChart: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, height: 70, paddingTop: 8 },
  barCol: { flex: 1, alignItems: 'center', gap: 2 },
  barValue: { fontSize: 10 },
  bar: { width: '100%' },
  barLabel: { fontSize: 10 },
  lastMeasure: { fontSize: 12, marginTop: 6 },

  milestoneList: { gap: 10 },
  milestoneItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  milestoneDot: { width: 12, height: 12, borderRadius: 999, borderWidth: 1.5, marginTop: 4 },
  milestoneText: { fontSize: 14 },
  milestoneDate: { fontSize: 11 },

  refChild: { gap: 6, marginTop: 6 },
  refChildName: { fontSize: 16 },
  refChipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  refChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  refChipText: { fontSize: 11 },

  detailRoot: { flex: 1 },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  detailClose: {
    width: 38,
    height: 38,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailSummary: {
    alignItems: 'center',
    paddingVertical: 18,
    marginBottom: 12,
    borderRadius: 22,
    borderWidth: 1,
  },
  detailSummaryNum: { fontSize: 36, letterSpacing: -1 },
  detailSummaryLabel: { fontSize: 13 },
  detailScrollView: { flex: 1 },
  detailScroll: { paddingHorizontal: 20, paddingBottom: 40, gap: 10 },
  detailItem: {
    padding: 16,
    gap: 6,
    borderRadius: 22,
    borderWidth: 1,
    shadowColor: '#141313',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 1,
  },
  detailItemTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  detailItemValue: { fontSize: 16, flex: 1, letterSpacing: -0.1 },
  detailChildBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  detailChildText: { fontSize: 10 },
  detailItemNotes: { fontSize: 13 },
  detailItemDate: { fontSize: 11, marginTop: 2 },
})

const formStyles = StyleSheet.create({
  form: { gap: 12, paddingBottom: 40 },
  diffusePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 999,
    borderWidth: 1,
  },
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  typeBtn: {
    width: '31.5%',
    alignItems: 'center',
    paddingVertical: 16,
    gap: 6,
    borderRadius: 22,
  },
  typeLabel: { fontSize: 12 },
  childRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  childChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderRadius: 999,
  },
  childText: { fontSize: 14 },
  dateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 24,
    height: 64,
    borderWidth: 1,
    borderRadius: 999,
  },
  dateBtnText: { fontSize: 15 },
  input: { borderWidth: 1, paddingHorizontal: 24, height: 64, fontSize: 15, borderRadius: 999 },
  inputMulti: { borderWidth: 1, paddingHorizontal: 20, paddingVertical: 16, minHeight: 96, fontSize: 15, textAlignVertical: 'top', borderRadius: 28 },
})
