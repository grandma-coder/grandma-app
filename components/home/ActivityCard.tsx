import { View, Text, Pressable, StyleSheet } from 'react-native'

interface ActivityCardProps {
  title: string
  icon: string
  color: string
  lastEntry?: string
  onAdd: () => void
}

export default function ActivityCard({ title, icon, color, lastEntry, onAdd }: ActivityCardProps) {
  return (
    <View style={styles.card}>
      <View style={[styles.header, { backgroundColor: color }]}>
        <Text style={styles.headerIcon}>{icon}</Text>
        <Text style={styles.headerTitle}>{title}</Text>
        <Pressable
          onPress={onAdd}
          style={({ pressed }) => [styles.addButton, { opacity: pressed ? 0.8 : 1 }]}
        >
          <Text style={styles.addIcon}>+</Text>
        </Pressable>
      </View>
      <View style={styles.body}>
        <Text style={styles.lastEntry}>
          {lastEntry ?? 'Nothing logged yet'}
        </Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E8E4DC',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 18,
    paddingLeft: 18,
    paddingRight: 60,
    gap: 10,
  },
  headerIcon: {
    fontSize: 24,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A2E',
  },
  addButton: {
    position: 'absolute',
    top: -12,
    right: 14,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#7BAE8E',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addIcon: {
    fontSize: 24,
    color: '#FFFFFF',
    fontWeight: '600',
    marginTop: -1,
  },
  body: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  lastEntry: {
    fontSize: 13,
    color: '#888888',
    lineHeight: 18,
  },
})
