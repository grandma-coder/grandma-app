/**
 * ExamForm — shared exam-logging form used by all three behaviors.
 *
 * Flow:
 *   1. User taps "Add photo" → picks image(s) from camera / library.
 *   2. First photo auto-runs Claude Vision extract → prefills title/result/date/notes.
 *   3. User reviews + edits, taps Save → row in `exams` table.
 *
 * Photos upload to Supabase Storage (scan-images bucket, path `exams/{userId}/...`).
 */

import { useCallback, useState } from 'react'
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  Image,
  Alert,
  ActivityIndicator,
  StyleSheet,
} from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import { Camera, ImagePlus, Sparkles, X } from 'lucide-react-native'

import { useTheme, brand, stickers as stickersLight, stickersDark, font, useDiffuseTheme, diffuseFont, getDiffuseAccent } from '../../constants/theme'
import { useIsDiffuse } from '../ui/diffuse/DiffuseKit'
import { DiffuseBloomIcon } from '../ui/diffuse/DiffusePrimitives'
import { useTranslation } from '../../lib/i18n'
import { LogFormSticker } from '../calendar/LogFormSticker'
import { toDateStr } from '../../lib/cycleLogic'
import {
  type ExamBehavior,
  type ExamExtracted,
  createExam,
  uploadExamPhoto,
  extractExamFromPhoto,
  useInvalidateExams,
  useExamPhotoUrls,
} from '../../lib/examData'

interface Props {
  /** Which behavior context this exam belongs to (drives filtering in the list). */
  behavior: ExamBehavior
  /** Child this exam is for (kids mode). Ignored in pregnancy / pre-preg. */
  childId?: string | null
  /** Default exam date (YYYY-MM-DD). */
  date?: string
  /** Fires after a successful save — parent dismisses the sheet. */
  onSaved: () => void
}

const INK = '#141313'

