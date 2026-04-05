/**
 * F2 — Grandma Garage Screen
 *
 * Search + filters + 2-column grid + FAB.
 * Create listing via 5-step bottom sheet.
 */

import { useState, useEffect, useCallback } from 'react'
import {
  View,
  Text,
  TextInput,
  Pressable,
  FlatList,
  Image,
  ScrollView,
  Alert,
  StyleSheet,
  ActivityIndicator,
} from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import { router } from 'expo-router'
import {
  Search,
  SlidersHorizontal,
  Plus,
  Camera,
  X,
  Check,
  MapPin,
  User,
} from 'lucide-react-native'
import { useTheme, brand } from '../../constants/theme'
import { useModeStore } from '../../store/useModeStore'
import { getModeConfig } from '../../lib/modeConfig'
import { fetchListings, createListing, type GarageListing } from '../../lib/garage'
import { LogSheet } from '../calendar/LogSheet'

// ─── Constants ─────────────────────────────────────────────────────────────

const CATEGORIES = ['All', 'Free', 'Clothing', 'Gear', 'Furniture', 'Toys', 'Books', 'Other']
const CONDITIONS = ['New', 'Like New', 'Good', 'Fair', 'Well Loved']

// ─── Main Component ────────────────────────────────────────────────────────

export function GarageScreen() {
  const { colors, radius } = useTheme()

  const [listings, setListings] = useState<GarageListing[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [activeFilter, setActiveFilter] = useState('All')
  const [showCreate, setShowCreate] = useState(false)

  useEffect(() => {
    loadListings()
  }, [activeFilter])

  async function loadListings() {
    setLoading(true)
    try {
      const category = activeFilter === 'Free' ? undefined : activeFilter
      const data = await fetchListings(category, search || undefined)
      const filtered = activeFilter === 'Free' ? data.filter((l) => l.is_free) : data
      setListings(filtered)
    } catch {} finally {
      setLoading(false)
    }
  }

  function handleSearch() {
    loadListings()
  }

  return (
    <View style={styles.root}>
      {/* Search bar */}
      <View style={[styles.searchRow, { paddingHorizontal: 20 }]}>
        <View style={[styles.searchBar, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg }]}>
          <Search size={18} color={colors.textMuted} strokeWidth={2} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            onSubmitEditing={handleSearch}
            placeholder="Search listings..."
            placeholderTextColor={colors.textMuted}
            returnKeyType="search"
            style={[styles.searchInput, { color: colors.text }]}
          />
        </View>
      </View>

      {/* Filter chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterBar}
      >
        {CATEGORIES.map((f) => (
          <Pressable
            key={f}
            onPress={() => setActiveFilter(f)}
            style={[
              styles.filterChip,
              {
                backgroundColor: activeFilter === f ? colors.primaryTint : colors.surface,
                borderColor: activeFilter === f ? colors.primary : colors.border,
                borderRadius: radius.full,
              },
            ]}
          >
            <Text style={[styles.filterText, { color: activeFilter === f ? colors.primary : colors.textSecondary }]}>
              {f}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* Grid */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : listings.length === 0 ? (
        <View style={styles.center}>
          <Search size={36} color={colors.textMuted} strokeWidth={1.5} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No listings found</Text>
          <Text style={[styles.emptyBody, { color: colors.textSecondary }]}>
            Try a different filter or list your first item!
          </Text>
        </View>
      ) : (
        <FlatList
          data={listings}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={styles.gridRow}
          contentContainerStyle={styles.gridContent}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => <ListingCard item={item} />}
        />
      )}

      {/* FAB */}
      <Pressable
        onPress={() => setShowCreate(true)}
        style={({ pressed }) => [
          styles.fab,
          { backgroundColor: colors.primary, borderRadius: radius.full },
          pressed && { transform: [{ scale: 0.95 }] },
        ]}
      >
        <Plus size={24} color="#FFFFFF" strokeWidth={2.5} />
      </Pressable>

      {/* Create sheet */}
      <CreateListingSheet
        visible={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={() => { setShowCreate(false); loadListings() }}
      />
    </View>
  )
}

// ─── Listing Card ──────────────────────────────────────────────────────────

