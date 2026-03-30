import { View, Text, Pressable, FlatList, StyleSheet } from 'react-native'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useChildStore } from '../store/useChildStore'
import type { ChildWithRole } from '../types'

const ROLE_COLORS: Record<string, string> = {
  parent: '#E1F5EE',
  nanny: '#EEEDFE',
  family: '#FAEEDA',
}

export default function ChildPicker() {
  const children = useChildStore((s) => s.children)
  const activeChild = useChildStore((s) => s.activeChild)
  const setActiveChild = useChildStore((s) => s.setActiveChild)

  function handleSelect(child: ChildWithRole) {
    setActiveChild(child)
    router.back()
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Switch child</Text>
        <Pressable onPress={() => router.back()} style={styles.closeButton}>
          <Ionicons name="close" size={24} color="#888" />
        </Pressable>
      </View>

      <FlatList
        data={children}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => {
          const isActive = item.id === activeChild?.id
          return (
            <Pressable
              onPress={() => handleSelect(item)}
              style={[styles.card, isActive && styles.cardActive]}
            >
              <View style={styles.avatar}>
                <Text style={{ fontSize: 24 }}>👶</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.childName}>{item.name}</Text>
                <View style={[styles.roleBadge, { backgroundColor: ROLE_COLORS[item.caregiverRole] ?? '#F5F5F5' }]}>
                  <Text style={styles.roleText}>{item.caregiverRole}</Text>
                </View>
              </View>
              {isActive && (
                <Ionicons name="checkmark-circle" size={24} color="#7BAE8E" />
              )}
            </Pressable>
          )
        }}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAF8F4', paddingTop: 60 },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 24, marginBottom: 20,
  },
  title: { fontSize: 20, fontWeight: '700', color: '#1A1A2E' },
  closeButton: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: '#fff',
    justifyContent: 'center', alignItems: 'center',
  },
  list: { paddingHorizontal: 24, gap: 10 },
  card: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: '#fff', borderRadius: 16, padding: 16,
    borderWidth: 1.5, borderColor: '#E8E4DC',
  },
  cardActive: { borderColor: '#7BAE8E' },
  avatar: {
    width: 48, height: 48, borderRadius: 24, backgroundColor: '#E1F5EE',
    justifyContent: 'center', alignItems: 'center',
  },
  childName: { fontSize: 16, fontWeight: '700', color: '#1A1A2E', marginBottom: 4 },
  roleBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2, alignSelf: 'flex-start' },
  roleText: { fontSize: 11, fontWeight: '600', color: '#555', textTransform: 'capitalize' },
})
