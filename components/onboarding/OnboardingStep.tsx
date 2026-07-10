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
import {
  useTheme,
  useDiffuseTheme,
  diffuseFont,
  getDiffuseAccent,
  getModeField,
} from '../../constants/theme'
import { Display, DisplayItalic } from '../ui/Typography'
import { PillButton } from '../ui/PillButton'
import { useTranslation } from '../../lib/i18n'
import { AuraField, type AuraBloom } from '../ui/diffuse/AuraField'
import { DiffuseSolidCTA, DiffuseTextLink } from '../ui/diffuse/DiffuseActions'
import { useIsDiffuse } from '../ui/diffuse/DiffuseKit'

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
  /** Optional sticker rendered to the right of the question for mode flavor */
  sticker?: React.ReactNode
  children: React.ReactNode
  onContinue: () => void
  onSkip?: () => void
  onBack?: () => void
  onClose?: () => void
  continueDisabled?: boolean
  continueLabel?: string
  /** Diffuse variant: which mode's aura recipe backs the shell */
  auraMode?: 'pre-pregnancy' | 'pregnancy' | 'kids'
  /** Diffuse variant: explicit progress 0..1 for the hairline bar (defaults to step/total) */
  progress?: number
}

export function OnboardingStep({
  step,
  total,
  question,
  italicSuffix,
  sticker,
  children,
  onContinue,
  onSkip,
  onBack,
  onClose,
  continueDisabled = false,
  continueLabel = 'Continue →',
  auraMode,
  progress,
}: OnboardingStepProps) {
  const insets = useSafeAreaInsets()
  const { colors, font, isDark } = useTheme()
  const { t } = useTranslation()
  const nav = useContext(OnboardingNavContext)
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()

  const backHandler = onBack ?? nav.onBack
  const closeHandler = onClose ?? nav.onClose

  // ── Diffuse (v3) shell ────────────────────────────────────────────────────
  // Aura field + mono step header + hairline progress bar + serif question +
  // containerless solid CTA. Mirrors `.ob-head` / `.prog` / `.q` / `.cta` in
  // docs/design/Onboarding.html. Additive: the cream-paper path below is
  // untouched and renders whenever the variant is 'current'.
  if (diffuse) {
    const mode = auraMode ?? 'pre-pregnancy'
    const [g1, g2, g3] = getModeField(mode, dt.isDark)
    const auraBlooms: AuraBloom[] = [
      { color: g1, cx: '16%', cy: '14%', opacity: 0.42 },
      { color: g2, cx: '88%', cy: '22%', opacity: 0.4 },
      { color: g3, cx: '50%', cy: '104%', opacity: 0.4 },
    ]
    const accent = getDiffuseAccent(mode, dt.isDark)
    const pct = Math.max(0, Math.min(1, progress ?? (total > 0 ? step / total : 0)))

    // Strip trailing arrow / check glyphs; decide the finish icon from intent.
    const rawLabel = continueLabel.replace(/[→✓]/g, '').trim()
    const ctaLabel = rawLabel.toUpperCase()
    const finish = /✓|finish|send|done|complete/i.test(continueLabel)

    return (
      <AuraField blooms={auraBlooms} style={{ backgroundColor: dt.colors.bg }}>
        <View style={[dStyles.top, { paddingTop: insets.top + 12 }]}>
          {/* .ob-head — back · step label · skip/close */}
          <View style={dStyles.head}>
            {backHandler ? (
              <Pressable onPress={backHandler} hitSlop={8}>
                <View style={[dStyles.circleBtn, { borderColor: dt.colors.line2 }]}>
                  <Ionicons name="chevron-back" size={18} color={dt.colors.ink} />
                </View>
              </Pressable>
            ) : (
              <View style={dStyles.circleBtn} />
            )}

            <Text
              style={[
                dStyles.stepLabel,
                { fontFamily: diffuseFont.mono, color: dt.colors.ink3 },
              ]}
            >
              {step} / {total}
            </Text>

            {onSkip ? (
              <DiffuseTextLink label={t('common_skip')} onPress={onSkip} />
            ) : closeHandler ? (
              <Pressable onPress={closeHandler} hitSlop={8}>
                <View style={[dStyles.circleBtn, { borderColor: dt.colors.line2 }]}>
                  <Ionicons name="close" size={18} color={dt.colors.ink} />
                </View>
              </Pressable>
            ) : (
              <View style={dStyles.circleBtn} />
            )}
          </View>

          {/* .prog — hairline progress track + accent fill */}
          <View style={[dStyles.progTrack, { backgroundColor: dt.colors.line }]}>
            <View
              style={[
                dStyles.progFill,
                { width: `${pct * 100}%`, backgroundColor: accent },
              ]}
            />
          </View>

          {/* .q — serif question + optional italic accent line */}
          <View style={dStyles.questionWrap}>
            <Text
              style={[
                dStyles.question,
                { fontFamily: diffuseFont.displayLight, color: dt.colors.ink },
              ]}
            >
              {question}
            </Text>
            {italicSuffix ? (
              <Text
                style={[
                  dStyles.question,
                  { fontFamily: diffuseFont.italic, color: dt.colors.ink3 },
                ]}
              >
                {italicSuffix}
              </Text>
            ) : null}
          </View>
        </View>

        {/* Content area */}
        <View style={dStyles.content}>{children}</View>

        {/* .cta — containerless solid action pinned bottom */}
        <View style={[dStyles.bottom, { paddingBottom: insets.bottom + 16 }]}>
          <DiffuseSolidCTA
            label={ctaLabel}
            onPress={onContinue}
            disabled={continueDisabled}
            icon={finish ? 'check' : 'arrow'}
          />
        </View>
      </AuraField>
    )
  }

  const bg = colors.bg
  const paper = colors.surface
  const paperBorder = colors.border
  const ink = isDark ? colors.text : '#141313'
  const ink3 = colors.textMuted

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
                {t('common_skip')}
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

        {/* Question + optional sticker accent on the right */}
        <View style={styles.questionRow}>
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
          {sticker ? (
            <View style={styles.stickerSlot}>{sticker}</View>
          ) : null}
        </View>
      </View>

      {/* Input area — clusters directly under the question. Bottom CTA
          is anchored via marginTop:'auto' on the bottom container. */}
      <View style={styles.content}>{children}</View>

      {/* Bottom action — anchored to the bottom by the parent flex layout */}
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

  questionRow: {
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  questionWrap: { flex: 1 },
  stickerSlot: {
    marginTop: 4,
    transform: [{ rotate: '8deg' }],
  },

  content: {
    paddingHorizontal: 24,
    paddingTop: 22,
  },

  bottom: {
    marginTop: 'auto',
    paddingHorizontal: 24,
    paddingTop: 8,
  },
})

// Diffuse (v3) shell styles — parallel to `styles`, applied only in the
// `if (diffuse)` branch. Colors are injected inline from useDiffuseTheme().
const dStyles = StyleSheet.create({
  top: {
    paddingHorizontal: 24,
    gap: 22,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 38,
  },
  circleBtn: {
    width: 38,
    height: 38,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepLabel: {
    fontSize: 12,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  progTrack: {
    height: 3,
    borderRadius: 999,
    overflow: 'hidden',
  },
  progFill: {
    height: 3,
    borderRadius: 999,
  },
  questionWrap: {},
  question: {
    fontSize: 35,
    lineHeight: 40,
    letterSpacing: -0.4,
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 22,
  },
  bottom: {
    marginTop: 'auto',
    paddingHorizontal: 24,
    paddingTop: 8,
  },
})
