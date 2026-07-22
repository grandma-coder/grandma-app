/**
 * HomeJourneySwitcher — top-right Home header control that opens a dropdown to
 * switch the active journey (Cycle / Expecting / Raising). Additive; the Profile
 * MyJourneyPillGrid remains the canonical full switcher.
 *
 * Self-gates to null in a caregiver context — switching someone else's child's
 * journey is meaningless there.
 */
import { useRef, useState } from 'react'
import { View, Text, Pressable, Modal, StyleSheet, Animated, Easing } from 'react-native'
import { ChevronDown } from 'lucide-react-native'
import { router } from 'expo-router'
import {
  useTheme, useDiffuseTheme, diffuseFont, shadows,
  getModeColor, getModeColorSoft, getDiffuseAccent, getDiffuseAccentSoft,
} from '../../constants/theme'
import { useIsDiffuse, SoftBloom } from '../ui/diffuse/DiffuseKit'
import { useBehaviorStore, type Behavior } from '../../store/useBehaviorStore'
import { useModeStore } from '../../store/useModeStore'
import { useChildStore } from '../../store/useChildStore'
import { ModeTrying, ModePregnant, ModeParent } from '../stickers/RewardStickers'
import { MonoCaps } from '../ui/Typography'

const ICON_BY_BEHAVIOR = {
  'pre-pregnancy': ModeTrying,
  pregnancy: ModePregnant,
  kids: ModeParent,
} as const

const ORDER: Behavior[] = ['pre-pregnancy', 'pregnancy', 'kids']

