/**
 * Kids Log Forms — 5 bottom sheet forms for child activity tracking.
 *
 * Forms: Feeding/Food (complex), Sleep, Health Event, Mood, Memory
 * Persist to Supabase child_logs table.
 */

import { useState } from 'react'
import {
  View,
  Text,
  TextInput,
  Pressable,
  Image,
  Alert,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import {
  Utensils,
  Moon,
  Heart,
  Smile,
  Frown,
  Meh,
  Laugh,
  Zap,
  Camera,
  Plus,
  Check,
  Baby,
  AlertTriangle,
} from 'lucide-react-native'
import { useTheme, brand } from '../../constants/theme'
import { useChildStore } from '../../store/useChildStore'
import { supabase } from '../../lib/supabase'
import type { ChildWithRole } from '../../types'

// ─── Shared save helper ────────────────────────────────────────────────────

async function saveChildLog(
  childId: string,
  type: string,
  value?: string,
  notes?: string,
  photos?: string[]
) {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('Not authenticated')

  // Find the child owner (user_id) — for RLS
  const { data: child } = await supabase
    .from('children')
    .select('user_id')
    .eq('id', childId)
    .single()

  const { error } = await supabase.from('child_logs').insert({
    child_id: childId,
    user_id: child?.user_id ?? session.user.id,
    date: new Date().toISOString().split('T')[0],
    type,
    value: value ?? null,
    notes: notes ?? null,
    photos: photos ?? [],
    logged_by: session.user.id,
  })
  if (error) throw error
}

// ─── Child Selector (shared) ───────────────────────────────────────────────

function ChildSelector({
  selected,
  onSelect,
}: {
  selected: string | null
  onSelect: (id: string) => void
}) {
  const { colors, radius } = useTheme()
  const children = useChildStore((s) => s.children)

  if (children.length <= 1) return null

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.childRow}>
      {children.map((c) => {
        const active = selected === c.id
        return (
          <Pressable
            key={c.id}
            onPress={() => onSelect(c.id)}
            style={[
              styles.childChip,
              {
                backgroundColor: active ? colors.primaryTint : colors.surface,
                borderColor: active ? colors.primary : colors.border,
                borderRadius: radius.full,
              },
            ]}
          >
            <Text style={[styles.childChipText, { color: active ? colors.primary : colors.text }]}>
              {c.name}
            </Text>
          </Pressable>
        )
      })}
    </ScrollView>
  )
}

// ─── 1. FEEDING / FOOD LOG FORM ────────────────────────────────────────────

type FeedingType = 'breast' | 'bottle' | 'solids'
type MealMoment = 'breakfast' | 'morning_snack' | 'lunch' | 'afternoon_snack' | 'dinner' | 'night_snack'
type EatQuality = 'ate_well' | 'ate_little' | 'did_not_eat'

const MEAL_MOMENTS: { id: MealMoment; label: string }[] = [
  { id: 'breakfast', label: 'Breakfast' },
  { id: 'morning_snack', label: 'AM Snack' },
  { id: 'lunch', label: 'Lunch' },
  { id: 'afternoon_snack', label: 'PM Snack' },
  { id: 'dinner', label: 'Dinner' },
  { id: 'night_snack', label: 'Night' },
]

const EAT_QUALITIES: { id: EatQuality; label: string; icon: typeof Smile; color: string }[] = [
  { id: 'ate_well', label: 'Ate well', icon: Laugh, color: brand.success },
  { id: 'ate_little', label: 'Ate a little', icon: Meh, color: brand.accent },
  { id: 'did_not_eat', label: 'Did not eat', icon: Frown, color: brand.error },
]

