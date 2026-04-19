/**
 * Baby Name (Apr 2026 redesign) — pregnancy or kids flavor.
 *
 * Cream canvas, Fraunces display headline with italic accent,
 * paper card input, ink pill CTA.
 */

import { useState } from 'react'
import { View, TextInput, Pressable, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native'
import { router } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useJourneyStore } from '../../store/useJourneyStore'
import { useModeStore } from '../../store/useModeStore'
import { useTheme, stickers } from '../../constants/theme'
import { Flower, Heart } from '../../components/ui/Stickers'
import { Display, DisplayItalic, MonoCaps, Body } from '../../components/ui/Typography'
import { PillButton } from '../../components/ui/PillButton'
import { ScreenHeader } from '../../components/ui/ScreenHeader'

export default function BabyName() {
  const insets = useSafeAreaInsets()
  const { colors, font, isDark } = useTheme()
  const setBabyName = useJourneyStore((s) => s.setBabyName)
  const mode = useModeStore((s) => s.mode)
  const [name, setName] = useState('')

  const bg = isDark ? colors.bg : '#F3ECD9'
  const paper = isDark ? colors.surface : '#FFFEF8'
  const paperBorder = isDark ? colors.border : 'rgba(20,19,19,0.08)'
  const ink = isDark ? colors.text : '#141313'
  const ink3 = isDark ? colors.textMuted : '#6E6763'
  const ink4 = isDark ? colors.textFaint : '#A69E93'

  function handleContinue() {
    if (name.trim()) setBabyName(name.trim())
    router.push('/onboarding/activities')
  }

  const isPregnancy = mode === 'pregnancy'
  const titleMain = isPregnancy ? 'Have you' : "What's your"
  const titleItalic = isPregnancy ? 'chosen a name?' : 'little one called?'

  return (
    <View style={[styles.root, { backgroundColor: bg }]}>
      {/* Stickers */}
      <View style={[styles.stickerTR, { transform: [{ rotate: '12deg' }] }]}>
        {isPregnancy ? (
          <Heart size={60} fill={isDark ? stickers.lilac : '#C8B6E8'} />
        ) : (
          <Flower size={76} petal={isDark ? stickers.pink : '#F2B2C7'} center={isDark ? stickers.yellow : '#F5D652'} />
        )}
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={[styles.container, { paddingTop: insets.top + 12 }]}>
          <ScreenHeader
            title={isPregnancy ? '5 / 10' : '4 / 10'}
            right={
              <Pressable onPress={handleContinue} hitSlop={8}>
                <Body color={ink3} size={13}>Skip</Body>
              </Pressable>
            }
          />

          <View style={{ marginTop: 32 }}>
            <Display size={36} color={ink}>{titleMain}</Display>
            <DisplayItalic size={36} color={ink}>{titleItalic}</DisplayItalic>
          </View>

          <Body color={ink3} style={styles.subtitle}>
            {isPregnancy
              ? "If you've picked a name already, grandma would love to know."
              : "Grandma would love to know who she's caring for."}
          </Body>

          {/* Paper card input */}
          <View style={[styles.inputCard, { backgroundColor: paper, borderColor: paperBorder }]}>
            <MonoCaps style={{ marginBottom: 6 }} color={ink4}>
              {isPregnancy ? "BABY'S NAME (OPTIONAL)" : "CHILD'S NAME"}
            </MonoCaps>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder={isPregnancy ? 'Little Peach' : 'Juno'}
              placeholderTextColor={ink4}
              selectionColor={ink}
              autoCapitalize="words"
              style={[styles.inputText, { fontFamily: font.display, color: ink }]}
            />
          </View>

          {isPregnancy && (
            <Pressable onPress={handleContinue} style={styles.skipInline} hitSlop={8}>
              <Body color={ink3} size={13}>We haven't decided yet</Body>
            </Pressable>
          )}
        </View>

        <View style={{ paddingBottom: insets.bottom + 16, paddingHorizontal: 24 }}>
          <PillButton label="Continue →" onPress={handleContinue} variant="ink" />
        </View>
      </KeyboardAvoidingView>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, overflow: 'hidden' },
  stickerTR: { position: 'absolute', top: 80, right: 24, zIndex: 0 },
  container: { flex: 1, paddingHorizontal: 24, zIndex: 1 },

  subtitle: { marginTop: 10, marginBottom: 24, maxWidth: 320, lineHeight: 22 },

  inputCard: {
    borderRadius: 24,
    borderWidth: 1,
    paddingHorizontal: 22,
    paddingVertical: 18,
  },
  inputText: { fontSize: 26, letterSpacing: -0.4 },

  skipInline: {
    marginTop: 18,
    alignItems: 'center',
  },
})
