/**
 * Pregnancy Profile Screen
 *
 * 10 sections:
 * 1. Hero          — avatar, name, week, trimester, days to go
 * 2. Pregnancy Info — editable grid (due date, week, blood type, weights)
 * 3. Birth Preferences — editable JSONB fields
 * 4. Birth Team    — links to care circle
 * 5. Health Flags  — conditions/allergies
 * 6. Baby Info     — name, sex, position
 * 7. Emergency Contacts — link to emergency card
 * 8. Postpartum Prep — checklist
 * 9. Breastfeeding Plan — feeding intention + supplies
 * 10. Nesting Checklist — standard items
 */

import { useState, useEffect, useRef } from 'react'
import {
  View,
  Text,
  Pressable,
  ScrollView,
  TextInput,
  Modal,
  Alert,
  StyleSheet,
  ActivityIndicator,
  Platform,
  Animated,
  Easing,
} from 'react-native'
import DateTimePicker from '@react-native-community/datetimepicker'
import { router } from 'expo-router'
import { Edit2, Check, ChevronRight } from 'lucide-react-native'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme, brand } from '../../constants/theme'
import { BrandedLoader } from '../../components/ui/BrandedLoader'
import { usePregnancyStore } from '../../store/usePregnancyStore'
import { useJourneyStore } from '../../store/useJourneyStore'
import { getCurrentWeekFromDueDate } from '../../lib/pregnancyData'
import { supabase } from '../../lib/supabase'
import { getDaysToGo } from '../../lib/pregnancyData'
import { ScreenHeader } from '../../components/ui/ScreenHeader'
import { Display, MonoCaps, Body } from '../../components/ui/Typography'
import { Heart as HeartSticker, Squishy, Star as StarSticker, Flower as FlowerSticker, Sparkle, Squiggle, CircleDashed } from '../../components/ui/Stickers'
import { PaperCard } from '../../components/ui/PaperCard'
import { PillButton } from '../../components/ui/PillButton'
import { PaperAlert } from '../../components/ui/PaperAlert'

// ─── Types ────────────────────────────────────────────────────────────────────

interface BirthPreferences {
  prePregnancyWeight?: string
  height?: string
  birthLocation?: string
  painManagement?: string
  atmosphere?: string
  cordCutting?: string
  feedingPlan?: string
  breastfeedingGoal?: string
  lactationBooked?: boolean
  pumpOrdered?: boolean
  durationGoal?: string
  // Pregnancy info extras
  lmpDate?: string            // ISO YYYY-MM-DD — last menstrual period
  conceptionType?: string     // Spontaneous / IVF / IUI / Other
  rhFactor?: string           // Positive / Negative / Unknown
}

const TRIMESTER_LABEL = (week: number): string => {
  if (week <= 13) return 'First'
  if (week <= 27) return 'Second'
  return 'Third'
}

/** Naegele's rule: EDD = LMP + 280 days. Returns ISO YYYY-MM-DD. */
function dueDateFromLmp(lmpIso: string): string {
  const lmp = new Date(lmpIso + 'T00:00:00')
  if (Number.isNaN(lmp.getTime())) return ''
  const due = new Date(lmp.getTime() + 280 * 24 * 60 * 60 * 1000)
  return `${due.getFullYear()}-${String(due.getMonth() + 1).padStart(2, '0')}-${String(due.getDate()).padStart(2, '0')}`
}

interface ProfileData {
  name: string
  bloodType: string
  healthNotes: string
  birthPreferences: BirthPreferences
}

interface BabyData {
  name: string
  sex: string
  lastScanWeek: string
  position: 'cephalic' | 'breech' | 'transverse' | 'unknown'
}

// ─── Static checklist items ───────────────────────────────────────────────────

const POSTPARTUM_ITEMS = [
  'Meal prep frozen meals',
  'Postpartum support person confirmed',
  'Breastfeeding supplies ready',
  'Read about baby blues vs PPD',
  '6-week checkup scheduled',
  'Postpartum vitamin plan',
]

const NESTING_ITEMS = [
  'Nursery ready',
  'Crib assembled',
  'Car seat installed',
  'Baby monitor set up',
  'Outlet covers',
  'Washing baby clothes',
]

// ─── Animated hero heart — gentle pulse + sway ────────────────────────────────

function AnimatedHeartHero({ size = 64, fill }: { size?: number; fill: string }) {
  const pulse = useRef(new Animated.Value(0)).current
  const sway = useRef(new Animated.Value(0)).current

  useEffect(() => {
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 900, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ]),
    )
    const swayLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(sway, { toValue: 1, duration: 2400, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(sway, { toValue: 0, duration: 2400, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    )
    pulseLoop.start()
    swayLoop.start()
    return () => { pulseLoop.stop(); swayLoop.stop() }
  }, [pulse, sway])

  const scale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.07] })
  const rotate = sway.interpolate({ inputRange: [0, 1], outputRange: ['-4deg', '4deg'] })

  return (
    <Animated.View style={{ transform: [{ scale }, { rotate }] }}>
      <HeartSticker size={size} fill={fill} />
    </Animated.View>
  )
}

// ─── Edit field modal ─────────────────────────────────────────────────────────

interface EditFieldModalProps {
  visible: boolean
  label: string
  value: string
  onSave: (v: string) => void
  onClose: () => void
  multiline?: boolean
}

function EditFieldModal({ visible, label, value, onSave, onClose, multiline = false }: EditFieldModalProps) {
  const { colors, font, isDark } = useTheme()
  const paper = isDark ? colors.surface : '#FFFEF8'
  const paperBorder = isDark ? colors.border : 'rgba(20,19,19,0.08)'
  const ink = isDark ? colors.text : '#141313'
  const inkText = isDark ? colors.bg : '#F3ECD9'
  const [text, setText] = useState(value)
  useEffect(() => { setText(value) }, [value])

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.editOverlay}>
        <View style={[styles.editSheet, { backgroundColor: paper, borderColor: paperBorder, borderWidth: 1 }]}>
          <Display size={18} color={colors.text}>{label}</Display>
          <TextInput
            value={text}
            onChangeText={setText}
            multiline={multiline}
            style={[
              styles.editInput,
              {
                color: colors.text,
                backgroundColor: colors.surfaceRaised,
                borderColor: paperBorder,
                height: multiline ? 110 : 56,
                fontFamily: font.body,
              },
            ]}
            autoFocus
            placeholderTextColor={colors.textMuted}
          />
          <View style={styles.editButtons}>
            <Pressable onPress={onClose} style={[styles.editBtn, { backgroundColor: 'transparent', borderWidth: 1, borderColor: paperBorder }]}>
              <Text style={[styles.editBtnText, { color: colors.text, fontFamily: font.bodySemiBold }]}>Cancel</Text>
            </Pressable>
            <Pressable
              onPress={() => { onSave(text); onClose() }}
              style={[styles.editBtn, { backgroundColor: ink }]}
            >
              <Text style={[styles.editBtnText, { color: inkText, fontFamily: font.bodySemiBold }]}>Save</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  )
}