export function FeedingForm({ onSaved }: { onSaved: () => void }) {
  const { colors, radius } = useTheme()
  const children = useChildStore((s) => s.children)
  const activeChild = useChildStore((s) => s.activeChild)

  const [childId, setChildId] = useState(activeChild?.id ?? children[0]?.id ?? '')
  const [feedType, setFeedType] = useState<FeedingType>('solids')
  const [meal, setMeal] = useState<MealMoment | null>(null)
  const [photos, setPhotos] = useState<string[]>([])
  const [description, setDescription] = useState('')
  const [quality, setQuality] = useState<EatQuality | null>(null)
  const [isNewFood, setIsNewFood] = useState(false)
  const [hasReaction, setHasReaction] = useState(false)
  const [saving, setSaving] = useState(false)

  // Breast/bottle fields
  const [duration, setDuration] = useState('')
  const [amount, setAmount] = useState('')

  async function pickPhoto() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      quality: 0.7,
      selectionLimit: 4,
    })
    if (!result.canceled) {
      setPhotos((prev) => [...prev, ...result.assets.map((a) => a.uri)].slice(0, 4))
    }
  }

  async function takePhoto() {
    const perm = await ImagePicker.requestCameraPermissionsAsync()
    if (!perm.granted) return Alert.alert('Permission needed', 'Camera access is required')
    const result = await ImagePicker.launchCameraAsync({ quality: 0.7 })
    if (!result.canceled && result.assets[0]) {
      setPhotos((prev) => [...prev, result.assets[0].uri].slice(0, 4))
    }
  }

  async function save() {
    if (!childId) return
    setSaving(true)
    try {
      if (feedType === 'solids') {
        // TODO: upload photos to Supabase Storage and get URLs
        const value = JSON.stringify({
          feedType: 'solids',
          meal,
          quality,
          isNewFood,
          hasReaction,
        })
        await saveChildLog(childId, 'food', value, description || undefined, photos)
      } else {
        const value = JSON.stringify({
          feedType,
          duration: duration || undefined,
          amount: amount || undefined,
        })
        await saveChildLog(childId, 'feeding', value, undefined)
      }
      onSaved()
    } catch (e: any) {
      Alert.alert('Error', e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <ScrollView style={{ maxHeight: 500 }} showsVerticalScrollIndicator={false}>
      <View style={styles.form}>
        <ChildSelector selected={childId} onSelect={setChildId} />

        {/* Feed type toggle */}
        <View style={[styles.toggleRow, { backgroundColor: colors.surfaceRaised, borderRadius: radius.lg }]}>
          {(['breast', 'bottle', 'solids'] as FeedingType[]).map((t) => (
            <Pressable
              key={t}
              onPress={() => setFeedType(t)}
              style={[
                styles.toggleBtn,
                {
                  backgroundColor: feedType === t ? colors.primary : 'transparent',
                  borderRadius: radius.md,
                },
              ]}
            >
              <Text
                style={[styles.toggleText, { color: feedType === t ? '#FFFFFF' : colors.textSecondary }]}
              >
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </Text>
            </Pressable>
          ))}
        </View>

        {feedType === 'solids' ? (
          <>
            {/* Meal moment */}
            <View style={styles.chipGrid}>
              {MEAL_MOMENTS.map((m) => {
                const active = meal === m.id
                return (
                  <Pressable
                    key={m.id}
                    onPress={() => setMeal(m.id)}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: active ? colors.primaryTint : colors.surface,
                        borderColor: active ? colors.primary : colors.border,
                        borderRadius: radius.full,
                      },
                    ]}
                  >
                    <Text style={[styles.chipText, { color: active ? colors.primary : colors.text }]}>
                      {m.label}
                    </Text>
                  </Pressable>
                )
              })}
            </View>

            {/* Photo area */}
            <View style={styles.photoRow}>
              {photos.map((uri, i) => (
                <Image key={i} source={{ uri }} style={[styles.photoThumb, { borderRadius: radius.lg }]} />
              ))}
              {photos.length < 4 && (
                <View style={styles.photoButtons}>
                  <Pressable
                    onPress={takePhoto}
                    style={[styles.cameraBtn, { backgroundColor: colors.primary, borderRadius: radius.lg }]}
                  >
                    <Camera size={24} color="#FFFFFF" strokeWidth={2} />
                  </Pressable>
                  <Pressable
                    onPress={pickPhoto}
                    style={[styles.galleryBtn, { backgroundColor: colors.surfaceRaised, borderColor: colors.border, borderRadius: radius.lg }]}
                  >
                    <Plus size={20} color={colors.textMuted} strokeWidth={2} />
                  </Pressable>
                </View>
              )}
            </View>

            {/* Description */}
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder="What did they eat?"
              placeholderTextColor={colors.textMuted}
              style={[styles.input, { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg }]}
            />

            {/* Eat quality */}
            <View style={styles.qualityRow}>
              {EAT_QUALITIES.map((q) => {
                const Icon = q.icon
                const active = quality === q.id
                return (
                  <Pressable
                    key={q.id}
                    onPress={() => setQuality(q.id)}
                    style={[
                      styles.qualityBtn,
                      {
                        backgroundColor: active ? q.color + '15' : colors.surface,
                        borderColor: active ? q.color : colors.border,
                        borderRadius: radius.lg,
                      },
                    ]}
                  >
                    <Icon size={22} color={active ? q.color : colors.textMuted} strokeWidth={2} />
                    <Text style={[styles.qualityLabel, { color: active ? q.color : colors.textMuted }]}>
                      {q.label}
                    </Text>
                  </Pressable>
                )
              })}
            </View>

            {/* Flags */}
            <View style={styles.flagRow}>
              <Pressable
                onPress={() => setIsNewFood(!isNewFood)}
                style={[styles.flagChip, {
                  backgroundColor: isNewFood ? brand.secondary + '15' : colors.surface,
                  borderColor: isNewFood ? brand.secondary : colors.border,
                  borderRadius: radius.full,
                }]}
              >
                <Baby size={14} color={isNewFood ? brand.secondary : colors.textMuted} strokeWidth={2} />
                <Text style={[styles.flagText, { color: isNewFood ? brand.secondary : colors.textMuted }]}>
                  New food
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setHasReaction(!hasReaction)}
                style={[styles.flagChip, {
                  backgroundColor: hasReaction ? brand.error + '15' : colors.surface,
                  borderColor: hasReaction ? brand.error : colors.border,
                  borderRadius: radius.full,
                }]}
              >
                <AlertTriangle size={14} color={hasReaction ? brand.error : colors.textMuted} strokeWidth={2} />
                <Text style={[styles.flagText, { color: hasReaction ? brand.error : colors.textMuted }]}>
                  Reaction
                </Text>
              </Pressable>
            </View>
          </>
        ) : (
          <>
            {/* Breast / Bottle */}
            <TextInput
              value={duration}
              onChangeText={setDuration}
              placeholder={feedType === 'breast' ? 'Duration (minutes)' : 'Amount (ml)'}
              placeholderTextColor={colors.textMuted}
              keyboardType="number-pad"
              style={[styles.input, { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg }]}
            />
          </>
        )}

        <SaveButton onPress={save} saving={saving} disabled={!childId} />
      </View>
    </ScrollView>
  )
}

