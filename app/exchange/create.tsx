import { useState } from 'react'
import {
  View, Text, TextInput, Pressable, ScrollView, Alert, StyleSheet,
  KeyboardAvoidingView, Platform,
} from 'react-native'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { createListing, type ListingType, type ListingCategory, type ListingCondition } from '../../lib/exchange'
import { useExchangeStore } from '../../store/useExchangeStore'
import { CosmicBackground } from '../../components/ui/CosmicBackground'
import { GradientButton } from '../../components/ui/GradientButton'
import { colors, typography, spacing, borderRadius } from '../../constants/theme'

const LISTING_TYPES: { id: ListingType; label: string; icon: string }[] = [
  { id: 'sell', label: 'Sell', icon: '💰' },
  { id: 'trade', label: 'Trade', icon: '🔄' },
  { id: 'donate', label: 'Donate', icon: '🎁' },
]

const CATEGORIES: { id: ListingCategory; label: string }[] = [
  { id: 'clothing', label: 'Clothing' },
  { id: 'toys', label: 'Toys' },
  { id: 'gear', label: 'Gear' },
  { id: 'furniture', label: 'Furniture' },
  { id: 'books', label: 'Books' },
  { id: 'other', label: 'Other' },
]

const CONDITIONS: { id: ListingCondition; label: string }[] = [
  { id: 'new', label: 'New' },
  { id: 'like_new', label: 'Like New' },
  { id: 'good', label: 'Good' },
  { id: 'fair', label: 'Fair' },
]

export default function CreateListing() {
  const insets = useSafeAreaInsets()
  const addListing = useExchangeStore((s) => s.addListing)

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [listingType, setListingType] = useState<ListingType>('sell')
  const [category, setCategory] = useState<ListingCategory>('clothing')
  const [condition, setCondition] = useState<ListingCondition>('good')
  const [price, setPrice] = useState('')
  const [loading, setLoading] = useState(false)

  async function handlePost() {
    if (!title.trim()) {
      Alert.alert('Required', 'Give your item a title')
      return
    }

    setLoading(true)
    try {
      const listing = await createListing({
        title: title.trim(),
        description: description.trim() || undefined,
        category,
        listingType,
        priceCents: price ? Math.round(parseFloat(price) * 100) : undefined,
        condition,
      })
      addListing(listing)
      router.back()
    } catch (e: any) {
      Alert.alert('Error', e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <CosmicBackground>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={[
            styles.container,
            { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 24 },
          ]}
          keyboardShouldPersistTaps="handled"
        >
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={colors.text} />
          </Pressable>

          <Text style={styles.title}>Post an Item</Text>
          <Text style={styles.subtitle}>Share with other parents in the garage</Text>

          {/* Listing type */}
          <Text style={styles.label}>TYPE</Text>
          <View style={styles.pillRow}>
            {LISTING_TYPES.map((t) => (
              <Pressable
                key={t.id}
                onPress={() => setListingType(t.id)}
                style={[styles.pill, listingType === t.id && styles.pillActive]}
              >
                <Text style={styles.pillIcon}>{t.icon}</Text>
                <Text style={[styles.pillLabel, listingType === t.id && styles.pillLabelActive]}>
                  {t.label}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* Title */}
          <Text style={styles.label}>TITLE *</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Baby Bjorn Carrier"
            placeholderTextColor={colors.textTertiary}
            value={title}
            onChangeText={setTitle}
          />

          {/* Description */}
          <Text style={styles.label}>DESCRIPTION</Text>
          <TextInput
            style={[styles.input, styles.inputMulti]}
            placeholder="Tell parents about the item..."
            placeholderTextColor={colors.textTertiary}
            value={description}
            onChangeText={setDescription}
            multiline
          />

          {/* Category */}
          <Text style={styles.label}>CATEGORY</Text>
          <View style={styles.pillRow}>
            {CATEGORIES.map((c) => (
              <Pressable
                key={c.id}
                onPress={() => setCategory(c.id)}
                style={[styles.pillSmall, category === c.id && styles.pillActive]}
              >
                <Text style={[styles.pillLabel, category === c.id && styles.pillLabelActive]}>
                  {c.label}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* Condition */}
          <Text style={styles.label}>CONDITION</Text>
          <View style={styles.pillRow}>
            {CONDITIONS.map((c) => (
              <Pressable
                key={c.id}
                onPress={() => setCondition(c.id)}
                style={[styles.pillSmall, condition === c.id && styles.pillActive]}
              >
                <Text style={[styles.pillLabel, condition === c.id && styles.pillLabelActive]}>
                  {c.label}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* Price */}
          {listingType === 'sell' && (
            <>
              <Text style={styles.label}>PRICE ($)</Text>
              <TextInput
                style={styles.input}
                placeholder="0.00"
                placeholderTextColor={colors.textTertiary}
                value={price}
                onChangeText={setPrice}
                keyboardType="decimal-pad"
              />
            </>
          )}

          <GradientButton
            title="Post to Garage"
            onPress={handlePost}
            loading={loading}
            style={{ marginTop: 24 }}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </CosmicBackground>
  )
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing['2xl'],
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surfaceGlass,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 24,
  },
  title: {
    ...typography.heading,
    marginBottom: 4,
  },
  subtitle: {
    ...typography.bodySecondary,
    marginBottom: 28,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textTertiary,
    letterSpacing: 1,
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    backgroundColor: colors.surfaceGlass,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    padding: 14,
    fontSize: 15,
    color: colors.text,
  },
  inputMulti: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surfaceGlass,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pillSmall: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surfaceGlass,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pillActive: {
    borderColor: colors.accent,
    backgroundColor: colors.accentMuted,
  },
  pillIcon: {
    fontSize: 14,
  },
  pillLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textTertiary,
  },
  pillLabelActive: {
    color: colors.accent,
  },
})
