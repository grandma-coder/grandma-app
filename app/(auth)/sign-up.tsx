/**
 * Sign Up — paper card form (Apr 2026 redesign)
 */

import { useState } from 'react'
import {
  View,
  Text,
  TextInput,
  Alert,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native'
import { router } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '../../lib/supabase'
import { useTheme, stickers } from '../../constants/theme'
import { Squishy, Heart } from '../../components/ui/Stickers'
import { useSavedToast } from '../../components/ui/SavedToast'

export default function SignUp() {
  const insets = useSafeAreaInsets()
  const { colors, font, isDark } = useTheme()
  const toast = useSavedToast()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  async function signUp() {
    setLoading(true)
    const { error } = await supabase.auth.signUp({ email, password })
    if (error) {
      Alert.alert('Error', error.message)
    } else {
      toast.show({
        title: 'Welcome aboard!',
        message: 'Check your email to confirm your account, then sign in.',
        autoDismiss: 2800,
      })
      setTimeout(() => router.replace('/(auth)/sign-in'), 1200)
    }
    setLoading(false)
  }

  const bg = isDark ? colors.bg : '#F3ECD9'
  const paper = isDark ? colors.surface : '#FFFEF8'
  const paperBorder = isDark ? colors.border : 'rgba(20,19,19,0.08)'
  const ink = isDark ? colors.text : '#141313'
  const ink3 = isDark ? colors.textMuted : '#6E6763'
  const ink4 = isDark ? colors.textFaint : '#A69E93'

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
        <ScrollView
          contentContainerStyle={[
            styles.container,
            { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 32 },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Back button */}
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <View style={[styles.backBtn, { backgroundColor: paper, borderColor: paperBorder }]}>
              <Ionicons name="chevron-back" size={20} color={ink} />
            </View>
          </Pressable>

          {/* Heading */}
          <Text style={[styles.heading, { fontFamily: font.display, color: ink }]}>
            What should
          </Text>
          <Text style={[styles.heading, { fontFamily: font.display, color: ink }]}>
            grandma
          </Text>
          <Text style={[styles.headingItalic, { fontFamily: font.italic, color: ink }]}>
            call you?
          </Text>
          <Text style={[styles.sub, { fontFamily: font.body, color: ink3 }]}>
            Create an account to start your journey.
          </Text>

          {/* Paper card inputs */}
          <View style={[styles.inputCard, { backgroundColor: paper, borderColor: paperBorder }]}>
            <Text style={[styles.inputLabel, { fontFamily: font.bodySemiBold, color: ink4 }]}>
              EMAIL
            </Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              style={[styles.inputText, { fontFamily: font.display, color: ink }]}
              selectionColor={ink}
              placeholder="your@email.com"
              placeholderTextColor={ink4}
            />
          </View>

          <View style={[styles.inputCard, { backgroundColor: paper, borderColor: paperBorder }]}>
            <Text style={[styles.inputLabel, { fontFamily: font.bodySemiBold, color: ink4 }]}>
              PASSWORD
            </Text>
            <TextInput
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              style={[styles.inputText, { fontFamily: font.display, color: ink }]}
              selectionColor={ink}
              placeholder="min 6 characters"
              placeholderTextColor={ink4}
            />
          </View>

          {/* CTA */}
          <Pressable
            onPress={signUp}
            disabled={loading}
            style={({ pressed }) => [
              styles.cta,
              {
                backgroundColor: ink,
                opacity: pressed ? 0.88 : loading ? 0.6 : 1,
                transform: [{ scale: pressed ? 0.98 : 1 }],
              },
            ]}
          >
            <Text style={[styles.ctaText, { fontFamily: font.bodyMedium, color: bg }]}>
              {loading ? 'Creating…' : 'Continue →'}
            </Text>
          </Pressable>

          {/* Switch */}
          <Pressable onPress={() => router.push('/(auth)/sign-in')}>
            <Text style={[styles.switchLink, { fontFamily: font.body, color: ink3 }]}>
              Already have an account?{' '}
              <Text style={{ fontFamily: font.bodySemiBold, color: ink }}>Sign in</Text>
            </Text>
          </Pressable>

          {/* Terms */}
          <Text style={[styles.terms, { fontFamily: font.body, color: ink4 }]}>
            By continuing, you agree to Grandma's{' '}
            <Text style={{ textDecorationLine: 'underline' }}>Terms of Serenity</Text>
            {' '}and{' '}
            <Text style={{ textDecorationLine: 'underline' }}>Privacy Policy</Text>.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, overflow: 'hidden' },

  stickerTR: {
    position: 'absolute',
    top: 80,
    right: 20,
    zIndex: 0,
  },
  stickerTR2: {
    position: 'absolute',
    top: 130,
    right: 70,
    zIndex: 0,
  },

  container: {
    flexGrow: 1,
    paddingHorizontal: 24,
    zIndex: 1,
  },

  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },

  heading: {
    fontSize: 40,
    lineHeight: 42,
    letterSpacing: -1, fontFamily: 'Fraunces_600SemiBold' },
  headingItalic: {
    fontSize: 40,
    lineHeight: 42,
    letterSpacing: -0.5,
    marginBottom: 10, fontFamily: 'Fraunces_600SemiBold' },
  sub: {
    fontSize: 15,
    marginBottom: 28,
  },

  inputCard: {
    borderRadius: 20,
    padding: 14,
    borderWidth: 1,
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 10,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  inputText: {
    fontSize: 18,
    letterSpacing: -0.3,
  },

  cta: {
    height: 58,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    marginTop: 8,
  },
  ctaText: { fontSize: 16 },

  switchLink: {
    textAlign: 'center',
    fontSize: 14,
    marginBottom: 16,
  },

  terms: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 16,
  },
})
