/**
 * CaregiverChildPicker — horizontal pill strip for a caregiver who is linked to
 * more than one child (e.g. a nanny working for two families). Renders nothing
 * for a single child. Switching sets the active child in useChildStore; the
 * surface re-scopes off activeChild. Non-PHI only (name) — safe for any grant.
 */

import { ScrollView, Pressable, Text, StyleSheet } from 'react-native'
import { router } from 'expo-router'
import { useChildStore } from '../../store/useChildStore'
import { useTheme, useDiffuseTheme, diffuseFont, radius, font } from '../../constants/theme'
import { useIsDiffuse } from '../ui/diffuse/DiffuseKit'
import type { ChildWithRole } from '../../types'

export function CaregiverChildPicker() {
  const { colors } = useTheme()
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
  const children = useChildStore((s) => s.children)
  const activeChild = useChildStore((s) => s.activeChild)
  const setActiveChild = useChildStore((s) => s.setActiveChild)

  // Switching to a caregiver child re-scopes the home tab to CaregiverHome.
  // Route to home so the caregiver lands on their scoped surface rather than a
  // stale owner-only tab (vault/library) they may have been focused on. (F1)
  const switchTo = (c: ChildWithRole) => {
    setActiveChild(c)
    if (c.caregiverRole !== 'parent') router.replace('/(tabs)')
  }

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
        // Diffuse: hairline pill — never a filled saturated pill. Active =
        // transparent bg + strong hairline border + a semibold weight shift;
        // inactive = paper surface + faint line. A leading dot marks active.
        return (
          <Pressable
            key={c.id}
            onPress={() => switchTo(c)}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            accessibilityLabel={`Switch to ${c.name}`}
            style={[
              styles.pill,
              diffuse
                ? {
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 8,
                    borderWidth: StyleSheet.hairlineWidth,
                    backgroundColor: active ? dt.colors.surface : 'transparent',
                    borderColor: active ? dt.colors.hairline : dt.colors.line,
                  }
                : {
                    backgroundColor: active ? colors.text : colors.surface,
                    borderColor: colors.border,
                  },
            ]}
          >
            {diffuse && active ? (
              <Text style={[styles.dot, { backgroundColor: dt.colors.ink }]} />
            ) : null}
            <Text
              style={[
                styles.pillText,
                diffuse
                  ? {
                      color: active ? dt.colors.ink : dt.colors.ink3,
                      fontFamily: active ? diffuseFont.bodySemiBold : diffuseFont.body,
                    }
                  : { color: active ? colors.bg : colors.text, fontFamily: font.bodyMedium },
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
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
})
