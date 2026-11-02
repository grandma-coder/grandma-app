/**
 * MenopauseWeekStrip — the 7-day date row under the home ring, mirroring cycle's
 * home strip. Shows the last 7 days (today at the right); a day you logged carries
 * a group-colored dot, today is highlighted. Tapping a day opens the log flow for
 * THAT day (the parent threads the tapped date into the log form via logDate).
 *
 * Dual-variant, tokens-only via the shared MenoPalette + sticker palette.
 */
import { useMemo } from 'react'
import { View, Text, Pressable, StyleSheet } from 'react-native'
import { diffuseFont, useTheme } from '../../constants/theme'
import { symptomStickerKey } from './menopauseIcons'
import { SiteSticker } from '../stickers/SiteSticker'
import { menoSticker } from './MenopauseLogSheet'
import type { MenopauseLogRow } from '../../lib/menopauseAnalytics'
import type { MenoPalette } from './menoPalette'
import { Skeleton } from '../ui/Skeleton'

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
  const { stickers, colors, font } = useTheme()
  const s = stickers as Record<string, string>

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
        weekday: d.toLocaleDateString('en-US', { weekday: 'short' }).slice(0, 2),
        dayNum: d.getDate(),
        isToday: key === todayStr,
        logs: byDate.get(key) ?? [],
      })
    }
    return out
  }, [rows])

  return (
    <View style={styles.strip}>
      {days.map((day) => {
        const logged = day.logs.length > 0
        const hue = logged ? s[symptomStickerKey(day.logs[0].type)] : null
        if (!pal.diffuse) {
          // Site look: card-less day cells — today = soft tone + ink outline; a logged day shows its sticker.
          return (
            <Pressable
              key={day.key}
              onPress={() => onDatePress(day.key)}
              accessibilityRole="button"
              accessibilityLabel={`Log for ${day.weekday} ${day.dayNum}`}
              style={({ pressed }) => [
                styles.cell,
                {
                  backgroundColor: day.isToday ? pal.accentSoft : 'transparent',
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
                {loading ? <Skeleton width={14} height={14} radius={7} /> : logged ? <SiteSticker name={menoSticker(day.logs[0].type)} size={16} /> : null}
              </View>
            </Pressable>
          )
        }
        return (
          <Pressable
            key={day.key}
            onPress={() => onDatePress(day.key)}
            accessibilityRole="button"
            accessibilityLabel={`Log for ${day.weekday} ${day.dayNum}`}
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
