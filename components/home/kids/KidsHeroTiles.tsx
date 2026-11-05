/**
 * Kids home hero tiles — site look.
 *
 * Four hand-drawn tone cards (sleep / mood / food / activity), each with a sticker disc,
 * a Space Mono eyebrow, a big count-up number and a hand-drawn meter. Multi-day ranges
 * show per-night / per-day averages so the number matches its label and target.
 *
 * Motion: cards rise in one after another, numbers count up, stickers sway, cards squash
 * on press (light haptic).
 */

import { dateLoc } from '../../../lib/kpLocale'
import { useEffect, useRef, useState } from 'react'
import { Animated, Easing, Pressable, Text, View, StyleSheet } from 'react-native'
import Svg, { Path } from 'react-native-svg'
import * as Haptics from 'expo-haptics'
import { useTheme, stickers } from '../../../constants/theme'
import { useTranslation, type TranslationKey } from '../../../lib/i18n'
import { SiteSticker, type SiteStickerName } from '../../stickers/SiteSticker'
import { HandDrawnPill } from '../../ui/HandDrawn'
import { FadeUp, useIdleSway, FadeIn } from '../../ui/Motion'
import { Skeleton } from '../../ui/Skeleton'

export interface KidsHeroTilesProps {
  sleepTotal: number
  sleepTarget: number
  dominantMood: string
  moodCounts: Record<string, number>
  caloriesTotal: number
  caloriesTarget: number
  feedingCount: number
  feedingTarget: number
  stage: 'liquid' | 'mixed' | 'solid' | string
  activityCount: number
  activityActiveDays: number
  activityRangeDays: number
  activityTopLabel?: string
  activityTypesCount: number
  onPressSleep?: () => void
  onPressMood?: () => void
  onPressCalories?: () => void
  onPressActivity?: () => void
  onLogSleep?: () => void
  onLogMood?: () => void
  onLogFeeding?: () => void
  onLogActivity?: () => void
  /** First load (no range data yet): value areas show skeletons, not "Tap to log". */
  loading?: boolean
}

const MOOD_KEYS = ['happy', 'calm', 'energetic', 'fussy', 'cranky'] as const
const MOOD_STICKER: Record<string, SiteStickerName> = {
  happy: 'face4', calm: 'face3', energetic: 'star', fussy: 'face2', cranky: 'face1',
}
const MOOD_LABEL_KEY: Record<string, TranslationKey> = {
  happy: 'kids_logForm_moodHappy', calm: 'kids_logForm_moodCalm', energetic: 'kids_logForm_moodEnergetic',
  fussy: 'kids_logForm_moodFussy', cranky: 'kids_logForm_moodCranky',
}
const MOOD_TONE: Record<string, string> = {
  happy: stickers.yellow, calm: stickers.green, energetic: stickers.blue, fussy: stickers.peach, cranky: stickers.coral,
}
const WAVE = 'M0 7 C25 3 45 10 75 6 S130 2 160 7 S190 9 200 6'

