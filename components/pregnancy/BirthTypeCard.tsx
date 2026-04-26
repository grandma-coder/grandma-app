import { View, Text, Pressable, StyleSheet } from 'react-native'
import { useTheme, radius, spacing } from '../../constants/theme'
import { Leaf, Cross, Heart, Drop } from '../ui/Stickers'
import type { BirthType, BirthStickerKind } from '../../lib/birthData'

interface BirthTypeCardProps {
  birthType: BirthType
  onPress?: () => void
}

function StickerIcon({ kind, size = 44 }: { kind: BirthStickerKind; size?: number }) {
  const { stickers, isDark } = useTheme()
  const stroke = isDark ? '#F5EDDC' : '#141313'
  if (kind === 'leaf') return <Leaf size={size} fill={stickers.green} stroke={stroke} />
  if (kind === 'cross') return <Cross size={size} fill={stickers.coral} stroke={stroke} />
  if (kind === 'heart') return <Heart size={size} fill={stickers.pink} stroke={stroke} />
  return <Drop size={size} fill={stickers.blue} stroke={stroke} />
}

export function BirthTypeCard({ birthType, onPress }: BirthTypeCardProps) {
  const { colors, font } = useTheme()

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [pressed && { opacity: 0.85 }]}>
      <View
        style={[
          styles.container,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
          },
        ]}
      >
        <View style={styles.header}>
          <View style={styles.iconWrap}>
            <StickerIcon kind={birthType.sticker} size={56} />
          </View>
          <Text style={[styles.title, { color: colors.text, fontFamily: font.display }]}>
            {birthType.title}
          </Text>
        </View>
        <Text style={[styles.description, { color: colors.textSecondary, fontFamily: font.body }]}>
          {birthType.description}
        </Text>
        <Text style={[styles.learnMore, { color: colors.primary, fontFamily: font.bodySemiBold }]}>
          Learn more  →
        </Text>
      </View>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: spacing.sm + 2,
  },
  iconWrap: {
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 22,
    letterSpacing: -0.4,
    flex: 1,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: spacing.sm,
  },
  learnMore: {
    fontSize: 13,
  },
})
