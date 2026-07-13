// components/home/pregnancy/DailyMessageDeck.tsx
import { useRef, useState } from 'react'
import { View, Text, StyleSheet, useWindowDimensions, Animated, PanResponder } from 'react-native'
import { useTheme, radius, font, shadows } from '../../../constants/theme'
import { CardSticker } from './CardSticker'
import type { DailyCard } from '../../../lib/dailyMessage/types'

interface Props {
  cards: DailyCard[]
  onTopSwiped?: (card: DailyCard) => void
}

// Swipeable stacked deck: top card swipes to reveal the peek cards behind it.
// Each card is a paper surface with a small sticker accent + ink serif on paper
// (the app's card grammar), NOT a full-tint wash. RN Animated + PanResponder.
export function DailyMessageDeck({ cards, onTopSwiped }: Props) {
  const { colors } = useTheme()
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
          const body = (
            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <CardSticker color={card.color} size={48} />
              <Text style={[styles.cardText, { color: colors.text }]}>{card.text}</Text>
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
  // Paper surface + hairline + subtle shadow + small sticker accent + ink serif
  // on paper — the app's card grammar (WeekCard / PaperCard), not a tint wash.
  card: { minHeight: 360, borderRadius: radius.lg, borderWidth: 1, padding: 28, justifyContent: 'flex-start', gap: 24, ...shadows.card },
  cardText: { fontFamily: font.display, fontSize: 25, lineHeight: 34, letterSpacing: -0.3 },
})
