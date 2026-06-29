/**
 * PregnancyMealForm — scan a plate, get kcal, log a meal.
 *
 * Each save inserts one pregnancy_logs row with log_type='nutrition'.
 * - value: total kcal for this meal (as string integer)
 * - notes: JSON { photoUrl, foods: [{name, cals, category}], totalCals }
 *
 * The daily "Meals" routine counts scans (one scan = one meal).
 * Used by components/home/PregnancyHome.tsx and VitalsCarousel.
 */

import React, { useState } from 'react'
import {
  View, Text, Pressable, StyleSheet, Image, ActivityIndicator, ScrollView,
} from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import * as ImageManipulator from 'expo-image-manipulator'
import { Camera, ImagePlus, ScanLine, X } from 'lucide-react-native'
import { useTheme, brand, stickers as stickerPalette, font } from '../../constants/theme'
import { supabase } from '../../lib/supabase'
import { invalidatePregnancyLogQueries, queryClient } from '../../lib/queryClient'
import { toDateStr } from '../../lib/cycleLogic'
import { estimateFromImage, type AiFoodItem } from '../../lib/foodAi'
import { LogFormSticker } from './LogFormSticker'
import { useSavedToast } from '../ui/SavedToast'
import { useTranslation } from '../../lib/i18n'

interface Props {
  userId?: string
  /** Log date (YYYY-MM-DD). Defaults to today. */
  date?: string
  onSaved: () => void
}

async function uploadPlatePhoto(uri: string, userId: string): Promise<string | null> {
  try {
    // Meal photos go to the PRIVATE pregnancy-nutrition bucket keyed by
    // {userId}/ (owner-only). Store the storage PATH; signed at read time.
    const path = `${userId}/${Date.now()}_${Math.random().toString(36).slice(2, 6)}.jpg`
    const formData = new FormData()
    formData.append('', { uri, name: path.split('/').pop(), type: 'image/jpeg' } as any)
    const { error } = await supabase.storage
      .from('pregnancy-nutrition')
      .upload(path, formData, { contentType: 'multipart/form-data', upsert: true })
    if (error) return null
    return path
  } catch {
    return null
  }
}

