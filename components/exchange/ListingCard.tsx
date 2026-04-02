import { View, Text, Pressable, Image, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { GlassCard } from '../ui/GlassCard'
import { colors, borderRadius } from '../../constants/theme'
import type { Listing } from '../../lib/exchange'

interface ListingCardProps {
  listing: Listing
  saved?: boolean
  onPress?: () => void
  onSave?: () => void
}

const TYPE_BADGE: Record<string, { label: string; color: string }> = {
  sell: { label: 'For Sale', color: colors.accent },
  trade: { label: 'Trade', color: colors.info },
  donate: { label: 'Free', color: colors.success },
}

export function ListingCard({ listing, saved, onPress, onSave }: ListingCardProps) {
  const badge = TYPE_BADGE[listing.listingType] ?? TYPE_BADGE.sell

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [pressed && { opacity: 0.9 }]}>
      <GlassCard style={styles.container} noPadding>
        {/* Photo */}
        {listing.photos.length > 0 ? (
          <Image source={{ uri: listing.photos[0] }} style={styles.photo} resizeMode="cover" />
        ) : (
          <View style={styles.photoPlaceholder}>
            <Ionicons name="image-outline" size={32} color={colors.textTertiary} />
          </View>
        )}

        <View style={styles.content}>
          {/* Badge */}
          <View style={[styles.badge, { backgroundColor: badge.color + '20', borderColor: badge.color + '40' }]}>
            <Text style={[styles.badgeText, { color: badge.color }]}>{badge.label}</Text>
          </View>

          <Text style={styles.title} numberOfLines={2}>{listing.title}</Text>

          {listing.priceCents != null && listing.priceCents > 0 && (
            <Text style={styles.price}>${(listing.priceCents / 100).toFixed(2)}</Text>
          )}

          <View style={styles.metaRow}>
            {listing.condition && (
              <Text style={styles.meta}>{listing.condition.replace('_', ' ')}</Text>
            )}
            {listing.ageRange && (
              <Text style={styles.meta}>{listing.ageRange}</Text>
            )}
          </View>

          {/* Actions */}
          <View style={styles.actions}>
            <Pressable onPress={onSave} style={styles.actionBtn}>
              <Ionicons
                name={saved ? 'bookmark' : 'bookmark-outline'}
                size={18}
                color={saved ? colors.accent : colors.textTertiary}
              />
            </Pressable>
            <Pressable style={styles.actionBtn}>
              <Ionicons name="chatbubble-outline" size={18} color={colors.textTertiary} />
            </Pressable>
            <Pressable style={styles.actionBtn}>
              <Ionicons name="share-outline" size={18} color={colors.textTertiary} />
            </Pressable>
          </View>
        </View>
      </GlassCard>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 14,
    overflow: 'hidden',
  },
  photo: {
    width: '100%',
    height: 180,
  },
  photoPlaceholder: {
    width: '100%',
    height: 140,
    backgroundColor: colors.surfaceGlass,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    padding: 14,
  },
  badge: {
    alignSelf: 'flex-start',
    borderRadius: borderRadius.full,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderWidth: 1,
    marginBottom: 8,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  price: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.accent,
    marginBottom: 6,
  },
  metaRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  meta: {
    fontSize: 12,
    color: colors.textTertiary,
    textTransform: 'capitalize',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 10,
  },
  actionBtn: {
    padding: 4,
  },
})
