import { useState } from 'react'
import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useJourneyStore } from '../../store/useJourneyStore'
import { useModeStore } from '../../store/useModeStore'
import { CosmicBackground } from '../../components/ui/CosmicBackground'
import { THEME_COLORS, spacing, borderRadius } from '../../constants/theme'

export default function ParentName() {
  const insets = useSafeAreaInsets()
  const setParentName = useJourneyStore((s) => s.setParentName)
  const mode = useModeStore((s) => s.mode)
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
      <View style={[styles.container, { paddingTop: insets.top + 16 }]}>
        {/* Back */}
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color="rgba(255,255,255,0.6)" />
        </Pressable>

        {/* Content */}
        <View style={styles.content}>
          <Text style={styles.title}>
            How shall I{'\n'}call you, dear?
          </Text>
          <Text style={styles.subtitle}>
            Grandma likes to know who she's talking to
          </Text>

          <Text style={styles.label}>PARENT'S NAME</Text>
          <TextInput
            style={styles.input}
            selectionColor={THEME_COLORS.yellow}
            placeholder="How shall I call you?"
            placeholderTextColor="rgba(255,255,255,0.2)"
            value={name}
            onChangeText={setName}
            autoFocus
          />
        </View>

        {/* Bottom */}
        <View style={[styles.bottom, { paddingBottom: insets.bottom + 24 }]}>
          <Pressable
            onPress={handleContinue}
            style={({ pressed }) => [
              styles.ctaButton,
              pressed && { transform: [{ scale: 0.95 }] },
            ]}
          >
            <Text style={styles.ctaText}>Continue</Text>
          </Pressable>

          <Pressable onPress={handleContinue}>
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
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 34,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -0.5,
    lineHeight: 38,
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.55)',
    marginBottom: 40,
  },
  label: {
    fontSize: 10,
    fontWeight: '900',
    color: 'rgba(255,255,255,0.35)',
    letterSpacing: 3,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: borderRadius.full,
    paddingHorizontal: 28,
    height: 72,
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  bottom: {
    gap: 16,
    alignItems: 'center',
  },
  ctaButton: {
    width: '100%',
    height: 64,
    borderRadius: borderRadius.full,
    backgroundColor: THEME_COLORS.yellow,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: THEME_COLORS.yellow,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.4,
    shadowRadius: 30,
  },
  ctaText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1A1030',
    letterSpacing: 0.5,
  },
  skipText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.4)',
  },
})
