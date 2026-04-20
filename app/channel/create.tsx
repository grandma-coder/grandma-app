import { useEffect, useRef, useState } from 'react'
import {
  View, Text, TextInput, Pressable, ScrollView, Alert, StyleSheet,
  KeyboardAvoidingView, Platform, Image, Modal, Animated, Easing,
} from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import { router } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { ArrowLeft, Check, Camera, Lock, Globe } from 'lucide-react-native'
import { useTheme } from '../../constants/theme'
import { createChannel } from '../../lib/channelPosts'
import {
  STICKER_PRESETS,
  stickerByNameColor,
  encodeStickerUrl,
} from '../../lib/channelSticker'

const CREAM = '#F5EFE3'
const INK = '#1A1430'

const CATEGORIES = [
  'Parenting',
  'Pregnancy',
  'Fertility',
  'Feeding',
  'Sleep',
  'Community',
  'Wellness',
  'Milestones',
  'Other',
] as const

type Category = (typeof CATEGORIES)[number]

type IconChoice =
  | { kind: 'sticker'; index: number }
  | { kind: 'photo'; uri: string }

export default function CreateChannel() {
  const insets = useSafeAreaInsets()
  const { colors, radius, spacing, isDark } = useTheme()

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState<Category | null>(null)
  const [customCategory, setCustomCategory] = useState('')
  const [icon, setIcon] = useState<IconChoice>({ kind: 'sticker', index: 0 })
  const [isPrivate, setIsPrivate] = useState(false)
  const [loading, setLoading] = useState(false)
  const [createdChannelId, setCreatedChannelId] = useState<string | null>(null)
  const [showSuccess, setShowSuccess] = useState(false)

  async function pickChannelPhoto() {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({})
      if (!result.canceled && result.assets?.[0]) {
        setIcon({ kind: 'photo', uri: result.assets[0].uri })
      }
    } catch {}
  }

  /** Resolved avatar URI to pass to createChannel: sticker URL or photo URI. */
  function resolveAvatarUri(): string {
    if (icon.kind === 'photo') return icon.uri
    const preset = STICKER_PRESETS[icon.index]
    return encodeStickerUrl(preset.name, preset.color)
  }

  async function handleCreate() {
    const trimmedName = name.trim()
    if (!trimmedName) {
      Alert.alert('Required', 'Give your channel a name')
      return
    }
    if (!category) {
      Alert.alert('Required', 'Pick a category')
      return
    }
    const finalCategory = category === 'Other' ? (customCategory.trim() || 'other') : category

    setLoading(true)
    try {
      const id = await createChannel({
        name: trimmedName,
        description: description.trim() || undefined,
        category: finalCategory.toLowerCase(),
        avatarUri: resolveAvatarUri(),
        channelType: isPrivate ? 'private' : 'public',
      })
      setCreatedChannelId(id)
      setShowSuccess(true)
    } catch (e: any) {
      Alert.alert('Error', e.message)
    } finally {
      setLoading(false)
    }
  }

  const styles = makeStyles(colors, radius, spacing)

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg }]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <ArrowLeft size={22} color={colors.text} />
          </Pressable>
          <Text style={styles.headerTitle}>New Channel</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView
          contentContainerStyle={[
            styles.content,
            { paddingBottom: insets.bottom + 100 },
          ]}
          keyboardShouldPersistTaps="handled"
        >
          {/* Channel icon — preview */}
          <View style={styles.iconPreviewWrap}>
            {(() => {
              if (icon.kind === 'photo') {
                return (
                  <View style={[styles.iconPreview, { backgroundColor: colors.surfaceRaised }]}>
                    <Image source={{ uri: icon.uri }} style={styles.iconImage} />
                  </View>
                )
              }
              const preset = STICKER_PRESETS[icon.index]
              const s = stickerByNameColor(preset.name, preset.color, isDark)
              const Icon = s.Component
              return (
                <View style={[styles.iconPreview, { backgroundColor: s.tint }]}>
                  <Icon size={48} fill={s.fill} />
                </View>
              )
            })()}
          </View>

          {/* Sticker picker row + camera */}
          <View style={styles.stickerRow}>
            {STICKER_PRESETS.map((preset, i) => {
              const s = stickerByNameColor(preset.name, preset.color, isDark)
              const Icon = s.Component
              const selected = icon.kind === 'sticker' && icon.index === i
              return (
                <Pressable
                  key={preset.name}
                  onPress={() => setIcon({ kind: 'sticker', index: i })}
                  style={[
                    styles.stickerTile,
                    {
                      backgroundColor: selected ? s.tint : 'transparent',
                      borderColor: selected ? s.fill : colors.border,
                    },
                  ]}
                >
                  <Icon size={26} fill={s.fill} />
                </Pressable>
              )
            })}
            <Pressable
              onPress={pickChannelPhoto}
              style={[
                styles.stickerTile,
                {
                  backgroundColor: icon.kind === 'photo' ? colors.surfaceRaised : 'transparent',
                  borderColor: icon.kind === 'photo' ? CREAM : colors.border,
                },
              ]}
            >
              <Camera size={22} color={colors.textSecondary} strokeWidth={2} />
            </Pressable>
          </View>

          {/* Name */}
          <Text style={styles.label}>CHANNEL NAME *</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Sleep Training Tips"
            placeholderTextColor={colors.textMuted}
            value={name}
            onChangeText={(t) => setName(t.slice(0, 50))}
            maxLength={50}
            autoFocus
          />
          <Text style={styles.charCount}>{name.length}/50</Text>

          {/* Description */}
          <Text style={styles.label}>DESCRIPTION</Text>
          <TextInput
            style={[styles.input, styles.inputMulti]}
            placeholder="What is this channel about?"
            placeholderTextColor={colors.textMuted}
            value={description}
            onChangeText={(t) => setDescription(t.slice(0, 200))}
            maxLength={200}
            multiline
          />
          <Text style={styles.charCount}>{description.length}/200</Text>

          {/* Privacy toggle */}
          <Text style={styles.label}>CHANNEL TYPE</Text>
          <View style={styles.chipRow}>
            <Pressable
              onPress={() => setIsPrivate(false)}
              style={[styles.chip, !isPrivate && styles.chipSelected]}
            >
              <Globe size={14} color={!isPrivate ? colors.primary : colors.textSecondary} style={{ marginRight: 4 }} />
              <Text style={[styles.chipText, !isPrivate && styles.chipTextSelected]}>Public</Text>
            </Pressable>
            <Pressable
              onPress={() => setIsPrivate(true)}
              style={[styles.chip, isPrivate && styles.chipSelected]}
            >
              <Lock size={14} color={isPrivate ? colors.primary : colors.textSecondary} style={{ marginRight: 4 }} />
              <Text style={[styles.chipText, isPrivate && styles.chipTextSelected]}>Private</Text>
            </Pressable>
          </View>
          {isPrivate && (
            <Text style={[styles.charCount, { textAlign: 'left', marginTop: 6 }]}>
              Members must request to join. You'll approve or deny each request.
            </Text>
          )}

          {/* Category */}
          <Text style={styles.label}>CATEGORY *</Text>
          <View style={styles.chipRow}>
            {CATEGORIES.map((c) => {
              const selected = category === c
              return (
                <Pressable
                  key={c}
                  onPress={() => setCategory(c)}
                  style={[
                    styles.chip,
                    selected && styles.chipSelected,
                  ]}
                >
                  {selected && (
                    <Check size={14} color={colors.primary} style={{ marginRight: 4 }} />
                  )}
                  <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                    {c}
                  </Text>
                </Pressable>
              )
            })}
          </View>

          {/* Custom category input when "Other" selected */}
          {category === 'Other' && (
            <View style={{ marginTop: 12 }}>
              <Text style={styles.label}>YOUR CATEGORY</Text>
              <TextInput
                value={customCategory}
                onChangeText={setCustomCategory}
                placeholder='e.g. "Mental Health", "Activities"'
                placeholderTextColor={colors.textMuted}
                style={[
                  styles.input,
                  { borderColor: colors.border, color: colors.text, backgroundColor: colors.surface },
                ]}
                autoFocus
              />
            </View>
          )}
        </ScrollView>

        {/* Create button */}
        <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
          <Pressable
            onPress={handleCreate}
            disabled={loading || !name.trim() || !category}
            style={[
              styles.createBtn,
              (!name.trim() || !category) && styles.createBtnDisabled,
            ]}
          >
            <Text style={styles.createBtnText}>
              {loading ? 'Creating...' : 'Create Channel'}
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>

      {/* Success modal */}
      <ChannelCreatedModal
        visible={showSuccess}
        channelName={name.trim()}
        onGo={() => {
          setShowSuccess(false)
          if (createdChannelId) router.replace(`/channel/${createdChannelId}`)
        }}
      />
    </View>
  )
}

