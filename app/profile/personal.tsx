/**
 * Personal Profile — cream-paper redesign.
 *
 * - Avatar with photo upload + sticker fallback (Star sticker corner accent)
 * - Fraunces / DM Sans typography via Display / MonoCaps / Body
 * - Cream paper inputs, ink CTA via PillButton
 * - Location autocomplete (OpenStreetMap), language picker, allergies
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import {
  View,
  TextInput,
  Pressable,
  ScrollView,
  Alert,
  StyleSheet,
  FlatList,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import * as ImagePicker from 'expo-image-picker'
import { useTheme } from '../../constants/theme'
import { supabase } from '../../lib/supabase'
import { ScreenHeader } from '../../components/ui/ScreenHeader'
import { PillButton } from '../../components/ui/PillButton'
import { Display, MonoCaps, Body } from '../../components/ui/Typography'
import {
  Star as StarSticker,
  Heart as HeartSticker,
  Squishy,
  Flower as FlowerSticker,
} from '../../components/ui/Stickers'
import { AvatarView, AvatarPickerModal, isIconAvatar } from '../../components/ui/AvatarPicker'
import { useSavedToast } from '../../components/ui/SavedToast'

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
  'Peanuts', 'Tree nuts', 'Milk', 'Eggs', 'Wheat', 'Soy', 'Fish',
  'Shellfish', 'Sesame', 'Gluten', 'Lactose', 'Corn', 'Mustard',
  'Celery', 'Lupin', 'Mollusks', 'Sulfites', 'Coconut', 'Banana',
  'Avocado', 'Kiwi', 'Mango', 'Strawberry', 'Citrus fruits',
  'Penicillin', 'Amoxicillin', 'Aspirin', 'Ibuprofen', 'Sulfa drugs',
  'Codeine', 'Morphine', 'Insulin', 'Contrast dye',
  'Latex', 'Bee stings', 'Wasp stings', 'Dust mites', 'Mold',
  'Pet dander', 'Cat dander', 'Dog dander', 'Pollen', 'Grass pollen',
  'Cockroach', 'Feathers',
  'Nickel', 'Fragrance', 'Dyes', 'Lanolin', 'Formaldehyde',
  'Urticaria', 'Dermatitis', 'Eczema',
  'Sunlight', 'Cold temperature', 'Exercise-induced',
]

// ─── Avatar with photo upload + sticker fallback ──────────────────────────

function PhotoAvatar({
  value,
  initial,
  accentColor,
  onChange,
}: {
  value: string | null
  initial: string
  accentColor: string
  onChange: (newValue: string | null) => void
}) {
  const { colors, stickers } = useTheme()
  const [pickerOpen, setPickerOpen] = useState(false)

  async function pickPhoto() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (status !== 'granted') {
      return Alert.alert(
        'Permission needed',
        'Please allow access to your photo library.'
      )
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    })
    if (!result.canceled && result.assets[0]) {
      onChange(result.assets[0].uri)
    }
  }

  return (
    <View style={avatarStyles.container}>
      <View style={avatarStyles.stickerLeft}>
        <Squishy w={56} h={38} fill={stickers.yellow} />
      </View>
      <View style={avatarStyles.stickerRight}>
        <HeartSticker size={32} fill={stickers.pink} />
      </View>

      <Pressable
        onPress={() => setPickerOpen(true)}
        style={({ pressed }) => [pressed && { opacity: 0.85 }]}
      >
        <AvatarView
          value={value}
          size={110}
          accent={accentColor}
          initial={initial}
          borderColor={colors.text}
        />
        <View style={avatarStyles.starAccent}>
          <StarSticker size={32} fill={stickers.yellow} />
        </View>
        <View
          style={[
            avatarStyles.cameraBadge,
            { backgroundColor: colors.text, borderColor: colors.bg },
          ]}
        >
          <Ionicons name="camera" size={14} color={colors.bg} />
        </View>
      </Pressable>

      <AvatarPickerModal
        visible={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onPickPhoto={pickPhoto}
        onPickIcon={(iconValue) => onChange(iconValue)}
        onRemove={value ? () => onChange(null) : undefined}
      />
    </View>
  )
}

const avatarStyles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 24,
    position: 'relative',
  },
  stickerLeft: {
    position: 'absolute',
    top: 14,
    left: '28%',
    transform: [{ rotate: '-12deg' }],
    zIndex: 0,
  },
  stickerRight: {
    position: 'absolute',
    top: 16,
    right: '28%',
    transform: [{ rotate: '14deg' }],
    zIndex: 0,
  },
  avatar: {
    width: 110,
    height: 110,
    borderRadius: 999,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },
  starAccent: {
    position: 'absolute',
    bottom: -4,
    right: -4,
  },
  cameraBadge: {
    position: 'absolute',
    bottom: -2,
    left: -2,
    width: 28,
    height: 28,
    borderRadius: 999,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
})

// ─── Main Component ────────────────────────────────────────────────────────

export default function PersonalProfile() {
  const { colors, isDark } = useTheme()
  const insets = useSafeAreaInsets()
  const toast = useSavedToast()

  const [name, setName] = useState('')
  const [photoUrl, setPhotoUrl] = useState<string | null>(null)
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
      .select('name, photo_url, location, language, health_notes, allergies')
      .eq('id', session.user.id)
      .single()

    if (data) {
      setName(data.name ?? '')
      setPhotoUrl(data.photo_url ?? null)
      setLocation(data.location ?? '')
      setLanguage(data.language ?? 'en')
      setHealthNotes(data.health_notes ?? '')
      setAllergies(data.allergies ?? [])
    }
  }

  async function uploadPhoto(localUri: string): Promise<string> {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) throw new Error('Not authenticated')

    const ext = localUri.split('.').pop()?.split('?')[0] ?? 'jpg'
    const path = `profiles/${session.user.id}/${Date.now()}.${ext}`
    const response = await fetch(localUri)
    const blob = await response.blob()

    const { error } = await supabase.storage
      .from('garage-photos')
      .upload(path, blob, { contentType: `image/${ext}`, upsert: true })

    if (error) throw error
    const { data } = supabase.storage.from('garage-photos').getPublicUrl(path)
    return data.publicUrl
  }

  async function handleAvatarChange(value: string | null) {
    // Icon values ("icon:bear") or removal (null) are saved directly — no upload needed.
    if (value === null || isIconAvatar(value)) {
      setPhotoUrl(value)
      return
    }
    setPhotoUrl(value) // optimistic (local URI)
    try {
      const url = await uploadPhoto(value)
      setPhotoUrl(url)
    } catch (e: any) {
      Alert.alert('Upload failed', e.message)
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
        photo_url: photoUrl,
        location: location || null,
        language,
        health_notes: healthNotes || null,
        allergies,
      }, { onConflict: 'id' })

      if (error) throw error
      toast.show({
        title: 'Saved',
        message: 'Your profile has been updated.',
        autoDismiss: 1600,
      })
      // Let the toast breathe before the screen pops
      setTimeout(() => router.back(), 900)
    } catch (e: any) {
      Alert.alert('Error', e.message)
    } finally {
      setSaving(false)
    }
  }

  const initial = (name.trim()[0] ?? 'I').toUpperCase()
  const accentColor = isDark ? '#C4B5EF' : '#B7A6E8'

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      <View style={[styles.headerWrap, { paddingTop: insets.top + 8 }]}>
        <ScreenHeader title="My Profile" />
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
          {/* Hero with photo / initial avatar */}
          <PhotoAvatar
            value={photoUrl}
            initial={initial}
            accentColor={accentColor}
            onChange={handleAvatarChange}
          />
          <Display size={28} align="center" color={colors.text}>
            {name || 'Your name'}
          </Display>
          <Body
            size={13}
            align="center"
            color={colors.textMuted}
            style={{ marginTop: 4, marginBottom: 8 }}
          >
            Tap the avatar to change photo or pick an icon
          </Body>

          <View style={styles.divider}>
            <View style={[styles.dividerLine, { backgroundColor: colors.borderLight }]} />
            <MonoCaps color={colors.textMuted}>About you</MonoCaps>
            <View style={[styles.dividerLine, { backgroundColor: colors.borderLight }]} />
          </View>

          {/* Name */}
          <PaperField
            label="Name"
            value={name}
            onChangeText={setName}
            placeholder="Your name"
          />

          {/* Location */}
          <LocationField value={location} onChange={setLocation} />

          {/* Language */}
          <LanguageField value={language} onChange={setLanguage} />

          <View style={styles.divider}>
            <View style={[styles.dividerLine, { backgroundColor: colors.borderLight }]} />
            <MonoCaps color={colors.textMuted}>Health</MonoCaps>
            <View style={[styles.dividerLine, { backgroundColor: colors.borderLight }]} />
          </View>

          {/* Health Notes */}
          <PaperField
            label="Health Notes"
            value={healthNotes}
            onChangeText={setHealthNotes}
            placeholder="e.g. Gestational diabetes, hypothyroidism, asthma..."
            multiline
          />

          {/* Allergies */}
          <AllergyField value={allergies} onChange={setAllergies} />

          <PillButton
            label={saving ? 'Saving…' : 'Save Changes'}
            variant="ink"
            onPress={handleSave}
            disabled={saving}
            leading={
              <Ionicons
                name="checkmark-circle"
                size={18}
                color={isDark ? '#1A1713' : '#F3ECD9'}
              />
            }
            style={{ marginTop: 16 }}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  )
}

