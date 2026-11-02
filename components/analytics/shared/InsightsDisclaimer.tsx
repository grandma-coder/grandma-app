/** Compliance footer for every insights page — tracking & information only, not a medical device. */
import { Text } from 'react-native'
import { useTheme } from '../../../constants/theme'
import { useTranslation } from '../../../lib/i18n'

export function InsightsDisclaimer() {
  const { colors, font } = useTheme()
  const { t } = useTranslation()
  return (
    <Text style={{ fontFamily: font.body, fontSize: 12, lineHeight: 17, color: colors.textMuted, textAlign: 'center', marginTop: 28, marginBottom: 8, marginHorizontal: 28 }}>
      {t('disclaimer_short')}
    </Text>
  )
}
