/**
 * CaregiverChildPicker — horizontal pill strip for a caregiver who is linked to
 * more than one child (e.g. a nanny working for two families). Renders nothing
 * for a single child. Switching sets the active child in useChildStore; the
 * surface re-scopes off activeChild. Non-PHI only (name) — safe for any grant.
 */

import { ScrollView, Pressable, Text, StyleSheet } from 'react-native'
import { useChildStore } from '../../store/useChildStore'
import { useTheme, radius, font } from '../../constants/theme'
import type { ChildWithRole } from '../../types'

export function CaregiverChildPicker() {
  const { colors } = useTheme()
  const children = useChildStore((s) => s.children)
  const activeChild = useChildStore((s) => s.activeChild)
  const setActiveChild = useChildStore((s) => s.setActiveChild)

  // Only caregiver links (not the user's own children) belong in this picker.
  const caregiverChildren = children.filter((c) => c.caregiverRole !== 'parent')
  if (caregiverChildren.length < 2) return null

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
    >
      {caregiverChildren.map((c: ChildWithRole) => {
        const active = activeChild?.id === c.id
        return (
          <Pressable
            key={c.id}
            onPress={() => setActiveChild(c)}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            accessibilityLabel={`Switch to ${c.name}`}
            style={[
              styles.pill,
              {
                backgroundColor: active ? colors.text : colors.surface,
                borderColor: colors.border,
              },
            ]}
          >
            <Text
              style={[
                styles.pillText,
                { color: active ? colors.bg : colors.text, fontFamily: font.bodyMedium },
              ]}
            >
              {c.name}
            </Text>
          </Pressable>
        )
      })}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  row: {
    gap: 8,
    paddingVertical: 4,
    paddingRight: 16,
  },
  pill: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: radius.full,
    borderWidth: 1.5,
  },
  pillText: {
    fontSize: 14,
  },
})
