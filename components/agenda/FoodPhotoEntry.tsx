import { View, Text, Pressable, Image, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { GlassCard } from '../ui/GlassCard'
import { colors, borderRadius } from '../../constants/theme'

interface FoodPhotoEntryProps {
  onTakePhoto: () => void
  onPickPhoto: () => void
  photoUri?: string | null
  mealType: string
  rating?: number
  onRate?: (rating: number) => void
}

const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack']
const STARS = [1, 2, 3, 4, 5]

export function FoodPhotoEntry({
  onTakePhoto,
  onPickPhoto,
  photoUri,
  mealType,
  rating = 0,
  onRate,
}: FoodPhotoEntryProps) {
  return (
    <GlassCard style={styles.container}>
      <Text style={styles.title}>Log a Meal</Text>
      <Text style={styles.mealType}>{mealType.toUpperCase()}</Text>

      {photoUri ? (
        <Image source={{ uri: photoUri }} style={styles.photo} resizeMode="cover" />
      ) : (
        <View style={styles.photoPlaceholder}>
          <View style={styles.buttonRow}>
            <Pressable onPress={onTakePhoto} style={styles.photoButton}>
              <Ionicons name="camera-outline" size={24} color={colors.accent} />
              <Text style={styles.photoButtonText}>Camera</Text>
            </Pressable>
            <Pressable onPress={onPickPhoto} style={styles.photoButton}>
              <Ionicons name="images-outline" size={24} color={colors.accent} />
              <Text style={styles.photoButtonText}>Gallery</Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* Star rating */}
      <View style={styles.ratingRow}>
        <Text style={styles.ratingLabel}>How'd they like it?</Text>
        <View style={styles.stars}>
          {STARS.map((s) => (
            <Pressable key={s} onPress={() => onRate?.(s)}>
              <Ionicons
                name={s <= rating ? 'star' : 'star-outline'}
                size={22}
                color={s <= rating ? colors.accent : colors.textTertiary}
              />
            </Pressable>
          ))}
        </View>
      </View>
    </GlassCard>
  )
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  mealType: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textTertiary,
    letterSpacing: 1,
    marginBottom: 12,
  },
  photo: {
    width: '100%',
    height: 180,
    borderRadius: borderRadius.md,
    marginBottom: 12,
  },
  photoPlaceholder: {
    backgroundColor: colors.surfaceGlass,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
    padding: 24,
    marginBottom: 12,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 24,
  },
  photoButton: {
    alignItems: 'center',
    gap: 6,
  },
  photoButtonText: {
    fontSize: 12,
    color: colors.accent,
    fontWeight: '600',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  ratingLabel: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  stars: {
    flexDirection: 'row',
    gap: 4,
  },
})
