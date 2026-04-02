import { View, Text, Pressable, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { GlassCard } from '../ui/GlassCard'
import { colors, borderRadius } from '../../constants/theme'

interface DocumentUploadProps {
  onCamera?: () => void
  onFilePick?: () => void
}

export function DocumentUpload({ onCamera, onFilePick }: DocumentUploadProps) {
  return (
    <GlassCard style={styles.container}>
      <View style={styles.iconCircle}>
        <Ionicons name="cloud-upload-outline" size={32} color={colors.accent} />
      </View>
      <Text style={styles.title}>Secure New Document</Text>
      <Text style={styles.subtitle}>
        Drop any medical file here or use your camera to scan physical records.
      </Text>

      <View style={styles.buttonRow}>
        <Pressable onPress={onCamera} style={styles.button}>
          <Ionicons name="camera-outline" size={20} color={colors.text} />
          <Text style={styles.buttonText}>Scan</Text>
        </Pressable>
        <Pressable onPress={onFilePick} style={styles.button}>
          <Ionicons name="folder-outline" size={20} color={colors.text} />
          <Text style={styles.buttonText}>Upload</Text>
        </Pressable>
      </View>

      <Pressable onPress={onFilePick} style={styles.addRecordBtn}>
        <Text style={styles.addRecordText}>Add Record</Text>
      </Pressable>
    </GlassCard>
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
    backgroundColor: colors.accentMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 13,
    color: colors.textTertiary,
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
    backgroundColor: colors.surfaceGlass,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.border,
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  addRecordBtn: {
    backgroundColor: colors.accent,
    borderRadius: borderRadius.full,
    paddingHorizontal: 28,
    paddingVertical: 12,
  },
  addRecordText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textOnAccent,
  },
})
