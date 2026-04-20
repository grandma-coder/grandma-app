/**
 * BigChartCard — Paper card with offset Blob sticker, mono-caps label,
 * Fraunces hero number, and a chart slot.
 *
 * Matches the new-design analytics reference (feature-screens.jsx).
 */

import { ReactNode } from 'react'
import { View, Text, StyleSheet, Pressable } from 'react-native'
import { useTheme } from '../../../constants/theme'
import { Blob } from '../../ui/Stickers'

interface Props {
  /** MONO CAPS small label above the number (e.g. "CYCLE LENGTH (LAST 6)") */
  label: string
  /** The big Fraunces number (e.g. "28", "58.2"). Omit to hide the number row. */
  value?: string
  /** Optional unit text after the number (e.g. "days avg"). */
  unit?: string
  /** Chart slot. */
  children: ReactNode
  /** Sticker tint — defaults to accent soft. */
  blobColor?: string
  /** Center the label (useful when the chart itself shows the score). */
  labelAlign?: 'left' | 'center'
  /** Optional tap handler. When set, card becomes pressable. */
  onPress?: () => void
}

export function BigChartCard({ label, value, unit, children, blobColor, labelAlign = 'left', onPress }: Props) {
  const { colors, font, stickers } = useTheme()
  const blobFill = blobColor ?? stickers.yellow
  const Container: any = onPress ? Pressable : View

  return (
    <Container
      onPress={onPress}
      style={({ pressed }: { pressed?: boolean } = {}) => [
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
        },
        pressed && { opacity: 0.92 },
      ]}
    >
      {/* Offset blob sticker — top-right corner */}
      <View style={styles.blob} pointerEvents="none">
        <Blob size={100} fill={blobFill} variant={0} stroke={colors.text} />
      </View>

      <Text
        style={[
          styles.label,
          labelAlign === 'center' && styles.labelCentered,
          { color: colors.textMuted, fontFamily: font.bodySemiBold },
        ]}
      >
        {label}
      </Text>

      {value !== undefined && (
        <View style={styles.valueRow}>
          <Text
            style={[
              styles.value,
              { color: colors.text, fontFamily: font.display },
            ]}
          >
            {value}
          </Text>
          {unit ? (
            <Text
              style={[
                styles.unit,
                { color: colors.textMuted, fontFamily: font.body },
              ]}
            >
              {unit}
            </Text>
          ) : null}
        </View>
      )}

      <View style={styles.chartSlot}>{children}</View>
    </Container>
  )
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 20,
    marginTop: 6,
    borderRadius: 28,
    padding: 18,
    borderWidth: 1,
    overflow: 'hidden',
    position: 'relative',
  },
  blob: {
    position: 'absolute',
    top: -20,
    right: -20,
    opacity: 0.7,
  },
  label: {
    fontSize: 10,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  labelCentered: {
    textAlign: 'center',
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginTop: 4,
    gap: 6,
  },
  value: {
    fontSize: 38,
    lineHeight: 40,
  },
  unit: {
    fontSize: 14,
    paddingBottom: 6,
  },
  chartSlot: {
    marginTop: 14,
  },
})
