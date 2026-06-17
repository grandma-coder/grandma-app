import { View, Text, Pressable, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { PaperCard } from '../ui/PaperCard'
import { useTheme, borderRadius } from '../../constants/theme'

interface DocumentUploadProps {
  onCamera?: () => void
  onFilePick?: () => void
}

export function DocumentUpload({ onCamera, onFilePick }: DocumentUploadProps) {
  const { colors } = useTheme()
  return (
    <PaperCard radius={28} padding={20} style={styles.container}>
      <View style={[styles.iconCircle, { backgroundColor: colors.primaryTint }]}>
        <Ionicons name="cloud-upload-outline" size={32} color={colors.accent} />
      </View>
      <Text style={[styles.title, { color: colors.text }]}>Secure New Document</Text>
      <Text style={[styles.subtitle, { color: colors.textMuted }]}>
        Drop any medical file here or use your camera to scan physical records.
      </Text>

      <View style={styles.buttonRow}>
        <Pressable onPress={onCamera} style={[styles.button, { backgroundColor: colors.surfaceGlass, borderColor: colors.border }]}>
          <Ionicons name="camera-outline" size={20} color={colors.text} />
          <Text style={[styles.buttonText, { color: colors.text }]}>Scan</Text>
        </Pressable>
        <Pressable onPress={onFilePick} style={[styles.button, { backgroundColor: colors.surfaceGlass, borderColor: colors.border }]}>
          <Ionicons name="folder-outline" size={20} color={colors.text} />
          <Text style={[styles.buttonText, { color: colors.text }]}>Upload</Text>
        </Pressable>
      </View>

      <Pressable onPress={onFilePick} style={[styles.addRecordBtn, { backgroundColor: colors.accent }]}>
        <Text style={[styles.addRecordText, { color: colors.textInverse }]}>Add Record</Text>
      </Pressable>
    </PaperCard>
  )
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 28,
    marginBottom: 20,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
    paddingHorizontal: 16,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: borderRadius.full,
    borderWidth: 1,
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  addRecordBtn: {
    borderRadius: borderRadius.full,
    paddingHorizontal: 28,
    paddingVertical: 12,
  },
  addRecordText: {
    fontSize: 14,
    fontWeight: '700',
  },
})
