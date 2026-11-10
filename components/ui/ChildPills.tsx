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
import { stickers, font } from '../../constants/theme'
import { useTheme, useDiffuseTheme, diffuseFont } from '../../constants/theme'
import { useIsDiffuse } from './diffuse/DiffuseKit'

const ST_INK = '#141313'

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

import { formatChildAge } from '../../lib/childAge'
export { formatChildAge }

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
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
  const ink = isDark ? colors.text : ST_INK

  // Diffuse: never a filled saturated pill. Selection = hairline border + a
  // colored dot + a weight/serif shift. Active gets the strong hairline rule
  // and a paper surface; inactive is a transparent faint hairline. No shadow.
  if (diffuse) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          styles.pill,
          {
            backgroundColor: active ? dt.colors.surface : 'transparent',
            borderColor: active ? dt.colors.hairline : dt.colors.line2,
            borderWidth: 1,
            borderRadius: radius.full,
            opacity: pressed ? 0.7 : 1,
          },
        ]}
      >
        {showDot && (
          <View
            style={[
              styles.pillDot,
              { backgroundColor: color, borderColor: 'transparent' },
            ]}
          />
        )}
        <Text
          style={[
            styles.pillName,
            {
              color: active ? dt.colors.ink : dt.colors.ink2,
              fontFamily: active ? diffuseFont.bodySemiBold : diffuseFont.body,
            },
          ]}
        >
          {label}
        </Text>
        {age ? (
          <Text
            style={[
              styles.pillAge,
              { color: dt.colors.ink3, opacity: 1, fontFamily: diffuseFont.mono, letterSpacing: 0.4 },
            ]}
          >
            {age}
          </Text>
        ) : null}
      </Pressable>
    )
  }

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.pill,
        {
          backgroundColor: active ? color + '66' : colors.surface,
          borderColor: isDark ? colors.border : ST_INK,
          borderWidth: 1.5,
          borderRadius: radius.full,
          // Site look: flat — selection is the child's tone + ink outline, no shadow.
          transform: [{ scale: pressed ? 0.97 : 1 }],
        },
      ]}
    >
      {showDot && (
        <View
          style={[
            styles.pillDot,
            { backgroundColor: color, borderColor: isDark ? colors.border : ST_INK },
          ]}
        />
      )}
      <Text
        style={[
          styles.pillName,
          { color: ink, fontFamily: 'HankenGrotesk_700Bold' },
        ]}
      >
        {label}
      </Text>
      {age ? (
        <Text
          style={[
            styles.pillAge,
            { color: ink, opacity: active ? 0.75 : 0.6 },
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
    paddingVertical: 6,
    gap: 8,
    alignItems: 'center',
  },
  wrapRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingVertical: 4,
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
    fontFamily: font.bodyMedium,
  },
})