// ─── 2. SLEEP FORM ─────────────────────────────────────────────────────────

export function SleepForm({ onSaved }: { onSaved: () => void }) {
  const { colors, radius } = useTheme()
  const children = useChildStore((s) => s.children)
  const activeChild = useChildStore((s) => s.activeChild)

  const [childId, setChildId] = useState(activeChild?.id ?? children[0]?.id ?? '')
  const [duration, setDuration] = useState('')
  const [quality, setQuality] = useState<string | null>(null)
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  const qualities = ['Great', 'Good', 'Restless', 'Poor']

  async function save() {
    if (!childId) return
    setSaving(true)
    try {
      const value = JSON.stringify({ duration, quality })
      await saveChildLog(childId, 'sleep', value, notes || undefined)
      onSaved()
    } catch (e: any) {
      Alert.alert('Error', e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <View style={styles.form}>
      <ChildSelector selected={childId} onSelect={setChildId} />
      <View style={[styles.iconBanner, { backgroundColor: brand.pregnancy + '15' }]}>
        <Moon size={20} color={brand.pregnancy} strokeWidth={2} />
        <Text style={[styles.bannerLabel, { color: colors.text }]}>Sleep Log</Text>
      </View>
      <TextInput
        value={duration}
        onChangeText={setDuration}
        placeholder="Duration (hours, e.g. 2.5)"
        placeholderTextColor={colors.textMuted}
        keyboardType="decimal-pad"
        style={[styles.input, { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg }]}
      />
      <View style={styles.chipGrid}>
        {qualities.map((q) => {
          const active = quality === q
          return (
            <Pressable
              key={q}
              onPress={() => setQuality(q)}
              style={[styles.chip, {
                backgroundColor: active ? colors.primaryTint : colors.surface,
                borderColor: active ? colors.primary : colors.border,
                borderRadius: radius.full,
              }]}
            >
              <Text style={[styles.chipText, { color: active ? colors.primary : colors.text }]}>{q}</Text>
            </Pressable>
          )
        })}
      </View>
      <TextInput
        value={notes}
        onChangeText={setNotes}
        placeholder="Notes (optional)"
        placeholderTextColor={colors.textMuted}
        style={[styles.input, { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg }]}
      />
      <SaveButton onPress={save} saving={saving} disabled={!childId} />
    </View>
  )
}

// ─── 3. HEALTH EVENT FORM ──────────────────────────────────────────────────

const HEALTH_EVENTS = ['Temperature', 'Vaccine', 'Medicine', 'Doctor visit', 'Injury', 'Other']

export function HealthEventForm({ onSaved }: { onSaved: () => void }) {
  const { colors, radius } = useTheme()
  const children = useChildStore((s) => s.children)
  const activeChild = useChildStore((s) => s.activeChild)

  const [childId, setChildId] = useState(activeChild?.id ?? children[0]?.id ?? '')
  const [eventType, setEventType] = useState<string | null>(null)
  const [value, setValue] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  async function save() {
    if (!childId || !eventType) return
    setSaving(true)
    try {
      const logType = eventType === 'Temperature' ? 'temperature'
        : eventType === 'Vaccine' ? 'vaccine'
        : eventType === 'Medicine' ? 'medicine'
        : 'note'
      await saveChildLog(childId, logType, value || eventType, notes || undefined)
      onSaved()
    } catch (e: any) {
      Alert.alert('Error', e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <View style={styles.form}>
      <ChildSelector selected={childId} onSelect={setChildId} />
      <View style={[styles.iconBanner, { backgroundColor: brand.error + '15' }]}>
        <Heart size={20} color={brand.error} strokeWidth={2} />
        <Text style={[styles.bannerLabel, { color: colors.text }]}>Health Event</Text>
      </View>
      <View style={styles.chipGrid}>
        {HEALTH_EVENTS.map((e) => {
          const active = eventType === e
          return (
            <Pressable
              key={e}
              onPress={() => setEventType(e)}
              style={[styles.chip, {
                backgroundColor: active ? colors.primaryTint : colors.surface,
                borderColor: active ? colors.primary : colors.border,
                borderRadius: radius.full,
              }]}
            >
              <Text style={[styles.chipText, { color: active ? colors.primary : colors.text }]}>{e}</Text>
            </Pressable>
          )
        })}
      </View>
      <TextInput
        value={value}
        onChangeText={setValue}
        placeholder={eventType === 'Temperature' ? 'Temperature (e.g. 37.5°C)' : 'Details'}
        placeholderTextColor={colors.textMuted}
        keyboardType={eventType === 'Temperature' ? 'decimal-pad' : 'default'}
        style={[styles.input, { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg }]}
      />
      <TextInput
        value={notes}
        onChangeText={setNotes}
        placeholder="Notes (optional)"
        placeholderTextColor={colors.textMuted}
        style={[styles.input, { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg }]}
      />
      <SaveButton onPress={save} saving={saving} disabled={!childId || !eventType} />
    </View>
  )
}

// ─── 4. MOOD FORM ──────────────────────────────────────────────────────────

const MOODS = [
  { id: 'happy', icon: Laugh, label: 'Happy' },
  { id: 'calm', icon: Smile, label: 'Calm' },
  { id: 'fussy', icon: Meh, label: 'Fussy' },
  { id: 'cranky', icon: Frown, label: 'Cranky' },
  { id: 'energetic', icon: Zap, label: 'Energetic' },
]

export function KidsMoodForm({ onSaved }: { onSaved: () => void }) {
  const { colors, radius } = useTheme()
  const children = useChildStore((s) => s.children)
  const activeChild = useChildStore((s) => s.activeChild)

  const [childId, setChildId] = useState(activeChild?.id ?? children[0]?.id ?? '')
  const [mood, setMood] = useState<string | null>(null)
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  async function save() {
    if (!childId || !mood) return
    setSaving(true)
    try {
      await saveChildLog(childId, 'mood', mood, notes || undefined)
      onSaved()
    } catch (e: any) {
      Alert.alert('Error', e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <View style={styles.form}>
      <ChildSelector selected={childId} onSelect={setChildId} />
      <View style={styles.moodRow}>
        {MOODS.map((m) => {
          const Icon = m.icon
          const active = mood === m.id
          return (
            <Pressable
              key={m.id}
              onPress={() => setMood(m.id)}
              style={[styles.moodBtn, {
                backgroundColor: active ? colors.primaryTint : colors.surface,
                borderRadius: radius.lg,
              }]}
            >
              <Icon size={24} color={active ? colors.primary : colors.textMuted} strokeWidth={2} />
              <Text style={[styles.moodLabel, { color: active ? colors.primary : colors.textMuted }]}>{m.label}</Text>
            </Pressable>
          )
        })}
      </View>
      <TextInput
        value={notes}
        onChangeText={setNotes}
        placeholder="What happened?"
        placeholderTextColor={colors.textMuted}
        style={[styles.input, { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg }]}
      />
      <SaveButton onPress={save} saving={saving} disabled={!childId || !mood} />
    </View>
  )
}

// ─── 5. MEMORY FORM ────────────────────────────────────────────────────────

export function MemoryForm({ onSaved }: { onSaved: () => void }) {
  const { colors, radius } = useTheme()
  const children = useChildStore((s) => s.children)
  const activeChild = useChildStore((s) => s.activeChild)

  const [childId, setChildId] = useState(activeChild?.id ?? children[0]?.id ?? '')
  const [photos, setPhotos] = useState<string[]>([])
  const [caption, setCaption] = useState('')
  const [saving, setSaving] = useState(false)

  async function pickPhoto() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      quality: 0.7,
      selectionLimit: 4,
    })
    if (!result.canceled) {
      setPhotos((prev) => [...prev, ...result.assets.map((a) => a.uri)].slice(0, 4))
    }
  }

  async function takePhoto() {
    const perm = await ImagePicker.requestCameraPermissionsAsync()
    if (!perm.granted) return Alert.alert('Permission needed', 'Camera access is required')
    const result = await ImagePicker.launchCameraAsync({ quality: 0.7 })
    if (!result.canceled && result.assets[0]) {
      setPhotos((prev) => [...prev, result.assets[0].uri].slice(0, 4))
    }
  }

  async function save() {
    if (!childId) return
    setSaving(true)
    try {
      await saveChildLog(childId, 'photo', 'memory', caption || undefined, photos)
      onSaved()
    } catch (e: any) {
      Alert.alert('Error', e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <View style={styles.form}>
      <ChildSelector selected={childId} onSelect={setChildId} />
      <View style={styles.photoRow}>
        {photos.map((uri, i) => (
          <Image key={i} source={{ uri }} style={[styles.photoThumb, { borderRadius: radius.lg }]} />
        ))}
        {photos.length < 4 && (
          <View style={styles.photoButtons}>
            <Pressable onPress={takePhoto} style={[styles.cameraBtn, { backgroundColor: colors.primary, borderRadius: radius.lg }]}>
              <Camera size={24} color="#FFFFFF" strokeWidth={2} />
            </Pressable>
            <Pressable onPress={pickPhoto} style={[styles.galleryBtn, { backgroundColor: colors.surfaceRaised, borderColor: colors.border, borderRadius: radius.lg }]}>
              <Plus size={20} color={colors.textMuted} strokeWidth={2} />
            </Pressable>
          </View>
        )}
      </View>
      <TextInput
        value={caption}
        onChangeText={setCaption}
        placeholder="Caption this moment..."
        placeholderTextColor={colors.textMuted}
        style={[styles.input, { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg }]}
      />
      <SaveButton onPress={save} saving={saving} disabled={!childId} />
    </View>
  )
}

// ─── Save Button ───────────────────────────────────────────────────────────

function SaveButton({ onPress, saving, disabled }: { onPress: () => void; saving: boolean; disabled?: boolean }) {
  const { colors, radius } = useTheme()
  return (
    <Pressable
      onPress={onPress}
      disabled={saving || disabled}
      style={({ pressed }) => [
        styles.saveBtn,
        { backgroundColor: colors.primary, borderRadius: radius.lg, opacity: disabled ? 0.4 : 1 },
        pressed && !disabled && { transform: [{ scale: 0.98 }], opacity: 0.9 },
      ]}
    >
      {saving ? <ActivityIndicator color="#FFF" /> : <Text style={styles.saveBtnText}>Save</Text>}
    </Pressable>
  )
}

// ─── Styles ────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  form: { gap: 16, paddingBottom: 8 },
  childRow: { gap: 8 },
  childChip: { paddingVertical: 8, paddingHorizontal: 16, borderWidth: 1 },
  childChipText: { fontSize: 14, fontWeight: '600' },
  iconBanner: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: 12 },
  bannerLabel: { fontSize: 15, fontWeight: '600' },
  input: { borderWidth: 1, paddingHorizontal: 16, height: 48, fontSize: 15, fontWeight: '500' },
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 8, paddingHorizontal: 14, borderWidth: 1 },
  chipText: { fontSize: 13, fontWeight: '600' },
  toggleRow: { flexDirection: 'row', padding: 4 },
  toggleBtn: { flex: 1, alignItems: 'center', paddingVertical: 10 },
  toggleText: { fontSize: 14, fontWeight: '700' },
  photoRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  photoThumb: { width: 72, height: 72 },
  photoButtons: { flexDirection: 'row', gap: 8 },
  cameraBtn: { width: 72, height: 72, alignItems: 'center', justifyContent: 'center' },
  galleryBtn: { width: 72, height: 72, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderStyle: 'dashed' },
  qualityRow: { flexDirection: 'row', gap: 8 },
  qualityBtn: { flex: 1, alignItems: 'center', paddingVertical: 14, gap: 6, borderWidth: 1 },
  qualityLabel: { fontSize: 11, fontWeight: '600', textAlign: 'center' },
  flagRow: { flexDirection: 'row', gap: 8 },
  flagChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 14, borderWidth: 1 },
  flagText: { fontSize: 13, fontWeight: '600' },
  moodRow: { flexDirection: 'row', gap: 8 },
  moodBtn: { flex: 1, alignItems: 'center', paddingVertical: 14, gap: 4 },
  moodLabel: { fontSize: 11, fontWeight: '600' },
  saveBtn: { height: 48, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  saveBtnText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
})
