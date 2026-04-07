/**
 * Kids Profile — list all children, edit/remove each, add new.
 *
 * Expanded fields: sex, blood type, allergies (chips), medications (chips),
 * conditions, dietary restrictions, preferred foods, disliked foods, pediatrician, notes.
 */

import { useState } from 'react'
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  Alert,
  Platform,
  StyleSheet,
} from 'react-native'
import DateTimePicker from '@react-native-community/datetimepicker'
import { router } from 'expo-router'
import {
  ArrowLeft,
  User,
  Plus,
  Pencil,
  Trash2,
  Save,
  X,
  AlertTriangle,
  ThumbsUp,
  ThumbsDown,
  Pill,
  Stethoscope,
  StickyNote,
  Baby,
  Droplet,
  ShieldAlert,
  Search,
} from 'lucide-react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme, brand } from '../../constants/theme'
import { useChildStore } from '../../store/useChildStore'
import { supabase } from '../../lib/supabase'
import { LogSheet } from '../../components/calendar/LogSheet'
import type { ChildWithRole } from '../../types'

// ─── Constants ────────────────────────────────────────────────────────────

const SEX_OPTIONS = [
  { value: 'male', label: 'Boy' },
  { value: 'female', label: 'Girl' },
  { value: 'other', label: 'Other' },
]

const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']

const COMMON_CHILD_ALLERGIES = [
  'Milk', 'Eggs', 'Peanuts', 'Tree nuts', 'Wheat', 'Soy', 'Fish',
  'Shellfish', 'Sesame', 'Gluten', 'Lactose', 'Corn', 'Strawberry',
  'Banana', 'Kiwi', 'Citrus', 'Tomato', 'Chocolate', 'Honey',
  'Penicillin', 'Amoxicillin', 'Ibuprofen', 'Latex', 'Dust mites',
  'Pet dander', 'Pollen', 'Mold', 'Bee stings', 'Fragrance',
]

const COMMON_MEDICATIONS = [
  'Tylenol (Acetaminophen)', 'Ibuprofen (Advil)', 'Amoxicillin',
  'Cetirizine (Zyrtec)', 'Loratadine (Claritin)', 'Diphenhydramine (Benadryl)',
  'Albuterol inhaler', 'Prednisolone', 'Omeprazole', 'Montelukast (Singulair)',
  'Fluticasone nasal spray', 'Hydrocortisone cream', 'Vitamin D drops',
  'Iron supplement', 'Probiotics', 'Melatonin',
]

// ─── Helpers ──────────────────────────────────────────────────────────────

function formatAge(birthDate: string): string {
  if (!birthDate) return ''
  const born = new Date(birthDate)
  const now = new Date()
  const months = (now.getFullYear() - born.getFullYear()) * 12 + (now.getMonth() - born.getMonth())
  if (months < 1) return 'Newborn'
  if (months < 12) return `${months} months`
  const y = Math.floor(months / 12)
  const m = months % 12
  return m > 0 ? `${y}y ${m}m` : `${y} year${y > 1 ? 's' : ''}`
}

function mapDbChild(c: any): ChildWithRole {
  return {
    id: c.id,
    parentId: c.parent_id,
    name: c.name,
    birthDate: c.birth_date ?? '',
    weightKg: c.weight_kg ?? 0,
    heightCm: c.height_cm ?? 0,
    sex: c.sex ?? '',
    bloodType: c.blood_type ?? '',
    allergies: c.allergies ?? [],
    medications: c.medications ?? [],
    conditions: c.conditions ?? [],
    dietaryRestrictions: c.dietary_restrictions ?? [],
    preferredFoods: c.preferred_foods ?? [],
    dislikedFoods: c.disliked_foods ?? [],
    pediatrician: c.pediatrician ?? null,
    notes: c.notes ?? '',
    countryCode: c.country_code ?? 'US',
    caregiverRole: 'parent',
    permissions: { view: true, log_activity: true, chat: true },
  }
}

// ─── Main Screen ──────────────────────────────────────────────────────────