// ─── Reusable paper-field ─────────────────────────────────────────────────

function PaperField({
  label,
  value,
  onChangeText,
  placeholder,
  multiline,
}: {
  label: string
  value: string
  onChangeText: (t: string) => void
  placeholder: string
  multiline?: boolean
}) {
  const { colors, font, isDark } = useTheme()
  const paper = isDark ? colors.surface : '#FFFEF8'
  const border = isDark ? colors.border : 'rgba(20,19,19,0.08)'
  return (
    <View style={styles.field}>
      <MonoCaps color={colors.textMuted}>{label}</MonoCaps>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        multiline={multiline}
        style={[
          styles.input,
          {
            color: colors.text,
            backgroundColor: paper,
            borderColor: border,
            fontFamily: font.body,
          },
          multiline && { height: 96, textAlignVertical: 'top', paddingTop: 14 },
        ]}
      />
    </View>
  )
}

// ─── Location autocomplete ────────────────────────────────────────────────

interface LocationResult {
  display_name: string
  place_id: number
}

function LocationField({
  value,
  onChange,
}: {
  value: string
  onChange: (v: string) => void
}) {
  const { colors, font, isDark } = useTheme()
  const paper = isDark ? colors.surface : '#FFFEF8'
  const border = isDark ? colors.border : 'rgba(20,19,19,0.08)'
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
      <MonoCaps color={colors.textMuted}>Location</MonoCaps>
      <View
        style={[
          styles.inputRow,
          { backgroundColor: paper, borderColor: border },
        ]}
      >
        <Ionicons name="location-outline" size={18} color={colors.textMuted} />
        <TextInput
          value={query}
          onChangeText={search}
          placeholder="Search city or country…"
          placeholderTextColor={colors.textMuted}
          style={[styles.inputInner, { color: colors.text, fontFamily: font.body }]}
          onFocus={() => { if (results.length > 0) setShowResults(true) }}
          onBlur={() => setTimeout(() => setShowResults(false), 200)}
        />
        {query.length > 0 && (
          <Pressable
            onPress={() => {
              setQuery('')
              onChange('')
              setResults([])
              setShowResults(false)
            }}
          >
            <Ionicons name="close" size={16} color={colors.textMuted} />
          </Pressable>
        )}
      </View>
      {showResults && (
        <View
          style={[
            styles.dropdownAbsolute,
            { backgroundColor: paper, borderColor: border },
          ]}
        >
          {results.map((item) => (
            <Pressable
              key={item.place_id}
              onPress={() => selectLocation(item)}
              style={({ pressed }) => [
                styles.dropdownItem,
                pressed && { backgroundColor: colors.surfaceRaised },
              ]}
            >
              <Ionicons
                name="location-outline"
                size={14}
                color={colors.textSecondary}
              />
              <Body
                size={14}
                color={colors.text}
                numberOfLines={2}
                style={{ flex: 1 }}
              >
                {item.display_name}
              </Body>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  )
}

// ─── Language picker (modal) ──────────────────────────────────────────────

function LanguageField({
  value,
  onChange,
}: {
  value: string
  onChange: (v: string) => void
}) {
  const { colors, font, isDark } = useTheme()
  const paper = isDark ? colors.surface : '#FFFEF8'
  const border = isDark ? colors.border : 'rgba(20,19,19,0.08)'
  const insets = useSafeAreaInsets()

  const [modalVisible, setModalVisible] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const current = LANGUAGES.find((l) => l.code === value)
  const filtered = searchQuery
    ? LANGUAGES.filter(
        (l) =>
          l.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
          l.code.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : LANGUAGES

  return (
    <View style={styles.field}>
      <MonoCaps color={colors.textMuted}>Language</MonoCaps>
      <Pressable
        onPress={() => setModalVisible(true)}
        style={[
          styles.inputRow,
          { backgroundColor: paper, borderColor: border },
        ]}
      >
        <Ionicons name="globe-outline" size={18} color={colors.textMuted} />
        <Body
          size={15}
          color={colors.text}
          style={{ flex: 1, fontFamily: font.body }}
        >
          {current ? `${current.label} (${current.code})` : value}
        </Body>
        <Ionicons name="chevron-down" size={18} color={colors.textMuted} />
      </Pressable>

      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={[styles.modalRoot, { backgroundColor: colors.bg }]}>
          <View style={[styles.modalHeader, { paddingTop: insets.top + 8 }]}>
            <Display size={20} color={colors.text}>
              Select Language
            </Display>
            <Pressable
              onPress={() => {
                setModalVisible(false)
                setSearchQuery('')
              }}
            >
              <Ionicons name="close" size={24} color={colors.text} />
            </Pressable>
          </View>

          <View
            style={[
              styles.searchBar,
              { backgroundColor: paper, borderColor: border },
            ]}
          >
            <Ionicons name="search" size={18} color={colors.textMuted} />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search language…"
              placeholderTextColor={colors.textMuted}
              style={[
                styles.inputInner,
                { color: colors.text, fontFamily: font.body },
              ]}
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
                    isSelected && { backgroundColor: colors.surfaceRaised },
                    pressed && { opacity: 0.7 },
                  ]}
                >
                  <View style={{ flex: 1 }}>
                    <Body size={16} color={colors.text} style={{ fontFamily: font.bodySemiBold }}>
                      {item.label}
                    </Body>
                    <Body size={13} color={colors.textMuted}>
                      {item.code}
                    </Body>
                  </View>
                  {isSelected && (
                    <Ionicons
                      name="checkmark"
                      size={20}
                      color={colors.text}
                    />
                  )}
                </Pressable>
              )
            }}
          />
        </View>
      </Modal>
    </View>
  )
}