export function ExamForm({ behavior, childId, date, onSaved }: Props) {
  const { colors, radius, isDark, font } = useTheme()
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
  const { t } = useTranslation()
  const s = isDark ? stickersDark : stickersLight
  const inkBorder = diffuse ? dt.colors.line2 : (isDark ? colors.border : INK)
  const paper = diffuse ? dt.colors.surface : (isDark ? colors.surface : '#FFFEF8')
  const inkText = diffuse ? dt.colors.ink : (isDark ? colors.text : INK)
  const placeholderColor = diffuse ? dt.colors.ink4 : colors.textMuted
  const invalidate = useInvalidateExams()

  const [title, setTitle] = useState('')
  const [result, setResult] = useState('')
  const [provider, setProvider] = useState('')
  const [notes, setNotes] = useState('')
  const [examDate, setExamDate] = useState(date ?? toDateStr(new Date()))
  const [photos, setPhotos] = useState<
    { storagePath: string; localUri: string }[]
  >([])
  const signedUrls = useExamPhotoUrls(photos.map((p) => p.storagePath))
  const [extracted, setExtracted] = useState<ExamExtracted | null>(null)

  const [extracting, setExtracting] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)

  // ── Photo pick + upload + AI extract ────────────────────────────────────

  const handlePick = useCallback(async (source: 'library' | 'camera') => {
    if (uploading) return
    try {
      if (source === 'library') {
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync()
        if (perm.status !== 'granted') {
          Alert.alert(t('examForm_permNeeded'), t('examForm_allowPhoto'))
          return
        }
      } else {
        const perm = await ImagePicker.requestCameraPermissionsAsync()
        if (perm.status !== 'granted') {
          Alert.alert(t('examForm_permNeeded'), t('examForm_allowCamera'))
          return
        }
      }

      const result =
        source === 'library'
          ? await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ['images'],
              allowsMultipleSelection: true,
              quality: 0.9,
              selectionLimit: 5,
            })
          : await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.9 })

      if (result.canceled || result.assets.length === 0) return

      setUploading(true)
      const isFirstPhoto = photos.length === 0
      const uploaded: { storagePath: string; localUri: string }[] = []
      let firstBase64: { base64: string; mediaType: 'image/jpeg' } | null = null

      for (const asset of result.assets) {
        const up = await uploadExamPhoto(asset.uri)
        uploaded.push({ storagePath: up.storagePath, localUri: asset.uri })
        if (!firstBase64 && up.base64) firstBase64 = { base64: up.base64, mediaType: up.mediaType }
      }

      setPhotos((prev) => [...prev, ...uploaded])
      setUploading(false)

      // Only auto-extract when adding the very first photo(s), so re-adding
      // more pages later doesn't stomp user edits.
      if (isFirstPhoto && firstBase64) {
        setExtracting(true)
        try {
          const ex = await extractExamFromPhoto({
            imageBase64: firstBase64.base64,
            mediaType: firstBase64.mediaType,
          })
          if (ex) {
            setExtracted(ex)
            if (ex.title) setTitle((t) => t || ex.title!)
            if (ex.result) setResult((r) => r || ex.result!)
            if (ex.provider) setProvider((p) => p || ex.provider!)
            if (ex.examDate) setExamDate((d) => d === (date ?? toDateStr(new Date())) ? ex.examDate! : d)
            if (ex.notes) setNotes((n) => n || ex.notes!)
          }
        } catch {
          // Silent — user can fill in manually.
        } finally {
          setExtracting(false)
        }
      }
    } catch (e) {
      setUploading(false)
      Alert.alert(t('examForm_uploadFailed'), e instanceof Error ? e.message : t('common_unknownError'))
    }
  }, [photos.length, uploading, date])

  function removePhoto(index: number) {
    setPhotos((prev) => prev.filter((_, i) => i !== index))
  }

  // ── Save ────────────────────────────────────────────────────────────────

  async function handleSave() {
    if (!title.trim()) {
      Alert.alert(t('examForm_missingTitle'), t('examForm_missingTitleMsg'))
      return
    }
    setSaving(true)
    try {
      await createExam({
        behavior,
        childId: childId ?? null,
        title: title.trim(),
        result: result.trim() || null,
        notes: notes.trim() || null,
        provider: provider.trim() || null,
        examDate,
        photos: photos.map((p) => p.storagePath),
        extracted,
      })
      invalidate()
      onSaved()
    } catch (e) {
      Alert.alert(t('examForm_saveFailed'), e instanceof Error ? e.message : t('common_unknownError'))
    } finally {
      setSaving(false)
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────

  const flagged = extracted?.flagged ?? []
  const referenceRange = extracted?.referenceRange ?? null

  // Diffuse bare-underlined field (the v4 .field: transparent, hairline bottom
  // rule, sans text — no pill, no shadow).
  const diffuseInput = {
    backgroundColor: 'transparent',
    borderWidth: 0,
    borderBottomWidth: 1.5,
    borderRadius: 0,
    paddingHorizontal: 2,
    paddingVertical: 12,
    height: 52,
    fontSize: 17,
    fontFamily: diffuseFont.body,
  } as const

  return (
    <View style={styles.form}>
      {/* Under Diffuse the sheet title + the Scan/Upload tiles carry the header;
          the saturated sticker banner belongs to the current cream system only.
          Show a quiet mono status line when a photo is being read. */}
      {diffuse ? (
        extracting ? (
          <Text style={{ fontFamily: diffuseFont.mono, fontSize: 11, letterSpacing: 1.2, textTransform: 'uppercase', color: dt.colors.ink3, paddingBottom: 2 }}>
            {t('examForm_reading')}
          </Text>
        ) : null
      ) : (
        <LogFormSticker
          type="exam_result"
          label={extracting ? t('examForm_reading') : t('examForm_snapOrUpload')}
          tint={s.lilacSoft}
        />
      )}

      {/* Photo strip */}
      <View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.photoStrip}
        >
          {photos.map((p, i) => {
            // Prefer the local URI (instant) until the signed URL resolves.
            const displayUri = p.localUri || signedUrls[i] || undefined
            return (
              <View key={p.storagePath} style={[styles.photoWrap, { borderColor: diffuse ? dt.colors.line : colors.border }]}>
                {displayUri && <Image source={{ uri: displayUri }} style={styles.photoImg} />}
                <Pressable onPress={() => removePhoto(i)} style={styles.photoRemove}>
                  <X size={12} color="#fff" strokeWidth={2.5} />
                </Pressable>
              </View>
            )
          })}

          <Pressable
            onPress={() => handlePick('camera')}
            disabled={uploading}
            style={[
              styles.photoAddBtn,
              {
                backgroundColor: diffuse ? 'transparent' : paper,
                borderColor: diffuse ? dt.colors.line2 : inkBorder,
                opacity: uploading ? 0.5 : 1,
              },
            ]}
          >
            <Camera size={18} color={diffuse ? dt.colors.ink3 : inkText} strokeWidth={diffuse ? 1.6 : 2} />
            <Text style={[styles.photoAddLabel, { color: diffuse ? dt.colors.ink3 : inkText, fontFamily: diffuse ? diffuseFont.mono : font.bodySemiBold }]}>
              {t('examForm_scan')}
            </Text>
          </Pressable>

          <Pressable
            onPress={() => handlePick('library')}
            disabled={uploading}
            style={[
              styles.photoAddBtn,
              {
                backgroundColor: diffuse ? 'transparent' : paper,
                borderColor: diffuse ? dt.colors.line2 : inkBorder,
                opacity: uploading ? 0.5 : 1,
              },
            ]}
          >
            <ImagePlus size={18} color={diffuse ? dt.colors.ink3 : inkText} strokeWidth={diffuse ? 1.6 : 2} />
            <Text style={[styles.photoAddLabel, { color: diffuse ? dt.colors.ink3 : inkText, fontFamily: diffuse ? diffuseFont.mono : font.bodySemiBold }]}>
              {t('examForm_upload')}
            </Text>
          </Pressable>
        </ScrollView>

        {(uploading || extracting) && (
          <View style={styles.loadingRow}>
            <ActivityIndicator color={diffuse ? getDiffuseAccent(behavior, dt.isDark) : brand.primary} size="small" />
            <Text style={[styles.loadingText, { color: diffuse ? dt.colors.ink3 : colors.textSecondary, fontFamily: diffuse ? diffuseFont.mono : undefined }]}>
              {uploading ? t('examForm_uploading') : t('examForm_extracting')}
            </Text>
          </View>
        )}
      </View>

      {extracted && (
        diffuse ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 }}>
            <DiffuseBloomIcon color={getDiffuseAccent(behavior, dt.isDark)} size={24} intensity={0.4}><Sparkles size={13} color={dt.colors.ink3} strokeWidth={1.4} /></DiffuseBloomIcon>
            <Text style={{ fontFamily: diffuseFont.mono, fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase', color: dt.colors.ink3 }}>
              {t('examForm_aiPrefilled')}
            </Text>
          </View>
        ) : (
          <View style={[styles.aiBadge, { backgroundColor: brand.primary + '15', borderColor: brand.primary + '40' }]}>
            <Sparkles size={14} color={brand.primary} strokeWidth={2} />
            <Text style={[styles.aiBadgeText, { color: brand.primary, fontFamily: font.bodySemiBold }]}>
              {t('examForm_aiPrefilled')}
            </Text>
          </View>
        )
      )}

      <TextInput
        value={title}
        onChangeText={setTitle}
        placeholder={t('examForm_titlePlaceholder')}
        placeholderTextColor={placeholderColor}
        style={diffuse ? [diffuseInput, { color: inkText, borderBottomColor: inkBorder }] : [styles.input, { color: inkText, backgroundColor: paper, borderColor: inkBorder, borderRadius: radius.full }]}
      />
      <TextInput
        value={result}
        onChangeText={setResult}
        placeholder={t('examForm_resultPlaceholder')}
        placeholderTextColor={placeholderColor}
        style={diffuse ? [diffuseInput, { color: inkText, borderBottomColor: inkBorder }] : [styles.input, { color: inkText, backgroundColor: paper, borderColor: inkBorder, borderRadius: radius.full }]}
      />
      <TextInput
        value={provider}
        onChangeText={setProvider}
        placeholder={t('examForm_providerPlaceholder')}
        placeholderTextColor={placeholderColor}
        style={diffuse ? [diffuseInput, { color: inkText, borderBottomColor: inkBorder }] : [styles.input, { color: inkText, backgroundColor: paper, borderColor: inkBorder, borderRadius: radius.full }]}
      />
      <TextInput
        value={examDate}
        onChangeText={setExamDate}
        placeholder={t('examForm_datePlaceholder')}
        placeholderTextColor={placeholderColor}
        style={diffuse ? [diffuseInput, { color: inkText, borderBottomColor: inkBorder }] : [styles.input, { color: inkText, backgroundColor: paper, borderColor: inkBorder, borderRadius: radius.full }]}
      />
      <TextInput
        value={notes}
        onChangeText={setNotes}
        placeholder={t('examForm_notesPlaceholder')}
        placeholderTextColor={placeholderColor}
        multiline
        style={diffuse
          ? [diffuseInput, { color: inkText, borderBottomColor: inkBorder, height: 96, paddingVertical: 10, textAlignVertical: 'top' }]
          : [
              styles.input,
              styles.inputMultiline,
              { color: inkText, backgroundColor: paper, borderColor: inkBorder, borderRadius: 22 },
            ]}
      />

      {referenceRange && (
        diffuse ? (
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: dt.colors.line, paddingVertical: 12 }}>
            <Text style={{ fontFamily: diffuseFont.mono, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', color: dt.colors.ink3 }}>{t('examForm_referenceRange')}</Text>
            <Text style={{ fontFamily: diffuseFont.body, fontSize: 13, color: dt.colors.ink }}>{referenceRange}</Text>
          </View>
        ) : (
          <View style={[styles.metaRow, { backgroundColor: colors.surfaceGlass, borderColor: colors.border }]}>
            <Text style={[styles.metaLabel, { color: colors.textMuted }]}>{t('examForm_referenceRange')}</Text>
            <Text style={[styles.metaValue, { color: colors.text }]}>{referenceRange}</Text>
          </View>
        )
      )}

      {flagged.length > 0 && (
        <View style={[styles.flaggedBox, diffuse ? { backgroundColor: 'transparent', borderColor: dt.colors.error, borderRadius: 18 } : { backgroundColor: brand.error + '12', borderColor: brand.error + '30' }]}>
          <Text style={[styles.flaggedTitle, { color: diffuse ? dt.colors.error : brand.error, fontFamily: diffuse ? diffuseFont.mono : font.bodySemiBold }]}>
            {t('examForm_flaggedTitle')}
          </Text>
          {flagged.map((f, i) => (
            <Text key={i} style={[styles.flaggedItem, { color: diffuse ? dt.colors.ink : colors.text, fontFamily: diffuse ? diffuseFont.body : undefined }]}>{t('common_bullet')} {f}</Text>
          ))}
          <Text style={[styles.flaggedNote, { color: diffuse ? dt.colors.ink3 : colors.textMuted, fontFamily: diffuse ? diffuseFont.body : undefined }]}>
            {t('examForm_flaggedNote')}
          </Text>
        </View>
      )}

      {diffuse ? (
        <>
          <Pressable
            onPress={handleSave}
            disabled={saving || !title.trim() || uploading || extracting}
            style={({ pressed }) => {
              const isDisabled = saving || !title.trim() || uploading || extracting
              return [
                { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: dt.colors.line2, paddingTop: 18, marginTop: 4, opacity: (pressed && !isDisabled) ? 0.6 : 1 },
              ]
            }}
          >
            {saving ? (
              <ActivityIndicator color={dt.colors.ink} />
            ) : (
              <>
                <Text style={{ fontFamily: diffuseFont.monoBold, fontSize: 12, letterSpacing: 2, textTransform: 'uppercase', color: !title.trim() ? dt.colors.ink4 : dt.colors.ink }}>
                  {t('examForm_saveExam')}
                </Text>
                <Text style={{ fontFamily: diffuseFont.body, fontSize: 18, color: !title.trim() ? dt.colors.ink4 : dt.colors.ink3 }}>→</Text>
              </>
            )}
          </Pressable>

          <Pressable onPress={onSaved} hitSlop={8} style={{ paddingVertical: 14, alignItems: 'center' }}>
            <Text style={{ fontFamily: diffuseFont.mono, fontSize: 12, letterSpacing: 2, textTransform: 'uppercase', color: dt.colors.ink3 }}>{t('examForm_cancel')}</Text>
          </Pressable>
        </>
      ) : (
        <>
          <Pressable
            onPress={handleSave}
            disabled={saving || !title.trim() || uploading || extracting}
            style={({ pressed }) => {
              const isDisabled = saving || !title.trim() || uploading || extracting
              return [
                styles.saveBtn,
                {
                  backgroundColor: isDisabled ? paper : (isDark ? colors.text : INK),
                  borderColor: isDisabled ? inkBorder : (isDark ? colors.text : INK),
                  borderWidth: 1.5,
                  borderRadius: radius.full,
                },
                pressed && !isDisabled && { transform: [{ scale: 0.98 }], opacity: 0.9 },
              ]
            }}
          >
            {saving ? (
              <ActivityIndicator color={!title.trim() ? inkText : '#FFFEF8'} />
            ) : (
              <Text style={[styles.saveBtnText, { color: !title.trim() ? (isDark ? colors.textMuted : 'rgba(20,19,19,0.4)') : '#FFFEF8' }]}>
                {t('examForm_saveExam')}
              </Text>
            )}
          </Pressable>

          <Pressable onPress={onSaved} hitSlop={8}>
            <Text style={[styles.cancelText, { color: colors.textMuted }]}>{t('examForm_cancel')}</Text>
          </Pressable>
        </>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  form: { gap: 14, paddingBottom: 12 },
  photoStrip: { gap: 10, paddingVertical: 4 },
  photoWrap: {
    width: 96, height: 96, borderRadius: 14, borderWidth: 1, overflow: 'hidden',
    position: 'relative',
  },
  photoImg: { width: '100%', height: '100%' },
  photoRemove: {
    position: 'absolute', top: 4, right: 4,
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center', justifyContent: 'center',
  },
  photoAddBtn: {
    width: 96, height: 96, borderRadius: 18, borderWidth: 1.5, borderStyle: 'dashed',
    alignItems: 'center', justifyContent: 'center', gap: 6,
  },
  photoAddLabel: { fontSize: 12 },
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 8 },
  loadingText: { fontSize: 12 },
  aiBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12, borderWidth: 1,
  },
  aiBadgeText: { fontSize: 12 },
  input: {
    borderWidth: 1.5, paddingHorizontal: 20, height: 56,
    fontSize: 15, fontFamily: font.bodyMedium, fontWeight: '500',
    shadowColor: INK, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 3, elevation: 1,
  },
  inputMultiline: { height: 96, paddingVertical: 14, textAlignVertical: 'top' },
  metaRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12, borderWidth: 1,
  },
  metaLabel: { fontSize: 12, fontWeight: '600' },
  metaValue: { fontSize: 13, fontWeight: '600' },
  flaggedBox: { padding: 12, borderRadius: 14, borderWidth: 1, gap: 4 },
  flaggedTitle: { fontSize: 13, marginBottom: 4 },
  flaggedItem: { fontSize: 13, lineHeight: 18 },
  flaggedNote: { fontSize: 11, marginTop: 6, fontStyle: 'italic' },
  saveBtn: {
    height: 56, alignItems: 'center', justifyContent: 'center',
    shadowColor: INK, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 2,
  },
  saveBtnText: { fontSize: 16, fontFamily: font.bodySemiBold, fontWeight: '700', letterSpacing: 0.2 },
  cancelText: { fontSize: 13, textAlign: 'center', paddingVertical: 6 },
})
