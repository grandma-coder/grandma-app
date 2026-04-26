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

import { useTheme, brand, stickers as stickersLight, stickersDark } from '../../constants/theme'
import { LogFormSticker } from '../calendar/LogFormSticker'
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
  const s = isDark ? stickersDark : stickersLight
  const inkBorder = isDark ? colors.border : INK
  const paper = isDark ? colors.surface : '#FFFEF8'
  const inkText = isDark ? colors.text : INK
  const invalidate = useInvalidateExams()

  const [title, setTitle] = useState('')
  const [result, setResult] = useState('')
  const [provider, setProvider] = useState('')
  const [notes, setNotes] = useState('')
  const [examDate, setExamDate] = useState(date ?? new Date().toISOString().slice(0, 10))
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
          Alert.alert('Permission needed', 'Allow photo access to attach exam images.')
          return
        }
      } else {
        const perm = await ImagePicker.requestCameraPermissionsAsync()
        if (perm.status !== 'granted') {
          Alert.alert('Permission needed', 'Allow camera access to scan an exam.')
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
            if (ex.examDate) setExamDate((d) => d === (date ?? new Date().toISOString().slice(0, 10)) ? ex.examDate! : d)
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
      Alert.alert('Upload failed', e instanceof Error ? e.message : 'Unknown error')
    }
  }, [photos.length, uploading, date])

  function removePhoto(index: number) {
    setPhotos((prev) => prev.filter((_, i) => i !== index))
  }

  // ── Save ────────────────────────────────────────────────────────────────

  async function handleSave() {
    if (!title.trim()) {
      Alert.alert('Missing title', 'Add a test name before saving.')
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
      Alert.alert('Save failed', e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setSaving(false)
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────

  const flagged = extracted?.flagged ?? []
  const referenceRange = extracted?.referenceRange ?? null

  return (
    <View style={styles.form}>
      <LogFormSticker
        type="exam_result"
        label={extracting ? 'Reading the paperwork…' : 'Snap or upload a test result'}
        tint={s.lilacSoft}
      />

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
              <View key={p.storagePath} style={[styles.photoWrap, { borderColor: colors.border }]}>
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
                backgroundColor: paper,
                borderColor: inkBorder,
                opacity: uploading ? 0.5 : 1,
              },
            ]}
          >
            <Camera size={18} color={inkText} strokeWidth={2} />
            <Text style={[styles.photoAddLabel, { color: inkText, fontFamily: font.bodySemiBold }]}>
              Scan
            </Text>
          </Pressable>

          <Pressable
            onPress={() => handlePick('library')}
            disabled={uploading}
            style={[
              styles.photoAddBtn,
              {
                backgroundColor: paper,
                borderColor: inkBorder,
                opacity: uploading ? 0.5 : 1,
              },
            ]}
          >
            <ImagePlus size={18} color={inkText} strokeWidth={2} />
            <Text style={[styles.photoAddLabel, { color: inkText, fontFamily: font.bodySemiBold }]}>
              Upload
            </Text>
          </Pressable>
        </ScrollView>

        {(uploading || extracting) && (
          <View style={styles.loadingRow}>
            <ActivityIndicator color={brand.primary} size="small" />
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
              {uploading ? 'Uploading photos…' : 'Extracting results with AI…'}
            </Text>
          </View>
        )}
      </View>

      {extracted && (
        <View style={[styles.aiBadge, { backgroundColor: brand.primary + '15', borderColor: brand.primary + '40' }]}>
          <Sparkles size={14} color={brand.primary} strokeWidth={2} />
          <Text style={[styles.aiBadgeText, { color: brand.primary, fontFamily: font.bodySemiBold }]}>
            AI prefilled from your photo — review below
          </Text>
        </View>
      )}

      <TextInput
        value={title}
        onChangeText={setTitle}
        placeholder="Test name (e.g. Blood work, Glucose)"
        placeholderTextColor={colors.textMuted}
        style={[styles.input, { color: inkText, backgroundColor: paper, borderColor: inkBorder, borderRadius: radius.full }]}
      />
      <TextInput
        value={result}
        onChangeText={setResult}
        placeholder="Result (e.g. Normal, 120/80)"
        placeholderTextColor={colors.textMuted}
        style={[styles.input, { color: inkText, backgroundColor: paper, borderColor: inkBorder, borderRadius: radius.full }]}
      />
      <TextInput
        value={provider}
        onChangeText={setProvider}
        placeholder="Doctor / clinic (optional)"
        placeholderTextColor={colors.textMuted}
        style={[styles.input, { color: inkText, backgroundColor: paper, borderColor: inkBorder, borderRadius: radius.full }]}
      />
      <TextInput
        value={examDate}
        onChangeText={setExamDate}
        placeholder="YYYY-MM-DD"
        placeholderTextColor={colors.textMuted}
        style={[styles.input, { color: inkText, backgroundColor: paper, borderColor: inkBorder, borderRadius: radius.full }]}
      />
      <TextInput
        value={notes}
        onChangeText={setNotes}
        placeholder="Notes (optional)"
        placeholderTextColor={colors.textMuted}
        multiline
        style={[
          styles.input,
          styles.inputMultiline,
          { color: inkText, backgroundColor: paper, borderColor: inkBorder, borderRadius: 22 },
        ]}
      />

      {referenceRange && (
        <View style={[styles.metaRow, { backgroundColor: colors.surfaceGlass, borderColor: colors.border }]}>
          <Text style={[styles.metaLabel, { color: colors.textMuted }]}>Reference range</Text>
          <Text style={[styles.metaValue, { color: colors.text }]}>{referenceRange}</Text>
        </View>
      )}

      {flagged.length > 0 && (
        <View style={[styles.flaggedBox, { backgroundColor: brand.error + '12', borderColor: brand.error + '30' }]}>
          <Text style={[styles.flaggedTitle, { color: brand.error, fontFamily: font.bodySemiBold }]}>
            Flagged findings
          </Text>
          {flagged.map((f, i) => (
            <Text key={i} style={[styles.flaggedItem, { color: colors.text }]}>• {f}</Text>
          ))}
          <Text style={[styles.flaggedNote, { color: colors.textMuted }]}>
            Discuss these with your doctor — this is not a diagnosis.
          </Text>
        </View>
      )}

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
            Save exam
          </Text>
        )}
      </Pressable>

      <Pressable onPress={onSaved} hitSlop={8}>
        <Text style={[styles.cancelText, { color: colors.textMuted }]}>Cancel</Text>
      </Pressable>
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
    fontSize: 15, fontFamily: 'DMSans_500Medium', fontWeight: '500',
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
  saveBtnText: { fontSize: 16, fontFamily: 'DMSans_600SemiBold', fontWeight: '700', letterSpacing: 0.2 },
  cancelText: { fontSize: 13, textAlign: 'center', paddingVertical: 6 },
})
