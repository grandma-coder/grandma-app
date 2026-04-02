import { useEffect, useState } from 'react'
import { View, Text, FlatList, Pressable, StyleSheet } from 'react-native'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { LinearGradient } from 'expo-linear-gradient'
import { getListings } from '../../lib/exchange'
import { useExchangeStore } from '../../store/useExchangeStore'
import { CosmicBackground } from '../../components/ui/CosmicBackground'
import { ListingCard } from '../../components/exchange/ListingCard'
import { colors, THEME_COLORS, borderRadius, shadows, spacing, typography } from '../../constants/theme'
import type { Listing } from '../../lib/exchange'

const FILTERS = ['All', 'Sell', 'Trade', 'Free'] as const

export default function Exchange() {
  const insets = useSafeAreaInsets()
  const { listings, savedIds, loading, setListings, toggleSaved, setLoading } = useExchangeStore()
  const [activeFilter, setActiveFilter] = useState<string>('All')

  useEffect(() => {
    loadListings()
  }, [])

  async function loadListings() {
    setLoading(true)
    try {
      const data = await getListings()
      setListings(data)
    } catch {
      // silently fail — empty state handles it
    } finally {
      setLoading(false)
    }
  }

  function renderListing({ item }: { item: Listing }) {
    return (
      <ListingCard
        listing={item}
        saved={savedIds.has(item.id)}
        onPress={() => router.push(`/exchange/${item.id}`)}
        onSave={() => toggleSaved(item.id)}
      />
    )
  }

  return (
    <CosmicBackground>
      <View style={[styles.container, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 40 }]}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.label}>MARKETPLACE</Text>
            <Text style={styles.titleLine1}>Grandma's</Text>
            <Text style={styles.titleLine2}>Garage</Text>
          </View>
          <Pressable
            onPress={() => router.push('/exchange/create')}
            style={styles.addBtn}
          >
            <Ionicons name="add" size={24} color="#0A0A0A" />
          </Pressable>
        </View>

        {/* Filter pills */}
        <View style={styles.filters}>
          {FILTERS.map((f) => (
            <Pressable
              key={f}
              style={[
                styles.filterPill,
                activeFilter === f && styles.filterPillActive,
              ]}
              onPress={() => setActiveFilter(f)}
            >
              <Text
                style={[
                  styles.filterText,
                  activeFilter === f && styles.filterTextActive,
                ]}
              >
                {f}
              </Text>
            </Pressable>
          ))}
        </View>

        {listings.length === 0 && !loading ? (
          <View style={styles.empty}>
            {/* Floating placeholder cards */}
            <View style={styles.placeholderCards}>
              <View style={[styles.placeholderCard, styles.placeholderPink]}>
                <Ionicons name="help-outline" size={32} color={THEME_COLORS.pink} />
              </View>
              <View style={[styles.placeholderCard, styles.placeholderBlue]}>
                <Ionicons name="help-outline" size={32} color={THEME_COLORS.blue} />
              </View>
            </View>

            <Text style={styles.emptyTitle}>No listings yet</Text>
            <Text style={styles.emptySubtitle}>
              Be the first to post! Share baby items you no longer need with your community.
            </Text>

            <Pressable
              onPress={() => router.push('/exchange/create')}
              style={styles.gradientBtnWrap}
            >
              <LinearGradient
                colors={[THEME_COLORS.yellow, THEME_COLORS.orange]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.gradientBtn}
              >
                <Text style={styles.gradientBtnText}>Post Your First Item</Text>
              </LinearGradient>
            </Pressable>
          </View>
        ) : (
          <FlatList
            data={listings}
            renderItem={renderListing}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            onRefresh={loadListings}
            refreshing={loading}
          />
        )}
      </View>
    </CosmicBackground>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: spacing['2xl'],
    marginBottom: 20,
  },
  label: {
    ...typography.label,
    marginBottom: 4,
  },
  titleLine1: {
    fontSize: 36,
    fontWeight: '900',
    color: colors.text,
    letterSpacing: -0.8,
    textTransform: 'uppercase',
  },
  titleLine2: {
    fontSize: 36,
    fontWeight: '900',
    color: THEME_COLORS.yellow,
    letterSpacing: -0.8,
    textTransform: 'uppercase',
    marginTop: -4,
  },
  addBtn: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.full,
    backgroundColor: THEME_COLORS.yellow,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    ...shadows.glow,
  },
  filters: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: spacing['2xl'],
    marginBottom: 24,
  },
  filterPill: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surfaceGlass,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterPillActive: {
    backgroundColor: THEME_COLORS.yellow,
    borderColor: THEME_COLORS.yellow,
  },
  filterText: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  filterTextActive: {
    color: '#0A0A0A',
  },
  list: {
    paddingHorizontal: spacing['2xl'],
    paddingBottom: 40,
  },

  // Empty state
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  placeholderCards: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 32,
  },
  placeholderCard: {
    width: 120,
    height: 150,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  placeholderPink: {
    backgroundColor: 'rgba(255, 138, 216, 0.1)',
    borderColor: 'rgba(255, 138, 216, 0.2)',
    transform: [{ rotate: '-6deg' }],
  },
  placeholderBlue: {
    backgroundColor: 'rgba(77, 150, 255, 0.1)',
    borderColor: 'rgba(77, 150, 255, 0.2)',
    transform: [{ rotate: '6deg' }],
    marginTop: 20,
  },
  emptyTitle: {
    ...typography.title,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 28,
  },
  gradientBtnWrap: {
    borderRadius: borderRadius.full,
    overflow: 'hidden',
    ...shadows.glow,
  },
  gradientBtn: {
    paddingHorizontal: 32,
    paddingVertical: 18,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gradientBtnText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#0A0A0A',
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
})
