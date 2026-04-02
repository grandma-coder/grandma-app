import { useState } from 'react'
import { View, Text, TextInput, StyleSheet } from 'react-native'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { Pressable } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useJourneyStore } from '../../store/useJourneyStore'
import { CosmicBackground } from '../../components/ui/CosmicBackground'
import { GradientButton } from '../../components/ui/GradientButton'
import { colors, typography, spacing, borderRadius } from '../../constants/theme'

export default function ParentName() {
  const insets = useSafeAreaInsets()
  const { setParentName, mode } = useJourneyStore()
  const [name, setName] = useState('')

  function handleContinue() {
    if (name.trim()) {
      setParentName(name.trim())
    }
    if (mode === 'pregnancy') {
      router.push('/onboarding/due-date')
    } else {
      router.push('/onboarding/baby-name')
    }
  }

  return (
    <CosmicBackground>
      <View style={[styles.container, { paddingTop: insets.top + 20 }]}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </Pressable>

        <Text style={styles.title}>How shall I call{'\n'}you, dear?</Text>
        <Text style={styles.subtitle}>
          Grandma likes to know who she's talking to
        </Text>

        <Text style={styles.label}>PARENT'S NAME</Text>
        <TextInput
          style={styles.input}
          selectionColor={colors.neon.blue}
          placeholder="How shall I call you?"
          placeholderTextColor={colors.textTertiary}
          value={name}
          onChangeText={setName}
          autoFocus
        />

        <View style={[styles.bottom, { paddingBottom: insets.bottom + 24 }]}>
          <GradientButton title="Continue" onPress={handleContinue} />
          <Pressable onPress={handleContinue} style={styles.skipButton}>
            <Text style={styles.skipText}>Skip for now</Text>
          </Pressable>
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
