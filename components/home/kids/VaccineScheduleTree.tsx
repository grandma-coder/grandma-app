/**
 * VaccineScheduleTree — the age-milestone vaccine tree + per-vaccine info modal.
 *
 * The React rendering layer for the Kids vaccine surface. Extracted from
 * `components/home/KidsHome.tsx` so both KidsHome and the standalone
 * `VaccineTrackerSheet` render ONE copy (they previously each inlined it).
 *
 * Data + logic (`buildVaccineScheduleTree`, `formatHealthDate`, the country
 * catalog, and the record/milestone types) come from `lib/vaccineSchedule.ts`.
 * Per-vaccine educational content comes from `lib/vaccineInfo.ts`.
 */
import { useMemo, useRef, useState } from 'react'
import { View, Text, Pressable, ScrollView, StyleSheet, Modal, Platform } from 'react-native'
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker'
import { Check, X } from 'lucide-react-native'
import { useTheme, brand, font, useDiffuseTheme, diffuseFont, getDiffuseAccent } from '../../../constants/theme'
import { useIsDiffuse, DiffuseArrow } from '../../ui/diffuse/DiffuseKit'
import { DiffuseSheet } from '../../ui/diffuse/DiffusePrimitives'
import { Character } from '../../characters/Characters'
import { Cross as CrossSticker } from '../../ui/Stickers'
import { getVaccineInfo, type VaccineInfo } from '../../../lib/vaccineInfo'
import { MEDICAL_DISCLAIMER, VACCINE_SCHEDULE_NOTE, VACCINE_DISCLAIMER } from '../../../lib/medicalSources'
import type { ChildWithRole } from '../../../types'
import { useTranslation, type TranslationKey } from '../../../lib/i18n'
import {
  buildVaccineScheduleTree,
  formatHealthDate,
  getScheduleForCountry,
  vaccineStatusLabel,
  vaccineMilestoneBadge,
  type HealthHistoryData,
} from '../../../lib/vaccineSchedule'

// ─── VaccineInfoModal (private — only VaccineScheduleTree renders it) ─────────

