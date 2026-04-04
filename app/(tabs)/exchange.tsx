import { useEffect, useState } from 'react'
import { View, Text, FlatList, Pressable, StyleSheet } from 'react-native'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { LinearGradient } from 'expo-linear-gradient'
import { getListings } from '../../lib/exchange'
import { useExchangeStore } from '../../store/useExchangeStore'
import { useModeStore } from '../../store/useModeStore'
import { getModeConfig } from '../../lib/modeConfig'
import { CosmicBackground } from '../../components/ui/CosmicBackground'
import { ListingCard } from '../../components/exchange/ListingCard'
import { colors, THEME_COLORS, borderRadius, shadows, spacing, typography } from '../../constants/theme'
import type { Listing } from '../../lib/exchange'

const TYPE_FILTERS = ['All', 'Sell', 'Trade', 'Free'] as const

export default function Exchange() {
  const insets = useSafeAreaInsets()
  const mode = useModeStore((s) => s.mode)
  const modeConfig = getModeConfig(mode)
  const categoryFilters = modeConfig.exchangeFilters
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
            <Ionicons name="add" size={24} color="#1A1030" />
          </Pressable>
        </View>

        {/* Filter pills — dynamic per mode */}
        <View style={styles.filters}>
          {categoryFilters.map((f) => (
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
  // matches HTML: shrink-0 pt-14 px-6 mb-6, flex justify-between items-start
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  // matches HTML: text-[10px] font-bold tracking-[0.2em] text-[#F4FD50]/60 uppercase mb-1
  label: {
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(244,253,80,0.6)',
    letterSpacing: 3,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  // matches HTML: text-3xl font-display font-bold leading-tight
  titleLine1: {
    fontSize: 30,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  titleLine2: {
    fontSize: 30,
    fontWeight: '700',
    color: '#F4FD50',
    letterSpacing: -0.5,
  },
  // matches HTML: w-12 h-12 rounded-full bg-[#F4FD50] shadow-lg shadow-[#F4FD50]/20
  addBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F4FD50',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#F4FD50',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
  },
  // matches HTML: flex overflow-x-auto px-6 gap-3
  filters: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 24,
    marginBottom: 32,
  },
  // matches HTML: px-5 py-2.5 rounded-full bg-white/10 border border-white/20 text-sm font-medium
  filterPill: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  // matches HTML: bg-[#F4FD50] text-[#1A1030] text-sm font-bold
  filterPillActive: {
    backgroundColor: '#F4FD50',
    borderColor: '#F4FD50',
  },
  filterText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  filterTextActive: {
    color: '#1A1030',
    fontWeight: '700',
  },
  list: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },

  // matches HTML: flex-1 flex flex-col items-center justify-center px-10 text-center
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  // matches HTML: relative w-full h-48 mb-10
  placeholderCards: {
    flexDirection: 'row',
    marginBottom: 40,
  },
  // matches HTML: w-32 h-40 rounded-2xl shadow-xl
  placeholderCard: {
    width: 128,
    height: 160,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  // matches HTML: bg-[#FF71D2] rotate-[-6deg]
  placeholderPink: {
    backgroundColor: '#FF71D2',
    transform: [{ rotate: '-6deg' }],
    shadowColor: '#FF71D2',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    zIndex: 1,
  },
  // matches HTML: bg-[#4ADEDE] rotate-[6deg] ml-[-20px]
  placeholderBlue: {
    backgroundColor: '#4ADEDE',
    transform: [{ rotate: '6deg' }],
    marginLeft: -20,
    shadowColor: '#4ADEDE',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
  },
  // matches HTML: text-2xl font-display font-bold mb-3
  emptyTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 12,
    textAlign: 'center',
  },
  // matches HTML: text-white/60 text-sm leading-relaxed mb-8
  emptySubtitle: {
    fontSize: 14,
    fontWeight: '400',
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  // matches HTML: w-full max-w-[240px] py-4 bg-gradient-to-r rounded-2xl shadow-lg
  gradientBtnWrap: {
    borderRadius: 16,
    overflow: 'hidden',
    width: '100%',
    maxWidth: 240,
    shadowColor: '#F4FD50',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
  },
  gradientBtn: {
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // matches HTML: text-[#1A1030] font-bold text-base
  gradientBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1030',
  },
})
