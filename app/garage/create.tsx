/**
 * Create Post — Full-screen multi-step flow.
 *
 * Step 1: Add photos & videos (up to 10)
 * Step 2: Title + caption
 * Step 3: Category (with custom "Other" text input)
 * Step 4: Size & age range dropdowns + condition
 * Step 5: Preview + publish
 */

import { useState, useRef, useEffect } from 'react'
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  Image,
  Alert,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
  Animated,
} from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import * as DocumentPicker from 'expo-document-picker'
import { router } from 'expo-router'
import { checkPhotoSafety } from '../../lib/photoSafety'
import {
  ArrowLeft,
  Camera,
  ImageIcon,
  X,
  Play,
  Check,
  Send,
} from 'lucide-react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme, brand } from '../../constants/theme'
import { BrandedLoader } from '../../components/ui/BrandedLoader'
import { createGaragePost } from '../../lib/garagePosts'

const SCREEN_W = Dimensions.get('window').width
const TOTAL_STEPS = 5

const CATEGORIES = ['Clothing', 'Gear', 'Toys', 'Furniture', 'Books', 'Maternity', 'Nursery', 'Other']
const CONDITIONS = ['New', 'Like New', 'Good', 'Fair', 'Well Loved']

// Age → Size mapping: pick age first, then see relevant sizes
const AGE_GROUPS = [
  {
    label: '0–3 months',
    sizes: ['Preemie', 'Newborn (NB)', '0–3 months'],
  },
  {
    label: '3–6 months',
    sizes: ['3–6 months'],
  },
  {
    label: '6–12 months',
    sizes: ['6–9 months', '9–12 months'],
  },
  {
    label: '1–2 years',
    sizes: ['12–18 months', '18–24 months', '2T'],
  },
  {
    label: '2–4 years',
    sizes: ['2T', '3T', '4T'],
  },
  {
    label: '4–6 years',
    sizes: ['4T', '5T', 'XS (4–5)', 'S (6)'],
  },
  {
    label: '6–8 years',
    sizes: ['S (6)', 'M (7–8)'],
  },
  {
    label: '8–10 years',
    sizes: ['M (7–8)', 'L (10–12)'],
  },
  {
    label: '10–12 years',
    sizes: ['L (10–12)', 'XL (14–16)'],
  },
  {
    label: '12+ years',
    sizes: ['XL (14–16)', 'XXL (18)'],
  },
  {
    label: 'All ages',
    sizes: ['One Size', 'Adjustable'],
  },
]

