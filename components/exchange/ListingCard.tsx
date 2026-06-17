import { useMemo } from 'react'
import { View, Text, Pressable, Image, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { PaperCard } from '../ui/PaperCard'
import { useTheme } from '../../constants/theme'
import { MissingStickers } from '../stickers/MissingStickers'
import type { Listing } from '../../lib/exchange'

interface ListingCardProps {
  listing: Listing
  saved?: boolean
  onPress?: () => void
  onSave?: () => void
}

const TYPE_STICKER: Record<string, React.FC<{ size?: number }>> = {
  sell: MissingStickers.GarageListingSell,
  trade: MissingStickers.GarageListingTrade,
  donate: MissingStickers.GarageListingDonate,
}

export function ListingCard({ listing, saved, onPress, onSave }: ListingCardProps) {
  const { colors } = useTheme()
  const styles = useMemo(() => createStyles(colors), [colors])
  const Badge = TYPE_STICKER[listing.listingType] ?? TYPE_STICKER.sell

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [pressed && { opacity: 0.9 }]}>
      <PaperCard radius={28} padding={0} style={styles.container}>
        {/* Photo */}
        {listing.photos.length > 0 ? (
          <Image source={{ uri: listing.photos[0] }} style={styles.photo} resizeMode="cover" />
        ) : (
          <View style={styles.photoPlaceholder}>
            <Ionicons name="image-outline" size={32} color={colors.textMuted} />
          </View>
        )}

        <View style={styles.content}>
          {/* Badge */}
          <View style={styles.badgeWrap}>
            <Badge size={44} />
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
                color={saved ? colors.accent : colors.textMuted}
              />
            </Pressable>
            <Pressable style={styles.actionBtn}>
              <Ionicons name="chatbubble-outline" size={18} color={colors.textMuted} />
            </Pressable>
            <Pressable style={styles.actionBtn}>
              <Ionicons name="share-outline" size={18} color={colors.textMuted} />
            </Pressable>
          </View>
        </View>
      </PaperCard>
    </Pressable>
  )
}

const createStyles = (colors: ReturnType<typeof useTheme>['colors']) => StyleSheet.create({
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
  badgeWrap: {
    alignSelf: 'flex-start',
    marginBottom: 8,
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
    color: colors.textMuted,
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
