import { View, Text, StyleSheet } from 'react-native'
import { GlassCard } from '../ui/GlassCard'
import { colors, borderRadius } from '../../constants/theme'

interface MealSummary {
  mealType: string
  logged: boolean
  description?: string
  rating?: number
}

interface FoodDashboardProps {
  meals?: MealSummary[]
  weeklyHighlight?: string
}

const DEFAULT_MEALS: MealSummary[] = [
  { mealType: 'Breakfast', logged: false },
  { mealType: 'Lunch', logged: false },
  { mealType: 'Dinner', logged: false },
  { mealType: 'Snack', logged: false },
]

export function FoodDashboard({ meals = DEFAULT_MEALS, weeklyHighlight }: FoodDashboardProps) {
  const loggedCount = meals.filter((m) => m.logged).length

  return (
    <GlassCard style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Food Dashboard</Text>
        <Text style={styles.counter}>
          {loggedCount}/{meals.length} meals
        </Text>
      </View>

      <View style={styles.mealsGrid}>
        {meals.map((meal) => (
          <View key={meal.mealType} style={styles.mealItem}>
            <View style={[styles.mealDot, meal.logged && styles.mealDotLogged]} />
            <Text style={[styles.mealLabel, meal.logged && styles.mealLabelLogged]}>
              {meal.mealType}
            </Text>
            {meal.description && (
              <Text style={styles.mealDesc} numberOfLines={1}>
                {meal.description}
              </Text>
            )}
          </View>
        ))}
      </View>

      {weeklyHighlight ? (
        <View style={styles.highlight}>
          <Text style={styles.highlightIcon}>💡</Text>
          <Text style={styles.highlightText}>{weeklyHighlight}</Text>
        </View>
      ) : (
        <View style={styles.highlight}>
          <Text style={styles.highlightIcon}>💡</Text>
          <Text style={styles.highlightText}>
            Log meals with photos to get AI-powered nutrition tips from Guru Grandma.
          </Text>
        </View>
      )}
    </GlassCard>
  )
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  counter: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.accent,
  },
  mealsGrid: {
    gap: 8,
    marginBottom: 14,
  },
  mealItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  mealDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: colors.textTertiary,
  },
  mealDotLogged: {
    backgroundColor: colors.success,
    borderColor: colors.success,
  },
  mealLabel: {
    fontSize: 14,
    color: colors.textTertiary,
    fontWeight: '500',
    width: 70,
  },
  mealLabelLogged: {
    color: colors.text,
  },
  mealDesc: {
    flex: 1,
    fontSize: 13,
    color: colors.textSecondary,
  },
  highlight: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: colors.accentMuted,
    borderRadius: borderRadius.sm,
    padding: 10,
  },
  highlightIcon: {
    fontSize: 14,
  },
  highlightText: {
    flex: 1,
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 17,
  },
})
