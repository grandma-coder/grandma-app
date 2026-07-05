import { useState, useMemo } from 'react'
import { View, Text, Pressable, Image, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import * as ImagePicker from 'expo-image-picker'
import { PaperCard } from '../ui/PaperCard'
import { brand, stickers, borderRadius, useTheme } from '../../constants/theme'
import { useTranslation } from '../../lib/i18n'

interface FoodEntry {
  id: string
  mealType: string
  photoUri?: string
  description?: string
  aiAnalysis?: string
  rating?: number
}

interface FoodDashboardProps {
  entries?: FoodEntry[]
  onAnalyzePhoto?: (uri: string, mealType: string) => void
  onManualAdd?: (mealType: string) => void
}

export function FoodDashboard({ entries = [], onAnalyzePhoto, onManualAdd }: FoodDashboardProps) {
  const { colors } = useTheme()
  const { t } = useTranslation()
  const styles = useMemo(() => makeStyles(colors), [colors])
  const [selectedMeal, setSelectedMeal] = useState<string | null>(null)

  const MEALS = [
    { id: 'breakfast', label: t('kids_foodDash_mealBreakfast'), icon: 'sunny-outline', color: stickers.yellow },
    { id: 'lunch', label: t('kids_foodDash_mealLunch'), icon: 'restaurant-outline', color: stickers.green },
    { id: 'dinner', label: t('kids_foodDash_mealDinner'), icon: 'moon-outline', color: brand.kids },
    { id: 'snack', label: t('kids_foodDash_mealSnack'), icon: 'cafe-outline', color: brand.prePregnancy },
  ]

  async function handleTakePhoto(mealType: string) {
    const { granted } = await ImagePicker.requestCameraPermissionsAsync()
    if (!granted) return

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    })

    if (!result.canceled && result.assets[0]) {
      onAnalyzePhoto?.(result.assets[0].uri, mealType)
    }
  }

  async function handlePickPhoto(mealType: string) {
    const { granted } = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!granted) return

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    })

    if (!result.canceled && result.assets[0]) {
      onAnalyzePhoto?.(result.assets[0].uri, mealType)
    }
  }

  return (
    <View style={styles.container}>
      {/* Meal type selector */}
      <View style={styles.mealGrid}>
        {MEALS.map((meal) => {
          const logged = entries.some((e) => e.mealType === meal.id)
          return (
            <Pressable
              key={meal.id}
              onPress={() => setSelectedMeal(selectedMeal === meal.id ? null : meal.id)}
              style={({ pressed }) => [
                styles.mealCard,
                selectedMeal === meal.id && { borderColor: meal.color, borderWidth: 2 },
                pressed && { transform: [{ scale: 0.95 }] },
              ]}
            >
              <View style={[styles.mealIconBox, { backgroundColor: meal.color + '15' }]}>
                <Ionicons name={meal.icon as any} size={22} color={meal.color} />
              </View>
              <Text style={styles.mealLabel}>{meal.label}</Text>
              {logged && (
                <Ionicons name="checkmark-circle" size={16} color={stickers.green} style={{ position: 'absolute', top: 10, right: 10 }} />
              )}
            </Pressable>
          )
        })}
      </View>

      {/* Expanded meal action */}
      {selectedMeal && (
        <PaperCard radius={28} padding={20} style={styles.actionCard}>
          <Text style={styles.actionTitle}>{t('kids_foodDash_logMeal', { meal: MEALS.find((m) => m.id === selectedMeal)?.label ?? '' })}</Text>
          <Text style={styles.actionDesc}>
            {t('kids_foodDash_actionDesc')}
          </Text>

          <View style={styles.actionButtons}>
            <Pressable
              onPress={() => handleTakePhoto(selectedMeal)}
              style={[styles.actionBtn, { backgroundColor: stickers.yellow }]}
            >
              <Ionicons name="camera" size={20} color={colors.textInverse} />
              <Text style={[styles.actionBtnText, { color: colors.textInverse }]}>{t('kids_foodDash_photoAI')}</Text>
            </Pressable>

            <Pressable
              onPress={() => handlePickPhoto(selectedMeal)}
              style={styles.actionBtn}
            >
              <Ionicons name="images-outline" size={20} color={colors.text} />
              <Text style={styles.actionBtnText}>{t('kids_foodDash_gallery')}</Text>
            </Pressable>

            <Pressable
              onPress={() => onManualAdd?.(selectedMeal)}
              style={styles.actionBtn}
            >
              <Ionicons name="create-outline" size={20} color={colors.text} />
              <Text style={styles.actionBtnText}>{t('kids_foodDash_manual')}</Text>
            </Pressable>
          </View>
        </PaperCard>
      )}

      {/* Logged entries */}
      {entries.length > 0 && (
        <View style={styles.entriesSection}>
          <Text style={styles.entriesLabel}>{t('kids_foodDash_todaysMeals')}</Text>
          {entries.map((entry) => {
            const meal = MEALS.find((m) => m.id === entry.mealType)
            return (
              <PaperCard radius={28} padding={20} key={entry.id} style={styles.entryCard}>
                <View style={styles.entryRow}>
                  {entry.photoUri && (
                    <Image source={{ uri: entry.photoUri }} style={styles.entryPhoto} />
                  )}
                  <View style={{ flex: 1 }}>
                    <View style={styles.entryHeader}>
                      <View style={[styles.entryDot, { backgroundColor: meal?.color }]} />
                      <Text style={styles.entryMealType}>{meal?.label}</Text>
                    </View>
                    {entry.description && (
                      <Text style={styles.entryDesc}>{entry.description}</Text>
                    )}
                    {entry.aiAnalysis && (
                      <View style={styles.aiTag}>
                        <Ionicons name="sparkles" size={12} color={stickers.yellow} />
                        <Text style={styles.aiTagText}>{entry.aiAnalysis}</Text>
                      </View>
                    )}
                  </View>
                </View>
              </PaperCard>
            )
          })}
        </View>
      )}

      {/* Empty hint */}
      {entries.length === 0 && !selectedMeal && (
        <View style={styles.emptyHint}>
          <Ionicons name="nutrition-outline" size={32} color={colors.textMuted} />
          <Text style={styles.emptyTitle}>{t('kids_foodDash_noMealsToday')}</Text>
          <Text style={styles.emptyDesc}>
            {t('kids_foodDash_emptyDesc')}
          </Text>
        </View>
      )}
    </View>
  )
}