function ListingCard({ item }: { item: GarageListing }) {
  const { colors, radius } = useTheme()
  const hasPhoto = item.photos.length > 0

  return (
    <Pressable
      onPress={() => router.push(`/garage/${item.id}` as any)}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: colors.surface, borderRadius: radius.xl },
        pressed && { opacity: 0.9 },
      ]}
    >
      {/* Photo */}
      {hasPhoto ? (
        <Image source={{ uri: item.photos[0] }} style={[styles.cardPhoto, { borderRadius: radius.lg }]} />
      ) : (
        <View style={[styles.cardPhotoPlaceholder, { backgroundColor: colors.surfaceRaised, borderRadius: radius.lg }]}>
          <Text style={{ fontSize: 28 }}>📦</Text>
        </View>
      )}

      {/* Condition badge */}
      {item.condition && (
        <View style={[styles.conditionBadge, { backgroundColor: colors.surfaceGlass, borderRadius: radius.sm }]}>
          <Text style={[styles.conditionText, { color: colors.textSecondary }]}>{item.condition}</Text>
        </View>
      )}

      {/* Info */}
      <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={1}>
        {item.title}
      </Text>

      <Text style={[styles.cardPrice, { color: item.is_free ? brand.success : colors.primary }]}>
        {item.is_free ? 'FREE' : `$${item.price}`}
      </Text>

      {/* Location */}
      {item.location && (
        <View style={styles.locationRow}>
          <MapPin size={12} color={colors.textMuted} strokeWidth={2} />
          <Text style={[styles.locationText, { color: colors.textMuted }]} numberOfLines={1}>
            {item.location}
          </Text>
        </View>
      )}
    </Pressable>
  )
}

// ─── Create Listing Sheet (5-step) ────────────────────────────────────────

