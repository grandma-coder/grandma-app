/**
 * Parent Name (Apr 2026 redesign) — "What should grandma call you?"
 *
 * Cream canvas, Fraunces display headline + italic accent,
 * paper card input with MONO-CAPS label and serif value.
 */

import { useState } from 'react'
import { View, TextInput, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native'
import { router } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useJourneyStore } from '../../store/useJourneyStore'
import { useModeStore } from '../../store/useModeStore'
import { useTheme, stickers } from '../../constants/theme'
import { Squishy, Heart } from '../../components/ui/Stickers'
import { Display, DisplayItalic, MonoCaps, Body } from '../../components/ui/Typography'
import { PillButton } from '../../components/ui/PillButton'
import { ScreenHeader } from '../../components/ui/ScreenHeader'

export default function ParentName() {
  const insets = useSafeAreaInsets()
  const { colors, font, isDark } = useTheme()
  const setParentName = useJourneyStore((s) => s.setParentName)
  const mode = useModeStore((s) => s.mode)
  const [name, setName] = useState('')

  const bg = isDark ? colors.bg : '#F3ECD9'
  const paper = isDark ? colors.surface : '#FFFEF8'
  const paperBorder = isDark ? colors.border : 'rgba(20,19,19,0.08)'
  const ink = isDark ? colors.text : '#141313'
  const ink3 = isDark ? colors.textMuted : '#6E6763'
  const ink4 = isDark ? colors.textFaint : '#A69E93'

  function handleContinue() {
    if (name.trim()) setParentName(name.trim())
    if (mode === 'pregnancy') router.push('/onboarding/due-date')
    else router.push('/onboarding/baby-name')
  }

  return (
    <View style={[styles.root, { backgroundColor: bg }]}>
      {/* Decorative stickers */}
      <View style={[styles.stickerTR, { transform: [{ rotate: '-8deg' }] }]}>
        <Squishy w={110} h={70} fill={isDark ? stickers.yellow : '#F5D652'} />
      </View>
      <View style={[styles.stickerTR2, { transform: [{ rotate: '16deg' }] }]}>
        <Heart size={40} fill={isDark ? stickers.pink : '#F2B2C7'} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={[styles.container, { paddingTop: insets.top + 12 }]}>
          <ScreenHeader title="2 / 10" right={<Body color={ink3} size={13}>Skip</Body>} />

          <View style={styles.content}>
            <Display size={40} color={ink} style={{ marginTop: 40 }}>
              What should
            </Display>
            <Display size={40} color={ink}>
              grandma
            </Display>
            <DisplayItalic size={40} color={ink} style={{ marginBottom: 28 }}>
              call you?
            </DisplayItalic>

            {/* Paper card input */}
            <View style={[styles.inputCard, { backgroundColor: paper, borderColor: paperBorder }]}>
              <MonoCaps color={ink4} style={{ marginBottom: 8 }}>YOUR NAME</MonoCaps>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="Amelia"
                placeholderTextColor={ink4}
                selectionColor={ink}
                autoCapitalize="words"
                style={[styles.inputText, { fontFamily: font.display, color: ink }]}
              />
            </View>

            <Body size={13} color={ink3} style={styles.helper}>
              Grandma will use this in her notes to you.
            </Body>
          </View>

          <View style={{ paddingBottom: insets.bottom + 24 }}>
            <PillButton
              label="Continue →"
              onPress={handleContinue}
              variant="ink"
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, overflow: 'hidden' },
  stickerTR: { position: 'absolute', top: 80, right: 20, zIndex: 0 },
  stickerTR2: { position: 'absolute', top: 130, right: 70, zIndex: 0 },

  container: {
    flex: 1,
    paddingHorizontal: 24,
    zIndex: 1,
  },

  content: { flex: 1 },

  inputCard: {
    borderRadius: 24,
    borderWidth: 1,
    paddingHorizontal: 22,
    paddingVertical: 18,
  },
  inputText: {
    fontSize: 26,
    letterSpacing: -0.4,
  },
  helper: {
    marginTop: 12,
    letterSpacing: 0.1,
  },
})