const makeStyles = (colors: ReturnType<typeof useTheme>['colors']) => StyleSheet.create({
  container: {},

  // Meal grid
  mealGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  mealCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 16,
    backgroundColor: colors.surfaceGlass,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 8,
  },
  mealIconBox: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mealLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Action card
  actionCard: {
    marginBottom: 16,
  },
  actionTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: colors.text,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  actionDesc: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.textSecondary,
    lineHeight: 18,
    marginBottom: 16,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 48,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surfaceGlass,
    borderWidth: 1,
    borderColor: colors.border,
  },
  actionBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.text,
    textTransform: 'uppercase',
  },

  // Entries
  entriesSection: {
    marginTop: 8,
  },
  entriesLabel: {
    fontSize: 10,
    fontWeight: '900',
    color: colors.textMuted,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  entryCard: {
    marginBottom: 8,
  },
  entryRow: {
    flexDirection: 'row',
    gap: 12,
  },
  entryPhoto: {
    width: 60,
    height: 60,
    borderRadius: 12,
  },
  entryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  entryDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  entryMealType: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.text,
    textTransform: 'uppercase',
  },
  entryDesc: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  aiTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  aiTagText: {
    fontSize: 11,
    fontWeight: '600',
    color: stickers.yellow,
  },

  // Empty
  emptyHint: {
    alignItems: 'center',
    paddingVertical: 32,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.textSecondary,
    textTransform: 'uppercase',
  },
  emptyDesc: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 16,
  },
})
