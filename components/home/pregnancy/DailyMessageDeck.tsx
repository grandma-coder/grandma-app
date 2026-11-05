// components/home/pregnancy/DailyMessageDeck.tsx
import { useEffect, useRef, useState } from 'react'
import { View, StyleSheet, useWindowDimensions, Animated, PanResponder, Easing } from 'react-native'
import { useTheme, radius, shadows } from '../../../constants/theme'
import { Display } from '../../ui/Typography'
import { useIsDiffuse } from '../../ui/diffuse/DiffuseKit'
import { CardSticker } from './CardSticker'
import { FitText } from './FitText'
import { useReduceMotion } from '../../ui/Motion'
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
  const diffuse = useIsDiffuse()
  const { width } = useWindowDimensions()
  const [index, setIndex] = useState(0)
  const pan = useRef(new Animated.ValueXY()).current
  const reduce = useReduceMotion()

  // Rise and enter: the top card rises into place (opacity + translateY, a
  // touch of scale), then the peek cards settle in behind it. Reduce Motion →
  // everything is simply there.
  const topIn = useRef(new Animated.Value(0)).current
  const peekIn = useRef(new Animated.Value(0)).current
  const deckKey = cards.map((c) => c.id).join('|')
  useEffect(() => {
    if (!cards.length) return
    if (reduce || diffuse) { topIn.setValue(1); peekIn.setValue(1); return }
    topIn.setValue(0); peekIn.setValue(0)
    Animated.sequence([
      Animated.delay(60),
      Animated.parallel([
        Animated.spring(topIn, { toValue: 1, friction: 9, tension: 60, useNativeDriver: true }),
        Animated.timing(peekIn, { toValue: 1, duration: 420, delay: 160, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]),
    ]).start()
    // deckKey: replay only when the deck itself changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deckKey, reduce, diffuse])

  // Site look: the card is a fixed box and the text auto-fits inside it, so a
  // long German or Hindi card never spills out under the action buttons.
  const cardW = Math.round(width * 0.86)
  const textW = cardW - PAD * 2 - 3

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
            <View style={[
              styles.card,
              { backgroundColor: colors.surface, borderColor: colors.border },
              !diffuse && { height: CARD_H, minHeight: undefined, padding: PAD, borderColor: colors.text, borderWidth: 1.5, borderRadius: 18, shadowColor: colors.text, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 0 },
            ]}>
              <CardSticker color={card.color} size={48} mode={card.mode} />
              {diffuse ? (
                <Display size={25} style={styles.cardText}>{card.text}</Display>
              ) : (
                <FitText text={card.text} width={textW} height={TEXT_H} maxSize={26} minSize={15} color={colors.text} align="left" />
              )}
            </View>
          )
          if (!isTop) {
            return (
              <Animated.View
                key={card.id}
                style={[styles.abs, {
                  top: i * 10,
                  zIndex: 10 - i,
                  opacity: peekIn,
                  transform: [
                    { translateY: peekIn.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) },
                    { scale: 1 - i * 0.05 },
                  ],
                }]}
              >
                {body}
              </Animated.View>
            )
          }
          return (
            <Animated.View
              key={card.id}
              {...responder.panHandlers}
              style={[styles.abs, {
                zIndex: 20,
                opacity: topIn,
                transform: [
                  { translateY: topIn.interpolate({ inputRange: [0, 1], outputRange: [36, 0] }) },
                  { scale: topIn.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1] }) },
                  { translateX: pan.x },
                  { rotate },
                ],
              }]}
            >
              {body}
            </Animated.View>
          )
        })}
    </View>
  )
}

const PAD = 26
const CARD_H = 360
const STICKER = 48
const GAP = 24
const TEXT_H = CARD_H - PAD * 2 - STICKER - GAP - 3

const styles = StyleSheet.create({
  wrap: { height: 420, alignItems: 'center', justifyContent: 'flex-start' },
  abs: { position: 'absolute', width: '86%', alignSelf: 'center' },
  // Paper surface + hairline + subtle shadow + small sticker accent + ink serif
  // on paper — the app's card grammar (WeekCard / PaperCard), not a tint wash.
  card: { minHeight: 360, borderRadius: radius.lg, borderWidth: 1, padding: 28, justifyContent: 'flex-start', gap: 24, ...shadows.card },
  cardText: { lineHeight: 34, letterSpacing: -0.3 },
})