export default function KidsProfileScreen() {
  const { colors, radius } = useTheme()
  const insets = useSafeAreaInsets()
  const children = useChildStore((s) => s.children)
  const setChildren = useChildStore((s) => s.setChildren)

  const [editingChild, setEditingChild] = useState<ChildWithRole | null>(null)
  const [showAddSheet, setShowAddSheet] = useState(false)

  async function handleDelete(child: ChildWithRole) {
    Alert.alert(
      `Remove ${child.name}?`,
      'This will remove this child profile and all associated logs. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await supabase.from('children').delete().eq('id', child.id)
              setChildren(children.filter((c) => c.id !== child.id))
            } catch (e: any) {
              Alert.alert('Error', e.message)
            }
          },
        },
      ]
    )
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={() => router.back()} style={styles.headerBtn}>
          <ArrowLeft size={24} color={colors.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Kids Profile</Text>
        <Pressable onPress={() => setShowAddSheet(true)} style={styles.headerBtn}>
          <Plus size={22} color={colors.primary} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {children.length === 0 && (
          <View style={[styles.emptyCard, { backgroundColor: colors.surface, borderRadius: radius.xl }]}>
            <Baby size={36} color={colors.textMuted} strokeWidth={1.5} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No children added</Text>
            <Text style={[styles.emptyBody, { color: colors.textSecondary }]}>
              Add your children to start tracking their health, food preferences, and growth.
            </Text>
          </View>
        )}

        {children.map((child) => (
          <ChildCard
            key={child.id}
            child={child}
            onEdit={() => setEditingChild(child)}
            onDelete={() => handleDelete(child)}
          />
        ))}

        <Pressable
          onPress={() => setShowAddSheet(true)}
          style={({ pressed }) => [
            styles.addBtn,
            { backgroundColor: colors.primary, borderRadius: radius.lg },
            pressed && { opacity: 0.9 },
          ]}
        >
          <Plus size={20} color="#FFFFFF" strokeWidth={2} />
          <Text style={styles.addBtnText}>Add a Child</Text>
        </Pressable>
      </ScrollView>

      {editingChild && (
        <EditChildSheet
          child={editingChild}
          onClose={() => setEditingChild(null)}
          onSaved={(updated) => {
            setChildren(children.map((c) => (c.id === updated.id ? updated : c)))
            setEditingChild(null)
          }}
        />
      )}

      <AddChildSheet
        visible={showAddSheet}
        onClose={() => setShowAddSheet(false)}
        onAdded={(newChild) => {
          setChildren([...children, newChild])
          setShowAddSheet(false)
        }}
      />
    </View>
  )
}

// ─── Child Card (Compact) ─────────────────────────────────────────────────

