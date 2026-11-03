/**
 * FirstPeriodCard — shown on the cycle home instead of the ring while no period has been logged.
 * The home used to invent a cycle (last period = 10 days ago) and draw phases, a fertile window
 * and "next period in N days" that weren't based on anything the user told us. Now it asks for the
 * real date first; the ring appears as soon as one period start is logged.
 */

import { useState } from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { useTheme } from '../../../constants/theme'
import { useTranslation } from '../../../lib/i18n'
import { toDateStr } from '../../../lib/cycleLogic'
import { SiteSticker } from '../../stickers/SiteSticker'
import DatePickerField from '../../ui/DatePickerField'
import { PillButton } from '../../ui/PillButton'

const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000

export function FirstPeriodCard({ onLog }: { onLog: (date: string) => void }) {
  const { colors, font } = useTheme()
  const { t } = useTranslation()
  const [date, setDate] = useState('')

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.text }]}>
      <View style={styles.head}>
        <SiteSticker name="drop" size={40} />
        <Text style={[styles.title, { color: colors.text, fontFamily: font.display }]}>
          {t('cycleHome_firstPeriod_title')}
        </Text>
      </View>
      <Text style={[styles.body, { color: colors.textSecondary, fontFamily: font.body }]}>
        {t('cycleHome_firstPeriod_body')}
      </Text>
      <DatePickerField
        label={t('cycleHome_firstPeriod_dateLabel')}
        value={date}
        onChange={setDate}
        placeholder={t('cycleHome_firstPeriod_datePlaceholder')}
        maximumDate={new Date()}
        minimumDate={new Date(Date.now() - NINETY_DAYS_MS)}
      />
      <PillButton
        label={t('cycleHome_firstPeriod_cta')}
        onPress={() => onLog(date || toDateStr(new Date()))}
        disabled={!date}
        style={{ marginTop: 14 }}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  card: { borderWidth: 1.5, borderRadius: 24, padding: 18, marginHorizontal: 20, marginTop: 8, gap: 10 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  title: { flex: 1, fontSize: 22, lineHeight: 26, textTransform: 'uppercase' },
  body: { fontSize: 15, lineHeight: 21 },
})
