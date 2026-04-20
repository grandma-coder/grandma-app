/**
 * MiniStatTile — Pastel card with a sticker chip + small label + Fraunces value.
 * Used in the 2x2 stat grid on analytics screens.
 */

import { ReactNode } from 'react'
import { View, Text, StyleSheet, Pressable } from 'react-native'
import { useTheme } from '../../../constants/theme'

interface Props {
  /** MONO CAPS tiny label (e.g. "REGULAR") */
  label: string
  /** The value shown large in Fraunces (e.g. "96%", "3.2"). */
  value: string
  /** Sticker element rendered in a 42px paper chip. */
  sticker: ReactNode
  /** Pastel background for the tile. */
  tint: string
  /** Optional tap handler — wraps tile in Pressable with opacity feedback. */
  onPress?: () => void
}

export function MiniStatTile({ label, value, sticker, tint, onPress }: Props) {
  const { colors, font } = useTheme()
  const Container: any = onPress ? Pressable : View
  return (
    <Container
      onPress={onPress}
      style={({ pressed }: { pressed?: boolean } = {}) => [
        styles.tile,
        {
          backgroundColor: tint,
          borderColor: colors.border,
        },
        pressed && { opacity: 0.85 },
      ]}
    >
      <View
        style={[
          styles.chip,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
          },
        ]}
      >
        {sticker}
      </View>
      <View style={styles.textCol}>
        <Text
          style={[
            styles.label,
            { color: colors.textMuted, fontFamily: font.bodySemiBold },
          ]}
          numberOfLines={1}
        >
          {label}
        </Text>
        <Text
          style={[
            styles.value,
            { color: colors.text, fontFamily: font.display },
          ]}
          numberOfLines={1}
        >
          {value}
        </Text>
      </View>
    </Container>
  )
}

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    borderRadius: 22,
    padding: 14,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 72,
  },
  chip: {
    width: 42,
    height: 42,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textCol: {
    flex: 1,
  },
  label: {
    fontSize: 9,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  value: {
    fontSize: 18,
    lineHeight: 22,
    marginTop: 1,
  },
})
