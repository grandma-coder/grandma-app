import { useEffect } from 'react'
import { View, Text, FlatList, Pressable, StyleSheet } from 'react-native'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { getListings } from '../../lib/exchange'
import { useExchangeStore } from '../../store/useExchangeStore'
import { CosmicBackground } from '../../components/ui/CosmicBackground'
import { GradientButton } from '../../components/ui/GradientButton'
import { ListingCard } from '../../components/exchange/ListingCard'
import { colors, typography, spacing, borderRadius } from '../../constants/theme'
import type { Listing } from '../../lib/exchange'

export default function Exchange() {
  const insets = useSafeAreaInsets()
  const { listings, savedIds, loading, setListings, toggleSaved, setLoading } = useExchangeStore()

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
      <View style={[styles.container, { paddingTop: insets.top + 16 }]}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Grandma's Garage</Text>
            <Text style={styles.subtitle}>Trade, sell, or donate baby items</Text>
          </View>
          <Pressable
            onPress={() => router.push('/exchange/create')}
            style={styles.addBtn}
          >
            <Ionicons name="add" size={22} color={colors.textOnAccent} />
          </Pressable>
        </View>

        {/* Filter pills */}
        <View style={styles.filters}>
          {['All', 'Sell', 'Trade', 'Free'].map((f) => (
            <Pressable key={f} style={styles.filterPill}>
              <Text style={styles.filterText}>{f}</Text>
            </Pressable>
          ))}
        </View>

        {listings.length === 0 && !loading ? (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>🏷️</Text>
            <Text style={styles.emptyTitle}>No listings yet</Text>
            <Text style={styles.emptySubtitle}>
              Be the first to post! Share baby items you no longer need.
            </Text>
            <GradientButton
              title="Post Your First Item"
              onPress={() => router.push('/exchange/create')}
              style={{ marginTop: 20 }}
            />
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
    alignItems: 'center',
    paddingHorizontal: spacing['2xl'],
    marginBottom: 16,
  },
  title: {
    ...typography.heading,
    marginBottom: 2,
  },
  subtitle: {
    ...typography.caption,
  },
  addBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filters: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: spacing['2xl'],
    marginBottom: 16,
  },
  filterPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surfaceGlass,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  list: {
    paddingHorizontal: spacing['2xl'],
    paddingBottom: 40,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  emptyIcon: {
    fontSize: 56,
    marginBottom: 16,
  },
  emptyTitle: {
    ...typography.title,
    marginBottom: 8,
  },
  emptySubtitle: {
    ...typography.bodySecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
})