// ─── Option / Wheel constants ─────────────────────────────────────────────────

const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'Unknown']
const RH_FACTORS = ['Positive', 'Negative', 'Unknown']
const CONCEPTION_TYPES = ['Spontaneous', 'IVF', 'IUI', 'Other']

function range(start: number, end: number, step = 1): number[] {
  const out: number[] = []
  for (let v = start; v <= end + 1e-6; v += step) out.push(Math.round(v * 10) / 10)
  return out
}

const HEIGHT_OPTIONS = range(130, 210, 1).map((n) => String(n))
const WEIGHT_OPTIONS = range(35, 200, 0.5).map((n) => n.toFixed(1))

const SEX_OPTIONS = ['Boy', 'Girl', 'Not revealed', 'Other']
const POSITION_OPTIONS = ['cephalic', 'breech', 'transverse', 'unknown']
const SCAN_WEEK_OPTIONS = range(1, 40, 1).map((n) => String(n))

const BIRTH_LOCATIONS = ['Hospital', 'Birth center', 'Home', 'Undecided', 'Other']
const PAIN_MGMT_OPTIONS = ['Epidural', 'Natural / unmedicated', 'Nitrous oxide', 'IV medication', 'Undecided', 'Other']
const ATMOSPHERE_OPTIONS = ['Calm & quiet', 'Music & playlist', 'Dim lights', 'Family present', 'Photographer', 'Undecided', 'Other']
const CORD_CUTTING_OPTIONS = ['Immediate', 'Delayed', 'Partner cuts', 'Cord blood banking', 'Lotus birth', 'Undecided', 'Other']
const FEEDING_PLAN_OPTIONS = ['Breastfeed', 'Formula', 'Mixed', 'Pumping', 'Undecided', 'Other']
const DURATION_GOAL_OPTIONS = ['Less than 3 months', '3 months', '6 months', '9 months', '12 months', '18 months', '24 months', 'Undecided', 'Other']

// ─── Options sheet (radio list) ───────────────────────────────────────────────

interface OptionsSheetProps {
  visible: boolean
  label: string
  value: string
  options: string[]
  onSave: (v: string) => void
  onClose: () => void
}

function OptionsSheet({ visible, label, value, options, onSave, onClose }: OptionsSheetProps) {
  const { colors, font, isDark } = useTheme()
  const paper = isDark ? colors.surface : '#FFFEF8'
  const paperBorder = isDark ? colors.border : 'rgba(20,19,19,0.08)'
  const ink = isDark ? colors.text : '#141313'
  const inkText = isDark ? colors.bg : '#F3ECD9'

  // If the current saved value isn't one of the canonical options, treat it as "Other"
  const isInList = (v: string) => options.includes(v)
  const initialSelected = !value ? '' : isInList(value) ? value : 'Other'
  const initialOtherText = !value || isInList(value) ? '' : value

  const [selected, setSelected] = useState(initialSelected)
  const [otherText, setOtherText] = useState(initialOtherText)

  useEffect(() => {
    if (!visible) return
    setSelected(initialSelected)
    setOtherText(initialOtherText)
  }, [value, visible]) // eslint-disable-line react-hooks/exhaustive-deps

  const showOtherInput = selected === 'Other'

  function handleSave() {
    if (showOtherInput) {
      const trimmed = otherText.trim()
      if (!trimmed) return
      onSave(trimmed)
    } else {
      onSave(selected)
    }
    onClose()
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.editOverlay}>
        <View style={[styles.editSheet, { backgroundColor: paper, borderColor: paperBorder, borderWidth: 1 }]}>
          <Display size={18} color={colors.text}>{label}</Display>
          <ScrollView style={{ maxHeight: 320, marginTop: 12 }} showsVerticalScrollIndicator={false}>
            {options.map((opt) => {
              const active = opt === selected
              return (
                <Pressable
                  key={opt}
                  onPress={() => setSelected(opt)}
                  style={[
                    styles.optionRow,
                    {
                      borderColor: active ? ink : paperBorder,
                      backgroundColor: active ? (isDark ? colors.surfaceRaised : '#FBF3E4') : 'transparent',
                    },
                  ]}
                >
                  <Text style={[styles.optionText, { color: colors.text, fontFamily: active ? font.bodySemiBold : font.body }]}>
                    {opt}
                  </Text>
                  {active && <Check size={16} color={ink} strokeWidth={2.5} />}
                </Pressable>
              )
            })}
          </ScrollView>

          {showOtherInput && (
            <TextInput
              value={otherText}
              onChangeText={setOtherText}
              placeholder="Type your answer"
              placeholderTextColor={colors.textMuted}
              autoFocus
              style={[
                styles.editInput,
                {
                  color: colors.text,
                  backgroundColor: colors.surfaceRaised,
                  borderColor: paperBorder,
                  height: 56,
                  fontFamily: font.body,
                  marginTop: 8,
                },
              ]}
            />
          )}

          <View style={styles.editButtons}>
            <Pressable onPress={onClose} style={[styles.editBtn, { backgroundColor: 'transparent', borderWidth: 1, borderColor: paperBorder }]}>
              <Text style={[styles.editBtnText, { color: colors.text, fontFamily: font.bodySemiBold }]}>Cancel</Text>
            </Pressable>
            <Pressable
              onPress={handleSave}
              disabled={showOtherInput && !otherText.trim()}
              style={[
                styles.editBtn,
                {
                  backgroundColor: ink,
                  opacity: showOtherInput && !otherText.trim() ? 0.4 : 1,
                },
              ]}
            >
              <Text style={[styles.editBtnText, { color: inkText, fontFamily: font.bodySemiBold }]}>Save</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  )
}

// ─── Wheel sheet (iOS-style spinning picker) ──────────────────────────────────

interface WheelSheetProps {
  visible: boolean
  label: string
  value: string
  options: string[]
  unit?: string
  onSave: (v: string) => void
  onClose: () => void
}

const WHEEL_ITEM_HEIGHT = 44
const WHEEL_VISIBLE = 5
const WHEEL_PAD = ((WHEEL_VISIBLE - 1) / 2) * WHEEL_ITEM_HEIGHT

