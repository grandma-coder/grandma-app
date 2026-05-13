/**
 * Due Date (Apr 2026 redesign) — "Tell me about your bundle."
 *
 * Cream canvas, Fraunces display + italic accent, paper card date picker,
 * mode toggle chips (due date vs LMP), week preview pastel card, ink pill CTA.
 */

import { useState } from 'react'
import { View, Text, Pressable, StyleSheet, Alert } from 'react-native'
import { router } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useJourneyStore } from '../../store/useJourneyStore'
import { useTheme, stickers, getModeColorSoft } from '../../constants/theme'
import DatePickerField from '../../components/ui/DatePickerField'
import { Display, DisplayItalic, MonoCaps, Body } from '../../components/ui/Typography'
import { PillButton } from '../../components/ui/PillButton'
import { ScreenHeader } from '../../components/ui/ScreenHeader'
import { Moon } from '../../components/ui/Stickers'

type Mode = 'due' | 'lmp'

export default function DueDate() {
  const insets = useSafeAreaInsets()
  const { colors, font, isDark } = useTheme()
  const { setDueDate, setLmpDate, setWeekNumber } = useJourneyStore()
  const [mode, setMode] = useState<Mode>('due')
  const [dateInput, setDateInput] = useState('')

  const bg = colors.bg
  const paper = colors.surface
  const paperBorder = colors.border
  const ink = colors.text
  const ink3 = colors.textMuted

  function calculateWeek(date: Date): number {
    const now = new Date()
    if (mode === 'due') {
      const diffMs = date.getTime() - now.getTime()
      const weeksLeft = Math.floor(diffMs / (7 * 24 * 60 * 60 * 1000))
      return Math.max(1, 40 - weeksLeft)
    }
    const diffMs = now.getTime() - date.getTime()
    return Math.max(1, Math.floor(diffMs / (7 * 24 * 60 * 60 * 1000)))
  }

  function handleContinue() {
    if (!dateInput) {
      Alert.alert('Required', mode === 'due' ? "When's your due date?" : 'When was the first day of your last period?')
      return
    }
    const parsed = new Date(dateInput)
    const week = calculateWeek(parsed)

    // Clamp out-of-range dates. Pregnancy spans 0–42 weeks; reject inputs
    // outside that band so an LMP from 2 years ago doesn't produce a
    // week-104 week number, and a due date 5 years out doesn't write
    // a negative one.
    if (mode === 'lmp' && week > 42) {
      Alert.alert('Date too far in the past', 'Last period must be within the last 10 months.')
      return
    }
    if (mode === 'due') {
      const daysOut = (parsed.getTime() - Date.now()) / 86400000
      if (daysOut > 300 || daysOut < -90) {
        Alert.alert('Date out of range', 'Due date must be within the next 10 months.')
        return
      }
    }

    if (mode === 'due') setDueDate(dateInput)
    else setLmpDate(dateInput)
    setWeekNumber(week)
    router.push('/onboarding/baby-name')
  }

  function handleSkip() {
    router.push('/onboarding/baby-name')
  }

  const now = new Date()
  const maxDue = new Date(now)
  maxDue.setMonth(maxDue.getMonth() + 10)
  const minLmp = new Date(now)
  minLmp.setMonth(minLmp.getMonth() - 10)

  return (
    <View style={[styles.root, { backgroundColor: bg }]}>
      <View style={[styles.container, { paddingTop: insets.top + 12 }]}>
        <ScreenHeader
          title="4 / 10"
          right={
            <Pressable onPress={handleSkip} hitSlop={8}>
              <Body color={ink3} size={13}>Skip</Body>
            </Pressable>
          }
        />

        <View style={{ marginTop: 24 }}>
          <Display size={34} color={ink}>Tell me about</Display>
          <DisplayItalic size={34} color={ink}>your bundle.</DisplayItalic>
        </View>

        <Body color={ink3} style={styles.subtitle}>
          This helps Grandma track your pregnancy week by week.
        </Body>

        {/* Mode toggle */}
        <View style={styles.toggleRow}>
          {(['due', 'lmp'] as Mode[]).map((m) => {
            const active = mode === m
            return (
              <Pressable
                key={m}
                onPress={() => { setMode(m); setDateInput('') }}
                style={[
                  styles.toggleChip,
                  {
                    backgroundColor: active ? ink : paper,
                    borderColor: active ? ink : paperBorder,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.toggleText,
                    { fontFamily: font.bodyMedium, color: active ? bg : ink },
                  ]}
                >
                  {m === 'due' ? 'I know my due date' : 'I know my LMP'}
                </Text>
              </Pressable>
            )
          })}
        </View>

        {/* Date picker (paper card) */}
        <View style={[styles.fieldCard, { backgroundColor: paper, borderColor: paperBorder }]}>
          <MonoCaps style={{ marginBottom: 6 }}>
            {mode === 'due' ? 'EXPECTED DUE DATE' : 'LAST MENSTRUAL PERIOD'}
          </MonoCaps>
          <DatePickerField
            label=""
            value={dateInput}
            onChange={setDateInput}
            placeholder="mm/dd/yyyy"
            minimumDate={mode === 'due' ? now : minLmp}
            maximumDate={mode === 'due' ? maxDue : now}
          />
        </View>

        {dateInput ? (
          <View
            style={[
              styles.weekPreview,
              { backgroundColor: getModeColorSoft('pregnancy', isDark), borderColor: paperBorder },
            ]}
          >
            <Moon size={36} fill={isDark ? stickers.lilac : '#C8B6E8'} />
            <Text style={[styles.weekText, { fontFamily: font.display, color: ink }]}>
              Week {calculateWeek(new Date(dateInput))} of 40
            </Text>
          </View>
        ) : null}
      </View>

      <View style={[styles.bottom, { paddingBottom: insets.bottom + 16 }]}>
        <PillButton label="Continue →" onPress={handleContinue} variant="ink" />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  container: {
    flex: 1,
    paddingHorizontal: 24,
  },
  subtitle: { marginTop: 10, marginBottom: 24, maxWidth: 320 },

  toggleRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  toggleChip: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
  },
  toggleText: { fontSize: 13 },

  fieldCard: {
    borderRadius: 20,
    borderWidth: 1,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 20,
  },

  weekPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
  },
  weekText: { fontSize: 20 },

  bottom: {
    paddingHorizontal: 24,
    paddingTop: 8,
  },
})
