/**
 * DetailSheetHeader — the header for a "details" pop-up (sleep, mood, diaper…):
 * a sticker on a tone disc, the hand-lettered title, the child as an ink-on-tone tag,
 * and the hand-drawn close button.
 */

import { Text, View, StyleSheet } from 'react-native'
import { useTheme } from '../../constants/theme'
import { useTranslation } from '../../lib/i18n'
import { SiteSticker, type SiteStickerName } from '../stickers/SiteSticker'
import { HandDrawnPill } from './HandDrawn'
import { InkBackButton } from './InkBackButton'
import { StickerEnter } from './Motion'

export function DetailSheetHeader({
  title,
  sticker,
  tone,
  childName,
  childColor,
  onClose,
}: {
  title: string
  sticker: SiteStickerName
  tone: string
  childName?: string
  childColor?: string
  onClose: () => void
}) {
  const { colors, font } = useTheme()
  const { t } = useTranslation()
  const ink = colors.text
  return (
    <View style={styles.row}>
      <View style={styles.disc}>
        <HandDrawnPill wobble width={56} height={56} fill={tone} stroke={ink} strokeWidth={2.4} seed={title} />
        <StickerEnter delay={120} tilt={-6}>
          <SiteSticker name={sticker} size={34} cut />
        </StickerEnter>
      </View>
      <View style={styles.text}>
        <Text style={[styles.title, { color: ink, fontFamily: font.display }]} numberOfLines={2}>{title}</Text>
        {childName ? (
          <View style={[styles.tag, { backgroundColor: childColor ?? tone, borderColor: ink }]}>
            <Text style={[styles.tagText, { color: ink, fontFamily: font.bodyBold }]} numberOfLines={1}>{childName}</Text>
          </View>
        ) : null}
      </View>
      <InkBackButton onPress={onClose} ink={ink} paper={colors.surface} icon="close" label={t('common_close')} style={{ marginBottom: 0 }} />
    </View>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  disc: { width: 56, height: 56, alignItems: 'center', justifyContent: 'center' },
  text: { flex: 1, gap: 4 },
  title: { fontSize: 24, lineHeight: 30, letterSpacing: 0.3, textTransform: 'uppercase' },
  tag: { alignSelf: 'flex-start', borderWidth: 1.5, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 2, transform: [{ rotate: '-2deg' }] },
  tagText: { fontSize: 12 },
})
