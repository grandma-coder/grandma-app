import { View, Text, Pressable, StyleSheet } from 'react-native'
import { useMemo } from 'react'
import type { ComponentType } from 'react'
import { PaperCard } from '../ui/PaperCard'
import { LogExercise, LogSleep } from '../stickers/RewardStickers'
import { useTheme } from '../../constants/theme'
import { useTranslation } from '../../lib/i18n'

type StickerFn = ComponentType<{ size?: number; fill?: string; stroke?: string }>

const MOMENTS: Array<{ Sticker: StickerFn; title: string; description: string }> = [
  {
    Sticker: LogExercise,
    title: 'Stardust Stretching',
    description: 'Gentle movements to ease lower back tension as your center of gravity shifts with the moon.',
  },
  {
    Sticker: LogSleep,
    title: 'Deep Sleep Ritual',
    description: 'Listen to the "Arctic Calm" soundscape to lower cortisol levels before your midnight rest.',
  },
]

export function MomentsOfCare() {
  const { colors } = useTheme()
  const { t } = useTranslation()
  const styles = useMemo(() => makeStyles(colors), [colors])

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>{t('home_momentsOfCare')}</Text>
      <Text style={styles.sectionSubtitle}>{t('home_momentsOfCareSubtitle')}</Text>

      {MOMENTS.map((moment, i) => (
        <Pressable
          key={i}
          style={({ pressed }) => [
            styles.cardWrap,
            pressed && {
              shadowOffset: { width: 0, height: 1 },
              transform: [{ translateY: 2 }],
            },
          ]}
        >
          <PaperCard radius={28} padding={20} style={styles.card}>
            <View style={styles.cardRow}>
              <View style={styles.iconCircle}>
                <moment.Sticker size={28} />
              </View>
              <View style={styles.cardText}>
                <Text style={styles.cardTitle}>{moment.title}</Text>
                <Text style={styles.cardDescription}>{moment.description}</Text>
              </View>
            </View>
          </PaperCard>
        </Pressable>
      ))}
    </View>
  )
}

const makeStyles = (colors: ReturnType<typeof useTheme>['colors']) => StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 16,
  },
  cardWrap: {
    marginBottom: 12,
    borderRadius: 24,
    shadowColor: '#141313',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 3,
  },
  card: {
    borderWidth: 1.5,
    borderColor: '#141313',
  },
  cardRow: {
    flexDirection: 'row',
    gap: 14,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primaryTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    fontSize: 22,
  },
  cardText: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  cardDescription: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
})
