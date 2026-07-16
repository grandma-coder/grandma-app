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
import { View, TextInput, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { OnboardingStep } from '../../components/onboarding/OnboardingStep'
import { DiffuseField } from '../../components/ui/diffuse/DiffuseField'
import DatePickerField from '../../components/ui/DatePickerField'
import { useIsDiffuse } from '../../components/ui/diffuse/DiffuseKit'
import { useTheme, stickers } from '../../constants/theme'
import { Heart } from '../../components/ui/Stickers'
import { useJourneyStore } from '../../store/useJourneyStore'
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
        sticker={<Heart size={56} fill={stickers.pink} />}
        onContinue={persistAndGo}
        onSkip={persistAndGo}
        continueDisabled={!name.trim()}
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
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder={t('aboutYou_namePlaceholder')}
              placeholderTextColor={colors.textMuted}
              autoCapitalize="words"
              autoFocus
              style={[
                styles.input,
                {
                  color: colors.text,
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  borderRadius: radius.md,
                  fontFamily: font.bodyMedium,
                },
              ]}
            />
          )}

          <DatePickerField
            inline
            label={t('aboutYou_dobLabel')}
            value={dob}
            onChange={setDob}
            placeholder={t('aboutYou_dobPlaceholder')}
            modalTitle={t('aboutYou_dobLabel')}
            maximumDate={maxDob}
            minimumDate={minDob}
          />
        </View>
      </OnboardingStep>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  fields: { gap: 20 },
  input: {
    borderWidth: 1,
    paddingHorizontal: 18,
    height: 60,
    fontSize: 17,
  },
})
