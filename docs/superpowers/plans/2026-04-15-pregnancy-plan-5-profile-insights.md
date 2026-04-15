# Pregnancy Overhaul — Plan 5: Profile + Insights

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create the full pregnancy profile screen (`app/profile/pregnancy.tsx`) and add pregnancy-specific content to `InsightsScreen.tsx` with expand/collapse cards and 3 tabs (Today / Birth Guide / Reads).

**Architecture:** `PregnancyProfileScreen` is a new file in `app/profile/`. The Settings tab's behavior item is updated to route to it when `mode === 'pregnancy'`. For Insights, `InsightsScreen.tsx` checks `mode === 'pregnancy'` at the top and delegates to a new `PregnancyInsightsContent` component defined in the same file. All expandable cards use a local `expandedCards` state record.

**Tech Stack:** TypeScript · React Native · Supabase · Expo Router · React Query v5

**Depends on:** Plan 1 (Foundation) — requires `lib/pregnancyAffirmations.ts`, `lib/pregnancyAppointments.ts`, `lib/pregnancyInsights.ts`, `lib/pregnancyReads.ts`.

---

### File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `app/profile/pregnancy.tsx` | Create | Full pregnancy profile screen (10 sections) |
| `app/(tabs)/settings.tsx` | Modify | Route pregnancy behavior item to new screen |
| `components/insights/InsightsScreen.tsx` | Modify | Add pregnancy content with expand/collapse cards |

---

### Task 1: Pregnancy Profile Screen

**Files:**
- Create: `app/profile/pregnancy.tsx`

- [ ] **Step 1: Write the file**

