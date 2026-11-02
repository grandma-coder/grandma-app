/**
 * ExamMonthBars — "exams over time" as simple month bars (site look).
 *
 * One column per month, labels aligned under each bar. The bar is the month's exam count
 * in the journey's soft tone; the flagged part sits on top in warm peach. Empty months get
 * a short ink tick so the timeline still reads. Count above each non-empty bar, the
 * current month's label in bold. Bars grow up one after another.
 */

import { useEffect, useRef } from 'react'
import { Animated, Text, View, StyleSheet } from 'react-native'
import { useTheme, stickers } from '../../constants/theme'
import type { ExamMonthBucket } from '../../lib/examData'

const MAX_H = 84

function Bar({ m, max, tone, index, isCurrent }: { m: ExamMonthBucket; max: number; tone: string; index: number; isCurrent: boolean }) {
  const { colors, font } = useTheme()
  const ink = colors.text
  const grow = useRef(new Animated.Value(0)).current
  useEffect(() => {
    Animated.spring(grow, { toValue: 1, friction: 7, tension: 70, delay: 80 + index * 50, useNativeDriver: false }).start()
  }, [grow, index])
  const h = m.count > 0 ? Math.max(14, (m.count / max) * MAX_H) : 0
  const flaggedH = m.count > 0 ? (m.flagged / m.count) * h : 0
  return (
    <View style={styles.col}>
      <View style={[styles.barArea, { borderBottomColor: ink }]}>
        {m.count > 0 ? (
          <>
            <Text style={[styles.count, { color: ink, fontFamily: font.bodyBold }]}>{m.count}</Text>
            <Animated.View style={[styles.bar, { borderColor: ink, height: grow.interpolate({ inputRange: [0, 1], outputRange: [0, h] }) }]}>
              {flaggedH > 0 ? <View style={{ height: flaggedH, backgroundColor: stickers.peachSoft, borderBottomWidth: 1.5, borderBottomColor: ink }} /> : null}
              <View style={{ flex: 1, backgroundColor: tone }} />
            </Animated.View>
          </>
        ) : (
          <View style={[styles.tick, { backgroundColor: colors.border }]} />
        )}
      </View>
      <Text style={[styles.label, { color: isCurrent ? ink : colors.textMuted, fontFamily: isCurrent ? font.bodyBold : font.body }]} numberOfLines={1}>
        {m.label}
      </Text>
    </View>
  )
}

export function ExamMonthBars({ months, tone, flaggedLabel }: { months: ExamMonthBucket[]; tone: string; flaggedLabel: string }) {
  const { colors, font } = useTheme()
  const shown = months.slice(-12)
  const max = Math.max(1, ...shown.map((m) => m.count))
  const now = new Date()
  const currentKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const anyFlagged = shown.some((m) => m.flagged > 0)
  return (
    <View>
      <View style={styles.row}>
        {shown.map((m, i) => <Bar key={m.key} m={m} max={max} tone={tone} index={i} isCurrent={m.key === currentKey} />)}
      </View>
      {anyFlagged ? (
        <View style={styles.legend}>
          <View style={[styles.swatch, { backgroundColor: stickers.peachSoft, borderColor: colors.text }]} />
          <Text style={[styles.legendText, { color: colors.textSecondary, fontFamily: font.body }]}>{flaggedLabel}</Text>
        </View>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 6 },
  col: { flex: 1, alignItems: 'center' },
  barArea: { height: MAX_H + 22, justifyContent: 'flex-end', alignItems: 'center', alignSelf: 'stretch', borderBottomWidth: 1.5 },
  count: { fontSize: 13, marginBottom: 4 },
  bar: { alignSelf: 'stretch', marginHorizontal: 6, borderWidth: 1.5, borderBottomWidth: 0, borderTopLeftRadius: 8, borderTopRightRadius: 8, overflow: 'hidden' },
  tick: { width: 14, height: 3, borderRadius: 2, marginBottom: 2 },
  label: { fontSize: 12, marginTop: 8 },
  legend: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  swatch: { width: 12, height: 12, borderRadius: 3, borderWidth: 1.5 },
  legendText: { fontSize: 12 },
})