export function PregnancyMealForm({ userId: userIdProp, date, onSaved }: Props) {
  const { colors, isDark } = useTheme()
  const toast = useSavedToast()
  const { t } = useTranslation()
  const [photoUri, setPhotoUri] = useState<string | null>(null)
  const [scanning, setScanning] = useState(false)
  const [foods, setFoods] = useState<AiFoodItem[]>([])
  const [saving, setSaving] = useState(false)

  const totalCals = foods.reduce((s, f) => s + (f.cals || 0), 0)

  async function pick(source: 'camera' | 'library') {
    try {
      if (source === 'camera') {
        const perm = await ImagePicker.requestCameraPermissionsAsync()
        if (!perm.granted) {
          toast.show({ title: 'Permission needed', message: 'Camera access is required to scan your plate.', autoDismiss: 0, accent: '#EE7B6D' })
          return
        }
      }
      const launcher = source === 'camera'
        ? ImagePicker.launchCameraAsync
        : ImagePicker.launchImageLibraryAsync
      const res = await launcher({ mediaTypes: ['images'], quality: 0.8, base64: false })
      if (res.canceled || !res.assets[0]) return
      const uri = res.assets[0].uri
      setPhotoUri(uri)
      setFoods([])
      await scan(uri)
    } catch (e: any) {
      toast.show({ title: 'Something went wrong', message: e?.message ?? 'Could not open camera or gallery.', autoDismiss: 0, accent: '#EE7B6D' })
    }
  }

  async function scan(uri: string) {
    setScanning(true)
    try {
      const manipulated = await ImageManipulator.manipulateAsync(
        uri,
        [{ resize: { width: 1024 } }],
        { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG, base64: true },
      )
      if (!manipulated.base64) throw new Error('Could not encode photo')
      const res = await estimateFromImage({
        imageBase64: manipulated.base64,
        mediaType: 'image/jpeg',
        audience: 'pregnant',
      })
      if (res.foods.length === 0) {
        toast.show({
          title: 'No food detected',
          message: res.notes ?? 'Try another angle or a closer shot.',
          autoDismiss: 0,
          accent: '#F5B896',
        })
        return
      }
      setFoods(res.foods)
      if (res.notes) {
        toast.show({
          title: 'Grandma noticed',
          message: res.notes,
          autoDismiss: 0,
          accent: '#BDD48C',
        })
      }
    } catch (e: any) {
      toast.show({
        title: 'Scan failed',
        message: e?.message ?? 'Please try again in a moment.',
        autoDismiss: 0,
        accent: '#EE7B6D',
      })
    } finally {
      setScanning(false)
    }
  }

  async function save() {
    if (foods.length === 0) return
    setSaving(true)
    try {
      let uid = userIdProp
      if (!uid) {
        const { data: { session } } = await supabase.auth.getSession()
        uid = session?.user.id
      }
      if (!uid) throw new Error('Not signed in')
      const uploaded = photoUri ? await uploadPlatePhoto(photoUri, uid) : null
      const logDate = date ?? toDateStr(new Date())
      const payload = {
        photoUrl: uploaded,
        foods: foods.map((f) => ({ name: f.name, cals: f.cals, category: f.category })),
        totalCals,
        loggedAt: new Date().toISOString(),
      }
      // Optimistic patch — bump meal count + cals so the home dashboard
      // reflects the new meal before the insert returns.
      const todayKey = ['pregnancy-today-logs', uid]
      const previous = queryClient.getQueryData<Record<string, { value: string | null; notes: string | null; created_at: string }>>(todayKey)
      const isToday = logDate === toDateStr(new Date())
      if (isToday) {
        const prevNutrition = previous?.['nutrition']
        let prevCount = 0
        let prevCals = 0
        let prevEntries: any[] = []
        if (prevNutrition?.notes) {
          try {
            const parsed = JSON.parse(prevNutrition.notes)
            prevCals = parsed.totalCals ?? 0
            prevEntries = parsed.entries ?? []
            prevCount = parsed.entries?.length ?? (prevNutrition.value ? parseInt(prevNutrition.value, 10) : 0)
          } catch {
            prevCount = prevNutrition.value ? parseInt(prevNutrition.value, 10) : 0
          }
        }
        const optimisticEntries = [
          ...prevEntries,
          { value: String(totalCals), notes: JSON.stringify(payload), created_at: new Date().toISOString() },
        ]
        queryClient.setQueryData(todayKey, {
          ...(previous ?? {}),
          nutrition: {
            value: String(prevCount + 1),
            notes: JSON.stringify({ totalCals: prevCals + totalCals, entries: optimisticEntries }),
            created_at: new Date().toISOString(),
          },
        })
      }
      onSaved()

      try {
        const { error } = await supabase.from('pregnancy_logs').insert({
          user_id: uid,
          log_date: logDate,
          log_type: 'nutrition',
          value: String(totalCals),
          notes: JSON.stringify(payload),
        })
        if (error) throw error
      } catch (e) {
        if (isToday) queryClient.setQueryData(todayKey, previous)
        throw e
      }
      void invalidatePregnancyLogQueries()
    } catch (e: any) {
      toast.show({ title: 'Could not save', message: e?.message ?? 'Please try again in a moment.', autoDismiss: 0, accent: '#EE7B6D' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <ScrollView style={{ maxHeight: 560 }} showsVerticalScrollIndicator={false}>
      <View style={styles.form}>
        <LogFormSticker type="nutrition" label="Log Meal" tint={stickerPalette.greenSoft} />

        {photoUri ? (
          <View style={styles.photoBox}>
            <Image source={{ uri: photoUri }} style={styles.photo} />
            <Pressable
              onPress={() => { setPhotoUri(null); setFoods([]) }}
              style={styles.photoClear}
              hitSlop={6}
            >
              <X size={14} color="#FFFEF8" strokeWidth={3} />
            </Pressable>
            {scanning && (
              <View style={styles.scanningOverlay}>
                <ActivityIndicator color="#FFFEF8" />
                <Text style={styles.scanningText}>{t('kids_logForm_readingPlate')}</Text>
              </View>
            )}
          </View>
        ) : (
          <View style={styles.pickRow}>
            <Pressable
              onPress={() => pick('camera')}
              style={[styles.pickBtn, { backgroundColor: brand.pregnancy }]}
            >
              <Camera size={18} color={colors.textInverse} strokeWidth={2} />
              <Text style={[styles.pickBtnText, { color: colors.textInverse }]}>{t('kids_logForm_alertTakePhoto')}</Text>
            </Pressable>
            <Pressable
              onPress={() => pick('library')}
              style={[styles.pickBtn, { backgroundColor: colors.surfaceGlass, borderColor: colors.border, borderWidth: 1 }]}
            >
              <ImagePlus size={18} color={colors.text} strokeWidth={2} />
              <Text style={[styles.pickBtnText, { color: colors.text }]}>{t('kids_foodDash_gallery')}</Text>
            </Pressable>
          </View>
        )}

        {foods.length > 0 && (
          <View style={[styles.summaryBox, {
            backgroundColor: isDark ? colors.surfaceRaised : '#F7F0DF',
            borderColor: colors.border,
          }]}>
            <View style={styles.summaryHeader}>
              <View style={[styles.totalChip, { backgroundColor: stickerPalette.yellowSoft }]}>
                <ScanLine size={12} color="#141313" strokeWidth={2.4} />
                <Text style={styles.totalChipText}>{t('pregMeal_approx_kcal', { count: totalCals })}</Text>
              </View>
            </View>
            {foods.map((f, i) => (
              <View key={`${f.name}-${i}`} style={[styles.foodRow, { borderBottomColor: colors.borderLight }]}>
                <Text style={[styles.foodName, { color: colors.textSecondary }]} numberOfLines={1}>
                  {f.name.charAt(0).toUpperCase() + f.name.slice(1)}
                </Text>
                <Text style={[styles.foodCals, { color: colors.textMuted }]}>{t('pregMeal_kcal_count', { count: f.cals })}</Text>
              </View>
            ))}
          </View>
        )}

        {photoUri && !scanning && foods.length === 0 && (
          <Pressable
            onPress={() => scan(photoUri)}
            style={[styles.scanAgainBtn, { borderColor: colors.border }]}
          >
            <ScanLine size={16} color={colors.text} strokeWidth={2} />
            <Text style={[styles.scanAgainText, { color: colors.text }]}>{t('pregMeal_scan_again')}</Text>
          </Pressable>
        )}

        <SaveMealButton
          onPress={save}
          saving={saving}
          disabled={foods.length === 0}
          isDark={isDark}
          colors={colors}
        />
      </View>
    </ScrollView>
  )
}

function SaveMealButton({
  onPress, saving, disabled, isDark, colors,
}: {
  onPress: () => void
  saving: boolean
  disabled: boolean
  isDark: boolean
  colors: ReturnType<typeof useTheme>['colors']
}) {
  const { t } = useTranslation()
  const ST_INK = '#141313'
  const ST_LAVENDER = isDark ? colors.primary : brand.pregnancy
  const ST_CREAM = isDark ? colors.surfaceRaised : '#F7F0DF'
  return (
    <Pressable
      onPress={onPress}
      disabled={saving || disabled}
      style={({ pressed }) => [
        styles.saveBtn,
        {
          backgroundColor: disabled ? ST_CREAM : ST_LAVENDER,
          borderColor: isDark && disabled ? colors.border : ST_INK,
          borderWidth: 2,
          shadowColor: ST_INK,
          shadowOffset: { width: 0, height: pressed ? 2 : 4 },
          shadowOpacity: 1,
          shadowRadius: 0,
          elevation: 5,
          transform: [{ translateY: pressed && !disabled ? 2 : 0 }],
          opacity: disabled ? 0.55 : 1,
        },
      ]}
    >
      {saving ? (
        <ActivityIndicator color={disabled ? colors.textMuted : '#FFFEF8'} />
      ) : (
        <Text
          style={[
            styles.saveText,
            { color: disabled ? (isDark ? colors.textMuted : '#6E6763') : '#FFFEF8' },
          ]}
        >
          {t('pregMeal_save_meal')}
        </Text>
      )}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  form: { padding: 24, gap: 16 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  title: { fontSize: 20, fontFamily: font.display, textAlign: 'center' },
  pickRow: { flexDirection: 'row', gap: 10 },
  pickBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16, borderRadius: 16 },
  pickBtnText: { fontSize: 15, fontFamily: font.bodySemiBold },
  photoBox: { position: 'relative', borderRadius: 20, overflow: 'hidden' },
  photo: { width: '100%', height: 200, resizeMode: 'cover' },
  photoClear: {
    position: 'absolute', top: 10, right: 10, width: 26, height: 26, borderRadius: 13,
    backgroundColor: 'rgba(20,19,19,0.55)', alignItems: 'center', justifyContent: 'center',
  },
  scanningOverlay: {
    position: 'absolute', inset: 0, backgroundColor: 'rgba(20,19,19,0.45)',
    alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  scanningText: { color: '#FFFEF8', fontSize: 13, fontFamily: font.bodyMedium },
  summaryBox: {
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 4,
    shadowColor: '#141313',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 1,
  },
  summaryHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  totalChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
  },
  totalChipText: {
    fontSize: 14,
    fontFamily: font.display,
    color: '#141313',
    letterSpacing: -0.2,
  },
  foodRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 9, borderBottomWidth: StyleSheet.hairlineWidth },
  foodName: { fontSize: 14, fontFamily: font.bodyMedium, flex: 1 },
  foodCals: { fontSize: 13, fontFamily: font.bodyMedium, fontVariant: ['tabular-nums'] },
  scanAgainBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, borderRadius: 12, borderWidth: 1 },
  scanAgainText: { fontSize: 14, fontFamily: font.bodyMedium },
  saveBtn: { height: 56, borderRadius: 999, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  saveText: { fontSize: 15, fontFamily: font.bodyBold, letterSpacing: 1, textTransform: 'uppercase' },
})