```tsx
/**
 * Pregnancy Profile Screen
 *
 * 10 sections:
 * 1. Hero          — avatar, name, week, trimester, days to go
 * 2. Pregnancy Info — editable grid (due date, week, blood type, weights)
 * 3. Birth Preferences — editable JSONB fields
 * 4. Birth Team    — OB-GYN, hospital, partner, doula
 * 5. Health Flags  — conditions/allergies
 * 6. Baby Info     — name, sex, position
 * 7. Emergency Contacts — partner + doctor line
 * 8. Postpartum Prep — checklist
 * 9. Breastfeeding Plan — feeding intention + supplies
 * 10. Nesting Checklist — standard items + custom
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
import { ArrowLeft, Edit2, Check, X, ChevronRight, Plus } from 'lucide-react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme, brand } from '../../constants/theme'
import { usePregnancyStore } from '../../store/usePregnancyStore'
import { useJourneyStore } from '../../store/useJourneyStore'
import { supabase } from '../../lib/supabase'
import { getDaysToGo } from '../../lib/pregnancyData'

// ─── Types ────────────────────────────────────────────────────────────────────

interface BirthPreferences {
  birthLocation?: string
  painManagement?: string
  atmosphere?: string
  cordCutting?: string
  feedingPlan?: string
  lactationBooked?: boolean
  pumpOrdered?: boolean
  durationGoal?: string
}

interface ProfileData {
  name: string
  bloodType: string
  prePregnancyWeight: string
  height: string
  healthNotes: string
  birthPreferences: BirthPreferences
}

interface BabyData {
  name: string
  sex: string
  lastScanWeek: string
  position: 'cephalic' | 'breech' | 'transverse' | 'unknown'
}

// ─── Postpartum checklist items ───────────────────────────────────────────────

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

function EditFieldModal({
  visible,
  label,
  value,
  onSave,
  onClose,
  multiline = false,
}: {
  visible: boolean
  label: string
  value: string
  onSave: (v: string) => void
  onClose: () => void
  multiline?: boolean
}) {
  const { colors } = useTheme()
  const [text, setText] = useState(value)

  useEffect(() => { setText(value) }, [value])

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.editOverlay}>
        <View style={[styles.editSheet, { backgroundColor: colors.surface }]}>
          <Text style={[styles.editLabel, { color: colors.text }]}>{label}</Text>
          <TextInput
            value={text}
            onChangeText={setText}
            multiline={multiline}
            style={[
              styles.editInput,
              {
                color: colors.text,
                backgroundColor: 'rgba(255,255,255,0.06)',
                borderColor: 'rgba(255,255,255,0.12)',
                height: multiline ? 100 : 52,
              },
            ]}
            autoFocus
            placeholderTextColor={colors.textMuted}
          />
          <View style={styles.editButtons}>
            <Pressable onPress={onClose} style={[styles.editBtn, { backgroundColor: 'rgba(255,255,255,0.08)' }]}>
              <Text style={[styles.editBtnText, { color: colors.textSecondary }]}>Cancel</Text>
            </Pressable>
            <Pressable
              onPress={() => { onSave(text); onClose() }}
              style={[styles.editBtn, { backgroundColor: brand.pregnancy }]}
            >
              <Text style={[styles.editBtnText, { color: '#fff' }]}>Save</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  )
}

// ─── Section card ─────────────────────────────────────────────────────────────

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  const { colors } = useTheme()
  return (
    <View style={[styles.sectionCard, { backgroundColor: colors.surface }]}>
      <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>{title.toUpperCase()}</Text>
      {children}
    </View>
  )
}

function InfoRow({
  label,
  value,
  onEdit,
}: {
  label: string
  value: string
  onEdit?: () => void
}) {
  const { colors } = useTheme()
  return (
    <Pressable
      onPress={onEdit}
      style={[styles.infoRow, { borderBottomColor: 'rgba(255,255,255,0.06)' }]}
    >
      <Text style={[styles.infoLabel, { color: colors.textMuted }]}>{label}</Text>
      <View style={styles.infoRight}>
        <Text style={[styles.infoValue, { color: colors.text }]}>{value || '—'}</Text>
        {onEdit && <Edit2 size={14} color={colors.textMuted} strokeWidth={2} />}
      </View>
    </Pressable>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function PregnancyProfileScreen() {
  const { colors } = useTheme()
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
    prePregnancyWeight: '',
    height: '',
    healthNotes: '',
    birthPreferences: {},
  })

  const [baby, setBaby] = useState<BabyData>({
    name: babyNameStore,
    sex: 'Not revealed',
    lastScanWeek: '',
    position: 'unknown',
  })

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

  // Load profile data from Supabase
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
          setProfile({
            name: profileRow.name ?? parentName,
            bloodType: profileRow.blood_type ?? '',
            prePregnancyWeight: profileRow.birth_preferences?.prePregnancyWeight ?? '',
            height: profileRow.birth_preferences?.height ?? '',
            healthNotes: profileRow.health_notes ?? '',
            birthPreferences: profileRow.birth_preferences ?? {},
          })
        }

        // Load baby info from children table
        const { data: childRow } = await supabase
          .from('children')
          .select('name, baby_position')
          .eq('user_id', session.user.id)
          .order('created_at', { ascending: true })
          .limit(1)
          .maybeSingle()

        if (childRow) {
          setBaby((prev) => ({
            ...prev,
            name: childRow.name ?? babyNameStore,
            position: childRow.baby_position ?? 'unknown',
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
      const updateObj: Record<string, string> = { [field]: value }
      const { error } = await supabase
        .from('profiles')
        .update(updateObj)
        .eq('id', session.user.id)
      if (error) throw error
    } catch (e: unknown) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  async function saveBabyField(field: string, value: string) {
    setSaving(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      const { error } = await supabase
        .from('children')
        .update({ [field]: value })
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: true })
        .limit(1)
      if (error) throw error
    } catch {
      // silent
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={brand.pregnancy} size="large" />
      </View>
    )
  }

  const bp = profile.birthPreferences

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={22} color={colors.text} strokeWidth={2} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Pregnancy Profile</Text>
        {saving && <ActivityIndicator color={brand.pregnancy} size="small" />}
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* 1. Hero */}
        <View style={[styles.heroCard, { backgroundColor: brand.pregnancy + '20', borderColor: brand.pregnancy + '30' }]}>
          <Text style={styles.heroEmoji}>🤰</Text>
          <Text style={[styles.heroName, { color: colors.text }]}>{profile.name}</Text>
          <Text style={[styles.heroWeek, { color: brand.pregnancy }]}>
            Week {weekNumber} · T{trimester}
          </Text>
          {daysToGo !== null && (
            <Text style={[styles.heroDays, { color: colors.textSecondary }]}>
              {daysToGo} days to go
            </Text>
          )}
          <View style={styles.heroPills}>
            {bp.birthLocation && (
              <View style={[styles.heroPill, { backgroundColor: 'rgba(255,255,255,0.1)' }]}>
                <Text style={[styles.heroPillText, { color: colors.textSecondary }]}>
                  📍 {bp.birthLocation}
                </Text>
              </View>
            )}
          </View>
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
              label: 'Atmosphere preference (e.g. music, quiet)', value: bp.atmosphere ?? '',
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
            style={[styles.linkRow, { borderBottomColor: 'rgba(255,255,255,0.06)' }]}
          >
            <Text style={[styles.infoLabel, { color: colors.textMuted }]}>Manage birth team</Text>
            <View style={styles.infoRight}>
              <Text style={[styles.infoValue, { color: colors.textSecondary }]}>Care circle →</Text>
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
                const pos = ['cephalic', 'breech', 'transverse', 'unknown'].includes(v) ? v as BabyData['position'] : 'unknown'
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
              style={[styles.checkRow, { borderBottomColor: 'rgba(255,255,255,0.06)' }]}
            >
              <View
                style={[
                  styles.checkbox,
                  {
                    backgroundColor: postpartumDone[item] ? '#A2FF86' : 'transparent',
                    borderColor: postpartumDone[item] ? '#A2FF86' : 'rgba(255,255,255,0.2)',
                  },
                ]}
              >
                {postpartumDone[item] && <Check size={12} color="#1A1030" strokeWidth={3} />}
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
            value={bp.feedingPlan ?? ''}
            onEdit={() => setEditField({
              label: 'Feeding intention', value: bp.feedingPlan ?? '',
              onSave: (v) => void saveBirthPreferences({ feedingPlan: v }),
            })}
          />
          <InfoRow
            label="Duration goal"
            value={bp.durationGoal ?? ''}
            onEdit={() => setEditField({
              label: 'Duration goal (e.g. 6 months, 1 year)', value: bp.durationGoal ?? '',
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
              style={[styles.checkRow, { borderBottomColor: 'rgba(255,255,255,0.06)' }]}
            >
              <View
                style={[
                  styles.checkbox,
                  {
                    backgroundColor: nestingDone[item] ? '#A2FF86' : 'transparent',
                    borderColor: nestingDone[item] ? '#A2FF86' : 'rgba(255,255,255,0.2)',
                  },
                ]}
              >
                {nestingDone[item] && <Check size={12} color="#1A1030" strokeWidth={3} />}
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

      {/* Edit field modal */}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 12,
    gap: 12,
  },
  backBtn: { padding: 8 },
  headerTitle: { fontSize: 18, fontFamily: 'CabinetGrotesk-Black', flex: 1 },
  scroll: { padding: 20, gap: 0 },

  heroCard: { borderRadius: 24, padding: 24, marginBottom: 20, alignItems: 'center', borderWidth: 1 },
  heroEmoji: { fontSize: 48, marginBottom: 8 },
  heroName: { fontSize: 22, fontFamily: 'CabinetGrotesk-Black' },
  heroWeek: { fontSize: 16, fontFamily: 'Satoshi-Variable', fontWeight: '700', marginTop: 4 },
  heroDays: { fontSize: 14, fontFamily: 'Satoshi-Variable', marginTop: 2 },
  heroPills: { flexDirection: 'row', gap: 8, marginTop: 12, flexWrap: 'wrap', justifyContent: 'center' },
  heroPill: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 999 },
  heroPillText: { fontSize: 12, fontFamily: 'Satoshi-Variable', fontWeight: '600' },

  sectionCard: { borderRadius: 20, padding: 16, marginBottom: 16 },
  sectionTitle: { fontSize: 11, fontFamily: 'Satoshi-Variable', fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 12 },

  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1 },
  infoLabel: { fontSize: 13, fontFamily: 'Satoshi-Variable', fontWeight: '600' },
  infoRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  infoValue: { fontSize: 14, fontFamily: 'Satoshi-Variable', maxWidth: 180, textAlign: 'right' },
  linkRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1 },

  checkRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: 1 },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, justifyContent: 'center', alignItems: 'center' },
  checkLabel: { fontSize: 14, fontFamily: 'Satoshi-Variable', fontWeight: '500', flex: 1 },

  editOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' },
  editSheet: { padding: 24, borderTopLeftRadius: 32, borderTopRightRadius: 32 },
  editLabel: { fontSize: 16, fontFamily: 'CabinetGrotesk-Black', marginBottom: 12 },
  editInput: { borderRadius: 16, borderWidth: 1, paddingHorizontal: 16, paddingVertical: 12, fontSize: 16, fontFamily: 'Satoshi-Variable' },
  editButtons: { flexDirection: 'row', gap: 12, marginTop: 16 },
  editBtn: { flex: 1, paddingVertical: 14, borderRadius: 999, alignItems: 'center' },
  editBtnText: { fontSize: 15, fontFamily: 'Satoshi-Variable', fontWeight: '700' },
})
```

