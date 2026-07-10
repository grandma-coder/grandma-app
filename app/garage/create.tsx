/**
 * Create Post — Full-screen multi-step flow (cream-paper / sticker-collage).
 *
 * Step 1: Add photos & videos (up to 10)
 * Step 2: Title + caption
 * Step 3: Category (with custom "Other" text input)
 * Step 4: Size & age range + condition
 * Step 5: Preview + publish
 *
 * Accent (progress bar, buttons, selected chips) follows the active journey
 * mode via getModeColor. Dialogs use PaperAlert, not native Alert.
 */

import { useState, useRef } from 'react'
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  Image,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
  Animated,
} from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import * as DocumentPicker from 'expo-document-picker'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { router } from 'expo-router'
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
import { useTheme, getModeColor, useDiffuseTheme, getDiffuseAccent, diffuseFont } from '../../constants/theme'
import { useModeStore } from '../../store/useModeStore'
import { useTranslation } from '../../lib/i18n'
import { BrandedLoader } from '../../components/ui/BrandedLoader'
import { PaperAlert, type PaperAlertButton } from '../../components/ui/PaperAlert'
import { createGaragePost } from '../../lib/garagePosts'
import { useIsDiffuse, DiffuseArrow } from '../../components/ui/diffuse/DiffuseKit'
import { DiffuseBloomIcon } from '../../components/ui/diffuse/DiffusePrimitives'

const SCREEN_W = Dimensions.get('window').width
const TOTAL_STEPS = 5
const SAFETY_AGREED_KEY = 'photo-safety-agreed'

const CATEGORIES = ['Clothing', 'Gear', 'Toys', 'Furniture', 'Books', 'Maternity', 'Nursery', 'Other']
const CONDITIONS = ['New', 'Like New', 'Good', 'Fair', 'Well Loved']

// Age → Size mapping: pick age first, then see relevant sizes
const AGE_GROUPS = [
  { label: '0–3 months', sizes: ['Preemie', 'Newborn (NB)', '0–3 months'] },
  { label: '3–6 months', sizes: ['3–6 months'] },
  { label: '6–12 months', sizes: ['6–9 months', '9–12 months'] },
  { label: '1–2 years', sizes: ['12–18 months', '18–24 months', '2T'] },
  { label: '2–4 years', sizes: ['2T', '3T', '4T'] },
  { label: '4–6 years', sizes: ['4T', '5T', 'XS (4–5)', 'S (6)'] },
  { label: '6–8 years', sizes: ['S (6)', 'M (7–8)'] },
  { label: '8–10 years', sizes: ['M (7–8)', 'L (10–12)'] },
  { label: '10–12 years', sizes: ['L (10–12)', 'XL (14–16)'] },
  { label: '12+ years', sizes: ['XL (14–16)', 'XXL (18)'] },
  { label: 'All ages', sizes: ['One Size', 'Adjustable'] },
]

interface AlertState {
  title: string
  message?: string
  buttons?: PaperAlertButton[]
}

