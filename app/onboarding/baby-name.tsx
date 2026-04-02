import { useState } from 'react'
import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useJourneyStore } from '../../store/useJourneyStore'
import { CosmicBackground } from '../../components/ui/CosmicBackground'
import { GradientButton } from '../../components/ui/GradientButton'
import { colors, typography, spacing, borderRadius } from '../../constants/theme'

export default function BabyName() {
  const insets = useSafeAreaInsets()
  const { setBabyName, mode } = useJourneyStore()
  const [name, setName] = useState('')

  function handleContinue() {
    if (name.trim()) {
      setBabyName(name.trim())
    }
    router.push('/onboarding/activities')
  }

  return (
    <CosmicBackground>
      <View style={[styles.container, { paddingTop: insets.top + 20 }]}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </Pressable>

        <Text style={styles.title}>
          {mode === 'pregnancy'
            ? "Have you chosen\na name?"
            : "What's your little\none's name?"}
        </Text>
        <Text style={styles.subtitle}>
          {mode === 'pregnancy'
            ? "If you've picked a name already, Grandma would love to know"
            : "Grandma would love to know who she's caring for"}
        </Text>

        <Text style={styles.label}>BABY'S NAME {mode === 'pregnancy' ? '(OPTIONAL)' : ''}</Text>
        <TextInput
          style={styles.input}
          selectionColor={colors.neon.blue}
          placeholder="If chosen..."
          placeholderTextColor={colors.textTertiary}
          value={name}
          onChangeText={setName}
          autoFocus
        />

        <View style={[styles.bottom, { paddingBottom: insets.bottom + 24 }]}>
          <GradientButton title="Continue" onPress={handleContinue} />
          {mode === 'pregnancy' && (
            <Pressable onPress={handleContinue} style={styles.skipButton}>
              <Text style={styles.skipText}>We haven't decided yet</Text>
            </Pressable>
          )}
        </View>
      </View>
    </CosmicBackground>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: spacing['2xl'],
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surfaceGlass,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
    borderWidth: 1,
    borderColor: colors.border,
  },
  title: {
    ...typography.heading,
    marginBottom: 8,
  },
  subtitle: {
    ...typography.bodySecondary,
    marginBottom: 40,
  },
  label: {
    ...typography.label,
    marginBottom: 8,
  },
  input: {
    backgroundColor: colors.surfaceGlass,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    padding: 16,
    fontSize: 16,
    color: colors.text,
  },
  bottom: {
    marginTop: 'auto',
    gap: 12,
  },
  skipButton: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  skipText: {
    fontSize: 14,
    color: colors.textTertiary,
  },
})
