/**
 * DevPanelContext — gated behind __DEV__ or EXPO_PUBLIC_ENABLE_DEV_PANEL.
 *
 * Provides openDevPanel/closeDevPanel to the app.
 * Mounts DevPanel overlay only in dev mode.
 * Shake-to-open on physical devices.
 */

import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import {
  View,
  Text,
  Pressable,
  ScrollView,
  Modal,
  StyleSheet,
  Alert,
} from 'react-native'
import * as Haptics from 'expo-haptics'
import { Accelerometer } from 'expo-sensors'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { X } from 'lucide-react-native'
import { useTheme, brand } from '../constants/theme'
import { useBehaviorStore, type Behavior } from '../store/useBehaviorStore'
import { useModeStore } from '../store/useModeStore'
import { useOnboardingStore } from '../store/useOnboardingStore'
import { supabase } from '../lib/supabase'

const IS_DEV = __DEV__ || process.env.EXPO_PUBLIC_ENABLE_DEV_PANEL === 'true'

// ─── Context ───────────────────────────────────────────────────────────────

interface DevPanelContextType {
  isOpen: boolean
  openDevPanel: () => void
  closeDevPanel: () => void
}

const DevPanelContext = createContext<DevPanelContextType>({
  isOpen: false,
  openDevPanel: () => {},
  closeDevPanel: () => {},
})

export const useDevPanel = () => useContext(DevPanelContext)

// ─── Provider ──────────────────────────────────────────────────────────────

export function DevPanelProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)

  // Shake detection (physical device only)
  useEffect(() => {
    if (!IS_DEV) return

    let lastShake = 0
    const subscription = Accelerometer.addListener(({ x, y, z }) => {
      const acceleration = Math.sqrt(x * x + y * y + z * z)
      const now = Date.now()
      if (acceleration > 1.8 && now - lastShake > 2000) {
        lastShake = now
        setIsOpen(true)
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      }
    })
    Accelerometer.setUpdateInterval(300)
    return () => subscription.remove()
  }, [])

  return (
    <DevPanelContext.Provider
      value={{
        isOpen,
        openDevPanel: () => setIsOpen(true),
        closeDevPanel: () => setIsOpen(false),
      }}
    >
      {children}
      {IS_DEV && <DevPanel visible={isOpen} onClose={() => setIsOpen(false)} />}
    </DevPanelContext.Provider>
  )
}

// ─── Dev Panel UI ──────────────────────────────────────────────────────────

function DevPanel({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { colors, radius } = useTheme()
  const insets = useSafeAreaInsets()

  const enrolledBehaviors = useBehaviorStore((s) => s.enrolledBehaviors)
  const currentBehavior = useBehaviorStore((s) => s.currentBehavior)
  const switchTo = useBehaviorStore((s) => s.switchTo)
  const enroll = useBehaviorStore((s) => s.enroll)
  const unenroll = useBehaviorStore((s) => s.unenroll)
  const setMode = useModeStore((s) => s.setMode)
  const onboardingQueue = useOnboardingStore((s) => s.queue)

  function quickSwitch(b: Behavior) {
    if (!enrolledBehaviors.includes(b)) enroll(b)
    switchTo(b)
    setMode(b)
    onClose()
  }

  async function resetAuth() {
    Alert.alert('Sign Out', 'This will sign you out.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: async () => { await supabase.auth.signOut(); onClose() } },
    ])
  }

  function resetBehaviors() {
    for (const b of [...enrolledBehaviors]) unenroll(b)
    onClose()
  }

  const ALL_BEHAVIORS: Behavior[] = ['pre-pregnancy', 'pregnancy', 'kids']

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={[styles.overlay, { paddingTop: insets.top }]}>
        <View style={[styles.panel, { backgroundColor: colors.bg, borderRadius: radius.xl }]}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.text }]}>Dev Panel</Text>
            <Pressable onPress={onClose}>
              <X size={22} color={colors.textMuted} />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* State */}
            <Text style={[styles.section, { color: colors.textMuted }]}>STATE</Text>
            <Text style={[styles.mono, { color: colors.textSecondary }]}>
              current: {currentBehavior ?? 'null'}{'\n'}
              enrolled: [{enrolledBehaviors.join(', ')}]{'\n'}
              queue: [{onboardingQueue.join(', ')}]
            </Text>

            {/* Quick switch */}
            <Text style={[styles.section, { color: colors.textMuted }]}>QUICK SWITCH</Text>
            <View style={styles.btnRow}>
              {ALL_BEHAVIORS.map((b) => {
                const isActive = b === currentBehavior
                const color = b === 'pre-pregnancy' ? brand.prePregnancy : b === 'pregnancy' ? brand.pregnancy : brand.kids
                const label = b === 'pre-pregnancy' ? 'Cycle' : b === 'pregnancy' ? 'Pregnancy' : 'Kids'
                return (
                  <Pressable
                    key={b}
                    onPress={() => quickSwitch(b)}
                    style={[styles.devBtn, {
                      backgroundColor: isActive ? color + '25' : colors.surface,
                      borderColor: isActive ? color : colors.border,
                      borderRadius: radius.lg,
                    }]}
                  >
                    <Text style={[styles.devBtnText, { color: isActive ? color : colors.text }]}>{label}</Text>
                  </Pressable>
                )
              })}
            </View>

            {/* Actions */}
            <Text style={[styles.section, { color: colors.textMuted }]}>ACTIONS</Text>
            <View style={styles.btnCol}>
              <DevAction label="Reset behaviors" color={brand.accent} onPress={resetBehaviors} />
              <DevAction label="Sign out" color={brand.error} onPress={resetAuth} />
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  )
}

function DevAction({ label, color, onPress }: { label: string; color: string; onPress: () => void }) {
  const { colors, radius } = useTheme()
  return (
    <Pressable
      onPress={onPress}
      style={[styles.actionBtn, { backgroundColor: color + '12', borderColor: color + '25', borderRadius: radius.lg }]}
    >
      <Text style={[styles.actionText, { color }]}>{label}</Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  panel: { maxHeight: '70%', padding: 20, margin: 12, marginBottom: 24 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  title: { fontSize: 18, fontWeight: '800' },
  section: { fontSize: 11, fontWeight: '700', letterSpacing: 1.5, marginTop: 16, marginBottom: 8 },
  mono: { fontSize: 12, fontWeight: '500', fontFamily: 'monospace', lineHeight: 18 },
  btnRow: { flexDirection: 'row', gap: 8 },
  btnCol: { gap: 8 },
  devBtn: { flex: 1, alignItems: 'center', paddingVertical: 12, borderWidth: 1 },
  devBtnText: { fontSize: 13, fontWeight: '700' },
  actionBtn: { paddingVertical: 12, alignItems: 'center', borderWidth: 1 },
  actionText: { fontSize: 14, fontWeight: '700' },
})
