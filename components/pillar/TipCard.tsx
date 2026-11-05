/**
 * TipCard — one tip on a pillar screen: a short title and a paragraph.
 *
 * Site look: a bold Hanken title with a small hand-drawn tone dot, body below, hairline between
 * tips. Diffuse: the editorial row with the big italic 01 / 02 number (unchanged).
 *
 * Title and body are runtime-translated (lib/useTranslatedContent) when `translationKey` is given.
 * While a translation is on its way the row shows a soft placeholder instead of the English
 * source, so a non-English reader never sees English flash by.
 */

import { StyleSheet, Text, View } from 'react-native'
import { useTheme, useDiffuseTheme, diffuseFont } from '../../constants/theme'
import { useIsDiffuse } from '../ui/diffuse/DiffuseKit'
import { useTranslatedContent } from '../../lib/useTranslatedContent'
import { Skeleton, SkeletonLines } from '../ui/Skeleton'
import { HandDrawnPill } from '../ui/HandDrawn'

interface TipCardProps {
  label: string
  text: string
  /** 1-based position in the list (Diffuse shows it as 01, 02, …). */
  index?: number
  /** Hide bottom divider on the last tip. */
  isLast?: boolean
  /** Diffuse: colour of the big editorial number. Site: fill of the tone dot. */
  accent?: string
  /** Stable id-based key for runtime translation of `text`, e.g. `pillar_fertility_tip_know_your_cycle`. */
  translationKey?: string
  /** Stable id-based key for runtime translation of `label`. */
  labelTranslationKey?: string
}

export default function TipCard({ label, text, index, isLast, accent, translationKey, labelTranslationKey }: TipCardProps) {
  const { colors, font, stickers } = useTheme()
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
  const body = useTranslatedContent(translationKey ?? '', translationKey ? text : '')
  const title = useTranslatedContent(labelTranslationKey ?? '', labelTranslationKey ? label : '')
  const bodyText = translationKey ? body.text : text
  const labelText = labelTranslationKey ? title.text : label
  const loading = (!!translationKey && body.loading) || (!!labelTranslationKey && title.loading)

  if (diffuse) {
    return (
      <View style={[styles.row, !isLast && { borderBottomColor: dt.colors.line, borderBottomWidth: StyleSheet.hairlineWidth }]}>
        {index !== undefined && (
          <Text style={[styles.number, { color: dt.colors.ink3, fontFamily: diffuseFont.italic }]}>
            {String(index).padStart(2, '0')}
          </Text>
        )}
        <Text style={[styles.label, { color: dt.colors.ink, fontFamily: diffuseFont.display }]}>{labelText}</Text>
        <Text style={[styles.text, { color: dt.colors.ink2, fontFamily: diffuseFont.body }]}>{bodyText}</Text>
      </View>
    )
  }

  return (
    <View style={[styles.siteRow, !isLast && { borderBottomColor: colors.border, borderBottomWidth: StyleSheet.hairlineWidth }]}>
      {loading ? (
        <View style={{ gap: 10 }}>
          <Skeleton height={16} width="55%" radius={6} />
          <SkeletonLines lines={3} />
        </View>
      ) : (
        <>
          <View style={styles.siteTitleRow}>
            <View style={styles.dot}>
              <HandDrawnPill width={14} height={14} fill={accent ?? stickers.yellowSoft} stroke={colors.text} strokeWidth={1.6} seed={label} />
            </View>
            <Text style={[styles.siteLabel, { color: colors.text, fontFamily: font.bodyBold }]}>{labelText}</Text>
          </View>
          <Text style={[styles.siteText, { color: colors.textSecondary, fontFamily: font.body }]}>{bodyText}</Text>
        </>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  // Diffuse
  row: { paddingVertical: 20 },
  number: { fontSize: 22, letterSpacing: -0.3, marginBottom: 6, opacity: 0.85 },
  label: { fontSize: 22, letterSpacing: -0.4, marginBottom: 8, lineHeight: 28 },
  text: { fontSize: 15, lineHeight: 23 },
  // Site look
  siteRow: { paddingVertical: 16 },
  siteTitleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 6 },
  dot: { width: 14, height: 14, marginTop: 3 },
  siteLabel: { flex: 1, fontSize: 16, lineHeight: 21 },
  siteText: { fontSize: 15, lineHeight: 22, paddingLeft: 24 },
})
