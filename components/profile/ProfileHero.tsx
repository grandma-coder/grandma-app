import { View, Text, StyleSheet } from 'react-native'
import { useTheme } from '../../constants/theme'
import { Heart as HeartSticker, Squishy, Star as StarSticker } from '../ui/Stickers'

interface ProfileHeroProps {
  initial: string
  firstName: string
  lastName?: string
  subtitle?: string
  accentColor: string
}

/**
 * Hero block for the Profile tab: rotated sticker accents, large
 * initial-letter avatar circle with a star sticker at the corner,
 * serif + italic name, and a mode-aware subtitle.
 *
 * Source: docs/Claude design studio/src/more-screens.jsx:12-31
 */
export function ProfileHero({
  initial,
  firstName,
  lastName,
  subtitle,
  accentColor,
}: ProfileHeroProps) {
  const { colors, stickers, font } = useTheme()

  return (
    <View style={styles.root}>
      <View style={styles.stickerLeft}>
        <Squishy w={64} h={44} fill={stickers.yellow} />
      </View>
      <View style={styles.stickerRight}>
        <HeartSticker size={40} fill={stickers.pink} />
      </View>

      <View
        style={[
          styles.avatar,
          {
            backgroundColor: accentColor,
            borderColor: colors.text,
          },
        ]}
      >
        <Text
          style={[
            styles.initial,
            { fontFamily: font.display, color: colors.text },
          ]}
          allowFontScaling={false}
        >
          {initial}
        </Text>
        <View style={styles.avatarStar}>
          <StarSticker size={38} fill={stickers.yellow} />
        </View>
      </View>

      <View style={styles.nameRow}>
        <Text
          style={[styles.firstName, { fontFamily: font.display, color: colors.text }]}
          allowFontScaling={false}
        >
          {firstName}
        </Text>
        {lastName ? (
          <Text
            style={[
              styles.lastName,
              { fontFamily: font.italic, color: colors.text },
            ]}
            allowFontScaling={false}
          >
            {' '}
            {lastName}
          </Text>
        ) : null}
      </View>

      {subtitle ? (
        <Text style={[styles.subtitle, { color: colors.textMuted }]}>
          {subtitle}
        </Text>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  root: {
    paddingTop: 8,
    paddingHorizontal: 24,
    alignItems: 'center',
    position: 'relative',
  },
  stickerLeft: {
    position: 'absolute',
    top: 6,
    left: 20,
    transform: [{ rotate: '-10deg' }],
    zIndex: 0,
  },
  stickerRight: {
    position: 'absolute',
    top: 0,
    right: 28,
    transform: [{ rotate: '14deg' }],
    zIndex: 0,
  },
  avatar: {
    width: 110,
    height: 110,
    borderRadius: 999,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    marginBottom: 10,
  },
  initial: { fontSize: 44, fontWeight: '600' },
  avatarStar: { position: 'absolute', bottom: -4, right: -4 },
  nameRow: { flexDirection: 'row', alignItems: 'baseline' },
  firstName: { fontSize: 28, fontWeight: '600', letterSpacing: -0.3 },
  lastName: { fontSize: 28, fontWeight: '400', fontStyle: 'italic', letterSpacing: -0.2 },
  subtitle: { fontSize: 13, marginTop: 2, fontWeight: '500' },
})
