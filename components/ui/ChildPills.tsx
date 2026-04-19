/**
 * ChildPills — shared child selector pills used across the app.
 *
 * Consistent styling: each child gets a unique color from CHILD_COLORS.
 * Active = solid color bg + white text. Inactive = light tint bg + colored text.
 *
 * Usage:
 *   <ChildPills
 *     children={children}
 *     activeChildId={activeChild?.id}
 *     onSelect={(child) => setActiveChild(child)}
 *   />
 */

import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native'
import { stickers } from '../../constants/theme'
import { useTheme } from '../../constants/theme'

// ─── Shared child color palette (redesign sticker palette) ────────────────

export const CHILD_COLORS = [
  stickers.blue,
  stickers.pink,
  stickers.peach,
  stickers.yellow,
  stickers.lilac,
  stickers.green,
] as const

export function childColor(index: number): string {
  return CHILD_COLORS[index % CHILD_COLORS.length]
}

// ─── Age formatting ───────────────────────────────────────────────────────

export function formatChildAge(birthDate: string): string {
  const dob = new Date(birthDate)
  const now = new Date()
  const months =
    (now.getFullYear() - dob.getFullYear()) * 12 +
    (now.getMonth() - dob.getMonth())
  if (months < 1) return 'newborn'
  if (months < 12) return `${months}mo`
  const years = Math.floor(months / 12)
  const rem = months % 12
  if (rem === 0) return years === 1 ? '1yr' : `${years}yr`
  return `${years}yr ${rem}mo`
}

// ─── Types ────────────────────────────────────────────────────────────────

interface ChildItem {
  id: string
  name: string
  birthDate: string
}

interface ChildPillsProps {
  children: ChildItem[]
  activeChildId?: string
  onSelect: (child: ChildItem) => void
  /** Max children to show before overflow. Default: all */
  maxVisible?: number
  /** Render as a wrapping row instead of horizontal scroll. Default: false */
  wrap?: boolean
}

// ─── Component ────────────────────────────────────────────────────────────

export function ChildPills({
  children: childrenList,
  activeChildId,
  onSelect,
  maxVisible,
  wrap = false,
}: ChildPillsProps) {
  const { radius } = useTheme()
  const visible = maxVisible ? childrenList.slice(0, maxVisible) : childrenList

  const renderPill = (child: ChildItem, idx: number) => {
    const isActive = child.id === activeChildId
    const color = childColor(idx)
    const age = child.birthDate ? formatChildAge(child.birthDate) : ''

    return (
      <Pressable
        key={child.id}
        onPress={() => onSelect(child)}
        style={[
          styles.pill,
          {
            backgroundColor: isActive ? color : color + '18',
            borderColor: isActive ? color : color + '50',
            borderRadius: radius.full,
          },
        ]}
      >
        <Text style={[styles.pillName, { color: isActive ? '#FFF' : color }]}>
          {child.name}
        </Text>
        {age ? (
          <Text style={[styles.pillAge, { color: isActive ? 'rgba(255,255,255,0.7)' : color + 'AA' }]}>
            {age}
          </Text>
        ) : null}
      </Pressable>
    )
  }

  if (wrap) {
    return (
      <View style={styles.wrapRow}>
        {visible.map(renderPill)}
      </View>
    )
  }

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.scrollRow}
    >
      {visible.map(renderPill)}
    </ScrollView>
  )
}

// ─── Single Pill (for external use e.g. in analytics) ─────────────────────

interface ChildPillProps {
  label: string
  age?: string
  active: boolean
  color: string
  onPress: () => void
}

export function ChildPill({ label, age, active, color, onPress }: ChildPillProps) {
  const { radius } = useTheme()
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.pill,
        {
          backgroundColor: active ? color : color + '18',
          borderColor: active ? color : color + '50',
          borderRadius: radius.full,
        },
      ]}
    >
      <Text style={[styles.pillName, { color: active ? '#FFF' : color }]}>{label}</Text>
      {age ? (
        <Text style={[styles.pillAge, { color: active ? 'rgba(255,255,255,0.7)' : color + 'AA' }]}>{age}</Text>
      ) : null}
    </Pressable>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  scrollRow: {
    paddingHorizontal: 16,
    gap: 8,
  },
  wrapRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
  },
  pillName: {
    fontSize: 14,
    fontWeight: '700',
  },
  pillAge: {
    fontSize: 11,
    fontWeight: '500',
  },
})