export default function CreatePostScreen() {
  const { colors, radius } = useTheme()
  const insets = useSafeAreaInsets()

  const [step, setStep] = useState(1)

  // Step 1: Media
  const [media, setMedia] = useState<{ uri: string; type: 'photo' | 'video' }[]>([])

  // Step 2: Title + caption
  const [title, setTitle] = useState('')
  const [caption, setCaption] = useState('')

  // Step 3: Category
  const [category, setCategory] = useState<string | null>(null)
  const [customCategory, setCustomCategory] = useState('')

  // Step 4: Details
  const [condition, setCondition] = useState<string | null>(null)
  const [selectedAge, setSelectedAge] = useState<string | null>(null)
  const [selectedSize, setSelectedSize] = useState<string | null>(null)

  // Step 5: Publish
  const [posting, setPosting] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadStatus, setUploadStatus] = useState('')
  const progressAnim = useRef(new Animated.Value(0)).current

  // ─── Media pickers ────────────────────────────────────────────────────

  async function pickMedia() {
    const safe = await checkPhotoSafety()
    if (!safe) return

    // Primary: expo-image-picker (works on real devices, flaky on iOS sim)
    try {
      const result = await ImagePicker.launchImageLibraryAsync({})
      if (!result.canceled && result.assets?.[0]) {
        const a = result.assets[0]
        setMedia((prev) =>
          [...prev, {
            uri: a.uri,
            type: (a.type === 'video' ? 'video' : 'photo') as 'photo' | 'video',
          }].slice(0, 10)
        )
        return
      }
      if (result.canceled) return
    } catch {
      // PHPicker JPEG bug on iOS sim — fall back to document picker
      try {
        const result = await DocumentPicker.getDocumentAsync({
          type: ['image/*', 'video/*'],
          multiple: true,
          copyToCacheDirectory: true,
        })
        if (!result.canceled && result.assets?.length > 0) {
          const newItems = result.assets.map((a) => ({
            uri: a.uri,
            type: (a.mimeType?.startsWith('video/') ? 'video' : 'photo') as 'photo' | 'video',
          }))
          setMedia((prev) => [...prev, ...newItems].slice(0, 10))
        }
      } catch {
        Alert.alert('Error', 'Could not load photo. Try a different one.')
      }
    }
  }

  async function takePhoto() {
    try {
      const perm = await ImagePicker.requestCameraPermissionsAsync()
      if (!perm.granted) return Alert.alert('Camera permission needed')
      const result = await ImagePicker.launchCameraAsync({})
      if (!result.canceled && result.assets?.[0]) {
        setMedia((prev) =>
          [...prev, { uri: result.assets[0].uri, type: 'photo' as const }].slice(0, 10)
        )
      }
    } catch {
      Alert.alert('Error', 'Could not capture photo.')
    }
  }

  function removeMedia(index: number) {
    setMedia((prev) => prev.filter((_, i) => i !== index))
  }

  // ─── Navigation ───────────────────────────────────────────────────────

  function goBack() {
    if (step === 1) {
      router.back()
    } else {
      setStep(step - 1)
    }
  }

  function goNext() {
    setStep(step + 1)
  }

  function canAdvance(): boolean {
    switch (step) {
      case 1: return media.length > 0
      case 2: return title.trim().length > 0
      case 3: return category !== null && (category !== 'Other' || customCategory.trim().length > 0)
      case 4: return true // optional step
      case 5: return true
      default: return false
    }
  }

  // ─── Publish ──────────────────────────────────────────────────────────

  async function handlePublish() {
    if (media.length === 0) {
      Alert.alert('No Photos', 'Please add at least one photo before publishing.')
      return
    }
    setPosting(true)
    setUploadProgress(0)
    setUploadStatus('Preparing...')
    progressAnim.setValue(0)

    try {
      const finalCategory = category === 'Other' ? customCategory.trim() : category
      await createGaragePost({
        caption: [title, caption].filter(Boolean).join('\n\n') || undefined,
        mediaUris: media,
        category: finalCategory ?? undefined,
        tags: [
          selectedSize,
          selectedAge,
          condition,
        ].filter(Boolean) as string[],
        onProgress: (progress, status) => {
          setUploadProgress(progress)
          setUploadStatus(status)
          Animated.timing(progressAnim, {
            toValue: progress,
            duration: 300,
            useNativeDriver: false,
          }).start()
        },
      })

      // Show success briefly, then go back
      setUploadStatus('Published!')
      Animated.timing(progressAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: false,
      }).start()

      setTimeout(() => {
        router.back()
      }, 600)
    } catch (e: any) {
      Alert.alert('Upload Error', e.message)
      setPosting(false)
    }
  }

  // ─── Progress bar ─────────────────────────────────────────────────────

  const progress = step / TOTAL_STEPS

  return (
    <View style={[s.root, { backgroundColor: colors.bg }]}>
      {/* Header */}
      <View style={[s.header, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={goBack} style={s.backBtn} hitSlop={12}>
          <ArrowLeft size={24} color={colors.text} />
        </Pressable>
        <Text style={[s.headerTitle, { color: colors.text }]}>
          {step === 5 ? 'Preview' : `Step ${step} of ${TOTAL_STEPS}`}
        </Text>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <X size={22} color={colors.textMuted} />
        </Pressable>
      </View>

      {/* Progress bar */}
      <View style={[s.progressTrack, { backgroundColor: colors.borderLight }]}>
        <View
          style={[
            s.progressFill,
            { width: `${progress * 100}%`, backgroundColor: colors.primary },
          ]}
        />
      </View>

      {/* Step content */}
      <ScrollView
        style={s.content}
        contentContainerStyle={s.contentInner}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {step === 1 && (
          <Step1Media
            media={media}
            onPickMedia={pickMedia}
            onTakePhoto={takePhoto}
            onRemove={removeMedia}
          />
        )}
        {step === 2 && (
          <Step2TitleCaption
            title={title}
            onTitleChange={setTitle}
            caption={caption}
            onCaptionChange={setCaption}
          />
        )}
        {step === 3 && (
          <Step3Category
            category={category}
            onCategoryChange={setCategory}
            customCategory={customCategory}
            onCustomCategoryChange={setCustomCategory}
          />
        )}
        {step === 4 && (
          <Step4Details
            condition={condition}
            onConditionChange={setCondition}
            selectedAge={selectedAge}
            onAgeChange={(age) => {
              setSelectedAge(age)
              setSelectedSize(null) // reset size when age changes
            }}
            selectedSize={selectedSize}
            onSizeChange={setSelectedSize}
          />
        )}
        {step === 5 && (
          <Step5Preview
            media={media}
            title={title}
            caption={caption}
            category={category === 'Other' ? customCategory : category}
            condition={condition}
            size={selectedSize}
            age={selectedAge}
          />
        )}
      </ScrollView>

      {/* Bottom button */}
      <View style={[s.bottomBar, { paddingBottom: insets.bottom + 12 }]}>
        {step < 5 ? (
          <Pressable
            onPress={goNext}
            disabled={!canAdvance()}
            style={({ pressed }) => [
              s.nextBtn,
              {
                backgroundColor: colors.primary,
                borderRadius: radius.lg,
                opacity: canAdvance() ? 1 : 0.35,
              },
              pressed && canAdvance() && { transform: [{ scale: 0.98 }] },
            ]}
          >
            <Text style={s.nextBtnText}>
              {step === 4 ? 'Preview' : 'Next'}
            </Text>
          </Pressable>
        ) : (
          <Pressable
            onPress={handlePublish}
            disabled={posting}
            style={({ pressed }) => [
              s.nextBtn,
              {
                backgroundColor: colors.primary,
                borderRadius: radius.lg,
                opacity: posting ? 0.5 : 1,
              },
              pressed && !posting && { transform: [{ scale: 0.98 }] },
            ]}
          >
            {posting ? (
              <ActivityIndicator color="#FFF" size="small" />
            ) : (
              <View style={s.publishRow}>
                <Send size={18} color="#FFF" strokeWidth={2} />
                <Text style={s.nextBtnText}>Publish</Text>
              </View>
            )}
          </Pressable>
        )}
      </View>

      {/* Upload progress overlay */}
      {posting && (
        <View style={s.uploadOverlay}>
          <View style={[s.uploadCard, { backgroundColor: colors.surface, borderRadius: radius.xl }]}>
            {uploadProgress >= 1 ? (
              <Check size={32} color={brand.success} strokeWidth={2.5} />
            ) : (
              <BrandedLoader logoSize={64} />
            )}
            <Text style={[s.uploadStatusText, { color: colors.text }]}>
              {uploadStatus}
            </Text>
            <View style={[s.uploadTrack, { backgroundColor: colors.borderLight, borderRadius: radius.sm }]}>
              <Animated.View
                style={[
                  s.uploadFill,
                  {
                    backgroundColor: uploadProgress >= 1 ? brand.success : colors.primary,
                    borderRadius: radius.sm,
                    width: progressAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0%', '100%'],
                    }),
                  },
                ]}
              />
            </View>
            <Text style={[s.uploadPercent, { color: colors.textMuted }]}>
              {Math.round(uploadProgress * 100)}%
            </Text>
          </View>
        </View>
      )}
    </View>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// STEP 1 — Photos & Videos
// ═══════════════════════════════════════════════════════════════════════════

function Step1Media({
  media,
  onPickMedia,
  onTakePhoto,
  onRemove,
}: {
  media: { uri: string; type: 'photo' | 'video' }[]
  onPickMedia: () => void
  onTakePhoto: () => void
  onRemove: (i: number) => void
}) {
  const { colors, radius } = useTheme()
  const thumbSize = (SCREEN_W - 48 - 16) / 3 // 3 columns, 24px padding each side, 8px gaps

  return (
    <View style={s.stepContainer}>
      <Text style={[s.stepTitle, { color: colors.text }]}>Add Photos & Videos</Text>
      <Text style={[s.stepHint, { color: colors.textSecondary }]}>
        Add up to 10 photos or videos. The first one will be the cover.
      </Text>

      {/* Media grid */}
      <View style={s.mediaGrid}>
        {media.map((item, i) => (
          <View key={i} style={[s.mediaThumbWrap, { width: thumbSize, height: thumbSize }]}>
            <Image
              source={{ uri: item.uri }}
              style={[s.mediaThumb, { borderRadius: radius.md }]}
            />
            {item.type === 'video' && (
              <View style={s.videoLabel}>
                <Play size={12} color="#FFF" fill="#FFF" />
              </View>
            )}
            {i === 0 && (
              <View style={[s.coverBadge, { backgroundColor: colors.primary, borderRadius: radius.sm }]}>
                <Text style={s.coverBadgeText}>Cover</Text>
              </View>
            )}
            <Pressable
              onPress={() => onRemove(i)}
              style={s.removeMediaBtn}
            >
              <X size={12} color="#FFF" />
            </Pressable>
          </View>
        ))}
      </View>

      {/* Add buttons */}
      {media.length < 10 && (
        <View style={s.addMediaRow}>
          <Pressable
            onPress={onPickMedia}
            style={[s.addMediaBtn, { backgroundColor: colors.surfaceRaised, borderRadius: radius.lg }]}
          >
            <ImageIcon size={24} color={colors.primary} strokeWidth={2} />
            <Text style={[s.addMediaText, { color: colors.text }]}>Gallery</Text>
            <Text style={[s.addMediaSub, { color: colors.textMuted }]}>Photos & Videos</Text>
          </Pressable>
          <Pressable
            onPress={onTakePhoto}
            style={[s.addMediaBtn, { backgroundColor: colors.surfaceRaised, borderRadius: radius.lg }]}
          >
            <Camera size={24} color={colors.primary} strokeWidth={2} />
            <Text style={[s.addMediaText, { color: colors.text }]}>Camera</Text>
            <Text style={[s.addMediaSub, { color: colors.textMuted }]}>Take a photo</Text>
          </Pressable>
        </View>
      )}

      <Text style={[s.mediaCount, { color: colors.textMuted }]}>
        {media.length}/10 added
      </Text>
    </View>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// STEP 2 — Title & Caption
// ═══════════════════════════════════════════════════════════════════════════

function Step2TitleCaption({
  title,
  onTitleChange,
  caption,
  onCaptionChange,
}: {
  title: string
  onTitleChange: (t: string) => void
  caption: string
  onCaptionChange: (c: string) => void
}) {
  const { colors, radius } = useTheme()

  return (
    <View style={s.stepContainer}>
      <Text style={[s.stepTitle, { color: colors.text }]}>What are you sharing?</Text>

      {/* Title */}
      <Text style={[s.fieldLabel, { color: colors.textMuted }]}>TITLE</Text>
      <TextInput
        value={title}
        onChangeText={onTitleChange}
        placeholder='e.g. "Ergobaby Carrier — Barely Used"'
        placeholderTextColor={colors.textMuted}
        style={[
          s.textInput,
          {
            color: colors.text,
            backgroundColor: colors.surface,
            borderColor: colors.border,
            borderRadius: radius.lg,
          },
        ]}
      />
      <Text style={[s.fieldTip, { color: colors.textMuted }]}>
        Tip: Include brand, item type, and condition for best results
      </Text>

      {/* Caption */}
      <Text style={[s.fieldLabel, { color: colors.textMuted, marginTop: 20 }]}>
        CAPTION (optional)
      </Text>
      <TextInput
        value={caption}
        onChangeText={onCaptionChange}
        placeholder="Tell others about this item — why you love it, how it's been used..."
        placeholderTextColor={colors.textMuted}
        multiline
        style={[
          s.textArea,
          {
            color: colors.text,
            backgroundColor: colors.surface,
            borderColor: colors.border,
            borderRadius: radius.lg,
          },
        ]}
      />
    </View>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// STEP 3 — Category
// ═══════════════════════════════════════════════════════════════════════════

function Step3Category({
  category,
  onCategoryChange,
  customCategory,
  onCustomCategoryChange,
}: {
  category: string | null
  onCategoryChange: (c: string) => void
  customCategory: string
  onCustomCategoryChange: (c: string) => void
}) {
  const { colors, radius } = useTheme()

  return (
    <View style={s.stepContainer}>
      <Text style={[s.stepTitle, { color: colors.text }]}>Choose a Category</Text>
      <Text style={[s.stepHint, { color: colors.textSecondary }]}>
        This helps others find your post in the feed.
      </Text>

      <View style={s.categoryGrid}>
        {CATEGORIES.map((c) => {
          const isActive = category === c
          return (
            <Pressable
              key={c}
              onPress={() => onCategoryChange(c)}
              style={[
                s.categoryChip,
                {
                  backgroundColor: isActive ? colors.primaryTint : colors.surface,
                  borderColor: isActive ? colors.primary : colors.border,
                  borderRadius: radius.lg,
                },
              ]}
            >
              {isActive && <Check size={16} color={colors.primary} strokeWidth={3} />}
              <Text
                style={[
                  s.categoryChipText,
                  { color: isActive ? colors.primary : colors.text },
                ]}
              >
                {c}
              </Text>
            </Pressable>
          )
        })}
      </View>

      {/* Custom category input */}
      {category === 'Other' && (
        <View style={{ marginTop: 16 }}>
          <Text style={[s.fieldLabel, { color: colors.textMuted }]}>YOUR CATEGORY</Text>
          <TextInput
            value={customCategory}
            onChangeText={onCustomCategoryChange}
            placeholder='e.g. "Stroller Accessories", "Feeding Supplies"'
            placeholderTextColor={colors.textMuted}
            autoFocus
            style={[
              s.textInput,
              {
                color: colors.text,
                backgroundColor: colors.surface,
                borderColor: colors.border,
                borderRadius: radius.lg,
              },
            ]}
          />
        </View>
      )}
    </View>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// STEP 4 — Details (condition, size dropdown, age dropdown)
// ═══════════════════════════════════════════════════════════════════════════

function Step4Details({
  condition,
  onConditionChange,
  selectedAge,
  onAgeChange,
  selectedSize,
  onSizeChange,
}: {
  condition: string | null
  onConditionChange: (c: string) => void
  selectedAge: string | null
  onAgeChange: (a: string | null) => void
  selectedSize: string | null
  onSizeChange: (s: string | null) => void
}) {
  const { colors, radius } = useTheme()

  // Get sizes for selected age
  const ageGroup = AGE_GROUPS.find((g) => g.label === selectedAge)
  const availableSizes = ageGroup?.sizes ?? []

  return (
    <View style={s.stepContainer}>
      <Text style={[s.stepTitle, { color: colors.text }]}>Item Details</Text>
      <Text style={[s.stepHint, { color: colors.textSecondary }]}>
        All fields are optional but help others find your item.
      </Text>

      {/* Condition */}
      <Text style={[s.fieldLabel, { color: colors.textMuted }]}>CONDITION</Text>
      <View style={s.chipRow}>
        {CONDITIONS.map((c) => {
          const isActive = condition === c
          return (
            <Pressable
              key={c}
              onPress={() => onConditionChange(c)}
              style={[
                s.conditionChip,
                {
                  backgroundColor: isActive ? colors.primaryTint : colors.surface,
                  borderColor: isActive ? colors.primary : colors.border,
                  borderRadius: radius.full,
                },
              ]}
            >
              <Text
                style={[
                  s.conditionChipText,
                  { color: isActive ? colors.primary : colors.textSecondary },
                ]}
              >
                {c}
              </Text>
            </Pressable>
          )
        })}
      </View>

      {/* Age range — pick first */}
      <Text style={[s.fieldLabel, { color: colors.textMuted, marginTop: 24 }]}>
        AGE RANGE
      </Text>
      <Text style={[s.fieldTip, { color: colors.textMuted, marginBottom: 8 }]}>
        Select age first — matching sizes will appear below
      </Text>
      <View style={s.ageGrid}>
        {AGE_GROUPS.map((group) => {
          const isActive = selectedAge === group.label
          return (
            <Pressable
              key={group.label}
              onPress={() => onAgeChange(isActive ? null : group.label)}
              style={[
                s.ageChip,
                {
                  backgroundColor: isActive ? colors.primaryTint : colors.surface,
                  borderColor: isActive ? colors.primary : colors.border,
                  borderRadius: radius.lg,
                },
              ]}
            >
              {isActive && <Check size={14} color={colors.primary} strokeWidth={3} />}
              <Text
                style={[
                  s.ageChipText,
                  { color: isActive ? colors.primary : colors.text },
                ]}
              >
                {group.label}
              </Text>
            </Pressable>
          )
        })}
      </View>

      {/* Size — shows after age is picked */}
      {selectedAge && availableSizes.length > 0 && (
        <>
          <Text style={[s.fieldLabel, { color: colors.textMuted, marginTop: 24 }]}>
            SIZE — {selectedAge}
          </Text>
          <View style={s.chipRow}>
            {availableSizes.map((sz) => {
              const isActive = selectedSize === sz
              return (
                <Pressable
                  key={sz}
                  onPress={() => onSizeChange(isActive ? null : sz)}
                  style={[
                    s.conditionChip,
                    {
                      backgroundColor: isActive ? colors.primaryTint : colors.surface,
                      borderColor: isActive ? colors.primary : colors.border,
                      borderRadius: radius.full,
                    },
                  ]}
                >
                  <Text
                    style={[
                      s.conditionChipText,
                      { color: isActive ? colors.primary : colors.textSecondary },
                    ]}
                  >
                    {sz}
                  </Text>
                </Pressable>
              )
            })}
          </View>
        </>
      )}
    </View>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// STEP 5 — Preview
// ═══════════════════════════════════════════════════════════════════════════

function Step5Preview({
  media,
  title,
  caption,
  category,
  condition,
  size,
  age,
}: {
  media: { uri: string; type: 'photo' | 'video' }[]
  title: string
  caption: string
  category: string | null
  condition: string | null
  size: string | null
  age: string | null
}) {
  const { colors, radius } = useTheme()

  return (
    <View style={s.stepContainer}>
      <Text style={[s.stepTitle, { color: colors.text }]}>Preview Your Post</Text>

      {/* Cover image */}
      {media.length > 0 && (
        <Image
          source={{ uri: media[0].uri }}
          style={[s.previewCover, { borderRadius: radius.xl }]}
        />
      )}

      {/* Media count */}
      {media.length > 1 && (
        <Text style={[s.previewMediaCount, { color: colors.textMuted }]}>
          +{media.length - 1} more {media.length - 1 === 1 ? 'photo' : 'photos/videos'}
        </Text>
      )}

      {/* Title */}
      <Text style={[s.previewTitle, { color: colors.text }]}>{title}</Text>

      {/* Caption */}
      {caption ? (
        <Text style={[s.previewCaption, { color: colors.textSecondary }]}>{caption}</Text>
      ) : null}

      {/* Tags / badges */}
      <View style={s.previewBadges}>
        {category && (
          <View style={[s.previewBadge, { backgroundColor: colors.primaryTint, borderRadius: radius.full }]}>
            <Text style={[s.previewBadgeText, { color: colors.primary }]}>{category}</Text>
          </View>
        )}
        {condition && (
          <View style={[s.previewBadge, { backgroundColor: colors.surfaceRaised, borderRadius: radius.full }]}>
            <Text style={[s.previewBadgeText, { color: colors.textSecondary }]}>{condition}</Text>
          </View>
        )}
        {size && (
          <View style={[s.previewBadge, { backgroundColor: colors.surfaceRaised, borderRadius: radius.full }]}>
            <Text style={[s.previewBadgeText, { color: colors.textSecondary }]}>{size}</Text>
          </View>
        )}
        {age && (
          <View style={[s.previewBadge, { backgroundColor: colors.surfaceRaised, borderRadius: radius.full }]}>
            <Text style={[s.previewBadgeText, { color: colors.textSecondary }]}>{age}</Text>
          </View>
        )}
      </View>
    </View>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════════════════

const s = StyleSheet.create({
  root: { flex: 1 },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 16, fontWeight: '700' },

  // Progress
  progressTrack: { height: 3, marginHorizontal: 16 },
  progressFill: { height: 3, borderRadius: 2 },

  // Content
  content: { flex: 1 },
  contentInner: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 40 },

  stepContainer: { gap: 12 },
  stepTitle: { fontSize: 24, fontWeight: '800', letterSpacing: -0.3, fontFamily: 'Fraunces_600SemiBold' },
  stepHint: { fontSize: 14, fontWeight: '500', lineHeight: 20, marginBottom: 8 },

  // Field labels
  fieldLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: 6 },
  fieldTip: { fontSize: 12, fontWeight: '500', marginTop: 4, fontStyle: 'italic' },

  // Text inputs
  textInput: { borderWidth: 1, paddingHorizontal: 16, height: 52, fontSize: 15, fontWeight: '500' },
  textArea: { borderWidth: 1, padding: 16, fontSize: 15, fontWeight: '500', minHeight: 110, textAlignVertical: 'top' },

  // Media grid (Step 1)
  mediaGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  mediaThumbWrap: { position: 'relative' },
  mediaThumb: { width: '100%', height: '100%' },
  videoLabel: {
    position: 'absolute',
    bottom: 6,
    left: 6,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 8,
    paddingHorizontal: 5,
    paddingVertical: 3,
  },
  coverBadge: { position: 'absolute', top: 6, left: 6, paddingVertical: 2, paddingHorizontal: 6 },
  coverBadgeText: { fontSize: 9, fontWeight: '800', color: '#FFF', letterSpacing: 0.5 },
  removeMediaBtn: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#F44336',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addMediaRow: { flexDirection: 'row', gap: 12, marginTop: 8 },
  addMediaBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 24,
  },
  addMediaText: { fontSize: 14, fontWeight: '700' },
  addMediaSub: { fontSize: 11, fontWeight: '500' },
  mediaCount: { fontSize: 12, fontWeight: '600', textAlign: 'center', marginTop: 4 },

  // Category (Step 3)
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderWidth: 1,
  },
  categoryChipText: { fontSize: 15, fontWeight: '600' },

  // Condition chips (Step 4)
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  conditionChip: { paddingVertical: 8, paddingHorizontal: 16, borderWidth: 1 },
  conditionChipText: { fontSize: 13, fontWeight: '600' },

  // Age grid (Step 4)
  ageGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  ageChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
  },
  ageChipText: { fontSize: 13, fontWeight: '600' },

  // Preview (Step 5)
  previewCover: { width: '100%', height: SCREEN_W * 0.6, resizeMode: 'cover', marginTop: 8 },
  previewMediaCount: { fontSize: 12, fontWeight: '600', textAlign: 'center', marginTop: 6 },
  previewTitle: { fontSize: 20, fontWeight: '800', marginTop: 16 },
  previewCaption: { fontSize: 14, fontWeight: '400', lineHeight: 20 },
  previewBadges: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  previewBadge: { paddingVertical: 5, paddingHorizontal: 12 },
  previewBadgeText: { fontSize: 12, fontWeight: '700' },

  // Upload overlay
  uploadOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
  },
  uploadCard: {
    width: 260,
    alignItems: 'center',
    padding: 32,
    gap: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 10,
  },
  uploadStatusText: { fontSize: 16, fontWeight: '600', textAlign: 'center' },
  uploadTrack: { width: '100%', height: 6, overflow: 'hidden' },
  uploadFill: { height: 6 },
  uploadPercent: { fontSize: 13, fontWeight: '700' },

  // Bottom bar
  bottomBar: { paddingHorizontal: 20, paddingTop: 8 },
  nextBtn: { height: 52, alignItems: 'center', justifyContent: 'center' },
  nextBtnText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
  publishRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
})
