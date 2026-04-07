/**
 * Personal Profile — edit basic info + health profile.
 *
 * Enhanced inputs:
 * 1. Location — autocomplete via OpenStreetMap Nominatim
 * 2. Language — dropdown picker
 * 3. Health Notes — example placeholder
 * 4. Allergies — autocomplete from common allergy list
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  Alert,
  StyleSheet,
  FlatList,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native'
import { router } from 'expo-router'
import {
  ArrowLeft,
  Save,
  MapPin,
  Globe,
  ChevronDown,
  X,
  Search,
  Check,
} from 'lucide-react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme, brand } from '../../constants/theme'
import { supabase } from '../../lib/supabase'

// ─── Constants ────────────────────────────────────────────────────────────

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Español' },
  { code: 'pt', label: 'Português' },
  { code: 'fr', label: 'Français' },
  { code: 'de', label: 'Deutsch' },
  { code: 'it', label: 'Italiano' },
  { code: 'nl', label: 'Nederlands' },
  { code: 'ja', label: '日本語' },
  { code: 'ko', label: '한국어' },
  { code: 'zh', label: '中文' },
  { code: 'ar', label: 'العربية' },
  { code: 'hi', label: 'हिन्दी' },
  { code: 'ru', label: 'Русский' },
  { code: 'tr', label: 'Türkçe' },
  { code: 'pl', label: 'Polski' },
  { code: 'sv', label: 'Svenska' },
  { code: 'da', label: 'Dansk' },
  { code: 'no', label: 'Norsk' },
  { code: 'fi', label: 'Suomi' },
  { code: 'th', label: 'ไทย' },
  { code: 'vi', label: 'Tiếng Việt' },
  { code: 'id', label: 'Bahasa Indonesia' },
  { code: 'ms', label: 'Bahasa Melayu' },
  { code: 'he', label: 'עברית' },
  { code: 'uk', label: 'Українська' },
  { code: 'ro', label: 'Română' },
  { code: 'cs', label: 'Čeština' },
  { code: 'el', label: 'Ελληνικά' },
  { code: 'hu', label: 'Magyar' },
]

const COMMON_ALLERGIES = [
  // Food
  'Peanuts', 'Tree nuts', 'Milk', 'Eggs', 'Wheat', 'Soy', 'Fish',
  'Shellfish', 'Sesame', 'Gluten', 'Lactose', 'Corn', 'Mustard',
  'Celery', 'Lupin', 'Mollusks', 'Sulfites', 'Coconut', 'Banana',
  'Avocado', 'Kiwi', 'Mango', 'Strawberry', 'Citrus fruits',
  // Medications
  'Penicillin', 'Amoxicillin', 'Aspirin', 'Ibuprofen', 'Sulfa drugs',
  'Codeine', 'Morphine', 'Insulin', 'Contrast dye',
  // Environmental
  'Latex', 'Bee stings', 'Wasp stings', 'Dust mites', 'Mold',
  'Pet dander', 'Cat dander', 'Dog dander', 'Pollen', 'Grass pollen',
  'Cockroach', 'Feathers',
  // Contact / Skin
  'Nickel', 'Fragrance', 'Dyes', 'Lanolin', 'Formaldehyde',
  'Urticaria', 'Dermatitis', 'Eczema',
  // Other
  'Sunlight', 'Cold temperature', 'Exercise-induced',
]

// ─── Main Component ────────────────────────────────────────────────────────

export default function PersonalProfile() {
  const { colors, radius } = useTheme()
  const insets = useSafeAreaInsets()

  const [name, setName] = useState('')
  const [location, setLocation] = useState('')
  const [language, setLanguage] = useState('en')
  const [healthNotes, setHealthNotes] = useState('')
  const [allergies, setAllergies] = useState<string[]>([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadProfile()
  }, [])

  async function loadProfile() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    const { data } = await supabase
      .from('profiles')
      .select('name, location, language, health_notes, allergies')
      .eq('id', session.user.id)
      .single()

    if (data) {
      setName(data.name ?? '')
      setLocation(data.location ?? '')
      setLanguage(data.language ?? 'en')
      setHealthNotes(data.health_notes ?? '')
      setAllergies(data.allergies ?? [])
    }
  }

  async function handleSave() {
    setSaving(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const { error } = await supabase.from('profiles').upsert({
        id: session.user.id,
        name: name || null,
        location: location || null,
        language,
        health_notes: healthNotes || null,
        allergies,
      }, { onConflict: 'id' })

      if (error) throw error
      Alert.alert('Saved', 'Your profile has been updated.')
      router.back()
    } catch (e: any) {
      Alert.alert('Error', e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={24} color={colors.text} />
        </Pressable>
        <Text style={[styles.title, { color: colors.text }]}>My Profile</Text>
        <View style={styles.backBtn} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Name */}
          <Field
            label="Name"
            value={name}
            onChangeText={setName}
            placeholder="Your name"
            colors={colors}
            radius={radius}
          />

          {/* Location — autocomplete */}
          <LocationField
            value={location}
            onChange={setLocation}
            colors={colors}
            radius={radius}
          />

          {/* Language — dropdown */}
          <LanguageField
            value={language}
            onChange={setLanguage}
            colors={colors}
            radius={radius}
          />

          {/* Health Notes */}
          <Field
            label="Health Notes"
            value={healthNotes}
            onChangeText={setHealthNotes}
            placeholder="e.g. Gestational diabetes, hypothyroidism, asthma, high blood pressure..."
            multiline
            colors={colors}
            radius={radius}
          />

          {/* Allergies — autocomplete chips */}
          <AllergyField
            value={allergies}
            onChange={setAllergies}
            colors={colors}
            radius={radius}
          />

          <Pressable
            onPress={handleSave}
            disabled={saving}
            style={({ pressed }) => [
              styles.saveBtn,
              { backgroundColor: colors.primary, borderRadius: radius.lg, opacity: saving ? 0.6 : 1 },
              pressed && { transform: [{ scale: 0.98 }] },
            ]}
          >
            <Save size={18} color="#FFFFFF" strokeWidth={2} />
            <Text style={styles.saveBtnText}>{saving ? 'Saving...' : 'Save Changes'}</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  )
}

