/**
 * SimplePregnancyLogForm — shared numpad-input log form for numeric
 * pregnancy metrics (water, weight, sleep, exercise, nutrition).
 *
 * Used by:
 * - components/home/pregnancy/VitalsCarousel.tsx (via vital card tap)
 * - components/home/PregnancyHome.tsx (via Today's Routines chip tap)
 * - components/home/pregnancy/RemindersSection.tsx (via reminder card tap)
 */

import { SheetFooterAction } from './LogSheet'
import { EyeAction, ACTION_TONES } from '../ui/AuthDock'
import React, { useState } from 'react'
import {
  View, Text, Pressable, StyleSheet, Dimensions, ActivityIndicator, Alert,
} from 'react-native'
import { useTheme, useDiffuseTheme, diffuseFont, getDiffuseAccent, brand, font, getModeColorSoft } from '../../constants/theme'
import { SiteSticker, type SiteStickerName } from '../stickers/SiteSticker'
import { useIsDiffuse, DiffuseArrow } from '../ui/diffuse/DiffuseKit'
import { supabase } from '../../lib/supabase'
import { invalidatePregnancyLogQueries, queryClient } from '../../lib/queryClient'
import { toDateStr } from '../../lib/cycleLogic'
import { useTranslation, type TranslationKey } from '../../lib/i18n'
import {
  LogWeight, LogWater, LogSleep, LogExercise,
} from '../stickers/RewardStickers'

const SCREEN_W = Dimensions.get('window').width

const SITE_STICKER: Record<'weight' | 'water' | 'sleep' | 'exercise', SiteStickerName> = {
  weight: 'me', water: 'drop', sleep: 'moon', exercise: 'shoe',
}

export type SimpleLogType = 'weight' | 'water' | 'sleep' | 'exercise'

interface Props {
  type: SimpleLogType
  userId: string | undefined
  onSaved: () => void
}

type StickerFn = (props: { size?: number; fill?: string; stroke?: string }) => React.ReactElement

const CONFIGS: Record<SimpleLogType, {
  label: TranslationKey
  placeholder: TranslationKey
  unit: string
  keyboard: 'decimal-pad' | 'number-pad'
  Sticker: StickerFn
}> = {
  weight:    { label: 'sw1_slog_weight',   placeholder: 'sw1_slog_phWeight',              unit: 'kg',      keyboard: 'decimal-pad', Sticker: LogWeight },
  water:     { label: 'sw1_slog_water',    placeholder: 'sw1_slog_phWater',    unit: 'sw1_slog_unitGlasses', keyboard: 'number-pad',  Sticker: LogWater },
  sleep:     { label: 'sw1_slog_sleep',    placeholder: 'sw1_slog_phSleep',   unit: 'sw1_slog_unitHours',   keyboard: 'decimal-pad', Sticker: LogSleep },
  exercise:  { label: 'sw1_slog_exercise', placeholder: 'sw1_slog_phExercise',        unit: 'sw1_slog_unitMin',     keyboard: 'number-pad',  Sticker: LogExercise },
}

