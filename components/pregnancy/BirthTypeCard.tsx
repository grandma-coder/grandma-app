import { View, Text, Pressable, StyleSheet } from 'react-native'
import {
  useTheme, radius, spacing,
  useDiffuseTheme, diffuseFont, diffuseRadius,
} from '../../constants/theme'
import { useIsDiffuse, DiffuseFieldSurface, DiffuseArrow } from '../ui/diffuse/DiffuseKit'
import { Leaf, Cross, Heart, Drop } from '../ui/Stickers'
import { MissingStickers } from '../stickers/MissingStickers'
import type { BirthType, BirthStickerKind } from '../../lib/birthData'
import { useTranslation } from '../../lib/i18n'

interface BirthTypeCardProps {
  birthType: BirthType
  onPress?: () => void
}

function StickerIcon({ kind, size = 44 }: { kind: BirthStickerKind; size?: number }) {
  const { stickers, isDark } = useTheme()
  const stroke = isDark ? '#F5EDDC' : '#141313'
  if (kind === 'vaginal') return <MissingStickers.PregnancyBirthTypeVaginal size={size} />
  if (kind === 'csection') return <MissingStickers.PregnancyBirthTypeCsection size={size} />
  if (kind === 'water') return <MissingStickers.PregnancyBirthTypeWater size={size} />
  if (kind === 'leaf') return <Leaf size={size} fill={stickers.green} stroke={stroke} />
  if (kind === 'cross') return <Cross size={size} fill={stickers.coral} stroke={stroke} />
  if (kind === 'heart') return <Heart size={size} fill={stickers.pink} stroke={stroke} />
  return <Drop size={size} fill={stickers.blue} stroke={stroke} />
}

export function BirthTypeCard({ birthType, onPress }: BirthTypeCardProps) {
  const { colors, font } = useTheme()
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
  const { t } = useTranslation()

  if (diffuse) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => [pressed && { opacity: 0.9 }]}>
        <DiffuseFieldSurface
          mode="preg"
          isDark={dt.isDark}
          intensity={0.45}
          radius={diffuseRadius.lg}
          style={[styles.dContainer, { borderWidth: 1, borderColor: dt.colors.line }]}
        >
          <View style={styles.header}>
            <View style={styles.iconWrap}>
              <StickerIcon kind={birthType.sticker} size={56} />
            </View>
            <Text style={[styles.dTitle, { color: dt.colors.ink, fontFamily: diffuseFont.display }]}>
              {birthType.title}
            </Text>
          </View>
          <Text style={[styles.dDescription, { color: dt.colors.ink3, fontFamily: diffuseFont.body }]}>
            {birthType.description}
          </Text>
          <View style={styles.dLearnRow}>
            <Text style={[styles.dLearnMore, { color: dt.colors.ink, fontFamily: diffuseFont.mono }]}>
              {t('common_learnMore')}
            </Text>
            <DiffuseArrow color={dt.colors.ink3} size={15} />
          </View>
        </DiffuseFieldSurface>
      </Pressable>
    )
  }

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
          {t('common_learnMore')}
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
  // ── Diffuse ──
  dContainer: {
    marginBottom: spacing.md,
    padding: spacing.lg,
  },
  dTitle: {
    fontSize: 24,
    letterSpacing: -0.5,
    flex: 1,
  },
  dDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: spacing.sm + 2,
  },
  dLearnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dLearnMore: {
    fontSize: 11,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
  },
})