// ─── Basic Field ──────────────────────────────────────────────────────────

function Field({ label, value, onChangeText, placeholder, multiline, colors, radius }: any) {
  return (
    <View style={styles.field}>
      <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        multiline={multiline}
        style={[
          styles.fieldInput,
          {
            color: colors.text,
            backgroundColor: colors.surface,
            borderColor: colors.border,
            borderRadius: radius.lg,
          },
          multiline && { height: 90, textAlignVertical: 'top', paddingTop: 12 },
        ]}
      />
    </View>
  )
}

// ─── Location Autocomplete ────────────────────────────────────────────────

interface LocationResult {
  display_name: string
  place_id: number
}

function LocationField({ value, onChange, colors, radius }: {
  value: string
  onChange: (v: string) => void
  colors: any
  radius: any
}) {
  const [query, setQuery] = useState(value)
  const [results, setResults] = useState<LocationResult[]>([])
  const [showResults, setShowResults] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => { setQuery(value) }, [value])

  const search = useCallback((text: string) => {
    setQuery(text)
    if (debounceRef.current) clearTimeout(debounceRef.current)

    if (text.length < 3) {
      setResults([])
      setShowResults(false)
      return
    }

    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(text)}&limit=5&addressdetails=0`,
          { headers: { 'Accept-Language': 'en' } }
        )
        const data: LocationResult[] = await res.json()
        setResults(data)
        setShowResults(data.length > 0)
      } catch {
        setResults([])
      }
    }, 400)
  }, [])

  function selectLocation(item: LocationResult) {
    // Simplify: take "City, State, Country" from full display name
    const parts = item.display_name.split(', ')
    const short = parts.length >= 3
      ? `${parts[0]}, ${parts[parts.length - 1]}`
      : item.display_name
    setQuery(short)
    onChange(short)
    setShowResults(false)
    setResults([])
  }

  return (
    <View style={[styles.field, { zIndex: 10 }]}>
      <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Location</Text>
      <View style={[styles.fieldInputRow, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg }]}>
        <MapPin size={18} color={colors.textMuted} strokeWidth={2} />
        <TextInput
          value={query}
          onChangeText={search}
          placeholder="Search city or country..."
          placeholderTextColor={colors.textMuted}
          style={[styles.fieldInputInner, { color: colors.text }]}
          onFocus={() => { if (results.length > 0) setShowResults(true) }}
          onBlur={() => setTimeout(() => setShowResults(false), 200)}
        />
        {query.length > 0 && (
          <Pressable onPress={() => { setQuery(''); onChange(''); setResults([]); setShowResults(false) }}>
            <X size={16} color={colors.textMuted} />
          </Pressable>
        )}
      </View>
      {showResults && (
        <View style={[styles.dropdownAbsolute, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg }]}>
          {results.map((item) => (
            <Pressable
              key={item.place_id}
              onPress={() => selectLocation(item)}
              style={({ pressed }) => [styles.dropdownItem, pressed && { backgroundColor: colors.surfaceRaised }]}
            >
              <MapPin size={14} color={colors.textSecondary} strokeWidth={2} />
              <Text style={[styles.dropdownText, { color: colors.text }]} numberOfLines={2}>
                {item.display_name}
              </Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  )
}

// ─── Language Dropdown ────────────────────────────────────────────────────

function LanguageField({ value, onChange, colors, radius }: {
  value: string
  onChange: (v: string) => void
  colors: any
  radius: any
}) {
  const [modalVisible, setModalVisible] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const insets = useSafeAreaInsets()

  const current = LANGUAGES.find((l) => l.code === value)
  const filtered = searchQuery
    ? LANGUAGES.filter((l) =>
        l.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
        l.code.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : LANGUAGES

  return (
    <View style={styles.field}>
      <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Language</Text>
      <Pressable
        onPress={() => setModalVisible(true)}
        style={[styles.fieldInputRow, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg }]}
      >
        <Globe size={18} color={colors.textMuted} strokeWidth={2} />
        <Text style={[styles.fieldInputInner, { color: colors.text, paddingVertical: 0 }]}>
          {current ? `${current.label} (${current.code})` : value}
        </Text>
        <ChevronDown size={18} color={colors.textMuted} />
      </Pressable>

      <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet">
        <View style={[styles.modalRoot, { backgroundColor: colors.bg }]}>
          <View style={[styles.modalHeader, { paddingTop: insets.top + 8 }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Select Language</Text>
            <Pressable onPress={() => { setModalVisible(false); setSearchQuery('') }}>
              <X size={24} color={colors.text} />
            </Pressable>
          </View>

          <View style={[styles.searchBar, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg }]}>
            <Search size={18} color={colors.textMuted} strokeWidth={2} />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search language..."
              placeholderTextColor={colors.textMuted}
              style={[styles.searchInput, { color: colors.text }]}
              autoFocus
            />
          </View>

          <FlatList
            data={filtered}
            keyExtractor={(item) => item.code}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
            renderItem={({ item }) => {
              const isSelected = item.code === value
              return (
                <Pressable
                  onPress={() => {
                    onChange(item.code)
                    setModalVisible(false)
                    setSearchQuery('')
                  }}
                  style={({ pressed }) => [
                    styles.langRow,
                    { borderBottomColor: colors.borderLight },
                    isSelected && { backgroundColor: colors.primaryTint },
                    pressed && { opacity: 0.7 },
                  ]}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.langLabel, { color: colors.text }]}>{item.label}</Text>
                    <Text style={[styles.langCode, { color: colors.textMuted }]}>{item.code}</Text>
                  </View>
                  {isSelected && <Check size={20} color={colors.primary} strokeWidth={2.5} />}
                </Pressable>
              )
            }}
          />
        </View>
      </Modal>
    </View>
  )
}

// ─── Allergies Autocomplete with Chips ────────────────────────────────────

function AllergyField({ value, onChange, colors, radius }: {
  value: string[]
  onChange: (v: string[]) => void
  colors: any
  radius: any
}) {
  const [query, setQuery] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)

  const suggestions = query.length >= 1
    ? COMMON_ALLERGIES.filter(
        (a) => a.toLowerCase().includes(query.toLowerCase()) && !value.includes(a)
      ).slice(0, 6)
    : []

  function addAllergy(allergy: string) {
    if (!value.includes(allergy)) {
      onChange([...value, allergy])
    }
    setQuery('')
    setShowSuggestions(false)
  }

  function removeAllergy(allergy: string) {
    onChange(value.filter((a) => a !== allergy))
  }

  function handleSubmit() {
    const trimmed = query.trim()
    if (trimmed && !value.includes(trimmed)) {
      onChange([...value, trimmed])
    }
    setQuery('')
    setShowSuggestions(false)
  }

  return (
    <View style={styles.field}>
      <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Allergies</Text>

      {/* Chips */}
      {value.length > 0 && (
        <View style={styles.chipWrap}>
          {value.map((a) => (
            <View key={a} style={[styles.chip, { backgroundColor: brand.error + '15', borderRadius: radius.full }]}>
              <Text style={[styles.chipText, { color: brand.error }]}>{a}</Text>
              <Pressable onPress={() => removeAllergy(a)} hitSlop={6}>
                <X size={14} color={brand.error} strokeWidth={2.5} />
              </Pressable>
            </View>
          ))}
        </View>
      )}

      {/* Input */}
      <View style={[styles.fieldInputRow, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg }]}>
        <Search size={18} color={colors.textMuted} strokeWidth={2} />
        <TextInput
          value={query}
          onChangeText={(t) => {
            setQuery(t)
            setShowSuggestions(t.length >= 1)
          }}
          placeholder="Type to search allergies..."
          placeholderTextColor={colors.textMuted}
          style={[styles.fieldInputInner, { color: colors.text }]}
          onSubmitEditing={handleSubmit}
          returnKeyType="done"
          onFocus={() => { if (query.length >= 1) setShowSuggestions(true) }}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
        />
      </View>

      {/* Suggestions */}
      {showSuggestions && query.trim().length > 0 && (
        <View style={[styles.dropdown, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg }]}>
          {suggestions.map((s) => (
            <Pressable
              key={s}
              onPress={() => addAllergy(s)}
              style={({ pressed }) => [styles.dropdownItem, pressed && { backgroundColor: colors.surfaceRaised }]}
            >
              <Text style={[styles.dropdownText, { color: colors.text }]}>{s}</Text>
            </Pressable>
          ))}
          {!value.includes(query.trim()) && !COMMON_ALLERGIES.some((a) => a.toLowerCase() === query.trim().toLowerCase() && value.includes(a)) && (
            <Pressable
              onPress={handleSubmit}
              style={({ pressed }) => [styles.dropdownItem, { borderTopWidth: suggestions.length > 0 ? 1 : 0, borderTopColor: colors.border }, pressed && { backgroundColor: colors.surfaceRaised }]}
            >
              <Text style={[styles.dropdownText, { color: colors.primary, fontWeight: '600' }]}>
                + Add "{query.trim()}"
              </Text>
            </Pressable>
          )}
        </View>
      )}
    </View>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  backBtn: { width: 40, alignItems: 'center' },
  title: { fontSize: 18, fontWeight: '700' },
  scroll: { paddingHorizontal: 20, paddingBottom: 40, gap: 16 },

  // Field
  field: { gap: 6 },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  fieldInput: {
    borderWidth: 1,
    paddingHorizontal: 16,
    height: 48,
    fontSize: 15,
    fontWeight: '500',
  },
  fieldInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    paddingHorizontal: 14,
    height: 48,
    gap: 10,
  },
  fieldInputInner: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    paddingVertical: 0,
  },

  // Dropdown (inline for allergies)
  dropdown: {
    borderWidth: 1,
    marginTop: 4,
    overflow: 'hidden',
    maxHeight: 240,
  },
  // Dropdown (absolute overlay for location)
  dropdownAbsolute: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    borderWidth: 1,
    marginTop: 4,
    overflow: 'hidden',
    maxHeight: 240,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 8,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 10,
  },
  dropdownText: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },

  // Chips
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 4,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingLeft: 12,
    paddingRight: 8,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
  },

  // Language modal
  modalRoot: { flex: 1 },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  modalTitle: { fontSize: 20, fontWeight: '700' },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 8,
    borderWidth: 1,
    paddingHorizontal: 14,
    height: 44,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    paddingVertical: 0,
  },
  langRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
  },
  langLabel: { fontSize: 16, fontWeight: '600' },
  langCode: { fontSize: 13, fontWeight: '500', marginTop: 2 },

  // Save
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 52,
    marginTop: 8,
  },
  saveBtnText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
})
