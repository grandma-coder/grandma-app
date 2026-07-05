/**
 * AgendaHeader — shared "Agenda." title strip used by all three calendars.
 *
 * Displays the Fraunces "Agenda." title with optional filter/add actions.
 */

import { ReactNode } from 'react'
import { View, Text, Pressable, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { SlidersHorizontal, Plus } from 'lucide-react-native'
import { Display } from '../ui/Typography'
import { useTheme, useDiffuseTheme, diffuseFont } from '../../constants/theme'
import { useIsDiffuse } from '../ui/diffuse/DiffuseKit'
import { StickerPalette } from '../stickers/BrandStickers'
import { useTranslation } from '../../lib/i18n'

const STICKER_INK = '#141313'

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
  const paper = isDark ? colors.surface : StickerPalette.paper

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
      <Display size={28} color={ink}>{t('agendaHeader_title')}</Display>

      <View style={styles.actions}>
        {right}
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
  circleBtnD: {
    width: 38,
    height: 38,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