/** Animated number that counts up to `value` (decimals kept). */
function CountUp({ value, decimals = 0, style }: { value: number; decimals?: number; style: object }) {
  const v = useRef(new Animated.Value(0)).current
  const [shown, setShown] = useState(0)
  useEffect(() => {
    const id = v.addListener(({ value: n }) => setShown(n))
    Animated.timing(v, { toValue: value, duration: 700, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start()
    return () => v.removeListener(id)
  }, [value, v])
  const txt = decimals ? shown.toFixed(decimals) : Math.round(shown).toLocaleString(dateLoc())
  return <Text style={style}>{txt}</Text>
}

/** Value-area placeholder while the tile's data loads: big number, sub line, meter. */
function TileValueSkeleton() {
  return (
    <View style={styles.skel}>
      <Skeleton height={36} width="60%" radius={10} />
      <Skeleton height={12} width="80%" radius={6} />
      <Skeleton height={10} width="100%" radius={5} />
    </View>
  )
}

/** Hand-drawn meter: faint ink wave, filled in `color` up to `pct`. */
function WaveMeter({ pct, color, ink }: { pct: number; color: string; ink: string }) {
  const [w, setW] = useState(0)
  const fill = useRef(new Animated.Value(0)).current
  useEffect(() => {
    Animated.timing(fill, { toValue: Math.max(0, Math.min(1, pct)), duration: 800, delay: 250, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start()
  }, [pct, fill])
  const wave = (c: string, sw: number) => (
    <Svg width={w} height={10} viewBox="0 0 200 12" preserveAspectRatio="none">
      <Path d={WAVE} stroke={c} strokeWidth={sw} fill="none" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
    </Svg>
  )
  return (
    <View style={styles.meter} onLayout={(e) => setW(Math.round(e.nativeEvent.layout.width))}>
      {w > 0 ? (
        <>
          <View style={{ opacity: 0.18 }}>{wave(ink, 3)}</View>
          <Animated.View style={[styles.meterFill, { width: fill.interpolate({ inputRange: [0, 1], outputRange: [0, w] }) }]}>
            {wave(color, 4)}
          </Animated.View>
        </>
      ) : null}
    </View>
  )
}

function Tile({
  index, tone, sticker, eyebrow, onPress, children, flex,
}: {
  index: number
  tone: string
  sticker: SiteStickerName
  eyebrow: string
  onPress?: () => void
  children: React.ReactNode
  flex: number
}) {
  const { colors } = useTheme()
  const ink = colors.text
  const [size, setSize] = useState({ w: 0, h: 0 })
  const press = useRef(new Animated.Value(0)).current
  const sway = useIdleSway(5, index * 3 + 2)
  const to = (n: number) => Animated.spring(press, { toValue: n, friction: 6, tension: 260, useNativeDriver: true }).start()
  return (
    <FadeUp index={index} delay={80} style={{ flex }}>
      <Pressable
        onPress={() => { Haptics.selectionAsync().catch(() => {}); onPress?.() }}
        onPressIn={() => to(1)}
        onPressOut={() => to(0)}
        accessibilityRole="button"
        accessibilityLabel={eyebrow}
      >
        <Animated.View
          onLayout={(e) => setSize({ w: Math.round(e.nativeEvent.layout.width), h: Math.round(e.nativeEvent.layout.height) })}
          style={{ transform: [{ scale: press.interpolate({ inputRange: [0, 1], outputRange: [1, 0.96] }) }, { rotate: press.interpolate({ inputRange: [0, 1], outputRange: ['0deg', index % 2 ? '0.8deg' : '-0.8deg'] }) }] }}
        >
          {/* hand-drawn ink shadow + card */}
          <View style={[StyleSheet.absoluteFill, { top: 4, bottom: -4 }]}>
            <HandDrawnPill width={size.w} height={size.h} fill={ink} radius={22} seed={eyebrow + 'sh'} />
          </View>
          <HandDrawnPill width={size.w} height={size.h} fill={tone} stroke={ink} strokeWidth={2.4} radius={22} seed={eyebrow} />
          <View style={styles.tile}>
            <View style={styles.tileHead}>
              <Text style={[styles.eyebrow, { color: ink }]} numberOfLines={2}>{eyebrow}</Text>
              <View style={styles.disc}>
                <HandDrawnPill width={42} height={42} fill={colors.surface} stroke={ink} strokeWidth={2} seed={sticker + 'disc'} />
                <Animated.View style={{ transform: [{ translateY: sway.translateY }, { rotate: sway.rotate }] }}>
                  <SiteSticker name={sticker} size={28} cut />
                </Animated.View>
              </View>
            </View>
            {children}
          </View>
        </Animated.View>
      </Pressable>
    </FadeUp>
  )
}

export function KidsHeroTiles(p: KidsHeroTilesProps) {
  const { colors, font } = useTheme()
  const { t } = useTranslation()
  const ink = colors.text
  const ink2 = colors.textSecondary
  const days = Math.max(1, p.activityRangeDays || 1)
  const multi = days > 1

  // Sleep: per night when the range spans several days.
  const sleepVal = multi ? p.sleepTotal / days : p.sleepTotal
  const sleepGoal = multi ? p.sleepTarget / days : p.sleepTarget
  const hasSleep = p.sleepTotal > 0

  // Food: per day.
  const liquid = p.stage === 'liquid' || p.stage === 'mixed'
  const foodTotal = liquid ? p.feedingCount : p.caloriesTotal
  const foodGoalTotal = liquid ? p.feedingTarget : p.caloriesTarget
  const foodVal = multi ? foodTotal / days : foodTotal
  const foodGoal = multi ? foodGoalTotal / days : foodGoalTotal
  const hasFood = foodTotal > 0

  // Mood
  const moodVals = MOOD_KEYS.map((k) => p.moodCounts[k] || 0)
  const moodTotal = moodVals.reduce((a, b) => a + b, 0)
  const maxMood = Math.max(...moodVals, 1)
  const hasMood = moodTotal > 0 && !!p.dominantMood

  const hasAct = p.activityCount > 0
  const loading = !!p.loading

  const numStyle = [styles.num, { color: ink, fontFamily: font.displayBold }]
  const unitStyle = [styles.unit, { color: ink, fontFamily: font.display }]
  const subStyle = [styles.sub, { color: ink2, fontFamily: font.body }]
  const emptyStyle = [styles.empty, { color: ink, fontFamily: font.display }]

  return (
    <View style={{ gap: 14 }}>
      <View style={styles.row}>
        <Tile index={0} flex={1.15} tone={stickers.blueSoft} sticker="moon"
          eyebrow={multi ? t('kidsTile_sleepAvg') : t('kidsTile_sleepNight')}
          onPress={loading ? undefined : !hasSleep && p.onLogSleep ? p.onLogSleep : p.onPressSleep}>
          {loading ? <TileValueSkeleton /> : <FadeIn>
          {hasSleep ? (
            <Text style={styles.numRow}>
              <CountUp value={sleepVal} decimals={1} style={numStyle} />
              <Text style={unitStyle}> h</Text>
            </Text>
          ) : <Text style={emptyStyle}>{t('kids_home_tile_tap_to_log')}</Text>}
          <Text style={subStyle} numberOfLines={1}>
            {sleepGoal > 0 ? t('kidsTile_ofNight', { h: Math.round(sleepGoal * 10) / 10 }) : t('kids_home_tile_no_goal')}
          </Text>
          <WaveMeter pct={sleepGoal > 0 ? sleepVal / sleepGoal : 0} color={stickers.blue} ink={ink} />
          </FadeIn>}
        </Tile>

        <Tile index={1} flex={1} tone={stickers.yellowSoft} sticker={hasMood ? MOOD_STICKER[p.dominantMood] ?? 'face3' : 'face3'}
          eyebrow={t('kids_home_tile_mood')}
          onPress={loading ? undefined : !hasMood && p.onLogMood ? p.onLogMood : p.onPressMood}>
          {loading ? <TileValueSkeleton /> : <FadeIn>
          <Text style={hasMood ? [styles.moodWord, { color: ink, fontFamily: font.display }] : emptyStyle} numberOfLines={hasMood ? 1 : 2}>
            {hasMood ? (MOOD_LABEL_KEY[p.dominantMood] ? t(MOOD_LABEL_KEY[p.dominantMood]) : t('kp_kh_moodContent')) : t('kids_home_tile_mood_empty')}
          </Text>
          {/* one little hand-drawn bar per mood, dominant one tallest + ink-outlined */}
          <View style={styles.moodBars}>
            {MOOD_KEYS.map((k, i) => {
              const h = hasMood ? Math.max(8, (moodVals[i] / maxMood) * 34) : 8
              const dom = hasMood && k === p.dominantMood
              return (
                <View key={k} style={{ width: 14, height: h, borderRadius: 7, backgroundColor: MOOD_TONE[k], borderWidth: dom ? 1.5 : 0, borderColor: ink, opacity: !hasMood ? 0.3 : dom || moodVals[i] ? 1 : 0.3 }} />
              )
            })}
          </View>
          <Text style={subStyle}>{hasMood ? t('kidsTile_moodLogs', { n: moodTotal }) : t('kids_home_tile_tap_to_log')}</Text>
          </FadeIn>}
        </Tile>
      </View>

      <View style={styles.row}>
        <Tile index={2} flex={1} tone={stickers.pinkSoft} sticker={liquid ? 'bottle' : 'avocado'}
          eyebrow={multi ? (liquid ? t('kidsTile_feedAvg') : t('kidsTile_calAvg')) : (liquid ? t('kids_home_tile_feedings') : t('kids_home_tile_calories'))}
          onPress={loading ? undefined : !hasFood && p.onLogFeeding ? p.onLogFeeding : p.onPressCalories}>
          {loading ? <TileValueSkeleton /> : <FadeIn>
          {hasFood ? (
            <Text style={styles.numRow}>
              <CountUp value={foodVal} decimals={liquid && multi ? 1 : 0} style={numStyle} />
              {!liquid ? <Text style={unitStyle}> kcal</Text> : null}
            </Text>
          ) : <Text style={emptyStyle}>{t('kids_home_tile_tap_to_log')}</Text>}
          <Text style={subStyle} numberOfLines={1}>
            {foodGoal > 0 ? t('kidsTile_ofDay', { n: Math.round(foodGoal).toLocaleString(dateLoc()) }) : t('kids_home_tile_no_goal')}
          </Text>
          <WaveMeter pct={foodGoal > 0 ? foodVal / foodGoal : 0} color="#EE7B6D" ink={ink} />
          </FadeIn>}
        </Tile>

        <Tile index={3} flex={1.15} tone={stickers.greenSoft} sticker="shoe"
          eyebrow={t('kids_home_tile_activities')}
          onPress={loading ? undefined : !hasAct && p.onLogActivity ? p.onLogActivity : p.onPressActivity}>
          {loading ? <TileValueSkeleton /> : <FadeIn>
          {hasAct ? (
            <Text style={styles.numRow}>
              <CountUp value={p.activityCount} style={numStyle} />
              <Text style={unitStyle}> {t(p.activityCount === 1 ? 'kidsTile_logsUnit_one' : 'kidsTile_logsUnit')}</Text>
            </Text>
          ) : <Text style={emptyStyle}>{t('kids_home_tile_tap_to_log')}</Text>}
          <Text style={subStyle} numberOfLines={1}>
            {hasAct ? t('kidsTile_activeDays', { a: p.activityActiveDays, d: days }) : t('kids_home_tile_activity_empty_sub')}
          </Text>
          {/* active days as hand-drawn dots (up to 14), else a meter */}
          {days === 1 ? null : days <= 14 ? (
            <View style={styles.dots}>
              {Array.from({ length: days }).map((_, i) => (
                <View key={i} style={[styles.dot, { borderColor: ink, backgroundColor: i < p.activityActiveDays ? '#8BB356' : 'transparent' }]} />
              ))}
            </View>
          ) : (
            <WaveMeter pct={p.activityActiveDays / days} color="#8BB356" ink={ink} />
          )}
          </FadeIn>}
        </Tile>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 12 },
  tile: { padding: 14, paddingBottom: 16, minHeight: 168 },
  tileHead: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 6, marginBottom: 6 },
  eyebrow: { flex: 1, fontFamily: 'SpaceMono_400Regular', fontSize: 10, letterSpacing: 1.2, textTransform: 'uppercase', marginTop: 4 },
  disc: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center', marginTop: -4, marginRight: -4 },
  numRow: { marginTop: 4 },
  num: { fontSize: 38, lineHeight: 44, letterSpacing: -1 },
  unit: { fontSize: 18, textTransform: 'uppercase' },
  sub: { fontSize: 13, marginTop: 2 },
  empty: { fontSize: 20, lineHeight: 26, textTransform: 'uppercase', marginTop: 8 },
  moodWord: { fontSize: 26, lineHeight: 34, textTransform: 'uppercase', marginTop: 6 },
  moodBars: { flexDirection: 'row', gap: 6, alignItems: 'flex-end', height: 36, marginTop: 8 },
  meter: { height: 10, marginTop: 10 },
  meterFill: { position: 'absolute', left: 0, top: 0, height: 10, overflow: 'hidden' },
  dots: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 10 },
  dot: { width: 11, height: 11, borderRadius: 6, borderWidth: 1.5 },
  skel: { gap: 10, marginTop: 8 },
})
