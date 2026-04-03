import { useState } from 'react'
import { View, Text, Pressable, Image, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import * as ImagePicker from 'expo-image-picker'
import { GlassCard } from '../ui/GlassCard'
import { colors, THEME_COLORS, borderRadius, shadows } from '../../constants/theme'

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

const MEALS = [
  { id: 'breakfast', label: 'Breakfast', icon: 'sunny-outline', color: THEME_COLORS.yellow },
  { id: 'lunch', label: 'Lunch', icon: 'restaurant-outline', color: THEME_COLORS.green },
  { id: 'dinner', label: 'Dinner', icon: 'moon-outline', color: THEME_COLORS.blue },
  { id: 'snack', label: 'Snack', icon: 'cafe-outline', color: THEME_COLORS.pink },
]

export function FoodDashboard({ entries = [], onAnalyzePhoto, onManualAdd }: FoodDashboardProps) {
  const [selectedMeal, setSelectedMeal] = useState<string | null>(null)

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
                <Ionicons name="checkmark-circle" size={16} color={THEME_COLORS.green} style={{ position: 'absolute', top: 10, right: 10 }} />
              )}
            </Pressable>
          )
        })}
      </View>

      {/* Expanded meal action */}
      {selectedMeal && (
        <GlassCard style={styles.actionCard}>
          <Text style={styles.actionTitle}>Log {MEALS.find((m) => m.id === selectedMeal)?.label}</Text>
          <Text style={styles.actionDesc}>
            Take a photo and AI will analyze the nutritional content, or add details manually.
          </Text>

          <View style={styles.actionButtons}>
            <Pressable
              onPress={() => handleTakePhoto(selectedMeal)}
              style={[styles.actionBtn, { backgroundColor: THEME_COLORS.yellow }]}
            >
              <Ionicons name="camera" size={20} color={colors.textOnAccent} />
              <Text style={[styles.actionBtnText, { color: colors.textOnAccent }]}>Photo + AI</Text>
            </Pressable>

            <Pressable
              onPress={() => handlePickPhoto(selectedMeal)}
              style={styles.actionBtn}
            >
              <Ionicons name="images-outline" size={20} color={colors.text} />
              <Text style={styles.actionBtnText}>Gallery</Text>
            </Pressable>

            <Pressable
              onPress={() => onManualAdd?.(selectedMeal)}
              style={styles.actionBtn}
            >
              <Ionicons name="create-outline" size={20} color={colors.text} />
              <Text style={styles.actionBtnText}>Manual</Text>
            </Pressable>
          </View>
        </GlassCard>
      )}

      {/* Logged entries */}
      {entries.length > 0 && (
        <View style={styles.entriesSection}>
          <Text style={styles.entriesLabel}>TODAY'S MEALS</Text>
          {entries.map((entry) => {
            const meal = MEALS.find((m) => m.id === entry.mealType)
            return (
              <GlassCard key={entry.id} style={styles.entryCard}>
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
                        <Ionicons name="sparkles" size={12} color={THEME_COLORS.yellow} />
                        <Text style={styles.aiTagText}>{entry.aiAnalysis}</Text>
                      </View>
                    )}
                  </View>
                </View>
              </GlassCard>
            )
          })}
        </View>
      )}

      {/* Empty hint */}
      {entries.length === 0 && !selectedMeal && (
        <View style={styles.emptyHint}>
          <Ionicons name="nutrition-outline" size={32} color={colors.textTertiary} />
          <Text style={styles.emptyTitle}>No meals logged today</Text>
          <Text style={styles.emptyDesc}>
            Tap a meal above to log food. Take a photo and Guru Grandma will analyze the protein, carbs, and nutrients.
          </Text>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
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
    color: colors.textTertiary,
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
    color: THEME_COLORS.yellow,
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
    color: colors.textTertiary,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 16,
  },
})
