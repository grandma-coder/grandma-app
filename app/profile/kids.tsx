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
import { Ionicons } from '@expo/vector-icons'
import {
  Pencil,
  Trash2,
  Stethoscope,
  Search,
} from 'lucide-react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme, brand } from '../../constants/theme'
import { useChildStore } from '../../store/useChildStore'
import { supabase } from '../../lib/supabase'
import { LogSheet } from '../../components/calendar/LogSheet'
import { ScreenHeader } from '../../components/ui/ScreenHeader'
import { PillButton } from '../../components/ui/PillButton'
import { Display, MonoCaps, Body } from '../../components/ui/Typography'
import {
  Flower as FlowerSticker,
  Heart as HeartSticker,
  Star as StarSticker,
  Cross as CrossSticker,
  Drop as DropSticker,
  Squishy,
} from '../../components/ui/Stickers'
import type { ChildWithRole } from '../../types'

// ─── Constants ────────────────────────────────────────────────────────────

const SEX_OPTIONS = [
  { value: 'male', label: 'Boy' },
  { value: 'female', label: 'Girl' },
  { value: 'other', label: 'Other' },
]

const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']

const COUNTRY_OPTIONS = [
  { code: 'US', flag: '🇺🇸', name: 'United States' },
  { code: 'BR', flag: '🇧🇷', name: 'Brazil' },
  { code: 'GB', flag: '🇬🇧', name: 'United Kingdom' },
  { code: 'AU', flag: '🇦🇺', name: 'Australia' },
  { code: 'CA', flag: '🇨🇦', name: 'Canada' },
  { code: 'PT', flag: '🇵🇹', name: 'Portugal' },
  { code: 'DE', flag: '🇩🇪', name: 'Germany' },
  { code: 'FR', flag: '🇫🇷', name: 'France' },
  { code: 'MX', flag: '🇲🇽', name: 'Mexico' },
  { code: 'AR', flag: '🇦🇷', name: 'Argentina' },
  { code: 'IN', flag: '🇮🇳', name: 'India' },
]

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
  const { colors, isDark, stickers } = useTheme()
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
      <View style={[styles.headerWrap, { paddingTop: insets.top + 8 }]}>
        <ScreenHeader
          title="Kids Profile"
          right={
            <Pressable onPress={() => setShowAddSheet(true)} hitSlop={10}>
              <View
                style={[
                  styles.headerAddBtn,
                  {
                    backgroundColor: isDark ? colors.surface : '#FFFEF8',
                    borderColor: isDark ? colors.border : 'rgba(20,19,19,0.08)',
                  },
                ]}
              >
                <Ionicons name="add" size={20} color={colors.text} />
              </View>
            </Pressable>
          }
        />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {children.length === 0 && (
          <View style={[styles.emptyCard, { backgroundColor: colors.surface }]}>
            <FlowerSticker size={64} petal={stickers.pink} center={stickers.yellow} />
            <Display size={20} align="center" color={colors.text}>
              No children added
            </Display>
            <Body size={14} align="center" color={colors.textSecondary}>
              Add your children to start tracking their health, food preferences, and growth.
            </Body>
          </View>
        )}

        {children.map((child, i) => (
          <ChildCard
            key={child.id}
            child={child}
            index={i}
            onEdit={() => setEditingChild(child)}
            onDelete={() => handleDelete(child)}
          />
        ))}

        <PillButton
          label="Add a Child"
          variant="ink"
          onPress={() => setShowAddSheet(true)}
          leading={<Ionicons name="add" size={18} color={isDark ? '#1A1713' : '#F3ECD9'} />}
          style={{ marginTop: 8 }}
        />
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

const KID_COLORS = ['#9DC3E8', '#F2B2C7', '#BDD48C', '#C8B6E8', '#F5D652', '#F5B896']