- [ ] **Step 2: TypeScript check**

```bash
cd /Users/igorcarvalhorodrigues/Projects/grandma-app
npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors. Fix any field name mismatches by checking the `profiles` table schema.

- [ ] **Step 3: Commit**

```bash
git add app/profile/pregnancy.tsx
git commit -m "feat(pregnancy): full pregnancy profile screen"
```

---

### Task 2: Wire Settings Tab to New Profile Screen

**Files:**
- Modify: `app/(tabs)/settings.tsx` (one line change)

- [ ] **Step 1: Find and update the behavior item route**

```bash
grep -n "profile/personal.*pregnancy\|pregnancy.*profile/personal\|behavior.*label.*route" "app/(tabs)/settings.tsx" | head -5
```

Find the line that says (approximately):
```ts
{ id: 'behavior', label: `${behaviorLabel} ${t('profile_title')}`, ..., route: mode === 'kids' ? '/profile/kids' : '/profile/personal' },
```

Change it to:
```ts
{ id: 'behavior', label: `${behaviorLabel} ${t('profile_title')}`, ..., route: mode === 'kids' ? '/profile/kids' : mode === 'pregnancy' ? '/profile/pregnancy' : '/profile/personal' },
```

- [ ] **Step 2: TypeScript check**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors. If the router type complains about the route string, add it to the typed routes or cast with `as any`.

- [ ] **Step 3: Commit**

```bash
git add "app/(tabs)/settings.tsx"
git commit -m "feat(pregnancy): link behavior profile item to pregnancy profile screen"
```

---

### Task 3: Pregnancy Insights Content

**Files:**
- Modify: `components/insights/InsightsScreen.tsx` (add pregnancy override near top of `InsightsScreen()`)

- [ ] **Step 1: Add the imports at the top of `InsightsScreen.tsx`**

After the existing imports, add:

```ts
import { usePregnancyStore } from '../../store/usePregnancyStore'
import { getWeekData } from '../../lib/pregnancyData'
import { getDailyAffirmation } from '../../lib/pregnancyAffirmations'
import { getBirthFocusForWeek } from '../../lib/pregnancyInsights'
import { getUpcomingAppointment } from '../../lib/pregnancyAppointments'
import { getFeaturedReadForWeek, getReadsByCategory } from '../../lib/pregnancyReads'
import Animated, { useSharedValue, withTiming, useAnimatedStyle } from 'react-native-reanimated'
```

Check if `react-native-reanimated` is installed:
```bash
grep "react-native-reanimated" package.json
```

If not installed, do NOT use Animated — use plain `useState` for height. See Step 2.

- [ ] **Step 2: Add the `PregnancyInsightsContent` component**

Add this entire block just **before** the `export function InsightsScreen()` line:

```tsx
// ─── Pregnancy Insights Content ────────────────────────────────────────────

