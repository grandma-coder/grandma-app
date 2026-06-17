import { useEffect, useMemo, useState } from 'react'
import { View, Text, ScrollView, Image, Pressable, StyleSheet } from 'react-native'
import { useLocalSearchParams, router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { getListingById, type Listing } from '../../lib/exchange'
import { CosmicBackground } from '../../components/ui/CosmicBackground'
import { PaperCard } from '../../components/ui/PaperCard'
import { PillButton } from '../../components/ui/PillButton'
import { typography, spacing, borderRadius, useTheme } from '../../constants/theme'

export default function ListingDetail() {
  const { colors } = useTheme()
  const styles = useMemo(() => createStyles(colors), [colors])
  const insets = useSafeAreaInsets()
  const { id } = useLocalSearchParams<{ id: string }>()
  const [listing, setListing] = useState<Listing | null>(null)
  const [error, setError] = useState(false)

  function loadListing() {
    if (!id) return
    setError(false)
    getListingById(id)
      .then(setListing)
      .catch(() => setError(true))
  }

  useEffect(() => {
    loadListing()
  }, [id])

  if (error) {
    return (
      <CosmicBackground>
        <View style={[styles.container, { paddingTop: insets.top + 20, alignItems: 'center', justifyContent: 'center' }]}>
          <Text style={styles.loadingText}>Couldn’t load this listing.</Text>
          <Pressable onPress={loadListing} style={{ marginTop: 16, paddingVertical: 12, paddingHorizontal: 24, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.12)' }}>
            <Text style={styles.loadingText}>Retry</Text>
          </Pressable>
        </View>
      </CosmicBackground>
    )
  }

  if (!listing) {
    return (
      <CosmicBackground>
        <View style={[styles.container, { paddingTop: insets.top + 20 }]}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </CosmicBackground>
    )
  }

  const price = listing.priceCents
    ? `$${(listing.priceCents / 100).toFixed(2)}`
    : listing.listingType === 'donate' ? 'Free' : 'Trade'

  return (
    <CosmicBackground>
      <ScrollView
        contentContainerStyle={[
          styles.container,
          { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 24 },
        ]}
      >
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </Pressable>

        {/* Photos */}
        {listing.photos.length > 0 ? (
          <Image source={{ uri: listing.photos[0] }} style={styles.photo} resizeMode="cover" />
        ) : (
          <View style={styles.photoPlaceholder}>
            <Ionicons name="image-outline" size={48} color={colors.textMuted} />
          </View>
        )}

        <View style={styles.body}>
          <Text style={styles.title}>{listing.title}</Text>
          <Text style={styles.price}>{price}</Text>

          {listing.description && (
            <Text style={styles.description}>{listing.description}</Text>
          )}

          <View style={styles.metaGrid}>
            {listing.condition && (
              <View style={styles.metaItem}>
                <Ionicons name="checkmark-circle-outline" size={16} color={colors.textSecondary} />
                <Text style={styles.metaText}>{listing.condition.replace('_', ' ')}</Text>
              </View>
            )}
            {listing.ageRange && (
              <View style={styles.metaItem}>
                <Ionicons name="resize-outline" size={16} color={colors.textSecondary} />
                <Text style={styles.metaText}>{listing.ageRange}</Text>
              </View>
            )}
            {listing.locationText && (
              <View style={styles.metaItem}>
                <Ionicons name="location-outline" size={16} color={colors.textSecondary} />
                <Text style={styles.metaText}>{listing.locationText}</Text>
              </View>
            )}
          </View>

          <PillButton label="I'm Interested" variant="ink" onPress={() => {}} style={{ marginTop: 24 }} />

          {/* Comments section placeholder */}
          <PaperCard radius={28} padding={20} style={styles.commentSection}>
            <Text style={styles.commentTitle}>Comments</Text>
            <Text style={styles.commentPlaceholder}>
              Comments and deal discussions will appear here.
            </Text>
          </PaperCard>
        </View>
      </ScrollView>
    </CosmicBackground>
  )
}

const createStyles = (colors: ReturnType<typeof useTheme>['colors']) => StyleSheet.create({
  container: {
    paddingHorizontal: spacing['2xl'],
  },
  loadingText: {
    ...typography.bodySecondary,
    textAlign: 'center',
    marginTop: 100,
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
    marginBottom: 16,
  },
  photo: {
    width: '100%',
    height: 260,
    borderRadius: borderRadius.lg,
    marginBottom: 20,
  },
  photoPlaceholder: {
    width: '100%',
    height: 200,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  body: {},
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 6, fontFamily: 'Fraunces_600SemiBold' },
  price: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.accent,
    marginBottom: 14,
  },
  description: {
    fontSize: 15,
    color: colors.textSecondary,
    lineHeight: 22,
    marginBottom: 16,
  },
  metaGrid: {
    gap: 8,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  metaText: {
    fontSize: 14,
    color: colors.textSecondary,
    textTransform: 'capitalize',
  },
  commentSection: {
    marginTop: 24,
  },
  commentTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
  },
  commentPlaceholder: {
    fontSize: 13,
    color: colors.textMuted,
  },
})
