/**
 * Activities (Apr 2026 redesign) — pick what to track.
 *
 * Cream canvas, Fraunces display + italic, paper card rows with
 * sticker-tinted emoji circle + check pill, ink pill CTA.
 */

import { useState } from 'react'
import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useJourneyStore } from '../../store/useJourneyStore'
import { useModeStore } from '../../store/useModeStore'
import { useTheme } from '../../constants/theme'
import { Display, DisplayItalic, Body } from '../../components/ui/Typography'
import { PillButton } from '../../components/ui/PillButton'
import { ScreenHeader } from '../../components/ui/ScreenHeader'
import { stickerForEmoji } from '../../lib/emojiToSticker'

const ACTIVITIES = [
  { id: 'feeding', emoji: '🍼', label: 'Feeding', subtitle: 'Breast, bottle, solids' },
  { id: 'sleep', emoji: '🌙', label: 'Sleep', subtitle: 'Naps, bedtime, wake-ups' },
  { id: 'diaper', emoji: '💧', label: 'Diaper', subtitle: 'Wet, dirty, changes' },
  { id: 'mood', emoji: '☺', label: 'Mood', subtitle: 'How baby is feeling' },
  { id: 'growth', emoji: '📏', label: 'Growth', subtitle: 'Weight, height, milestones' },
  { id: 'medicine', emoji: '💊', label: 'Medicine', subtitle: 'Doses, vitamins, meds' },
  { id: 'vaccines', emoji: '💉', label: 'Vaccines', subtitle: 'Schedule, reactions' },
  { id: 'milestones', emoji: '⭐', label: 'Milestones', subtitle: 'First steps, words, skills' },
]

const PREGNANCY_ACTIVITIES = [
  { id: 'symptoms', emoji: '🤰', label: 'Symptoms', subtitle: 'Nausea, fatigue, kicks' },
  { id: 'appointments', emoji: '🏥', label: 'Appointments', subtitle: 'Checkups, ultrasounds' },
  { id: 'mood', emoji: '☺', label: 'Mood', subtitle: "How you're feeling" },
  { id: 'weight', emoji: '⚖️', label: 'Weight', subtitle: 'Track your gain' },
  { id: 'nutrition', emoji: '🥗', label: 'Nutrition', subtitle: 'Meals, cravings, water' },
  { id: 'medicine', emoji: '💊', label: 'Supplements', subtitle: 'Prenatal, iron, folic acid' },
]

const PRE_PREGNANCY_ACTIVITIES = [
  { id: 'fertility', emoji: '🌸', label: 'Fertility', subtitle: 'Cycle tracking, ovulation' },
  { id: 'nutrition', emoji: '🥗', label: 'Nutrition', subtitle: 'Prenatal diet prep' },
  { id: 'appointments', emoji: '🏥', label: 'Appointments', subtitle: 'Pre-conception checkups' },
  { id: 'mood', emoji: '☺', label: 'Mood', subtitle: "How you're feeling" },
  { id: 'fitness', emoji: '🧘', label: 'Fitness', subtitle: 'Exercise, wellness' },
  { id: 'learning', emoji: '📚', label: 'Learning', subtitle: 'Courses, preparation' },
]

export default function Activities() {
  const insets = useSafeAreaInsets()
  const { colors, font, isDark } = useTheme()
  const mode = useModeStore((s) => s.mode)
  const setTrackedActivities = useJourneyStore((s) => s.setTrackedActivities)

  const items =
    mode === 'pregnancy'
      ? PREGNANCY_ACTIVITIES
      : mode === 'pre-pregnancy'
        ? PRE_PREGNANCY_ACTIVITIES
        : ACTIVITIES

  const defaultSelected =
    mode === 'pregnancy'
      ? ['symptoms', 'appointments', 'mood', 'nutrition']
      : mode === 'pre-pregnancy'
        ? ['fertility', 'nutrition', 'mood']
        : ['feeding', 'sleep', 'diaper', 'mood']

  const [selected, setSelected] = useState<string[]>(defaultSelected)

  const bg = isDark ? colors.bg : '#F3ECD9'
  const paper = isDark ? colors.surface : '#FFFEF8'
  const paperBorder = isDark ? colors.border : 'rgba(20,19,19,0.08)'
  const ink = isDark ? colors.text : '#141313'
  const ink3 = isDark ? colors.textMuted : '#6E6763'
  const ink4 = isDark ? colors.textFaint : '#A69E93'
  const tint = isDark ? 'rgba(245,214,82,0.14)' : '#FBEA9E'

  function toggle(id: string) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  function handleContinue() {
    setTrackedActivities(selected)
    router.push('/onboarding/child-profile')
  }

  return (
    <View style={[styles.root, { backgroundColor: bg }]}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <ScreenHeader title="What to track" />

        <View style={{ marginTop: 16 }}>
          <Display size={32} color={ink}>What would you</Display>
          <DisplayItalic size={32} color={ink}>like to track?</DisplayItalic>
        </View>

        <Body color={ink3} style={styles.subtitle}>
          Pick the ones that matter most — you can always change later.
        </Body>
      </View>

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
              style={({ pressed }) => [
                styles.card,
                {
                  backgroundColor: paper,
                  borderColor: isSelected ? ink : paperBorder,
                  borderWidth: isSelected ? 1.5 : 1,
                },
                pressed && { transform: [{ scale: 0.98 }] },
              ]}
            >
              <View style={[styles.emojiCircle, { backgroundColor: tint }]}>
                {(() => { const S = stickerForEmoji(item.emoji); return <S size={38} /> })()}
              </View>
              <View style={styles.cardText}>
                <Text style={[styles.cardLabel, { fontFamily: font.bodySemiBold, color: ink }]}>
                  {item.label}
                </Text>
                <Text style={[styles.cardSubtitle, { fontFamily: font.body, color: ink3 }]}>
                  {item.subtitle}
                </Text>
              </View>
              <View
                style={[
                  styles.checkbox,
                  {
                    borderColor: isSelected ? ink : paperBorder,
                    backgroundColor: isSelected ? ink : paper,
                  },
                ]}
              >
                {isSelected && <Ionicons name="checkmark" size={14} color={bg} />}
              </View>
            </Pressable>
          )
        })}
      </ScrollView>

      <View style={[styles.bottom, { paddingBottom: insets.bottom + 16 }]}>
        <Text style={[styles.countText, { fontFamily: font.body, color: ink4 }]}>
          {selected.length} selected
        </Text>
        <PillButton
          label="Let's go →"
          onPress={handleContinue}
          disabled={selected.length === 0}
          variant="ink"
        />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { paddingHorizontal: 24, paddingBottom: 12 },

  subtitle: {
    marginTop: 8,
    lineHeight: 22,
    maxWidth: 320,
  },

  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 24, paddingBottom: 12, gap: 10 },

  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 20,
    gap: 14,
  },
  emojiCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardEmoji: { fontSize: 22 },
  cardText: { flex: 1 },
  cardLabel: { fontSize: 16, marginBottom: 2 },
  cardSubtitle: { fontSize: 13 },

  checkbox: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },

  bottom: {
    paddingHorizontal: 24,
    paddingTop: 12,
    gap: 10,
  },
  countText: { fontSize: 13, textAlign: 'center' },
})
