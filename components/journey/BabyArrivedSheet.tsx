/**
 * BabyArrivedSheet — "Baby arrived" (pregnancy → kids).
 *
 * Asks for the birth date (default today; not in the future, not before week 22 of this
 * pregnancy), the name and the sex (both optional, prefilled from the baby saved in
 * profiles.birth_preferences). Confirm runs completeBabyArrived: the child is created the same
 * way Profile → Kids → Add child does, Kids becomes the active journey, Pregnancy ends (logs
 * kept) and its alerts are cancelled. Any server failure → alert, nothing changed, tap again.
 */

import { useEffect, useMemo, useRef, useState } from 'react'
import { View, Text, StyleSheet, Alert } from 'react-native'
import { useTheme, getModeColorSoft } from '../../constants/theme'
import { useIsDiffuse } from '../ui/diffuse/DiffuseKit'
import { LogSheet, SheetFooterAction } from '../calendar/LogSheet'
import DatePickerField from '../ui/DatePickerField'
import { TextField } from '../ui/TextField'
import { SiteChoice } from '../ui/SiteChoice'
import { PillButton } from '../ui/PillButton'
import { EyeAction, ACTION_TONES } from '../ui/AuthDock'
import { MonoCaps } from '../ui/Typography'
import { useTranslation } from '../../lib/i18n'
import { supabase } from '../../lib/supabase'
import { toDateStr } from '../../lib/cycleLogic'
import { usePregnancyStore } from '../../store/usePregnancyStore'
import { useJourneyStore } from '../../store/useJourneyStore'
import { parseLocalDate } from '../../lib/localDate'
import {
  birthDateBounds,
  isBirthDateAllowed,
  childSexFromBabySex,
  resolveBabyName,
  type ChildSex,
} from '../../lib/journeyTransitions'
import { saveBabyArrived } from '../../lib/journeyTransitionActions'
import { afterSheets } from '../../lib/afterSheets'

const SEX_OPTIONS: { value: Exclude<ChildSex, ''>; labelKey: 'kp_pk_boy' | 'kp_pk_girl' | 'kp_pk_other' }[] = [
  { value: 'male', labelKey: 'kp_pk_boy' },
  { value: 'female', labelKey: 'kp_pk_girl' },
  { value: 'other', labelKey: 'kp_pk_other' },
]

export function BabyArrivedSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { colors, font, isDark } = useTheme()
  const diffuse = useIsDiffuse()
  const { t } = useTranslation()
  const dueDate = usePregnancyStore((s) => s.dueDate)
  const tone = getModeColorSoft('pregnancy', isDark)

  const bounds = useMemo(() => birthDateBounds(dueDate), [dueDate, visible]) // eslint-disable-line react-hooks/exhaustive-deps
  const [birthDate, setBirthDate] = useState(() => toDateStr(new Date()))
  const [name, setName] = useState('')
  const [sex, setSex] = useState<ChildSex>('')
  const [saving, setSaving] = useState(false)
  const savingRef = useRef(false)

  // Reset each time the sheet opens (during render, on the closed → open change): today, and the
  // baby name kept from onboarding; the profile's saved baby is fetched below.
  const [wasVisible, setWasVisible] = useState(visible)
  if (visible !== wasVisible) {
    setWasVisible(visible)
    if (visible) {
      setBirthDate(bounds.max)
      setName(useJourneyStore.getState().babyName ?? '')
      setSex('')
    }
  }

  // Prefill from the baby saved on the pregnancy profile (profiles.birth_preferences).
  useEffect(() => {
    if (!visible) return
    let alive = true
    void (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) return
        const { data } = await supabase
          .from('profiles')
          .select('birth_preferences')
          .eq('id', session.user.id)
          .maybeSingle()
        const bp = (data?.birth_preferences ?? {}) as { babyName?: string; babySex?: string }
        if (!alive) return
        if (bp.babyName?.trim()) setName(bp.babyName.trim())
        setSex(childSexFromBabySex(bp.babySex))
      } catch {
        // Prefill is a convenience — the fields stay editable.
      }
    })()
    return () => { alive = false }
  }, [visible]) // eslint-disable-line react-hooks/exhaustive-deps

  const dateOk = isBirthDateAllowed(birthDate, bounds)

  async function confirm() {
    if (savingRef.current || !dateOk) return
    savingRef.current = true
    setSaving(true)
    try {
      const commit = await saveBabyArrived({ birthDate, name: resolveBabyName(name, t('babyArrived_defaultName')), sex })
      // Server side is done; flip the app to Kids once this sheet has finished closing.
      onClose()
      afterSheets(() => { commit() })
    } catch (e) {
      console.warn('[babyArrived] transition failed:', e instanceof Error ? e.message : String(e))
      // Nothing changed (the server steps roll back) — the sheet stays open to try again.
      Alert.alert(t('babyArrived_errorTitle'), t('babyArrived_errorBody'))
    } finally {
      savingRef.current = false
      setSaving(false)
    }
  }

  const label = saving ? t('babyArrived_saving') : t('babyArrived_confirm')

  return (
    <LogSheet visible={visible} title={t('babyArrived_sheetTitle')} onClose={saving ? () => {} : onClose} sticker="baby">
      <View style={styles.form}>
        <Text style={[styles.body, { color: colors.textSecondary, fontFamily: font.body }]}>{t('babyArrived_sheetBody')}</Text>

        <DatePickerField
          label={t('babyArrived_birthDate')}
          value={birthDate}
          onChange={setBirthDate}
          minimumDate={parseLocalDate(bounds.min)}
          maximumDate={parseLocalDate(bounds.max)}
          modalTitle={t('babyArrived_birthDate')}
        />
        {!dateOk ? (
          <Text style={[styles.hint, { color: colors.textMuted, fontFamily: font.body }]}>{t('babyArrived_dateOutOfRange')}</Text>
        ) : null}

        <TextField
          label={t('babyArrived_name')}
          value={name}
          onChangeText={setName}
          placeholder={t('babyArrived_namePlaceholder')}
          autoCapitalize="words"
          returnKeyType="done"
          maxLength={60}
        />

        <View style={{ gap: 8 }}>
          <MonoCaps color={colors.textMuted}>{t('profKids_labelSex')}</MonoCaps>
          <View style={styles.choiceRow}>
            {SEX_OPTIONS.map((opt) => (
              <SiteChoice
                key={opt.value}
                compact
                label={t(opt.labelKey)}
                selected={sex === opt.value}
                tone={tone}
                onPress={() => setSex(sex === opt.value ? '' : opt.value)}
              />
            ))}
          </View>
        </View>

        {diffuse ? (
          <PillButton label={label} onPress={confirm} loading={saving} disabled={!dateOk} style={{ marginTop: 8 }} />
        ) : (
          <SheetFooterAction>
            <EyeAction label={label} onPress={confirm} ink={colors.text} loading={saving} disabled={!dateOk} sticker="baby" fill={ACTION_TONES.lilac} size={64} />
          </SheetFooterAction>
        )}
      </View>
    </LogSheet>
  )
}

const styles = StyleSheet.create({
  form: { gap: 16, paddingBottom: 12 },
  body: { fontSize: 15, lineHeight: 22 },
  hint: { fontSize: 13, lineHeight: 18, marginTop: -8 },
  choiceRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
})
