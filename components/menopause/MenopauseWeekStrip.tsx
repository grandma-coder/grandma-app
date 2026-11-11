/**
 * MenopauseWeekStrip — the 7-day date row under the home ring, mirroring cycle's
 * home strip. Shows the last 7 days (today at the right); a day you logged carries
 * a group-colored dot, today is highlighted. Tapping a day opens the log flow for
 * THAT day (the parent threads the tapped date into the log form via logDate).
 *
 * Dual-variant, tokens-only via the shared MenoPalette + sticker palette.
 */
import { useMemo } from 'react'
import { useTodayKey } from '../../hooks/useTodayKey'
import { View, Text, Pressable, StyleSheet } from 'react-native'
import { diffuseFont, useTheme } from '../../constants/theme'
import { symptomStickerKey } from './menopauseIcons'
import { DayMarks } from '../calendar/AgendaCalendar'
import { menopauseDayMarks } from '../../lib/logStickers'
import { menopauseDayLevel, menopauseDayTint } from '../../lib/menopauseDayLoad'
import type { MenopauseLogRow } from '../../lib/menopauseAnalytics'
import type { MenoPalette } from './menoPalette'
import { Skeleton } from '../ui/Skeleton'
import { useTranslation } from '../../lib/i18n'
import type { AppLanguage } from '../../store/useLanguageStore'

/** Short weekday label: 3 letters for Latin scripts (2 is ambiguous — PT "SE" is both sexta and segunda), the native short/narrow form otherwise. */
function weekdayShort(d: Date, language: AppLanguage): string {
  if (language === 'ar' || language === 'hi') return d.toLocaleDateString(language, { weekday: 'narrow' })
  const short = d.toLocaleDateString(language, { weekday: 'short' })
  return language === 'ja' || language === 'ko' || language === 'zh' ? short : short.replace(/\./g, '').slice(0, 3)
}

function localDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function MenopauseWeekStrip({
  rows,
  pal,
  onDatePress,
  loading = false,
}: {
  rows: MenopauseLogRow[]
  pal: MenoPalette
  onDatePress: (date: string) => void
  /** First load — light look shows a ghost dot where a logged-day sticker goes. */
  loading?: boolean
}) {
  const { stickers, colors, font, isDark } = useTheme()
  const s = stickers as Record<string, string>
  const { t, language } = useTranslation()

  const todayKey = useTodayKey()
  const days = useMemo(() => {
    const byDate = new Map<string, MenopauseLogRow[]>()
    for (const r of rows) {
      const a = byDate.get(r.date) ?? []
      a.push(r)
      byDate.set(r.date, a)
    }
    const today = new Date()
    const todayStr = localDateStr(today)
    const out: { key: string; weekday: string; dayNum: number; isToday: boolean; logs: MenopauseLogRow[] }[] = []
    for (let offset = -6; offset <= 0; offset++) {
      const d = new Date(today)
      d.setDate(today.getDate() + offset)
      const key = localDateStr(d)
      out.push({
        key,
        weekday: weekdayShort(d, language),
        dayNum: d.getDate(),
        isToday: key === todayStr,
        logs: byDate.get(key) ?? [],
      })
    }
    return out
    // todayKey: re-run at midnight so the highlighted day moves while the app stays open.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, language, todayKey])

  return (
    <View style={styles.strip}>
      {days.map((day) => {
        const logged = day.logs.length > 0
        const hue = logged ? s[symptomStickerKey(day.logs[0].type)] : null
        if (!pal.diffuse) {
          // Site look: card-less day cells, tinted peach by how heavy the day was (same tint as
          // the calendar); today = ink outline. Marks only what stands out: period, HRT, the
          // strongest symptom (max 2 + overflow dot).
          const tint = menopauseDayTint(menopauseDayLevel(day.logs), stickers.peach, isDark)
          return (
            <Pressable
              key={day.key}
              onPress={() => onDatePress(day.key)}
              accessibilityRole="button"
              accessibilityLabel={t('meno_h_log_for_a11y', { day: `${day.weekday} ${day.dayNum}` })}
              style={({ pressed }) => [
                styles.cell,
                {
                  backgroundColor: tint ?? 'transparent',
                  borderColor: day.isToday ? colors.text : 'transparent',
                  borderWidth: 1.5,
                  borderRadius: 14,
                  opacity: pressed ? 0.6 : 1,
                },
              ]}
            >
              <Text style={{ fontFamily: 'SpaceMono_400Regular', fontSize: 10, letterSpacing: 1.4, textTransform: 'uppercase', color: colors.textMuted }}>
                {day.weekday}
              </Text>
              <Text style={{ fontFamily: font.displayBold, fontSize: 17, lineHeight: 20, color: colors.text }}>{day.dayNum}</Text>
              <View style={{ height: 16, alignItems: 'center', justifyContent: 'center' }}>
                {loading ? <Skeleton width={14} height={14} radius={7} /> : logged ? <DayMarks stickers={menopauseDayMarks(day.logs)} max={2} size={14} /> : null}
              </View>
            </Pressable>
          )
        }
        return (
          <Pressable
            key={day.key}
            onPress={() => onDatePress(day.key)}
            accessibilityRole="button"
            accessibilityLabel={t('meno_h_log_for_a11y', { day: `${day.weekday} ${day.dayNum}` })}
            style={({ pressed }) => [
              styles.cell,
              {
                backgroundColor: day.isToday ? pal.accentSoft : pal.surface,
                borderColor: day.isToday ? pal.accent : pal.border,
                borderRadius: pal.diffuse ? pal.radius.md : pal.radius.lg,
                opacity: pressed ? 0.7 : 1,
              },
            ]}
          >
            <Text
              style={[
                styles.weekday,
                {
                  color: day.isToday ? pal.accent : pal.textMuted,
                  fontFamily: pal.diffuse ? diffuseFont.mono : pal.fontBodySemiBold,
                },
              ]}
            >
              {day.weekday}
            </Text>
            <Text style={[styles.dayNum, { color: pal.text, fontFamily: pal.fontDisplay }]}>{day.dayNum}</Text>
            <View
              style={[
                styles.dot,
                logged ? { backgroundColor: hue as string } : { backgroundColor: pal.border },
              ]}
            />
          </Pressable>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  strip: { flexDirection: 'row', gap: 6 },
  cell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    gap: 4,
    borderWidth: 1,
  },
  weekday: { fontSize: 9.5, letterSpacing: 0.6, textTransform: 'uppercase' },
  dayNum: { fontSize: 16, lineHeight: 18, letterSpacing: -0.2 },
  dot: { width: 5, height: 5, borderRadius: 2.5, marginTop: 1 },
})
