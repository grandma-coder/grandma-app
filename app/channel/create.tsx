import { useState } from 'react'
import {
  View, Text, TextInput, Pressable, ScrollView, Alert, StyleSheet,
  KeyboardAvoidingView, Platform, Image, Modal,
} from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import { router } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { ArrowLeft, Hash, Check, Camera, Lock, Globe } from 'lucide-react-native'
import { useTheme, brand } from '../../constants/theme'
import { createChannel } from '../../lib/channelPosts'

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

export default function CreateChannel() {
  const insets = useSafeAreaInsets()
  const { colors, radius, spacing } = useTheme()

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState<Category | null>(null)
  const [customCategory, setCustomCategory] = useState('')
  const [channelPhoto, setChannelPhoto] = useState<string | null>(null)
  const [isPrivate, setIsPrivate] = useState(false)
  const [loading, setLoading] = useState(false)
  const [createdChannelId, setCreatedChannelId] = useState<string | null>(null)
  const [showSuccess, setShowSuccess] = useState(false)

  async function pickChannelPhoto() {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({})
      if (!result.canceled && result.assets?.[0]) {
        setChannelPhoto(result.assets[0].uri)
      }
    } catch {}
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
        avatarUri: channelPhoto ?? undefined,
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
          {/* Channel photo/icon */}
          <Pressable onPress={pickChannelPhoto} style={styles.iconPreview}>
            {channelPhoto ? (
              <Image source={{ uri: channelPhoto }} style={styles.iconImage} />
            ) : (
              <Hash size={28} color={colors.primary} />
            )}
            <View style={[styles.cameraOverlay, { backgroundColor: colors.primary }]}>
              <Camera size={12} color="#FFF" strokeWidth={2} />
            </View>
          </Pressable>

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
      <Modal visible={showSuccess} transparent animationType="fade">
        <View style={styles.successOverlay}>
          <View style={[styles.successCard, { backgroundColor: colors.surface, borderRadius: radius.xl }]}>
            <View style={[styles.successIcon, { backgroundColor: brand.success + '20' }]}>
              <Check size={32} color={brand.success} strokeWidth={3} />
            </View>
            <Text style={[styles.successTitle, { color: colors.text }]}>
              Channel Created!
            </Text>
            <Text style={[styles.successDesc, { color: colors.textSecondary }]}>
              Your channel <Text style={{ fontWeight: '700', color: colors.text }}>#{name.trim()}</Text> is live.{'\n'}
              Invite friends and start the conversation!
            </Text>
            <Pressable
              onPress={() => {
                setShowSuccess(false)
                if (createdChannelId) router.replace(`/channel/${createdChannelId}`)
              }}
              style={[styles.successBtn, { backgroundColor: colors.primary, borderRadius: radius.lg }]}
            >
              <Text style={styles.successBtnText}>Go to Channel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  )
}

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
      fontWeight: '900',
      color: colors.text,
      letterSpacing: -0.3,
      textTransform: 'uppercase',
    },
    content: {
      paddingHorizontal: spacing['2xl'],
      paddingTop: 16,
    },
    iconPreview: {
      width: 72,
      height: 72,
      borderRadius: 36,
      backgroundColor: colors.primaryTint,
      alignItems: 'center',
      justifyContent: 'center',
      alignSelf: 'center',
      marginBottom: 24,
      overflow: 'hidden',
      position: 'relative',
    },
    iconImage: {
      width: 72,
      height: 72,
      borderRadius: 36,
    },
    cameraOverlay: {
      position: 'absolute',
      bottom: 0,
      right: 0,
      width: 24,
      height: 24,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
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
      backgroundColor: colors.primary,
      paddingVertical: 16,
      borderRadius: radius.lg,
      alignItems: 'center',
    },
    createBtnDisabled: {
      opacity: 0.4,
    },
    createBtnText: {
      fontSize: 16,
      fontWeight: '800',
      color: colors.textInverse,
      letterSpacing: 0.5,
      textTransform: 'uppercase',
    },
    // Success modal
    successOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0,0,0,0.6)',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 100,
    } as any,
    successCard: {
      width: 300,
      padding: 32,
      alignItems: 'center',
      gap: 16,
    },
    successIcon: {
      width: 64,
      height: 64,
      borderRadius: 32,
      alignItems: 'center',
      justifyContent: 'center',
    },
    successTitle: {
      fontSize: 22,
      fontWeight: '800',
    },
    successDesc: {
      fontSize: 14,
      fontWeight: '500',
      textAlign: 'center',
      lineHeight: 20,
    },
    successBtn: {
      width: '100%',
      paddingVertical: 16,
      alignItems: 'center',
      marginTop: 8,
    },
    successBtnText: {
      fontSize: 16,
      fontWeight: '800',
      color: '#FFFFFF',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
  })
}
