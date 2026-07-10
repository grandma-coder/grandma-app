/**
 * AvatarPicker — unified avatar picker for user/kid/channel profiles.
 *
 * Supports three avatar states:
 *   1. Uploaded photo    (http/file URI)
 *   2. Sticker icon      ("icon:<key>", rendered as decorative sticker)
 *   3. Initial fallback  (letter on colored circle)
 *
 * Usage:
 *   <AvatarView value={photoUrl} size={96} accent={color} initial="I" />
 *   <AvatarPickerModal visible={open} onClose={...} onPickPhoto={...} onPickIcon={...} />
 *
 * The "icon:" scheme keeps the existing `photo_url` column usable — no migration.
 */
import React from 'react'
import { View, Modal, Pressable, ScrollView, StyleSheet, Image, Platform } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { X, Camera, ImagePlus } from 'lucide-react-native'
import { useTheme, useDiffuseTheme, diffuseFont } from '../../constants/theme'
import { useIsDiffuse } from './diffuse/DiffuseKit'
import { useTranslation } from '../../lib/i18n'
import { Display, Body, MonoCaps } from './Typography'
import { usePhotoUrl, PHOTO_BUCKETS, type PhotoBucket } from '../../lib/photoSigning'
import {
  Bear,
  Heart,
  Flower,
  Star,
  Moon,
  Sun,
  Rainbow,
  Butterfly,
  Bee,
  Smiley,
  Cake,
  Gift,
  Balloon,
  Crown,
  Cloud,
  Sparkle,
  Leaf,
  Cherry,
  Mushroom,
  Pacifier,
  Bottle,
  Stroller,
  Drop,
  Bolt,
} from './Stickers'

// ─── Icon registry ───────────────────────────────────────────────────────

type IconKey =
  | 'bear' | 'heart' | 'flower' | 'star' | 'moon' | 'sun'
  | 'rainbow' | 'butterfly' | 'bee' | 'smiley' | 'cake' | 'gift'
  | 'balloon' | 'crown' | 'cloud' | 'sparkle' | 'leaf' | 'cherry'
  | 'mushroom' | 'pacifier' | 'bottle' | 'stroller' | 'drop' | 'bolt'

const ICON_REGISTRY: { key: IconKey; render: (size: number) => React.ReactElement; label: string }[] = [
  { key: 'bear',      label: 'Bear',      render: (s) => <Bear size={s} /> },
  { key: 'heart',     label: 'Heart',     render: (s) => <Heart size={s} /> },
  { key: 'flower',    label: 'Flower',    render: (s) => <Flower size={s} /> },
  { key: 'star',      label: 'Star',      render: (s) => <Star size={s} /> },
  { key: 'moon',      label: 'Moon',      render: (s) => <Moon size={s} /> },
  { key: 'sun',       label: 'Sun',       render: (s) => <Sun size={s} /> },
  { key: 'rainbow',   label: 'Rainbow',   render: (s) => <Rainbow size={s} /> },
  { key: 'butterfly', label: 'Butterfly', render: (s) => <Butterfly size={s} /> },
  { key: 'bee',       label: 'Bee',       render: (s) => <Bee size={s} /> },
  { key: 'smiley',    label: 'Smiley',    render: (s) => <Smiley size={s} /> },
  { key: 'cake',      label: 'Cake',      render: (s) => <Cake size={s} /> },
  { key: 'gift',      label: 'Gift',      render: (s) => <Gift size={s} /> },
  { key: 'balloon',   label: 'Balloon',   render: (s) => <Balloon size={s} /> },
  { key: 'crown',     label: 'Crown',     render: (s) => <Crown size={s} /> },
  { key: 'cloud',     label: 'Cloud',     render: (s) => <Cloud size={s} /> },
  { key: 'sparkle',   label: 'Sparkle',   render: (s) => <Sparkle size={s} /> },
  { key: 'leaf',      label: 'Leaf',      render: (s) => <Leaf size={s} /> },
  { key: 'cherry',    label: 'Cherry',    render: (s) => <Cherry size={s} /> },
  { key: 'mushroom',  label: 'Mushroom',  render: (s) => <Mushroom size={s} /> },
  { key: 'pacifier',  label: 'Pacifier',  render: (s) => <Pacifier size={s} /> },
  { key: 'bottle',    label: 'Bottle',    render: (s) => <Bottle size={s} /> },
  { key: 'stroller',  label: 'Stroller',  render: (s) => <Stroller size={s} /> },
  { key: 'drop',      label: 'Drop',      render: (s) => <Drop size={s} /> },
  { key: 'bolt',      label: 'Bolt',      render: (s) => <Bolt size={s} /> },
]

