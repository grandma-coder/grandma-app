// components/home/pregnancy/DailyMessageCard.tsx
import { useState } from 'react'
import { View, Text, Pressable, StyleSheet } from 'react-native'
import { router } from 'expo-router'
import { PaperCard } from '../../ui/PaperCard'
import { stickers, font, radius } from '../../../constants/theme'
import { useDailyMessage } from '../../../lib/dailyMessage/useDailyMessage'
import { DailyMessageModal } from './DailyMessageModal'

export function DailyMessageCard() {
  const { todayQuestion, todayCard, isAnswered, collection } = useDailyMessage()
  const [open, setOpen] = useState(false)
  if (!todayQuestion) return null

  return (
    <>
      <Pressable onPress={() => setOpen(true)}>
        <PaperCard>
          <Text style={styles.eyebrow}>
            DAILY MESSAGE{isAnswered ? ` · ${collection.length} CARDS` : ''}
          </Text>
          {isAnswered && todayCard ? (
            <View style={[styles.mini, { backgroundColor: stickers[todayCard.color] }]}>
              <Text style={styles.miniText} numberOfLines={3}>{todayCard.text}</Text>
            </View>
          ) : (
            <>
              <Text style={styles.prompt}>{todayQuestion.prompt}</Text>
              <View style={styles.cta}><Text style={styles.ctaText}>Answer →</Text></View>
            </>
          )}
          {isAnswered ? (
            <Pressable onPress={() => router.push('/my-cards')} hitSlop={8}>
              <Text style={styles.link}>View all cards</Text>
            </Pressable>
          ) : null}
        </PaperCard>
      </Pressable>
      <DailyMessageModal visible={open} onClose={() => setOpen(false)} />
    </>
  )
}

const styles = StyleSheet.create({
  eyebrow: { fontFamily: font.bodySemiBold, fontSize: 11, letterSpacing: 2, color: stickers.charcoal, opacity: 0.6 },
  prompt: { fontFamily: font.display, fontSize: 22, lineHeight: 28, marginTop: 8 },
  cta: { alignSelf: 'flex-start', marginTop: 16, backgroundColor: stickers.lilac, borderRadius: radius.full, paddingVertical: 12, paddingHorizontal: 22 },
  ctaText: { fontFamily: font.bodySemiBold, fontSize: 15, color: stickers.charcoal },
  mini: { marginTop: 10, borderRadius: radius.md, padding: 16 },
  miniText: { fontFamily: font.display, fontSize: 17, lineHeight: 22, color: stickers.charcoal },
  link: { fontFamily: font.bodyMedium, fontSize: 13, color: stickers.charcoal, opacity: 0.6, marginTop: 12 },
})