function ChildCard({ child, onEdit, onDelete }: { child: ChildWithRole; onEdit: () => void; onDelete: () => void }) {
  const { colors, radius } = useTheme()

  // Collect summary tags: max 6 visible, inline
  const tags: { label: string; color: string }[] = []
  if (child.bloodType) tags.push({ label: child.bloodType, color: brand.error })
  child.allergies.forEach((a) => tags.push({ label: a, color: brand.error }))
  child.conditions.forEach((c) => tags.push({ label: c, color: brand.warning }))
  child.medications.forEach((m) => tags.push({ label: m, color: brand.secondary }))
  child.dietaryRestrictions.forEach((r) => tags.push({ label: r, color: brand.accent }))
  const uniqueTags = tags.filter((t, i, arr) => arr.findIndex((x) => x.label === t.label) === i)
  const visibleTags = uniqueTags.slice(0, 5)
  const extraCount = uniqueTags.length - visibleTags.length

  // Food summary
  const foodParts: string[] = []
  if (child.preferredFoods.length > 0) foodParts.push(`Loves: ${child.preferredFoods.slice(0, 3).join(', ')}`)
  if (child.dislikedFoods.length > 0) foodParts.push(`Avoids: ${child.dislikedFoods.slice(0, 3).join(', ')}`)
  const foodSummary = foodParts.join(' · ')

  return (
    <Pressable
      onPress={onEdit}
      onLongPress={onDelete}
      delayLongPress={600}
      style={({ pressed }) => [
        styles.childCard,
        { backgroundColor: colors.surface, borderRadius: radius.xl },
        pressed && { opacity: 0.85 },
      ]}
    >
      {/* Row 1: Avatar + Name + Age + Edit arrow */}
      <View style={styles.childHeader}>
        <View style={[styles.childAvatar, { backgroundColor: child.sex === 'male' ? '#4D96FF15' : child.sex === 'female' ? '#FF8AD815' : colors.surfaceRaised }]}>
          <User size={22} color={child.sex === 'male' ? '#4D96FF' : child.sex === 'female' ? '#FF8AD8' : colors.textMuted} strokeWidth={1.5} />
        </View>
        <View style={styles.childInfo}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={[styles.childName, { color: colors.text }]}>{child.name}</Text>
            {child.sex ? (
              <View style={[styles.sexBadge, { backgroundColor: child.sex === 'male' ? '#4D96FF20' : child.sex === 'female' ? '#FF8AD820' : '#9B70D420' }]}>
                <Text style={[styles.sexBadgeText, { color: child.sex === 'male' ? '#4D96FF' : child.sex === 'female' ? '#FF8AD8' : '#9B70D4' }]}>
                  {child.sex === 'male' ? 'Boy' : child.sex === 'female' ? 'Girl' : 'Other'}
                </Text>
              </View>
            ) : null}
          </View>
          <Text style={[styles.childAge, { color: colors.textSecondary }]} numberOfLines={1}>
            {child.birthDate ? `${formatAge(child.birthDate)} — Born ${new Date(child.birthDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}` : 'No birth date set'}
          </Text>
        </View>
        <View style={styles.cardActions}>
          <Pressable onPress={onEdit} hitSlop={8}>
            <Pencil size={16} color={colors.primary} strokeWidth={2} />
          </Pressable>
          <Pressable onPress={onDelete} hitSlop={8}>
            <Trash2 size={15} color={colors.textMuted} strokeWidth={2} />
          </Pressable>
        </View>
      </View>

      {/* Row 2: Inline tags (allergies, blood type, conditions, meds) */}
      {visibleTags.length > 0 && (
        <View style={styles.tagRow}>
          {visibleTags.map((t, i) => (
            <View key={`${t.label}-${i}`} style={[styles.miniChip, { backgroundColor: t.color + '12' }]}>
              <Text style={[styles.miniChipText, { color: t.color }]}>{t.label}</Text>
            </View>
          ))}
          {extraCount > 0 && (
            <View style={[styles.miniChip, { backgroundColor: colors.surfaceRaised }]}>
              <Text style={[styles.miniChipText, { color: colors.textSecondary }]}>+{extraCount}</Text>
            </View>
          )}
        </View>
      )}

      {/* Row 3: Food summary (one line) */}
      {foodSummary ? (
        <Text style={[styles.foodLine, { color: colors.textSecondary }]} numberOfLines={1}>
          {foodSummary}
        </Text>
      ) : null}

      {/* Row 4: Pediatrician (one line) */}
      {child.pediatrician?.name ? (
        <View style={styles.pedRow}>
          <Stethoscope size={12} color={colors.textMuted} strokeWidth={2} />
          <Text style={[styles.pedText, { color: colors.textMuted }]} numberOfLines={1}>
            {child.pediatrician.name}{child.pediatrician.phone ? ` · ${child.pediatrician.phone}` : ''}
          </Text>
        </View>
      ) : null}
    </Pressable>
  )
}

// ─── Autocomplete Chip Input ──────────────────────────────────────────────