function VaccineInfoModal({ visible, onClose, vaccineName, doseLabel, info, accent }: {
  visible: boolean; onClose: () => void
  vaccineName: string; doseLabel: string
  info: VaccineInfo | null
  accent: string
}) {
  const { colors, isDark, font } = useTheme()
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
  const { t } = useTranslation()
  const ink = colors.text
  const ink3 = colors.textMuted
  const paper = colors.surface
  const paperBorder = colors.border

  if (diffuse) {
    const dCol = dt.colors
    const acc = getDiffuseAccent('kids', dt.isDark)
    return (
      <DiffuseSheet
        visible={visible}
        title={vaccineName}
        onClose={onClose}
        chip={doseLabel || undefined}
      >
        <View style={{ alignItems: 'flex-start', marginBottom: 18 }}>
          <Character name="vaccine" size={28} color={acc} />
        </View>
        {info ? (
          <View style={{ gap: 18 }}>
            <View>
              <Text style={{ fontFamily: diffuseFont.mono, fontSize: 10, letterSpacing: 1.6, textTransform: 'uppercase', color: dCol.ink3, marginBottom: 7 }}>{t('kids_home_vaccine_info_protects')}</Text>
              <Text style={{ fontFamily: diffuseFont.body, fontSize: 15, lineHeight: 23, color: dCol.ink }}>{info.protects}</Text>
            </View>
            <View>
              <Text style={{ fontFamily: diffuseFont.mono, fontSize: 10, letterSpacing: 1.6, textTransform: 'uppercase', color: dCol.ink3, marginBottom: 7 }}>{t('kids_home_vaccine_info_why')}</Text>
              <Text style={{ fontFamily: diffuseFont.body, fontSize: 14, lineHeight: 22, color: dCol.ink2 }}>{info.why}</Text>
            </View>
            {info.sideEffects ? (
              <View style={{ borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: dCol.line2, paddingTop: 16 }}>
                <Text style={{ fontFamily: diffuseFont.mono, fontSize: 10, letterSpacing: 1.6, textTransform: 'uppercase', color: dCol.ink3, marginBottom: 7 }}>{t('kids_home_vaccine_info_side_effects')}</Text>
                <Text style={{ fontFamily: diffuseFont.body, fontSize: 13, lineHeight: 21, color: dCol.ink2 }}>{info.sideEffects}</Text>
              </View>
            ) : null}
            <Text style={{ fontFamily: diffuseFont.italic, fontSize: 12, color: dCol.ink3, textAlign: 'center', marginTop: 4 }}>{t('kids_home_vaccine_info_disclaimer')}</Text>
            <Text style={{ fontFamily: diffuseFont.body, fontSize: 11, lineHeight: 16, color: dCol.ink3, textAlign: 'center' }}>{MEDICAL_DISCLAIMER}</Text>
            <Text style={{ fontFamily: diffuseFont.body, fontSize: 11, lineHeight: 16, color: dCol.ink3, textAlign: 'center' }}>{VACCINE_SCHEDULE_NOTE}</Text>
          </View>
        ) : (
          <Text style={{ fontFamily: diffuseFont.body, fontSize: 14, lineHeight: 22, color: dCol.ink3 }}>{t('kids_home_vaccine_no_info')}</Text>
        )}
      </DiffuseSheet>
    )
  }

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <Pressable style={s.modalOverlay} onPress={onClose}>
        <Pressable
          onPress={(e) => e.stopPropagation()}
          style={[s.modalContent, { backgroundColor: colors.bg, maxHeight: '70%' }]}
        >
          {/* Drag handle */}
          <View style={{ alignItems: 'center', paddingTop: 10, paddingBottom: 6 }}>
            <View style={{ width: 42, height: 4, borderRadius: 2, backgroundColor: paperBorder }} />
          </View>

          {/* Header */}
          <View style={[s.modalHeader, { gap: 10, alignItems: 'flex-start' }]}>
            <View style={{
              width: 56, height: 56, borderRadius: 18,
              backgroundColor: accent, borderWidth: 2, borderColor: '#141313',
              alignItems: 'center', justifyContent: 'center',
              shadowColor: '#141313', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 1, shadowRadius: 0,
              elevation: 4,
            }}>
              <CrossSticker size={32} fill="#FFFEF8" stroke="#141313" />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={{ color: ink, fontSize: 22, fontFamily: font.display, letterSpacing: -0.4 }}>
                {vaccineName}
              </Text>
              {!!doseLabel && (
                <Text style={{ color: ink3, fontSize: 12, fontFamily: font.bodyMedium, textTransform: 'uppercase', letterSpacing: 1.2 }}>
                  {doseLabel}
                </Text>
              )}
            </View>
            <Pressable onPress={onClose} hitSlop={8}>
              <View style={[s.modalClose, { backgroundColor: paper, borderWidth: 1, borderColor: paperBorder }]}>
                <X size={16} color={ink} strokeWidth={2} />
              </View>
            </Pressable>
          </View>

          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingBottom: 24, paddingTop: 8, gap: 16 }}
            showsVerticalScrollIndicator={false}
          >
            {info ? (
              <>
                <View>
                  <Text style={{ color: ink3, fontSize: 11, fontFamily: font.bodySemiBold, textTransform: 'uppercase', letterSpacing: 1.4, marginBottom: 6 }}>
                    {t('kids_home_vaccine_info_protects')}
                  </Text>
                  <Text style={{ color: ink, fontSize: 15, fontFamily: font.bodyMedium, lineHeight: 22 }}>
                    {info.protects}
                  </Text>
                </View>
                <View>
                  <Text style={{ color: ink3, fontSize: 11, fontFamily: font.bodySemiBold, textTransform: 'uppercase', letterSpacing: 1.4, marginBottom: 6 }}>
                    {t('kids_home_vaccine_info_why')}
                  </Text>
                  <Text style={{ color: ink, fontSize: 14, fontFamily: font.body, lineHeight: 22 }}>
                    {info.why}
                  </Text>
                </View>
                {info.sideEffects && (
                  <View style={{ backgroundColor: paper, borderWidth: 1, borderColor: paperBorder, borderRadius: 18, padding: 14, gap: 4 }}>
                    <Text style={{ color: ink3, fontSize: 11, fontFamily: font.bodySemiBold, textTransform: 'uppercase', letterSpacing: 1.4 }}>
                      {t('kids_home_vaccine_info_side_effects')}
                    </Text>
                    <Text style={{ color: ink, fontSize: 13, fontFamily: font.body, lineHeight: 20 }}>
                      {info.sideEffects}
                    </Text>
                  </View>
                )}
                <Text style={{ color: ink3, fontSize: 11, fontFamily: font.body, fontStyle: 'italic', textAlign: 'center', marginTop: 8 }}>
                  {t('kids_home_vaccine_info_disclaimer')}
                </Text>
                <Text style={{ color: colors.textMuted, fontFamily: font.body, fontSize: 11, marginTop: 12, textAlign: 'center', lineHeight: 16 }}>
                  {MEDICAL_DISCLAIMER}
                </Text>
                <Text style={{ color: colors.textMuted, fontFamily: font.body, fontSize: 11, marginTop: 6, textAlign: 'center', lineHeight: 16 }}>
                  {VACCINE_SCHEDULE_NOTE}
                </Text>
              </>
            ) : (
              <Text style={{ color: ink3, fontSize: 14, fontFamily: font.body, lineHeight: 22 }}>
                {t('kids_home_vaccine_no_info')}
              </Text>
            )}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  )
}

