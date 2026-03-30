import { View, Text, ScrollView, TouchableOpacity } from 'react-native'
import { router } from 'expo-router'
import { useChildStore } from '../../store/useChildStore'
import { pillars } from '../../lib/pillars'
import PillarCard from '../../components/pillar/PillarCard'

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

      <View style={{ paddingHorizontal: 16, gap: 10 }}>
        {pillars.map(pillar => (
          <PillarCard
            key={pillar.id}
            pillar={pillar}
            onPress={(p) => router.push(`/pillar/${p.id}`)}
          />
        ))}
      </View>
    </ScrollView>
  )
}