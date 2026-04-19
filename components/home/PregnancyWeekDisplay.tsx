/**
 * PregnancyWeekDisplay (Apr 2026 redesign)
 *
 * Lavender-soft hero card: giant Fraunces week number, italic trimester,
 * heart sticker accent, "Baby is the size of …" chip inside.
 */

import { View, Text, StyleSheet } from 'react-native'
import { useTheme, stickers, getModeColorSoft } from '../../constants/theme'
import { getWeekData } from '../../lib/pregnancyData'
import { Display, DisplayItalic, MonoCaps } from '../ui/Typography'
import { Heart } from '../ui/Stickers'

interface PregnancyWeekDisplayProps {
  weekNumber: number
}

function getTrimesterLabel(week: number): string {
  if (week < 13) return 'first trimester'
  if (week < 28) return 'second trimester'
  return 'third trimester'
}

export function PregnancyWeekDisplay({ weekNumber }: PregnancyWeekDisplayProps) {
  const { colors, font, isDark } = useTheme()
  const data = getWeekData(weekNumber)
  const soft = getModeColorSoft('pregnancy', isDark)
  const ink = isDark ? colors.text : '#141313'
  const paper = isDark ? colors.surface : '#FFFEF8'
  const paperBorder = isDark ? colors.border : 'rgba(20,19,19,0.08)'

  return (
    <View style={[styles.hero, { backgroundColor: soft, borderColor: paperBorder }]}>
      {/* Heart sticker accent */}
      <View style={styles.stickerCorner}>
        <Heart size={56} fill={isDark ? stickers.lilac : '#C8B6E8'} />
      </View>

      <MonoCaps>Week</MonoCaps>

      <View style={styles.weekRow}>
        <Text style={[styles.weekNumber, { fontFamily: font.display, color: ink }]}>
          {weekNumber}
        </Text>
      </View>

      <DisplayItalic size={18} color={ink} style={{ marginTop: 2 }}>
        {getTrimesterLabel(weekNumber)}
      </DisplayItalic>

      {/* Size chip */}
      <View style={[styles.sizeChip, { backgroundColor: paper, borderColor: paperBorder }]}>
        <MonoCaps>Baby size of</MonoCaps>
        <Text style={[styles.sizeValue, { fontFamily: font.display, color: ink }]}>
          a {data.babySize}
        </Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  hero: {
    borderRadius: 28,
    borderWidth: 1,
    padding: 22,
    marginBottom: 16,
    overflow: 'hidden',
    position: 'relative',
  },
  stickerCorner: {
    position: 'absolute',
    top: 16,
    right: 16,
    transform: [{ rotate: '12deg' }],
  },
  weekRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  weekNumber: {
    fontSize: 72,
    lineHeight: 76,
    letterSpacing: -2, fontFamily: 'Fraunces_600SemiBold' },
  sizeChip: {
    marginTop: 16,
    alignSelf: 'flex-start',
    borderRadius: 999,
    borderWidth: 1,
    paddingVertical: 8,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sizeValue: {
    fontSize: 14,
    letterSpacing: -0.2,
  },
})
