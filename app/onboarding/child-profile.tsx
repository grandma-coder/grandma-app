import { useState } from 'react'
import {
  View,
  Text,
  TextInput,
  Alert,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native'
import { router } from 'expo-router'
import { Pressable } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { supabase } from '../../lib/supabase'
import { useChildStore } from '../../store/useChildStore'
import { useJourneyStore } from '../../store/useJourneyStore'
import { CosmicBackground } from '../../components/ui/CosmicBackground'
import { GradientButton } from '../../components/ui/GradientButton'
import DatePickerField from '../../components/ui/DatePickerField'
import { colors, typography, spacing, borderRadius } from '../../constants/theme'

export default function ChildProfile() {
  const insets = useSafeAreaInsets()
  const setChildren = useChildStore((s) => s.setChildren)
  const { mode, parentName, babyName } = useJourneyStore()

  const [name, setName] = useState(babyName || '')
  const [birthDate, setBirthDate] = useState('')
  const [weight, setWeight] = useState('')
  const [allergies, setAllergies] = useState('')
  const [loading, setLoading] = useState(false)

  const isPregnancy = mode === 'pregnancy' || mode === 'pre-pregnancy'

  async function save() {
    if (!isPregnancy && !name.trim()) {
      Alert.alert('Required', "What's your little one's name?")
      return
    }

    if (weight && (isNaN(parseFloat(weight)) || parseFloat(weight) <= 0)) {
      Alert.alert('Invalid weight', 'Please enter a valid weight in kg')
      return
    }

    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not signed in')

      await supabase
        .from('profiles')
        .upsert({ id: user.id, email: user.email }, { onConflict: 'id' })

      const childName = name.trim() || babyName || (isPregnancy ? 'Baby' : 'My child')

      const { data, error } = await supabase
        .from('children')
        .insert({
          parent_id: user.id,
          name: childName,
          birth_date: birthDate || null,
          weight_kg: weight ? parseFloat(weight) : null,
          allergies: allergies ? allergies.split(',').map(a => a.trim()).filter(Boolean) : [],
        })
        .select()
        .single()

      if (error) throw error

      await supabase.from('child_caregivers').insert({
        child_id: data.id,
        user_id: user.id,
        email: user.email,
        role: 'parent',
        status: 'accepted',
        invited_by: user.id,
        accepted_at: new Date().toISOString(),
      })

      setChildren([{
        id: data.id,
        parentId: data.parent_id,
        name: data.name,
        birthDate: data.birth_date ?? '',
        weightKg: data.weight_kg ?? 0,
        heightCm: data.height_cm ?? 0,
        allergies: data.allergies ?? [],
        medications: data.medications ?? [],
        countryCode: data.country_code ?? 'US',
        caregiverRole: 'parent',
        permissions: { view: true, log_activity: true, chat: true },
      }])

      router.replace('/(tabs)')
    } catch (e: any) {
      Alert.alert('Error', e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <CosmicBackground>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 24 },
          ]}
          keyboardShouldPersistTaps="handled"
        >
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={22} color={colors.text} />
          </Pressable>

          <Text style={styles.title}>
            {isPregnancy ? "Almost there,\ndear." : "Tell Grandma about\nyour little one"}
          </Text>
          <Text style={styles.subtitle}>
            {isPregnancy
              ? 'Just a few more details to personalize your experience'
              : 'This helps her give personalized advice'}
          </Text>

          {!isPregnancy && (
            <>
              <Text style={styles.label}>CHILD'S NAME *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Sofia"
                placeholderTextColor={colors.textTertiary}
                value={name}
                onChangeText={setName}
              />
            </>
          )}

          {!isPregnancy && (
            <DatePickerField
              label="BIRTH DATE"
              value={birthDate}
              onChange={setBirthDate}
              placeholder="Tap to select"
              maximumDate={new Date()}
            />
          )}

          {!isPregnancy && (
            <>
              <Text style={styles.label}>WEIGHT (kg)</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. 7.5"
                placeholderTextColor={colors.textTertiary}
                value={weight}
                onChangeText={setWeight}
                keyboardType="decimal-pad"
              />
            </>
          )}

          <Text style={styles.label}>KNOWN ALLERGIES</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. dairy, peanuts (comma separated)"
            placeholderTextColor={colors.textTertiary}
            value={allergies}
            onChangeText={setAllergies}
          />

          <View style={{ marginTop: 24 }}>
            <GradientButton
              title="Begin My Journey"
              onPress={save}
              loading={loading}
            />
          </View>

          <Text style={styles.termsText}>
            By continuing, you agree to Grandma's{' '}
            <Text style={styles.termsLink}>Terms of Serenity</Text> and{' '}
            <Text style={styles.termsLink}>Privacy Policy</Text>.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </CosmicBackground>
  )
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: spacing['2xl'],
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surfaceGlass,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
    borderWidth: 1,
    borderColor: colors.border,
  },
  title: {
    ...typography.heading,
    marginBottom: 8,
  },
  subtitle: {
    ...typography.bodySecondary,
    marginBottom: 32,
  },
  label: {
    ...typography.label,
    marginBottom: 8,
  },
  input: {
    backgroundColor: colors.surfaceGlass,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    padding: 16,
    fontSize: 16,
    color: colors.text,
    marginBottom: 16,
  },
  termsText: {
    fontSize: 12,
    color: colors.textTertiary,
    textAlign: 'center',
    lineHeight: 18,
    marginTop: 20,
  },
  termsLink: {
    textDecorationLine: 'underline',
    color: colors.textSecondary,
  },
})