// ─── Channel Created animated modal ────────────────────────────────────────

function ChannelCreatedModal({
  visible,
  channelName,
  onGo,
}: {
  visible: boolean
  channelName: string
  onGo: () => void
}) {
  const { colors, radius, isDark } = useTheme()

  // Hero = Heart, satellites = Star / Leaf / Moon (distinct colors)
  const heroAnim = useRef(new Animated.Value(0)).current
  const satAnims = useRef([0, 1, 2].map(() => new Animated.Value(0))).current

  useEffect(() => {
    if (!visible) {
      heroAnim.setValue(0)
      satAnims.forEach((a) => a.setValue(0))
      return
    }
    Animated.spring(heroAnim, {
      toValue: 1, friction: 5, tension: 120, useNativeDriver: true,
    }).start()
    satAnims.forEach((a, i) => {
      Animated.spring(a, {
        toValue: 1, friction: 5, tension: 110, delay: 120 + i * 90, useNativeDriver: true,
      }).start()
    })
  }, [visible])

  const hero = stickerByNameColor('heart', 'pink', isDark)
  const HeroIcon = hero.Component

  // satellites: star/yellow top-left, leaf/green top-right, moon/lilac bottom-center
  const satellites: { name: Parameters<typeof stickerByNameColor>[0]; color: Parameters<typeof stickerByNameColor>[1]; x: number; y: number }[] = [
    { name: 'star', color: 'yellow', x: -58, y: -46 },
    { name: 'leaf', color: 'green', x: 58, y: -40 },
    { name: 'moon', color: 'lilac', x: 0, y: 64 },
  ]

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onGo}>
      <View style={modalStyles.overlay}>
        <View style={[modalStyles.card, { backgroundColor: colors.surface, borderRadius: radius.xl }]}>
          {/* Sticker cluster */}
          <View style={modalStyles.clusterWrap}>
            {/* hero */}
            <Animated.View
              style={{
                transform: [
                  { scale: heroAnim.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }) },
                  { rotate: heroAnim.interpolate({ inputRange: [0, 1], outputRange: ['-18deg', '0deg'] }) },
                ],
                opacity: heroAnim,
              }}
            >
              <View style={[modalStyles.heroBg, { backgroundColor: hero.tint }]}>
                <HeroIcon size={64} fill={hero.fill} />
              </View>
            </Animated.View>
            {/* satellites */}
            {satellites.map((sat, i) => {
              const s = stickerByNameColor(sat.name, sat.color, isDark)
              const Icon = s.Component
              const anim = satAnims[i]
              return (
                <Animated.View
                  key={sat.name}
                  pointerEvents="none"
                  style={{
                    position: 'absolute',
                    left: '50%', top: '50%',
                    marginLeft: -18, marginTop: -18,
                    transform: [
                      { translateX: anim.interpolate({ inputRange: [0, 1], outputRange: [0, sat.x] }) },
                      { translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [0, sat.y] }) },
                      { scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0, 1] }) },
                    ],
                    opacity: anim,
                  }}
                >
                  <Icon size={36} fill={s.fill} />
                </Animated.View>
              )
            })}
          </View>

          <Text style={[modalStyles.title, { color: colors.text }]}>Channel Created!</Text>
          <Text style={[modalStyles.desc, { color: colors.textSecondary }]}>
            Your channel{' '}
            <Text style={{ fontWeight: '800', color: colors.text }}>#{channelName}</Text>
            {' '}is live.{'\n'}Invite friends and start the conversation.
          </Text>
          <Pressable
            onPress={onGo}
            style={[modalStyles.cta, { backgroundColor: CREAM, borderRadius: radius.full }]}
          >
            <Text style={[modalStyles.ctaText, { color: INK }]}>Go to Channel</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  )
}

const modalStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  card: { width: '100%', maxWidth: 340, padding: 28, alignItems: 'center' },
  clusterWrap: { width: 200, height: 180, alignItems: 'center', justifyContent: 'center', marginTop: 8, marginBottom: 6 },
  heroBg: { width: 104, height: 104, borderRadius: 52, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 24, fontFamily: 'Fraunces_600SemiBold', letterSpacing: -0.4, marginTop: 4, textAlign: 'center' },
  desc: { fontSize: 14, fontWeight: '500', textAlign: 'center', lineHeight: 20, marginTop: 10, marginBottom: 20 },
  cta: { width: '100%', paddingVertical: 14, alignItems: 'center' },
  ctaText: { fontSize: 15, fontWeight: '800', letterSpacing: 0.3 },
})

function makeStyles(
  colors: ReturnType<typeof useTheme>['colors'],
  radius: ReturnType<typeof useTheme>['radius'],
  spacing: ReturnType<typeof useTheme>['spacing'],
) {
  return StyleSheet.create({
    screen: {
      flex: 1,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing['2xl'],
      marginBottom: 8,
    },
    backBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.surfaceGlass,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: colors.border,
    },
    headerTitle: {
      fontSize: 18,
      fontFamily: 'Fraunces_600SemiBold',
      fontWeight: '700',
      color: colors.text,
      letterSpacing: 0.5,
      textTransform: 'uppercase',
    },
    content: {
      paddingHorizontal: spacing['2xl'],
      paddingTop: 16,
    },
    iconPreviewWrap: { alignItems: 'center', marginBottom: 14, marginTop: 4 },
    iconPreview: {
      width: 92,
      height: 92,
      borderRadius: 46,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    },
    iconImage: {
      width: 92,
      height: 92,
      borderRadius: 46,
    },
    stickerRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      gap: 10,
      marginBottom: 20,
    },
    stickerTile: {
      width: 46,
      height: 46,
      borderRadius: 23,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1.5,
    },
    label: {
      fontSize: 11,
      fontWeight: '600',
      color: colors.textMuted,
      letterSpacing: 1,
      marginBottom: 8,
      marginTop: 16,
    },
    input: {
      backgroundColor: colors.surfaceGlass,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.md,
      padding: 14,
      fontSize: 15,
      color: colors.text,
    },
    inputMulti: {
      minHeight: 80,
      textAlignVertical: 'top',
    },
    charCount: {
      fontSize: 11,
      color: colors.textMuted,
      textAlign: 'right',
      marginTop: 4,
    },
    chipRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: radius.full,
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: colors.border,
    },
    chipSelected: {
      backgroundColor: colors.primaryTint,
      borderColor: colors.primary,
    },
    chipText: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    chipTextSelected: {
      color: colors.primary,
    },
    footer: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      paddingHorizontal: spacing['2xl'],
      paddingTop: 12,
      backgroundColor: colors.bg,
      borderTopWidth: 1,
      borderTopColor: colors.borderLight,
    },
    createBtn: {
      backgroundColor: CREAM,
      paddingVertical: 16,
      borderRadius: radius.full,
      alignItems: 'center',
    },
    createBtnDisabled: {
      opacity: 0.4,
    },
    createBtnText: {
      fontSize: 16,
      fontWeight: '800',
      color: INK,
      letterSpacing: 0.5,
      textTransform: 'uppercase',
    },
  })
}