function CreateListingSheet({
  visible,
  onClose,
  onCreated,
}: {
  visible: boolean
  onClose: () => void
  onCreated: () => void
}) {
  const { colors, radius } = useTheme()

  const [step, setStep] = useState(1)
  const [photos, setPhotos] = useState<string[]>([])
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState<string | null>(null)
  const [condition, setCondition] = useState<string | null>(null)
  const [price, setPrice] = useState('')
  const [isFree, setIsFree] = useState(false)
  const [description, setDescription] = useState('')
  const [sizeRange, setSizeRange] = useState('')
  const [saving, setSaving] = useState(false)

  function reset() {
    setStep(1); setPhotos([]); setTitle(''); setCategory(null)
    setCondition(null); setPrice(''); setIsFree(false)
    setDescription(''); setSizeRange('')
  }

  function handleClose() { reset(); onClose() }

  async function pickPhotos() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      quality: 0.7,
      selectionLimit: 6,
    })
    if (!result.canceled) {
      setPhotos((prev) => [...prev, ...result.assets.map((a) => a.uri)].slice(0, 6))
    }
  }

  async function takePhoto() {
    const perm = await ImagePicker.requestCameraPermissionsAsync()
    if (!perm.granted) return Alert.alert('Permission needed')
    const result = await ImagePicker.launchCameraAsync({ quality: 0.7 })
    if (!result.canceled && result.assets[0]) {
      setPhotos((prev) => [...prev, result.assets[0].uri].slice(0, 6))
    }
  }

  async function publish() {
    if (!title || !category) return
    setSaving(true)
    try {
      await createListing({
        title,
        description: description || undefined,
        category,
        condition: condition ?? undefined,
        price: isFree ? 0 : parseFloat(price) || 0,
        is_free: isFree,
        size_range: sizeRange || undefined,
        photos,
      })
      reset()
      onCreated()
    } catch (e: any) {
      Alert.alert('Error', e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <LogSheet visible={visible} title={`List an Item (${step}/5)`} onClose={handleClose}>
      <ScrollView style={{ maxHeight: 450 }} showsVerticalScrollIndicator={false}>
        <View style={createStyles.form}>
          {/* Step 1: Photos */}
          {step === 1 && (
            <>
              <Text style={[createStyles.hint, { color: colors.textSecondary }]}>
                Add up to 6 photos of your item
              </Text>
              <View style={createStyles.photoGrid}>
                {photos.map((uri, i) => (
                  <View key={i} style={{ position: 'relative' }}>
                    <Image source={{ uri }} style={[createStyles.photoThumb, { borderRadius: radius.lg }]} />
                    <Pressable
                      onPress={() => setPhotos((p) => p.filter((_, j) => j !== i))}
                      style={[createStyles.removePhoto, { backgroundColor: brand.error }]}
                    >
                      <X size={12} color="#FFF" />
                    </Pressable>
                  </View>
                ))}
                {photos.length < 6 && (
                  <>
                    <Pressable onPress={takePhoto} style={[createStyles.addPhotoBtn, { backgroundColor: colors.primary, borderRadius: radius.lg }]}>
                      <Camera size={24} color="#FFF" strokeWidth={2} />
                    </Pressable>
                    <Pressable onPress={pickPhotos} style={[createStyles.addPhotoBtn, { backgroundColor: colors.surfaceRaised, borderColor: colors.border, borderRadius: radius.lg, borderWidth: 1, borderStyle: 'dashed' }]}>
                      <Plus size={24} color={colors.textMuted} strokeWidth={2} />
                    </Pressable>
                  </>
                )}
              </View>
              <StepButton label="Next" onPress={() => setStep(2)} disabled={photos.length === 0} />
            </>
          )}

          {/* Step 2: Title + Category */}
          {step === 2 && (
            <>
              <TextInput
                value={title}
                onChangeText={setTitle}
                placeholder="Item name"
                placeholderTextColor={colors.textMuted}
                style={[createStyles.input, { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg }]}
              />
              <Text style={[createStyles.label, { color: colors.textMuted }]}>CATEGORY</Text>
              <View style={createStyles.chipGrid}>
                {CATEGORIES.filter((c) => c !== 'All' && c !== 'Free').map((c) => (
                  <Pressable
                    key={c}
                    onPress={() => setCategory(c)}
                    style={[createStyles.chip, {
                      backgroundColor: category === c ? colors.primaryTint : colors.surface,
                      borderColor: category === c ? colors.primary : colors.border,
                      borderRadius: radius.full,
                    }]}
                  >
                    <Text style={[createStyles.chipText, { color: category === c ? colors.primary : colors.text }]}>{c}</Text>
                  </Pressable>
                ))}
              </View>
              <StepButton label="Next" onPress={() => setStep(3)} disabled={!title || !category} />
            </>
          )}

          {/* Step 3: Condition + Price */}
          {step === 3 && (
            <>
              <Text style={[createStyles.label, { color: colors.textMuted }]}>CONDITION</Text>
              <View style={createStyles.chipGrid}>
                {CONDITIONS.map((c) => (
                  <Pressable
                    key={c}
                    onPress={() => setCondition(c)}
                    style={[createStyles.chip, {
                      backgroundColor: condition === c ? colors.primaryTint : colors.surface,
                      borderColor: condition === c ? colors.primary : colors.border,
                      borderRadius: radius.full,
                    }]}
                  >
                    <Text style={[createStyles.chipText, { color: condition === c ? colors.primary : colors.text }]}>{c}</Text>
                  </Pressable>
                ))}
              </View>

              {/* Free toggle */}
              <Pressable
                onPress={() => setIsFree(!isFree)}
                style={[createStyles.freeToggle, {
                  backgroundColor: isFree ? brand.success + '15' : colors.surface,
                  borderColor: isFree ? brand.success : colors.border,
                  borderRadius: radius.lg,
                }]}
              >
                {isFree && <Check size={16} color={brand.success} strokeWidth={3} />}
                <Text style={[createStyles.freeText, { color: isFree ? brand.success : colors.text }]}>
                  Give away for free
                </Text>
              </Pressable>

              {!isFree && (
                <View style={[createStyles.priceRow, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg }]}>
                  <Text style={[createStyles.priceSymbol, { color: colors.textSecondary }]}>$</Text>
                  <TextInput
                    value={price}
                    onChangeText={setPrice}
                    placeholder="0.00"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="decimal-pad"
                    style={[createStyles.priceInput, { color: colors.text }]}
                  />
                </View>
              )}
              <StepButton label="Next" onPress={() => setStep(4)} />
            </>
          )}

          {/* Step 4: Description + Size */}
          {step === 4 && (
            <>
              <TextInput
                value={description}
                onChangeText={setDescription}
                placeholder="Describe your item..."
                placeholderTextColor={colors.textMuted}
                multiline
                style={[createStyles.textArea, { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg }]}
              />
              <TextInput
                value={sizeRange}
                onChangeText={setSizeRange}
                placeholder="Size / age range (e.g. 6-12 months)"
                placeholderTextColor={colors.textMuted}
                style={[createStyles.input, { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg }]}
              />
              <StepButton label="Next" onPress={() => setStep(5)} />
            </>
          )}

          {/* Step 5: Confirm */}
          {step === 5 && (
            <>
              <View style={[createStyles.summary, { backgroundColor: colors.surfaceRaised, borderRadius: radius.xl }]}>
                {photos.length > 0 && (
                  <Image source={{ uri: photos[0] }} style={[createStyles.summaryPhoto, { borderRadius: radius.lg }]} />
                )}
                <Text style={[createStyles.summaryTitle, { color: colors.text }]}>{title}</Text>
                <Text style={[createStyles.summaryPrice, { color: isFree ? brand.success : colors.primary }]}>
                  {isFree ? 'FREE' : `$${price || '0'}`}
                </Text>
                <Text style={[createStyles.summaryMeta, { color: colors.textMuted }]}>
                  {category} {condition ? `— ${condition}` : ''}
                </Text>
              </View>
              <StepButton label={saving ? 'Publishing...' : 'Publish'} onPress={publish} disabled={saving} />
            </>
          )}
        </View>
      </ScrollView>
    </LogSheet>
  )
}

