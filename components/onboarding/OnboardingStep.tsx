/**
 * OnboardingStep — shared wrapper for multi-step onboarding flows.
 *
 * Apr 2026 redesign: cream canvas, paper-card inputs, Fraunces display
 * heading with optional italic accent word, ink pill CTA.
 *
 * Shows: back button (optional), step counter "N / Total",
 * optional Skip, Fraunces display question, ink Continue pill.
 */

import { createContext, useContext } from 'react'
import { View, Text, Pressable, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme } from '../../constants/theme'
import { Display, DisplayItalic } from '../ui/Typography'
import { PillButton } from '../ui/PillButton'

/**
 * OnboardingNavContext — lets parent provide back/close handlers
 * without threading props through every step sub-component.
 */
interface OnboardingNav {
  onBack?: () => void
  onClose?: () => void
}

const OnboardingNavContext = createContext<OnboardingNav>({})

export function OnboardingNavProvider({ onBack, onClose, children }: OnboardingNav & { children: React.ReactNode }) {
  return (
    <OnboardingNavContext.Provider value={{ onBack, onClose }}>
      {children}
    </OnboardingNavContext.Provider>
  )
}

interface OnboardingStepProps {
  step: number
  total: number
  /** Main question text (Fraunces serif) */
  question: string
  /** Optional italic accent — rendered on a second line after `question` */
  italicSuffix?: string
  children: React.ReactNode
  onContinue: () => void
  onSkip?: () => void
  onBack?: () => void
  onClose?: () => void
  continueDisabled?: boolean
  continueLabel?: string
}

export function OnboardingStep({
  step,
  total,
  question,
  italicSuffix,
  children,
  onContinue,
  onSkip,
  onBack,
  onClose,
  continueDisabled = false,
  continueLabel = 'Continue →',
}: OnboardingStepProps) {
  const insets = useSafeAreaInsets()
  const { colors, font, isDark } = useTheme()
  const nav = useContext(OnboardingNavContext)

  const backHandler = onBack ?? nav.onBack
  const closeHandler = onClose ?? nav.onClose

  const bg = isDark ? colors.bg : '#F3ECD9'
  const paper = isDark ? colors.surface : '#FFFEF8'
  const paperBorder = isDark ? colors.border : 'rgba(20,19,19,0.08)'
  const ink = isDark ? colors.text : '#141313'
  const ink3 = isDark ? colors.textMuted : '#6E6763'

  return (
    <View style={[styles.root, { backgroundColor: bg }]}>
      {/* Top bar */}
      <View style={[styles.top, { paddingTop: insets.top + 12 }]}>
        <View style={styles.navRow}>
          {backHandler ? (
            <Pressable onPress={backHandler} hitSlop={8}>
              <View style={[styles.circleBtn, { backgroundColor: paper, borderColor: paperBorder }]}>
                <Ionicons name="chevron-back" size={18} color={ink} />
              </View>
            </Pressable>
          ) : (
            <View style={styles.circleBtn} />
          )}

          <Text style={[styles.stepCount, { fontFamily: font.body, color: ink3 }]}>
            {step} / {total}
          </Text>

          {onSkip ? (
            <Pressable onPress={onSkip} hitSlop={8}>
              <Text style={[styles.skipHeaderText, { fontFamily: font.body, color: ink3 }]}>
                Skip
              </Text>
            </Pressable>
          ) : closeHandler ? (
            <Pressable onPress={closeHandler} hitSlop={8}>
              <View style={[styles.circleBtn, { backgroundColor: paper, borderColor: paperBorder }]}>
                <Ionicons name="close" size={18} color={ink} />
              </View>
            </Pressable>
          ) : (
            <View style={styles.circleBtn} />
          )}
        </View>

        {/* Question */}
        <View style={styles.questionWrap}>
          <Display size={32} color={ink}>
            {question}
          </Display>
          {italicSuffix && (
            <DisplayItalic size={32} color={ink}>
              {italicSuffix}
            </DisplayItalic>
          )}
        </View>
      </View>

      {/* Input area */}
      <View style={styles.content}>{children}</View>

      {/* Bottom action */}
      <View style={[styles.bottom, { paddingBottom: insets.bottom + 16 }]}>
        <PillButton
          label={continueLabel}
          onPress={onContinue}
          disabled={continueDisabled}
          variant="ink"
        />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  top: {
    paddingHorizontal: 24,
    gap: 18,
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 38,
  },
  circleBtn: {
    width: 38,
    height: 38,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepCount: { fontSize: 13 },
  skipHeaderText: { fontSize: 13 },

  questionWrap: { marginTop: 4 },

  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 22,
  },

  bottom: {
    paddingHorizontal: 24,
    paddingTop: 8,
  },
})
