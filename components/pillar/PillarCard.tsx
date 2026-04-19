import { Pressable, StyleSheet, Text, View } from 'react-native'
import { Pillar } from '../../types'

interface PillarCardProps {
  pillar: Pillar
  onPress: (pillar: Pillar) => void
}

export default function PillarCard({ pillar, onPress }: PillarCardProps) {
  return (
    <Pressable
      onPress={() => onPress(pillar)}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: pillar.color, opacity: pressed ? 0.85 : 1 },
      ]}
    >
      <Text style={styles.icon}>{pillar.icon}</Text>
      <View style={styles.textContainer}>
        <Text style={styles.name}>{pillar.name}</Text>
        <Text style={styles.description} numberOfLines={2}>
          {pillar.description}
        </Text>
      </View>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
  },
  icon: {
    fontSize: 36,
    marginRight: 14, fontFamily: 'Fraunces_600SemiBold' },
  textContainer: {
    flex: 1,
  },
  name: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 2,
  },
  description: {
    fontSize: 13,
    color: '#4B5563',
    lineHeight: 18,
  },
})