export function SimplePregnancyLogForm({ type, userId, onSaved }: Props) {
  const { colors, isDark } = useTheme()
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
  const dAccent = getDiffuseAccent('preg', dt.isDark)
  const { t } = useTranslation()
  const [value, setValue] = useState('')
  const [saving, setSaving] = useState(false)

  const cfg = CONFIGS[type]

  const handleSave = async () => {
    if (!userId || !value.trim()) return
    setSaving(true)
    const today = toDateStr(new Date())
    const trimmed = value.trim()

    // Optimistic patch — chip flips ✓ before the network call returns.
    const todayKey = ['pregnancy-today-logs', userId]
    const previousToday = queryClient.getQueryData<Record<string, { value: string | null; notes: string | null; created_at: string }>>(todayKey)
    queryClient.setQueryData(todayKey, {
      ...(previousToday ?? {}),
      [type]: { value: trimmed, notes: null, created_at: new Date().toISOString() },
    })
    // Close the form immediately for snappy feedback.
    onSaved()
    setSaving(false)

    try {
      const { error } = await supabase.from('pregnancy_logs').insert({
        user_id: userId,
        log_date: today,
        log_type: type,
        value: trimmed,
      })
      if (error) throw error
    } catch (e) {
      // Roll back the optimistic chip AND tell the user — otherwise the ✓
      // silently un-flips and the log appears lost with no explanation.
      queryClient.setQueryData(todayKey, previousToday)
      const msg = e instanceof Error ? e.message : t('common_tryAgain')
      Alert.alert(t('sw1_common_couldntSave'), msg)
      return
    }
    void invalidatePregnancyLogQueries()
  }

  const canSave = !!value.trim()

  if (!diffuse) {
    const tone = getModeColorSoft('preg', isDark)
    return (
      <View style={styles.form}>
        <View style={styles.header}>
          <SiteSticker name={SITE_STICKER[type]} size={34} cut />
          <Text style={[styles.title, { color: colors.text, fontFamily: font.display, textTransform: 'uppercase', letterSpacing: 0.3 }]}>{t(cfg.label)}</Text>
        </View>

        <View style={[styles.siteInput, { backgroundColor: colors.surface, borderColor: colors.text }]}>
          <Text
            style={{ flex: 1, fontSize: value ? 30 : 16, fontFamily: value ? font.displayBold : font.body, color: value ? colors.text : colors.textMuted }}
            numberOfLines={1}
          >
            {value || t(cfg.placeholder)}
          </Text>
          <Text style={{ fontSize: 13, fontFamily: 'SpaceMono_400Regular', letterSpacing: 1.4, textTransform: 'uppercase', color: colors.textMuted }}>{cfg.unit.startsWith('sw1_') ? t(cfg.unit as TranslationKey) : cfg.unit}</Text>
        </View>

        <View style={styles.numpad}>
          {['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', '⌫'].map((key) => (
            <Pressable
              key={key}
              onPress={() => {
                if (key === '⌫') setValue((v) => v.slice(0, -1))
                else if (key === '.' && (value.includes('.') || cfg.keyboard === 'number-pad')) return
                else setValue((v) => v + key)
              }}
              style={({ pressed }) => [styles.key, { backgroundColor: pressed ? tone : 'transparent' }]}
            >
              <Text style={{ fontSize: 24, fontFamily: font.displayBold, color: colors.text }}>{key}</Text>
            </Pressable>
          ))}
        </View>

        <SheetFooterAction>
          <View style={{ alignItems: 'center' }}>
            <EyeAction label={t('common_save')} onPress={handleSave} ink={colors.text} loading={saving} disabled={saving || !value.trim()} sticker="pencil" fill={ACTION_TONES.yellow} size={64} />
          </View>
        </SheetFooterAction>
      </View>
    )
  }

  return (
    <View style={styles.form}>
      <View style={styles.header}>
        <cfg.Sticker size={32} />
        <Text style={[styles.title, { color: diffuse ? dt.colors.ink : colors.text, fontFamily: diffuse ? diffuseFont.display : font.display }]}>{t(cfg.label)}</Text>
      </View>

      <View style={[styles.input, diffuse
        ? { backgroundColor: 'transparent', borderColor: dt.colors.line, borderRadius: 18 }
        : { backgroundColor: colors.surfaceGlass, borderColor: colors.border }]}>
        <Text
          style={[styles.inputText, { color: value ? (diffuse ? dt.colors.ink : colors.text) : (diffuse ? dt.colors.ink4 : colors.textMuted), fontFamily: diffuse ? diffuseFont.display : font.display }]}
          numberOfLines={1}
        >
          {value || t(cfg.placeholder)}
        </Text>
        <Text style={[styles.unit, { color: diffuse ? dt.colors.ink3 : colors.textMuted, fontFamily: diffuse ? diffuseFont.mono : font.body }]}>{cfg.unit.startsWith('sw1_') ? t(cfg.unit as TranslationKey) : cfg.unit}</Text>
      </View>

      <View style={styles.numpad}>
        {['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', '⌫'].map((key) => (
          <Pressable
            key={key}
            onPress={() => {
              if (key === '⌫') setValue((v) => v.slice(0, -1))
              else if (key === '.' && (value.includes('.') || cfg.keyboard === 'number-pad')) return
              else setValue((v) => v + key)
            }}
            style={({ pressed }) => [
              styles.key,
              diffuse
                ? { backgroundColor: pressed ? dt.colors.surfaceRaised : 'transparent', borderWidth: 1, borderColor: dt.colors.line, borderRadius: 14 }
                : { backgroundColor: pressed ? colors.surfaceRaised : colors.surfaceGlass },
            ]}
          >
            <Text style={[styles.keyText, { color: diffuse ? dt.colors.ink : colors.text, fontFamily: diffuse ? diffuseFont.display : font.display }]}>{key}</Text>
          </Pressable>
        ))}
      </View>

      {diffuse ? (
        <Pressable
          onPress={saving || !canSave ? undefined : handleSave}
          style={[styles.saveBtnD, { borderTopColor: dt.colors.line2, opacity: canSave ? 1 : 0.45 }]}
        >
          {saving ? (
            <ActivityIndicator color={dt.colors.ink} />
          ) : (
            <>
              <Text style={[styles.saveTextD, { color: dt.colors.ink, fontFamily: diffuseFont.monoBold }]}>{t('common_save')}</Text>
              <DiffuseArrow color={dAccent} size={18} />
            </>
          )}
        </Pressable>
      ) : (
        <SheetFooterAction>
          <View style={{ alignItems: 'center' }}>
            <EyeAction label={t('common_save')} onPress={handleSave} ink={colors.text} loading={saving} disabled={saving || !value.trim()} sticker="pencil" fill={ACTION_TONES.yellow} size={64} />
          </View>
        </SheetFooterAction>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  form: { padding: 24, gap: 16 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  title: { fontSize: 20, fontFamily: font.display, textAlign: 'center' },
  input: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderRadius: 16, paddingHorizontal: 20, paddingVertical: 14, borderWidth: 1,
  },
  inputText: { fontSize: 18, fontFamily: font.display, flex: 1 },
  unit: { fontSize: 13, fontFamily: font.body },
  siteInput: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderRadius: 14, paddingHorizontal: 18, minHeight: 60, borderWidth: 1.5,
  },
  numpad: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  key: {
    width: (SCREEN_W - 48 - 16) / 3 - 6,
    paddingVertical: 14, borderRadius: 12, alignItems: 'center',
  },
  keyText: { fontSize: 18, fontFamily: font.display },
  saveBtn: { borderRadius: 999, paddingVertical: 16, alignItems: 'center' },
  saveText: { fontSize: 16, fontFamily: font.bodySemiBold },
  saveBtnD: {
    marginTop: 2,
    paddingTop: 18,
    borderTopWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  saveTextD: { fontSize: 13, letterSpacing: 2, textTransform: 'uppercase' },
})
