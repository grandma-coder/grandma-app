/**
 * SoftStatCard — pastel-soft card with MONO-CAPS label, Fraunces display value,
 * and optional sticker/icon accent.
 *
 * Used for the kids-home hero tiles (LAST SLEEP / MOOD / CALORIES / LEAP) and
 * for sheet "summary" rows where a single stat stands alone.
 */

import { ReactNode } from 'react'
import { View, Pressable, StyleSheet, ViewStyle, StyleProp } from 'react-native'
import { Display, MonoCaps, Body } from './Typography'

interface SoftStatCardProps {
  label: string
  /** Main display value — Fraunces. Pass a string or an element for custom layout */
  value?: string | number | ReactNode
  sub?: string
  bg?: string
  labelColor?: string
  valueColor?: string
  subColor?: string
  /** Sticker / SVG to render in the corner (absolute, bottom-right) */
  cornerSticker?: ReactNode
  /** Content rendered in-line after the value */
  inline?: ReactNode
  /** Footer region (e.g. progress bar) */
  footer?: ReactNode
  onPress?: () => void
  style?: StyleProp<ViewStyle>
  valueSize?: number
}

export function SoftStatCard({
  label,
  value,
  sub,
  bg,
  labelColor,
  valueColor,
  subColor,
  cornerSticker,
  inline,
  footer,
  onPress,
  style,
  valueSize = 30,
}: SoftStatCardProps) {
  const Container: any = onPress ? Pressable : View
  return (
    <Container
      onPress={onPress}
      style={({ pressed }: { pressed?: boolean }) => [
        styles.card,
        { backgroundColor: bg ?? '#FFFEF8', opacity: pressed ? 0.92 : 1 },
        style,
      ]}
    >
      <MonoCaps color={labelColor}>{label}</MonoCaps>

      {value !== undefined ? (
        <View style={styles.valueRow}>
          {typeof value === 'string' || typeof value === 'number' ? (
            <Display size={valueSize} color={valueColor} style={{ lineHeight: valueSize }}>
              {value}
            </Display>
          ) : (
            value
          )}
          {inline ? <View style={styles.inlineSlot}>{inline}</View> : null}
        </View>
      ) : null}

      {sub ? (
        <Body size={12} color={subColor} style={{ marginTop: 4 }}>
          {sub}
        </Body>
      ) : null}

      {footer}

      {cornerSticker ? <View style={styles.corner}>{cornerSticker}</View> : null}
    </Container>
  )
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    padding: 16,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(20,19,19,0.08)',
    overflow: 'hidden',
    position: 'relative',
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    marginTop: 6,
  },
  inlineSlot: {
    flex: 1,
  },
  corner: {
    position: 'absolute',
    right: -8,
    bottom: -8,
  },
})
