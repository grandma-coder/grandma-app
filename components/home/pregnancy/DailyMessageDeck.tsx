// components/home/pregnancy/DailyMessageDeck.tsx
import { useRef, useState } from 'react'
import { View, Text, StyleSheet, useWindowDimensions, Animated, PanResponder } from 'react-native'
import { stickers, radius, font } from '../../../constants/theme'
import type { DailyCard } from '../../../lib/dailyMessage/types'

interface Props {
  cards: DailyCard[]
  onTopSwiped?: (card: DailyCard) => void
}

// Bold color-block deck: top card swipes horizontally to reveal the peek cards
// stacked behind it (offset + scaled down). Message text is heavy sans on the
// card's sticker color. Uses RN's built-in Animated + PanResponder (no
// react-native-gesture-handler dependency).
export function DailyMessageDeck({ cards, onTopSwiped }: Props) {
  const { width } = useWindowDimensions()
  const [index, setIndex] = useState(0)
  const pan = useRef(new Animated.ValueXY()).current

  const advance = (card: DailyCard) => {
    onTopSwiped?.(card)
    setIndex((i) => Math.min(i + 1, cards.length - 1))
    pan.setValue({ x: 0, y: 0 })
  }

  const responder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 8,
      onPanResponderMove: Animated.event([null, { dx: pan.x }], { useNativeDriver: false }),
      onPanResponderRelease: (_, g) => {
        const hasNext = index < cards.length - 1
        if (Math.abs(g.dx) > width * 0.3 && hasNext) {
          Animated.timing(pan, {
            toValue: { x: Math.sign(g.dx) * width, y: 0 },
            duration: 200,
            useNativeDriver: false,
          }).start(() => advance(cards[index]))
        } else {
          Animated.spring(pan, { toValue: { x: 0, y: 0 }, useNativeDriver: false }).start()
        }
      },
    }),
  ).current

  const rotate = pan.x.interpolate({
    inputRange: [-width, 0, width],
    outputRange: ['-8deg', '0deg', '8deg'],
  })

  const visible = cards.slice(index, index + 3)
  return (
    <View style={styles.wrap}>
      {visible
        .map((card, i) => ({ card, i }))
        .reverse() // render back-to-front so the top card sits above
        .map(({ card, i }) => {
          const isTop = i === 0
          const body = (
            <View style={[styles.card, { backgroundColor: stickers[card.color] }]}>
              <View style={styles.dot} />
              <Text style={styles.cardText}>{card.text}</Text>
            </View>
          )
          if (!isTop) {
            return (
              <View key={card.id} style={[styles.abs, { top: i * 10, transform: [{ scale: 1 - i * 0.05 }], zIndex: 10 - i }]}>
                {body}
              </View>
            )
          }
          return (
            <Animated.View
              key={card.id}
              {...responder.panHandlers}
              style={[styles.abs, { zIndex: 20, transform: [{ translateX: pan.x }, { rotate }] }]}
            >
              {body}
            </Animated.View>
          )
        })}
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { height: 420, alignItems: 'center', justifyContent: 'flex-start' },
  abs: { position: 'absolute', width: '86%', alignSelf: 'center' },
  card: { minHeight: 380, borderRadius: radius.lg, padding: 28, justifyContent: 'flex-start', gap: 20 },
  dot: { width: 14, height: 14, borderRadius: 7, backgroundColor: stickers.charcoal },
  cardText: { fontFamily: font.display, fontSize: 26, lineHeight: 32, color: stickers.charcoal },
})