// ─── VaccineScheduleTree ──────────────────────────────────────────────────────

export function VaccineScheduleTree({ child, healthHistory, scheduledVaccines, onSetVaccineDate, onMarkVaccineGiven }: {
  child: ChildWithRole
  healthHistory: HealthHistoryData
  scheduledVaccines: Record<string, string>
  onSetVaccineDate: (key: string, date: string | null) => void
  onMarkVaccineGiven: (name: string, date: string, key: string) => Promise<void>
}) {
  const { colors, isDark, stickers, font } = useTheme()
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
  const { t } = useTranslation()
  const milestones = useMemo(
    () => buildVaccineScheduleTree(child.birthDate ?? '', healthHistory.vaccines, child.countryCode ?? 'US'),
    [child.birthDate, healthHistory.vaccines, child.countryCode],
  )

  // Resolved once so the whole tree cites ONE source: national schedule when
  // catalogued, else an honest WHO reference (never a silent US substitution).
  const resolved = useMemo(
    () => getScheduleForCountry(child.countryCode ?? 'US'),
    [child.countryCode],
  )

  const [expandedMilestones, setExpandedMilestones] = useState<Set<string>>(() => {
    const set = new Set<string>()
    for (const m of milestones) {
      if (m.milestoneStatus === 'partial') set.add(m.key)
    }
    return set
  })
  const [expandedKey, setExpandedKey] = useState<string | null>(null)
  const [pickerDate, setPickerDate] = useState(new Date())
  const [infoVaccine, setInfoVaccine] = useState<{ name: string; doseLabel: string; info: VaccineInfo | null; accent: string } | null>(null)
  // Some Android DateTimePicker builds fire `set` twice for a single confirm
  // (notably across rotation). Track which scheduleKey we've already
  // written so the duplicate doesn't corrupt scheduledVaccines.
  const datePickerWroteRef = useRef<string | null>(null)

  const ink = colors.text
  const ink3 = colors.textMuted

  // Sticker palette (cream-paper design system) — bright fills + ink borders for the sticker-on-paper feel
  const ST_INK = '#141313'
  const ST_GREEN = stickers.green
  const ST_GREEN_SOFT = isDark ? '#283016' : '#DDE7BB'
  const ST_YELLOW = stickers.yellow
  const ST_YELLOW_SOFT = isDark ? '#3A3116' : '#FBEA9E'
  const ST_PEACH = stickers.peach
  const ST_PEACH_SOFT = isDark ? '#3A2618' : '#F9D6C0'
  const ST_CREAM = isDark ? colors.surface : '#F7F0DF'
  const ST_LINE = isDark ? 'rgba(245,237,220,0.20)' : 'rgba(20,19,19,0.20)'

  const DONE_BG = ST_GREEN
  const DONE_BORDER = ST_INK
  const DONE_INK = ST_INK
  const PARTIAL_BG = ST_YELLOW
  const PARTIAL_BORDER = ST_INK
  const PARTIAL_INK = ST_INK
  const OVERDUE_BG = ST_PEACH
  const OVERDUE_BORDER = ST_INK
  const FUTURE_BG = ST_CREAM
  const FUTURE_BORDER = ST_LINE

  function toggleMilestone(key: string) {
    setExpandedMilestones((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  if (milestones.length === 0) {
    if (diffuse) {
      return (
        <Text style={{ fontFamily: diffuseFont.body, fontSize: 13, color: dt.colors.ink3, marginBottom: 8 }}>
          {t('kids_home_vaccine_schedule_empty')}
        </Text>
      )
    }
    return (
      <Text style={{ color: ink3, fontSize: 13, marginBottom: 8 }}>
        {t('kids_home_vaccine_schedule_empty')}
      </Text>
    )
  }

  if (diffuse) {
    const dCol = dt.colors
    const acc = getDiffuseAccent('kids', dt.isDark)
    // Node states: done = filled ink ring; partial/upcoming = hollow accent ring; future = faint hollow.
    return (
      <View>
        {resolved.provenance === 'who-reference' ? (
          <Text style={{ fontFamily: diffuseFont.body, fontSize: 12, lineHeight: 18, color: dCol.ink2, marginBottom: 12 }}>
            {t('kids_home_vaccine_reference_banner', { country: child.countryCode ?? '' })}
          </Text>
        ) : null}
        {milestones.map((milestone, idx) => {
          const isExpanded = expandedMilestones.has(milestone.key)
          const isLast = idx === milestones.length - 1
          const isDoneMilestone = milestone.milestoneStatus === 'done'
          const isPartialMilestone = milestone.milestoneStatus === 'partial'
          const doneCount = milestone.vaccines.filter((v) => v.status === 'done').length
          const totalCount = milestone.vaccines.length
          const badge = vaccineMilestoneBadge(milestone.milestoneStatus, doneCount, totalCount)
          const badgeText = t(badge.key as TranslationKey, badge.params)
          // milestone node blob — checkup(✓) when done · syringe (accent) when
          // partial/in-progress · faint syringe when future. Single-tint keeps
          // the Diffuse monochrome restraint.
          const milestoneBlob = isDoneMilestone ? 'checkup' : 'vaccine'
          const milestoneTint = isDoneMilestone ? dCol.ink : isPartialMilestone ? acc : dCol.ink3

          return (
            <View key={milestone.key} style={{ position: 'relative' }}>
              {/* connector line */}
              {!isLast ? (
                <View pointerEvents="none" style={{ position: 'absolute', left: 12, top: 36, bottom: 0, width: StyleSheet.hairlineWidth, backgroundColor: dCol.line2 }} />
              ) : null}
              {/* milestone row */}
              <Pressable
                onPress={() => toggleMilestone(milestone.key)}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 10 }}
              >
                {/* blob node */}
                <View style={{ width: 25, alignItems: 'center' }}>
                  <Character name={milestoneBlob} size={22} color={milestoneTint} bg={dCol.bg} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: diffuseFont.display, fontSize: 18, color: dCol.ink, letterSpacing: -0.3 }}>{milestone.label}</Text>
                  <Text style={{ fontFamily: diffuseFont.mono, fontSize: 9.5, letterSpacing: 1, textTransform: 'uppercase', color: isDoneMilestone ? dCol.ink2 : dCol.ink3, marginTop: 4 }}>{badgeText}</Text>
                </View>
                <Text style={{ fontFamily: diffuseFont.body, fontSize: 18, color: dCol.ink3, width: 20, textAlign: 'center' }}>{isExpanded ? '−' : '+'}</Text>
              </Pressable>

              {/* expanded vaccine list */}
              {isExpanded ? (
                <View style={{ marginLeft: 12, paddingLeft: 24, borderLeftWidth: StyleSheet.hairlineWidth, borderLeftColor: dCol.line2, paddingBottom: isLast ? 0 : 6 }}>
                  {milestone.vaccines.map((vax) => {
                    const apptDate = scheduledVaccines[vax.scheduleKey] ?? null
                    const isPickerOpen = expandedKey === vax.scheduleKey
                    const fullName = vax.name + (vax.doseLabel ? ` · ${vax.doseLabel}` : '')
                    // vaccine dose blob — status-expressive silhouette, single-tint:
                    // done → checkup(✓) ink · upcoming → clock accent ·
                    // overdue + future → neutral syringe (no red alarm — an
                    // unlogged past-window dose is a records gap, not a warning).
                    const doseBlob = vax.status === 'done' ? 'checkup'
                      : vax.status === 'upcoming' ? 'clock'
                      : 'vaccine'            // overdue + future both read as a neutral syringe
                    const doseTint = vax.status === 'done' ? dCol.ink
                      : vax.status === 'upcoming' ? acc
                      : dCol.ink3            // no red; "not yet logged" is neutral, not an alarm
                    return (
                      <View key={vax.scheduleKey}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 }}>
                          <Pressable
                            onPress={() => setInfoVaccine({
                              name: vax.name,
                              doseLabel: vax.doseLabel,
                              info: getVaccineInfo(vax.name),
                              accent: acc,
                            })}
                            style={({ pressed }) => ({ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, opacity: pressed ? 0.6 : 1 })}
                          >
                            <View style={{ flexShrink: 0 }}>
                              <Character name={doseBlob} size={19} color={doseTint} bg={dCol.bg} />
                            </View>
                            <Text style={{ flex: 1, fontFamily: diffuseFont.body, fontSize: 14, color: dCol.ink }}>{fullName}</Text>
                          </Pressable>
                          {vax.status === 'done' ? (
                            <Text style={{ fontFamily: diffuseFont.mono, fontSize: 10, letterSpacing: 0.5, color: dCol.ink3 }}>{vax.givenDate ? formatHealthDate(vax.givenDate) : ''}</Text>
                          ) : vax.status === 'upcoming' || vax.status === 'overdue' ? (
                            apptDate ? (
                              <View style={{ gap: 6, alignItems: 'flex-end' }}>
                                <Pressable onPress={() => { setExpandedKey(isPickerOpen ? null : vax.scheduleKey); setPickerDate(new Date(apptDate + 'T12:00:00')) }}>
                                  <Text style={{ fontFamily: diffuseFont.monoBold, fontSize: 11, letterSpacing: 0.5, color: dCol.ink }}>{formatHealthDate(apptDate)}</Text>
                                </Pressable>
                                <Pressable
                                  onPress={() => onMarkVaccineGiven(vax.name + (vax.doseLabel ? ` - ${vax.doseLabel}` : ''), apptDate, vax.scheduleKey)}
                                  style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 5, opacity: pressed ? 0.6 : 1 })}
                                >
                                  <Check size={11} color={dCol.success} strokeWidth={2.5} />
                                  <Text style={{ fontFamily: diffuseFont.mono, fontSize: 9.5, letterSpacing: 1, textTransform: 'uppercase', color: dCol.success }}>{t('kids_home_vaccine_mark_given')}</Text>
                                </Pressable>
                              </View>
                            ) : (
                              <Pressable
                                onPress={() => { setExpandedKey(isPickerOpen ? null : vax.scheduleKey); setPickerDate(new Date()) }}
                                style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 5, opacity: pressed ? 0.6 : 1 })}
                              >
                                <Text style={{ fontFamily: diffuseFont.mono, fontSize: 9.5, letterSpacing: 1, textTransform: 'uppercase', color: dCol.ink2 }}>{t('kids_home_vaccine_set_date')}</Text>
                                <DiffuseArrow color={dCol.ink3} size={14} />
                              </Pressable>
                            )
                          ) : (
                            <Text style={{ fontFamily: diffuseFont.mono, fontSize: 9.5, letterSpacing: 0.5, color: dCol.ink3 }}>
                              {(() => { const l = vaccineStatusLabel(vax.status, vax.dueAge); return l ? t(l.key as TranslationKey, l.params) : vax.dueAge })()}
                            </Text>
                          )}
                        </View>

                        {/* inline date picker — hairline card */}
                        {isPickerOpen ? (
                          <View style={{ marginTop: 4, marginBottom: 10, borderWidth: StyleSheet.hairlineWidth, borderColor: dCol.line2, borderRadius: 20, padding: 12, backgroundColor: dCol.surface }}>
                            <Text style={{ fontFamily: diffuseFont.mono, fontSize: 10, letterSpacing: 1.4, textTransform: 'uppercase', color: dCol.ink3, paddingHorizontal: 4, paddingBottom: 4 }}>{t('kids_home_picker_pick_date')}</Text>
                            <DateTimePicker
                              value={pickerDate}
                              mode="date"
                              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                              minimumDate={new Date()}
                              themeVariant={dt.isDark ? 'dark' : 'light'}
                              accentColor={acc}
                              textColor={dCol.ink}
                              onChange={(e: DateTimePickerEvent, d?: Date) => {
                                if (Platform.OS === 'android') setExpandedKey(null)
                                if (e.type === 'set' && d) {
                                  if (datePickerWroteRef.current === vax.scheduleKey) return
                                  datePickerWroteRef.current = vax.scheduleKey
                                  setPickerDate(d)
                                  const y = d.getFullYear()
                                  const mo = String(d.getMonth() + 1).padStart(2, '0')
                                  const day = String(d.getDate()).padStart(2, '0')
                                  onSetVaccineDate(vax.scheduleKey, `${y}-${mo}-${day}`)
                                  if (Platform.OS === 'android') setExpandedKey(null)
                                  setTimeout(() => { datePickerWroteRef.current = null }, 0)
                                }
                                if (e.type === 'dismissed') {
                                  datePickerWroteRef.current = null
                                  setExpandedKey(null)
                                }
                              }}
                            />
                            {Platform.OS === 'ios' ? (
                              <Pressable
                                onPress={() => setExpandedKey(null)}
                                style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: dCol.line2, paddingTop: 14, marginTop: 6, opacity: pressed ? 0.6 : 1 })}
                              >
                                <Text style={{ fontFamily: diffuseFont.mono, fontSize: 12, letterSpacing: 2, textTransform: 'uppercase', color: dCol.ink }}>{t('common_done')}</Text>
                                <DiffuseArrow color={dCol.ink3} size={16} />
                              </Pressable>
                            ) : null}
                          </View>
                        ) : null}
                      </View>
                    )
                  })}
                </View>
              ) : null}
            </View>
          )
        })}
        <View style={{ marginTop: 14, gap: 6 }}>
          <Text style={{ fontFamily: diffuseFont.mono, fontSize: 9.5, letterSpacing: 0.5, color: dCol.ink3 }}>
            {t('kids_home_vaccine_source', { title: resolved.source.title, reviewed: resolved.source.reviewed })}
          </Text>
          <Text style={{ fontFamily: diffuseFont.body, fontSize: 11, lineHeight: 16, color: dCol.ink3 }}>
            {VACCINE_DISCLAIMER}
          </Text>
        </View>
        <VaccineInfoModal
          visible={infoVaccine !== null}
          onClose={() => setInfoVaccine(null)}
          vaccineName={infoVaccine?.name ?? ''}
          doseLabel={infoVaccine?.doseLabel ?? ''}
          info={infoVaccine?.info ?? null}
          accent={infoVaccine?.accent ?? acc}
        />
      </View>
    )
  }

  return (
    <View>
      {resolved.provenance === 'who-reference' ? (
        <Text style={{ fontFamily: font.body, fontSize: 12, lineHeight: 18, color: colors.textMuted, marginBottom: 12 }}>
          {t('kids_home_vaccine_reference_banner', { country: child.countryCode ?? '' })}
        </Text>
      ) : null}
      {milestones.map((milestone, idx) => {
        const isExpanded = expandedMilestones.has(milestone.key)
        const isLast = idx === milestones.length - 1

        const isDoneMilestone = milestone.milestoneStatus === 'done'
        const isPartialMilestone = milestone.milestoneStatus === 'partial'

        const nodeBg = isDoneMilestone ? DONE_BG : isPartialMilestone ? PARTIAL_BG : FUTURE_BG
        const nodeBorder = isDoneMilestone ? DONE_BORDER : isPartialMilestone ? PARTIAL_BORDER : FUTURE_BORDER
        const nodeAccent = isDoneMilestone ? ST_GREEN : isPartialMilestone ? ST_YELLOW : ST_PEACH

        const doneCount = milestone.vaccines.filter((v) => v.status === 'done').length
        const totalCount = milestone.vaccines.length
        const badge = vaccineMilestoneBadge(milestone.milestoneStatus, doneCount, totalCount)
        const badgeText = t(badge.key as TranslationKey, badge.params)

        return (
          <View key={milestone.key} style={{ marginBottom: 4 }}>
            {/* Age milestone row — sticker-on-paper */}
            <Pressable
              onPress={() => toggleMilestone(milestone.key)}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 6 }}
            >
              {/* Squishy sticker age node */}
              <View style={{
                width: 52, height: 44, borderRadius: 14,
                backgroundColor: nodeBg, borderWidth: 1.5, borderColor: nodeBorder,
                alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                shadowColor: ST_INK, shadowOffset: { width: 0, height: 3 },
                shadowOpacity: isDoneMilestone || isPartialMilestone ? 1 : 0,
                shadowRadius: 0, elevation: isDoneMilestone || isPartialMilestone ? 3 : 0,
              }}>
                <Text style={{
                  fontSize: 11, fontFamily: font.display,
                  color: isDoneMilestone || isPartialMilestone ? ST_INK : ink3,
                  textAlign: 'center', lineHeight: 13, letterSpacing: -0.2,
                }}>
                  {milestone.label.replace(/^Months$/i, 'mo').replace(/\bMonths\b/g, 'mo').replace(/\bYears\b/g, 'yr')}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 16, fontFamily: font.display, color: ink, letterSpacing: -0.3 }}>
                  {milestone.label}
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 }}>
                  {isDoneMilestone && <Check size={10} color={ST_INK} strokeWidth={3} />}
                  <Text style={{
                    fontSize: 11, fontFamily: font.bodySemiBold,
                    color: isDoneMilestone || isPartialMilestone ? ST_INK : ink3,
                    textTransform: 'uppercase', letterSpacing: 0.8,
                  }}>
                    {badgeText}
                  </Text>
                </View>
              </View>
              <View style={{
                width: 24, height: 24, borderRadius: 12,
                backgroundColor: isExpanded ? nodeAccent : 'transparent',
                borderWidth: 1.5, borderColor: isExpanded ? ST_INK : ST_LINE,
                alignItems: 'center', justifyContent: 'center',
              }}>
                <Text style={{ fontSize: 10, color: isExpanded ? ST_INK : ink3, fontFamily: font.bodyBold }}>
                  {isExpanded ? '−' : '+'}
                </Text>
              </View>
            </Pressable>

            {/* Branch content */}
            {isExpanded ? (
              <View style={{
                borderLeftWidth: 2, borderLeftColor: nodeBorder,
                borderStyle: 'dashed',
                marginLeft: 25, marginBottom: isLast ? 0 : 4, paddingBottom: 4, paddingTop: 2,
              }}>
                {milestone.vaccines.map((vax) => {
                  const apptDate = scheduledVaccines[vax.scheduleKey] ?? null
                  const isPickerOpen = expandedKey === vax.scheduleKey
                  const fullName = vax.name + (vax.doseLabel ? ` · ${vax.doseLabel}` : '')

                  // overdue + future both read as neutral cream/ink3 — an
                  // unlogged past-window dose is a records gap, not a red alarm.
                  const stickerFill = vax.status === 'done' ? ST_GREEN
                    : vax.status === 'upcoming' ? ST_YELLOW
                    : ST_CREAM
                  const stickerStroke = vax.status === 'future' ? ST_LINE : ST_INK
                  const metaColor = vax.status === 'done' ? (isDark ? ST_GREEN : '#3A7A28')
                    : vax.status === 'upcoming' ? (isDark ? ST_YELLOW : '#7A6100')
                    : ink3

                  return (
                    <View key={vax.scheduleKey}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 7, paddingLeft: 12, paddingRight: 4 }}>
                        {/* Cross sticker + name — tap to open info */}
                        <Pressable
                          onPress={() => setInfoVaccine({
                            name: vax.name,
                            doseLabel: vax.doseLabel,
                            info: getVaccineInfo(vax.name),
                            accent: stickerFill,
                          })}
                          style={({ pressed }) => ({
                            flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10,
                            opacity: pressed ? 0.65 : 1,
                          })}
                        >
                          {/* Cross sticker bullet */}
                          <View style={{
                            width: 22, height: 22, alignItems: 'center', justifyContent: 'center',
                            flexShrink: 0,
                            shadowColor: ST_INK,
                            shadowOffset: { width: 0, height: 1.5 },
                            shadowOpacity: vax.status === 'future' ? 0 : 0.5,
                            shadowRadius: 0, elevation: vax.status === 'future' ? 0 : 2,
                          }}>
                            <CrossSticker size={22} fill={stickerFill} stroke={stickerStroke} />
                            {vax.status === 'done' && (
                              <View style={{ position: 'absolute' }}>
                                <Check size={10} color={ST_INK} strokeWidth={3.5} />
                              </View>
                            )}
                          </View>
                          {/* Name */}
                          <Text style={{ flex: 1, fontSize: 13, fontFamily: font.bodyMedium, color: ink }}>
                            {fullName}
                          </Text>
                        </Pressable>
                        {/* Meta / actions */}
                        {vax.status === 'done' ? (
                          <Text style={{ fontSize: 11, fontFamily: font.bodyMedium, color: metaColor }}>
                            {vax.givenDate ? formatHealthDate(vax.givenDate) : ''}
                          </Text>
                        ) : vax.status === 'upcoming' || vax.status === 'overdue' ? (
                          apptDate ? (
                            <View style={{ gap: 4, alignItems: 'flex-end' }}>
                              <Pressable onPress={() => {
                                setExpandedKey(isPickerOpen ? null : vax.scheduleKey)
                                setPickerDate(new Date(apptDate + 'T12:00:00'))
                              }}>
                                <Text style={{ fontSize: 11, fontFamily: font.bodySemiBold, color: ST_INK }}>
                                  {formatHealthDate(apptDate)}
                                </Text>
                              </Pressable>
                              <Pressable
                                onPress={() => onMarkVaccineGiven(
                                  vax.name + (vax.doseLabel ? ` - ${vax.doseLabel}` : ''),
                                  apptDate,
                                  vax.scheduleKey,
                                )}
                                style={[s.hdVaxBtn, { backgroundColor: brand.success + '18', borderColor: brand.success + '50' }]}
                              >
                                <Check size={10} color={brand.success} strokeWidth={3} />
                                <Text style={[s.hdVaxBtnText, { color: brand.success }]}>{t('kids_home_vaccine_mark_given')}</Text>
                              </Pressable>
                            </View>
                          ) : (
                            <Pressable
                              onPress={() => {
                                setExpandedKey(isPickerOpen ? null : vax.scheduleKey)
                                setPickerDate(new Date())
                              }}
                              style={[s.hdVaxBtn, { backgroundColor: colors.surface, borderColor: colors.borderStrong }]}
                            >
                              <Text style={[s.hdVaxBtnText, { color: colors.textSecondary }]}>{t('kids_home_vaccine_set_date')}</Text>
                            </Pressable>
                          )
                        ) : (
                          <Text style={{ fontSize: 10, fontFamily: font.body, color: ink3 }}>
                            {(() => { const l = vaccineStatusLabel(vax.status, vax.dueAge); return l ? t(l.key as TranslationKey, l.params) : vax.dueAge })()}
                          </Text>
                        )}
                      </View>

                      {/* Inline date picker — sticker-paper card */}
                      {isPickerOpen && (
                        <View style={{
                          marginTop: 6, marginBottom: 12, marginLeft: 10, marginRight: 4,
                          backgroundColor: colors.surface,
                          borderWidth: 1.5, borderColor: ST_INK,
                          borderRadius: 22, padding: 12,
                          shadowColor: ST_INK,
                          shadowOffset: { width: 0, height: 3 },
                          shadowOpacity: 1,
                          shadowRadius: 0,
                          elevation: 3,
                        }}>
                          <Text style={{
                            fontSize: 11, fontFamily: font.bodySemiBold,
                            color: ink3, textTransform: 'uppercase', letterSpacing: 1.4,
                            paddingHorizontal: 4, paddingBottom: 4,
                          }}>
                            {t('kids_home_picker_pick_date')}
                          </Text>
                          <DateTimePicker
                            value={pickerDate}
                            mode="date"
                            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                            minimumDate={new Date()}
                            themeVariant={isDark ? 'dark' : 'light'}
                            accentColor={ST_INK}
                            textColor={ST_INK}
                            onChange={(e: DateTimePickerEvent, d?: Date) => {
                              if (Platform.OS === 'android') setExpandedKey(null)
                              if (e.type === 'set' && d) {
                                // Some Android builds fire `set` twice on a
                                // single confirm (notably across rotation /
                                // double-tap). Guard so onSetVaccineDate
                                // can't write the same date twice.
                                if (datePickerWroteRef.current === vax.scheduleKey) return
                                datePickerWroteRef.current = vax.scheduleKey
                                setPickerDate(d)
                                const y = d.getFullYear()
                                const mo = String(d.getMonth() + 1).padStart(2, '0')
                                const day = String(d.getDate()).padStart(2, '0')
                                onSetVaccineDate(vax.scheduleKey, `${y}-${mo}-${day}`)
                                if (Platform.OS === 'android') setExpandedKey(null)
                                // Release the guard on the next tick so the
                                // picker can be reopened cleanly.
                                setTimeout(() => { datePickerWroteRef.current = null }, 0)
                              }
                              if (e.type === 'dismissed') {
                                datePickerWroteRef.current = null
                                setExpandedKey(null)
                              }
                            }}
                          />
                          {Platform.OS === 'ios' && (
                            <Pressable
                              onPress={() => setExpandedKey(null)}
                              style={({ pressed }) => ({
                                alignSelf: 'center',
                                marginTop: 6,
                                paddingHorizontal: 28,
                                height: 44,
                                borderRadius: 999,
                                borderWidth: 2,
                                borderColor: ST_INK,
                                backgroundColor: ST_YELLOW,
                                alignItems: 'center',
                                justifyContent: 'center',
                                shadowColor: ST_INK,
                                shadowOffset: { width: 0, height: pressed ? 1 : 3 },
                                shadowOpacity: 1,
                                shadowRadius: 0,
                                elevation: 4,
                                transform: [{ translateY: pressed ? 2 : 0 }],
                              })}
                            >
                              <Text style={{
                                fontSize: 14, fontFamily: font.bodyBold,
                                color: ST_INK, letterSpacing: -0.2,
                              }}>
                                {t('common_done')}
                              </Text>
                            </Pressable>
                          )}
                        </View>
                      )}
                    </View>
                  )
                })}
              </View>
            ) : (
              /* Collapsed: dashed stub + one-line summary for done milestones */
              <View style={{
                borderLeftWidth: 2,
                borderLeftColor: isDoneMilestone ? ST_GREEN : ST_LINE,
                borderStyle: 'dashed',
                marginLeft: 25,
                marginBottom: isLast ? 0 : 4,
                paddingBottom: 6,
                minHeight: 14,
              }}>
                {isDoneMilestone && (
                  <Text style={{ fontSize: 11, fontFamily: font.body, color: ink3, paddingLeft: 12, paddingTop: 4 }} numberOfLines={1}>
                    {milestone.vaccines.map((v) => v.name.split(' ')[0]).join(' · ')}
                    {milestone.vaccines[0]?.givenDate ? ` · ${formatHealthDate(milestone.vaccines[0].givenDate)}` : ''}
                  </Text>
                )}
              </View>
            )}
          </View>
        )
      })}
      <View style={{ marginTop: 14, gap: 6 }}>
        <Text style={{ fontFamily: font.body, fontSize: 9.5, letterSpacing: 0.5, color: ink3 }}>
          {t('kids_home_vaccine_source', { title: resolved.source.title, reviewed: resolved.source.reviewed })}
        </Text>
        <Text style={{ fontFamily: font.body, fontSize: 11, lineHeight: 16, color: ink3 }}>
          {VACCINE_DISCLAIMER}
        </Text>
      </View>
      <VaccineInfoModal
        visible={infoVaccine !== null}
        onClose={() => setInfoVaccine(null)}
        vaccineName={infoVaccine?.name ?? ''}
        doseLabel={infoVaccine?.doseLabel ?? ''}
        info={infoVaccine?.info ?? null}
        accent={infoVaccine?.accent ?? ST_YELLOW}
      />
    </View>
  )
}

const s = StyleSheet.create({
  modalOverlay: { flex: 1, backgroundColor: 'rgba(10,8,6,0.55)', justifyContent: 'flex-end' },
  modalContent: { paddingHorizontal: 24, paddingTop: 8, paddingBottom: 40, height: '92%', borderTopLeftRadius: 28, borderTopRightRadius: 28 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  modalClose: { width: 32, height: 32, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  hdVaxBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 999, borderWidth: 1 },
  hdVaxBtnText: { fontSize: 12, fontFamily: font.bodySemiBold },
})
