/**
 * AgendaHeader — shared "Agenda." title strip used by all three calendars.
 *
 * Displays the Fraunces "Agenda." title with optional filter/add actions.
 */

import { ReactNode } from 'react'
import { View, Pressable, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Display } from '../ui/Typography'
import { useTheme } from '../../constants/theme'

interface AgendaHeaderProps {
  onFilter?: () => void
  onAdd?: () => void
  right?: ReactNode
}

export function AgendaHeader({ onFilter, onAdd, right }: AgendaHeaderProps) {
  const { colors, isDark } = useTheme()
  const ink = isDark ? colors.text : '#141313'
  const paper = isDark ? colors.surface : '#FFFEF8'
  const paperBorder = isDark ? colors.border : 'rgba(20,19,19,0.08)'
  const accent = isDark ? colors.primary : '#B7A6E8'

  return (
    <View style={styles.row}>
      <Display size={28} color={ink}>Agenda.</Display>

      <View style={styles.actions}>
        {right}
        {onFilter && (
          <Pressable onPress={onFilter} hitSlop={8}>
            <View style={[styles.circleBtn, { backgroundColor: paper, borderColor: paperBorder }]}>
              <Ionicons name="filter" size={16} color={ink} />
            </View>
          </Pressable>
        )}
        {onAdd && (
          <Pressable onPress={onAdd} hitSlop={8}>
            <View style={[styles.circleBtn, { backgroundColor: accent, borderColor: accent }]}>
              <Ionicons name="add" size={18} color={isDark ? ink : '#141313'} />
            </View>
          </Pressable>
        )}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    marginBottom: 16,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  circleBtn: {
    width: 34,
    height: 34,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
