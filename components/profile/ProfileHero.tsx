import { useRef } from 'react'
import { View, Text, Pressable, StyleSheet } from 'react-native'
import { router } from 'expo-router'
import { useTheme } from '../../constants/theme'
import { Heart as HeartSticker, Squishy, Star as StarSticker } from '../ui/Stickers'
import { AvatarView } from '../ui/AvatarPicker'

export interface KidPill {
  id: string
  name: string
  color: string
}

interface ProfileHeroProps {
  initial: string
  firstName: string
  lastName?: string
  subtitle?: string
  accentColor: string
  /** photo URL, "icon:<key>" value, or null for initial fallback */
  photoUrl?: string | null
  onAvatarPress?: () => void
  kidPills?: KidPill[]
  onKidPillPress?: (id: string) => void
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
  photoUrl,
  onAvatarPress,
  kidPills,
  onKidPillPress,
}: ProfileHeroProps) {
  const { colors, stickers, font } = useTheme()

  const tapCount = useRef(0)
  const tapTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  function handleNameTap() {
    tapCount.current += 1
    if (tapTimer.current) clearTimeout(tapTimer.current)
    tapTimer.current = setTimeout(() => { tapCount.current = 0 }, 2000)
    if (tapCount.current >= 5) {
      tapCount.current = 0
      if (tapTimer.current) clearTimeout(tapTimer.current)
      router.push('/dev-panel' as Parameters<typeof router.push>[0])
    }
  }

  const avatarNode = (
    <View style={{ position: 'relative' }}>
      <AvatarView
        value={photoUrl ?? null}
        size={108}
        accent={accentColor}
        initial={initial}
        borderColor={colors.text}
        borderWidth={3}
      />
      <View style={styles.avatarStar}>
        <StarSticker size={38} fill={stickers.yellow} />
      </View>
    </View>
  )

  return (
    <View style={styles.root}>
      <View style={styles.stickerLeft}>
        <Squishy w={64} h={44} fill={stickers.yellow} />
      </View>
      <View style={styles.stickerRight}>
        <HeartSticker size={40} fill={stickers.pink} />
      </View>

      {onAvatarPress ? (
        <Pressable
          onPress={onAvatarPress}
          hitSlop={6}
          style={({ pressed }) => [pressed && { opacity: 0.85 }]}
        >
          {avatarNode}
        </Pressable>
      ) : (
        avatarNode
      )}

      <Pressable onPress={handleNameTap} hitSlop={6}>
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
      </Pressable>

      {subtitle ? (
        <Text style={[styles.subtitle, { color: colors.textMuted }]}>
          {subtitle}
        </Text>
      ) : null}

      {kidPills && kidPills.length > 0 ? (
        <View style={styles.kidPillsRow}>
          {kidPills.map((k) => (
            <Pressable
              key={k.id}
              onPress={() => onKidPillPress?.(k.id)}
              hitSlop={4}
              style={({ pressed }) => [
                styles.kidPill,
                {
                  backgroundColor: k.color + '25',
                  borderColor: k.color + '60',
                },
                pressed && { opacity: 0.7 },
              ]}
            >
              <Text style={[styles.kidPillText, { color: k.color }]} numberOfLines={1}>
                {k.name}
              </Text>
            </Pressable>
          ))}
        </View>
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

  kidPillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 6,
    marginTop: 10,
    paddingHorizontal: 8,
  },
  kidPill: {
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
  },
  kidPillText: { fontSize: 12, fontWeight: '700' },
})
