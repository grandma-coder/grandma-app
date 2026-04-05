/**
 * OnboardingStep — shared wrapper for multi-step onboarding flows.
 *
 * Shows: back button (optional), step indicator, progress bar,
 * question, input area, Skip + Continue.
 */

import { createContext, useContext } from 'react'
import { View, Text, Pressable, StyleSheet } from 'react-native'
import { ArrowLeft, X } from 'lucide-react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme } from '../../constants/theme'

/**
 * OnboardingNavContext — lets parent provide back/close handlers
 * without threading props through every step sub-component.
 */
interface OnboardingNav {
  onBack?: () => void
  onClose?: () => void
}

const OnboardingNavContext = createContext<OnboardingNav>({})

/** Wrap your stepper in this to provide back/close to all OnboardingStep instances */
export function OnboardingNavProvider({ onBack, onClose, children }: OnboardingNav & { children: React.ReactNode }) {
  return (
    <OnboardingNavContext.Provider value={{ onBack, onClose }}>
      {children}
    </OnboardingNavContext.Provider>
  )
}

interface OnboardingStepProps {
  /** Current step (1-based) */
  step: number
  /** Total steps in this flow */
  total: number
  /** Main question text */
  question: string
  /** Content area (inputs, pickers, chips, etc.) */
  children: React.ReactNode
  /** Called when Continue is pressed */
  onContinue: () => void
  /** Called when Skip is pressed. If undefined, skip is hidden. */
  onSkip?: () => void
  /** Called when Back is pressed. If undefined, back is hidden. */
  onBack?: () => void
  /** Called when Close (X) is pressed. If undefined, close is hidden. */
  onClose?: () => void
  /** Disable Continue button */
  continueDisabled?: boolean
  /** Custom continue label */
  continueLabel?: string
}

export function OnboardingStep({
  step,
  total,
  question,
  children,
  onContinue,
  onSkip,
  onBack,
  onClose,
  continueDisabled = false,
  continueLabel = 'Continue',
}: OnboardingStepProps) {
  const insets = useSafeAreaInsets()
  const { colors, radius } = useTheme()
  const nav = useContext(OnboardingNavContext)

  // Use prop if provided, otherwise fall back to context
  const backHandler = onBack ?? nav.onBack
  const closeHandler = onClose ?? nav.onClose

  const progress = step / total

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      {/* Top section */}
      <View style={[styles.top, { paddingTop: insets.top + 12 }]}>
        {/* Navigation row */}
        {(backHandler || closeHandler) && (
          <View style={styles.navRow}>
            {backHandler ? (
              <Pressable onPress={backHandler} style={styles.navBtn} hitSlop={8}>
                <ArrowLeft size={22} color={colors.text} />
              </Pressable>
            ) : (
              <View style={styles.navBtn} />
            )}
            {closeHandler ? (
              <Pressable onPress={closeHandler} style={styles.navBtn} hitSlop={8}>
                <X size={22} color={colors.textMuted} />
              </Pressable>
            ) : (
              <View style={styles.navBtn} />
            )}
          </View>
        )}

        {/* Step indicator */}
        <Text style={[styles.stepLabel, { color: colors.textMuted }]}>
          Step {step} of {total}
        </Text>

        {/* Progress bar */}
        <View style={[styles.progressTrack, { backgroundColor: colors.surfaceRaised }]}>
          <View
            style={[
              styles.progressFill,
              {
                backgroundColor: colors.primary,
                width: `${progress * 100}%`,
                borderRadius: 3,
              },
            ]}
          />
        </View>

        {/* Question */}
        <Text style={[styles.question, { color: colors.text }]}>{question}</Text>
      </View>

      {/* Input area */}
      <View style={styles.content}>{children}</View>

      {/* Bottom actions */}
      <View style={[styles.bottom, { paddingBottom: insets.bottom + 16 }]}>
        {/* Continue */}
        <Pressable
          onPress={onContinue}
          disabled={continueDisabled}
          style={({ pressed }) => [
            styles.continueButton,
            {
              backgroundColor: colors.primary,
              borderRadius: radius.lg,
              opacity: continueDisabled ? 0.4 : 1,
            },
            pressed && !continueDisabled && { transform: [{ scale: 0.98 }], opacity: 0.9 },
          ]}
        >
          <Text style={styles.continueText}>{continueLabel}</Text>
        </Pressable>

        {/* Skip */}
        {onSkip && (
          <Pressable onPress={onSkip} style={styles.skipButton}>
            <Text style={[styles.skipText, { color: colors.textMuted }]}>Skip</Text>
          </Pressable>
        )}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  top: {
    paddingHorizontal: 24,
    gap: 16,
  },
  navRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  navBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepLabel: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
  },
  question: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
    lineHeight: 34,
    marginTop: 8,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 32,
  },
  bottom: {
    paddingHorizontal: 24,
    gap: 12,
    alignItems: 'center',
  },
  continueButton: {
    width: '100%',
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  continueText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  skipButton: {
    paddingVertical: 8,
  },
  skipText: {
    fontSize: 14,
    fontWeight: '600',
  },
})
