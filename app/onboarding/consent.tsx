/**
 * Consent gate — the FIRST onboarding step (Phase 1 / trust & safety).
 *
 * Blocks all data collection until the user explicitly agrees to (1) processing
 * of their health/child data and (2) the privacy policy + terms. This closes the
 * gap where we collected cycle/pregnancy/child-medical data with only a passive
 * "by continuing you agree" footer.
 *
 * Records acceptance locally (useConsentStore, survives app kill) — the root
 * guard routes here before /onboarding/journey until consent is given. The
 * acceptance timestamp is also written to profiles.consented_at at onboarding
 * save for a server-side record.
 *
 * Renders through OnboardingStep so cream + diffuse variants are handled for us.
 */

import { useState } from 'react'
import { View, Text, Pressable, StyleSheet, Linking } from 'react-native'
import { router } from 'expo-router'
import { Check } from 'lucide-react-native'
import { OnboardingStep } from '../../components/onboarding/OnboardingStep'
import { useIsDiffuse } from '../../components/ui/diffuse/DiffuseKit'
import { useTheme, useDiffuseTheme, diffuseFont, getDiffuseAccent } from '../../constants/theme'
import { Heart } from '../../components/ui/Stickers'
import { useConsentStore } from '../../store/useConsentStore'
import { useTranslation } from '../../lib/i18n'

const PRIVACY_URL = 'https://grandma.app/privacy'
const TERMS_URL = 'https://grandma.app/terms'

export default function ConsentScreen() {
  const { colors, font, stickers, radius, isDark } = useTheme()
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
  const { t } = useTranslation()
  const accept = useConsentStore((s) => s.accept)

  const [agreeData, setAgreeData] = useState(false)
  const [agreePolicy, setAgreePolicy] = useState(false)
  const canContinue = agreeData && agreePolicy

  const accent = diffuse ? getDiffuseAccent('pre-pregnancy', dt.isDark) : stickers.coral
  const ink = diffuse ? dt.colors.ink : colors.text
  const inkMuted = diffuse ? dt.colors.ink3 : colors.textMuted
  const line = diffuse ? dt.colors.line : colors.border

  function onContinue() {
    if (!canContinue) return
    accept() // records consentedAt locally; profiles.consented_at written at save
    router.replace('/onboarding/journey')
  }

  function Row({ checked, onToggle, children }: { checked: boolean; onToggle: () => void; children: React.ReactNode }) {
    return (
      <Pressable
        onPress={onToggle}
        style={[styles.row, { borderColor: line, backgroundColor: diffuse ? 'transparent' : colors.surface, borderRadius: radius.md }]}
        accessibilityRole="checkbox"
        accessibilityState={{ checked }}
      >
        <View
          style={[
            styles.box,
            {
              borderColor: checked ? accent : line,
              backgroundColor: checked ? accent : 'transparent',
              borderRadius: 8,
            },
          ]}
        >
          {checked && <Check size={16} color={diffuse ? dt.colors.bg : colors.textInverse} strokeWidth={3} />}
        </View>
        <Text style={[styles.rowText, { color: ink, fontFamily: diffuse ? diffuseFont.body : font.body }]}>
          {children}
        </Text>
      </Pressable>
    )
  }

  const linkStyle = { color: accent, textDecorationLine: 'underline' as const }

  return (
    <OnboardingStep
      step={1}
      total={2}
      auraMode="pre-pregnancy"
      question={t('consent_question')}
      italicSuffix={t('consent_questionItalic')}
      sticker={<Heart size={56} fill={stickers.pink} />}
      onContinue={onContinue}
      continueDisabled={!canContinue}
      continueLabel={t('consent_cta')}
    >
      <View style={styles.wrap}>
        <Text style={[styles.intro, { color: inkMuted, fontFamily: diffuse ? diffuseFont.body : font.body }]}>
          {t('consent_intro')}
        </Text>

        <Row checked={agreeData} onToggle={() => setAgreeData((v) => !v)}>
          {t('consent_dataProcessing')}
        </Row>

        <Row checked={agreePolicy} onToggle={() => setAgreePolicy((v) => !v)}>
          {t('consent_policyPrefix')}{' '}
          <Text style={linkStyle} onPress={() => Linking.openURL(PRIVACY_URL)}>{t('privacy_privacyPolicy')}</Text>
          {' '}{t('consent_policyAnd')}{' '}
          <Text style={linkStyle} onPress={() => Linking.openURL(TERMS_URL)}>{t('privacy_termsOfService')}</Text>.
        </Row>

        <Text style={[styles.footnote, { color: inkMuted, fontFamily: diffuse ? diffuseFont.body : font.body }]}>
          {t('consent_footnote')}
        </Text>
      </View>
    </OnboardingStep>
  )
}

const styles = StyleSheet.create({
  wrap: { gap: 14 },
  intro: { fontSize: 14, lineHeight: 20, marginBottom: 4 },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 16,
    borderWidth: 1,
  },
  box: {
    width: 26,
    height: 26,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  rowText: { flex: 1, fontSize: 14, lineHeight: 20 },
  footnote: { fontSize: 12, lineHeight: 17, marginTop: 4 },
})