function ChipInput({ label, value, onChange, suggestions, chipColor, placeholder }: {
  label: string
  value: string[]
  onChange: (v: string[]) => void
  suggestions: string[]
  chipColor: string
  placeholder: string
}) {
  const { colors, radius } = useTheme()
  const [query, setQuery] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)

  const filtered = query.length >= 1
    ? suggestions.filter((s) => s.toLowerCase().includes(query.toLowerCase()) && !value.includes(s)).slice(0, 6)
    : []

  function add(item: string) {
    if (!value.includes(item)) onChange([...value, item])
    setQuery('')
    setShowSuggestions(false)
  }

  function remove(item: string) {
    onChange(value.filter((v) => v !== item))
  }

  function handleSubmit() {
    const trimmed = query.trim()
    if (trimmed && !value.includes(trimmed)) onChange([...value, trimmed])
    setQuery('')
    setShowSuggestions(false)
  }

  return (
    <View style={formStyles.field}>
      <Text style={[formStyles.label, { color: colors.textSecondary }]}>{label.toUpperCase()}</Text>

      {value.length > 0 && (
        <View style={formStyles.chipRow}>
          {value.map((item) => (
            <View key={item} style={[formStyles.chipTag, { backgroundColor: chipColor + '15', borderRadius: radius.full }]}>
              <Text style={[formStyles.chipTagText, { color: chipColor }]}>{item}</Text>
              <Pressable onPress={() => remove(item)} hitSlop={6}>
                <X size={13} color={chipColor} strokeWidth={2.5} />
              </Pressable>
            </View>
          ))}
        </View>
      )}

      <View style={[formStyles.inputRow, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg }]}>
        <Search size={16} color={colors.textMuted} strokeWidth={2} />
        <TextInput
          value={query}
          onChangeText={(t) => { setQuery(t); setShowSuggestions(t.length >= 1) }}
          placeholder={placeholder}
          placeholderTextColor={colors.textMuted}
          style={[formStyles.inputInner, { color: colors.text }]}
          onSubmitEditing={handleSubmit}
          returnKeyType="done"
          onFocus={() => { if (query.length >= 1) setShowSuggestions(true) }}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
        />
      </View>

      {showSuggestions && query.trim().length > 0 && (
        <View style={[formStyles.dropdown, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg }]}>
          {filtered.map((s) => (
            <Pressable key={s} onPress={() => add(s)} style={({ pressed }) => [formStyles.dropdownItem, pressed && { backgroundColor: colors.surfaceRaised }]}>
              <Text style={[formStyles.dropdownText, { color: colors.text }]}>{s}</Text>
            </Pressable>
          ))}
          {!value.includes(query.trim()) && !suggestions.some((s) => s.toLowerCase() === query.trim().toLowerCase() && value.includes(s)) && (
            <Pressable
              onPress={handleSubmit}
              style={({ pressed }) => [formStyles.dropdownItem, filtered.length > 0 && { borderTopWidth: 1, borderTopColor: colors.border }, pressed && { backgroundColor: colors.surfaceRaised }]}
            >
              <Text style={[formStyles.dropdownText, { color: colors.primary, fontWeight: '600' }]}>
                + Add &quot;{query.trim()}&quot;
              </Text>
            </Pressable>
          )}
        </View>
      )}
    </View>
  )
}

// ─── Edit Child Sheet ─────────────────────────────────────────────────────

