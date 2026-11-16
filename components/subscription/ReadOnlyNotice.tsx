import { useState } from 'react'
import { View, StyleSheet } from 'react-native'
import { router } from 'expo-router'
import { useTheme } from '../../constants/theme'
import { Display, Body } from '../ui/Typography'
import { PillButton } from '../ui/PillButton'
import { useTranslation } from '../../lib/i18n'
import { exportMyDataOnDevice } from '../../lib/dataExport'

interface Props {
  /** Close the surrounding sheet before navigating to the paywall. */
  onClose: () => void
}

/**
 * Shown in place of a log form when the trial/subscription has lapsed.
 * History stays readable and exportable — only new logs need a plan.
 */
export function ReadOnlyNotice({ onClose }: Props) {
  const { colors, spacing } = useTheme()
  const { t } = useTranslation()
  const [exporting, setExporting] = useState(false)

  async function handleExport() {
    setExporting(true)
    try {
      await exportMyDataOnDevice(t('privacy_exportTitle'))
    } finally {
      setExporting(false)
    }
  }

  return (
    <View style={[styles.wrap, { gap: spacing.md }]}>
      <Display size={24}>{t('readOnly_title')}</Display>
      <Body size={15} color={colors.textSecondary}>{t('readOnly_body')}</Body>
      <PillButton
        label={t('readOnly_subscribe')}
        variant="ink"
        height={56}
        onPress={() => {
          onClose()
          router.push('/paywall')
        }}
      />
      <PillButton
        label={exporting ? '…' : t('readOnly_export')}
        variant="paper"
        height={56}
        disabled={exporting}
        onPress={handleExport}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { paddingVertical: 8 },
})
