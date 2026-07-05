/**
 * PillarCard — pillar row (Apr 2026 redesign)
 *
 * Soft pastel background with sticker-style emoji + Fraunces serif name.
 * Emoji text keeps the system font (Fraunces has no emoji glyphs).
 */

import { Platform, Pressable, StyleSheet, Text, View } from 'react-native'
import { Pillar } from '../../types'
import { Display, Body } from '../ui/Typography'
import { useTheme, useDiffuseTheme, diffuseFont } from '../../constants/theme'
import { useIsDiffuse } from '../ui/diffuse/DiffuseKit'
import { DiffuseBloomIcon } from '../ui/diffuse/DiffusePrimitives'
import { getPillarSticker } from '../../lib/pillarStickerMap'

interface PillarCardProps {
  pillar: Pillar
  onPress: (pillar: Pillar) => void
}

export default function PillarCard({ pillar, onPress }: PillarCardProps) {
  const { colors, isDark } = useTheme()
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
  const paperBorder = isDark ? colors.border : 'rgba(20,19,19,0.08)'
  const Sticker = getPillarSticker(pillar.id)

  if (diffuse) {
    // Clean paper card, hairline border; pillar sticker over a soft bloom of
    // the pillar's own color. Serif name + read description.
    return (
      <Pressable
        onPress={() => onPress(pillar)}
        style={({ pressed }) => [styles.card, { backgroundColor: dt.colors.surface, borderColor: dt.colors.line, opacity: pressed ? 0.7 : 1 }]}
      >
        <DiffuseBloomIcon color={pillar.color} size={44}>
          {Sticker ? <Sticker size={28} /> : <Text style={styles.icon}>{pillar.icon}</Text>}
        </DiffuseBloomIcon>
        <View style={styles.textContainer}>
          <Text style={{ fontFamily: diffuseFont.display, fontSize: 18, letterSpacing: -0.3, color: dt.colors.ink }}>{pillar.name}</Text>
          <Text style={{ fontFamily: diffuseFont.body, fontSize: 12, lineHeight: 16, color: dt.colors.ink3, marginTop: 3 }} numberOfLines={2}>{pillar.description}</Text>
        </View>
      </Pressable>
    )
  }

  return (
    <Pressable
      onPress={() => onPress(pillar)}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: pillar.color, borderColor: paperBorder, opacity: pressed ? 0.88 : 1 },
      ]}
    >
      <View style={styles.iconCircle}>
        {Sticker ? <Sticker size={34} /> : <Text style={styles.icon}>{pillar.icon}</Text>}
      </View>
      <View style={styles.textContainer}>
        <Display size={18} color="#141313" style={{ letterSpacing: -0.3 }}>
          {pillar.name}
        </Display>
        <Body size={12} color="rgba(20,19,19,0.55)" numberOfLines={2} style={{ marginTop: 2, lineHeight: 16 }}>
          {pillar.description}
        </Body>
      </View>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 20,
    borderWidth: 1,
    gap: 12,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFEF8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    fontSize: 22,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
  textContainer: {
    flex: 1,
  },
})
