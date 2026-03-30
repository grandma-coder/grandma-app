import { View, Text, ScrollView, TouchableOpacity } from 'react-native'
import { router } from 'expo-router'
import { useChildStore } from '../../store/useChildStore'

const pillars = [
  { id: 'milk', icon: '🍼', name: 'Milk & Feeding', desc: 'Formula, breastfeeding, bottles' },
  { id: 'food', icon: '🥦', name: 'First Foods', desc: 'Solids, allergens, textures' },
  { id: 'nutrition', icon: '📊', name: 'Nutrition', desc: 'Daily nutrients, portions' },
  { id: 'vaccines', icon: '💉', name: 'Vaccines', desc: 'Schedule, side effects' },
  { id: 'clothes', icon: '👕', name: 'Clothing Sizes', desc: 'Brand size conversions' },
  { id: 'recipes', icon: '🍳', name: 'Recipes', desc: 'Kid-friendly meal ideas' },
  { id: 'natural', icon: '🌿', name: 'Natural Remedies', desc: 'Evidence-backed home care' },
  { id: 'medicine', icon: '💊', name: 'Medicine', desc: 'Doses, safety, interactions' },
]

export default function Home() {
  const { child } = useChildStore()

  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#FAF8F4' }} contentContainerStyle={{ paddingBottom: 40 }}>
      <View style={{ padding: 24, paddingTop: 60 }}>
        <Text style={{ fontSize: 26, fontWeight: '600', color: '#1A1A2E' }}>
          {child ? `Hi! Ask about ${child.name}` : 'Hello! 👵'}
        </Text>
        <Text style={{ fontSize: 15, color: '#888', marginTop: 4 }}>
          What do you need help with today?
        </Text>
      </View>

      <TouchableOpacity
        onPress={() => router.push('/(tabs)/chat')}
        style={{ marginHorizontal: 24, backgroundColor: '#7BAE8E', borderRadius: 16, padding: 16, marginBottom: 28, flexDirection: 'row', alignItems: 'center', gap: 12 }}
      >
        <Text style={{ fontSize: 28 }}>👵</Text>
        <View style={{ flex: 1 }}>
          <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>Ask Grandma anything</Text>
          <Text style={{ color: '#fff', opacity: 0.8, fontSize: 13, marginTop: 2 }}>Chat with your parenting guide</Text>
        </View>
        <Text style={{ color: '#fff', fontSize: 20 }}>→</Text>
      </TouchableOpacity>

      <Text style={{ fontSize: 13, fontWeight: '600', color: '#888', paddingHorizontal: 24, marginBottom: 12, letterSpacing: 0.5 }}>
        KNOWLEDGE PILLARS
      </Text>

      <View style={{ paddingHorizontal: 16, flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        {pillars.map(pillar => (
          <TouchableOpacity
            key={pillar.id}
            onPress={() => router.push(`/pillar/${pillar.id}`)}
            style={{ width: '47%', backgroundColor: '#fff', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: '#E8E4DC' }}
          >
            <Text style={{ fontSize: 28, marginBottom: 8 }}>{pillar.icon}</Text>
            <Text style={{ fontSize: 14, fontWeight: '600', color: '#1A1A2E', marginBottom: 2 }}>{pillar.name}</Text>
            <Text style={{ fontSize: 12, color: '#aaa' }}>{pillar.desc}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  )
}