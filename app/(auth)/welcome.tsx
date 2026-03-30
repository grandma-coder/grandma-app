import { View, Text, TouchableOpacity } from 'react-native'
import { router } from 'expo-router'

export default function Welcome() {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, backgroundColor: '#FAF8F4' }}>
      <Text style={{ fontSize: 48, marginBottom: 16 }}>👵</Text>
      <Text style={{ fontSize: 32, fontWeight: '700', color: '#1A1A2E', textAlign: 'center', marginBottom: 8 }}>
        Grandma
      </Text>
      <Text style={{ fontSize: 16, color: '#888', textAlign: 'center', marginBottom: 48, lineHeight: 22 }}>
        The parenting wisdom of a grandmother,{'\n'}available 24/7
      </Text>

      <TouchableOpacity
        onPress={() => router.push('/(auth)/sign-up')}
        style={{ backgroundColor: '#7BAE8E', borderRadius: 12, padding: 16, alignItems: 'center', width: '100%', marginBottom: 12 }}
      >
        <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>Get started</Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => router.push('/(auth)/sign-in')}
        style={{ borderRadius: 12, padding: 16, alignItems: 'center', width: '100%' }}
      >
        <Text style={{ color: '#7BAE8E', fontSize: 16, fontWeight: '600' }}>I already have an account</Text>
      </TouchableOpacity>
    </View>
  )
}
