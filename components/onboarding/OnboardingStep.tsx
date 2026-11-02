/**
 * OnboardingStep — shared wrapper for multi-step onboarding flows.
 *
 * Apr 2026 redesign: cream canvas, paper-card inputs, Fraunces display
 * heading with optional italic accent word, ink pill CTA.
 *
 * Shows: back button (optional), step counter "N / Total",
 * optional Skip, Fraunces display question, ink Continue pill.
 */

import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { View, Text, Pressable, StyleSheet, Animated } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import {
  useTheme,
  useDiffuseTheme,
  diffuseFont,
  getDiffuseAccent,
  getModeField,
  font as themeFont,
} from '../../constants/theme'
import { EyeAction, ACTION_TONES } from '../ui/AuthDock'
import type { SiteStickerName } from '../stickers/SiteSticker'
import { InkBackButton } from '../ui/InkBackButton'
import { FadeUp, StickerEnter } from '../ui/Motion'
import Svg, { Path } from 'react-native-svg'
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
  auraMode?: 'pre-pregnancy' | 'pregnancy' | 'kids' | 'menopause'
  /** Diffuse variant: explicit progress 0..1 for the hairline bar (defaults to step/total) */
  progress?: number
  /** Site look: sticker + tone on the continue disc. Defaults rotate by step so a flow doesn't repeat. */
  ctaSticker?: SiteStickerName
  ctaTone?: string
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
  ctaSticker,
  ctaTone,
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
  const paperBorder = colors.text
  const ink = colors.text
  const ink3 = colors.textMuted

  const pct = Math.max(0, Math.min(1, progress ?? (total > 0 ? step / total : 0)))
  const ctaLabel = continueLabel.replace(/[→✓]/g, '').trim()

  return (
    <View style={[styles.root, { backgroundColor: bg }]}>
      {/* Top bar */}
      <View style={[styles.top, { paddingTop: insets.top + 12 }]}>
        <View style={styles.navRow}>
          {backHandler ? (
            <InkBackButton onPress={backHandler} ink={ink} paper={paper} style={styles.navBtn} />
          ) : (
            <View style={styles.navSpacer} />
          )}

          {/* progress: the tab bar's wavy line, filling pink as you go */}
          <View style={styles.progress} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: total, now: step }}>
            <WaveProgress pct={pct} ink={ink} />
            <Text style={[styles.stepCount, { color: ink3 }]}>{step} / {total}</Text>
          </View>

          {onSkip ? (
            <Pressable onPress={onSkip} hitSlop={10} style={styles.navSpacer}>
              <Text style={[styles.skipHeaderText, { color: ink3 }]}>{t('common_skip')}</Text>
            </Pressable>
          ) : closeHandler ? (
            <InkBackButton onPress={closeHandler} ink={ink} paper={paper} icon="close" label={t('common_close')} style={styles.navBtn} />
          ) : (
            <View style={styles.navSpacer} />
          )}
        </View>

        {/* Question + optional sticker accent on the right */}
        <FadeUp index={0} delay={60}>
          <View style={styles.questionRow}>
            <View style={styles.questionWrap}>
              <Text style={[styles.siteTitle, { fontFamily: font.display, color: ink }]}>
                {question}
              </Text>
              {italicSuffix && (
                <Text style={[styles.siteTitle, { fontFamily: font.display, color: colors.textSecondary }]}>
                  {italicSuffix}
                </Text>
              )}
            </View>
            {sticker ? (
              <StickerEnter delay={320} tilt={8} seed={step} style={styles.stickerSlot}>{sticker}</StickerEnter>
            ) : null}
          </View>
        </FadeUp>
      </View>

      {/* Input area — clusters directly under the question. */}
      <FadeUp index={1} delay={60} style={styles.content}>{children}</FadeUp>

      {/* Primary action — the pink eye disc, anchored to the bottom */}
      <View style={[styles.bottom, { paddingBottom: insets.bottom + 10 }]}>
        <EyeAction
          label={ctaLabel}
          onPress={onContinue}
          ink={ink}
          disabled={continueDisabled}
          index={2}
          delay={200}
          sticker={ctaSticker ?? CTA_ROTATION[(step - 1) % CTA_ROTATION.length].sticker}
          fill={ctaTone ?? CTA_ROTATION[(step - 1) % CTA_ROTATION.length].tone}
        />
      </View>
    </View>
  )
}

/** Wavy progress line: faint ink track, pink fill that springs to `pct`. */
function WaveProgress({ pct, ink }: { pct: number; ink: string }) {
  const [w, setW] = useState(0)
  const fill = useRef(new Animated.Value(0)).current
  useEffect(() => {
    Animated.spring(fill, { toValue: pct, friction: 9, tension: 50, useNativeDriver: false }).start()
  }, [pct, fill])
  const wave = (color: string, sw: number) => (
    <Svg width={w} height={10} viewBox="0 0 200 12" preserveAspectRatio="none">
      <Path d="M0 7 C25 3 45 10 75 6 S130 2 160 7 S190 9 200 6" stroke={color} strokeWidth={sw} fill="none" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
    </Svg>
  )
  return (
    <View style={styles.waveTrack} onLayout={(e) => setW(Math.round(e.nativeEvent.layout.width))}>
      {w > 0 ? (
        <>
          <View style={{ opacity: 0.18 }}>{wave(ink, 2.4)}</View>
          <Animated.View style={[styles.waveFill, { width: fill.interpolate({ inputRange: [0, 1], outputRange: [0, w] }) }]}>
            {wave(PROGRESS_PINK, 3.2)}
          </Animated.View>
        </>
      ) : null}
    </View>
  )
}

const PROGRESS_PINK = '#E0709A'

// Default continue disc per step — a different sticker and tone each time.
const CTA_ROTATION: { sticker: SiteStickerName; tone: string }[] = [
  { sticker: 'heart', tone: ACTION_TONES.pink },
  { sticker: 'star', tone: ACTION_TONES.yellow },
  { sticker: 'flower', tone: ACTION_TONES.lilac },
  { sticker: 'leaf', tone: ACTION_TONES.green },
  { sticker: 'cloud', tone: ACTION_TONES.blue },
  { sticker: 'bell', tone: ACTION_TONES.peach },
]

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
  navBtn: { marginBottom: 0 },
  navSpacer: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  progress: { flex: 1, marginHorizontal: 16, alignItems: 'center', gap: 2 },
  waveTrack: { alignSelf: 'stretch', height: 10 },
  waveFill: { position: 'absolute', left: 0, top: 0, height: 10, overflow: 'hidden' },
  stepCount: { fontFamily: 'SpaceMono_400Regular', fontSize: 10, letterSpacing: 1.4 },
  skipHeaderText: { fontFamily: themeFont.bodyBold, fontSize: 13 },
  siteTitle: { fontSize: 28, lineHeight: 33, letterSpacing: 0.2, textTransform: 'uppercase' },

  questionRow: {
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  questionWrap: { flex: 1 },
  stickerSlot: {
    marginTop: 4,
  },

  content: {
    paddingHorizontal: 24,
    paddingTop: 22,
  },

  bottom: {
    marginTop: 'auto',
    paddingHorizontal: 24,
    paddingTop: 8,
    alignItems: 'center',
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