// ─── Value parsing ────────────────────────────────────────────────────────

export function isIconAvatar(value: string | null | undefined): boolean {
  return typeof value === 'string' && value.startsWith('icon:')
}

export function parseIconAvatar(value: string | null | undefined): IconKey | null {
  if (!isIconAvatar(value)) return null
  const key = (value as string).slice(5) as IconKey
  return ICON_REGISTRY.find((i) => i.key === key)?.key ?? null
}

export function buildIconAvatarValue(key: IconKey): string {
  return `icon:${key}`
}

// ─── AvatarView — renders any of the three states ─────────────────────────

interface AvatarViewProps {
  value: string | null | undefined
  size: number
  accent: string
  initial?: string
  textColor?: string
  borderColor?: string
  borderWidth?: number
  /**
   * Which private bucket the photo lives in, when `value` is a bare storage
   * path. Defaults to profile-avatars (user/caregiver). Pass 'child-photos'
   * for a child's avatar. Icon sentinels + legacy public URLs ignore this.
   */
  bucket?: PhotoBucket
}

export function AvatarView({
  value,
  size,
  accent,
  initial = '?',
  textColor,
  borderColor,
  borderWidth = 3,
  bucket = PHOTO_BUCKETS.avatar,
}: AvatarViewProps) {
  const { colors, font } = useTheme()
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
  const iconKey = parseIconAvatar(value)
  const hasPhoto = !!value && !isIconAvatar(value)
  // Resolve to a renderable URL: bare storage paths get a short-lived signed
  // URL; icon sentinels + legacy public URLs pass straight through.
  const resolvedUri = usePhotoUrl(value, bucket)

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: 999,
        // Diffuse: hairline frame on paper — no filled accent disc. A photo
        // avatar still fills the circle (brand mark), so only tint the frame.
        backgroundColor: diffuse ? (hasPhoto && resolvedUri ? 'transparent' : dt.colors.surface) : accent,
        borderColor: diffuse ? (borderColor ?? dt.colors.line2) : (borderColor ?? colors.text),
        borderWidth: diffuse ? StyleSheet.hairlineWidth * 2 : borderWidth,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}
    >
      {hasPhoto && resolvedUri ? (
        <Image source={{ uri: resolvedUri }} style={{ width: size, height: size, borderRadius: 999 }} />
      ) : iconKey ? (
        ICON_REGISTRY.find((i) => i.key === iconKey)!.render(Math.round(size * 0.62))
      ) : (
        <Display
          size={Math.round(size * 0.4)}
          color={diffuse ? (textColor ?? dt.colors.ink) : (textColor ?? colors.text)}
          style={{ fontFamily: diffuse ? diffuseFont.display : font.display }}
        >
          {initial}
        </Display>
      )}
    </View>
  )
}

// ─── Picker modal — action sheet + icon grid ──────────────────────────────

interface AvatarPickerModalProps {
  visible: boolean
  onClose: () => void
  onPickPhoto: () => void
  onPickIcon: (value: string) => void
  /** Optional "remove photo" action — hidden if not provided */
  onRemove?: () => void
}

