import { StyleSheet, Text, View, ScrollView, Pressable } from 'react-native'
import { useTheme, borderRadius } from '../../constants/theme'
import { TalkMaster } from '../stickers/RewardStickers'

interface ResultCardProps {
  result: string
  scanType: string
  onClose: () => void
}

export default function ResultCard({ result, scanType, onClose }: ResultCardProps) {
  const { colors } = useTheme()
  const title = {
    medicine: 'Medicine Analysis',
    food: 'Food Analysis',
    nutrition: 'Nutrition Check',
    general: 'Scan Result',
  }[scanType] ?? 'Scan Result'

  return (
    <View style={styles.overlay}>
      <View style={[styles.card, { backgroundColor: colors.surface }]}>
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
          <Pressable onPress={onClose} style={[styles.closeButton, { backgroundColor: colors.accent }]}>
            <Text style={[styles.closeText, { color: colors.textInverse }]}>Done</Text>
          </Pressable>
        </View>
        <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
          <View style={styles.emoji}><TalkMaster size={56} /></View>
          <Text style={[styles.resultText, { color: colors.textSecondary }]}>{result}</Text>
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
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
  },
  closeButton: {
    borderRadius: borderRadius.lg,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  closeText: {
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
    lineHeight: 24,
  },
})
