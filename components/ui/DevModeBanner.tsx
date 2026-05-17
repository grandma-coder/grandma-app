/**
 * DevModeBanner — persistent "DEV MODE · PANEL · EXIT" pill shown when
 * useDevStore is active.
 *   - PANEL jumps back to /dev-panel without leaving dev mode, so you can
 *     bounce between flows without the 5-tap gesture every time.
 *   - EXIT restores the onboarding store snapshot and navigates home.
 */

import { View, Text, Pressable, StyleSheet } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { router, usePathname } from 'expo-router'
import { useDevStore } from '../../store/useDevStore'

export function DevModeBanner() {
  const active = useDevStore((s) => s.active)
  const exit = useDevStore((s) => s.exit)
  const insets = useSafeAreaInsets()
  const pathname = usePathname()

  if (!active) return null

  // Hide the PANEL button when we're already on the panel.
  const onPanel = pathname === '/dev-panel'

  function handleExit() {
    exit()
    router.replace('/' as any)
  }

  function handlePanel() {
    router.push('/dev-panel' as any)
  }

  return (
    <View
      style={[styles.root, { paddingTop: insets.top + 4 }]}
      pointerEvents="box-none"
    >
      <View style={styles.pill}>
        <Text style={styles.dot}>●</Text>
        <Text style={styles.label}>DEV MODE</Text>
        <Text style={styles.sub}>changes won't be saved</Text>
        {!onPanel && (
          <Pressable onPress={handlePanel} hitSlop={8} style={styles.panelBtn}>
            <Text style={styles.panelText}>PANEL</Text>
          </Pressable>
        )}
        <Pressable onPress={handleExit} hitSlop={8} style={styles.exitBtn}>
          <Text style={styles.exitText}>EXIT</Text>
        </Pressable>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  root: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 9999,
    elevation: 9999,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FF6B35',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  dot: {
    color: '#FFFFFF',
    fontSize: 8,
    marginTop: -2,
  },
  label: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  sub: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 10,
    fontStyle: 'italic',
  },
  panelBtn: {
    backgroundColor: 'rgba(255,255,255,0.22)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    marginLeft: 4,
  },
  panelText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  exitBtn: {
    backgroundColor: 'rgba(0,0,0,0.2)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    marginLeft: 4,
  },
  exitText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
})
