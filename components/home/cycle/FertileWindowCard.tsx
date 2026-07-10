/**
 * FertileWindowCard — full-width card.
 *
 * Shows today's conception % + 7-day forecast pills + narrative + footer.
 * Tap → opens FertileWindowModal.
 *
 * Pill fills by % bucket (matches the design system stickers):
 *   0–14%:  surfaceRaised  (low)
 *   15–29%: pinkSoft       (mid)
 *   30–59%: pink           (high)
 *   60–100%: coral, white  (peak)
 * Today gets a 2px ink outline-offset.
 */

import { useMemo, useState } from 'react'
import { View, Text, Pressable, StyleSheet } from 'react-native'
import { useTheme, useDiffuseTheme, diffuseFont, getDiffuseAccent } from '../../../constants/theme'
import { useIsDiffuse } from '../../ui/diffuse/DiffuseKit'
import { getCycleInfo, dailyFertilityCurve, type CycleConfig } from '../../../lib/cycleLogic'
import { PaperCard } from '../../ui/PaperCard'
import { FertileWindowModal } from './FertileWindowModal'
import { useTranslation } from '../../../lib/i18n'

interface Props {
  cycleConfig: CycleConfig
}

function bucketTint(pct: number, stickers: ReturnType<typeof useTheme>['stickers'], colors: ReturnType<typeof useTheme>['colors']): { bg: string; fg: string } {
  if (pct >= 60) return { bg: stickers.coral, fg: '#fff' }
  if (pct >= 30) return { bg: stickers.pink, fg: '#141313' }
  if (pct >= 15) return { bg: stickers.pinkSoft, fg: '#141313' }
  return { bg: colors.surfaceRaised, fg: colors.textMuted }
}

function statusFor(pct: number): { label: string; tint: 'low' | 'mid' | 'high' | 'peak' } {
  if (pct >= 60) return { label: 'peak today', tint: 'peak' }
  if (pct >= 30) return { label: 'high today', tint: 'high' }
  if (pct >= 15) return { label: 'rising', tint: 'mid' }
  return { label: 'low today', tint: 'low' }
}

function narrativeFor(pct: number, daysToPeak: number): string {
  if (pct >= 60) return 'Peak fertility — this is your best window.'
  if (pct >= 30) return `Window is opening. Peak in ${daysToPeak} day${daysToPeak === 1 ? '' : 's'}.`
  if (pct >= 15) return `Estrogen is rising. Peak in about ${daysToPeak} days — start LH testing soon.`
  if (daysToPeak >= 0) return `A rising estrogen curve is on its way. Day ${daysToPeak === 0 ? 'today' : '+' + daysToPeak} is your projected peak.`
  return 'Resting phase — next fertile window starts after your period.'
}