function ChildCard({ child, index, onEdit, onDelete }: { child: ChildWithRole; index: number; onEdit: () => void; onDelete: () => void }) {
  const { colors, font, stickers, isDark } = useTheme()
  const accent = KID_COLORS[index % KID_COLORS.length]

  // Collect summary tags
  const tags: { label: string; color: string }[] = []
  if (child.bloodType) tags.push({ label: child.bloodType, color: stickers.coral })
  child.allergies.forEach((a) => tags.push({ label: a, color: stickers.coral }))
  child.conditions.forEach((c) => tags.push({ label: c, color: '#E8A435' }))
  child.medications.forEach((m) => tags.push({ label: m, color: stickers.blue }))
  child.dietaryRestrictions.forEach((r) => tags.push({ label: r, color: '#E8A435' }))
  const uniqueTags = tags.filter((t, i, arr) => arr.findIndex((x) => x.label === t.label) === i)
  const visibleTags = uniqueTags.slice(0, 5)
  const extraCount = uniqueTags.length - visibleTags.length

  // Food summary
  const foodParts: string[] = []
  if (child.preferredFoods.length > 0) foodParts.push(`Loves: ${child.preferredFoods.slice(0, 3).join(', ')}`)
  if (child.dislikedFoods.length > 0) foodParts.push(`Avoids: ${child.dislikedFoods.slice(0, 3).join(', ')}`)
  const foodSummary = foodParts.join(' · ')

  const sexLabel = child.sex === 'male' ? 'Boy' : child.sex === 'female' ? 'Girl' : 'Other'
  const sexColor = child.sex === 'male' ? stickers.blue : child.sex === 'female' ? stickers.pink : stickers.lilac

  return (
    <Pressable
      onPress={onEdit}
      onLongPress={onDelete}
      delayLongPress={600}
      style={({ pressed }) => [
        styles.childCard,
        {
          backgroundColor: isDark ? colors.surface : '#FFFEF8',
          borderColor: isDark ? colors.border : 'rgba(20,19,19,0.08)',
        },
        pressed && { opacity: 0.9 },
      ]}
    >
      {/* Row 1: Sticker avatar + Name + Age + actions */}
      <View style={styles.childHeader}>
        <View
          style={[
            styles.childAvatar,
            { backgroundColor: accent + '40', borderColor: colors.text },
          ]}
        >
          <FlowerSticker size={28} petal={accent} center={stickers.yellow} />
        </View>
        <View style={styles.childInfo}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text
              style={[
                styles.childName,
                { color: colors.text, fontFamily: font.display },
              ]}
            >
              {child.name}
            </Text>
            {child.sex ? (
              <View style={[styles.sexBadge, { backgroundColor: sexColor + '30' }]}>
                <Text
                  style={[
                    styles.sexBadgeText,
                    { color: isDark ? sexColor : '#3A3533', fontFamily: font.bodySemiBold },
                  ]}
                >
                  {sexLabel}
                </Text>
              </View>
            ) : null}
          </View>
          <Text
            style={[
              styles.childAge,
              { color: colors.textSecondary, fontFamily: font.body },
            ]}
            numberOfLines={1}
          >
            {child.birthDate ? `${formatAge(child.birthDate)} — Born ${new Date(child.birthDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}` : 'No birth date set'}
          </Text>
        </View>
        <View style={styles.cardActions}>
          <Pressable onPress={onEdit} hitSlop={8}>
            <Pencil size={16} color={colors.text} strokeWidth={2} />
          </Pressable>
          <Pressable onPress={onDelete} hitSlop={8}>
            <Trash2 size={15} color={colors.textMuted} strokeWidth={2} />
          </Pressable>
        </View>
      </View>

      {visibleTags.length > 0 && (
        <View style={styles.tagRow}>
          {visibleTags.map((t, i) => (
            <View key={`${t.label}-${i}`} style={[styles.miniChip, { backgroundColor: t.color + (isDark ? '24' : '20') }]}>
              <Text
                style={[
                  styles.miniChipText,
                  { color: isDark ? t.color : '#3A3533', fontFamily: font.bodySemiBold },
                ]}
              >
                {t.label}
              </Text>
            </View>
          ))}
          {extraCount > 0 && (
            <View style={[styles.miniChip, { backgroundColor: colors.surfaceRaised }]}>
              <Text style={[styles.miniChipText, { color: colors.textSecondary, fontFamily: font.bodySemiBold }]}>
                +{extraCount}
              </Text>
            </View>
          )}
        </View>
      )}

      {foodSummary ? (
        <Text style={[styles.foodLine, { color: colors.textSecondary, fontFamily: font.body }]} numberOfLines={1}>
          {foodSummary}
        </Text>
      ) : null}

      {child.pediatrician?.name ? (
        <View style={styles.pedRow}>
          <Stethoscope size={12} color={colors.textMuted} strokeWidth={2} />
          <Text style={[styles.pedText, { color: colors.textMuted, fontFamily: font.body }]} numberOfLines={1}>
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
  const { colors, font, isDark } = useTheme()
  const paper = isDark ? colors.surface : '#FFFEF8'
  const border = isDark ? colors.border : 'rgba(20,19,19,0.08)'
  const chipFg = isDark ? chipColor : '#3A3533'
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
      <MonoCaps color={colors.textMuted}>{label}</MonoCaps>

      {value.length > 0 && (
        <View style={formStyles.chipRow}>
          {value.map((item) => (
            <View key={item} style={[formStyles.chipTag, { backgroundColor: chipColor + (isDark ? '28' : '24') }]}>
              <Text style={[formStyles.chipTagText, { color: chipFg, fontFamily: font.bodySemiBold }]}>{item}</Text>
              <Pressable onPress={() => remove(item)} hitSlop={6}>
                <Ionicons name="close" size={13} color={chipFg} />
              </Pressable>
            </View>
          ))}
        </View>
      )}

      <View style={[formStyles.inputRow, { backgroundColor: paper, borderColor: border }]}>
        <Search size={16} color={colors.textMuted} strokeWidth={2} />
        <TextInput
          value={query}
          onChangeText={(t) => { setQuery(t); setShowSuggestions(t.length >= 1) }}
          placeholder={placeholder}
          placeholderTextColor={colors.textMuted}
          style={[formStyles.inputInner, { color: colors.text, fontFamily: font.body }]}
          onSubmitEditing={handleSubmit}
          returnKeyType="done"
          onFocus={() => { if (query.length >= 1) setShowSuggestions(true) }}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
        />
      </View>

      {showSuggestions && query.trim().length > 0 && (
        <View style={[formStyles.dropdown, { backgroundColor: paper, borderColor: border }]}>
          {filtered.map((s) => (
            <Pressable key={s} onPress={() => add(s)} style={({ pressed }) => [formStyles.dropdownItem, pressed && { backgroundColor: colors.surfaceRaised }]}>
              <Text style={[formStyles.dropdownText, { color: colors.text, fontFamily: font.body }]}>{s}</Text>
            </Pressable>
          ))}
          {!value.includes(query.trim()) && !suggestions.some((s) => s.toLowerCase() === query.trim().toLowerCase() && value.includes(s)) && (
            <Pressable
              onPress={handleSubmit}
              style={({ pressed }) => [formStyles.dropdownItem, filtered.length > 0 && { borderTopWidth: 1, borderTopColor: border }, pressed && { backgroundColor: colors.surfaceRaised }]}
            >
              <Text style={[formStyles.dropdownText, { color: colors.text, fontFamily: font.bodySemiBold }]}>
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
  const { colors, font, stickers, isDark } = useTheme()

  const [name, setName] = useState(child.name)
  const [birthDate, setBirthDate] = useState(child.birthDate)
  const [sex, setSex] = useState(child.sex)
  const [bloodType, setBloodType] = useState(child.bloodType)
  const [allergies, setAllergies] = useState<string[]>(child.allergies)
  const [medications, setMedications] = useState<string[]>(child.medications)
  const [conditions, setConditions] = useState<string[]>(child.conditions)
  const [dietaryRestrictions, setDietaryRestrictions] = useState<string[]>(child.dietaryRestrictions)
  const [preferredFoods, setPreferredFoods] = useState<string[]>(child.preferredFoods)
  const [dislikedFoods, setDislikedFoods] = useState<string[]>(child.dislikedFoods)
  const [pedName, setPedName] = useState(child.pediatrician?.name ?? '')
  const [pedPhone, setPedPhone] = useState(child.pediatrician?.phone ?? '')
  const [pedClinic, setPedClinic] = useState(child.pediatrician?.clinic ?? '')
  const [countryCode, setCountryCode] = useState(child.countryCode ?? 'US')
  const [countryQuery, setCountryQuery] = useState(COUNTRY_OPTIONS.find(c => c.code === (child.countryCode ?? 'US'))?.name ?? 'United States')
  const [countryDropdownOpen, setCountryDropdownOpen] = useState(false)
  const [notes, setNotes] = useState(child.notes)
  const [showDatePicker, setShowDatePicker] = useState(Platform.OS === 'ios')
  const [saving, setSaving] = useState(false)

  function splitList(s: string): string[] {
    return [...new Set(s ? s.split(',').map((a) => a.trim()).filter(Boolean) : [])]
  }

  const canSave = name.trim().length > 0 && sex.length > 0 && !!birthDate

  async function handleSave() {
    if (!name.trim()) return Alert.alert('Missing Info', 'Name is required.')
    if (!sex) return Alert.alert('Missing Info', 'Please select the sex.')
    if (!birthDate) return Alert.alert('Missing Info', 'Please set the birth date.')
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
        conditions,
        dietary_restrictions: dietaryRestrictions,
        preferred_foods: preferredFoods,
        disliked_foods: dislikedFoods,
        pediatrician,
        notes: notes.trim() || null,
        country_code: countryCode,
      }).eq('id', child.id)

      if (error) throw error

      onSaved({
        ...child,
        name: name.trim(),
        birthDate: birthDate ?? '',
        sex,
        bloodType,
        countryCode,
        allergies,
        medications,
        conditions,
        dietaryRestrictions,
        preferredFoods,
        dislikedFoods,
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
          <FormField label="Name *" value={name} onChangeText={setName} placeholder="Child name" />

          <View style={{ marginTop: 4 }}><MonoCaps color={colors.textMuted}>Sex *</MonoCaps></View>
          <View style={formStyles.optionRow}>
            {SEX_OPTIONS.map((opt) => (
              <Pressable
                key={opt.value}
                onPress={() => setSex(sex === opt.value ? '' : opt.value)}
                style={[
                  formStyles.optionBtn,
                  {
                    backgroundColor: sex === opt.value ? colors.text : (isDark ? colors.surface : '#FFFEF8'),
                    borderColor: sex === opt.value ? colors.text : (isDark ? colors.border : 'rgba(20,19,19,0.08)'),
                  },
                ]}
              >
                <Text style={[formStyles.optionText, { color: sex === opt.value ? colors.bg : colors.text, fontFamily: font.bodyMedium }]}>{opt.label}</Text>
              </Pressable>
            ))}
          </View>

          <View style={{ marginTop: 4 }}><MonoCaps color={colors.textMuted}>Birth Date *</MonoCaps></View>
          {birthDate ? (
            <View style={[formStyles.ageBadge, { backgroundColor: stickers.lilac + (isDark ? '28' : '40') }]}>
              <Text style={[formStyles.ageBadgeText, { color: colors.text, fontFamily: font.bodySemiBold }]}>
                {formatAge(birthDate)}
              </Text>
            </View>
          ) : null}
          {Platform.OS === 'android' && !showDatePicker && (
            <Pressable
              onPress={() => setShowDatePicker(true)}
              style={[
                formStyles.dateBtn,
                {
                  backgroundColor: isDark ? colors.surface : '#FFFEF8',
                  borderColor: isDark ? colors.border : 'rgba(20,19,19,0.08)',
                },
              ]}
            >
              <Text style={[formStyles.dateText, { color: birthDate ? colors.text : colors.textMuted, fontFamily: font.body }]}>
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
              themeVariant={isDark ? 'dark' : 'light'}
              onChange={(_, d) => {
                if (Platform.OS === 'android') setShowDatePicker(false)
                if (d) setBirthDate(d.toISOString().split('T')[0])
              }}
            />
          )}

          <View style={{ marginTop: 4 }}><MonoCaps color={colors.textMuted}>Blood Type</MonoCaps></View>
          <View style={formStyles.optionRow}>
            {BLOOD_TYPES.map((bt) => (
              <Pressable
                key={bt}
                onPress={() => setBloodType(bloodType === bt ? '' : bt)}
                style={[
                  formStyles.bloodBtn,
                  {
                    backgroundColor: bloodType === bt ? stickers.coral + (isDark ? '32' : '28') : (isDark ? colors.surface : '#FFFEF8'),
                    borderColor: bloodType === bt ? stickers.coral : (isDark ? colors.border : 'rgba(20,19,19,0.08)'),
                  },
                ]}
              >
                <Text style={[formStyles.bloodText, { color: bloodType === bt ? stickers.coral : colors.text, fontFamily: font.bodySemiBold }]}>{bt}</Text>
              </Pressable>
            ))}
          </View>

          <View style={{ marginTop: 8 }}><MonoCaps color={colors.textMuted}>Country (vaccine schedule)</MonoCaps></View>
          <View>
            <View
              style={[
                formStyles.inputRow,
                {
                  backgroundColor: isDark ? colors.surface : '#FFFEF8',
                  borderColor: countryDropdownOpen ? colors.text : (isDark ? colors.border : 'rgba(20,19,19,0.08)'),
                },
              ]}
            >
              <Search size={16} color={colors.textMuted} strokeWidth={2} />
              <TextInput
                value={countryQuery}
                onChangeText={(t) => { setCountryQuery(t); setCountryDropdownOpen(true) }}
                onFocus={() => setCountryDropdownOpen(true)}
                placeholder="Search country..."
                placeholderTextColor={colors.textMuted}
                style={[formStyles.inputInner, { color: colors.text, fontFamily: font.body }]}
              />
              {countryCode && (
                <Text style={{ fontSize: 13, color: colors.text, fontFamily: font.bodySemiBold }}>
                  {COUNTRY_OPTIONS.find(c => c.code === countryCode)?.code}
                </Text>
              )}
            </View>
            {countryDropdownOpen && (() => {
              const q = countryQuery.toLowerCase().trim()
              const matches = COUNTRY_OPTIONS.filter(c => c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q))
              if (matches.length === 0) return null
              return (
                <View
                  style={[
                    formStyles.dropdown,
                    {
                      backgroundColor: isDark ? colors.surface : '#FFFEF8',
                      borderColor: isDark ? colors.border : 'rgba(20,19,19,0.08)',
                    },
                  ]}
                >
                  {matches.map((c) => (
                    <Pressable
                      key={c.code}
                      onPress={() => {
                        setCountryCode(c.code)
                        setCountryQuery(c.name)
                        setCountryDropdownOpen(false)
                      }}
                      style={[formStyles.dropdownItem, { backgroundColor: c.code === countryCode ? colors.surfaceRaised : 'transparent' }]}
                    >
                      <Text style={[formStyles.dropdownText, { color: colors.text, fontFamily: c.code === countryCode ? font.bodySemiBold : font.body }]}>
                        {c.name}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              )
            })()}
          </View>

          {/* Health — chips with autocomplete */}
          <SectionHeader label="Health & Medical" />
          <ChipInput label="Allergies" value={allergies} onChange={setAllergies} suggestions={COMMON_CHILD_ALLERGIES} chipColor={brand.error} placeholder="Search allergies..." />
          <ChipInput label="Medications" value={medications} onChange={setMedications} suggestions={COMMON_MEDICATIONS} chipColor={brand.secondary} placeholder="Search medications..." />
          <ChipInput label="Conditions" value={conditions} onChange={setConditions} suggestions={[]} chipColor={colors.textSecondary} placeholder="e.g. Asthma, Eczema" />

          {/* Food */}
          <SectionHeader label="Food Preferences" />
          <ChipInput label="Preferred Foods" value={preferredFoods} onChange={setPreferredFoods} suggestions={[]} chipColor={brand.success} placeholder="e.g. Banana, Rice" />
          <ChipInput label="Disliked Foods" value={dislikedFoods} onChange={setDislikedFoods} suggestions={[]} chipColor={brand.warning} placeholder="e.g. Broccoli, Spinach" />
          <ChipInput label="Dietary Restrictions" value={dietaryRestrictions} onChange={setDietaryRestrictions} suggestions={[]} chipColor={brand.accent} placeholder="e.g. Gluten-free, No pork" />

          {/* Pediatrician */}
          <SectionHeader label="Pediatrician" />
          <FormField label="Doctor Name" value={pedName} onChangeText={setPedName} placeholder="Dr. Smith" />
          <FormField label="Phone" value={pedPhone} onChangeText={setPedPhone} placeholder="+1 555-0100" keyboardType="phone-pad" />
          <FormField label="Clinic" value={pedClinic} onChangeText={setPedClinic} placeholder="Children's Hospital" />

          {/* Notes */}
          <SectionHeader label="Additional Notes" />
          <FormField label="Notes" value={notes} onChangeText={setNotes} placeholder="Any important information..." multiline />

          <PillButton
            label={saving ? 'Saving…' : 'Save Changes'}
            variant="ink"
            onPress={handleSave}
            disabled={saving || !canSave}
            leading={<Ionicons name="checkmark-circle" size={18} color={colors.bg} />}
            style={{ marginTop: 8 }}
          />
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
  const { colors, font, stickers, isDark } = useTheme()

  const [name, setName] = useState('')
  const [birthDate, setBirthDate] = useState<string | null>(null)
  const [sex, setSex] = useState('')
  const [bloodType, setBloodType] = useState('')
  const [allergies, setAllergies] = useState<string[]>([])
  const [medications, setMedications] = useState<string[]>([])
  const [conditions, setConditions] = useState<string[]>([])
  const [dietaryRestrictions, setDietaryRestrictions] = useState<string[]>([])
  const [preferredFoods, setPreferredFoods] = useState<string[]>([])
  const [dislikedFoods, setDislikedFoods] = useState<string[]>([])

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
    setAllergies([]); setMedications([]); setConditions([])
    setDietaryRestrictions([]); setPreferredFoods([]); setDislikedFoods([])
    setPedName(''); setPedPhone(''); setPedClinic(''); setNotes('')
  }

  const canSave = name.trim().length > 0 && sex.length > 0 && !!birthDate

  async function handleSave() {
    if (!name.trim()) return Alert.alert('Missing Info', 'Name is required.')
    if (!sex) return Alert.alert('Missing Info', 'Please select the sex.')
    if (!birthDate) return Alert.alert('Missing Info', 'Please set the birth date.')
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
        conditions,
        dietary_restrictions: dietaryRestrictions,
        preferred_foods: preferredFoods,
        disliked_foods: dislikedFoods,
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
          <FormField label="Name *" value={name} onChangeText={setName} placeholder="Child's name" />

          <View style={{ marginTop: 4 }}><MonoCaps color={colors.textMuted}>Sex *</MonoCaps></View>
          <View style={formStyles.optionRow}>
            {SEX_OPTIONS.map((opt) => (
              <Pressable
                key={opt.value}
                onPress={() => setSex(sex === opt.value ? '' : opt.value)}
                style={[
                  formStyles.optionBtn,
                  {
                    backgroundColor: sex === opt.value ? colors.text : (isDark ? colors.surface : '#FFFEF8'),
                    borderColor: sex === opt.value ? colors.text : (isDark ? colors.border : 'rgba(20,19,19,0.08)'),
                  },
                ]}
              >
                <Text style={[formStyles.optionText, { color: sex === opt.value ? colors.bg : colors.text, fontFamily: font.bodyMedium }]}>{opt.label}</Text>
              </Pressable>
            ))}
          </View>

          <View style={{ marginTop: 4 }}><MonoCaps color={colors.textMuted}>Birth Date *</MonoCaps></View>
          {birthDate ? (
            <View style={[formStyles.ageBadge, { backgroundColor: stickers.lilac + (isDark ? '28' : '40') }]}>
              <Text style={[formStyles.ageBadgeText, { color: colors.text, fontFamily: font.bodySemiBold }]}>
                {formatAge(birthDate)}
              </Text>
            </View>
          ) : null}
          {Platform.OS === 'android' && !showDatePicker && (
            <Pressable
              onPress={() => setShowDatePicker(true)}
              style={[
                formStyles.dateBtn,
                {
                  backgroundColor: isDark ? colors.surface : '#FFFEF8',
                  borderColor: isDark ? colors.border : 'rgba(20,19,19,0.08)',
                },
              ]}
            >
              <Text style={[formStyles.dateText, { color: birthDate ? colors.text : colors.textMuted, fontFamily: font.body }]}>
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
              themeVariant={isDark ? 'dark' : 'light'}
              onChange={(_, d) => {
                if (Platform.OS === 'android') setShowDatePicker(false)
                if (d) setBirthDate(d.toISOString().split('T')[0])
              }}
            />
          )}

          <View style={{ marginTop: 4 }}><MonoCaps color={colors.textMuted}>Blood Type</MonoCaps></View>
          <View style={formStyles.optionRow}>
            {BLOOD_TYPES.map((bt) => (
              <Pressable
                key={bt}
                onPress={() => setBloodType(bloodType === bt ? '' : bt)}
                style={[
                  formStyles.bloodBtn,
                  {
                    backgroundColor: bloodType === bt ? stickers.coral + (isDark ? '32' : '28') : (isDark ? colors.surface : '#FFFEF8'),
                    borderColor: bloodType === bt ? stickers.coral : (isDark ? colors.border : 'rgba(20,19,19,0.08)'),
                  },
                ]}
              >
                <Text style={[formStyles.bloodText, { color: bloodType === bt ? stickers.coral : colors.text, fontFamily: font.bodySemiBold }]}>{bt}</Text>
              </Pressable>
            ))}
          </View>

          <SectionHeader label="Health & Medical" />
          <ChipInput label="Allergies" value={allergies} onChange={setAllergies} suggestions={COMMON_CHILD_ALLERGIES} chipColor={brand.error} placeholder="Search allergies..." />
          <ChipInput label="Medications" value={medications} onChange={setMedications} suggestions={COMMON_MEDICATIONS} chipColor={brand.secondary} placeholder="Search medications..." />
          <ChipInput label="Conditions" value={conditions} onChange={setConditions} suggestions={[]} chipColor={colors.textSecondary} placeholder="e.g. Asthma, Eczema" />

          <SectionHeader label="Food Preferences" />
          <ChipInput label="Preferred Foods" value={preferredFoods} onChange={setPreferredFoods} suggestions={[]} chipColor={brand.success} placeholder="e.g. Banana, Rice" />
          <ChipInput label="Disliked Foods" value={dislikedFoods} onChange={setDislikedFoods} suggestions={[]} chipColor={brand.warning} placeholder="e.g. Broccoli, Spinach" />
          <ChipInput label="Dietary Restrictions" value={dietaryRestrictions} onChange={setDietaryRestrictions} suggestions={[]} chipColor={brand.accent} placeholder="e.g. Gluten-free, No pork" />

          <SectionHeader label="Pediatrician" />
          <FormField label="Doctor Name" value={pedName} onChangeText={setPedName} placeholder="Dr. Smith" />
          <FormField label="Phone" value={pedPhone} onChangeText={setPedPhone} placeholder="+1 555-0100" keyboardType="phone-pad" />
          <FormField label="Clinic" value={pedClinic} onChangeText={setPedClinic} placeholder="Children's Hospital" />

          <SectionHeader label="Additional Notes" />
          <FormField label="Notes" value={notes} onChangeText={setNotes} placeholder="Any important information..." multiline />

          <PillButton
            label={saving ? 'Adding…' : 'Add Child'}
            variant="ink"
            onPress={handleSave}
            disabled={saving || !canSave}
            leading={<Ionicons name="add" size={18} color={colors.bg} />}
            style={{ marginTop: 8 }}
          />
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
      <View style={[formStyles.sectionLine, { backgroundColor: colors.borderLight }]} />
      <MonoCaps color={colors.textMuted}>{label}</MonoCaps>
      <View style={[formStyles.sectionLine, { backgroundColor: colors.borderLight }]} />
    </View>
  )
}

// ─── Form Field ───────────────────────────────────────────────────────────

function FormField({ label, value, onChangeText, placeholder, multiline, hint, keyboardType }: {
  label: string; value: string; onChangeText: (t: string) => void; placeholder: string; multiline?: boolean; hint?: string; keyboardType?: any
}) {
  const { colors, font, isDark } = useTheme()
  const paper = isDark ? colors.surface : '#FFFEF8'
  const border = isDark ? colors.border : 'rgba(20,19,19,0.08)'
  return (
    <View style={formStyles.field}>
      <MonoCaps color={colors.textMuted}>{label}</MonoCaps>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        multiline={multiline}
        keyboardType={keyboardType}
        style={[
          formStyles.input,
          { color: colors.text, backgroundColor: paper, borderColor: border, fontFamily: font.body },
          multiline && { height: 96, textAlignVertical: 'top', paddingTop: 14 },
        ]}
      />
      {hint && <Text style={[formStyles.hint, { color: colors.textMuted, fontFamily: font.body }]}>{hint}</Text>}
    </View>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1 },
  headerWrap: { paddingHorizontal: 16, paddingBottom: 6 },
  headerAddBtn: {
    width: 38,
    height: 38,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: { paddingHorizontal: 20, paddingBottom: 40, gap: 14 },

  emptyCard: {
    alignItems: 'center',
    padding: 32,
    gap: 14,
    borderRadius: 28,
    shadowColor: '#141313',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 2,
  },

  childCard: {
    padding: 16,
    gap: 10,
    borderRadius: 28,
    borderWidth: 1,
    shadowColor: '#141313',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
  },
  childHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  childAvatar: {
    width: 48,
    height: 48,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  childInfo: { flex: 1, gap: 2 },
  childName: { fontSize: 18, letterSpacing: -0.2 },
  childAge: { fontSize: 13 },
  sexBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 },
  sexBadgeText: { fontSize: 10 },
  cardActions: { flexDirection: 'row', alignItems: 'center', gap: 14 },

  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  miniChip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  miniChipText: { fontSize: 11 },

  foodLine: { fontSize: 13 },
  pedRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  pedText: { fontSize: 12, flex: 1 },
})

const formStyles = StyleSheet.create({
  form: { gap: 12, paddingBottom: 12 },
  field: { gap: 6 },
  hint: { fontSize: 11, marginTop: 2 },
  input: { borderWidth: 1, borderRadius: 18, paddingHorizontal: 16, height: 52, fontSize: 15 },
  dateBtn: { paddingVertical: 14, paddingHorizontal: 16, borderWidth: 1, borderRadius: 18 },
  dateText: { fontSize: 15 },
  ageBadge: {
    alignSelf: 'flex-start',
    paddingVertical: 6,
    paddingHorizontal: 14,
    marginBottom: 4,
    borderRadius: 999,
  },
  ageBadgeText: { fontSize: 13, letterSpacing: 0.2 },

  optionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  optionBtn: { paddingVertical: 10, paddingHorizontal: 18, borderWidth: 1, borderRadius: 999 },
  optionText: { fontSize: 14 },
  bloodBtn: { paddingVertical: 8, paddingHorizontal: 14, borderWidth: 1, borderRadius: 999 },
  bloodText: { fontSize: 13 },

  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 2 },
  chipTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 5,
    paddingLeft: 12,
    paddingRight: 8,
    borderRadius: 999,
  },
  chipTagText: { fontSize: 12 },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 14,
    height: 48,
    gap: 8,
  },
  inputInner: { flex: 1, fontSize: 14, paddingVertical: 0 },
  dropdown: { borderWidth: 1, borderRadius: 18, marginTop: 4, overflow: 'hidden', maxHeight: 220 },
  dropdownItem: { paddingVertical: 12, paddingHorizontal: 14 },
  dropdownText: { fontSize: 14 },

  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 12 },
  sectionLine: { flex: 1, height: 1 },
})
