/**
 * Personal Profile — edit basic info + health profile.
 */

import { useState, useEffect } from 'react'
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  Alert,
  StyleSheet,
} from 'react-native'
import { router } from 'expo-router'
import { ArrowLeft, Save } from 'lucide-react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme } from '../../constants/theme'
import { supabase } from '../../lib/supabase'

export default function PersonalProfile() {
  const { colors, radius } = useTheme()
  const insets = useSafeAreaInsets()

  const [name, setName] = useState('')
  const [location, setLocation] = useState('')
  const [language, setLanguage] = useState('en')
  const [healthNotes, setHealthNotes] = useState('')
  const [allergies, setAllergies] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadProfile()
  }, [])

  async function loadProfile() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', session.user.id)
      .single()

    if (data) {
      setName(data.name ?? '')
      setLocation(data.location ?? '')
      setLanguage(data.language ?? 'en')
      setHealthNotes(data.health_notes ?? '')
      setAllergies(data.allergies?.join(', ') ?? '')
    }
  }

  async function handleSave() {
    setSaving(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const { error } = await supabase.from('profiles').upsert({
        user_id: session.user.id,
        name: name || null,
        location: location || null,
        language,
        health_notes: healthNotes || null,
        allergies: allergies ? allergies.split(',').map((a) => a.trim()).filter(Boolean) : [],
      }, { onConflict: 'user_id' })

      if (error) throw error
      Alert.alert('Saved', 'Your profile has been updated.')
      router.back()
    } catch (e: any) {
      Alert.alert('Error', e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={24} color={colors.text} />
        </Pressable>
        <Text style={[styles.title, { color: colors.text }]}>My Profile</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Field label="Name" value={name} onChangeText={setName} placeholder="Your name" colors={colors} radius={radius} />
        <Field label="Location" value={location} onChangeText={setLocation} placeholder="City, Country" colors={colors} radius={radius} />
        <Field label="Language" value={language} onChangeText={setLanguage} placeholder="en" colors={colors} radius={radius} />
        <Field label="Health Notes" value={healthNotes} onChangeText={setHealthNotes} placeholder="Any health conditions..." multiline colors={colors} radius={radius} />
        <Field label="Allergies" value={allergies} onChangeText={setAllergies} placeholder="Comma-separated" colors={colors} radius={radius} />

        <Pressable
          onPress={handleSave}
          disabled={saving}
          style={({ pressed }) => [
            styles.saveBtn,
            { backgroundColor: colors.primary, borderRadius: radius.lg, opacity: saving ? 0.6 : 1 },
            pressed && { transform: [{ scale: 0.98 }] },
          ]}
        >
          <Save size={18} color="#FFFFFF" strokeWidth={2} />
          <Text style={styles.saveBtnText}>{saving ? 'Saving...' : 'Save Changes'}</Text>
        </Pressable>
      </ScrollView>
    </View>
  )
}

function Field({ label, value, onChangeText, placeholder, multiline, colors, radius }: any) {
  return (
    <View style={styles.field}>
      <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        multiline={multiline}
        style={[
          styles.fieldInput,
          {
            color: colors.text,
            backgroundColor: colors.surface,
            borderColor: colors.border,
            borderRadius: radius.lg,
          },
          multiline && { height: 80, textAlignVertical: 'top', paddingTop: 12 },
        ]}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 12 },
  backBtn: { width: 40, alignItems: 'center' },
  title: { fontSize: 18, fontWeight: '700' },
  scroll: { paddingHorizontal: 20, paddingBottom: 40, gap: 16 },
  field: { gap: 6 },
  fieldLabel: { fontSize: 13, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  fieldInput: { borderWidth: 1, paddingHorizontal: 16, height: 48, fontSize: 15, fontWeight: '500' },
  saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 52, marginTop: 8 },
  saveBtnText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
})
