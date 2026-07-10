import { View, Text, Pressable, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { CloudUpload, Camera, FolderOpen } from 'lucide-react-native'
import { PaperCard } from '../ui/PaperCard'
import { useTheme, borderRadius, useDiffuseTheme, diffuseFont } from '../../constants/theme'
import { useIsDiffuse, DiffuseArrow } from '../ui/diffuse/DiffuseKit'
import { DiffuseBloomIcon } from '../ui/diffuse/DiffusePrimitives'
import { useTranslation } from '../../lib/i18n'

interface DocumentUploadProps {
  onCamera?: () => void
  onFilePick?: () => void
}

export function DocumentUpload({ onCamera, onFilePick }: DocumentUploadProps) {
  const { colors } = useTheme()
  const dt = useDiffuseTheme()
  const diffuse = useIsDiffuse()
  const { t } = useTranslation()
  return (
    <PaperCard
      radius={28}
      padding={20}
      style={styles.container}
      {...(diffuse ? { flat: true, tint: dt.colors.surface, borderColor: dt.colors.line } : {})}
    >
      {diffuse ? (
        <DiffuseBloomIcon color={dt.colors.ink3} size={64} intensity={0.42}>
          <CloudUpload size={30} color={dt.colors.ink2} strokeWidth={1.6} />
        </DiffuseBloomIcon>
      ) : (
        <View style={[styles.iconCircle, { backgroundColor: colors.primaryTint }]}>
          <Ionicons name="cloud-upload-outline" size={32} color={colors.accent} />
        </View>
      )}
      <Text
        style={[
          styles.title,
          diffuse
            ? { color: dt.colors.ink, fontFamily: diffuseFont.display, fontWeight: '400', fontSize: 19, letterSpacing: -0.3 }
            : { color: colors.text },
        ]}
      >
        {t('vault_secureNewDoc')}
      </Text>
      <Text
        style={[
          styles.subtitle,
          diffuse ? { color: dt.colors.ink3, fontFamily: diffuseFont.body } : { color: colors.textMuted },
        ]}
      >
        {t('vault_secureNewDocBody')}
      </Text>

      <View style={styles.buttonRow}>
        <Pressable
          onPress={onCamera}
          style={[
            styles.button,
            diffuse
              ? { backgroundColor: 'transparent', borderColor: dt.colors.line2 }
              : { backgroundColor: colors.surfaceGlass, borderColor: colors.border },
          ]}
        >
          {diffuse ? (
            <Camera size={18} color={dt.colors.ink2} strokeWidth={1.6} />
          ) : (
            <Ionicons name="camera-outline" size={20} color={colors.text} />
          )}
          <Text
            style={[
              styles.buttonText,
              diffuse
                ? { color: dt.colors.ink, fontFamily: diffuseFont.mono, letterSpacing: 1.2, textTransform: 'uppercase', fontSize: 12 }
                : { color: colors.text },
            ]}
          >
            {t('vault_scanBtn')}
          </Text>
        </Pressable>
        <Pressable
          onPress={onFilePick}
          style={[
            styles.button,
            diffuse
              ? { backgroundColor: 'transparent', borderColor: dt.colors.line2 }
              : { backgroundColor: colors.surfaceGlass, borderColor: colors.border },
          ]}
        >
          {diffuse ? (
            <FolderOpen size={18} color={dt.colors.ink2} strokeWidth={1.6} />
          ) : (
            <Ionicons name="folder-outline" size={20} color={colors.text} />
          )}
          <Text
            style={[
              styles.buttonText,
              diffuse
                ? { color: dt.colors.ink, fontFamily: diffuseFont.mono, letterSpacing: 1.2, textTransform: 'uppercase', fontSize: 12 }
                : { color: colors.text },
            ]}
          >
            {t('vault_uploadBtn')}
          </Text>
        </Pressable>
      </View>

      {diffuse ? (
        <Pressable onPress={onFilePick} style={styles.addRecordBtnDiffuse}>
          <Text style={[styles.addRecordTextDiffuse, { color: dt.colors.ink }]}>{t('vault_addRecord')}</Text>
          <DiffuseArrow color={dt.colors.ink3} size={16} />
        </Pressable>
      ) : (
        <Pressable onPress={onFilePick} style={[styles.addRecordBtn, { backgroundColor: colors.accent }]}>
          <Text style={[styles.addRecordText, { color: colors.textInverse }]}>{t('vault_addRecord')}</Text>
        </Pressable>
      )}
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
  addRecordBtnDiffuse: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 8,
    paddingVertical: 10,
  },
  addRecordTextDiffuse: {
    fontSize: 12,
    fontFamily: diffuseFont.mono,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
  },
})