function WheelSheet({ visible, label, value, options, unit, onSave, onClose }: WheelSheetProps) {
  const { colors, font, isDark } = useTheme()
  const paper = isDark ? colors.surface : '#FFFEF8'
  const paperBorder = isDark ? colors.border : 'rgba(20,19,19,0.08)'
  const ink = isDark ? colors.text : '#141313'
  const inkText = isDark ? colors.bg : '#F3ECD9'
  const initialIndex = Math.max(0, options.indexOf(value))
  const [selected, setSelected] = useState(initialIndex >= 0 ? initialIndex : 0)
  const scrollRef = useRef<ScrollView>(null)

  useEffect(() => {
    if (!visible) return
    const idx = Math.max(0, options.indexOf(value))
    setSelected(idx >= 0 ? idx : 0)
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ y: (idx >= 0 ? idx : 0) * WHEEL_ITEM_HEIGHT, animated: false })
    })
  }, [visible, value, options])

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.editOverlay}>
        <View style={[styles.editSheet, { backgroundColor: paper, borderColor: paperBorder, borderWidth: 1 }]}>
          <Display size={18} color={colors.text}>{label}</Display>
          <View style={{ height: WHEEL_VISIBLE * WHEEL_ITEM_HEIGHT, marginTop: 12 }}>
            <View
              pointerEvents="none"
              style={{
                position: 'absolute',
                top: WHEEL_PAD,
                left: 0,
                right: 0,
                height: WHEEL_ITEM_HEIGHT,
                borderTopWidth: 1,
                borderBottomWidth: 1,
                borderColor: paperBorder,
              }}
            />
            <ScrollView
              ref={scrollRef}
              showsVerticalScrollIndicator={false}
              snapToInterval={WHEEL_ITEM_HEIGHT}
              decelerationRate="fast"
              contentContainerStyle={{ paddingVertical: WHEEL_PAD }}
              onMomentumScrollEnd={(e) => {
                const i = Math.round(e.nativeEvent.contentOffset.y / WHEEL_ITEM_HEIGHT)
                setSelected(Math.max(0, Math.min(options.length - 1, i)))
              }}
            >
              {options.map((opt, i) => {
                const active = i === selected
                return (
                  <View
                    key={opt}
                    style={{ height: WHEEL_ITEM_HEIGHT, justifyContent: 'center', alignItems: 'center' }}
                  >
                    <Text
                      style={{
                        fontSize: active ? 22 : 16,
                        opacity: active ? 1 : 0.35,
                        color: colors.text,
                        fontFamily: active ? font.bodySemiBold : font.body,
                      }}
                    >
                      {opt}{unit ? ` ${unit}` : ''}
                    </Text>
                  </View>
                )
              })}
            </ScrollView>
          </View>
          <View style={styles.editButtons}>
            <Pressable onPress={onClose} style={[styles.editBtn, { backgroundColor: 'transparent', borderWidth: 1, borderColor: paperBorder }]}>
              <Text style={[styles.editBtnText, { color: colors.text, fontFamily: font.bodySemiBold }]}>Cancel</Text>
            </Pressable>
            <Pressable
              onPress={() => { onSave(options[selected]); onClose() }}
              style={[styles.editBtn, { backgroundColor: ink }]}
            >
              <Text style={[styles.editBtnText, { color: inkText, fontFamily: font.bodySemiBold }]}>Save</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  )
}

// ─── Section card ─────────────────────────────────────────────────────────────

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  const { colors, isDark } = useTheme()
  const paper = isDark ? colors.surface : '#FFFEF8'
  const paperBorder = isDark ? colors.border : 'rgba(20,19,19,0.08)'
  return (
    <View style={[styles.sectionCard, { backgroundColor: paper, borderColor: paperBorder }]}>
      <View style={{ marginBottom: 8 }}>
        <MonoCaps color={colors.textMuted}>{title}</MonoCaps>
      </View>
      {children}
    </View>
  )
}

// Sticker dot accent palette — cycles per row for the cream-paper look.
const ROW_DOTS = ['#F2B2C7', '#C8B6E8', '#9DC3E8', '#BDD48C', '#F5D652', '#F5B896']

interface InfoRowProps {
  label: string
  value: string
  onEdit?: () => void
  dotColor?: string
}

