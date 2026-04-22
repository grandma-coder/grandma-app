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
import { useTheme } from '../../constants/theme'
import { supabase } from '../../lib/supabase'
import { estimateFromImage, type AiFoodItem } from '../../lib/foodAi'
import { LogNutrition } from '../stickers/RewardStickers'
import { useSavedToast } from '../ui/SavedToast'

interface Props {
  userId?: string
  /** Log date (YYYY-MM-DD). Defaults to today. */
  date?: string
  onSaved: () => void
}

async function uploadPlatePhoto(uri: string, userId: string): Promise<string | null> {
  try {
    const path = `pregnancy-meals/${userId}/${Date.now()}_${Math.random().toString(36).slice(2, 6)}.jpg`
    const formData = new FormData()
    formData.append('', { uri, name: path.split('/').pop(), type: 'image/jpeg' } as any)
    const { error } = await supabase.storage
      .from('garage-photos')
      .upload(path, formData, { contentType: 'multipart/form-data', upsert: true })
    if (error) return null
    const { data } = supabase.storage.from('garage-photos').getPublicUrl(path)
    return data.publicUrl
  } catch {
    return null
  }
}

export function PregnancyMealForm({ userId: userIdProp, date, onSaved }: Props) {
  const { colors } = useTheme()
  const toast = useSavedToast()
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
      const logDate = date ?? new Date().toISOString().split('T')[0]
      const payload = {
        photoUrl: uploaded,
        foods: foods.map((f) => ({ name: f.name, cals: f.cals, category: f.category })),
        totalCals,
        loggedAt: new Date().toISOString(),
      }
      await supabase.from('pregnancy_logs').insert({
        user_id: uid,
        log_date: logDate,
        log_type: 'nutrition',
        value: String(totalCals),
        notes: JSON.stringify(payload),
      })
      onSaved()
    } catch (e: any) {
      toast.show({ title: 'Could not save', message: e?.message ?? 'Please try again in a moment.', autoDismiss: 0, accent: '#EE7B6D' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <ScrollView style={{ maxHeight: 560 }} showsVerticalScrollIndicator={false}>
      <View style={styles.form}>
        <View style={styles.header}>
          <LogNutrition size={32} />
          <Text style={[styles.title, { color: colors.text }]}>Log Meal</Text>
        </View>

        {photoUri ? (
          <View style={styles.photoBox}>
            <Image source={{ uri: photoUri }} style={styles.photo} />
            <Pressable
              onPress={() => { setPhotoUri(null); setFoods([]) }}
              style={styles.photoClear}
              hitSlop={6}
            >
              <X size={14} color="#FFFFFF" strokeWidth={3} />
            </Pressable>
            {scanning && (
              <View style={styles.scanningOverlay}>
                <ActivityIndicator color="#FFFFFF" />
                <Text style={styles.scanningText}>Reading the plate…</Text>
              </View>
            )}
          </View>
        ) : (
          <View style={styles.pickRow}>
            <Pressable
              onPress={() => pick('camera')}
              style={[styles.pickBtn, { backgroundColor: colors.primary }]}
            >
              <Camera size={18} color={colors.textInverse} strokeWidth={2} />
              <Text style={[styles.pickBtnText, { color: colors.textInverse }]}>Take photo</Text>
            </Pressable>
            <Pressable
              onPress={() => pick('library')}
              style={[styles.pickBtn, { backgroundColor: colors.surfaceGlass, borderColor: colors.border, borderWidth: 1 }]}
            >
              <ImagePlus size={18} color={colors.text} strokeWidth={2} />
              <Text style={[styles.pickBtnText, { color: colors.text }]}>Gallery</Text>
            </Pressable>
          </View>
        )}

        {foods.length > 0 && (
          <View style={[styles.summaryBox, { backgroundColor: colors.surfaceGlass, borderColor: colors.border }]}>
            <View style={styles.summaryHeader}>
              <ScanLine size={14} color={colors.primary} strokeWidth={2} />
              <Text style={[styles.summaryTotal, { color: colors.primary }]}>
                ~{totalCals} kcal
              </Text>
            </View>
            {foods.map((f, i) => (
              <View key={`${f.name}-${i}`} style={[styles.foodRow, { borderBottomColor: colors.borderLight }]}>
                <Text style={[styles.foodName, { color: colors.text }]} numberOfLines={1}>
                  {f.name.charAt(0).toUpperCase() + f.name.slice(1)}
                </Text>
                <Text style={[styles.foodCals, { color: colors.textMuted }]}>{f.cals} kcal</Text>
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
            <Text style={[styles.scanAgainText, { color: colors.text }]}>Scan again</Text>
          </Pressable>
        )}

        <Pressable
          onPress={save}
          disabled={saving || foods.length === 0}
          style={[styles.saveBtn, {
            backgroundColor: colors.primary,
            opacity: foods.length === 0 || saving ? 0.6 : 1,
          }]}
        >
          {saving
            ? <ActivityIndicator color={colors.textInverse} />
            : <Text style={[styles.saveText, { color: colors.textInverse }]}>Save meal</Text>
          }
        </Pressable>
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  form: { padding: 24, gap: 16 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  title: { fontSize: 20, fontFamily: 'Fraunces_600SemiBold', textAlign: 'center' },
  pickRow: { flexDirection: 'row', gap: 10 },
  pickBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16, borderRadius: 16 },
  pickBtnText: { fontSize: 15, fontFamily: 'DMSans_600SemiBold' },
  photoBox: { position: 'relative', borderRadius: 20, overflow: 'hidden' },
  photo: { width: '100%', height: 200, resizeMode: 'cover' },
  photoClear: {
    position: 'absolute', top: 10, right: 10, width: 26, height: 26, borderRadius: 13,
    backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center',
  },
  scanningOverlay: {
    position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  scanningText: { color: '#FFFFFF', fontSize: 13, fontFamily: 'DMSans_500Medium' },
  summaryBox: { borderRadius: 16, borderWidth: 1, paddingHorizontal: 16, paddingVertical: 12, gap: 4 },
  summaryHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  summaryTotal: { fontSize: 16, fontFamily: 'Fraunces_600SemiBold' },
  foodRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth },
  foodName: { fontSize: 14, fontFamily: 'DMSans_500Medium', flex: 1 },
  foodCals: { fontSize: 12, fontFamily: 'DMSans_400Regular' },
  scanAgainBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, borderRadius: 12, borderWidth: 1 },
  scanAgainText: { fontSize: 14, fontFamily: 'DMSans_500Medium' },
  saveBtn: { borderRadius: 999, paddingVertical: 16, alignItems: 'center' },
  saveText: { fontSize: 16, fontFamily: 'DMSans_600SemiBold' },
})
