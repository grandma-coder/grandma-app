/**
 * TipCard — editorial / magazine-style tip row.
 * No card chrome. Big italic Fraunces number, Fraunces label, DM Sans body.
 * Hairline divider sits below each tip (except the last).
 */

import { StyleSheet, Text, View } from 'react-native'
import { useTheme, useDiffuseTheme, diffuseFont } from '../../constants/theme'
import { useIsDiffuse } from '../ui/diffuse/DiffuseKit'
import { useTranslatedContent } from '../../lib/useTranslatedContent'

interface TipCardProps {
  label: string
  text: string
  /** 1-based position in the list, formatted as 01, 02, … */
  index?: number
  /** Hide bottom divider on the last tip. */
  isLast?: boolean
  /** Color used for the big editorial number. Defaults to current mode accent. */
  accent?: string
  /**
   * Stable id-based key for runtime translation of `text` (long-form prose).
   * E.g. `pillar_${pillarId}_tip3`. Omit to render `text` untranslated (e.g.
   * when the caller has no stable id to key against).
   */
  translationKey?: string
}

export default function TipCard({ label, text, index, isLast, accent, translationKey }: TipCardProps) {
  const { colors, font, stickers } = useTheme()
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
  const { text: translatedText } = useTranslatedContent(translationKey ?? '', translationKey ? text : '')
  const bodyText = translationKey ? translatedText : text

  const rowBorder = diffuse ? dt.colors.line : colors.border
  const numberColor = diffuse ? dt.colors.ink3 : (accent ?? stickers.coral)
  const labelColor = diffuse ? dt.colors.ink : colors.text
  const bodyColor = diffuse ? dt.colors.ink2 : colors.textSecondary

  return (
    <View style={[styles.row, !isLast && { borderBottomColor: rowBorder, borderBottomWidth: StyleSheet.hairlineWidth }]}>
      {index !== undefined && (
        <Text
          style={[
            styles.number,
            { color: numberColor, fontFamily: diffuse ? diffuseFont.italic : font.italic },
          ]}
        >
          {String(index).padStart(2, '0')}
        </Text>
      )}
      <Text style={[styles.label, { color: labelColor, fontFamily: diffuse ? diffuseFont.display : font.display }]}>
        {label}
      </Text>
      <Text
        style={[styles.text, { color: bodyColor, fontFamily: diffuse ? diffuseFont.body : font.body }]}
      >
        {bodyText}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  row: {
    paddingVertical: 20,
  },
  number: {
    fontSize: 22,
    letterSpacing: -0.3,
    marginBottom: 6,
    opacity: 0.85,
  },
  label: {
    fontSize: 22,
    letterSpacing: -0.4,
    marginBottom: 8,
    lineHeight: 28,
  },
  text: {
    fontSize: 15,
    lineHeight: 23,
  },
})