type PregnancyTab = 'today' | 'birth_guide' | 'reads'

interface CollapsibleCardProps {
  id: string
  title: string
  emoji: string
  color: string
  defaultOpen?: boolean
  children: React.ReactNode
  expandedMap: Record<string, boolean>
  onToggle: (id: string) => void
}

function CollapsibleCard({
  id, title, emoji, color, defaultOpen = false,
  children, expandedMap, onToggle,
}: CollapsibleCardProps) {
  const { colors } = useTheme()
  const isOpen = expandedMap[id] ?? defaultOpen

  return (
    <View style={[ci.card, { backgroundColor: colors.surface, borderColor: color + '30' }]}>
      <Pressable onPress={() => onToggle(id)} style={ci.cardHeader}>
        <Text style={ci.cardEmoji}>{emoji}</Text>
        <Text style={[ci.cardTitle, { color: colors.text, flex: 1 }]}>{title}</Text>
        <Text style={[ci.cardChevron, { color: color }]}>{isOpen ? '▲' : '▼'}</Text>
      </Pressable>
      {isOpen && (
        <View style={[ci.cardBody, { borderTopColor: color + '20' }]}>
          {children}
          {/* Ask Grandma inline CTA */}
          <Pressable
            onPress={() => router.push('/grandma-talk')}
            style={[ci.askCta, { borderColor: color + '40' }]}
          >
            <Text style={[ci.askCtaText, { color: color }]}>
              👵 Ask Grandma about {title.toLowerCase()}
            </Text>
          </Pressable>
        </View>
      )}
    </View>
  )
}

