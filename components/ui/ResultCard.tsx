import { StyleSheet, Text, View, ScrollView, Pressable } from 'react-native'
import { colors, borderRadius } from '../../constants/theme'
import { Emoji } from './Emoji'

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
          <Emoji size={36} style={styles.emoji}>👵</Emoji>
          <Text style={styles.resultText}>{result}</Text>
        </ScrollView>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  card: {
    backgroundColor: colors.surface,
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
    borderBottomColor: colors.border,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  closeButton: {
    backgroundColor: colors.accent,
    borderRadius: borderRadius.lg,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  closeText: {
    color: colors.textOnAccent,
    fontWeight: '600',
    fontSize: 14,
  },
  body: {
    padding: 20,
  },
  emoji: {
    fontSize: 36,
    marginBottom: 12, fontFamily: 'Fraunces_600SemiBold' },
  resultText: {
    fontSize: 15,
    color: colors.textSecondary,
    lineHeight: 24,
  },
})
