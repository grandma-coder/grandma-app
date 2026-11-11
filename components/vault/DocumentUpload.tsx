import { View, Text, Pressable, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { CloudUpload, Camera, FolderOpen } from 'lucide-react-native'
import { PaperCard } from '../ui/PaperCard'
import { useTheme, borderRadius, useDiffuseTheme, diffuseFont } from '../../constants/theme'
import { SiteSticker } from '../stickers/SiteSticker'
import { PillButton } from '../ui/PillButton'
import { useIsDiffuse, DiffuseArrow } from '../ui/diffuse/DiffuseKit'
import { DiffuseBloomIcon } from '../ui/diffuse/DiffusePrimitives'
import { useTranslation } from '../../lib/i18n'

interface DocumentUploadProps {
  onCamera?: () => void
  onFilePick?: () => void
}

export function DocumentUpload({ onCamera, onFilePick }: DocumentUploadProps) {
  const { colors, font } = useTheme()
  const dt = useDiffuseTheme()
  const diffuse = useIsDiffuse()
  const { t } = useTranslation()
  const Wrap = diffuse ? PaperCard : View
  const wrapProps = diffuse
    ? { radius: 28, padding: 20, style: styles.container, flat: true, tint: dt.colors.surface, borderColor: dt.colors.line }
    : { style: [styles.container, styles.siteWrap] }
  return (
    <Wrap {...(wrapProps as any)}>
      {diffuse ? (
        <DiffuseBloomIcon color={dt.colors.ink3} size={64} intensity={0.42}>
          <CloudUpload size={30} color={dt.colors.ink2} strokeWidth={1.6} />
        </DiffuseBloomIcon>
      ) : (
        <View style={styles.siteSticker}>
          <SiteSticker name="doc" size={64} cut />
        </View>
      )}
      <Text
        style={[
          styles.title,
          diffuse
            ? { color: dt.colors.ink, fontFamily: diffuseFont.display, fontWeight: '400', fontSize: 19, letterSpacing: -0.3 }
            : { color: colors.text, fontFamily: font.display, fontWeight: '400', textTransform: 'uppercase', letterSpacing: 0.3, fontSize: 20 },
        ]}
      >
        {t('vault_secureNewDoc')}
      </Text>
      <Text
        style={[
          styles.subtitle,
          diffuse ? { color: dt.colors.ink3, fontFamily: diffuseFont.body } : { color: colors.textSecondary, fontFamily: font.body, fontSize: 14 },
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
              : { backgroundColor: colors.surface, borderColor: colors.text, borderWidth: 1.5 },
          ]}
        >
          {diffuse ? (
            <Camera size={18} color={dt.colors.ink2} strokeWidth={1.6} />
          ) : (
            <SiteSticker name="camera" size={26} />
          )}
          <Text
            style={[
              styles.buttonText,
              diffuse
                ? { color: dt.colors.ink, fontFamily: diffuseFont.mono, letterSpacing: 1.2, textTransform: 'uppercase', fontSize: 12 }
                : { color: colors.text, fontFamily: font.bodyBold, fontWeight: '400' },
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
              : { backgroundColor: colors.surface, borderColor: colors.text, borderWidth: 1.5 },
          ]}
        >
          {diffuse ? (
            <FolderOpen size={18} color={dt.colors.ink2} strokeWidth={1.6} />
          ) : (
            <SiteSticker name="doc" size={26} />
          )}
          <Text
            style={[
              styles.buttonText,
              diffuse
                ? { color: dt.colors.ink, fontFamily: diffuseFont.mono, letterSpacing: 1.2, textTransform: 'uppercase', fontSize: 12 }
                : { color: colors.text, fontFamily: font.bodyBold, fontWeight: '400' },
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
        <PillButton label={t('vault_addRecord')} variant="ink" onPress={onFilePick} height={50} />
      )}
    </Wrap>
  )
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 28,
    marginBottom: 20,
  },
  siteWrap: { paddingHorizontal: 4 },
  siteSticker: { marginBottom: 12 },
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