function StepButton({ label, onPress, disabled }: { label: string; onPress: () => void; disabled?: boolean }) {
  const { colors, radius } = useTheme()
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        createStyles.stepBtn,
        { backgroundColor: colors.primary, borderRadius: radius.lg, opacity: disabled ? 0.4 : 1 },
        pressed && !disabled && { transform: [{ scale: 0.98 }] },
      ]}
    >
      <Text style={createStyles.stepBtnText}>{label}</Text>
    </Pressable>
  )
}

// ─── Styles ────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1 },
  searchRow: { marginBottom: 12 },
  searchBar: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, height: 48, borderWidth: 1 },
  searchInput: { flex: 1, fontSize: 15, fontWeight: '500' },
  filterBar: { gap: 8, paddingHorizontal: 20, paddingBottom: 12 },
  filterChip: { paddingVertical: 7, paddingHorizontal: 16, borderWidth: 1 },
  filterText: { fontSize: 13, fontWeight: '600' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingTop: 40 },
  emptyTitle: { fontSize: 18, fontWeight: '700' },
  emptyBody: { fontSize: 14, fontWeight: '500', textAlign: 'center' },
  gridContent: { paddingHorizontal: 20, paddingBottom: 100 },
  gridRow: { gap: 12, marginBottom: 12 },

  // Card
  card: { flex: 1, padding: 10, gap: 6, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  cardPhoto: { width: '100%', height: 110, resizeMode: 'cover' },
  cardPhotoPlaceholder: { width: '100%', height: 110, alignItems: 'center', justifyContent: 'center' },
  conditionBadge: { position: 'absolute', top: 16, right: 16, paddingVertical: 2, paddingHorizontal: 6 },
  conditionText: { fontSize: 10, fontWeight: '700' },
  cardTitle: { fontSize: 14, fontWeight: '600' },
  cardPrice: { fontSize: 16, fontWeight: '800' },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  locationText: { fontSize: 11, fontWeight: '500' },

  // FAB
  fab: { position: 'absolute', bottom: 24, right: 20, width: 56, height: 56, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 12, elevation: 8 },
})

const createStyles = StyleSheet.create({
  form: { gap: 16, paddingBottom: 8 },
  hint: { fontSize: 14, fontWeight: '500' },
  label: { fontSize: 12, fontWeight: '700', letterSpacing: 1 },
  input: { borderWidth: 1, paddingHorizontal: 16, height: 48, fontSize: 15, fontWeight: '500' },
  textArea: { borderWidth: 1, padding: 16, fontSize: 15, fontWeight: '500', minHeight: 100, textAlignVertical: 'top' },
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingVertical: 8, paddingHorizontal: 14, borderWidth: 1 },
  chipText: { fontSize: 13, fontWeight: '600' },
  photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  photoThumb: { width: 80, height: 80 },
  removePhoto: { position: 'absolute', top: -4, right: -4, width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  addPhotoBtn: { width: 80, height: 80, alignItems: 'center', justifyContent: 'center' },
  freeToggle: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 14, paddingHorizontal: 16, borderWidth: 1 },
  freeText: { fontSize: 15, fontWeight: '600' },
  priceRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, paddingHorizontal: 16, height: 56 },
  priceSymbol: { fontSize: 20, fontWeight: '700', marginRight: 4 },
  priceInput: { flex: 1, fontSize: 24, fontWeight: '800' },
  summary: { alignItems: 'center', padding: 20, gap: 8 },
  summaryPhoto: { width: 120, height: 120, marginBottom: 8 },
  summaryTitle: { fontSize: 18, fontWeight: '700' },
  summaryPrice: { fontSize: 22, fontWeight: '900' },
  summaryMeta: { fontSize: 13, fontWeight: '500' },
  stepBtn: { height: 48, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  stepBtnText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
})
