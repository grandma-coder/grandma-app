import { useMemo } from 'react'
import { View, Text, StyleSheet, Pressable } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { Ionicons } from '@expo/vector-icons'
import { useTheme, brand, stickers, shadows } from '../../constants/theme'

interface GrandmaBallProps {
  thinking?: boolean
  onPress?: () => void
}

export function GrandmaBall({ thinking = false, onPress }: GrandmaBallProps) {
  const { colors } = useTheme()
  const styles = useMemo(() => makeStyles(colors), [colors])

  return (
    <View style={styles.wrapper}>
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [pressed && { transform: [{ scale: 0.95 }] }]}
      >
        {/* Gradient ring */}
        <LinearGradient
          colors={[brand.kids, brand.prePregnancy]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.gradientRing, shadows.cardPop]}
        >
          <View style={styles.innerRing}>
            <Ionicons
              name="happy-outline"
              size={52}
              color={stickers.yellow}
              style={{ opacity: 0.9 }}
            />
          </View>
        </LinearGradient>

        {/* Active sparkle badge */}
        <View style={styles.sparkleBadge}>
          <Ionicons name="sparkles" size={14} color="#000" />
        </View>
      </Pressable>
    </View>
  )
}

const makeStyles = (colors: ReturnType<typeof useTheme>['colors']) => StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    marginBottom: 20,
  },
  gradientRing: {
    width: 150,
    height: 150,
    borderRadius: 75,
    padding: 5,
  },
  innerRing: {
    flex: 1,
    borderRadius: 75,
    backgroundColor: colors.surfaceRaised,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  sparkleBadge: {
    position: 'absolute',
    bottom: -4,
    right: 8,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: stickers.green,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: colors.bg,
  },
})
