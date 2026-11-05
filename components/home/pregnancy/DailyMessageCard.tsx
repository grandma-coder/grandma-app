// components/home/pregnancy/DailyMessageCard.tsx
// The home "daily message" card — used on the pregnancy AND cycle homes (the
// active JourneyMode picks the bank). Unanswered: today's question + an ink
// "Answer" pill. Answered: today's card + the collection.
import { useState } from 'react'
import { View, Text, Pressable, StyleSheet } from 'react-native'
import { router } from 'expo-router'
import { Display, MonoCaps } from '../../ui/Typography'
import { CardSticker } from './CardSticker'
import { useTheme } from '../../../constants/theme'
import { useTranslation } from '../../../lib/i18n'
import { useIsDiffuse } from '../../ui/diffuse/DiffuseKit'
import { useDailyMessage } from '../../../lib/dailyMessage/useDailyMessage'
import { dailyDisplayFace } from '../../../lib/dailyMessage/typeface'
import { DailyMessageModal } from './DailyMessageModal'
import { QuietPill } from '../../ui/QuietPill'
import { PillButton } from '../../ui/PillButton'
import { FadeIn } from '../../ui/Motion'
import { SiteSticker } from '../../stickers/SiteSticker'
import { useModeStore } from '../../../store/useModeStore'

export function DailyMessageCard() {
  const { colors, font } = useTheme()
  const { t } = useTranslation()
  const diffuse = useIsDiffuse()
  const mode = useModeStore((s) => s.mode)
  const { todayQuestion, todayCard, isAnswered, isReady, collection } = useDailyMessage()
  const [open, setOpen] = useState(false)
  if (!todayQuestion) return null

  const count = collection.length
  const countLabel = count === 1 ? t('daily_cardCountOne') : t('daily_cardCountMany', { count })

  if (diffuse) {
    // Diffuse look — layout unchanged; only the copy is localized now.
    return (
      <View>
        <Pressable onPress={() => setOpen(true)}>
          <MonoCaps color={colors.textMuted}>
            {t('sw1_daily_eyebrow')}{isAnswered ? `  ·  ${countLabel}` : ''}
          </MonoCaps>
          {isAnswered && todayCard ? (
            <View style={styles.answeredRow}>
              <CardSticker color={todayCard.color} size={44} mode={todayCard.mode} />
              <Display size={18} style={styles.flex} numberOfLines={3}>{todayCard.text}</Display>
            </View>
          ) : (
            <View style={styles.promptRowDiffuse}>
              <Display size={20} style={styles.flex}>{todayQuestion.prompt}</Display>
              <QuietPill label={t('sw4_answer')} onPress={() => setOpen(true)} accessibilityLabel={t('sw4_answer')} />
            </View>
          )}
        </Pressable>
        {isAnswered ? (
          <QuietPill
            label={t('sw4_viewAllCards')}
            onPress={() => router.push('/my-cards')}
            accessibilityLabel={t('sw4_viewAllCards')}
            style={{ alignSelf: 'flex-start', marginTop: 16 }}
          />
        ) : null}
        <DailyMessageModal visible={open} onClose={() => setOpen(false)} />
      </View>
    )
  }

  // ── Site look ──────────────────────────────────────────────────────────────
  const shown = isAnswered && todayCard ? todayCard.text : todayQuestion.prompt
  const face = dailyDisplayFace(shown)
  const headSize = isAnswered ? 19 : 22

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.surface, borderColor: colors.text, shadowColor: colors.text },
      ]}
    >
      {/* Eyebrow: sticker + label, collection count on the right once answered.
          Wraps instead of truncating in long languages. */}
      <View style={styles.eyebrowRow}>
        <SiteSticker name={mode === 'pregnancy' ? 'heart' : 'moon'} size={22} cut />
        <Text style={[styles.eyebrow, { color: colors.textMuted, fontFamily: font.bodySemiBold }]}>
          {t('sw1_daily_eyebrow')}
        </Text>
        {isAnswered && count > 0 ? (
          <Text style={[styles.count, { color: colors.textMuted, fontFamily: font.bodyMedium }]}>{countLabel}</Text>
        ) : null}
      </View>

      {!isReady ? (
        // Today's entry is still loading — hold the space quietly instead of
        // flashing the question and then swapping to the card.
        <View style={styles.placeholder} />
      ) : isAnswered && todayCard ? (
        <FadeIn key="answered">
          <Pressable
            onPress={() => setOpen(true)}
            accessibilityRole="button"
            accessibilityLabel={todayCard.text}
            style={styles.answeredRow}
          >
            <CardSticker color={todayCard.color} size={44} mode={todayCard.mode} />
            <Text
              style={[
                styles.flex,
                {
                  color: colors.text, fontSize: headSize, lineHeight: Math.round(headSize * face.lineRatio),
                  letterSpacing: face.letterSpacing, fontFamily: face.fontFamily, fontWeight: face.fontWeight,
                },
              ]}
              numberOfLines={4}
            >
              {todayCard.text}
            </Text>
          </Pressable>
          <Text style={[styles.tomorrow, { color: colors.textSecondary, fontFamily: font.body }]}>
            {t('daily_comeBackTomorrow')}
          </Text>
          <QuietPill
            label={t('sw4_viewAllCards')}
            onPress={() => router.push('/my-cards')}
            accessibilityLabel={t('sw4_viewAllCards')}
            style={{ alignSelf: 'flex-start', marginTop: 12 }}
          />
        </FadeIn>
      ) : (
        <FadeIn key="question">
          <Pressable onPress={() => setOpen(true)} accessibilityRole="button" accessibilityLabel={todayQuestion.prompt}>
            <Text
              style={{
                color: colors.text, fontSize: headSize, lineHeight: Math.round(headSize * face.lineRatio),
                letterSpacing: face.letterSpacing, fontFamily: face.fontFamily, fontWeight: face.fontWeight,
                marginTop: 12,
              }}
            >
              {todayQuestion.prompt}
            </Text>
          </Pressable>
          <PillButton
            label={t('sw4_answer')}
            onPress={() => setOpen(true)}
            variant="ink"
            height={46}
            style={styles.answerPill}
          />
        </FadeIn>
      )}

      <DailyMessageModal visible={open} onClose={() => setOpen(false)} />
    </View>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  card: {
    borderWidth: 1.5, borderRadius: 18, padding: 18,
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 0,
  },
  eyebrowRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', columnGap: 8, rowGap: 2 },
  eyebrow: { fontSize: 11, letterSpacing: 1.4, textTransform: 'uppercase', flexShrink: 1 },
  count: { fontSize: 12, marginLeft: 'auto' },
  placeholder: { height: 74 },
  answeredRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 14, marginTop: 14 },
  tomorrow: { fontSize: 13, lineHeight: 18, marginTop: 12 },
  answerPill: { alignSelf: 'flex-start', marginTop: 16, minWidth: 140 },
  promptRowDiffuse: { flexDirection: 'row', alignItems: 'flex-end', gap: 12, marginTop: 10 },
})