function PregnancyInsightsContent() {
  const { colors } = useTheme()
  const insets = useSafeAreaInsets()
  const weekNumber = usePregnancyStore((s) => s.weekNumber) ?? 24
  const parentName = useJourneyStore((s) => s.parentName) ?? 'Mama'

  const [pTab, setPTab] = useState<PregnancyTab>('today')
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({
    birthFocus: true, // open by default
  })

  function toggleCard(id: string) {
    setExpandedCards((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  const weekData = getWeekData(weekNumber)
  const affirmation = getDailyAffirmation()
  const birthFocus = getBirthFocusForWeek(weekNumber)
  const upcomingAppt = getUpcomingAppointment(weekNumber)
  const featuredRead = getFeaturedReadForWeek(weekNumber)
  const allReads = getReadsByCategory('birth_prep').concat(
    getReadsByCategory('nutrition'),
    getReadsByCategory('mental_health')
  )

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

  const BIRTH_STAGES = [
    {
      id: 'early_labor', emoji: '🌅', color: '#A2FF86', title: 'Early signs & latent labor',
      content: [
        'Cervix dilates from 0–6cm. Contractions are irregular and mild (5–30 min apart).',
        'Stay home: rest, eat lightly, time contractions, keep busy.',
        'Partner role: emotional support, back massage, prepare the hospital bag.',
        'Most first labors: latent phase lasts 6–12 hours. Stay patient.',
      ],
    },
    {
      id: 'active_labor', emoji: '🌊', color: brand.pregnancy, title: 'Active labor',
      content: [
        'Cervix 6–10cm. Contractions every 3–5 min, lasting 60–90 sec, very intense.',
        '5-1-1 rule: contractions every 5 min, lasting 1 min, for 1 hour → go to hospital.',
        'Pain relief options: epidural, gas and air, water, hypnobirthing, movement.',
        'Partner role: breathing cues, position changes, advocate with staff.',
      ],
    },
    {
      id: 'transition', emoji: '💫', color: '#FBBF24', title: 'Transition & pushing',
      content: [
        'Fully dilated (10cm). The hardest but shortest phase — usually 15–60 min.',
        'Contractions are 2–3 min apart. Intense pressure, shaking, nausea are normal.',
        'Pushing techniques: directed pushing vs. breathing down. Ask your midwife.',
        'You can do this. Every contraction brings your baby closer.',
      ],
    },
    {
      id: 'birth', emoji: '👶', color: '#6AABF7', title: 'Birth & golden hour',
      content: [
        'Skin-to-skin immediately: regulates baby\'s temperature, heart rate, and breathing.',
        'Delayed cord clamping (1–3 min): transfers 80–100mL of blood = important for iron.',
        'First breastfeed in the golden hour: colostrum is liquid gold.',
        'Placenta delivery: 5–30 min after birth. Active or physiological management.',
      ],
    },
    {
      id: 'postpartum', emoji: '🌸', color: '#FF8AD8', title: 'Recovery & postpartum',
      content: [
        'Lochia (postpartum bleeding): red 3–4 days, pink/brown 2 weeks, creamy to week 6.',
        'Baby blues: days 3–5, as hormones crash. Normal. Postpartum depression: more than 2 weeks → seek help.',
        '6-week checkup: uterus, stitches, mental health screen, contraception.',
        'Rest, nourishment, and connection are the only priorities right now.',
      ],
    },
  ]

  const WARNING_SIGNS = [
    'Water breaks before week 37',
    'Heavy or unusual bleeding',
    'Baby not moving for 2+ hours (week 28+)',
    'Severe headache + vision changes',
    'Fever above 38°C (100.4°F)',
  ]

  const renderToday = () => (
    <>
      {/* Greeting */}
      <View style={[ci.greetingCard, { backgroundColor: 'rgba(185,131,255,0.12)', borderColor: 'rgba(185,131,255,0.2)' }]}>
        <Text style={[ci.greetingDate, { color: colors.textMuted }]}>{today}</Text>
        <Text style={[ci.greetingName, { color: colors.text }]}>Good morning, {parentName} 💜</Text>
        <Text style={[ci.greetingWeek, { color: brand.pregnancy }]}>Week {weekNumber} · {weekData.babySize}</Text>
      </View>

      {/* Week tip — collapsible */}
      <CollapsibleCard
        id="weekTip" emoji="💡" color="#FBBF24" title={`Week ${weekNumber} tip`}
        expandedMap={expandedCards} onToggle={toggleCard}
      >
        <Text style={[ci.bodyText, { color: colors.textSecondary }]}>{weekData.momTip}</Text>
      </CollapsibleCard>

      {/* Birth focus — collapsible, open by default */}
      {birthFocus && (
        <CollapsibleCard
          id="birthFocus" emoji={birthFocus.emoji} color={brand.pregnancy}
          title={birthFocus.title} defaultOpen expandedMap={expandedCards} onToggle={toggleCard}
        >
          <Text style={[ci.bodyText, { color: colors.textSecondary }]}>{birthFocus.description}</Text>
          {birthFocus.tips?.map((tip: string, i: number) => (
            <Text key={i} style={[ci.bulletText, { color: colors.textSecondary }]}>• {tip}</Text>
          ))}
        </CollapsibleCard>
      )}

      {/* Affirmation — collapsible */}
      <CollapsibleCard
        id="affirmation" emoji="✨" color="#FF8AD8" title="Today's affirmation"
        expandedMap={expandedCards} onToggle={toggleCard}
      >
        <Text style={[ci.affirmationText, { color: colors.text }]}>"{affirmation}"</Text>
      </CollapsibleCard>

      {/* Upcoming appointment — collapsible */}
      {upcomingAppt && (
        <CollapsibleCard
          id="appointment" emoji="📅" color="#FBBF24" title={`Next: ${upcomingAppt.name}`}
          expandedMap={expandedCards} onToggle={toggleCard}
        >
          <Text style={[ci.bodyText, { color: colors.textSecondary }]}>
            {upcomingAppt.prep ?? upcomingAppt.prepNote ?? ''}
          </Text>
        </CollapsibleCard>
      )}
    </>
  )

  const renderBirthGuide = () => (
    <>
      {/* Warning card — always visible, never collapsible */}
      <View style={[ci.warningCard, { borderColor: '#FF6B3540' }]}>
        <Text style={ci.warningTitle}>⚠️ Call your provider or go to hospital if:</Text>
        {WARNING_SIGNS.map((sign, i) => (
          <Text key={i} style={[ci.warningItem, { color: '#FF6B35' }]}>• {sign}</Text>
        ))}
      </View>

      {/* 5 birth stage cards */}
      {BIRTH_STAGES.map((stage) => (
        <CollapsibleCard
          key={stage.id}
          id={stage.id}
          emoji={stage.emoji}
          color={stage.color}
          title={stage.title}
          expandedMap={expandedCards}
          onToggle={toggleCard}
        >
          {stage.content.map((line, i) => (
            <Text key={i} style={[ci.bulletText, { color: colors.textSecondary }]}>• {line}</Text>
          ))}
        </CollapsibleCard>
      ))}
    </>
  )

  const renderReads = () => (
    <>
      {featuredRead && (
        <View style={[ci.featuredCard, { backgroundColor: brand.pregnancy + '15', borderColor: brand.pregnancy + '30' }]}>
          <Text style={[ci.featuredBadge, { color: brand.pregnancy }]}>FEATURED THIS WEEK</Text>
          <Text style={[ci.featuredTitle, { color: colors.text }]}>{featuredRead.title}</Text>
          <Text style={[ci.featuredSummary, { color: colors.textSecondary }]}>{featuredRead.summary}</Text>
          <Text style={[ci.featuredMins, { color: colors.textMuted }]}>{featuredRead.readMinutes} min read</Text>
        </View>
      )}
      {allReads.map((read: { id: string; title: string; summary: string; category: string; readMinutes: number }) => (
        <CollapsibleCard
          key={read.id}
          id={`read_${read.id}`}
          emoji={read.category === 'birth_prep' ? '🏥' : read.category === 'nutrition' ? '🥗' : read.category === 'mental_health' ? '🧠' : '📖'}
          color={read.category === 'birth_prep' ? '#FBBF24' : read.category === 'nutrition' ? '#A2FF86' : brand.pregnancy}
          title={read.title}
          expandedMap={expandedCards}
          onToggle={toggleCard}
        >
          <Text style={[ci.bodyText, { color: colors.textSecondary }]}>{read.summary}</Text>
          <Text style={[ci.readMins, { color: colors.textMuted }]}>{read.readMinutes} min read</Text>
        </CollapsibleCard>
      ))}
    </>
  )

  return (
    <View style={[ci.root, { backgroundColor: colors.background }]}>
      {/* Tab bar */}
      <View style={[ci.tabBar, { paddingTop: insets.top + 8 }]}>
        {(['today', 'birth_guide', 'reads'] as PregnancyTab[]).map((t) => {
          const label = t === 'today' ? 'Today' : t === 'birth_guide' ? 'Birth Guide' : 'Reads'
          return (
            <Pressable
              key={t}
              onPress={() => setPTab(t)}
              style={[ci.tabBtn, pTab === t && { borderBottomWidth: 2, borderBottomColor: brand.pregnancy }]}
            >
              <Text style={[ci.tabLabel, { color: pTab === t ? brand.pregnancy : colors.textMuted }]}>
                {label}
              </Text>
            </Pressable>
          )
        })}
      </View>

      <ScrollView
        contentContainerStyle={[ci.scroll, { paddingBottom: insets.bottom + 80 }]}
        showsVerticalScrollIndicator={false}
      >
        {pTab === 'today' && renderToday()}
        {pTab === 'birth_guide' && renderBirthGuide()}
        {pTab === 'reads' && renderReads()}
      </ScrollView>

      {/* Ask Grandma bar pinned at bottom */}
      <Pressable
        onPress={() => router.push('/grandma-talk')}
        style={[ci.askBar, { backgroundColor: brand.pregnancy, bottom: insets.bottom + 8 }]}
      >
        <Text style={ci.askBarEmoji}>👵</Text>
        <Text style={ci.askBarText}>Ask Grandma anything</Text>
        <ChevronRight size={18} color="#fff" strokeWidth={2.5} />
      </Pressable>
    </View>
  )
}

// ─── Pregnancy Insights Styles ────────────────────────────────────────────────

const ci = StyleSheet.create({
  root: { flex: 1 },
  tabBar: { flexDirection: 'row', paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.08)' },
  tabBtn: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  tabLabel: { fontSize: 12, fontFamily: 'Satoshi-Variable', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  scroll: { padding: 16, gap: 0 },

  greetingCard: { borderRadius: 20, padding: 20, marginBottom: 12, borderWidth: 1 },
  greetingDate: { fontSize: 12, fontFamily: 'Satoshi-Variable', marginBottom: 4 },
  greetingName: { fontSize: 20, fontFamily: 'CabinetGrotesk-Black', marginBottom: 4 },
  greetingWeek: { fontSize: 14, fontFamily: 'Satoshi-Variable', fontWeight: '700' },

  card: { borderRadius: 20, marginBottom: 12, borderWidth: 1, overflow: 'hidden' },
  cardHeader: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 },
  cardEmoji: { fontSize: 22 },
  cardTitle: { fontSize: 15, fontFamily: 'Satoshi-Variable', fontWeight: '700' },
  cardChevron: { fontSize: 12 },
  cardBody: { padding: 16, paddingTop: 12, borderTopWidth: 1, gap: 8 },

  bodyText: { fontSize: 14, fontFamily: 'Satoshi-Variable', lineHeight: 20 },
  bulletText: { fontSize: 13, fontFamily: 'Satoshi-Variable', lineHeight: 20, paddingLeft: 4 },
  affirmationText: { fontSize: 16, fontFamily: 'Satoshi-Variable', fontStyle: 'italic', lineHeight: 24, fontWeight: '500' },

  askCta: { marginTop: 12, paddingVertical: 10, borderRadius: 999, borderWidth: 1, alignItems: 'center' },
  askCtaText: { fontSize: 13, fontFamily: 'Satoshi-Variable', fontWeight: '700' },

  warningCard: { borderRadius: 20, padding: 16, marginBottom: 12, borderWidth: 1, backgroundColor: 'rgba(255,107,53,0.08)' },
  warningTitle: { fontSize: 14, fontFamily: 'Satoshi-Variable', fontWeight: '700', color: '#FF6B35', marginBottom: 8 },
  warningItem: { fontSize: 13, fontFamily: 'Satoshi-Variable', lineHeight: 20 },

  featuredCard: { borderRadius: 20, padding: 20, marginBottom: 12, borderWidth: 1 },
  featuredBadge: { fontSize: 10, fontFamily: 'Satoshi-Variable', fontWeight: '700', letterSpacing: 1, marginBottom: 8 },
  featuredTitle: { fontSize: 17, fontFamily: 'CabinetGrotesk-Black', marginBottom: 8 },
  featuredSummary: { fontSize: 14, fontFamily: 'Satoshi-Variable', lineHeight: 20 },
  featuredMins: { fontSize: 12, fontFamily: 'Satoshi-Variable', marginTop: 6 },

  readMins: { fontSize: 11, fontFamily: 'Satoshi-Variable', marginTop: 6 },

  askBar: { position: 'absolute', left: 20, right: 20, flexDirection: 'row', alignItems: 'center', borderRadius: 999, paddingVertical: 14, paddingHorizontal: 20, gap: 10 },
  askBarEmoji: { fontSize: 20 },
  askBarText: { flex: 1, fontSize: 15, fontFamily: 'Satoshi-Variable', fontWeight: '700', color: '#fff' },
})
```

- [ ] **Step 3: Add pregnancy mode check inside `InsightsScreen()`**

In `components/insights/InsightsScreen.tsx`, find the line near the top of `InsightsScreen()`:
```ts
const mode = useModeStore((s) => s.mode)
```

Right after it (and after `const insets = useSafeAreaInsets()`), add:
```tsx
  // Pregnancy mode has its own content
  if (mode === 'pregnancy') {
    return <PregnancyInsightsContent />
  }
```

This must come before any hooks that would conditionally run (to avoid hooks order issues). Check that `usePregnancyStore` in `PregnancyInsightsContent` is called at the top of that component, not conditionally.

**If hooks order becomes an issue**, move the `PregnancyInsightsContent` check to the render phase instead:
```tsx
  // At the very bottom of InsightsScreen, replace the return with:
  if (mode === 'pregnancy') return <PregnancyInsightsContent />
  return (
    <View ...>
      ...original JSX...
    </View>
  )
```

- [ ] **Step 4: TypeScript check**

```bash
cd /Users/igorcarvalhorodrigues/Projects/grandma-app
npx tsc --noEmit 2>&1 | head -40
```

**Common fix 1:** `getBirthFocusForWeek` may return `null` — the `{birthFocus && ...}` guard handles this.

**Common fix 2:** `upcomingAppt.prep` vs `upcomingAppt.prepNote` — check which field `StandardAppointment` actually uses:
```bash
grep -n "prep" lib/pregnancyAppointments.ts | head -10
```
Use the correct field name.

**Common fix 3:** `getReadsByCategory` returns `PregnancyRead[]` — type the `read` parameter explicitly in `.map((read: PregnancyRead) => ...)` if TypeScript can't infer.

**Common fix 4:** `react-native-reanimated` import was added in Step 1 but never used. Remove that import line if Animated values aren't used.

- [ ] **Step 5: Commit**

```bash
git add components/insights/InsightsScreen.tsx
git commit -m "feat(pregnancy): insights screen with today/birth-guide/reads tabs and expand-collapse cards"
```

---

## Notes for Implementor

**Hooks order rule:** `InsightsScreen` has many hooks before the mode check. The `PregnancyInsightsContent` component approach (early return from `InsightsScreen`) is fine as long as the `mode === 'pregnancy'` check happens after ALL hooks in `InsightsScreen` — not before. If `InsightsScreen` has 10 hooks before the check, the check must come after all 10. The safest pattern is to put the mode check at the **bottom**, just before the return statement.

**`PregnancyRead` type:** Written in Plan 1 `lib/pregnancyReads.ts`. If TypeScript complains about the `read` objects in `renderReads()`, import the type: `import { PregnancyRead } from '../../lib/pregnancyReads'`.

**`BirthFocusCard` type from Plan 1:** The `birthFocus` object returned by `getBirthFocusForWeek` has `emoji`, `title`, `description`, and optionally `tips: string[]`. These match what `renderToday()` expects.

**Profile screen default export:** The file uses `export default function PregnancyProfileScreen()` — Expo Router requires a default export for file-based routes. Do not change this to named export.

**Settings.tsx route cast:** If TypeScript complains about `'/profile/pregnancy'` not being in the typed route list, cast with `as any` — the route will work at runtime once the file exists.
