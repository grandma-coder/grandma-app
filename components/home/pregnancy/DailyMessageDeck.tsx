// components/home/pregnancy/DailyMessageDeck.tsx
import { useRef, useState } from 'react'
import { View, Text, StyleSheet, useWindowDimensions, Animated, PanResponder } from 'react-native'
import { radius, font } from '../../../constants/theme'
import { cardTint, cardHairline } from '../../../lib/dailyMessage/cardTint'
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

  // PanResponder is created once (below) and its handlers must never close
  // over `index`/`cards` from that first render — always dereference these
  // refs, which are kept fresh on every render, instead.
  const indexRef = useRef(index)
  const cardsRef = useRef(cards)
  indexRef.current = index
  cardsRef.current = cards

  const advance = (card: DailyCard) => {
    onTopSwiped?.(card)
    setIndex((i) => Math.min(i + 1, cardsRef.current.length - 1))
    pan.setValue({ x: 0, y: 0 })
  }

  const responder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 8,
      onPanResponderMove: Animated.event([null, { dx: pan.x }], { useNativeDriver: false }),
      onPanResponderRelease: (_, g) => {
        const i = indexRef.current
        const deck = cardsRef.current
        const hasNext = i < deck.length - 1
        if (Math.abs(g.dx) > width * 0.3 && hasNext) {
          Animated.timing(pan, {
            toValue: { x: Math.sign(g.dx) * width, y: 0 },
            duration: 200,
            useNativeDriver: false,
          }).start(() => advance(deck[i]))
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
          const tint = cardTint(card.color)
          const body = (
            <View style={[styles.card, { backgroundColor: tint.soft, borderColor: cardHairline(card.color) }]}>
              <View style={[styles.dot, { backgroundColor: tint.ink }]} />
              <Text style={[styles.cardText, { color: tint.ink }]}>{card.text}</Text>
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
  // Soft tint wash + hairline colored edge + ink serif italic — the cream idiom.
  card: { minHeight: 380, borderRadius: radius.lg, borderWidth: 1, padding: 30, justifyContent: 'flex-start', gap: 22 },
  dot: { width: 12, height: 12, borderRadius: 6, opacity: 0.8 },
  cardText: { fontFamily: font.italic, fontSize: 28, lineHeight: 36 },
})
