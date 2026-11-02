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
          borderColor: colors.text,
        },
        pressed && { opacity: 0.85 },
      ]}
    >
      <View
        style={[
          styles.chip,
          {
            // card-less sticker: no disc/outline around it
            backgroundColor: 'transparent',
            borderColor: 'transparent',
            borderWidth: 0,
          },
        ]}
      >
        {sticker}
      </View>
      <View style={styles.textCol}>
        <Text
          style={[
            styles.label,
            { color: colors.textMuted, fontFamily: 'SpaceMono_400Regular' },
          ]}
          numberOfLines={1}
        >
          {label}
        </Text>
        <Text
          style={[
            styles.value,
            { color: colors.text, fontFamily: font.displayBold },
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
    borderRadius: 18,
    padding: 14,
    borderWidth: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 72,
    shadowColor: '#161513',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 0,
  },
  chip: {
    width: 42,
    height: 42,
    borderRadius: 999,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textCol: {
    flex: 1,
  },
  label: {
    fontSize: 10,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  value: {
    fontSize: 18,
    lineHeight: 22,
    marginTop: 1,
  },
})
