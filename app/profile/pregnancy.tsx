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

import { useState, useEffect } from 'react'
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
} from 'react-native'
import { router } from 'expo-router'
import { Edit2, Check, ChevronRight } from 'lucide-react-native'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme, brand } from '../../constants/theme'
import { BrandedLoader } from '../../components/ui/BrandedLoader'
import { usePregnancyStore } from '../../store/usePregnancyStore'
import { useJourneyStore } from '../../store/useJourneyStore'
import { supabase } from '../../lib/supabase'
import { getDaysToGo } from '../../lib/pregnancyData'
import { ScreenHeader } from '../../components/ui/ScreenHeader'
import { Display, MonoCaps, Body } from '../../components/ui/Typography'
import { Heart as HeartSticker, Squishy, Star as StarSticker } from '../../components/ui/Stickers'

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

interface InfoRowProps {
  label: string
  value: string
  onEdit?: () => void
}

function InfoRow({ label, value, onEdit }: InfoRowProps) {
  const { colors, font } = useTheme()
  return (
    <Pressable
      onPress={onEdit}
      style={[styles.infoRow, { borderBottomColor: colors.borderLight }]}
    >
      <Text style={[styles.infoLabel, { color: colors.textMuted, fontFamily: font.bodyMedium }]}>{label}</Text>
      <View style={styles.infoRight}>
        <Text style={[styles.infoValue, { color: colors.text, fontFamily: font.bodySemiBold }]}>{value || '—'}</Text>
        {onEdit && <Edit2 size={14} color={colors.textMuted} strokeWidth={2} />}
      </View>
    </Pressable>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function PregnancyProfileScreen() {
  const { colors, font, stickers, isDark } = useTheme()
  const insets = useSafeAreaInsets()

  const weekNumber = usePregnancyStore((s) => s.weekNumber) ?? 24
  const dueDate = usePregnancyStore((s) => s.dueDate) ?? ''
  const parentName = useJourneyStore((s) => s.parentName) ?? ''
  const babyNameStore = useJourneyStore((s) => s.babyName) ?? ''

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

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

  const [postpartumDone, setPostpartumDone] = useState<Record<string, boolean>>({})
  const [nestingDone, setNestingDone] = useState<Record<string, boolean>>({})
  const [editField, setEditField] = useState<{
    label: string
    value: string
    onSave: (v: string) => void
    multiline?: boolean
  } | null>(null)

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
        {/* 1. Hero */}
        <View style={[styles.heroCard, { backgroundColor: stickers.lilac + (isDark ? '24' : '32'), borderColor: stickers.lilac + '50' }]}>
          <View style={styles.heroSticker}>
            <HeartSticker size={48} fill={stickers.pink} />
          </View>
          <Display size={28} color={colors.text}>{profile.name || 'You'}</Display>
          <Text style={[styles.heroWeek, { color: isDark ? stickers.lilac : '#3A2A6E', fontFamily: font.bodySemiBold }]}>
            Week {weekNumber} · T{trimester}
          </Text>
          {daysToGo !== null && (
            <Text style={[styles.heroDays, { color: colors.textSecondary, fontFamily: font.body }]}>
              {daysToGo} days to go
            </Text>
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
        </View>

        {/* 2. Pregnancy Info */}
        <SectionCard title="Pregnancy Info">
          <InfoRow
            label="Due date"
            value={dueDate ? new Date(dueDate + 'T12:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : ''}
          />
          <InfoRow label="Current week" value={`Week ${weekNumber}`} />
          <InfoRow
            label="Blood type"
            value={profile.bloodType}
            onEdit={() => setEditField({
              label: 'Blood type', value: profile.bloodType,
              onSave: (v) => {
                setProfile((p) => ({ ...p, bloodType: v }))
                void saveProfileField('blood_type', v)
              },
            })}
          />
          <InfoRow
            label="Pre-pregnancy weight"
            value={bp.prePregnancyWeight ? `${bp.prePregnancyWeight} kg` : ''}
            onEdit={() => setEditField({
              label: 'Pre-pregnancy weight (kg)', value: bp.prePregnancyWeight ?? '',
              onSave: (v) => void saveBirthPreferences({ prePregnancyWeight: v }),
            })}
          />
          <InfoRow
            label="Height"
            value={bp.height ? `${bp.height} cm` : ''}
            onEdit={() => setEditField({
              label: 'Height (cm)', value: bp.height ?? '',
              onSave: (v) => void saveBirthPreferences({ height: v }),
            })}
          />
        </SectionCard>

        {/* 3. Birth Preferences */}
        <SectionCard title="Birth Preferences">
          <InfoRow
            label="Birth location"
            value={bp.birthLocation ?? ''}
            onEdit={() => setEditField({
              label: 'Birth location', value: bp.birthLocation ?? '',
              onSave: (v) => void saveBirthPreferences({ birthLocation: v }),
            })}
          />
          <InfoRow
            label="Pain management"
            value={bp.painManagement ?? ''}
            onEdit={() => setEditField({
              label: 'Pain management preference', value: bp.painManagement ?? '',
              onSave: (v) => void saveBirthPreferences({ painManagement: v }),
            })}
          />
          <InfoRow
            label="Atmosphere"
            value={bp.atmosphere ?? ''}
            onEdit={() => setEditField({
              label: 'Atmosphere preference', value: bp.atmosphere ?? '',
              onSave: (v) => void saveBirthPreferences({ atmosphere: v }),
            })}
          />
          <InfoRow
            label="Cord cutting"
            value={bp.cordCutting ?? ''}
            onEdit={() => setEditField({
              label: 'Cord cutting preference', value: bp.cordCutting ?? '',
              onSave: (v) => void saveBirthPreferences({ cordCutting: v }),
            })}
          />
          <InfoRow
            label="Feeding plan"
            value={bp.feedingPlan ?? ''}
            onEdit={() => setEditField({
              label: 'Feeding plan', value: bp.feedingPlan ?? '',
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
            onEdit={() => setEditField({
              label: 'Baby sex (or "Not revealed")', value: baby.sex,
              onSave: (v) => setBaby((b) => ({ ...b, sex: v })),
            })}
          />
          <InfoRow
            label="Position"
            value={baby.position}
            onEdit={() => setEditField({
              label: 'Baby position (cephalic/breech/transverse/unknown)', value: baby.position,
              onSave: (v) => {
                const pos = (['cephalic', 'breech', 'transverse', 'unknown'] as const).includes(v as BabyData['position'])
                  ? v as BabyData['position']
                  : 'unknown'
                setBaby((b) => ({ ...b, position: pos }))
                void saveBabyField('baby_position', pos)
              },
            })}
          />
          <InfoRow
            label="Last scan week"
            value={baby.lastScanWeek ? `Week ${baby.lastScanWeek}` : ''}
            onEdit={() => setEditField({
              label: 'Last scan week number', value: baby.lastScanWeek,
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
            onEdit={() => setEditField({
              label: 'Feeding intention', value: bp.breastfeedingGoal ?? '',
              onSave: (v) => void saveBirthPreferences({ breastfeedingGoal: v }),
            })}
          />
          <InfoRow
            label="Duration goal"
            value={bp.durationGoal ?? ''}
            onEdit={() => setEditField({
              label: 'Duration goal (e.g. 6 months)', value: bp.durationGoal ?? '',
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
    </View>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  headerWrap: { paddingHorizontal: 16, paddingBottom: 6 },
  scroll: { paddingHorizontal: 20, paddingTop: 8 },

  heroCard: { borderRadius: 32, padding: 28, marginBottom: 18, alignItems: 'center', borderWidth: 1, position: 'relative' as const },
  heroSticker: { marginBottom: 8 },
  heroWeek: { fontSize: 16, marginTop: 6 },
  heroDays: { fontSize: 14, marginTop: 4 },
  heroPills: { flexDirection: 'row', gap: 8, marginTop: 14, flexWrap: 'wrap', justifyContent: 'center' },
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
  infoLabel: { fontSize: 13 },
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
})