function EditChildSheet({
  child,
  onClose,
  onSaved,
}: {
  child: ChildWithRole
  onClose: () => void
  onSaved: (updated: ChildWithRole) => void
}) {
  const { colors, radius } = useTheme()

  const [name, setName] = useState(child.name)
  const [birthDate, setBirthDate] = useState(child.birthDate)
  const [sex, setSex] = useState(child.sex)
  const [bloodType, setBloodType] = useState(child.bloodType)
  const [allergies, setAllergies] = useState<string[]>(child.allergies)
  const [medications, setMedications] = useState<string[]>(child.medications)
  const [conditions, setConditions] = useState(child.conditions.join(', '))
  const [dietaryRestrictions, setDietaryRestrictions] = useState(child.dietaryRestrictions.join(', '))
  const [preferredFoods, setPreferredFoods] = useState(child.preferredFoods.join(', '))
  const [dislikedFoods, setDislikedFoods] = useState(child.dislikedFoods.join(', '))
  const [pedName, setPedName] = useState(child.pediatrician?.name ?? '')
  const [pedPhone, setPedPhone] = useState(child.pediatrician?.phone ?? '')
  const [pedClinic, setPedClinic] = useState(child.pediatrician?.clinic ?? '')
  const [notes, setNotes] = useState(child.notes)
  const [showDatePicker, setShowDatePicker] = useState(Platform.OS === 'ios')
  const [saving, setSaving] = useState(false)

  function splitList(s: string): string[] {
    return [...new Set(s ? s.split(',').map((a) => a.trim()).filter(Boolean) : [])]
  }

  async function handleSave() {
    if (!name.trim()) return Alert.alert('Name required')
    setSaving(true)
    try {
      const pediatrician = pedName.trim() ? { name: pedName.trim(), phone: pedPhone.trim(), clinic: pedClinic.trim() } : null

      const { error } = await supabase.from('children').update({
        name: name.trim(),
        birth_date: birthDate || null,
        sex: sex || null,
        blood_type: bloodType || null,
        allergies,
        medications,
        conditions: splitList(conditions),
        dietary_restrictions: splitList(dietaryRestrictions),
        preferred_foods: splitList(preferredFoods),
        disliked_foods: splitList(dislikedFoods),
        pediatrician,
        notes: notes.trim() || null,
      }).eq('id', child.id)

      if (error) throw error

      onSaved({
        ...child,
        name: name.trim(),
        birthDate: birthDate ?? '',
        sex,
        bloodType,
        allergies,
        medications,
        conditions: splitList(conditions),
        dietaryRestrictions: splitList(dietaryRestrictions),
        preferredFoods: splitList(preferredFoods),
        dislikedFoods: splitList(dislikedFoods),
        pediatrician,
        notes: notes.trim(),
      })
    } catch (e: any) {
      Alert.alert('Error', e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <LogSheet visible title={`Edit ${child.name}`} onClose={onClose}>
      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={formStyles.form}>
          <SectionHeader label="Basic Info" />
          <FormField label="Name" value={name} onChangeText={setName} placeholder="Child name" />

          <Text style={[formStyles.label, { color: colors.textSecondary }]}>SEX</Text>
          <View style={formStyles.optionRow}>
            {SEX_OPTIONS.map((opt) => (
              <Pressable
                key={opt.value}
                onPress={() => setSex(sex === opt.value ? '' : opt.value)}
                style={[formStyles.optionBtn, { backgroundColor: sex === opt.value ? colors.primary + '15' : colors.surface, borderColor: sex === opt.value ? colors.primary : colors.border, borderRadius: radius.lg }]}
              >
                <Text style={[formStyles.optionText, { color: sex === opt.value ? colors.primary : colors.text }]}>{opt.label}</Text>
              </Pressable>
            ))}
          </View>

          <Text style={[formStyles.label, { color: colors.textSecondary }]}>BIRTH DATE</Text>
          {Platform.OS === 'android' && !showDatePicker && (
            <Pressable
              onPress={() => setShowDatePicker(true)}
              style={[formStyles.dateBtn, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg }]}
            >
              <Text style={[formStyles.dateText, { color: birthDate ? colors.text : colors.textMuted }]}>
                {birthDate ? new Date(birthDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : 'Select date'}
              </Text>
            </Pressable>
          )}
          {showDatePicker && (
            <DateTimePicker
              value={birthDate ? new Date(birthDate) : new Date()}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              maximumDate={new Date()}
              minimumDate={new Date(2005, 0, 1)}
              themeVariant="light"
              onChange={(_, d) => {
                if (Platform.OS === 'android') setShowDatePicker(false)
                if (d) setBirthDate(d.toISOString().split('T')[0])
              }}
            />
          )}

          <Text style={[formStyles.label, { color: colors.textSecondary }]}>BLOOD TYPE</Text>
          <View style={formStyles.optionRow}>
            {BLOOD_TYPES.map((bt) => (
              <Pressable
                key={bt}
                onPress={() => setBloodType(bloodType === bt ? '' : bt)}
                style={[formStyles.bloodBtn, { backgroundColor: bloodType === bt ? brand.error + '15' : colors.surface, borderColor: bloodType === bt ? brand.error : colors.border, borderRadius: radius.md }]}
              >
                <Text style={[formStyles.bloodText, { color: bloodType === bt ? brand.error : colors.text }]}>{bt}</Text>
              </Pressable>
            ))}
          </View>

          {/* Health — chips with autocomplete */}
          <SectionHeader label="Health & Medical" />
          <ChipInput label="Allergies" value={allergies} onChange={setAllergies} suggestions={COMMON_CHILD_ALLERGIES} chipColor={brand.error} placeholder="Search allergies..." />
          <ChipInput label="Medications" value={medications} onChange={setMedications} suggestions={COMMON_MEDICATIONS} chipColor={brand.secondary} placeholder="Search medications..." />
          <FormField label="Conditions" value={conditions} onChangeText={setConditions} placeholder="e.g. Asthma, Eczema" hint="Comma-separated" />

          {/* Food */}
          <SectionHeader label="Food Preferences" />
          <FormField label="Preferred Foods" value={preferredFoods} onChangeText={setPreferredFoods} placeholder="e.g. Banana, Rice, Chicken nuggets" hint="Things they love eating" />
          <FormField label="Disliked Foods" value={dislikedFoods} onChangeText={setDislikedFoods} placeholder="e.g. Broccoli, Spinach, Fish" hint="Things they refuse or avoid" />
          <FormField label="Dietary Restrictions" value={dietaryRestrictions} onChangeText={setDietaryRestrictions} placeholder="e.g. Gluten-free, No pork" hint="Comma-separated" />

          {/* Pediatrician */}
          <SectionHeader label="Pediatrician" />
          <FormField label="Doctor Name" value={pedName} onChangeText={setPedName} placeholder="Dr. Smith" />
          <FormField label="Phone" value={pedPhone} onChangeText={setPedPhone} placeholder="+1 555-0100" keyboardType="phone-pad" />
          <FormField label="Clinic" value={pedClinic} onChangeText={setPedClinic} placeholder="Children's Hospital" />

          {/* Notes */}
          <SectionHeader label="Additional Notes" />
          <FormField label="Notes" value={notes} onChangeText={setNotes} placeholder="Any important information..." multiline />

          <Pressable
            onPress={handleSave}
            disabled={saving}
            style={({ pressed }) => [formStyles.saveBtn, { backgroundColor: colors.primary, borderRadius: radius.lg, opacity: saving ? 0.6 : 1 }, pressed && { transform: [{ scale: 0.98 }] }]}
          >
            <Save size={18} color="#FFFFFF" strokeWidth={2} />
            <Text style={formStyles.saveBtnText}>{saving ? 'Saving...' : 'Save Changes'}</Text>
          </Pressable>
        </View>
      </ScrollView>
    </LogSheet>
  )
}

// ─── Add Child Sheet ──────────────────────────────────────────────────────

function AddChildSheet({
  visible,
  onClose,
  onAdded,
}: {
  visible: boolean
  onClose: () => void
  onAdded: (child: ChildWithRole) => void
}) {
  const { colors, radius } = useTheme()

  const [name, setName] = useState('')
  const [birthDate, setBirthDate] = useState<string | null>(null)
  const [sex, setSex] = useState('')
  const [bloodType, setBloodType] = useState('')
  const [allergies, setAllergies] = useState<string[]>([])
  const [medications, setMedications] = useState<string[]>([])
  const [conditions, setConditions] = useState('')
  const [dietaryRestrictions, setDietaryRestrictions] = useState('')
  const [preferredFoods, setPreferredFoods] = useState('')
  const [dislikedFoods, setDislikedFoods] = useState('')
  const [pedName, setPedName] = useState('')
  const [pedPhone, setPedPhone] = useState('')
  const [pedClinic, setPedClinic] = useState('')
  const [notes, setNotes] = useState('')
  const [showDatePicker, setShowDatePicker] = useState(Platform.OS === 'ios')
  const [saving, setSaving] = useState(false)

  function splitList(s: string): string[] {
    return [...new Set(s ? s.split(',').map((a) => a.trim()).filter(Boolean) : [])]
  }

  function reset() {
    setName(''); setBirthDate(null); setSex(''); setBloodType('')
    setAllergies([]); setMedications([]); setConditions('')
    setDietaryRestrictions(''); setPreferredFoods(''); setDislikedFoods('')
    setPedName(''); setPedPhone(''); setPedClinic(''); setNotes('')
  }

  async function handleSave() {
    if (!name.trim()) return Alert.alert('Name required')
    setSaving(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Not authenticated')

      const pediatrician = pedName.trim() ? { name: pedName.trim(), phone: pedPhone.trim(), clinic: pedClinic.trim() } : null

      const { data, error } = await supabase.from('children').insert({
        parent_id: session.user.id,
        name: name.trim(),
        birth_date: birthDate,
        sex: sex || null,
        blood_type: bloodType || null,
        allergies,
        medications,
        conditions: splitList(conditions),
        dietary_restrictions: splitList(dietaryRestrictions),
        preferred_foods: splitList(preferredFoods),
        disliked_foods: splitList(dislikedFoods),
        pediatrician,
        notes: notes.trim() || null,
      }).select().single()

      if (error) throw error

      const newChild = mapDbChild(data)
      reset()
      onAdded(newChild)
    } catch (e: any) {
      Alert.alert('Error', e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <LogSheet visible={visible} title="Add a Child" onClose={() => { reset(); onClose() }}>
      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={formStyles.form}>
          <SectionHeader label="Basic Info" />
          <FormField label="Name" value={name} onChangeText={setName} placeholder="Child's name" />

          <Text style={[formStyles.label, { color: colors.textSecondary }]}>SEX</Text>
          <View style={formStyles.optionRow}>
            {SEX_OPTIONS.map((opt) => (
              <Pressable
                key={opt.value}
                onPress={() => setSex(sex === opt.value ? '' : opt.value)}
                style={[formStyles.optionBtn, { backgroundColor: sex === opt.value ? colors.primary + '15' : colors.surface, borderColor: sex === opt.value ? colors.primary : colors.border, borderRadius: radius.lg }]}
              >
                <Text style={[formStyles.optionText, { color: sex === opt.value ? colors.primary : colors.text }]}>{opt.label}</Text>
              </Pressable>
            ))}
          </View>

          <Text style={[formStyles.label, { color: colors.textSecondary }]}>BIRTH DATE</Text>
          {Platform.OS === 'android' && !showDatePicker && (
            <Pressable
              onPress={() => setShowDatePicker(true)}
              style={[formStyles.dateBtn, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg }]}
            >
              <Text style={[formStyles.dateText, { color: birthDate ? colors.text : colors.textMuted }]}>
                {birthDate ? new Date(birthDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : 'Select date'}
              </Text>
            </Pressable>
          )}
          {showDatePicker && (
            <DateTimePicker
              value={birthDate ? new Date(birthDate) : new Date()}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              maximumDate={new Date()}
              minimumDate={new Date(2005, 0, 1)}
              themeVariant="light"
              onChange={(_, d) => {
                if (Platform.OS === 'android') setShowDatePicker(false)
                if (d) setBirthDate(d.toISOString().split('T')[0])
              }}
            />
          )}

          <Text style={[formStyles.label, { color: colors.textSecondary }]}>BLOOD TYPE</Text>
          <View style={formStyles.optionRow}>
            {BLOOD_TYPES.map((bt) => (
              <Pressable
                key={bt}
                onPress={() => setBloodType(bloodType === bt ? '' : bt)}
                style={[formStyles.bloodBtn, { backgroundColor: bloodType === bt ? brand.error + '15' : colors.surface, borderColor: bloodType === bt ? brand.error : colors.border, borderRadius: radius.md }]}
              >
                <Text style={[formStyles.bloodText, { color: bloodType === bt ? brand.error : colors.text }]}>{bt}</Text>
              </Pressable>
            ))}
          </View>

          <SectionHeader label="Health & Medical" />
          <ChipInput label="Allergies" value={allergies} onChange={setAllergies} suggestions={COMMON_CHILD_ALLERGIES} chipColor={brand.error} placeholder="Search allergies..." />
          <ChipInput label="Medications" value={medications} onChange={setMedications} suggestions={COMMON_MEDICATIONS} chipColor={brand.secondary} placeholder="Search medications..." />
          <FormField label="Conditions" value={conditions} onChangeText={setConditions} placeholder="e.g. Asthma, Eczema" hint="Comma-separated" />

          <SectionHeader label="Food Preferences" />
          <FormField label="Preferred Foods" value={preferredFoods} onChangeText={setPreferredFoods} placeholder="e.g. Banana, Rice, Chicken nuggets" hint="Things they love eating" />
          <FormField label="Disliked Foods" value={dislikedFoods} onChangeText={setDislikedFoods} placeholder="e.g. Broccoli, Spinach, Fish" hint="Things they refuse or avoid" />
          <FormField label="Dietary Restrictions" value={dietaryRestrictions} onChangeText={setDietaryRestrictions} placeholder="e.g. Gluten-free, No pork" hint="Comma-separated" />

          <SectionHeader label="Pediatrician" />
          <FormField label="Doctor Name" value={pedName} onChangeText={setPedName} placeholder="Dr. Smith" />
          <FormField label="Phone" value={pedPhone} onChangeText={setPedPhone} placeholder="+1 555-0100" keyboardType="phone-pad" />
          <FormField label="Clinic" value={pedClinic} onChangeText={setPedClinic} placeholder="Children's Hospital" />

          <SectionHeader label="Additional Notes" />
          <FormField label="Notes" value={notes} onChangeText={setNotes} placeholder="Any important information..." multiline />

          <Pressable
            onPress={handleSave}
            disabled={saving || !name.trim()}
            style={({ pressed }) => [formStyles.saveBtn, { backgroundColor: colors.primary, borderRadius: radius.lg, opacity: saving || !name.trim() ? 0.4 : 1 }, pressed && { transform: [{ scale: 0.98 }] }]}
          >
            <Plus size={18} color="#FFFFFF" strokeWidth={2} />
            <Text style={formStyles.saveBtnText}>{saving ? 'Adding...' : 'Add Child'}</Text>
          </Pressable>
        </View>
      </ScrollView>
    </LogSheet>
  )
}

// ─── Section Header ───────────────────────────────────────────────────────

function SectionHeader({ label }: { label: string }) {
  const { colors } = useTheme()
  return (
    <View style={formStyles.sectionHeader}>
      <View style={[formStyles.sectionLine, { backgroundColor: colors.border }]} />
      <Text style={[formStyles.sectionLabel, { color: colors.textMuted }]}>{label}</Text>
      <View style={[formStyles.sectionLine, { backgroundColor: colors.border }]} />
    </View>
  )
}

// ─── Form Field ───────────────────────────────────────────────────────────

function FormField({ label, value, onChangeText, placeholder, multiline, hint, keyboardType }: {
  label: string; value: string; onChangeText: (t: string) => void; placeholder: string; multiline?: boolean; hint?: string; keyboardType?: any
}) {
  const { colors, radius } = useTheme()
  return (
    <View style={formStyles.field}>
      <Text style={[formStyles.label, { color: colors.textSecondary }]}>{label.toUpperCase()}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        multiline={multiline}
        keyboardType={keyboardType}
        style={[
          formStyles.input,
          { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg },
          multiline && { height: 80, textAlignVertical: 'top', paddingTop: 12 },
        ]}
      />
      {hint && <Text style={[formStyles.hint, { color: colors.textMuted }]}>{hint}</Text>}
    </View>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 12 },
  headerBtn: { width: 40, alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  scroll: { paddingHorizontal: 20, paddingBottom: 40, gap: 16 },

  emptyCard: { alignItems: 'center', padding: 32, gap: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  emptyTitle: { fontSize: 18, fontWeight: '700' },
  emptyBody: { fontSize: 14, fontWeight: '500', textAlign: 'center', lineHeight: 20 },

  childCard: { padding: 14, gap: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  childHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  childAvatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  childInfo: { flex: 1, gap: 1 },
  childName: { fontSize: 16, fontWeight: '700' },
  childAge: { fontSize: 13, fontWeight: '500' },
  sexBadge: { paddingHorizontal: 6, paddingVertical: 1, borderRadius: 8 },
  sexBadgeText: { fontSize: 10, fontWeight: '700' },
  cardActions: { flexDirection: 'row', alignItems: 'center', gap: 14 },

  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 5 },
  miniChip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  miniChipText: { fontSize: 11, fontWeight: '600' },

  foodLine: { fontSize: 12, fontWeight: '500' },
  pedRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  pedText: { fontSize: 12, fontWeight: '500', flex: 1 },

  addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 52, marginTop: 4 },
  addBtnText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
})

const formStyles = StyleSheet.create({
  form: { gap: 12, paddingBottom: 8 },
  field: { gap: 4 },
  label: { fontSize: 12, fontWeight: '700', letterSpacing: 0.5 },
  hint: { fontSize: 11, fontWeight: '500', marginTop: 2 },
  input: { borderWidth: 1, paddingHorizontal: 16, height: 48, fontSize: 15, fontWeight: '500' },
  dateBtn: { paddingVertical: 14, paddingHorizontal: 16, borderWidth: 1 },
  dateText: { fontSize: 15, fontWeight: '500' },

  optionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  optionBtn: { paddingVertical: 10, paddingHorizontal: 16, borderWidth: 1 },
  optionText: { fontSize: 14, fontWeight: '600' },
  bloodBtn: { paddingVertical: 8, paddingHorizontal: 12, borderWidth: 1 },
  bloodText: { fontSize: 13, fontWeight: '600' },

  // Chip input
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 2 },
  chipTag: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 5, paddingLeft: 10, paddingRight: 7 },
  chipTagText: { fontSize: 12, fontWeight: '600' },
  inputRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, paddingHorizontal: 12, height: 44, gap: 8 },
  inputInner: { flex: 1, fontSize: 14, fontWeight: '500', paddingVertical: 0 },
  dropdown: { borderWidth: 1, marginTop: 4, overflow: 'hidden', maxHeight: 200 },
  dropdownItem: { paddingVertical: 10, paddingHorizontal: 14 },
  dropdownText: { fontSize: 14, fontWeight: '500' },

  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8 },
  sectionLine: { flex: 1, height: 1 },
  sectionLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase' },

  saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 52, marginTop: 8 },
  saveBtnText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
})