export function HomeJourneySwitcher() {
  const { colors, radius, isDark, font } = useTheme()
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()

  const currentBehavior = useBehaviorStore((s) => s.currentBehavior)
  const enrolled = useBehaviorStore((s) => s.enrolledBehaviors)
  const switchTo = useBehaviorStore((s) => s.switchTo)
  const setMode = useModeStore((s) => s.setMode)
  const cycleIntent = useModeStore((s) => s.cycleIntent)
  const activeChild = useChildStore((s) => s.activeChild)

  const [open, setOpen] = useState(false)
  const [anchor, setAnchor] = useState({ top: 96, right: 20 })
  const triggerRef = useRef<View>(null)
  const anim = useRef(new Animated.Value(0)).current

  // Caregiver context: switching another family's journey is meaningless.
  const isCaregiverContext = !!activeChild && activeChild.caregiverRole !== 'parent'
  if (isCaregiverContext || !currentBehavior) return null

  const ink = diffuse ? dt.colors.ink : colors.text
  const inkMuted = diffuse ? dt.colors.ink3 : colors.textMuted
  const cardBg = diffuse ? dt.colors.surface : colors.surface
  const line = diffuse ? dt.colors.line : colors.border
  const cardShadow = diffuse ? dt.shadows.pop : shadows.cardPop
  const cardRadius = diffuse ? dt.radius.lg : radius.lg

  const labelFor = (b: Behavior) =>
    b === 'pre-pregnancy'
      ? (cycleIntent === 'ttc' ? 'Dreaming' : 'Cycle')
      : b === 'pregnancy' ? 'Expecting' : 'Raising'

  const ActiveIcon = ICON_BY_BEHAVIOR[currentBehavior]

  function openMenu() {
    // Drop the card just beneath the trigger, right-aligned. Guard measureInWindow
    // so the component stays testable (host instances may lack it under jest).
    const node = triggerRef.current
    if (node && typeof node.measureInWindow === 'function') {
      node.measureInWindow((_x, y, _w, h) => setAnchor({ top: y + h + 6, right: 20 }))
    }
    setOpen(true)
    anim.setValue(0)
    Animated.timing(anim, {
      toValue: 1, duration: 140, easing: Easing.out(Easing.quad), useNativeDriver: true,
    }).start()
  }

  function handleSelect(b: Behavior) {
    setOpen(false)
    if (b === currentBehavior) return
    if (!enrolled.includes(b)) {
      router.push({ pathname: '/onboarding/journey', params: { addMode: 'true', preselect: b } })
      return
    }
    // Canonical switch: behavior + mode in sync. No navigation — we're already on
    // Home and (tabs)/_layout crossfades when currentBehavior changes.
    switchTo(b)
    setMode(b)
  }

  return (
    <>
      <Pressable
        ref={triggerRef}
        onPress={openMenu}
        accessibilityRole="button"
        accessibilityLabel={`Switch journey, currently ${labelFor(currentBehavior)}`}
        hitSlop={8}
        style={[styles.trigger, { backgroundColor: diffuse ? 'transparent' : colors.surface, borderColor: line }]}
      >
        {diffuse ? (
          <View pointerEvents="none" style={StyleSheet.absoluteFill}>
            <SoftBloom color={getDiffuseAccent(currentBehavior, dt.isDark)} opacity={dt.isDark ? 0.4 : 0.5} spread={0.5} radius="60%" />
          </View>
        ) : null}
        <ActiveIcon size={26} />
        <View style={[styles.chevronDot, { backgroundColor: cardBg, borderColor: line }]}>
          <ChevronDown size={9} color={inkMuted} strokeWidth={2.5} />
        </View>
      </Pressable>

      <Modal visible={open} transparent animationType="none" onRequestClose={() => setOpen(false)}>
        <View style={styles.overlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setOpen(false)} accessibilityLabel="Close journey switcher" />
          <Animated.View
            style={[
              styles.card,
              cardShadow,
              {
                top: anchor.top, right: anchor.right,
                backgroundColor: cardBg, borderColor: line, borderRadius: cardRadius,
                opacity: anim,
                transform: [
                  { translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [-6, 0] }) },
                  { scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1] }) },
                ],
              },
            ]}
          >
            {diffuse ? (
              <Text style={[styles.header, { fontFamily: diffuseFont.mono, color: inkMuted, letterSpacing: 1.6 }]}>SWITCH JOURNEY</Text>
            ) : (
              <MonoCaps color={inkMuted} style={styles.header}>SWITCH JOURNEY</MonoCaps>
            )}
            {ORDER.map((b) => {
              const Icon = ICON_BY_BEHAVIOR[b]
              const isActive = b === currentBehavior
              const isEnrolled = enrolled.includes(b)
              const accent = diffuse ? getDiffuseAccent(b, dt.isDark) : getModeColor(b, isDark)
              const accentSoft = diffuse ? getDiffuseAccentSoft(b, dt.isDark) : getModeColorSoft(b, isDark)
              return (
                <Pressable
                  key={b}
                  onPress={() => handleSelect(b)}
                  disabled={isActive}
                  accessibilityRole="button"
                  accessibilityLabel={
                    isActive ? `${labelFor(b)}, current journey`
                    : isEnrolled ? `Switch to ${labelFor(b)}`
                    : `Start ${labelFor(b)} journey`
                  }
                  style={({ pressed }) => [
                    styles.row,
                    { opacity: isActive ? 1 : isEnrolled ? (pressed ? 0.55 : 1) : 0.5 },
                  ]}
                >
                  <View style={[styles.rowIcon, { backgroundColor: isActive ? accentSoft : 'transparent' }]}>
                    <Icon size={24} />
                  </View>
                  <Text
                    style={[styles.rowLabel, { color: ink, fontFamily: diffuse ? diffuseFont.display : font.display }]}
                    allowFontScaling={false}
                  >
                    {labelFor(b)}
                  </Text>
                  <View style={{ flex: 1 }} />
                  {isActive ? (
                    <Text style={[styles.tag, { color: accent, fontFamily: diffuse ? diffuseFont.mono : font.body }]}>ACTIVE</Text>
                  ) : !isEnrolled ? (
                    <Text style={[styles.tag, { color: inkMuted, fontFamily: diffuse ? diffuseFont.mono : font.body }]}>+ ADD</Text>
                  ) : null}
                </Pressable>
              )
            })}
          </Animated.View>
        </View>
      </Modal>
    </>
  )
}

const styles = StyleSheet.create({
  trigger: {
    width: 40, height: 40, borderRadius: 20, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  chevronDot: {
    position: 'absolute', right: -1, bottom: -1,
    width: 16, height: 16, borderRadius: 8, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  overlay: { flex: 1 },
  card: { position: 'absolute', width: 236, borderWidth: 1, padding: 8 },
  header: { fontSize: 10, letterSpacing: 1.2, marginHorizontal: 8, marginTop: 4, marginBottom: 6 },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 10, paddingHorizontal: 8, borderRadius: 14,
  },
  rowIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  rowLabel: { fontSize: 16, fontWeight: '600' },
  tag: { fontSize: 9, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase' },
})
