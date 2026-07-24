import { View, Text, Pressable, StyleSheet, ActivityIndicator } from 'react-native'
import { useTheme, useDiffuseTheme, diffuseFont, font, radius } from '../../constants/theme'
import { Character } from '../characters/Characters'
import { useTranslation } from '../../lib/i18n'

interface ScanSourceButtonsProps {
  onPick: (source: 'camera' | 'library') => void
  scanning?: boolean
  variant: 'current' | 'diffuse'
  accent: string
  accentText?: string
}

/** One clear food-scan control: an eyebrow + two source pills (Take Photo /
 *  Gallery). Both call onPick(source); the parent owns the picker + AI scan.
 *  Token-driven; supports the current and Diffuse variants. */
export function ScanSourceButtons({
  onPick, scanning = false, variant, accent, accentText,
}: ScanSourceButtonsProps) {
  const { colors } = useTheme()
  const dt = useDiffuseTheme()
  const { t } = useTranslation()
  const diffuse = variant === 'diffuse'

  const textFont = diffuse ? diffuseFont.monoBold : font.bodySemiBold
  const textTransform = diffuse ? ('uppercase' as const) : ('none' as const)
  const letterSpacing = diffuse ? 0.5 : 0
  const fontSize = diffuse ? 12 : 15
  const primaryText = diffuse ? accent : (accentText ?? colors.textInverse)

  return (
    <View style={styles.wrap}>
      <Text style={[
        styles.eyebrow,
        diffuse
          ? { color: dt.colors.ink3, fontFamily: diffuseFont.mono, letterSpacing: 2, textTransform: 'uppercase', fontSize: 10 }
          : { color: colors.textMuted, fontFamily: font.bodyMedium, fontSize: 12 },
      ]}>
        {t('kids_logForm_scanPlate')}
      </Text>

      {scanning ? (
        <View style={[styles.pill, styles.scanningRow, { borderWidth: 1, borderColor: diffuse ? dt.colors.line : colors.border }]}>
          <ActivityIndicator size="small" color={diffuse ? dt.colors.ink : accent} />
          <Text style={{ color: diffuse ? dt.colors.ink : colors.text, fontFamily: textFont, letterSpacing, textTransform, fontSize }}>
            {t('kids_logForm_readingPlate')}
          </Text>
        </View>
      ) : (
        <View style={styles.row}>
          <Pressable
            onPress={() => onPick('camera')}
            style={[styles.pill, diffuse
              ? { backgroundColor: accent + '1F', borderColor: accent, borderWidth: 1 }
              : { backgroundColor: accent }]}
          >
            <Character name="photo" size={18} color={primaryText} />
            <Text style={{ color: primaryText, fontFamily: textFont, letterSpacing, textTransform, fontSize }}>
              {t('kids_logForm_alertTakePhoto')}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => onPick('library')}
            style={[styles.pill, diffuse
              ? { backgroundColor: 'transparent', borderColor: dt.colors.line, borderWidth: 1 }
              : { backgroundColor: colors.surfaceGlass, borderColor: colors.border, borderWidth: 1 }]}
          >
            <Character name="photo" size={18} color={diffuse ? dt.colors.ink : colors.text} />
            <Text style={{ color: diffuse ? dt.colors.ink : colors.text, fontFamily: textFont, letterSpacing, textTransform, fontSize }}>
              {t('kids_foodDash_gallery')}
            </Text>
          </Pressable>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { gap: 10 },
  eyebrow: {},
  row: { flexDirection: 'row', gap: 10 },
  pill: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16, borderRadius: radius.md },
  scanningRow: {},
})
