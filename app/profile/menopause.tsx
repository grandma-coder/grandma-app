/**
 * Menopause settings — edit the stage (peri / meno / post) and the last period date after
 * onboarding. Site look (light) only: the row that opens this screen lives in the light
 * Settings list. Stage is always the user's own call, never a diagnosis.
 *
 * Save = same profiles upsert the onboarding does, then the local menopause store.
 */

import { useMenopauseLogs } from '../../lib/menopauseAnalytics'
import { latestPeriodDate } from '../../lib/menopauseStage'
import { useEffect, useRef, useState } from 'react'
import { View, Text, Pressable, ScrollView, Alert, StyleSheet } from 'react-native'
import { router } from 'expo-router'
import { useTheme, getModeColorSoft } from '../../constants/theme'
import { useTranslation } from '../../lib/i18n'
import { supabase } from '../../lib/supabase'
import { queryClient } from '../../lib/queryClient'
import { assertNotFuture } from '../../lib/futureDate'
import type { MenopauseStage } from '../../lib/menopauseStage'
import { useMenopauseStore } from '../../store/useMenopauseStore'
import { SiteHeader, SiteEyebrow } from '../../components/profile/SiteSettingsKit'
import { SiteChoice } from '../../components/ui/SiteChoice'
import { PillButton } from '../../components/ui/PillButton'
import DatePickerField from '../../components/ui/DatePickerField'
import { useSavedToast } from '../../components/ui/SavedToast'
import type { SiteStickerName } from '../../components/stickers/SiteSticker'

// Same stickers the onboarding stage step uses.
const STAGE_STICKERS: Record<MenopauseStage, SiteStickerName> = { peri: 'moon', meno: 'moon2', post: 'leaf' }

export default function MenopauseSettingsScreen() {
  const { colors, font } = useTheme()
  const { t } = useTranslation()
  const toast = useSavedToast()
  const soft = getModeColorSoft('menopause')

  const storedStage = useMenopauseStore((s) => s.stage)
  const storedLastPeriod = useMenopauseStore((s) => s.lastPeriodDate)
  const [stage, setStage] = useState<MenopauseStage | null>(storedStage)
  const [lastPeriod, setLastPeriod] = useState<string>(storedLastPeriod ?? '')
  // Start from the newest period she logged when it's later than the stored date — the same date
  // the home counter uses.
  const { data: logRows } = useMenopauseLogs()
  const seeded = useRef(false)
  useEffect(() => {
    if (seeded.current || !logRows) return
    seeded.current = true
    const latest = latestPeriodDate(logRows, storedLastPeriod)
    if (latest && latest !== storedLastPeriod) setLastPeriod(latest)
  }, [logRows, storedLastPeriod])
  const [saving, setSaving] = useState(false)

  const options: { id: MenopauseStage; label: string; desc: string }[] = [
    { id: 'peri', label: t('report_meno_stage_peri'), desc: t('meno_ob_stage_peri_desc') },
    { id: 'meno', label: t('meno_ob_stage_meno_label'), desc: t('meno_ob_stage_meno_desc') },
    { id: 'post', label: t('report_meno_stage_post'), desc: t('meno_ob_stage_post_desc') },
  ]

  async function handleSave() {
    if (saving || !stage) return
    setSaving(true)
    try {
      const date = lastPeriod || null
      if (date) assertNotFuture(date)
      const { data } = await supabase.auth.getSession()
      const userId = data.session?.user.id
      if (!userId) throw new Error('no session')
      // upsert (not update): same as the onboarding — a missing profiles row must not lose the edit.
      const { error } = await supabase
        .from('profiles')
        .upsert({ id: userId, menopause_stage: stage, last_period_date: date }, { onConflict: 'id' })
      if (error) throw error
      useMenopauseStore.getState().setStage(stage)
      useMenopauseStore.getState().setLastPeriodDate(date)
      queryClient.invalidateQueries({ queryKey: ['profile'] })
      toast.show({ title: t('meno_set_savedTitle'), message: t('meno_set_savedMsg'), autoDismiss: 1600 })
      setTimeout(() => router.back(), 900)
    } catch {
      // Never surface the raw (English) error text.
      Alert.alert(t('common_saveFailed'), t('common_checkConnection'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      <SiteHeader title={t('app_journey_menopause')} sticker="flame" subtitle={t('meno_set_subtitle')} />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <SiteEyebrow style={{ marginTop: 8 }}>{t('meno_set_sectionStage')}</SiteEyebrow>
        <View style={styles.choices}>
          {options.map((o) => (
            <SiteChoice
              key={o.id}
              label={o.label}
              sub={o.desc}
              selected={stage === o.id}
              onPress={() => setStage(o.id)}
              tone={soft}
              sticker={STAGE_STICKERS[o.id]}
              align="start"
            />
          ))}
        </View>
        <Text style={[styles.note, { color: colors.textMuted, fontFamily: font.body }]}>{t('meno_ob_stage_note')}</Text>

        <SiteEyebrow>{t('meno_set_sectionLastPeriod')}</SiteEyebrow>
        <View style={{ marginTop: 10 }}>
          <DatePickerField
            label=""
            value={lastPeriod}
            onChange={setLastPeriod}
            placeholder={t('meno_ob_last_skip')}
            modalTitle={t('meno_ob_last_q')}
            maximumDate={new Date()}
            accentColor={colors.text}
          />
        </View>
        {lastPeriod ? (
          <Pressable onPress={() => setLastPeriod('')} hitSlop={8} accessibilityRole="button" style={styles.clear}>
            <Text style={{ color: colors.textSecondary, fontFamily: font.bodySemiBold, fontSize: 14, textDecorationLine: 'underline' }}>
              {t('meno_set_clearDate')}
            </Text>
          </Pressable>
        ) : null}

        <PillButton
          label={t('common_save')}
          variant="ink"
          onPress={handleSave}
          loading={saving}
          disabled={saving || !stage}
          style={{ marginTop: 28 }}
        />
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 48 },
  choices: { gap: 10, marginTop: 10 },
  note: { fontSize: 13, lineHeight: 19, marginTop: 12, paddingHorizontal: 4 },
  clear: { alignSelf: 'flex-start', marginTop: 12, paddingHorizontal: 4 },
})
