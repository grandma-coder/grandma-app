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
import { NotificationBell } from '../ui/NotificationBell'
import { StickerPalette } from '../stickers/BrandStickers'

const STICKER_INK = '#141313'

interface AgendaHeaderProps {
  onFilter?: () => void
  onAdd?: () => void
  right?: ReactNode
  /** Show the notification bell in the header's action cluster. Defaults to true. */
  showBell?: boolean
}

export function AgendaHeader({ onFilter, onAdd, right, showBell = true }: AgendaHeaderProps) {
  const { colors, isDark } = useTheme()
  const ink = isDark ? colors.text : '#141313'
  const paper = isDark ? colors.surface : StickerPalette.paper

  return (
    <View style={styles.row}>
      <Display size={28} color={ink}>Agenda.</Display>

      <View style={styles.actions}>
        {right}
        {showBell && <NotificationBell />}
        {onFilter && (
          <Pressable onPress={onFilter} hitSlop={8}>
            <View style={[styles.circleBtn, { backgroundColor: paper, borderColor: STICKER_INK }]}>
              <Ionicons name="filter" size={16} color={STICKER_INK} />
            </View>
          </Pressable>
        )}
        {onAdd && (
          <Pressable onPress={onAdd} hitSlop={8}>
            <View style={[styles.circleBtn, { backgroundColor: StickerPalette.lilac, borderColor: STICKER_INK }]}>
              <Ionicons name="add" size={18} color={STICKER_INK} />
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
    width: 38,
    height: 38,
    borderRadius: 999,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: STICKER_INK,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 2,
  },
})