export default function CreatePostScreen() {
  const { colors, radius, stickers, font, isDark, brand } = useTheme()
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
  const mode = useModeStore((sel) => sel.mode)
  const accent = diffuse ? getDiffuseAccent(mode, dt.isDark) : getModeColor(mode, isDark)
  const insets = useSafeAreaInsets()
  const ink = diffuse ? dt.colors.ink : (isDark ? colors.text : '#141313')
  const { t } = useTranslation()

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

  // PaperAlert
  const [alert, setAlert] = useState<AlertState | null>(null)

  // ─── Photo-safety gate (PaperAlert, persists agreement) ─────────────────

  async function ensurePhotoSafety(onAgree: () => void) {
    const agreed = await AsyncStorage.getItem(SAFETY_AGREED_KEY)
    if (agreed === 'true') {
      onAgree()
      return
    }
    setAlert({
      title: t('garage_create_safetyTitle'),
      message:
        "To protect children's privacy and safety:\n\n" +
        "• Do NOT share photos showing children's faces\n" +
        '• Blur or crop faces before sharing\n' +
        '• No identifying information (school names, addresses)\n' +
        '• Product and item photos are always welcome\n\n' +
        'Violations will result in content removal and possible account suspension.',
      buttons: [
        { label: t('garage_create_safetyDecline'), variant: 'secondary' },
        {
          label: t('garage_create_safetyAgree'),
          variant: 'primary',
          onPress: () => {
            void AsyncStorage.setItem(SAFETY_AGREED_KEY, 'true')
            onAgree()
          },
        },
      ],
    })
  }

  // ─── Media pickers ────────────────────────────────────────────────────

  function pickMedia() {
    void ensurePhotoSafety(runPickMedia)
  }

  async function runPickMedia() {
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
        setAlert({ title: t('garage_create_uploadError'), message: t('garage_create_errorLoadPhoto') })
      }
    }
  }

  function takePhoto() {
    void ensurePhotoSafety(runTakePhoto)
  }

  async function runTakePhoto() {
    try {
      const perm = await ImagePicker.requestCameraPermissionsAsync()
      if (!perm.granted) {
        setAlert({ title: t('garage_create_errorCamera'), message: 'Enable camera access in Settings to take a photo.' })
        return
      }
      const result = await ImagePicker.launchCameraAsync({})
      if (!result.canceled && result.assets?.[0]) {
        setMedia((prev) =>
          [...prev, { uri: result.assets[0].uri, type: 'photo' as const }].slice(0, 10)
        )
      }
    } catch {
      setAlert({ title: t('garage_create_uploadError'), message: t('garage_create_errorCapturePhoto') })
    }
  }

  function removeMedia(index: number) {
    setMedia((prev) => prev.filter((_, i) => i !== index))
  }

  // ─── Navigation ───────────────────────────────────────────────────────

  function goBack() {
    if (step === 1) router.back()
    else setStep(step - 1)
  }

  function goNext() {
    setStep(step + 1)
  }

  function canAdvance(): boolean {
    switch (step) {
      case 1: return media.length > 0
      case 2: return title.trim().length > 0
      case 3: return category !== null && (category !== 'Other' || customCategory.trim().length > 0)
      case 4: return true
      case 5: return true
      default: return false
    }
  }

  // ─── Publish ──────────────────────────────────────────────────────────

  async function handlePublish() {
    if (media.length === 0) {
      setAlert({ title: t('garage_create_noPhotosTitle'), message: t('garage_create_noPhotosMsg') })
      return
    }
    setPosting(true)
    setUploadProgress(0)
    setUploadStatus(t('garage_create_preparing'))
    progressAnim.setValue(0)

    try {
      const finalCategory = category === 'Other' ? customCategory.trim() : category
      await createGaragePost({
        caption: [title, caption].filter(Boolean).join('\n\n') || undefined,
        mediaUris: media,
        category: finalCategory ?? undefined,
        tags: [selectedSize, selectedAge, condition].filter(Boolean) as string[],
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

      setUploadStatus(t('garage_create_published'))
      Animated.timing(progressAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: false,
      }).start()

      setTimeout(() => {
        router.back()
      }, 600)
    } catch (e: any) {
      setAlert({ title: t('garage_create_uploadError'), message: e.message })
      setPosting(false)
    }
  }

  const progress = step / TOTAL_STEPS

  return (
    <View style={[s.root, { backgroundColor: diffuse ? dt.colors.bg : colors.bg }]}>
      {/* Header */}
      <View style={[s.header, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={goBack} style={s.backBtn} hitSlop={12}>
          <ArrowLeft size={24} color={diffuse ? dt.colors.ink : colors.text} />
        </Pressable>
        <Text style={[s.headerTitle, diffuse
          ? { color: dt.colors.ink3, fontFamily: diffuseFont.mono, textTransform: 'uppercase', letterSpacing: 1.6 }
          : { color: colors.text, fontFamily: font.bodySemiBold }]}>
          {step === 5 ? t('garage_create_preview') : t('garage_create_stepN', { step, total: TOTAL_STEPS })}
        </Text>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <X size={22} color={diffuse ? dt.colors.ink3 : colors.textMuted} />
        </Pressable>
      </View>

      {/* Progress bar */}
      <View style={[s.progressTrack, { backgroundColor: diffuse ? dt.colors.line : colors.border }]}>
        <View style={[s.progressFill, { width: `${progress * 100}%`, backgroundColor: diffuse ? dt.colors.ink : accent }]} />
      </View>

      {/* Step content */}
      <ScrollView
        style={s.content}
        contentContainerStyle={s.contentInner}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {step === 1 && (
          <Step1Media media={media} onPickMedia={pickMedia} onTakePhoto={takePhoto} onRemove={removeMedia} />
        )}
        {step === 2 && (
          <Step2TitleCaption title={title} onTitleChange={setTitle} caption={caption} onCaptionChange={setCaption} />
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
              setSelectedSize(null)
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
              diffuse
                ? { backgroundColor: 'transparent', borderWidth: 1, borderColor: dt.colors.line2, borderRadius: radius.full, opacity: canAdvance() ? 1 : 0.35 }
                : { backgroundColor: accent, borderRadius: radius.full, opacity: canAdvance() ? 1 : 0.35 },
              pressed && canAdvance() && { transform: [{ scale: 0.98 }] },
            ]}
          >
            {diffuse ? (
              <View style={s.publishRow}>
                <Text style={[s.nextBtnText, { color: dt.colors.ink, fontFamily: diffuseFont.monoBold, textTransform: 'uppercase', letterSpacing: 2, fontSize: 13 }]}>
                  {step === 4 ? t('garage_create_preview') : t('garage_create_next')}
                </Text>
                <DiffuseArrow color={accent} />
              </View>
            ) : (
              <Text style={[s.nextBtnText, { color: ink, fontFamily: font.bodyBold }]}>
                {step === 4 ? t('garage_create_preview') : t('garage_create_next')}
              </Text>
            )}
          </Pressable>
        ) : (
          <Pressable
            onPress={handlePublish}
            disabled={posting}
            style={({ pressed }) => [
              s.nextBtn,
              diffuse
                ? { backgroundColor: 'transparent', borderWidth: 1, borderColor: dt.colors.line2, borderRadius: radius.full, opacity: posting ? 0.5 : 1 }
                : { backgroundColor: accent, borderRadius: radius.full, opacity: posting ? 0.5 : 1 },
              pressed && !posting && { transform: [{ scale: 0.98 }] },
            ]}
          >
            {posting ? (
              <ActivityIndicator color={diffuse ? dt.colors.ink : ink} size="small" />
            ) : (
              <View style={s.publishRow}>
                <Send size={18} color={diffuse ? accent : ink} strokeWidth={2.4} />
                <Text style={[s.nextBtnText, diffuse
                  ? { color: dt.colors.ink, fontFamily: diffuseFont.monoBold, textTransform: 'uppercase', letterSpacing: 2, fontSize: 13 }
                  : { color: ink, fontFamily: font.bodyBold }]}>{t('garage_create_publish')}</Text>
              </View>
            )}
          </Pressable>
        )}
      </View>

      {/* Upload progress overlay */}
      {posting && (
        <View style={s.uploadOverlay}>
          <View style={[s.uploadCard, diffuse
            ? { backgroundColor: dt.colors.surface, borderColor: dt.colors.line, borderRadius: radius.xl, shadowOpacity: 0, elevation: 0 }
            : { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.xl }]}>
            {uploadProgress >= 1 ? (
              <Check size={32} color={diffuse ? dt.colors.success : brand.success} strokeWidth={2.5} />
            ) : (
              <BrandedLoader logoSize={64} />
            )}
            <Text style={[s.uploadStatusText, { color: diffuse ? dt.colors.ink : colors.text, fontFamily: diffuse ? diffuseFont.body : font.bodySemiBold }]}>
              {uploadStatus}
            </Text>
            <View style={[s.uploadTrack, { backgroundColor: diffuse ? dt.colors.line : colors.border, borderRadius: radius.sm }]}>
              <Animated.View
                style={[
                  s.uploadFill,
                  {
                    backgroundColor: uploadProgress >= 1 ? (diffuse ? dt.colors.success : brand.success) : (diffuse ? dt.colors.ink : accent),
                    borderRadius: radius.sm,
                    width: progressAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
                  },
                ]}
              />
            </View>
            <Text style={[s.uploadPercent, { color: diffuse ? dt.colors.ink3 : colors.textMuted, fontFamily: diffuse ? diffuseFont.monoBold : font.bodyBold }]}>
              {Math.round(uploadProgress * 100)}%
            </Text>
          </View>
        </View>
      )}

      <PaperAlert
        visible={alert !== null}
        title={alert?.title ?? ''}
        message={alert?.message}
        buttons={alert?.buttons}
        onRequestClose={() => setAlert(null)}
      />
    </View>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// STEP 1 — Photos & Videos
// ═══════════════════════════════════════════════════════════════════════════

function Step1Media({
  media, onPickMedia, onTakePhoto, onRemove,
}: {
  media: { uri: string; type: 'photo' | 'video' }[]
  onPickMedia: () => void
  onTakePhoto: () => void
  onRemove: (i: number) => void
}) {
  const { colors, radius, stickers, font, isDark, brand } = useTheme()
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
  const mode = useModeStore((sel) => sel.mode)
  const accent = diffuse ? getDiffuseAccent(mode, dt.isDark) : getModeColor(mode, isDark)
  const ink = diffuse ? dt.colors.ink : (isDark ? colors.text : '#141313')
  const thumbSize = (SCREEN_W - 48 - 16) / 3
  const { t } = useTranslation()

  return (
    <View style={s.stepContainer}>
      <Text style={[s.stepTitle, { color: diffuse ? dt.colors.ink : colors.text, fontFamily: diffuse ? diffuseFont.display : font.display }]}>{t('garage_create_step1Title')}</Text>
      <Text style={[s.stepHint, { color: diffuse ? dt.colors.ink3 : colors.textSecondary, fontFamily: diffuse ? diffuseFont.body : font.body }]}>
        {t('garage_create_step1Hint')}
      </Text>

      {/* Media grid */}
      <View style={s.mediaGrid}>
        {media.map((item, i) => (
          <View key={i} style={[s.mediaThumbWrap, { width: thumbSize, height: thumbSize }]}>
            <Image source={{ uri: item.uri }} style={[s.mediaThumb, { borderRadius: radius.md }]} />
            {item.type === 'video' && (
              <View style={s.videoLabel}>
                <Play size={12} color="#FFFFFF" fill="#FFFFFF" />
              </View>
            )}
            {i === 0 && (
              <View style={[s.coverBadge, diffuse
                ? { backgroundColor: dt.colors.surface, borderWidth: StyleSheet.hairlineWidth, borderColor: dt.colors.line2, borderRadius: radius.sm }
                : { backgroundColor: accent, borderRadius: radius.sm }]}>
                <Text style={[s.coverBadgeText, diffuse
                  ? { color: dt.colors.ink3, fontFamily: diffuseFont.mono, textTransform: 'uppercase', letterSpacing: 1 }
                  : { color: ink, fontFamily: font.bodyBold }]}>{t('garage_create_coverBadge')}</Text>
              </View>
            )}
            <Pressable onPress={() => onRemove(i)} style={[s.removeMediaBtn, { backgroundColor: diffuse ? dt.colors.error : brand.error }]}>
              <X size={12} color="#FFFFFF" strokeWidth={2.6} />
            </Pressable>
          </View>
        ))}
      </View>

      {/* Add buttons */}
      {media.length < 10 && (
        <View style={s.addMediaRow}>
          <Pressable
            onPress={onPickMedia}
            style={[s.addMediaBtn, diffuse
              ? { backgroundColor: dt.colors.surface, borderColor: dt.colors.line, borderRadius: radius.lg }
              : { backgroundColor: stickers.blueSoft, borderColor: colors.border, borderRadius: radius.lg }]}
          >
            {diffuse ? (
              <DiffuseBloomIcon size={40} intensity={0.45}><ImageIcon size={24} color={dt.colors.ink3} strokeWidth={1.7} /></DiffuseBloomIcon>
            ) : (
              <ImageIcon size={24} color={stickers.blueInk} strokeWidth={2.2} />
            )}
            <Text style={[s.addMediaText, { color: diffuse ? dt.colors.ink : colors.text, fontFamily: diffuse ? diffuseFont.bodySemiBold : font.bodySemiBold }]}>{t('garage_create_gallery')}</Text>
            <Text style={[s.addMediaSub, diffuse
              ? { color: dt.colors.ink3, fontFamily: diffuseFont.mono, textTransform: 'uppercase', letterSpacing: 1 }
              : { color: colors.textMuted, fontFamily: font.bodyMedium }]}>{t('garage_create_galleryPhotosVideos')}</Text>
          </Pressable>
          <Pressable
            onPress={onTakePhoto}
            style={[s.addMediaBtn, diffuse
              ? { backgroundColor: dt.colors.surface, borderColor: dt.colors.line, borderRadius: radius.lg }
              : { backgroundColor: stickers.yellowSoft, borderColor: colors.border, borderRadius: radius.lg }]}
          >
            {diffuse ? (
              <DiffuseBloomIcon size={40} intensity={0.45}><Camera size={24} color={dt.colors.ink3} strokeWidth={1.7} /></DiffuseBloomIcon>
            ) : (
              <Camera size={24} color={stickers.yellowInk} strokeWidth={2.2} />
            )}
            <Text style={[s.addMediaText, { color: diffuse ? dt.colors.ink : colors.text, fontFamily: diffuse ? diffuseFont.bodySemiBold : font.bodySemiBold }]}>{t('scan_cameraBtn')}</Text>
            <Text style={[s.addMediaSub, diffuse
              ? { color: dt.colors.ink3, fontFamily: diffuseFont.mono, textTransform: 'uppercase', letterSpacing: 1 }
              : { color: colors.textMuted, fontFamily: font.bodyMedium }]}>{t('garage_create_cameraTakePhoto')}</Text>
          </Pressable>
        </View>
      )}

      <Text style={[s.mediaCount, diffuse
        ? { color: dt.colors.ink3, fontFamily: diffuseFont.mono, textTransform: 'uppercase', letterSpacing: 1.2 }
        : { color: colors.textMuted, fontFamily: font.bodySemiBold }]}>
        {t('garage_create_mediaCount', { n: media.length })}
      </Text>
    </View>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// STEP 2 — Title & Caption
// ═══════════════════════════════════════════════════════════════════════════

function Step2TitleCaption({
  title, onTitleChange, caption, onCaptionChange,
}: {
  title: string
  onTitleChange: (t: string) => void
  caption: string
  onCaptionChange: (c: string) => void
}) {
  const { colors, radius, font } = useTheme()
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
  const { t } = useTranslation()

  return (
    <View style={s.stepContainer}>
      <Text style={[s.stepTitle, { color: diffuse ? dt.colors.ink : colors.text, fontFamily: diffuse ? diffuseFont.display : font.display }]}>{t('garage_create_step2Title')}</Text>

      {/* Title */}
      <Text style={[s.fieldLabel, diffuse
        ? { color: dt.colors.ink3, fontFamily: diffuseFont.mono, textTransform: 'uppercase', letterSpacing: 1.6 }
        : { color: colors.textMuted, fontFamily: font.bodyBold }]}>{t('garage_create_fieldTitle')}</Text>
      <TextInput
        value={title}
        onChangeText={onTitleChange}
        placeholder='e.g. "Ergobaby Carrier — Barely Used"'
        placeholderTextColor={diffuse ? dt.colors.ink4 : colors.textMuted}
        style={[s.textInput, diffuse
          ? { color: dt.colors.ink, fontFamily: diffuseFont.body, backgroundColor: dt.colors.surface, borderColor: dt.colors.line, borderRadius: radius.md }
          : { color: colors.text, fontFamily: font.bodyMedium, backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.md }]}
      />
      <Text style={[s.fieldTip, { color: diffuse ? dt.colors.ink3 : colors.textMuted, fontFamily: diffuse ? diffuseFont.italic : font.italic }]}>
        {t('garage_create_fieldTitleTip')}
      </Text>

      {/* Caption */}
      <Text style={[s.fieldLabel, { marginTop: 20 }, diffuse
        ? { color: dt.colors.ink3, fontFamily: diffuseFont.mono, textTransform: 'uppercase', letterSpacing: 1.6 }
        : { color: colors.textMuted, fontFamily: font.bodyBold }]}>
        {t('garage_create_fieldCaption')}
      </Text>
      <TextInput
        value={caption}
        onChangeText={onCaptionChange}
        placeholder="Tell others about this item — why you love it, how it's been used…"
        placeholderTextColor={diffuse ? dt.colors.ink4 : colors.textMuted}
        multiline
        style={[s.textArea, diffuse
          ? { color: dt.colors.ink, fontFamily: diffuseFont.body, backgroundColor: dt.colors.surface, borderColor: dt.colors.line, borderRadius: radius.md }
          : { color: colors.text, fontFamily: font.bodyMedium, backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.md }]}
      />
    </View>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// STEP 3 — Category
// ═══════════════════════════════════════════════════════════════════════════

function Step3Category({
  category, onCategoryChange, customCategory, onCustomCategoryChange,
}: {
  category: string | null
  onCategoryChange: (c: string) => void
  customCategory: string
  onCustomCategoryChange: (c: string) => void
}) {
  const { colors, radius, stickers, font, isDark } = useTheme()
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
  const mode = useModeStore((sel) => sel.mode)
  const accent = diffuse ? getDiffuseAccent(mode, dt.isDark) : ''
  const ink = diffuse ? dt.colors.ink : (isDark ? colors.text : '#141313')
  const { t } = useTranslation()

  return (
    <View style={s.stepContainer}>
      <Text style={[s.stepTitle, { color: diffuse ? dt.colors.ink : colors.text, fontFamily: diffuse ? diffuseFont.display : font.display }]}>{t('garage_create_step3Title')}</Text>
      <Text style={[s.stepHint, { color: diffuse ? dt.colors.ink3 : colors.textSecondary, fontFamily: diffuse ? diffuseFont.body : font.body }]}>
        {t('garage_create_step3Hint')}
      </Text>

      <View style={s.categoryGrid}>
        {CATEGORIES.map((c) => {
          const isActive = category === c
          return (
            <Pressable
              key={c}
              onPress={() => onCategoryChange(c)}
              style={[s.categoryChip, diffuse
                ? {
                    backgroundColor: isActive ? dt.colors.surface : 'transparent',
                    borderColor: isActive ? dt.colors.hairline : dt.colors.line,
                    borderRadius: radius.full,
                  }
                : {
                    backgroundColor: isActive ? stickers.pinkSoft : colors.surface,
                    borderColor: isActive ? ink : colors.border,
                    borderRadius: radius.full,
                  }]}
            >
              {isActive && <Check size={16} color={diffuse ? accent : ink} strokeWidth={3} />}
              <Text style={[s.categoryChipText, diffuse
                ? { color: isActive ? dt.colors.ink : dt.colors.ink3, fontFamily: isActive ? diffuseFont.monoBold : diffuseFont.mono, textTransform: 'uppercase', letterSpacing: 1.2, fontSize: 12 }
                : { color: ink, fontFamily: font.bodySemiBold }]}>{c}</Text>
            </Pressable>
          )
        })}
      </View>

      {/* Custom category input */}
      {category === 'Other' && (
        <View style={{ marginTop: 16 }}>
          <Text style={[s.fieldLabel, diffuse
            ? { color: dt.colors.ink3, fontFamily: diffuseFont.mono, textTransform: 'uppercase', letterSpacing: 1.6 }
            : { color: colors.textMuted, fontFamily: font.bodyBold }]}>{t('garage_create_fieldYourCategory')}</Text>
          <TextInput
            value={customCategory}
            onChangeText={onCustomCategoryChange}
            placeholder='e.g. "Stroller Accessories", "Feeding Supplies"'
            placeholderTextColor={diffuse ? dt.colors.ink4 : colors.textMuted}
            autoFocus
            style={[s.textInput, diffuse
              ? { color: dt.colors.ink, fontFamily: diffuseFont.body, backgroundColor: dt.colors.surface, borderColor: dt.colors.line, borderRadius: radius.md }
              : { color: colors.text, fontFamily: font.bodyMedium, backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.md }]}
          />
        </View>
      )}
    </View>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// STEP 4 — Details (condition, age, size)
// ═══════════════════════════════════════════════════════════════════════════

function Step4Details({
  condition, onConditionChange, selectedAge, onAgeChange, selectedSize, onSizeChange,
}: {
  condition: string | null
  onConditionChange: (c: string) => void
  selectedAge: string | null
  onAgeChange: (a: string | null) => void
  selectedSize: string | null
  onSizeChange: (s: string | null) => void
}) {
  const { colors, radius, stickers, font, isDark } = useTheme()
  const ink = isDark ? colors.text : '#141313'
  const { t } = useTranslation()

  const ageGroup = AGE_GROUPS.find((g) => g.label === selectedAge)
  const availableSizes = ageGroup?.sizes ?? []

  return (
    <View style={s.stepContainer}>
      <Text style={[s.stepTitle, { color: colors.text, fontFamily: font.display }]}>{t('garage_create_step4Title')}</Text>
      <Text style={[s.stepHint, { color: colors.textSecondary, fontFamily: font.body }]}>
        {t('garage_create_step4Hint')}
      </Text>

      {/* Condition */}
      <Text style={[s.fieldLabel, { color: colors.textMuted, fontFamily: font.bodyBold }]}>{t('garage_create_fieldCondition')}</Text>
      <View style={s.chipRow}>
        {CONDITIONS.map((c) => {
          const isActive = condition === c
          return (
            <Pressable
              key={c}
              onPress={() => onConditionChange(c)}
              style={[s.pillChip, {
                backgroundColor: isActive ? stickers.pinkSoft : colors.surface,
                borderColor: isActive ? ink : colors.border,
                borderRadius: radius.full,
              }]}
            >
              <Text style={[s.pillChipText, { color: ink, fontFamily: font.bodySemiBold }]}>{c}</Text>
            </Pressable>
          )
        })}
      </View>

      {/* Age range — pick first */}
      <Text style={[s.fieldLabel, { color: colors.textMuted, fontFamily: font.bodyBold, marginTop: 24 }]}>
        {t('garage_create_fieldAgeRange')}
      </Text>
      <Text style={[s.fieldTip, { color: colors.textMuted, fontFamily: font.italic, marginBottom: 8 }]}>
        {t('garage_create_ageFirstHint')}
      </Text>
      <View style={s.ageGrid}>
        {AGE_GROUPS.map((group) => {
          const isActive = selectedAge === group.label
          return (
            <Pressable
              key={group.label}
              onPress={() => onAgeChange(isActive ? null : group.label)}
              style={[s.ageChip, {
                backgroundColor: isActive ? stickers.pinkSoft : colors.surface,
                borderColor: isActive ? ink : colors.border,
                borderRadius: radius.full,
              }]}
            >
              {isActive && <Check size={14} color={ink} strokeWidth={3} />}
              <Text style={[s.ageChipText, { color: ink, fontFamily: font.bodySemiBold }]}>{group.label}</Text>
            </Pressable>
          )
        })}
      </View>

      {/* Size — shows after age is picked */}
      {selectedAge && availableSizes.length > 0 && (
        <>
          <Text style={[s.fieldLabel, { color: colors.textMuted, fontFamily: font.bodyBold, marginTop: 24 }]}>
            {t('garage_create_fieldSize', { age: selectedAge ?? '' })}
          </Text>
          <View style={s.chipRow}>
            {availableSizes.map((sz) => {
              const isActive = selectedSize === sz
              return (
                <Pressable
                  key={sz}
                  onPress={() => onSizeChange(isActive ? null : sz)}
                  style={[s.pillChip, {
                    backgroundColor: isActive ? stickers.pinkSoft : colors.surface,
                    borderColor: isActive ? ink : colors.border,
                    borderRadius: radius.full,
                  }]}
                >
                  <Text style={[s.pillChipText, { color: ink, fontFamily: font.bodySemiBold }]}>{sz}</Text>
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
  media, title, caption, category, condition, size, age,
}: {
  media: { uri: string; type: 'photo' | 'video' }[]
  title: string
  caption: string
  category: string | null
  condition: string | null
  size: string | null
  age: string | null
}) {
  const { colors, radius, stickers, font, isDark } = useTheme()
  const { t } = useTranslation()
  const ink = isDark ? colors.text : '#141313'

  return (
    <View style={s.stepContainer}>
      <Text style={[s.stepTitle, { color: colors.text, fontFamily: font.display }]}>{t('garage_create_previewTitle')}</Text>

      {/* Cover image */}
      {media.length > 0 && (
        <Image source={{ uri: media[0].uri }} style={[s.previewCover, { borderRadius: radius.lg }]} />
      )}

      {/* Media count */}
      {media.length > 1 && (
        <Text style={[s.previewMediaCount, { color: colors.textMuted, fontFamily: font.bodySemiBold }]}>
          {media.length - 1 === 1
            ? t('garage_create_moreMediaOne', { count: media.length - 1 })
            : t('garage_create_moreMediaMany', { count: media.length - 1 })}
        </Text>
      )}

      {/* Title — editorial serif */}
      <Text style={[s.previewTitle, { color: colors.text, fontFamily: font.display }]}>{title}</Text>

      {/* Caption */}
      {caption ? (
        <Text style={[s.previewCaption, { color: colors.textSecondary, fontFamily: font.body }]}>{caption}</Text>
      ) : null}

      {/* Tags / badges */}
      <View style={s.previewBadges}>
        {category && (
          <View style={[s.previewBadge, { backgroundColor: stickers.pinkSoft, borderColor: ink, borderRadius: radius.full }]}>
            <Text style={[s.previewBadgeText, { color: ink, fontFamily: font.bodySemiBold }]}>{category}</Text>
          </View>
        )}
        {condition && (
          <View style={[s.previewBadge, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.full }]}>
            <Text style={[s.previewBadgeText, { color: colors.textSecondary, fontFamily: font.bodySemiBold }]}>{condition}</Text>
          </View>
        )}
        {size && (
          <View style={[s.previewBadge, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.full }]}>
            <Text style={[s.previewBadgeText, { color: colors.textSecondary, fontFamily: font.bodySemiBold }]}>{size}</Text>
          </View>
        )}
        {age && (
          <View style={[s.previewBadge, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.full }]}>
            <Text style={[s.previewBadgeText, { color: colors.textSecondary, fontFamily: font.bodySemiBold }]}>{age}</Text>
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
  headerTitle: { fontSize: 16 },

  // Progress
  progressTrack: { height: 3, marginHorizontal: 16, borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: 3, borderRadius: 2 },

  // Content
  content: { flex: 1 },
  contentInner: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 40 },

  stepContainer: { gap: 12 },
  stepTitle: { fontSize: 28, letterSpacing: -0.5 },
  stepHint: { fontSize: 14, lineHeight: 20, marginBottom: 8 },

  // Field labels
  fieldLabel: { fontSize: 11, letterSpacing: 1, marginBottom: 6 },
  fieldTip: { fontSize: 13, marginTop: 4 },

  // Text inputs
  textInput: { borderWidth: 1, paddingHorizontal: 16, height: 56, fontSize: 15 },
  textArea: { borderWidth: 1, padding: 16, fontSize: 15, minHeight: 110, textAlignVertical: 'top' },

  // Media grid (Step 1)
  mediaGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  mediaThumbWrap: { position: 'relative' },
  mediaThumb: { width: '100%', height: '100%' },
  videoLabel: {
    position: 'absolute', bottom: 6, left: 6,
    backgroundColor: 'rgba(20,19,19,0.6)', borderRadius: 8,
    paddingHorizontal: 5, paddingVertical: 3,
  },
  coverBadge: { position: 'absolute', top: 6, left: 6, paddingVertical: 3, paddingHorizontal: 8 },
  coverBadgeText: { fontSize: 9, letterSpacing: 0.5 },
  removeMediaBtn: {
    position: 'absolute', top: -4, right: -4,
    width: 22, height: 22, borderRadius: 11,
    alignItems: 'center', justifyContent: 'center',
  },
  addMediaRow: { flexDirection: 'row', gap: 12, marginTop: 8 },
  addMediaBtn: {
    flex: 1, alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 24, borderWidth: 1,
  },
  addMediaText: { fontSize: 15 },
  addMediaSub: { fontSize: 11 },
  mediaCount: { fontSize: 12, textAlign: 'center', marginTop: 4 },

  // Category (Step 3)
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  categoryChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingVertical: 11, paddingHorizontal: 18, borderWidth: 1,
  },
  categoryChipText: { fontSize: 15 },

  // Pill chips (condition + size — Step 4)
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pillChip: { paddingVertical: 9, paddingHorizontal: 16, borderWidth: 1 },
  pillChipText: { fontSize: 13 },

  // Age grid (Step 4)
  ageGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  ageChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingVertical: 10, paddingHorizontal: 14, borderWidth: 1,
  },
  ageChipText: { fontSize: 13 },

  // Preview (Step 5)
  previewCover: { width: '100%', height: SCREEN_W * 0.6, resizeMode: 'cover', marginTop: 8 },
  previewMediaCount: { fontSize: 12, textAlign: 'center', marginTop: 6 },
  previewTitle: { fontSize: 24, letterSpacing: -0.4, marginTop: 16 },
  previewCaption: { fontSize: 14, lineHeight: 20 },
  previewBadges: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  previewBadge: { paddingVertical: 6, paddingHorizontal: 13, borderWidth: 1 },
  previewBadgeText: { fontSize: 12 },

  // Upload overlay
  uploadOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(20,19,19,0.5)',
    alignItems: 'center', justifyContent: 'center', zIndex: 100,
  },
  uploadCard: {
    width: 260, alignItems: 'center', padding: 32, gap: 16, borderWidth: 1,
    shadowColor: '#141313', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18, shadowRadius: 24, elevation: 10,
  },
  uploadStatusText: { fontSize: 16, textAlign: 'center' },
  uploadTrack: { width: '100%', height: 6, overflow: 'hidden' },
  uploadFill: { height: 6 },
  uploadPercent: { fontSize: 13 },

  // Bottom bar
  bottomBar: { paddingHorizontal: 20, paddingTop: 8 },
  nextBtn: { height: 56, alignItems: 'center', justifyContent: 'center' },
  nextBtnText: { fontSize: 16 },
  publishRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
})
