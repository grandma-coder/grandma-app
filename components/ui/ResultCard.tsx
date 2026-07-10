import { StyleSheet, Text, View, ScrollView, Pressable } from 'react-native'
import { useTheme, useDiffuseTheme, diffuseFont, borderRadius, font } from '../../constants/theme'
import { useIsDiffuse } from './diffuse/DiffuseKit'
import { TalkMaster } from '../stickers/RewardStickers'
import { useTranslation } from '../../lib/i18n'

interface ResultCardProps {
  result: string
  scanType: string
  onClose: () => void
}

export default function ResultCard({ result, scanType, onClose }: ResultCardProps) {
  const { colors } = useTheme()
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
  const { t } = useTranslation()
  const title = {
    medicine: 'Medicine Analysis',
    food: 'Food Analysis',
    nutrition: 'Nutrition Check',
    general: 'Scan Result',
  }[scanType] ?? 'Scan Result'

  // Diffuse: paper sheet + hairline header rule, serif title, sans-read body,
  // and a containerless-feeling hairline "done" pill (transparent + hairline
  // border, mono uppercase) instead of a filled accent pill. TalkMaster is a
  // semantic sticker — it stays.
  return (
    <View style={styles.overlay}>
      <View
        style={[
          styles.card,
          { backgroundColor: diffuse ? dt.colors.bg : colors.surface },
        ]}
      >
        <View style={[styles.header, { borderBottomColor: diffuse ? dt.colors.line : colors.border }]}>
          <Text
            style={[
              styles.title,
              { color: diffuse ? dt.colors.ink : colors.text },
              diffuse && { fontFamily: diffuseFont.display, fontWeight: '400', letterSpacing: -0.3 },
            ]}
          >
            {title}
          </Text>
          <Pressable
            onPress={onClose}
            style={[
              styles.closeButton,
              diffuse
                ? { backgroundColor: 'transparent', borderWidth: 1, borderColor: dt.colors.line2, borderRadius: 999 }
                : { backgroundColor: colors.accent },
            ]}
          >
            <Text
              style={[
                styles.closeText,
                { color: diffuse ? dt.colors.ink : colors.textInverse },
                diffuse && { fontFamily: diffuseFont.mono, fontWeight: '400', letterSpacing: 1.4, textTransform: 'uppercase' },
              ]}
            >
              {t('common_done')}
            </Text>
          </Pressable>
        </View>
        <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
          <View style={styles.emoji}><TalkMaster size={56} /></View>
          <Text
            style={[
              styles.resultText,
              { color: diffuse ? dt.colors.ink2 : colors.textSecondary },
              diffuse && { fontFamily: diffuseFont.body },
            ]}
          >
            {result}
          </Text>
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
    marginBottom: 12, fontFamily: font.display },
  resultText: {
    fontSize: 15,
    lineHeight: 24,
  },
})
