/**
 * AgendaHeader — shared "Agenda." title strip used by all three calendars.
 *
 * Displays the hand-lettered "AGENDA." title with optional filter/add actions
 * (site look: ink-outlined discs on surface, ink glyphs).
 */

import { ReactNode } from 'react'
import { View, Text, Pressable, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { SlidersHorizontal, Plus } from 'lucide-react-native'
import { Display } from '../ui/Typography'
import { useTheme, useDiffuseTheme, diffuseFont } from '../../constants/theme'
import { useIsDiffuse } from '../ui/diffuse/DiffuseKit'
import { useTranslation } from '../../lib/i18n'

interface AgendaHeaderProps {
  onFilter?: () => void
  onAdd?: () => void
  right?: ReactNode
}

export function AgendaHeader({ onFilter, onAdd, right }: AgendaHeaderProps) {
  const { colors, isDark } = useTheme()
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
  const { t } = useTranslation()
  const ink = isDark ? colors.text : '#141313'

  if (diffuse) {
    // v4 screen top bar: serif title, hairline round actions with thin line
    // icons — no filled sticker button, no offset shadow. Mode-agnostic.
    return (
      <View style={styles.row}>
        <Text style={{ fontFamily: diffuseFont.display, fontSize: 28, color: dt.colors.ink, letterSpacing: -0.4 }}>
          {t('agendaHeader_title')}
        </Text>
        <View style={styles.actions}>
          {right}
          {onFilter && (
            <Pressable onPress={onFilter} hitSlop={8}>
              <View style={[styles.circleBtnD, { borderColor: dt.colors.line2 }]}>
                <SlidersHorizontal size={16} color={dt.colors.ink3} strokeWidth={1.7} />
              </View>
            </Pressable>
          )}
          {onAdd && (
            <Pressable onPress={onAdd} hitSlop={8}>
              <View style={[styles.circleBtnD, { borderColor: dt.colors.hairline }]}>
                <Plus size={17} color={dt.colors.ink} strokeWidth={1.7} />
              </View>
            </Pressable>
          )}
        </View>
      </View>
    )
  }

  return (
    <View style={styles.row}>
      <Display size={30} color={ink} style={{ textTransform: 'uppercase', letterSpacing: 0.2 }}>{t('agendaHeader_title')}</Display>

      <View style={styles.actions}>
        {right}
        {onFilter && (
          <Pressable onPress={onFilter} hitSlop={8} accessibilityRole="button">
            <View style={[styles.circleBtn, { backgroundColor: colors.surface, borderColor: colors.text }]}>
              <Ionicons name="filter" size={16} color={colors.text} />
            </View>
          </Pressable>
        )}
        {onAdd && (
          // Site look: ink-outlined disc on surface, ink glyph — no solid fill.
          <Pressable onPress={onAdd} hitSlop={8} accessibilityRole="button">
            {({ pressed }) => (
              <View style={[styles.circleBtn, { backgroundColor: colors.surface, borderColor: colors.text, opacity: pressed ? 0.7 : 1 }]}>
                <Ionicons name="add" size={20} color={colors.text} />
              </View>
            )}
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
  },
  circleBtnD: {
    width: 38,
    height: 38,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
