/**
 * Listing Detail Screen — full photos, details, seller info, message button.
 */

import { useState, useEffect } from 'react'
import {
  View,
  Text,
  Pressable,
  ScrollView,
  Image,
  Dimensions,
  StyleSheet,
  ActivityIndicator,
} from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import {
  ArrowLeft,
  MapPin,
  Tag,
  Package,
  MessageCircle,
  Share2,
  User,
} from 'lucide-react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme, brand } from '../../constants/theme'
import { fetchListing, type GarageListing } from '../../lib/garage'

const SCREEN_W = Dimensions.get('window').width

export default function ListingDetail() {
  const { colors, radius } = useTheme()
  const insets = useSafeAreaInsets()
  const { id } = useLocalSearchParams<{ id: string }>()

  const [listing, setListing] = useState<GarageListing | null>(null)
  const [loading, setLoading] = useState(true)
  const [photoIndex, setPhotoIndex] = useState(0)

  useEffect(() => {
    if (id) {
      fetchListing(id).then((data) => {
        setListing(data)
        setLoading(false)
      })
    }
  }, [id])

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.bg }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    )
  }

  if (!listing) {
    return (
      <View style={[styles.center, { backgroundColor: colors.bg }]}>
        <Text style={[styles.errorText, { color: colors.textSecondary }]}>Listing not found</Text>
      </View>
    )
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Photos */}
        <View style={styles.photoSection}>
          {listing.photos.length > 0 ? (
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={(e) => {
                setPhotoIndex(Math.round(e.nativeEvent.contentOffset.x / SCREEN_W))
              }}
            >
              {listing.photos.map((uri, i) => (
                <Image key={i} source={{ uri }} style={styles.photo} />
              ))}
            </ScrollView>
          ) : (
            <View style={[styles.photoPlaceholder, { backgroundColor: colors.surfaceRaised }]}>
              <Text style={{ fontSize: 48 }}>📦</Text>
            </View>
          )}

          {/* Photo dots */}
          {listing.photos.length > 1 && (
            <View style={styles.dotsRow}>
              {listing.photos.map((_, i) => (
                <View
                  key={i}
                  style={[
                    styles.dot,
                    { backgroundColor: i === photoIndex ? colors.primary : colors.textMuted + '40' },
                  ]}
                />
              ))}
            </View>
          )}

          {/* Back button overlay */}
          <Pressable
            onPress={() => router.back()}
            style={[styles.backBtn, { top: insets.top + 8, backgroundColor: colors.bg + 'CC' }]}
          >
            <ArrowLeft size={22} color={colors.text} />
          </Pressable>
        </View>

        {/* Details */}
        <View style={styles.details}>
          {/* Price + Title */}
          <Text style={[styles.price, { color: listing.is_free ? brand.success : colors.primary }]}>
            {listing.is_free ? 'FREE' : `$${listing.price}`}
          </Text>
          <Text style={[styles.title, { color: colors.text }]}>{listing.title}</Text>

          {/* Badges */}
          <View style={styles.badgeRow}>
            {listing.condition && (
              <View style={[styles.badge, { backgroundColor: colors.surfaceRaised, borderRadius: radius.full }]}>
                <Package size={12} color={colors.textSecondary} strokeWidth={2} />
                <Text style={[styles.badgeText, { color: colors.textSecondary }]}>{listing.condition}</Text>
              </View>
            )}
            <View style={[styles.badge, { backgroundColor: colors.surfaceRaised, borderRadius: radius.full }]}>
              <Tag size={12} color={colors.textSecondary} strokeWidth={2} />
              <Text style={[styles.badgeText, { color: colors.textSecondary }]}>{listing.category}</Text>
            </View>
            {listing.location && (
              <View style={[styles.badge, { backgroundColor: colors.surfaceRaised, borderRadius: radius.full }]}>
                <MapPin size={12} color={colors.textSecondary} strokeWidth={2} />
                <Text style={[styles.badgeText, { color: colors.textSecondary }]}>{listing.location}</Text>
              </View>
            )}
          </View>

          {/* Size/age range */}
          {(listing.size_range || listing.age_range) && (
            <Text style={[styles.sizeText, { color: colors.textMuted }]}>
              {[listing.size_range, listing.age_range].filter(Boolean).join(' — ')}
            </Text>
          )}

          {/* Description */}
          {listing.description && (
            <Text style={[styles.description, { color: colors.textSecondary }]}>
              {listing.description}
            </Text>
          )}

          {/* Seller card */}
          <View style={[styles.sellerCard, { backgroundColor: colors.surface, borderRadius: radius.xl }]}>
            <View style={[styles.sellerAvatar, { backgroundColor: colors.surfaceRaised }]}>
              <User size={20} color={colors.textMuted} strokeWidth={1.5} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.sellerName, { color: colors.text }]}>
                {listing.seller_name ?? 'Grandma Community Member'}
              </Text>
              <Text style={[styles.sellerDate, { color: colors.textMuted }]}>
                Listed {new Date(listing.created_at).toLocaleDateString()}
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Bottom bar */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 12, backgroundColor: colors.bg, borderTopColor: colors.border }]}>
        <Pressable
          onPress={() => {/* TODO: open in-app messaging */}}
          style={({ pressed }) => [
            styles.messageBtn,
            { backgroundColor: colors.primary, borderRadius: radius.lg },
            pressed && { opacity: 0.9 },
          ]}
        >
          <MessageCircle size={20} color="#FFFFFF" strokeWidth={2} />
          <Text style={styles.messageBtnText}>Message Seller</Text>
        </Pressable>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errorText: { fontSize: 16, fontWeight: '500' },

  // Photos
  photoSection: { position: 'relative' },
  photo: { width: SCREEN_W, height: SCREEN_W * 0.75, resizeMode: 'cover' },
  photoPlaceholder: { width: SCREEN_W, height: SCREEN_W * 0.75, alignItems: 'center', justifyContent: 'center' },
  dotsRow: { position: 'absolute', bottom: 12, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: 6 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  backBtn: { position: 'absolute', left: 16, width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },

  // Details
  details: { padding: 20, gap: 10 },
  price: { fontSize: 28, fontWeight: '900' },
  title: { fontSize: 22, fontWeight: '800', letterSpacing: -0.3 },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 4, paddingHorizontal: 10 },
  badgeText: { fontSize: 12, fontWeight: '600' },
  sizeText: { fontSize: 13, fontWeight: '500' },
  description: { fontSize: 15, fontWeight: '400', lineHeight: 22, marginTop: 4 },

  // Seller
  sellerCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, marginTop: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  sellerAvatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  sellerName: { fontSize: 15, fontWeight: '700' },
  sellerDate: { fontSize: 12, fontWeight: '500', marginTop: 2 },

  // Bottom
  bottomBar: { paddingHorizontal: 20, paddingTop: 12, borderTopWidth: 1 },
  messageBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 52 },
  messageBtnText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
})