// ─── Allergies (chips + autocomplete) ─────────────────────────────────────

function AllergyField({
  value,
  onChange,
}: {
  value: string[]
  onChange: (v: string[]) => void
}) {
  const { colors, font, stickers, isDark } = useTheme()
  const paper = isDark ? colors.surface : '#FFFEF8'
  const border = isDark ? colors.border : 'rgba(20,19,19,0.08)'
  const chipBg = stickers.coral + (isDark ? '24' : '22')
  const chipFg = isDark ? stickers.coral : '#B43E2E'

  const [query, setQuery] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)

  const suggestions =
    query.length >= 1
      ? COMMON_ALLERGIES.filter(
          (a) =>
            a.toLowerCase().includes(query.toLowerCase()) &&
            !value.includes(a)
        ).slice(0, 6)
      : []

  function addAllergy(allergy: string) {
    if (!value.includes(allergy)) onChange([...value, allergy])
    setQuery('')
    setShowSuggestions(false)
  }

  function removeAllergy(allergy: string) {
    onChange(value.filter((a) => a !== allergy))
  }

  function handleSubmit() {
    const trimmed = query.trim()
    if (trimmed && !value.includes(trimmed)) onChange([...value, trimmed])
    setQuery('')
    setShowSuggestions(false)
  }

  return (
    <View style={styles.field}>
      <MonoCaps color={colors.textMuted}>Allergies</MonoCaps>

      {value.length > 0 && (
        <View style={styles.chipWrap}>
          {value.map((a) => (
            <View
              key={a}
              style={[styles.chip, { backgroundColor: chipBg }]}
            >
              <Body size={13} color={chipFg} style={{ fontFamily: font.bodySemiBold }}>
                {a}
              </Body>
              <Pressable onPress={() => removeAllergy(a)} hitSlop={6}>
                <Ionicons name="close" size={14} color={chipFg} />
              </Pressable>
            </View>
          ))}
        </View>
      )}

      <View
        style={[
          styles.inputRow,
          { backgroundColor: paper, borderColor: border },
        ]}
      >
        <Ionicons name="search" size={18} color={colors.textMuted} />
        <TextInput
          value={query}
          onChangeText={(t) => {
            setQuery(t)
            setShowSuggestions(t.length >= 1)
          }}
          placeholder="Type to search allergies…"
          placeholderTextColor={colors.textMuted}
          style={[styles.inputInner, { color: colors.text, fontFamily: font.body }]}
          onSubmitEditing={handleSubmit}
          returnKeyType="done"
          onFocus={() => {
            if (query.length >= 1) setShowSuggestions(true)
          }}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
        />
      </View>

      {showSuggestions && query.trim().length > 0 && (
        <View
          style={[
            styles.dropdown,
            { backgroundColor: paper, borderColor: border },
          ]}
        >
          {suggestions.map((s) => (
            <Pressable
              key={s}
              onPress={() => addAllergy(s)}
              style={({ pressed }) => [
                styles.dropdownItem,
                pressed && { backgroundColor: colors.surfaceRaised },
              ]}
            >
              <Body size={14} color={colors.text} style={{ flex: 1 }}>
                {s}
              </Body>
            </Pressable>
          ))}
          {!value.includes(query.trim()) && (
            <Pressable
              onPress={handleSubmit}
              style={({ pressed }) => [
                styles.dropdownItem,
                {
                  borderTopWidth: suggestions.length > 0 ? 1 : 0,
                  borderTopColor: border,
                },
                pressed && { backgroundColor: colors.surfaceRaised },
              ]}
            >
              <Body
                size={14}
                color={colors.text}
                style={{ flex: 1, fontFamily: font.bodySemiBold }}
              >
                + Add &quot;{query.trim()}&quot;
              </Body>
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
  headerWrap: { paddingHorizontal: 16, paddingBottom: 6 },
  scroll: { paddingHorizontal: 20, paddingBottom: 60, gap: 14 },

  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 18,
    marginBottom: 4,
  },
  dividerLine: { flex: 1, height: 1 },

  field: { gap: 8 },
  input: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 18,
    height: 56,
    fontSize: 15,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    height: 56,
    gap: 10,
  },
  inputInner: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 0,
  },

  dropdown: {
    borderWidth: 1,
    borderRadius: 20,
    marginTop: 4,
    overflow: 'hidden',
    maxHeight: 260,
  },
  dropdownAbsolute: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    borderWidth: 1,
    borderRadius: 20,
    marginTop: 4,
    overflow: 'hidden',
    maxHeight: 260,
    shadowColor: '#141313',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 16,
    elevation: 8,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 10,
  },

  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingLeft: 12,
    paddingRight: 8,
    borderRadius: 999,
  },

  modalRoot: { flex: 1 },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 14,
    height: 50,
    gap: 10,
  },
  langRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
  },
})
