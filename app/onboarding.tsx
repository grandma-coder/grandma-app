import { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, Alert, ScrollView } from 'react-native'
import { router } from 'expo-router'
import { supabase } from '../lib/supabase'
import { useChildStore } from '../store/useChildStore'

export default function Onboarding() {
  const [name, setName] = useState('')
  const [birthDate, setBirthDate] = useState('')
  const [weight, setWeight] = useState('')
  const [allergies, setAllergies] = useState('')
  const [loading, setLoading] = useState(false)
  const { setChild } = useChildStore()

  async function save() {
    if (!name.trim()) {
      Alert.alert('Required', "What's your little one's name?")
      return
    }

    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not signed in')

      // Ensure profile exists (FK requirement for children table)
      await supabase
        .from('profiles')
        .upsert({ id: user.id, email: user.email }, { onConflict: 'id' })

      const { data, error } = await supabase
        .from('children')
        .insert({
          parent_id: user.id,
          name: name.trim(),
          birth_date: birthDate || null,
          weight_kg: weight ? parseFloat(weight) : null,
          allergies: allergies ? allergies.split(',').map(a => a.trim()).filter(Boolean) : [],
        })
        .select()
        .single()

      if (error) throw error

      setChild({
        id: data.id,
        parentId: data.parent_id,
        name: data.name,
        birthDate: data.birth_date ?? '',
        weightKg: data.weight_kg ?? 0,
        heightCm: data.height_cm ?? 0,
        allergies: data.allergies ?? [],
        medications: data.medications ?? [],
        countryCode: data.country_code ?? 'US',
      })

      router.replace('/(tabs)')
    } catch (e: any) {
      Alert.alert('Error', e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: '#FAF8F4' }}
      contentContainerStyle={{ padding: 24, paddingTop: 80 }}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={{ fontSize: 28, fontWeight: '700', color: '#1A1A2E', marginBottom: 8 }}>
        Tell Grandma about your little one
      </Text>
      <Text style={{ fontSize: 15, color: '#888', marginBottom: 32 }}>
        This helps her give personalized advice
      </Text>

      <Text style={{ fontSize: 13, fontWeight: '600', color: '#888', marginBottom: 6 }}>CHILD'S NAME *</Text>
      <TextInput
        style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#E0DDD8', borderRadius: 12, padding: 16, fontSize: 16, marginBottom: 16 }}
        placeholder="e.g. Sofia"
        value={name}
        onChangeText={setName}
      />

      <Text style={{ fontSize: 13, fontWeight: '600', color: '#888', marginBottom: 6 }}>BIRTH DATE</Text>
      <TextInput
        style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#E0DDD8', borderRadius: 12, padding: 16, fontSize: 16, marginBottom: 16 }}
        placeholder="YYYY-MM-DD"
        value={birthDate}
        onChangeText={setBirthDate}
      />

      <Text style={{ fontSize: 13, fontWeight: '600', color: '#888', marginBottom: 6 }}>WEIGHT (kg)</Text>
      <TextInput
        style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#E0DDD8', borderRadius: 12, padding: 16, fontSize: 16, marginBottom: 16 }}
        placeholder="e.g. 7.5"
        value={weight}
        onChangeText={setWeight}
        keyboardType="decimal-pad"
      />

      <Text style={{ fontSize: 13, fontWeight: '600', color: '#888', marginBottom: 6 }}>ALLERGIES</Text>
      <TextInput
        style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#E0DDD8', borderRadius: 12, padding: 16, fontSize: 16, marginBottom: 32 }}
        placeholder="e.g. dairy, peanuts (comma separated)"
        value={allergies}
        onChangeText={setAllergies}
      />

      <TouchableOpacity
        onPress={save}
        disabled={loading}
        style={{ backgroundColor: '#7BAE8E', borderRadius: 12, padding: 16, alignItems: 'center' }}
      >
        <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>
          {loading ? 'Saving...' : 'Meet Grandma'}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  )
}
