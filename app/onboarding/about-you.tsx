/**
 * About You — shared onboarding step (Phase 0 / B5).
 *
 * Sits between journey selection and the first per-mode flow. Captures the
 * user's name (fixes the bug where profiles.name was never populated because
 * setParentName was never called) and, optionally, their date of birth (feeds
 * profiles.dob → prediction calibration). Both are read by each mode's
 * saveAndFinish via useJourneyStore.
 *
 * Renders through OnboardingStep, so the cream + diffuse variants are handled
 * for us — we only supply the fields.
 */

import { useState } from 'react'
import { View, Text, TextInput, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { OnboardingStep } from '../../components/onboarding/OnboardingStep'
import { DiffuseField } from '../../components/ui/diffuse/DiffuseField'
import DatePickerField from '../../components/ui/DatePickerField'
import { useIsDiffuse } from '../../components/ui/diffuse/DiffuseKit'
import { useTheme } from '../../constants/theme'
import { SiteSticker } from '../../components/stickers/SiteSticker'
import { useJourneyStore } from '../../store/useJourneyStore'
import { HandDrawnBox } from '../../components/ui/HandDrawn'
import { ACTION_TONES } from '../../components/ui/AuthDock'
import { useTranslation } from '../../lib/i18n'

export default function AboutYouScreen() {
  const { colors, radius, font } = useTheme()
  const diffuse = useIsDiffuse()
  const { t } = useTranslation()

  // The first mode route to continue to, passed by journey.tsx.
  const { next } = useLocalSearchParams<{ next?: string }>()

  const parentName = useJourneyStore((s) => s.parentName)
  const setParentName = useJourneyStore((s) => s.setParentName)
  const parentDob = useJourneyStore((s) => s.parentDob)
  const setParentDob = useJourneyStore((s) => s.setParentDob)

  const [name, setName] = useState(parentName ?? '')
  const [dob, setDob] = useState(parentDob ?? '')

  function persistAndGo() {
    setParentName(name.trim() ? name.trim() : null)
    setParentDob(dob || null)
    // Continue to the first per-mode flow. replace() so Back doesn't return here.
    if (next) router.replace(next as any)
    else router.back()
  }

  // Sensible DOB bounds: 13–100 years ago.
  const now = new Date()
  const maxDob = new Date(now.getFullYear() - 13, now.getMonth(), now.getDate())
  const minDob = new Date(now.getFullYear() - 100, now.getMonth(), now.getDate())

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <OnboardingStep
        step={1}
        total={2}
        auraMode="pre-pregnancy"
        question={t('aboutYou_question')}
        italicSuffix={t('aboutYou_questionItalic')}
        sticker={<SiteSticker name="me" size={48} cut />}
        onContinue={persistAndGo}
        onSkip={persistAndGo}
        continueDisabled={!name.trim()}
        ctaSticker="pencil"
        ctaTone={ACTION_TONES.yellow}
      >
        <View style={styles.fields}>
          {diffuse ? (
            <DiffuseField
              value={name}
              onChangeText={setName}
              placeholder={t('aboutYou_namePlaceholder')}
              autoCapitalize="words"
            />
          ) : (
            <HandDrawnBox fill={colors.surface} stroke={colors.text} radius={16} seed="name">
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder={t('aboutYou_namePlaceholder')}
                placeholderTextColor={colors.textMuted}
                autoCapitalize="words"
                autoFocus
                style={[styles.input, { color: colors.text, fontFamily: font.body }]}
              />
            </HandDrawnBox>
          )}

          {!name.trim() ? (
            <Text style={{ fontFamily: font.body, fontSize: 13, lineHeight: 18, color: colors.textMuted, marginTop: -8 }}>
              {t('aboutYou_nameHint')}
            </Text>
          ) : null}

          <DatePickerField
            inline
            label={t('aboutYou_dobLabel')}
            value={dob}
            onChange={setDob}
            placeholder={t('aboutYou_dobPlaceholder')}
            modalTitle={t('aboutYou_dobLabel')}
            maximumDate={maxDob}
            minimumDate={minDob}
            defaultDate={new Date(now.getFullYear() - 30, 0, 1)}
          />
        </View>
      </OnboardingStep>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  fields: { gap: 20 },
  input: {
    paddingHorizontal: 18,
    height: 60,
    fontSize: 17,
  },
})
