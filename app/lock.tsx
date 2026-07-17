/**
 * App-lock screen (Phase 1 / WS2d). Two modes via ?mode=:
 *   - verify (default): gate the app. Auto-prompts biometrics if enabled, else a
 *     4-digit PIN. On success → unlock() and dismiss.
 *   - set: create/replace the PIN (from settings). Enter twice to confirm.
 *
 * Uses a custom numeric pad (no PIN pad exists in the app). Tokenized for cream +
 * diffuse. The PIN hash lives in the keychain (lib/appLock.ts), never here.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { View, Text, Pressable, StyleSheet, Vibration } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { Delete, Fingerprint, ScanFace } from 'lucide-react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme, useDiffuseTheme, diffuseFont, diffuseTypeRole } from '../constants/theme'
import { useTranslation } from '../lib/i18n'
import { Display, DisplayItalic } from '../components/ui/Typography'
import { GrandmaLogo } from '../components/ui/GrandmaLogo'
import { useIsDiffuse } from '../components/ui/diffuse/DiffuseKit'
import { useAppLockStore } from '../store/useAppLockStore'
import {
  verifyPin, setPin, authenticateBiometric, isBiometricAvailable, biometricLabel,
} from '../lib/appLock'

const PIN_LENGTH = 4

export default function LockScreen() {
  const { mode } = useLocalSearchParams<{ mode?: string }>()
  const isSet = mode === 'set'

  const { colors, font, stickers, radius, isDark } = useTheme()
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
  const insets = useSafeAreaInsets()
  const { t } = useTranslation()

  const unlock = useAppLockStore((s) => s.unlock)
  const setEnabled = useAppLockStore((s) => s.setEnabled)
  const biometricEnabled = useAppLockStore((s) => s.biometricEnabled)

  const [entry, setEntry] = useState('')
  const [firstPin, setFirstPin] = useState<string | null>(null) // set-mode confirm
  const [error, setError] = useState(false)
  const [bioType, setBioType] = useState<'face' | 'fingerprint' | 'generic' | null>(null)
  const busy = useRef(false)

  const ink = diffuse ? dt.colors.ink : colors.text
  const inkMuted = diffuse ? dt.colors.ink3 : colors.textMuted
  const accent = diffuse ? dt.stickers.lilac : stickers.lilac
  const dotEmpty = diffuse ? dt.colors.line2 : colors.borderStrong
  const dotFill = diffuse ? dt.colors.ink : accent

  const promptText = isSet
    ? (firstPin ? t('lock_confirmPin') : t('lock_setPin'))
    : t('lock_enterPin')

  const tryBiometric = useCallback(async () => {
    if (isSet || !biometricEnabled || busy.current) return
    if (!(await isBiometricAvailable())) return
    busy.current = true
    const ok = await authenticateBiometric(t('lock_biometricPrompt'))
    busy.current = false
    if (ok) unlock()
  }, [isSet, biometricEnabled, unlock, t])

  useEffect(() => {
    if (!isSet) {
      isBiometricAvailable().then((avail) => { if (avail) biometricLabel().then(setBioType) })
      void tryBiometric()
    }
  }, [isSet, tryBiometric])

  async function commit(pin: string) {
    if (isSet) {
      if (!firstPin) {
        setFirstPin(pin)
        setEntry('')
        return
      }
      if (firstPin === pin) {
        try {
          await setPin(pin)
          setEnabled(true)
          router.back()
        } catch {
          // SecureStore write failed — surface it instead of hanging the pad.
          fail()
          setFirstPin(null)
        }
      } else {
        fail()
        setFirstPin(null)
      }
      return
    }
    // verify mode
    if (await verifyPin(pin)) {
      unlock()
    } else {
      fail()
    }
  }

  function fail() {
    setError(true)
    Vibration.vibrate(200)
    setTimeout(() => { setEntry(''); setError(false) }, 500)
  }

  function press(digit: string) {
    if (error || entry.length >= PIN_LENGTH) return
    const next = entry + digit
    setEntry(next)
    if (next.length === PIN_LENGTH) setTimeout(() => commit(next), 120)
  }

  function backspace() {
    if (error) return
    setEntry((e) => e.slice(0, -1))
  }

  const BioIcon = bioType === 'face' ? ScanFace : Fingerprint

  return (
    <View style={[styles.root, { backgroundColor: diffuse ? dt.colors.bg : colors.bg, paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]}>
      <View style={styles.top}>
        <GrandmaLogo size={64} />
        <Display size={26} color={ink} align="center" style={{ marginTop: 18 }}>{promptText}</Display>
        {isSet && (
          <DisplayItalic size={15} color={inkMuted} align="center" style={{ marginTop: 4 }}>
            {t('lock_setSubtitle')}
          </DisplayItalic>
        )}

        {/* PIN dots */}
        <View style={styles.dots}>
          {Array.from({ length: PIN_LENGTH }).map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                { borderColor: error ? stickers.coral : dotEmpty },
                i < entry.length && { backgroundColor: error ? stickers.coral : dotFill, borderColor: error ? stickers.coral : dotFill },
              ]}
            />
          ))}
        </View>
      </View>

      {/* Numeric pad */}
      <View style={styles.pad}>
        {[['1', '2', '3'], ['4', '5', '6'], ['7', '8', '9']].map((row) => (
          <View key={row[0]} style={styles.padRow}>
            {row.map((d) => (
              <PadKey key={d} label={d} onPress={() => press(d)} ink={ink} keyBg={diffuse ? dt.colors.surface : colors.surface} border={diffuse ? dt.colors.line : colors.border} font={diffuse ? diffuseTypeRole.numHero : font.display} radius={radius.full} />
            ))}
          </View>
        ))}
        <View style={styles.padRow}>
          {/* biometric shortcut (verify mode only) */}
          {!isSet && bioType ? (
            <Pressable onPress={tryBiometric} style={styles.padKey} hitSlop={6}>
              <BioIcon size={26} color={accent} strokeWidth={1.8} />
            </Pressable>
          ) : <View style={styles.padKey} />}
          <PadKey label="0" onPress={() => press('0')} ink={ink} keyBg={diffuse ? dt.colors.surface : colors.surface} border={diffuse ? dt.colors.line : colors.border} font={diffuse ? diffuseTypeRole.numHero : font.display} radius={radius.full} />
          <Pressable onPress={backspace} style={styles.padKey} hitSlop={6}>
            <Delete size={24} color={inkMuted} strokeWidth={1.8} />
          </Pressable>
        </View>
      </View>
    </View>
  )
}

function PadKey({ label, onPress, ink, keyBg, border, font, radius }: {
  label: string; onPress: () => void; ink: string; keyBg: string; border: string; font: string; radius: number
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.padKey, { backgroundColor: keyBg, borderColor: border, borderRadius: radius }, pressed && { opacity: 0.6 }]}
    >
      <Text style={[styles.padKeyText, { color: ink, fontFamily: font }]}>{label}</Text>
    </Pressable>
  )
}

const KEY = 74

const styles = StyleSheet.create({
  root: { flex: 1, paddingHorizontal: 32, justifyContent: 'space-between' },
  top: { alignItems: 'center', marginTop: 24 },
  dots: { flexDirection: 'row', gap: 18, marginTop: 32 },
  dot: { width: 16, height: 16, borderRadius: 8, borderWidth: 2 },
  pad: { gap: 16, alignItems: 'center' },
  padRow: { flexDirection: 'row', gap: 24, justifyContent: 'center' },
  padKey: {
    width: KEY, height: KEY, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1,
  },
  padKeyText: { fontSize: 28 },
})