function InfoRow({ label, value, onEdit, dotColor }: InfoRowProps) {
  const { colors, font, isDark } = useTheme()
  const ink = isDark ? colors.text : '#141313'
  const inkSoft = isDark ? colors.textSecondary : '#3A3533'
  const muted = isDark ? colors.textMuted : '#A69E93'
  return (
    <Pressable
      onPress={onEdit}
      style={({ pressed }) => [
        styles.infoRow,
        { borderBottomColor: colors.borderLight, opacity: pressed ? 0.6 : 1 },
      ]}
    >
      <View style={styles.infoLeft}>
        <View
          style={[
            styles.infoDot,
            {
              backgroundColor: dotColor ?? '#E0D5F3',
              borderColor: ink,
            },
          ]}
        />
        <Text style={[styles.infoLabel, { color: inkSoft, fontFamily: font.bodyMedium }]}>{label}</Text>
      </View>
      <View style={styles.infoRight}>
        <Text style={[styles.infoValue, { color: value ? ink : muted, fontFamily: font.bodySemiBold }]}>
          {value || '—'}
        </Text>
        {onEdit && <Edit2 size={14} color={muted} strokeWidth={2} />}
      </View>
    </Pressable>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function PregnancyProfileScreen() {
  const { colors, font, stickers, isDark } = useTheme()
  const insets = useSafeAreaInsets()

  const storedWeek = usePregnancyStore((s) => s.weekNumber)
  const dueDate = usePregnancyStore((s) => s.dueDate) ?? ''
  const setStoreDueDate = usePregnancyStore((s) => s.setDueDate)
  const setStoreWeekNumber = usePregnancyStore((s) => s.setWeekNumber)
  const setJourneyDueDate = useJourneyStore((s) => s.setDueDate)
  const setJourneyWeekNumber = useJourneyStore((s) => s.setWeekNumber)
  const weekNumber = dueDate ? getCurrentWeekFromDueDate(dueDate) : (storedWeek ?? 1)
  const parentName = useJourneyStore((s) => s.parentName) ?? ''
  const babyNameStore = useJourneyStore((s) => s.babyName) ?? ''

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savedAlertVisible, setSavedAlertVisible] = useState(false)

  const [profile, setProfile] = useState<ProfileData>({
    name: parentName,
    bloodType: '',
    healthNotes: '',
    birthPreferences: {},
  })

  const [baby, setBaby] = useState<BabyData>({
    name: babyNameStore,
    sex: 'Not revealed',
    lastScanWeek: '',
    position: 'unknown',
  })
  const [childId, setChildId] = useState<string | null>(null)
  const [currentWeight, setCurrentWeight] = useState<string>('')

  const [postpartumDone, setPostpartumDone] = useState<Record<string, boolean>>({})
  const [nestingDone, setNestingDone] = useState<Record<string, boolean>>({})
  const [editField, setEditField] = useState<{
    label: string
    value: string
    onSave: (v: string) => void
    multiline?: boolean
  } | null>(null)
  const [dueDatePickerOpen, setDueDatePickerOpen] = useState(false)
  const [draftDueDate, setDraftDueDate] = useState<Date>(() =>
    dueDate ? new Date(dueDate + 'T00:00:00') : new Date(),
  )
  const [lmpPickerOpen, setLmpPickerOpen] = useState(false)
  const [draftLmpDate, setDraftLmpDate] = useState<Date>(new Date())
  const [optionsSheet, setOptionsSheet] = useState<{
    label: string
    value: string
    options: string[]
    onSave: (v: string) => void
  } | null>(null)
  const [wheelSheet, setWheelSheet] = useState<{
    label: string
    value: string
    options: string[]
    unit?: string
    onSave: (v: string) => void
  } | null>(null)

  function openDueDatePicker() {
    setDraftDueDate(dueDate ? new Date(dueDate + 'T00:00:00') : new Date())
    setDueDatePickerOpen(true)
  }

  async function persistDueDateToDb(iso: string) {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    const userId = session.user.id

    const { data: existing } = await supabase
      .from('pregnancy_logs')
      .select('id, notes')
      .eq('user_id', userId)
      .eq('log_type', 'note')
      .eq('value', 'onboarding')
      .order('log_date', { ascending: false })
      .limit(1)
      .maybeSingle()

    let meta: Record<string, unknown> = {}
    if (existing?.notes) {
      try { meta = JSON.parse(existing.notes as string) ?? {} } catch { meta = {} }
    }
    meta.dueDate = iso
    meta.weekNumber = getCurrentWeekFromDueDate(iso)

    if (existing?.id) {
      const { error } = await supabase
        .from('pregnancy_logs')
        .update({ notes: JSON.stringify(meta) })
        .eq('id', existing.id)
      if (error) throw error
    } else {
      const today = new Date()
      const log_date = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
      const { error } = await supabase
        .from('pregnancy_logs')
        .insert({
          user_id: userId,
          log_date,
          log_type: 'note',
          value: 'onboarding',
          notes: JSON.stringify(meta),
        })
      if (error) throw error
    }
  }

  async function applyDueDate(d: Date) {
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    const week = getCurrentWeekFromDueDate(iso)
    setStoreDueDate(iso)
    setStoreWeekNumber(week)
    setJourneyDueDate(iso)
    setJourneyWeekNumber(week)
    setDueDatePickerOpen(false)
    setSaving(true)
    try {
      await persistDueDateToDb(iso)
    } catch (e: unknown) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const trimester = weekNumber <= 13 ? 1 : weekNumber <= 26 ? 2 : 3
  const daysToGo = dueDate ? getDaysToGo(dueDate) : null

  useEffect(() => {
    async function load() {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) return

        const { data: profileRow } = await supabase
          .from('profiles')
          .select('name, blood_type, health_notes, birth_preferences')
          .eq('id', session.user.id)
          .single()

        if (profileRow) {
          const bp = (profileRow.birth_preferences as BirthPreferences) ?? {}
          setProfile({
            name: (profileRow.name as string | null) ?? parentName,
            bloodType: (profileRow.blood_type as string | null) ?? '',
            healthNotes: (profileRow.health_notes as string | null) ?? '',
            birthPreferences: bp,
          })
        }

        // Hydrate due date from the onboarding note (the canonical source)
        const { data: noteRows } = await supabase
          .from('pregnancy_logs')
          .select('id, notes')
          .eq('user_id', session.user.id)
          .eq('log_type', 'note')
          .eq('value', 'onboarding')
          .order('log_date', { ascending: false })
          .limit(1)
        if (noteRows && noteRows[0]?.notes) {
          try {
            const meta = JSON.parse(noteRows[0].notes as string)
            if (meta.dueDate && typeof meta.dueDate === 'string') {
              setStoreDueDate(meta.dueDate)
              setStoreWeekNumber(getCurrentWeekFromDueDate(meta.dueDate))
              setJourneyDueDate(meta.dueDate)
              setJourneyWeekNumber(getCurrentWeekFromDueDate(meta.dueDate))
            }
          } catch { /* ignore */ }
        }

        const { data: childRow } = await supabase
          .from('children')
          .select('id, name, baby_position')
          .eq('user_id', session.user.id)
          .order('created_at', { ascending: true })
          .limit(1)
          .maybeSingle()

        if (childRow) {
          setChildId(childRow.id as string)
          setBaby((prev) => ({
            ...prev,
            name: (childRow.name as string | null) ?? babyNameStore,
            position: (childRow.baby_position as BabyData['position'] | null) ?? 'unknown',
          }))
        }

        // Latest weight log for this user
        const { data: weightRow } = await supabase
          .from('pregnancy_logs')
          .select('value')
          .eq('user_id', session.user.id)
          .eq('log_type', 'weight')
          .order('log_date', { ascending: false })
          .limit(1)
          .maybeSingle()
        if (weightRow?.value) setCurrentWeight(String(weightRow.value))
      } catch {
        // silent
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [])

  async function saveBirthPreferences(updates: Partial<BirthPreferences>) {
    setSaving(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      const merged = { ...profile.birthPreferences, ...updates }
      const { error } = await supabase
        .from('profiles')
        .update({ birth_preferences: merged })
        .eq('id', session.user.id)
      if (error) throw error
      setProfile((prev) => ({ ...prev, birthPreferences: merged }))
    } catch (e: unknown) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  async function saveCurrentWeight(value: string) {
    setSaving(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      const today = new Date()
      const log_date = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
      const { error } = await supabase
        .from('pregnancy_logs')
        .insert({ user_id: session.user.id, log_date, log_type: 'weight', value, notes: null })
      if (error) throw error
      setCurrentWeight(value)
    } catch (e: unknown) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  async function saveLmpDate(lmpIso: string) {
    // Update LMP and auto-derive due date + week
    await saveBirthPreferences({ lmpDate: lmpIso })
    const newDue = dueDateFromLmp(lmpIso)
    if (newDue) {
      const week = getCurrentWeekFromDueDate(newDue)
      setStoreDueDate(newDue)
      setStoreWeekNumber(week)
      setJourneyDueDate(newDue)
      setJourneyWeekNumber(week)
      try {
        await persistDueDateToDb(newDue)
      } catch (e: unknown) {
        Alert.alert('Error', e instanceof Error ? e.message : 'Save failed')
      }
    }
  }

  async function saveProfileField(field: string, value: string) {
    setSaving(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      const { error } = await supabase
        .from('profiles')
        .update({ [field]: value })
        .eq('id', session.user.id)
      if (error) throw error
    } catch (e: unknown) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  async function saveBabyField(field: string, value: string) {
    if (!childId) return
    setSaving(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      const { error } = await supabase
        .from('children')
        .update({ [field]: value })
        .eq('id', childId)
      if (error) throw error
    } catch (e: unknown) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.bg }]}>
        <BrandedLoader />
      </View>
    )
  }

  const bp = profile.birthPreferences

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      {/* Header */}
      <View style={[styles.headerWrap, { paddingTop: insets.top + 8 }]}>
        <ScreenHeader
          title="Pregnancy Profile"
          right={saving ? <ActivityIndicator color={colors.text} size="small" /> : undefined}
        />
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* 1. Hero — sticker-on-paper with motion */}
        <PaperCard
          tint={isDark ? colors.surface : '#FBF3E4'}
          radius={28}
          padding={24}
          style={styles.heroCard}
        >
          {/* Decorative floating stickers */}
          <View style={[styles.heroFloatA, { transform: [{ rotate: '-12deg' }] }]} pointerEvents="none">
            <StarSticker size={26} fill={stickers.yellow} />
          </View>
          <View style={[styles.heroFloatB, { transform: [{ rotate: '14deg' }] }]} pointerEvents="none">
            <FlowerSticker size={24} petal={stickers.green} center={stickers.yellow} />
          </View>
          <View style={[styles.heroFloatC, { transform: [{ rotate: '-8deg' }] }]} pointerEvents="none">
            <Squishy w={32} h={20} fill={stickers.blue} />
          </View>
          <View style={[styles.heroFloatD, { transform: [{ rotate: '18deg' }] }]} pointerEvents="none">
            <Sparkle size={20} fill={stickers.pink} />
          </View>

          {/* Tagline */}
          <Text style={[styles.heroTagline, { color: colors.textMuted, fontFamily: font.italic }]}>
            expecting…
          </Text>

          {/* Heart with halo */}
          <View style={styles.heroHeartWrap}>
            <View
              style={[
                styles.heroHalo,
                { backgroundColor: isDark ? stickers.pink + '30' : stickers.pinkSoft },
              ]}
              pointerEvents="none"
            />
            <View style={styles.heroHaloRing} pointerEvents="none">
              <CircleDashed size={108} stroke={isDark ? stickers.pink : '#D87FA0'} />
            </View>
            <AnimatedHeartHero size={64} fill={stickers.pink} />
          </View>

          {/* Name + squiggle underline */}
          <Display size={36} color={colors.text} style={{ marginTop: 10 }}>
            {profile.name || 'You'}
          </Display>
          <View style={{ marginTop: 2 }} pointerEvents="none">
            <Squiggle w={90} h={14} stroke={stickers.coral ?? '#EE7B6D'} />
          </View>

          <View style={styles.heroChips}>
            <View style={[styles.heroChip, { backgroundColor: stickers.lilacSoft, borderColor: stickers.lilac }]}>
              <Text style={[styles.heroChipText, { color: isDark ? stickers.lilac : '#3A2A6E', fontFamily: font.bodySemiBold }]}>
                Week {weekNumber}
              </Text>
            </View>
            <View style={[styles.heroChip, { backgroundColor: stickers.greenSoft, borderColor: stickers.green }]}>
              <Text style={[styles.heroChipText, { color: isDark ? stickers.green : '#2F4D1A', fontFamily: font.bodySemiBold }]}>
                Trimester {trimester}
              </Text>
            </View>
          </View>

          {daysToGo !== null && (
            <View style={[styles.heroDaysRibbon, { borderColor: stickers.lilac, backgroundColor: isDark ? colors.surface : '#FFFEF8' }]}>
              <Sparkle size={14} fill={stickers.yellow} />
              <Text style={[styles.heroDaysText, { color: colors.text, fontFamily: font.bodySemiBold }]}>
                {daysToGo} days to go
              </Text>
              <Sparkle size={14} fill={stickers.yellow} />
            </View>
          )}

          {bp.birthLocation ? (
            <View style={styles.heroPills}>
              <View style={[styles.heroPill, { backgroundColor: colors.surfaceRaised }]}>
                <Ionicons name="location-outline" size={12} color={colors.textSecondary} />
                <Text style={[styles.heroPillText, { color: colors.textSecondary, fontFamily: font.bodyMedium }]}>
                  {bp.birthLocation}
                </Text>
              </View>
            </View>
          ) : null}
        </PaperCard>

        {/* 2. Pregnancy Info */}
        <SectionCard title="Pregnancy Info">
          <InfoRow
            dotColor={ROW_DOTS[0]}
            label="Due date"
            value={dueDate ? new Date(dueDate + 'T12:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : ''}
            onEdit={openDueDatePicker}
          />
          <InfoRow dotColor={ROW_DOTS[1]} label="Current week" value={dueDate ? `Week ${weekNumber}` : ''} />
          <InfoRow dotColor={ROW_DOTS[2]} label="Trimester" value={dueDate ? TRIMESTER_LABEL(weekNumber) : ''} />
          <InfoRow dotColor={ROW_DOTS[3]} label="Days to go" value={daysToGo != null ? `${daysToGo} days` : ''} />
          <InfoRow
            dotColor={ROW_DOTS[4]}
            label="LMP date"
            value={bp.lmpDate ? new Date(bp.lmpDate + 'T12:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : ''}
            onEdit={() => {
              setDraftLmpDate(bp.lmpDate ? new Date(bp.lmpDate + 'T00:00:00') : new Date())
              setLmpPickerOpen(true)
            }}
          />
          <InfoRow
            dotColor={ROW_DOTS[5]}
            label="Conception type"
            value={bp.conceptionType ?? ''}
            onEdit={() => setOptionsSheet({
              label: 'Conception type',
              value: bp.conceptionType ?? '',
              options: CONCEPTION_TYPES,
              onSave: (v) => void saveBirthPreferences({ conceptionType: v }),
            })}
          />
          <InfoRow
            dotColor={ROW_DOTS[0]}
            label="Blood type"
            value={profile.bloodType}
            onEdit={() => setOptionsSheet({
              label: 'Blood type',
              value: profile.bloodType,
              options: BLOOD_TYPES,
              onSave: (v) => {
                setProfile((p) => ({ ...p, bloodType: v }))
                void saveProfileField('blood_type', v)
              },
            })}
          />
          <InfoRow
            dotColor={ROW_DOTS[1]}
            label="Rh factor"
            value={bp.rhFactor ?? ''}
            onEdit={() => setOptionsSheet({
              label: 'Rh factor',
              value: bp.rhFactor ?? '',
              options: RH_FACTORS,
              onSave: (v) => void saveBirthPreferences({ rhFactor: v }),
            })}
          />
          <InfoRow
            dotColor={ROW_DOTS[2]}
            label="Height"
            value={bp.height ? `${bp.height} cm` : ''}
            onEdit={() => setWheelSheet({
              label: 'Height',
              value: bp.height ?? '170',
              options: HEIGHT_OPTIONS,
              unit: 'cm',
              onSave: (v) => void saveBirthPreferences({ height: v }),
            })}
          />
          <InfoRow
            dotColor={ROW_DOTS[3]}
            label="Pre-pregnancy weight"
            value={bp.prePregnancyWeight ? `${bp.prePregnancyWeight} kg` : ''}
            onEdit={() => setWheelSheet({
              label: 'Pre-pregnancy weight',
              value: bp.prePregnancyWeight ?? '60.0',
              options: WEIGHT_OPTIONS,
              unit: 'kg',
              onSave: (v) => void saveBirthPreferences({ prePregnancyWeight: v }),
            })}
          />
          <InfoRow
            dotColor={ROW_DOTS[4]}
            label="Current weight"
            value={currentWeight ? `${currentWeight} kg` : ''}
            onEdit={() => setWheelSheet({
              label: 'Current weight',
              value: currentWeight || '62.0',
              options: WEIGHT_OPTIONS,
              unit: 'kg',
              onSave: (v) => void saveCurrentWeight(v),
            })}
          />
          <InfoRow
            dotColor={ROW_DOTS[5]}
            label="Weight gained"
            value={(() => {
              const cur = parseFloat(currentWeight)
              const pre = parseFloat(bp.prePregnancyWeight ?? '')
              if (Number.isNaN(cur) || Number.isNaN(pre)) return ''
              const diff = cur - pre
              const sign = diff >= 0 ? '+' : ''
              return `${sign}${diff.toFixed(1)} kg`
            })()}
          />
        </SectionCard>

        {/* Birth Planning — link to the full birth-plan screen */}
        <SectionCard title="Birth Planning">
          <Pressable
            onPress={() => router.push('/birth-plan')}
            style={[styles.linkRow, { borderBottomColor: colors.borderLight }]}
          >
            <Text style={[styles.infoLabel, { color: colors.textMuted, fontFamily: font.bodyMedium }]}>Open birth plan</Text>
            <View style={styles.infoRight}>
              <Text style={[styles.infoValue, { color: colors.textSecondary, fontFamily: font.body }]}>Types · plan · checklist</Text>
              <ChevronRight size={14} color={colors.textMuted} strokeWidth={2} />
            </View>
          </Pressable>
        </SectionCard>

        {/* 3. Birth Preferences */}
        <SectionCard title="Birth Preferences">
          <InfoRow
            label="Birth location"
            value={bp.birthLocation ?? ''}
            onEdit={() => setOptionsSheet({
              label: 'Birth location',
              value: bp.birthLocation ?? '',
              options: BIRTH_LOCATIONS,
              onSave: (v) => void saveBirthPreferences({ birthLocation: v }),
            })}
          />
          <InfoRow
            label="Pain management"
            value={bp.painManagement ?? ''}
            onEdit={() => setOptionsSheet({
              label: 'Pain management',
              value: bp.painManagement ?? '',
              options: PAIN_MGMT_OPTIONS,
              onSave: (v) => void saveBirthPreferences({ painManagement: v }),
            })}
          />
          <InfoRow
            label="Atmosphere"
            value={bp.atmosphere ?? ''}
            onEdit={() => setOptionsSheet({
              label: 'Atmosphere',
              value: bp.atmosphere ?? '',
              options: ATMOSPHERE_OPTIONS,
              onSave: (v) => void saveBirthPreferences({ atmosphere: v }),
            })}
          />
          <InfoRow
            label="Cord cutting"
            value={bp.cordCutting ?? ''}
            onEdit={() => setOptionsSheet({
              label: 'Cord cutting',
              value: bp.cordCutting ?? '',
              options: CORD_CUTTING_OPTIONS,
              onSave: (v) => void saveBirthPreferences({ cordCutting: v }),
            })}
          />
          <InfoRow
            label="Feeding plan"
            value={bp.feedingPlan ?? ''}
            onEdit={() => setOptionsSheet({
              label: 'Feeding plan',
              value: bp.feedingPlan ?? '',
              options: FEEDING_PLAN_OPTIONS,
              onSave: (v) => void saveBirthPreferences({ feedingPlan: v }),
            })}
          />
        </SectionCard>

        {/* 4. Birth Team */}
        <SectionCard title="Birth Team">
          <Pressable
            onPress={() => router.push('/profile/care-circle')}
            style={[styles.linkRow, { borderBottomColor: colors.borderLight }]}
          >
            <Text style={[styles.infoLabel, { color: colors.textMuted }]}>Manage birth team</Text>
            <View style={styles.infoRight}>
              <Text style={[styles.infoValue, { color: colors.textSecondary }]}>Care circle</Text>
              <ChevronRight size={14} color={colors.textMuted} strokeWidth={2} />
            </View>
          </Pressable>
        </SectionCard>

        {/* 5. Health Flags */}
        <SectionCard title="Health Flags">
          <InfoRow
            label="Conditions / notes"
            value={profile.healthNotes}
            onEdit={() => setEditField({
              label: 'Health notes', value: profile.healthNotes,
              multiline: true,
              onSave: (v) => {
                setProfile((p) => ({ ...p, healthNotes: v }))
                void saveProfileField('health_notes', v)
              },
            })}
          />
        </SectionCard>

        {/* 6. Baby Info */}
        <SectionCard title="Baby Info">
          <InfoRow
            label="Baby name"
            value={baby.name}
            onEdit={() => setEditField({
              label: 'Baby name', value: baby.name,
              onSave: (v) => {
                setBaby((b) => ({ ...b, name: v }))
                void saveBabyField('name', v)
              },
            })}
          />
          <InfoRow
            label="Sex"
            value={baby.sex}
            onEdit={() => setOptionsSheet({
              label: 'Baby sex',
              value: baby.sex,
              options: SEX_OPTIONS,
              onSave: (v) => setBaby((b) => ({ ...b, sex: v })),
            })}
          />
          <InfoRow
            label="Position"
            value={baby.position}
            onEdit={() => setOptionsSheet({
              label: 'Baby position',
              value: baby.position,
              options: POSITION_OPTIONS,
              onSave: (v) => {
                const pos = (POSITION_OPTIONS as readonly string[]).includes(v)
                  ? (v as BabyData['position'])
                  : 'unknown'
                setBaby((b) => ({ ...b, position: pos }))
                void saveBabyField('baby_position', pos)
              },
            })}
          />
          <InfoRow
            label="Last scan week"
            value={baby.lastScanWeek ? `Week ${baby.lastScanWeek}` : ''}
            onEdit={() => setWheelSheet({
              label: 'Last scan week',
              value: baby.lastScanWeek || '20',
              options: SCAN_WEEK_OPTIONS,
              unit: '',
              onSave: (v) => setBaby((b) => ({ ...b, lastScanWeek: v })),
            })}
          />
        </SectionCard>

        {/* 7. Emergency Contacts */}
        <SectionCard title="Emergency Contacts">
          <Pressable
            onPress={() => router.push('/profile/emergency-insurance')}
            style={styles.linkRow}
          >
            <Text style={[styles.infoLabel, { color: colors.textMuted }]}>Emergency card</Text>
            <View style={styles.infoRight}>
              <Text style={[styles.infoValue, { color: brand.pregnancy }]}>Manage →</Text>
              <ChevronRight size={14} color={brand.pregnancy} strokeWidth={2} />
            </View>
          </Pressable>
        </SectionCard>

        {/* 8. Postpartum Prep */}
        <SectionCard title="Postpartum Prep">
          {POSTPARTUM_ITEMS.map((item) => (
            <Pressable
              key={item}
              onPress={() => setPostpartumDone((p) => ({ ...p, [item]: !p[item] }))}
              style={[styles.checkRow, { borderBottomColor: colors.borderLight }]}
            >
              <View
                style={[
                  styles.checkbox,
                  {
                    backgroundColor: postpartumDone[item] ? '#A2FF86' : 'transparent',
                    borderColor: postpartumDone[item] ? '#A2FF86' : colors.border,
                  },
                ]}
              >
                {postpartumDone[item] && <Check size={12} color={colors.bg} strokeWidth={3} />}
              </View>
              <Text
                style={[
                  styles.checkLabel,
                  {
                    color: postpartumDone[item] ? colors.textMuted : colors.text,
                    textDecorationLine: postpartumDone[item] ? 'line-through' : 'none',
                  },
                ]}
              >
                {item}
              </Text>
            </Pressable>
          ))}
        </SectionCard>

        {/* 9. Breastfeeding Plan */}
        <SectionCard title="Breastfeeding Plan">
          <InfoRow
            label="Feeding intention"
            value={bp.breastfeedingGoal ?? ''}
            onEdit={() => setOptionsSheet({
              label: 'Feeding intention',
              value: bp.breastfeedingGoal ?? '',
              options: FEEDING_PLAN_OPTIONS,
              onSave: (v) => void saveBirthPreferences({ breastfeedingGoal: v }),
            })}
          />
          <InfoRow
            label="Duration goal"
            value={bp.durationGoal ?? ''}
            onEdit={() => setOptionsSheet({
              label: 'Duration goal',
              value: bp.durationGoal ?? '',
              options: DURATION_GOAL_OPTIONS,
              onSave: (v) => void saveBirthPreferences({ durationGoal: v }),
            })}
          />
          <InfoRow
            label="Lactation consultant"
            value={bp.lactationBooked ? 'Booked ✓' : 'Not booked'}
            onEdit={() => void saveBirthPreferences({ lactationBooked: !bp.lactationBooked })}
          />
          <InfoRow
            label="Pump ordered"
            value={bp.pumpOrdered ? 'Yes ✓' : 'Not yet'}
            onEdit={() => void saveBirthPreferences({ pumpOrdered: !bp.pumpOrdered })}
          />
        </SectionCard>

        {/* 10. Nesting Checklist */}
        <SectionCard title="Nesting Checklist">
          {NESTING_ITEMS.map((item) => (
            <Pressable
              key={item}
              onPress={() => setNestingDone((p) => ({ ...p, [item]: !p[item] }))}
              style={[styles.checkRow, { borderBottomColor: colors.borderLight }]}
            >
              <View
                style={[
                  styles.checkbox,
                  {
                    backgroundColor: nestingDone[item] ? '#A2FF86' : 'transparent',
                    borderColor: nestingDone[item] ? '#A2FF86' : colors.border,
                  },
                ]}
              >
                {nestingDone[item] && <Check size={12} color={colors.bg} strokeWidth={3} />}
              </View>
              <Text
                style={[
                  styles.checkLabel,
                  {
                    color: nestingDone[item] ? colors.textMuted : colors.text,
                    textDecorationLine: nestingDone[item] ? 'line-through' : 'none',
                  },
                ]}
              >
                {item}
              </Text>
            </Pressable>
          ))}
        </SectionCard>

        <PillButton
          label={saving ? 'Saving…' : 'Save Changes'}
          variant="ink"
          onPress={() => setSavedAlertVisible(true)}
          disabled={saving}
          leading={
            <Ionicons
              name="checkmark-circle"
              size={18}
              color={isDark ? '#1A1713' : '#F3ECD9'}
            />
          }
          style={{ marginTop: 8, marginBottom: 16 }}
        />
      </ScrollView>

      {editField && (
        <EditFieldModal
          visible
          label={editField.label}
          value={editField.value}
          onSave={editField.onSave}
          onClose={() => setEditField(null)}
          multiline={editField.multiline}
        />
      )}

      {optionsSheet && (
        <OptionsSheet
          visible
          label={optionsSheet.label}
          value={optionsSheet.value}
          options={optionsSheet.options}
          onSave={optionsSheet.onSave}
          onClose={() => setOptionsSheet(null)}
        />
      )}

      {wheelSheet && (
        <WheelSheet
          visible
          label={wheelSheet.label}
          value={wheelSheet.value}
          options={wheelSheet.options}
          unit={wheelSheet.unit}
          onSave={wheelSheet.onSave}
          onClose={() => setWheelSheet(null)}
        />
      )}

      <Modal
        visible={lmpPickerOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setLmpPickerOpen(false)}
      >
        <Pressable
          style={styles.dateModalBackdrop}
          onPress={() => setLmpPickerOpen(false)}
        >
          <Pressable
            style={[styles.dateModalSheet, { backgroundColor: colors.bg }]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.dateModalHeader}>
              <Pressable onPress={() => setLmpPickerOpen(false)}>
                <Text style={[styles.dateModalCancel, { color: colors.textMuted, fontFamily: font.body }]}>Cancel</Text>
              </Pressable>
              <Text style={[styles.dateModalTitle, { color: colors.text, fontFamily: font.bodySemiBold }]}>
                LMP date
              </Text>
              <Pressable onPress={() => {
                const d = draftLmpDate
                const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
                setLmpPickerOpen(false)
                void saveLmpDate(iso)
              }}>
                <Text style={[styles.dateModalSave, { color: colors.primary, fontFamily: font.bodySemiBold }]}>Save</Text>
              </Pressable>
            </View>
            <DateTimePicker
              value={draftLmpDate}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              themeVariant={isDark ? 'dark' : 'light'}
              minimumDate={new Date(Date.now() - 1000 * 60 * 60 * 24 * 7 * 50)}
              maximumDate={new Date()}
              onChange={(_, d) => {
                if (Platform.OS === 'android') {
                  setLmpPickerOpen(false)
                  if (d) {
                    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
                    void saveLmpDate(iso)
                  }
                  return
                }
                if (d) setDraftLmpDate(d)
              }}
            />
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={dueDatePickerOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setDueDatePickerOpen(false)}
      >
        <Pressable
          style={styles.dateModalBackdrop}
          onPress={() => setDueDatePickerOpen(false)}
        >
          <Pressable
            style={[styles.dateModalSheet, { backgroundColor: colors.bg }]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.dateModalHeader}>
              <Pressable onPress={() => setDueDatePickerOpen(false)}>
                <Text style={[styles.dateModalCancel, { color: colors.textMuted, fontFamily: font.body }]}>Cancel</Text>
              </Pressable>
              <Text style={[styles.dateModalTitle, { color: colors.text, fontFamily: font.bodySemiBold }]}>
                Due date
              </Text>
              <Pressable onPress={() => applyDueDate(draftDueDate)}>
                <Text style={[styles.dateModalSave, { color: colors.primary, fontFamily: font.bodySemiBold }]}>Save</Text>
              </Pressable>
            </View>
            <DateTimePicker
              value={draftDueDate}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              themeVariant={isDark ? 'dark' : 'light'}
              minimumDate={new Date(Date.now() - 1000 * 60 * 60 * 24 * 7 * 42)}
              maximumDate={new Date(Date.now() + 1000 * 60 * 60 * 24 * 7 * 42)}
              onChange={(_, d) => {
                if (Platform.OS === 'android') {
                  setDueDatePickerOpen(false)
                  if (d) applyDueDate(d)
                  return
                }
                if (d) setDraftDueDate(d)
              }}
            />
          </Pressable>
        </Pressable>
      </Modal>

      <PaperAlert
        visible={savedAlertVisible}
        title="Saved"
        italic="all set"
        message="Your pregnancy profile has been saved."
        buttons={[
          {
            label: 'OK',
            variant: 'primary',
            onPress: () => router.back(),
          },
        ]}
        onRequestClose={() => setSavedAlertVisible(false)}
      />
    </View>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  headerWrap: { paddingHorizontal: 16, paddingBottom: 6 },
  scroll: { paddingHorizontal: 20, paddingTop: 8 },

  heroCard: { marginBottom: 18, alignItems: 'center', position: 'relative' as const, overflow: 'hidden' },
  heroSticker: { marginBottom: 4 },
  heroFloatA: { position: 'absolute', top: 14, left: 18 },
  heroFloatB: { position: 'absolute', top: 22, right: 22 },
  heroFloatC: { position: 'absolute', bottom: 22, left: 22 },
  heroFloatD: { position: 'absolute', bottom: 26, right: 24 },
  heroTagline: { fontSize: 12, letterSpacing: 0.5, marginBottom: 8, textTransform: 'lowercase' as const },
  heroHeartWrap: { width: 124, height: 124, alignItems: 'center', justifyContent: 'center', position: 'relative' as const },
  heroHalo: { position: 'absolute', width: 96, height: 96, borderRadius: 48 },
  heroHaloRing: { position: 'absolute', width: 108, height: 108, alignItems: 'center', justifyContent: 'center' },
  heroChips: { flexDirection: 'row', gap: 8, marginTop: 14, flexWrap: 'wrap', justifyContent: 'center' },
  heroChip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 999, borderWidth: 1 },
  heroChipText: { fontSize: 12 },
  heroDaysRibbon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
    marginTop: 14,
  },
  heroDaysText: { fontSize: 13 },
  heroPills: { flexDirection: 'row', gap: 8, marginTop: 12, flexWrap: 'wrap', justifyContent: 'center' },
  heroPill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 999 },
  heroPillText: { fontSize: 12 },

  sectionCard: {
    borderRadius: 28,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    shadowColor: '#141313',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
  },

  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1 },
  infoLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  infoDot: { width: 12, height: 12, borderRadius: 6, borderWidth: 1.2 },
  infoLabel: { fontSize: 14 },
  infoRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  infoValue: { fontSize: 14, maxWidth: 180, textAlign: 'right' },
  linkRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12 },

  checkRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 1 },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, justifyContent: 'center', alignItems: 'center' },
  checkLabel: { fontSize: 14, flex: 1 },

  editOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(20,19,19,0.6)' },
  editSheet: { padding: 24, borderTopLeftRadius: 32, borderTopRightRadius: 32 },
  editInput: { borderRadius: 18, borderWidth: 1, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16, marginTop: 12 },
  editButtons: { flexDirection: 'row', gap: 12, marginTop: 16 },
  editBtn: { flex: 1, paddingVertical: 14, borderRadius: 999, alignItems: 'center' },
  editBtnText: { fontSize: 15 },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 8,
  },
  optionText: { fontSize: 15 },

  dateModalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(20,19,19,0.6)' },
  dateModalSheet: { borderTopLeftRadius: 32, borderTopRightRadius: 32, paddingBottom: 24 },
  dateModalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 18, paddingBottom: 6,
  },
  dateModalTitle: { fontSize: 16 },
  dateModalCancel: { fontSize: 15 },
  dateModalSave: { fontSize: 15 },
})
