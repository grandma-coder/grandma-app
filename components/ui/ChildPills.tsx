/**
 * ChildPills — shared child selector pills used across the app.
 *
 * Sticker-paper design language (Apr 2026):
 *   active   — solid child color bg, ink text, hard ink stroke, ink offset shadow
 *   inactive — child-color tinted bg, ink text at full opacity, hairline ink border
 *   pressed  — pill drops 2px (shadow swallows) for tactile feedback
 *
 * Always use this component (or `ChildPill`) for any per-child selector. Don't
 * roll your own — keeps the language consistent across calendar, analytics,
 * home, exams, profile, leaderboard.
 */

import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native'
import { stickers } from '../../constants/theme'
import { useTheme } from '../../constants/theme'

const ST_INK = '#141313'
const PAPER_BORDER = 'rgba(20,19,19,0.18)'

// ─── Shared child color palette (sticker palette) ─────────────────────────

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
  /** Hide the small age caption (only show the name). Default: false */
  hideAge?: boolean
}

// ─── Component ────────────────────────────────────────────────────────────

export function ChildPills({
  children: childrenList,
  activeChildId,
  onSelect,
  maxVisible,
  wrap = false,
  hideAge = false,
}: ChildPillsProps) {
  const visible = maxVisible ? childrenList.slice(0, maxVisible) : childrenList

  const renderPill = (child: ChildItem, idx: number) => {
    const isActive = child.id === activeChildId
    const color = childColor(idx)
    const age = !hideAge && child.birthDate ? formatChildAge(child.birthDate) : ''
    return (
      <ChildPill
        key={child.id}
        label={child.name}
        age={age}
        active={isActive}
        color={color}
        onPress={() => onSelect(child)}
      />
    )
  }

  if (wrap) {
    return <View style={styles.wrapRow}>{visible.map(renderPill)}</View>
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

// ─── Single Pill (sticker style) ──────────────────────────────────────────

interface ChildPillProps {
  label: string
  age?: string
  active: boolean
  /** Child's accent color (e.g. childColor(idx)) */
  color: string
  onPress: () => void
  /** Render the colored leading dot. Defaults true. */
  showDot?: boolean
}

export function ChildPill({ label, age, active, color, onPress, showDot = true }: ChildPillProps) {
  const { isDark, colors, radius } = useTheme()
  const ink = isDark ? colors.text : ST_INK
  const inkBorder = isDark ? colors.border : PAPER_BORDER
  const tintBg = isDark ? color + '28' : color + '24' // ~14% in light, ~16% in dark

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.pill,
        {
          backgroundColor: active ? color : tintBg,
          borderColor: active ? ST_INK : inkBorder,
          borderWidth: active ? 1.5 : 1,
          borderRadius: radius.full,
          // Sticker-pop ink shadow on active state only
          shadowColor: ST_INK,
          shadowOffset: { width: 0, height: active ? (pressed ? 1 : 3) : 0 },
          shadowOpacity: active ? 1 : 0,
          shadowRadius: 0,
          elevation: active ? 4 : 0,
          transform: [{ translateY: active && pressed ? 2 : 0 }],
        },
      ]}
    >
      {showDot && (
        <View
          style={[
            styles.pillDot,
            { backgroundColor: active ? ST_INK : color, borderColor: active ? 'transparent' : 'rgba(20,19,19,0.18)' },
          ]}
        />
      )}
      <Text
        style={[
          styles.pillName,
          { color: ink, fontFamily: active ? 'DMSans_700Bold' : 'DMSans_600SemiBold' },
        ]}
      >
        {label}
      </Text>
      {age ? (
        <Text
          style={[
            styles.pillAge,
            { color: active ? ink : ink, opacity: active ? 0.7 : 0.55 },
          ]}
        >
          {age}
        </Text>
      ) : null}
    </Pressable>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  scrollRow: {
    paddingHorizontal: 16,
    gap: 8,
    alignItems: 'center',
  },
  wrapRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    alignItems: 'center',
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  pillDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1,
  },
  pillName: {
    fontSize: 14,
    letterSpacing: -0.1,
  },
  pillAge: {
    fontSize: 11,
    fontFamily: 'DMSans_500Medium',
  },
})
