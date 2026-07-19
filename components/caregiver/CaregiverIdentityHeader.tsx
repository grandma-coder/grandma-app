/**
 * CaregiverIdentityHeader — the top-of-home identity strip a caregiver sees in
 * place of the owner's "Hi, {name}" greeting. Makes it unmistakable that the
 * screen is a *scoped caregiver view* of someone else's child, not the owner's
 * own dashboard.
 *
 *   🧑‍🍼  Caring for Rio     ← role sticker + serif "Caring for {child}"
 *        NANNY               ← mono-caps role label
 *   [ Rio ] [ Théo ]         ← CaregiverChildPicker (only when 2+ caregiver kids)
 *
 * Rendered by the behavior homes when a `caregiverView` is active. Non-PHI only
 * (child name + role) — safe for any grant level.
 */

import { View, Text, StyleSheet } from 'react-native'
import { Display, DisplayItalic, MonoCaps } from '../ui/Typography'
import { useTheme, useDiffuseTheme, diffuseFont } from '../../constants/theme'
import { useIsDiffuse } from '../ui/diffuse/DiffuseKit'
import { useChildStore } from '../../store/useChildStore'
import { RoleNanny, RoleFamily } from '../stickers/RewardStickers'
import { CaregiverChildPicker } from './CaregiverChildPicker'

interface CaregiverIdentityHeaderProps {
  /** Serif display size for the "Caring for …" line. Matches HomeGreeting. */
  size?: number
}

export function CaregiverIdentityHeader({ size = 26 }: CaregiverIdentityHeaderProps) {
  const { colors, isDark } = useTheme()
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
  const activeChild = useChildStore((s) => s.activeChild)

  // Rendered only in a caregiver context; if there's no caregiver-linked child
  // the home already shows its own empty state, so bail quietly.
  if (!activeChild || activeChild.caregiverRole === 'parent') return null

  const ink = diffuse ? dt.colors.ink : isDark ? colors.text : '#141313'
  const isFamily = activeChild.caregiverRole === 'family'
  const roleLabel = isFamily ? 'Family caregiver' : 'Nanny'

  return (
    <View style={styles.outer}>
      <View style={styles.wrap}>
        <View style={styles.badge}>
          {isFamily ? <RoleFamily size={40} /> : <RoleNanny size={40} />}
        </View>
        <View style={{ flex: 1 }}>
          <View style={styles.row}>
            {diffuse ? (
              <>
                <Text style={{ fontFamily: diffuseFont.display, fontSize: size - 2, color: ink, letterSpacing: -0.6 }}>
                  Caring for
                </Text>
                <Text
                  style={{ fontFamily: diffuseFont.italic, fontSize: size - 2, color: ink, marginLeft: 8, flexShrink: 1 }}
                  numberOfLines={1}
                >
                  {activeChild.name}
                </Text>
              </>
            ) : (
              <>
                <Display size={size} color={ink}>Caring for</Display>
                <DisplayItalic size={size} color={ink} style={{ marginLeft: 8 }} numberOfLines={1}>
                  {activeChild.name}
                </DisplayItalic>
              </>
            )}
          </View>
          {diffuse ? (
            <Text
              style={{
                fontFamily: diffuseFont.mono,
                fontSize: 10,
                letterSpacing: 2,
                textTransform: 'uppercase',
                color: dt.colors.ink3,
                marginTop: 3,
              }}
            >
              {roleLabel}
            </Text>
          ) : (
            <MonoCaps style={{ marginTop: 2 }}>{roleLabel}</MonoCaps>
          )}
        </View>
      </View>
      {/* Only renders when the caregiver is linked to 2+ children. */}
      <CaregiverChildPicker />
    </View>
  )
}

const styles = StyleSheet.create({
  outer: {
    marginBottom: 16,
  },
  wrap: {
    paddingHorizontal: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  badge: {
    flexShrink: 0,
  },
  row: { flexDirection: 'row', alignItems: 'baseline' },
})