export function FertileWindowCard({ cycleConfig }: Props) {
  const { colors, stickers, font, radius, isDark } = useTheme()
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
  const diffuseAccent = getDiffuseAccent('pre-pregnancy', dt.isDark)
  const { t } = useTranslation()
  const [modalOpen, setModalOpen] = useState(false)
  const ink = isDark ? colors.text : '#141313'

  // Diffuse forecast pill: calm accent-tinted fill by % bucket (no filled
  // coral). Higher % → firmer accent border + brighter accent-wash bg.
  function diffuseBucket(pct: number): { bg: string; border: string; fg: string } {
    if (pct >= 60) return { bg: diffuseAccent + '2E', border: dt.colors.hairline, fg: dt.colors.ink }
    if (pct >= 30) return { bg: diffuseAccent + '1C', border: dt.colors.line2, fg: dt.colors.ink }
    if (pct >= 15) return { bg: diffuseAccent + '10', border: dt.colors.line, fg: dt.colors.ink2 }
    return { bg: 'transparent', border: dt.colors.line, fg: dt.colors.ink3 }
  }

  const info = getCycleInfo(cycleConfig)
  const curve = useMemo(
    () => dailyFertilityCurve(cycleConfig.cycleLength, cycleConfig.lutealPhase),
    [cycleConfig.cycleLength, cycleConfig.lutealPhase],
  )

  // 7-day forecast = today + 6 days forward (clamped to cycle length).
  const forecast = useMemo(() => {
    const out: { day: number; pct: number; weekday: string }[] = []
    const todayD = new Date()
    for (let i = 0; i < 7; i++) {
      const d = new Date(todayD)
      d.setDate(d.getDate() + i)
      const wd = d.toLocaleDateString('en-US', { weekday: 'short' })
      const day = ((info.cycleDay - 1 + i) % info.cycleLength) + 1
      out.push({ day, pct: curve[day - 1] ?? 0, weekday: wd })
    }
    return out
  }, [curve, info.cycleDay, info.cycleLength])

  const todayPct = forecast[0]?.pct ?? 0
  const status = statusFor(todayPct)
  const daysToPeak = Math.max(0, info.daysUntilOvulation)
  const narrative = narrativeFor(todayPct, daysToPeak)

  // "Best days this cycle" — the 3 highest-% days from today through the next 14 days
  const bestDays = useMemo(() => {
    const todayD = new Date()
    const arr: { date: Date; pct: number }[] = []
    for (let i = 0; i < 14; i++) {
      const d = new Date(todayD)
      d.setDate(d.getDate() + i)
      const day = ((info.cycleDay - 1 + i) % info.cycleLength) + 1
      arr.push({ date: d, pct: curve[day - 1] ?? 0 })
    }
    arr.sort((a, b) => b.pct - a.pct)
    const top3 = arr.slice(0, 3).sort((a, b) => a.date.getTime() - b.date.getTime())
    if (top3.length === 0) return ''
    const start = top3[0].date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    const end = top3[top3.length - 1].date.toLocaleDateString('en-US', { day: 'numeric' })
    return `${start} – ${end}`
  }, [curve, info.cycleDay, info.cycleLength])

  return (
    <View style={{ paddingHorizontal: 20, marginTop: 12 }}>
      <Pressable onPress={() => setModalOpen(true)} accessibilityRole="button">
        <PaperCard radius={radius.lg} padding={14} style={diffuse ? { borderColor: dt.colors.line } : undefined}>
          <Text style={[styles.label, diffuse ? { color: dt.colors.ink3, fontFamily: diffuseFont.mono, letterSpacing: 2 } : { color: colors.textMuted, fontFamily: font.bodyBold }]}>{t('prepreg_fertile')}</Text>

          <View style={styles.head}>
            <Text style={[styles.pct, diffuse ? { color: dt.colors.ink, fontFamily: diffuseFont.displayLight } : { color: stickers.coral, fontFamily: font.displayBold }]}>
              {todayPct}<Text style={[styles.pctSmall, diffuse ? { color: dt.colors.ink3, fontFamily: diffuseFont.mono } : { color: colors.textMuted, fontFamily: font.body }]}>%</Text>
            </Text>
            <View style={[
              styles.statePill,
              diffuse
                ? { backgroundColor: 'transparent', borderColor: status.tint === 'peak' ? dt.colors.hairline : dt.colors.line2, shadowOpacity: 0 }
                : {
                    backgroundColor: status.tint === 'peak' ? stickers.coral : status.tint === 'high' ? stickers.pink : stickers.pinkSoft,
                    borderColor: ink,
                  },
            ]}>
              <Text style={diffuse
                ? { color: status.tint === 'peak' ? diffuseAccent : dt.colors.ink3, fontFamily: diffuseFont.monoBold, fontSize: 10, letterSpacing: 1.4, textTransform: 'uppercase' }
                : { color: status.tint === 'peak' ? '#fff' : ink, fontFamily: font.bodyBold, fontSize: 10, letterSpacing: 1.4, textTransform: 'uppercase' }}>
                {status.label}
              </Text>
            </View>
          </View>
          <Text style={[styles.narrative, diffuse ? { color: dt.colors.ink2, fontFamily: diffuseFont.body } : { color: colors.textMuted, fontFamily: font.body }]}>
            {narrative}
          </Text>

          <View style={styles.pills}>
            {forecast.map((f, i) => {
              const isToday = i === 0
              const b = diffuse ? diffuseBucket(f.pct) : bucketTint(f.pct, stickers, colors)
              const bg = diffuse ? (b as ReturnType<typeof diffuseBucket>).bg : (b as ReturnType<typeof bucketTint>).bg
              const fg = b.fg
              return (
                <View
                  key={i}
                  style={[
                    styles.pill,
                    {
                      backgroundColor: bg,
                      borderColor: diffuse ? (b as ReturnType<typeof diffuseBucket>).border : colors.border,
                      ...(isToday ? { borderColor: diffuse ? dt.colors.hairline : ink, borderWidth: diffuse ? 1.5 : 2 } : null),
                    },
                  ]}
                >
                  <Text style={{ color: fg, fontFamily: diffuse ? diffuseFont.monoBold : font.displayBold, fontSize: 13 }}>{f.pct}</Text>
                  <Text style={{ color: fg, fontFamily: diffuse ? diffuseFont.mono : font.body, fontSize: 8, letterSpacing: 1, opacity: diffuse ? 1 : 0.85, marginTop: 2, textTransform: 'uppercase' }}>
                    {f.weekday.slice(0, 3)}
                  </Text>
                </View>
              )
            })}
          </View>

          {bestDays !== '' && (
            <View style={[styles.best, { borderTopColor: diffuse ? dt.colors.line2 : colors.border }]}>
              <Text style={diffuse ? { color: dt.colors.ink3, fontFamily: diffuseFont.mono, fontSize: 10, letterSpacing: 0.6, textTransform: 'uppercase' } : { color: colors.textMuted, fontFamily: font.body, fontSize: 11 }}>
                {t('prepreg_fertileWindowBestDays')}
              </Text>
              <Text style={diffuse ? { color: dt.colors.ink, fontFamily: diffuseFont.monoBold, fontSize: 10, letterSpacing: 0.6 } : { color: stickers.coral, fontFamily: font.bodyBold, fontSize: 11 }}>
                {bestDays} {t('common_arrowRight')}
              </Text>
            </View>
          )}
        </PaperCard>
      </Pressable>

      <FertileWindowModal
        visible={modalOpen}
        onClose={() => setModalOpen(false)}
        cycleConfig={cycleConfig}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  label: { fontSize: 10, letterSpacing: 1.6, textTransform: 'uppercase' },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 4 },
  pct: { fontSize: 42, lineHeight: 44 },
  pctSmall: { fontSize: 14, marginLeft: 3 },
  statePill: {
    borderWidth: 1.5, borderRadius: 999,
    paddingVertical: 5, paddingHorizontal: 11,
    shadowColor: '#141313', shadowOpacity: 1, shadowRadius: 0, shadowOffset: { width: 2, height: 2 },
  },
  narrative: { fontSize: 12, lineHeight: 17, marginTop: 8, marginBottom: 12 },
  pills: { flexDirection: 'row', gap: 5 },
  pill: {
    flex: 1, alignItems: 'center', paddingVertical: 8,
    borderRadius: 14, borderWidth: 1,
  },
  best: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginTop: 12, paddingTop: 10, borderTopWidth: 1,
  },
})
