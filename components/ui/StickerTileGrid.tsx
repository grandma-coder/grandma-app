/**
 * StickerTileGrid — shortcuts as a 3-column grid of tone cards with a sticker and a
 * hand-lettered label (the same family as the centre eye menu). Clean ink outline, hard
 * ink shadow; tiles rise in one after another, stickers sway, a press squashes + tilts.
 */

import { useRef, useState } from 'react'
import { Animated, Pressable, Text, View, StyleSheet } from 'react-native'
import * as Haptics from 'expo-haptics'
import { useTheme } from '../../constants/theme'
import { SiteSticker, type SiteStickerName } from '../stickers/SiteSticker'
import { HandDrawnPill } from './HandDrawn'
import { FadeUp, useIdleSway } from './Motion'

export interface StickerTile {
  key: string
  label: string
  sticker: SiteStickerName
  tone: string
  onPress: () => void
}

function Tile({ tile, index }: { tile: StickerTile; index: number }) {
  const { colors, font } = useTheme()
  const ink = colors.text
  const [size, setSize] = useState({ w: 0, h: 0 })
  const press = useRef(new Animated.Value(0)).current
  const sway = useIdleSway(6, index * 2 + 3)
  const to = (v: number) => Animated.spring(press, { toValue: v, friction: 6, tension: 280, useNativeDriver: true }).start()
  return (
    <FadeUp index={index} delay={60} style={styles.cell}>
      <Pressable
        onPress={() => { Haptics.selectionAsync().catch(() => {}); tile.onPress() }}
        onPressIn={() => to(1)}
        onPressOut={() => to(0)}
        accessibilityRole="button"
        accessibilityLabel={tile.label}
      >
        <Animated.View
          onLayout={(e) => setSize({ w: Math.round(e.nativeEvent.layout.width), h: Math.round(e.nativeEvent.layout.height) })}
          style={{ transform: [
            { scale: press.interpolate({ inputRange: [0, 1], outputRange: [1, 0.94] }) },
            { rotate: press.interpolate({ inputRange: [0, 1], outputRange: ['0deg', index % 2 ? '1.5deg' : '-1.5deg'] }) },
          ] }}
        >
          <View style={[StyleSheet.absoluteFill, { top: 3, bottom: -3 }]}>
            <HandDrawnPill width={size.w} height={size.h} fill={ink} radius={20} seed={tile.key + 'sh'} />
          </View>
          <HandDrawnPill width={size.w} height={size.h} fill={tile.tone} stroke={ink} strokeWidth={2.2} radius={20} seed={tile.key} />
          <View style={styles.inner}>
            <Animated.View style={{ transform: [{ translateY: sway.translateY }, { rotate: sway.rotate }] }}>
              <SiteSticker name={tile.sticker} size={38} cut />
            </Animated.View>
            <Text
              style={[styles.label, { color: ink, fontFamily: font.display }]}
              // One long word ("RECORDATORIOS") shrinks on one line instead of breaking mid-word.
              numberOfLines={/\s/.test(tile.label.trim()) ? 2 : 1}
              adjustsFontSizeToFit
              minimumFontScale={0.6}
            >
              {tile.label}
            </Text>
          </View>
        </Animated.View>
      </Pressable>
    </FadeUp>
  )
}

export function StickerTileGrid({ tiles }: { tiles: StickerTile[] }) {
  return (
    <View style={styles.grid}>
      {tiles.map((tile, i) => <Tile key={tile.key} tile={tile} index={i} />)}
    </View>
  )
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  cell: { width: '31%', flexGrow: 0 },
  inner: { padding: 12, paddingTop: 14, minHeight: 112, justifyContent: 'space-between' },
  label: { fontSize: 14, lineHeight: 18, letterSpacing: 0.3, textTransform: 'uppercase', marginTop: 10 },
})
