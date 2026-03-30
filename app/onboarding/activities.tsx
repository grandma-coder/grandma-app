import { useState } from 'react'
import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useJourneyStore } from '../../store/useJourneyStore'

const ACTIVITIES = [
  { id: 'feeding', emoji: '🍼', label: 'Feeding', subtitle: 'Breast, bottle, solids', color: '#FDE8F0' },
  { id: 'sleep', emoji: '😴', label: 'Sleep', subtitle: 'Naps, bedtime, wake-ups', color: '#E1F5EE' },
  { id: 'diaper', emoji: '🧷', label: 'Diaper', subtitle: 'Wet, dirty, changes', color: '#FAEEDA' },
  { id: 'mood', emoji: '😊', label: 'Mood', subtitle: 'How baby is feeling', color: '#E8F5E9' },
  { id: 'growth', emoji: '📏', label: 'Growth', subtitle: 'Weight, height, milestones', color: '#E6F1FB' },
  { id: 'medicine', emoji: '💊', label: 'Medicine', subtitle: 'Doses, vitamins, meds', color: '#EEEDFE' },
  { id: 'vaccines', emoji: '💉', label: 'Vaccines', subtitle: 'Schedule, reactions', color: '#EEEDFE' },
  { id: 'milestones', emoji: '⭐', label: 'Milestones', subtitle: 'First steps, words, skills', color: '#FAEEDA' },
]

const PREGNANCY_ACTIVITIES = [
  { id: 'symptoms', emoji: '🤢', label: 'Symptoms', subtitle: 'Nausea, fatigue, kicks', color: '#FDE8F0' },
  { id: 'appointments', emoji: '🏥', label: 'Appointments', subtitle: 'Checkups, ultrasounds', color: '#E6F1FB' },
  { id: 'mood', emoji: '😊', label: 'Mood', subtitle: 'How you\'re feeling', color: '#E8F5E9' },
  { id: 'weight', emoji: '⚖️', label: 'Weight', subtitle: 'Track your gain', color: '#E1F5EE' },
  { id: 'nutrition', emoji: '🥗', label: 'Nutrition', subtitle: 'Meals, cravings, water', color: '#FAEEDA' },
  { id: 'medicine', emoji: '💊', label: 'Supplements', subtitle: 'Prenatal, iron, folic acid', color: '#EEEDFE' },
]

export default function Activities() {
  const journey = useJourneyStore((s) => s.journey)
  const setTrackedActivities = useJourneyStore((s) => s.setTrackedActivities)
  const [selected, setSelected] = useState<string[]>(['feeding', 'sleep', 'diaper', 'mood'])

  const items = journey === 'pregnancy' ? PREGNANCY_ACTIVITIES : ACTIVITIES

  // Pre-select relevant defaults for pregnancy
  useState(() => {
    if (journey === 'pregnancy') {
      setSelected(['symptoms', 'appointments', 'mood', 'nutrition'])
    }
  })

  function toggle(id: string) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  function handleContinue() {
    setTrackedActivities(selected)
    router.push('/onboarding/child-profile')
  }

  return (
    <View style={styles.container}>
      <Pressable onPress={() => router.back()} style={styles.backButton}>
        <Ionicons name="arrow-back" size={24} color="#1A1A2E" />
      </Pressable>

      <Text style={styles.title}>What would you like to track?</Text>
      <Text style={styles.subtitle}>
        Pick the ones that matter most — you can always change later
      </Text>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {items.map((item) => {
          const isSelected = selected.includes(item.id)
          return (
            <Pressable
              key={item.id}
              onPress={() => toggle(item.id)}
              style={[
                styles.card,
                { backgroundColor: isSelected ? item.color : '#FFFFFF' },
                isSelected && styles.cardSelected,
              ]}
            >
              <Text style={styles.cardEmoji}>{item.emoji}</Text>
              <View style={styles.cardText}>
                <Text style={styles.cardLabel}>{item.label}</Text>
                <Text style={styles.cardSubtitle}>{item.subtitle}</Text>
              </View>
              <View style={[styles.checkbox, isSelected && styles.checkboxActive]}>
                {isSelected && <Ionicons name="checkmark" size={16} color="#FFFFFF" />}
              </View>
            </Pressable>
          )
        })}
      </ScrollView>

      <View style={styles.bottom}>
        <Text style={styles.countText}>
          {selected.length} selected
        </Text>
        <Pressable
          onPress={handleContinue}
          style={[styles.continueButton, selected.length === 0 && { opacity: 0.5 }]}
          disabled={selected.length === 0}
        >
          <Text style={styles.continueText}>Let's go</Text>
        </Pressable>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF8F4',
    paddingTop: 60,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 24,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#E8E4DC',
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#1A1A2E',
    paddingHorizontal: 24,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: '#888888',
    paddingHorizontal: 24,
    marginBottom: 24,
    lineHeight: 22,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 24,
    gap: 10,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#E8E4DC',
    gap: 14,
  },
  cardSelected: {
    borderColor: '#7BAE8E',
  },
  cardEmoji: {
    fontSize: 28,
  },
  cardText: {
    flex: 1,
  },
  cardLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A1A2E',
    marginBottom: 2,
  },
  cardSubtitle: {
    fontSize: 13,
    color: '#888888',
  },
  checkbox: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#E8E4DC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxActive: {
    backgroundColor: '#7BAE8E',
    borderColor: '#7BAE8E',
  },
  bottom: {
    paddingHorizontal: 24,
    paddingBottom: 40,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E8E4DC',
    backgroundColor: '#FAF8F4',
  },
  countText: {
    fontSize: 13,
    color: '#888888',
    textAlign: 'center',
    marginBottom: 12,
  },
  continueButton: {
    backgroundColor: '#7BAE8E',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
  },
  continueText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
})
