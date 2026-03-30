import { StyleSheet, Text, View } from 'react-native'

interface TipCardProps {
  label: string
  text: string
}

export default function TipCard({ label, text }: TipCardProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.text}>{text}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#F9FAFB',
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
  },
  label: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  text: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 20,
  },
})