export function AvatarPickerModal({
  visible,
  onClose,
  onPickPhoto,
  onPickIcon,
  onRemove,
}: AvatarPickerModalProps) {
  const { colors, font, stickers } = useTheme()
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
  const { t } = useTranslation()

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable onPress={onClose} style={styles.backdrop}>
        <Pressable
          onPress={(e) => e.stopPropagation()}
          style={[
            styles.sheet,
            diffuse
              ? { backgroundColor: dt.colors.bg, borderColor: dt.colors.line }
              : { backgroundColor: colors.bg, borderColor: colors.border },
          ]}
        >
          <View style={[styles.handle, diffuse && { backgroundColor: dt.colors.line2 }]} />

          <View style={styles.header}>
            <Display size={22} color={diffuse ? dt.colors.ink : colors.text} style={!diffuse ? { fontFamily: font.display } : undefined}>
              {t('avatarPicker_title')}
            </Display>
            <Pressable
              onPress={onClose}
              hitSlop={8}
              style={[
                styles.closeBtn,
                diffuse && { backgroundColor: 'transparent', borderWidth: StyleSheet.hairlineWidth, borderColor: dt.colors.hairline },
              ]}
            >
              <X size={18} color={diffuse ? dt.colors.ink : colors.textMuted} strokeWidth={2} />
            </Pressable>
          </View>

          <Body size={13} color={diffuse ? dt.colors.ink3 : colors.textMuted} style={{ marginBottom: 18 }}>
            {t('avatarPicker_subtitle')}
          </Body>

          {/* Photo upload row */}
          <Pressable
            onPress={() => {
              onClose()
              onPickPhoto()
            }}
            style={({ pressed }) => [
              styles.photoRow,
              diffuse
                ? { borderColor: dt.colors.line, backgroundColor: dt.colors.surface, opacity: pressed ? 0.7 : 1 }
                : { borderColor: colors.border, backgroundColor: colors.surfaceGlass, opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <View
              style={[
                styles.photoBadge,
                diffuse
                  ? { backgroundColor: 'transparent', borderWidth: StyleSheet.hairlineWidth, borderColor: dt.colors.line2 }
                  : { backgroundColor: stickers.pink },
              ]}
            >
              <Camera size={18} color={diffuse ? dt.colors.ink : '#141313'} strokeWidth={diffuse ? 1.6 : 2} />
            </View>
            <View style={{ flex: 1 }}>
              <Body size={15} color={diffuse ? dt.colors.ink : colors.text} style={!diffuse ? { fontFamily: font.bodySemiBold } : { fontFamily: diffuseFont.bodySemiBold }}>
                {t('avatarPicker_upload_title')}
              </Body>
              <Body size={12} color={diffuse ? dt.colors.ink3 : colors.textMuted}>
                {t('avatarPicker_upload_subtitle')}
              </Body>
            </View>
            <Ionicons name="chevron-forward" size={18} color={diffuse ? dt.colors.ink3 : colors.textMuted} />
          </Pressable>

          {onRemove && (
            <Pressable
              onPress={() => {
                onClose()
                onRemove()
              }}
              style={({ pressed }) => [
                styles.photoRow,
                diffuse
                  ? { borderColor: dt.colors.line, backgroundColor: 'transparent', opacity: pressed ? 0.7 : 1, marginTop: 8 }
                  : { borderColor: colors.border, backgroundColor: 'transparent', opacity: pressed ? 0.7 : 1, marginTop: 8 },
              ]}
            >
              <View
                style={[
                  styles.photoBadge,
                  diffuse
                    ? { backgroundColor: 'transparent', borderWidth: StyleSheet.hairlineWidth, borderColor: dt.colors.line2 }
                    : { backgroundColor: 'rgba(255,255,255,0.06)' },
                ]}
              >
                <ImagePlus size={18} color={diffuse ? dt.colors.ink3 : colors.textMuted} strokeWidth={diffuse ? 1.6 : 2} />
              </View>
              <Body size={15} color={diffuse ? dt.colors.ink3 : colors.textMuted}>
                {t('avatarPicker_remove')}
              </Body>
            </Pressable>
          )}

          {/* Icon grid */}
          <MonoCaps size={11} color={diffuse ? dt.colors.ink3 : colors.textMuted} style={{ marginTop: 20, marginBottom: 10 }}>
            {t('avatarPicker_or_icon')}
          </MonoCaps>
          <ScrollView
            showsVerticalScrollIndicator={false}
            style={{ maxHeight: 340 }}
            contentContainerStyle={styles.grid}
          >
            {ICON_REGISTRY.map((icon) => (
              <Pressable
                key={icon.key}
                onPress={() => {
                  onClose()
                  onPickIcon(buildIconAvatarValue(icon.key))
                }}
                style={({ pressed }) => [
                  styles.iconTile,
                  diffuse
                    ? { backgroundColor: dt.colors.surface, borderColor: dt.colors.line, opacity: pressed ? 0.7 : 1 }
                    : { backgroundColor: colors.surface, borderColor: colors.border, opacity: pressed ? 0.7 : 1 },
                ]}
              >
                {icon.render(46)}
              </Pressable>
            ))}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  )
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    borderTopWidth: 1,
    paddingHorizontal: 24,
    paddingTop: 10,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignSelf: 'center',
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  photoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
  },
  photoBadge: {
    width: 40,
    height: 40,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    paddingVertical: 4,
    paddingBottom: 12,
  },
  iconTile: {
    width: 68,
    height: 68,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
