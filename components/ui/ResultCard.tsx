import { StyleSheet, Text, View, ScrollView, Pressable } from 'react-native'

interface ResultCardProps {
  result: string
  scanType: string
  onClose: () => void
}

export default function ResultCard({ result, scanType, onClose }: ResultCardProps) {
  const title = {
    medicine: 'Medicine Analysis',
    food: 'Food Analysis',
    nutrition: 'Nutrition Check',
    general: 'Scan Result',
  }[scanType] ?? 'Scan Result'

  return (
    <View style={styles.overlay}>
      <View style={styles.card}>
        <View style={styles.header}>
          <Text style={styles.title}>{title}</Text>
          <Pressable onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeText}>Done</Text>
          </Pressable>
        </View>
        <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
          <Text style={styles.emoji}>👵</Text>
          <Text style={styles.resultText}>{result}</Text>
        </ScrollView>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  card: {
    backgroundColor: '#FAF8F4',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E8E4DC',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A2E',
  },
  closeButton: {
    backgroundColor: '#7BAE8E',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  closeText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  body: {
    padding: 20,
  },
  emoji: {
    fontSize: 36,
    marginBottom: 12,
  },
  resultText: {
    fontSize: 15,
    color: '#1A1A2E',
    lineHeight: 24,
  },
})
