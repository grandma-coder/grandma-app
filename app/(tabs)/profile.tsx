import { View, Text, ScrollView, TouchableOpacity, Alert } from 'react-native'
import { router } from 'expo-router'
import { supabase } from '../../lib/supabase'
import { useChildStore } from '../../store/useChildStore'

export default function Profile() {
  const { child, clearChild } = useChildStore()

  async function signOut() {
    await supabase.auth.signOut()
    clearChild()
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#FAF8F4' }} contentContainerStyle={{ padding: 24, paddingTop: 60 }}>
      <Text style={{ fontSize: 26, fontWeight: '600', color: '#1A1A2E', marginBottom: 24 }}>Profile</Text>

      {child ? (
        <View style={{ backgroundColor: '#fff', borderRadius: 16, padding: 20, borderWidth: 1, borderColor: '#E8E4DC', marginBottom: 16 }}>
          <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: '#E1F5EE', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
            <Text style={{ fontSize: 28 }}>👶</Text>
          </View>
          <Text style={{ fontSize: 20, fontWeight: '600', color: '#1A1A2E' }}>{child.name}</Text>
          <Text style={{ fontSize: 14, color: '#888', marginTop: 4 }}>{child.weightKg}kg</Text>
          {child.allergies.length > 0 && (
            <Text style={{ fontSize: 13, color: '#E07000', marginTop: 8 }}>
              Allergies: {child.allergies.join(', ')}
            </Text>
          )}
        </View>
      ) : (
        <TouchableOpacity
          onPress={() => router.push('/onboarding')}
          style={{ backgroundColor: '#7BAE8E', borderRadius: 16, padding: 20, alignItems: 'center', marginBottom: 16 }}
        >
          <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>Add your child's profile</Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity
        onPress={() => Alert.alert('Sign out', 'Are you sure?', [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Sign out', onPress: signOut, style: 'destructive' }
        ])}
        style={{ borderWidth: 1, borderColor: '#E8E4DC', borderRadius: 12, padding: 16, alignItems: 'center' }}
      >
        <Text style={{ color: '#888', fontSize: 15 }}>Sign out</Text>
      </TouchableOpacity>
    </ScrollView>
  )
}