/**
 * KidsJourneyRing — interactive rotating wheel of 10 growth leaps.
 *
 * Mirrors PregnancyJourneyRing's rotation/snap/tap mechanics but adapted for
 * kids: each dot represents one growth leap (week 5 → week 75), labeled W{n}
 * inside, colored per leap, anchored at 6 o'clock when selected.
 *
 * Tapping the centre / "Growth Leap" card opens a detail modal with the
 * brain-development context, three phases, observable signs, emerging
 * skills, parent-led activities and a tip.
 */

import React, { useRef, useState, useMemo, useCallback } from 'react'
import { View, Text, ScrollView, PanResponder, StyleSheet, Pressable, Modal } from 'react-native'
import Svg, { Circle, Polygon } from 'react-native-svg'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useDerivedValue,
  useAnimatedReaction,
  runOnJS,
  withDecay,
  withTiming,
  cancelAnimation,
  Easing,
} from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { X, ChevronRight, Brain, Sparkles, Flame, Check } from 'lucide-react-native'
import { useTheme, font, useDiffuseTheme, diffuseFont, getDiffuseAccent } from '../../constants/theme'
import { useIsDiffuse, SoftBloom } from '../ui/diffuse/DiffuseKit'
import { DiffuseSheet, DiffuseListRow, DiffuseSectionHeader, DiffuseBloomIcon } from '../ui/diffuse/DiffusePrimitives'
import { Character } from '../characters/Characters'
import { GROWTH_LEAPS, leapStatusForWeek, type GrowthLeap } from '../../lib/growthLeaps'
import { useTranslation } from '../../lib/i18n'

// ─── Layout constants ────────────────────────────────────────────────────────
const SVG_SIZE = 320
const CX = SVG_SIZE / 2
const CY = SVG_SIZE / 2
const RING_R = 128
const ANCHOR_DEG = 90
const INK = '#141313'

interface DotConfig {
  index: number
  bx: number
  by: number
  size: number
  color: string
  state: 'past' | 'current' | 'future'
}

interface Props {
  /** Child's current age in weeks (post-birth) — drives current/past/future */
  weekAge: number
  childName: string
  /** Optional override; defaults to the shared GROWTH_LEAPS dataset */
  leaps?: GrowthLeap[]
}

function buildDotConfigs(leaps: GrowthLeap[], weekAge: number): DotConfig[] {
  return leaps.map((l, i) => {
    const angleDeg = (i / leaps.length) * 360 - 90
    const angleRad = angleDeg * (Math.PI / 180)
    const bx = CX + RING_R * Math.cos(angleRad)
    const by = CY + RING_R * Math.sin(angleRad)
    const state = leapStatusForWeek(weekAge, l.week)
    const size = state === 'current' ? 56 : state === 'past' ? 44 : 38
    return { index: i, bx, by, size, color: l.color, state }
  })
}

export function KidsJourneyRing({ weekAge, childName, leaps = GROWTH_LEAPS }: Props) {
  const { font, colors, isDark } = useTheme()
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
  const { t } = useTranslation()
  const insets = useSafeAreaInsets()

  const dots = useMemo(() => buildDotConfigs(leaps, weekAge), [leaps, weekAge])
  const N = leaps.length

  // Default selection: the leap currently active, OR the next upcoming leap if
  // none active, OR the final leap if the child has aged past everything.
  const initialIndex = useMemo(() => {
    const activeIdx = leaps.findIndex((l) => leapStatusForWeek(weekAge, l.week) === 'current')
    if (activeIdx >= 0) return activeIdx
    const upcoming = leaps.findIndex((l) => weekAge < l.week - 2)
    if (upcoming >= 0) return upcoming
    return leaps.length - 1
  }, [leaps, weekAge])

  const initialRot = 180 - (initialIndex / N) * 360
  const rotationDeg = useSharedValue(initialRot)

  const dotsAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotationDeg.value}deg` }],
  }))

  // Counter-rotation for the dot label so it always reads upright while the
  // ring layer rotates beneath the gesture.
  const counterRotateStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${-rotationDeg.value}deg` }],
  }))

  // ── Selected leap state ───────────────────────────────────────────────────
  const [selectedIndex, setSelectedIndex] = useState(initialIndex)
  const [detailOpen, setDetailOpen] = useState(false)

  const selectedDerived = useDerivedValue(() => {
    let best = 0
    let bestDiff = Infinity
    for (let i = 0; i < N; i++) {
      const a = (i / N) * 360 - 90 + rotationDeg.value
      const normalized = (((a - ANCHOR_DEG) % 360) + 360) % 360
      const absDiff = normalized > 180 ? 360 - normalized : normalized
      if (absDiff < bestDiff) {
        bestDiff = absDiff
        best = i
      }
    }
    return best
  })

  useAnimatedReaction(
    () => selectedDerived.value,
    (idx, prev) => {
      if (idx !== prev) runOnJS(setSelectedIndex)(idx)
    },
  )

  // ── Gesture refs ──────────────────────────────────────────────────────────
  const tangentRef = useRef({ x: 0, y: 1 })
  const lastDxRef = useRef(0)
  const lastDyRef = useRef(0)
  const velocityRef = useRef(0)
  const totalMoveRef = useRef(0)
  const initLocRef = useRef({ x: 0, y: 0 })

  const snapToIndex = useCallback(
    (i: number) => {
      const target = 180 - (i / N) * 360
      let diff = ((target - rotationDeg.value) % 360 + 360) % 360
      if (diff > 180) diff -= 360
      cancelAnimation(rotationDeg)
      rotationDeg.value = withTiming(rotationDeg.value + diff, {
        duration: 380,
        easing: Easing.out(Easing.cubic),
      })
    },
    [rotationDeg, N],
  )

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,

      onPanResponderGrant: (e) => {
        cancelAnimation(rotationDeg)
        const lx = e.nativeEvent.locationX
        const ly = e.nativeEvent.locationY
        initLocRef.current = { x: lx, y: ly }
        const rx = lx - CX
        const ry = ly - CY
        const r = Math.sqrt(rx * rx + ry * ry) || RING_R
        tangentRef.current = { x: -ry / r, y: rx / r }
        lastDxRef.current = 0
        lastDyRef.current = 0
        velocityRef.current = 0
        totalMoveRef.current = 0
      },

      onPanResponderMove: (_e, gestureState) => {
        const ddx = gestureState.dx - lastDxRef.current
        const ddy = gestureState.dy - lastDyRef.current
        const arc = ddx * tangentRef.current.x + ddy * tangentRef.current.y
        const delta = (arc / RING_R) * (180 / Math.PI)
        rotationDeg.value += delta
        lastDxRef.current = gestureState.dx
        lastDyRef.current = gestureState.dy
        totalMoveRef.current += Math.abs(delta)
        const tangVel =
          gestureState.vx * tangentRef.current.x + gestureState.vy * tangentRef.current.y
        velocityRef.current = Math.max(
          -300,
          Math.min(300, (tangVel / RING_R) * (180 / Math.PI) * 1000),
        )
      },

      onPanResponderRelease: () => {
        if (totalMoveRef.current < 5) {
          // Tap: find dot nearest to initial touch and snap to it
          const relX = initLocRef.current.x
          const relY = initLocRef.current.y
          let best: number | null = null
          let bestDist = Infinity
          for (let i = 0; i < N; i++) {
            const rad = ((i / N) * 360 - 90 + rotationDeg.value) * (Math.PI / 180)
            const dotX = CX + RING_R * Math.cos(rad)
            const dotY = CY + RING_R * Math.sin(rad)
            const dist = Math.hypot(relX - dotX, relY - dotY)
            if (dist < 32 && dist < bestDist) {
              bestDist = dist
              best = i
            }
          }
          if (best !== null) snapToIndex(best)
        } else {
          // Drag: momentum decay then snap
          rotationDeg.value = withDecay(
            { velocity: velocityRef.current, deceleration: 0.94 },
            (finished) => {
              'worklet'
              if (!finished) return
              let best = 0
              let bestDiff = Infinity
              for (let i = 0; i < N; i++) {
                const a = (i / N) * 360 - 90 + rotationDeg.value
                const norm = (((a - ANCHOR_DEG) % 360) + 360) % 360
                const d = norm > 180 ? 360 - norm : norm
                if (d < bestDiff) {
                  bestDiff = d
                  best = i
                }
              }
              const target = 180 - (best / N) * 360
              let diff = ((target - rotationDeg.value) % 360 + 360) % 360
              if (diff > 180) diff -= 360
              rotationDeg.value = withTiming(rotationDeg.value + diff, {
                duration: 380,
                easing: Easing.out(Easing.cubic),
              })
            },
          )
        }
      },
    }),
  ).current

  // ── Derived display values ────────────────────────────────────────────────
  const selectedLeap = leaps[selectedIndex] ?? leaps[0]
  const selectedState = leapStatusForWeek(weekAge, selectedLeap.week)
  const col = selectedLeap.color
  // Under Diffuse the leap hue only survives as a soft bloom; ink/hairlines
  // carry structure. The mode accent (kids field) replaces the per-leap color
  // on strokes so the ring reads as one calm system, not 10 candy dots.
  const diffuseAccent = getDiffuseAccent('kids', isDark)
  const ink = diffuse ? dt.colors.ink : (isDark ? colors.text : INK)
  const inkMuted = diffuse ? dt.colors.ink3 : colors.textMuted
  const inkFaint = diffuse ? dt.colors.ink3 : colors.textFaint
  const orbitStroke = diffuse ? dt.colors.line : colors.border
  const paper = diffuse ? dt.colors.surface : (isDark ? colors.surface : '#FFFEF8')
  const paperBorder = diffuse ? dt.colors.hairline : (isDark ? colors.border : INK)

  const statusLabel =
    selectedState === 'current' ? t('kids_journeyRing_statusNow') : selectedState === 'past' ? t('kids_journeyRing_statusDone') : t('kids_journeyRing_statusUpcoming')
  const statusColor =
    selectedState === 'current' ? '#EE7B6D' : selectedState === 'past' ? '#8BB356' : col
  const statusFill =
    selectedState === 'current' ? '#F5B896'
    : selectedState === 'past' ? '#BDD48C'
    : col + '33'

  const weekRangeLabel = `Week ${Math.max(1, selectedLeap.week - 1)}–${selectedLeap.week + 1}`

  return (
    <View style={styles.container}>
      <View style={styles.headerWrap}>
        <Text style={[styles.title, { color: ink, fontFamily: diffuse ? diffuseFont.display : font.display }, diffuse && { letterSpacing: -0.4 }]}>
          {t('kids_journeyRing_title', { name: childName })}
        </Text>
        <Text style={[styles.subtitle, { color: inkMuted, fontFamily: diffuse ? diffuseFont.mono : font.bodyMedium }, diffuse && { letterSpacing: 1, textTransform: 'uppercase', fontSize: 10 }]}>
          {t('kids_journeyRing_subtitle', { weekAge, leapCount: leaps.length })}
        </Text>
      </View>

      {/* ── Ring ── */}
      <View style={styles.ringWrap}>
        <View {...panResponder.panHandlers} style={styles.ringStage}>
          {/* Soft focal glow behind the 6 o'clock anchor frame (selected leap's
              colour) — makes the tracked leap read as a beautiful highlight. */}
          {diffuse ? (
            <View
              pointerEvents="none"
              style={{ position: 'absolute', width: 64, height: 64, left: CX - 32, top: CY + RING_R - 32 }}
            >
              <SoftBloom color={col} opacity={isDark ? 0.45 : 0.55} spread={0.5} radius="50%" />
            </View>
          ) : null}
          {/* Animated layer: leap dots rotate around SVG center */}
          <Animated.View style={[StyleSheet.absoluteFill, dotsAnimatedStyle]}>
            {dots.map((d) => {
              const leap = leaps[d.index]
              const isCurrent = d.state === 'current'
              const isPast = d.state === 'past'
              const isFuture = d.state === 'future'
              const fontSize = d.size >= 52 ? 16 : d.size >= 42 ? 14 : 12

              if (diffuse) {
                // Every leap is a glowing orb in its OWN colour — a soft radial
                // bloom under a brighter core dot, so the ring reads as a string
                // of little lights, not flat dots. Hierarchy by state: current =
                // biggest orb + strongest glow + accent ring; past = full orb;
                // future = faint, dimmer glow. Label in mono below, upright.
                const coreSize = isCurrent ? 16 : isPast ? 13 : 11
                const bloomBox = coreSize * (isCurrent ? 3.4 : 2.8)
                const bloomOpacity = isCurrent ? (isDark ? 0.55 : 0.7) : isPast ? (isDark ? 0.4 : 0.5) : (isDark ? 0.22 : 0.3)
                return (
                  <View
                    key={d.index}
                    style={{
                      position: 'absolute',
                      left: d.bx - d.size / 2,
                      top: d.by - d.size / 2,
                      width: d.size,
                      height: d.size,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {/* Glow under every orb (feathered radial in the leap hue). */}
                    <View pointerEvents="none" style={{ position: 'absolute', width: bloomBox, height: bloomBox }}>
                      <SoftBloom color={leap.color} opacity={bloomOpacity} spread={0.5} radius="50%" />
                    </View>
                    <Animated.View style={counterRotateStyle}>
                      <View style={{ alignItems: 'center' }}>
                        <View
                          style={{
                            width: coreSize,
                            height: coreSize,
                            borderRadius: coreSize / 2,
                            // Past = solid filled orb (a completed light). Current
                            // = solid + accent ring. Future = hollow ring only, so
                            // done/todo reads at a glance around the wheel.
                            backgroundColor: isFuture ? 'transparent' : leap.color,
                            borderWidth: isFuture ? 1.5 : isCurrent ? 2 : 0,
                            borderColor: isFuture ? leap.color : diffuseAccent,
                            opacity: isFuture ? 0.7 : 1,
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          {/* Past leaps carry a tiny check — visibly "done". */}
                          {isPast ? <Check size={coreSize * 0.7} color={dt.colors.bg} strokeWidth={3} /> : null}
                        </View>
                        <Text
                          style={{
                            fontFamily: diffuseFont.mono,
                            fontSize: 9,
                            letterSpacing: 0.5,
                            textTransform: 'uppercase',
                            color: isFuture ? dt.colors.ink4 : dt.colors.ink3,
                            marginTop: 5,
                          }}
                        >
                          {t('kids_journeyRing_weekLabel', { n: leap.week })}
                        </Text>
                      </View>
                    </Animated.View>
                  </View>
                )
              }

              return (
                <View
                  key={d.index}
                  style={{
                    position: 'absolute',
                    left: d.bx - d.size / 2,
                    top: d.by - d.size / 2,
                    width: d.size,
                    height: d.size,
                    borderRadius: d.size / 2,
                    backgroundColor: isFuture ? d.color + '33' : d.color,
                    borderWidth: 1.5,
                    borderColor: isDark ? 'rgba(255,255,255,0.18)' : INK,
                    alignItems: 'center',
                    justifyContent: 'center',
                    shadowColor: INK,
                    shadowOffset: { width: 0, height: isCurrent ? 2 : 1 },
                    shadowOpacity: isDark ? 0 : isCurrent ? 0.18 : 0.08,
                    shadowRadius: isCurrent ? 6 : 3,
                    elevation: isCurrent ? 4 : 1,
                    opacity: isFuture ? 0.92 : 1,
                  }}
                >
                  {/* Counter-rotate so the W## label always reads upright */}
                  <Animated.View style={counterRotateStyle}>
                    <Text
                      style={{
                        fontFamily: font.displayExtraBold,
                        fontSize,
                        color: isFuture ? (isDark ? '#FFFEF8' : INK) : isPast ? '#FFFEF8' : '#FFFEF8',
                        letterSpacing: -0.3,
                      }}
                    >
                      {t('kids_journeyRing_weekLabel', { n: leap.week })}
                    </Text>
                  </Animated.View>
                </View>
              )
            })}
          </Animated.View>

          {/* Static layer: orbit + anchor chevron */}
          <Svg width={SVG_SIZE} height={SVG_SIZE} style={StyleSheet.absoluteFill} pointerEvents="none">
            <Circle
              cx={CX}
              cy={CY}
              r={RING_R}
              fill="none"
              stroke={orbitStroke}
              strokeWidth={diffuse ? 1 : 1.5}
            />
            {diffuse ? (
              // Stationary focal frame at 6 o'clock — the leap you're tracking
              // rotates into it. A ring in the selected leap's own colour makes
              // it a beautiful highlight rather than a plain grey circle (a soft
              // bloom sits behind it, rendered as a View above this SVG).
              <Circle
                cx={CX}
                cy={CY + RING_R}
                r={19}
                fill="none"
                stroke={col}
                strokeWidth={1.5}
              />
            ) : (
              <Polygon
                points={`${CX},${CY + RING_R - 6} ${CX - 9},${CY + RING_R + 9} ${CX + 9},${CY + RING_R + 9}`}
                fill={col}
                stroke={isDark ? 'rgba(255,255,255,0.18)' : INK}
                strokeWidth={1.5}
              />
            )}
          </Svg>

          {/* Center overlay */}
          <View style={StyleSheet.absoluteFill} pointerEvents="none">
            <View style={styles.centerInner}>
              <Text
                style={[
                  styles.centerLabel,
                  diffuse
                    ? { color: dt.colors.ink3, fontFamily: diffuseFont.mono, letterSpacing: 2 }
                    : { color: col, fontFamily: font.bodySemiBold },
                ]}
              >
                {t('kids_journeyRing_leapOf', { n: selectedIndex + 1, total: N })}
              </Text>
              <Text
                style={[
                  styles.centerName,
                  { color: ink, fontFamily: diffuse ? diffuseFont.display : font.display },
                  diffuse && { letterSpacing: -0.4 },
                ]}
                numberOfLines={2}
              >
                {selectedLeap.name}
              </Text>
              <Text
                style={[
                  styles.centerWeek,
                  diffuse
                    ? { color: dt.colors.ink3, fontFamily: diffuseFont.mono, letterSpacing: 0.8, textTransform: 'uppercase', fontSize: 10, fontStyle: 'normal' }
                    : { color: inkMuted, fontFamily: font.italic },
                ]}
              >
                {weekRangeLabel}
              </Text>
            </View>
          </View>
        </View>
      </View>

      <Text style={[styles.hint, { color: inkFaint, fontFamily: diffuse ? diffuseFont.mono : font.body }, diffuse && { letterSpacing: 1, textTransform: 'uppercase' }]}>
        {t('kids_journeyRing_hint')}
      </Text>

      {/* ── Bottom panel ── */}
      <ScrollView
        style={styles.panel}
        contentContainerStyle={[styles.panelContent, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Status pill — current theme only. Under Diffuse the wheel already
            shows status (checks on past leaps, accent ring on current), so this
            redundant row is dropped for a cleaner bottom. */}
        {!diffuse ? (
          <View style={styles.metaRow}>
            <Text style={[styles.metaLabel, { color: col, fontFamily: font.bodySemiBold }]}>
              {t('kids_journeyRing_growthLeap')}
            </Text>
            <View
              style={[
                styles.statusPill,
                { borderColor: isDark ? statusColor + '70' : INK, backgroundColor: isDark ? statusColor + '22' : statusFill },
              ]}
            >
              <Text style={[styles.statusPillText, { color: isDark ? statusColor : INK, fontFamily: font.bodySemiBold }]}>
                {statusLabel}
              </Text>
            </View>
          </View>
        ) : null}

        {/* Tappable description card → opens detail modal */}
        <Pressable
          onPress={() => setDetailOpen(true)}
          style={({ pressed }) => [
            styles.descCard,
            diffuse
              ? { backgroundColor: dt.colors.surface, borderColor: dt.colors.line, borderWidth: 1, opacity: pressed ? 0.9 : 1 }
              : {
                  backgroundColor: isDark ? col + '14' : col + '22',
                  borderColor: isDark ? col + '38' : INK,
                  opacity: pressed ? 0.92 : 1,
                },
          ]}
        >
          {diffuse ? <SoftBloom color={col} cx="88%" cy="20%" opacity={isDark ? 0.16 : 0.22} spread={0.5} /> : null}
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={[styles.descText, { color: ink, fontFamily: diffuse ? diffuseFont.body : font.body }]} numberOfLines={2}>
              {selectedLeap.desc}
            </Text>
            <Text
              style={[
                styles.descCta,
                diffuse
                  ? { color: dt.colors.ink3, fontFamily: diffuseFont.mono, letterSpacing: 1, opacity: 1 }
                  : { color: ink, fontFamily: font.bodySemiBold },
              ]}
            >
              {t('kids_journeyRing_tapForGuide')}
            </Text>
          </View>
          {diffuse ? (
            <DiffuseBloomIcon color={diffuseAccent} size={30}>
              <ChevronRight size={16} color={dt.colors.ink3} strokeWidth={1.6} />
            </DiffuseBloomIcon>
          ) : (
            <View style={{
              width: 28, height: 28, borderRadius: 14,
              backgroundColor: paper, borderWidth: 1.2, borderColor: paperBorder,
              alignItems: 'center', justifyContent: 'center',
            }}>
              <ChevronRight size={14} color={ink} strokeWidth={2.2} />
            </View>
          )}
        </Pressable>

        {/* All leaps — under Diffuse the wheel already shows every leap with its
            done/current/upcoming status, so the redundant list is dropped. The
            current theme keeps its mini dot strip. */}
        {diffuse ? null : (
        <View style={styles.section}>
          <Text
            style={[styles.sectionLabel, { color: inkFaint, fontFamily: font.bodySemiBold }]}
          >
            {t('kids_journeyRing_allLeaps')}
          </Text>
          <View style={styles.stripRow}>
            {leaps.map((l, i) => {
              const state = leapStatusForWeek(weekAge, l.week)
              const isSel = i === selectedIndex
              const isPast = state === 'past'
              const isCurr = state === 'current'
              return (
                <Pressable
                  key={l.week}
                  onPress={() => snapToIndex(i)}
                  hitSlop={8}
                  style={[
                    styles.stripDot,
                    {
                      backgroundColor: isPast || isCurr ? l.color : l.color + '33',
                      borderColor: isSel ? (isDark ? '#FFFEF8' : INK) : (isDark ? 'rgba(255,255,255,0.25)' : INK),
                      borderWidth: isSel ? 2 : 1,
                      width: isSel ? 16 : isCurr ? 14 : 11,
                      height: isSel ? 16 : isCurr ? 14 : 11,
                      borderRadius: 8,
                      opacity: isPast ? 0.6 : 1,
                    },
                  ]}
                />
              )
            })}
          </View>
        </View>
        )}
      </ScrollView>

      {/* ── Detail modal ── */}
      <LeapDetailModal
        visible={detailOpen}
        onClose={() => setDetailOpen(false)}
        leap={selectedLeap}
        leapNumber={selectedIndex + 1}
        totalLeaps={N}
        statusLabel={statusLabel}
        statusFill={statusFill}
        statusColor={statusColor}
      />
    </View>
  )
}

// ─── Detail Modal ────────────────────────────────────────────────────────────

function LeapDetailModal({
  visible, onClose, leap, leapNumber, totalLeaps, statusLabel, statusFill, statusColor,
}: {
  visible: boolean
  onClose: () => void
  leap: GrowthLeap
  leapNumber: number
  totalLeaps: number
  statusLabel: string
  statusFill: string
  statusColor: string
}) {
  const { colors, font, isDark } = useTheme()
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
  const { t } = useTranslation()
  const insets = useSafeAreaInsets()
  const ink = isDark ? colors.text : INK
  const inkMuted = colors.textMuted
  const paper = isDark ? colors.surface : '#FFFEF8'
  const paperBorder = isDark ? colors.border : INK

  if (diffuse) {
    const acc = getDiffuseAccent('kids', isDark)
    return (
      <DiffuseSheet
        visible={visible}
        onClose={onClose}
        title={leap.name}
        chip={t('kids_journeyRing_leapOfWithAge', { n: leapNumber, total: totalLeaps, age: leap.ageRange })}
      >
        {/* Status / duration / peak — mono chips (hairline, no filled block) */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 6 }}>
          <DiffuseChip label={statusLabel} accent={acc} highlighted />
          <DiffuseChip label={`Lasts ${leap.duration}`} accent={acc} />
          <DiffuseChip label={`Peak: week ${leap.week}`} accent={acc} />
        </View>

        {/* Brain note */}
        <DiffuseSection eyebrow={t('kids_journeyRing_whatsHappening')} icon={<Character name="brain" size={20} color={leap.color} />} accent={leap.color}>
          <Text style={{ fontFamily: diffuseFont.body, fontSize: 14, lineHeight: 22, color: dt.colors.ink }}>
            {leap.brainNote}
          </Text>
        </DiffuseSection>

        {/* Phases — hairline rows with mono index (no filled colored block) */}
        <DiffuseSection eyebrow={t('kids_journeyRing_threePhases')} icon={<Character name="phase" size={20} color={leap.color} />} accent={leap.color}>
          <View>
            {leap.phases.map((p, i) => (
              <View
                key={p.label}
                style={{
                  flexDirection: 'row',
                  gap: 12,
                  alignItems: 'flex-start',
                  paddingVertical: 12,
                  borderBottomWidth: i === leap.phases.length - 1 ? 0 : StyleSheet.hairlineWidth,
                  borderBottomColor: dt.colors.line,
                }}
              >
                <Text style={{ fontFamily: diffuseFont.mono, fontSize: 12, letterSpacing: 1, color: dt.colors.ink3, marginTop: 1, minWidth: 16 }}>{i + 1}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: diffuseFont.display, fontSize: 17, letterSpacing: -0.2, color: dt.colors.ink }}>{p.label}</Text>
                  <Text style={{ fontFamily: diffuseFont.body, fontSize: 13, lineHeight: 20, color: dt.colors.ink3, marginTop: 3 }}>{p.desc}</Text>
                </View>
              </View>
            ))}
          </View>
        </DiffuseSection>

        {/* Signs */}
        <DiffuseBulletList eyebrow={t('kids_journeyRing_signsYouMayNotice')} items={leap.signs} />
        {/* Skills */}
        <DiffuseBulletList eyebrow={t('kids_journeyRing_newSkillsEmerging')} items={leap.skills} />
        {/* Activities */}
        <DiffuseBulletList eyebrow={t('kids_journeyRing_tryTheseActivities')} items={leap.activities} />

        {/* Tip — hairline card with a soft bloom + bloom-icon */}
        <View style={{
          flexDirection: 'row',
          gap: 12,
          alignItems: 'flex-start',
          padding: 14,
          borderRadius: 20,
          borderWidth: 1,
          borderColor: dt.colors.line,
          backgroundColor: dt.colors.surface,
          overflow: 'hidden',
          marginTop: 4,
        }}>
          <SoftBloom color={dt.stickers.yellow} cx="12%" cy="24%" opacity={isDark ? 0.16 : 0.24} spread={0.5} />
          <DiffuseBloomIcon color={dt.stickers.yellow} size={30}>
            <Character name="tip" size={20} color={dt.stickers.yellow} />
          </DiffuseBloomIcon>
          <Text style={{ flex: 1, fontFamily: diffuseFont.body, fontSize: 14, lineHeight: 22, color: dt.colors.ink }}>
            {leap.tip}
          </Text>
        </View>
      </DiffuseSheet>
    )
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={modalStyles.overlay}>
        <View style={[
          modalStyles.sheet,
          {
            backgroundColor: isDark ? colors.bg : '#FFFEF8',
            borderColor: paperBorder,
            paddingBottom: insets.bottom + 24,
          },
        ]}>
          {/* Drag handle */}
          <View style={{ alignItems: 'center', paddingTop: 10 }}>
            <View style={{ width: 42, height: 4, borderRadius: 2, backgroundColor: colors.border }} />
          </View>

          {/* Header */}
          <View style={modalStyles.header}>
            <View style={{ flex: 1, paddingRight: 12 }}>
              <Text style={[modalStyles.eyebrow, { color: leap.color, fontFamily: font.bodySemiBold }]}>
                {t('kids_journeyRing_leapOfWithAge', { n: leapNumber, total: totalLeaps, age: leap.ageRange })}
              </Text>
              <Text style={[modalStyles.title, { color: ink, fontFamily: font.display }]} numberOfLines={2}>
                {leap.name}
              </Text>
            </View>
            <Pressable
              onPress={onClose}
              hitSlop={12}
              style={{
                width: 34, height: 34, borderRadius: 999,
                backgroundColor: paper, borderWidth: 1.2, borderColor: paperBorder,
                alignItems: 'center', justifyContent: 'center',
              }}
            >
              <X size={15} color={ink} strokeWidth={2.4} />
            </Pressable>
          </View>

          <ScrollView
            contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 12, gap: 14 }}
            showsVerticalScrollIndicator={false}
          >
            {/* Status + duration chips */}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              <Chip label={statusLabel} fill={isDark ? statusColor + '22' : statusFill} ink={isDark ? statusColor : INK} isDark={isDark} />
              <Chip label={`Lasts ${leap.duration}`} fill={isDark ? colors.surfaceRaised : '#FFFEF8'} ink={ink} isDark={isDark} />
              <Chip label={`Peak: week ${leap.week}`} fill={isDark ? leap.color + '22' : leap.color + '33'} ink={isDark ? leap.color : INK} isDark={isDark} />
            </View>

            {/* Brain note */}
            <SectionCard
              icon={<Brain size={14} color={ink} strokeWidth={2} />}
              title={t('kids_journeyRing_whatsHappening')}
              isDark={isDark}
              accent={leap.color}
            >
              <Text style={[modalStyles.body, { color: ink, fontFamily: font.body }]}>
                {leap.brainNote}
              </Text>
            </SectionCard>

            {/* Phases */}
            <SectionCard
              icon={<Flame size={14} color={ink} strokeWidth={2} />}
              title={t('kids_journeyRing_threePhases')}
              isDark={isDark}
              accent={leap.color}
            >
              <View style={{ gap: 10 }}>
                {leap.phases.map((p, i) => {
                  const phaseColors = ['#EE7B6D', '#F5D652', '#BDD48C']
                  const fill = phaseColors[i] ?? leap.color
                  return (
                    <View
                      key={p.label}
                      style={{
                        flexDirection: 'row',
                        gap: 10,
                        padding: 10,
                        borderRadius: 14,
                        backgroundColor: isDark ? colors.surfaceRaised : '#FFFEF8',
                        borderWidth: 1, borderColor: isDark ? colors.border : 'rgba(20,19,19,0.12)',
                      }}
                    >
                      <View style={{
                        width: 28, height: 28, borderRadius: 14,
                        backgroundColor: fill,
                        borderWidth: 1.2, borderColor: isDark ? 'rgba(255,255,255,0.2)' : INK,
                        alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                      }}>
                        <Text style={{ fontFamily: font.displayBold, fontSize: 13, color: isDark ? '#FFFEF8' : INK }}>{i + 1}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[modalStyles.phaseLabel, { color: ink, fontFamily: font.bodySemiBold }]}>
                          {p.label}
                        </Text>
                        <Text style={[modalStyles.body, { color: inkMuted, fontFamily: font.body, marginTop: 2 }]}>
                          {p.desc}
                        </Text>
                      </View>
                    </View>
                  )
                })}
              </View>
            </SectionCard>

            {/* Signs */}
            <BulletSection
              title={t('kids_journeyRing_signsYouMayNotice')}
              items={leap.signs}
              dot="#EE7B6D"
              isDark={isDark}
              accent={leap.color}
            />

            {/* Skills */}
            <BulletSection
              title={t('kids_journeyRing_newSkillsEmerging')}
              items={leap.skills}
              dot="#BDD48C"
              isDark={isDark}
              accent={leap.color}
            />

            {/* Activities */}
            <BulletSection
              title={t('kids_journeyRing_tryTheseActivities')}
              items={leap.activities}
              dot={leap.color}
              isDark={isDark}
              accent={leap.color}
            />

            {/* Tip */}
            <View style={[
              modalStyles.tip,
              {
                backgroundColor: isDark ? '#F5D65218' : '#F5D652',
                borderColor: isDark ? '#F5D65240' : INK,
              },
            ]}>
              <Sparkles size={14} color={isDark ? '#F5D652' : INK} strokeWidth={2} />
              <Text style={[modalStyles.tipText, { color: isDark ? colors.text : INK, fontFamily: font.body }]}>
                {leap.tip}
              </Text>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  )
}

function Chip({ label, fill, ink, isDark }: { label: string; fill: string; ink: string; isDark: boolean }) {
  return (
    <View style={{
      paddingHorizontal: 11,
      paddingVertical: 4,
      borderRadius: 999,
      backgroundColor: fill,
      borderWidth: 1.2,
      borderColor: isDark ? 'rgba(255,255,255,0.18)' : INK,
    }}>
      <Text style={{ fontSize: 11, fontFamily: font.bodyBold, color: ink, letterSpacing: 0.2 }}>
        {label}
      </Text>
    </View>
  )
}

// ─── Diffuse detail-modal helpers ────────────────────────────────────────────

/** Hairline mono chip. Highlighted = accent border + accent text. */
function DiffuseChip({ label, accent, highlighted }: { label: string; accent: string; highlighted?: boolean }) {
  const { colors } = useDiffuseTheme()
  return (
    <View style={{
      paddingHorizontal: 12,
      paddingVertical: 5,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: highlighted ? accent : colors.line2,
    }}>
      <Text style={{ fontSize: 10, fontFamily: diffuseFont.mono, letterSpacing: 1, textTransform: 'uppercase', color: highlighted ? accent : colors.ink3 }}>
        {label}
      </Text>
    </View>
  )
}

/** A detail section: bloom-icon + mono eyebrow rule, then children. No card. */
function DiffuseSection({ eyebrow, icon, accent, children }: { eyebrow: string; icon: React.ReactNode; accent: string; children: React.ReactNode }) {
  const { colors } = useDiffuseTheme()
  return (
    <View style={{ marginBottom: 4 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingBottom: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line, marginBottom: 10 }}>
        <DiffuseBloomIcon color={accent} size={28}>{icon}</DiffuseBloomIcon>
        <Text style={{ fontFamily: diffuseFont.mono, fontSize: 10.5, letterSpacing: 1.6, textTransform: 'uppercase', color: colors.ink3 }}>{eyebrow}</Text>
      </View>
      {children}
    </View>
  )
}

/** A mono-eyebrow section whose body is hairline bullet rows. */
function DiffuseBulletList({ eyebrow, items }: { eyebrow: string; items: string[] }) {
  const { colors } = useDiffuseTheme()
  return (
    <View style={{ marginBottom: 4 }}>
      <Text style={{ fontFamily: diffuseFont.mono, fontSize: 10.5, letterSpacing: 1.6, textTransform: 'uppercase', color: colors.ink3, paddingBottom: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line, marginBottom: 4 }}>
        {eyebrow}
      </Text>
      {items.map((item, i) => (
        <View
          key={i}
          style={{
            flexDirection: 'row',
            gap: 12,
            alignItems: 'flex-start',
            paddingVertical: 10,
            borderBottomWidth: i === items.length - 1 ? 0 : StyleSheet.hairlineWidth,
            borderBottomColor: colors.line,
          }}
        >
          <View style={{ width: 5, height: 5, borderRadius: 2.5, backgroundColor: colors.ink3, marginTop: 7 }} />
          <Text style={{ flex: 1, fontFamily: diffuseFont.body, fontSize: 14, lineHeight: 21, color: colors.ink }}>{item}</Text>
        </View>
      ))}
    </View>
  )
}

function SectionCard({
  icon, title, children, isDark, accent,
}: {
  icon: React.ReactNode
  title: string
  children: React.ReactNode
  isDark: boolean
  accent: string
}) {
  const { colors } = useTheme()
  const ink = isDark ? colors.text : INK
  return (
    <View style={{
      borderRadius: 18,
      borderWidth: 1.2,
      borderColor: isDark ? colors.border : INK,
      backgroundColor: isDark ? colors.surface : '#FFFEF8',
      padding: 14,
      gap: 10,
    }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <View style={{
          width: 26, height: 26, borderRadius: 13,
          backgroundColor: isDark ? accent + '22' : accent + '33',
          borderWidth: 1.2, borderColor: isDark ? 'rgba(255,255,255,0.18)' : INK,
          alignItems: 'center', justifyContent: 'center',
        }}>
          {icon}
        </View>
        <Text style={{
          fontSize: 11, letterSpacing: 1.6, textTransform: 'uppercase',
          fontFamily: font.bodyBold, color: ink,
        }}>
          {title}
        </Text>
      </View>
      {children}
    </View>
  )
}

function BulletSection({
  title, items, dot, isDark, accent,
}: {
  title: string
  items: string[]
  dot: string
  isDark: boolean
  accent: string
}) {
  const { colors, font } = useTheme()
  const ink = isDark ? colors.text : INK
  return (
    <SectionCard
      icon={<View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: dot, borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.3)' : INK }} />}
      title={title}
      isDark={isDark}
      accent={accent}
    >
      <View style={{ gap: 6 }}>
        {items.map((item, i) => (
          <View key={i} style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-start' }}>
            <View style={{
              width: 6, height: 6, borderRadius: 3,
              backgroundColor: dot, marginTop: 7,
              borderWidth: 0.8, borderColor: isDark ? 'rgba(255,255,255,0.3)' : INK,
            }} />
            <Text style={[modalStyles.body, { color: ink, fontFamily: font.body, flex: 1 }]}>
              {item}
            </Text>
          </View>
        ))}
      </View>
    </SectionCard>
  )
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1 },
  headerWrap: { paddingHorizontal: 24, paddingTop: 4, paddingBottom: 12 },
  title: { fontSize: 26, letterSpacing: -0.5 },
  subtitle: { fontSize: 12, marginTop: 2, letterSpacing: 0.2 },

  ringWrap: { alignItems: 'center', position: 'relative' },
  ringStage: { width: SVG_SIZE, height: SVG_SIZE, position: 'relative' },
  hint: { fontSize: 10, textAlign: 'center', marginTop: 4 },

  centerInner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 36,
  },
  centerLabel: { fontSize: 10.5, letterSpacing: 1.8, marginBottom: 4 },
  centerName: {
    fontSize: 26,
    lineHeight: 30,
    textAlign: 'center',
    letterSpacing: -0.4,
  },
  centerWeek: { fontSize: 14, marginTop: 4, fontStyle: 'italic' },

  panel: { flex: 1 },
  // flexGrow + centered so the bottom content sits balanced in the available
  // space (rather than pinned to the top with dead space below when the list
  // is absent under Diffuse). With more content it just fills naturally.
  panelContent: { paddingHorizontal: 24, paddingTop: 14, gap: 16, flexGrow: 1, justifyContent: 'center' },

  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  metaLabel: { fontSize: 11, letterSpacing: 1.8, textTransform: 'uppercase', flex: 1 },
  statusPill: {
    paddingHorizontal: 11,
    paddingVertical: 4,
    borderRadius: 99,
    borderWidth: 1.2,
  },
  statusPillText: { fontSize: 10, letterSpacing: 0.5, textTransform: 'uppercase' },

  descCard: {
    padding: 14,
    paddingRight: 12,
    borderRadius: 18,
    borderWidth: 1.2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  descText: { fontSize: 15, lineHeight: 22 },
  descCta: { fontSize: 11, letterSpacing: 0.6, textTransform: 'uppercase', opacity: 0.7 },

  section: { gap: 10 },
  sectionLabel: { fontSize: 9.5, letterSpacing: 1.8, textTransform: 'uppercase' },

  stripRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  stripDot: { borderRadius: 8 },
})

const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(20,19,19,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 1.5,
    borderLeftWidth: 1.5,
    borderRightWidth: 1.5,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 14,
  },
  eyebrow: {
    fontSize: 10.5,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  title: { fontSize: 26, letterSpacing: -0.5, lineHeight: 30 },
  body: { fontSize: 14, lineHeight: 21 },
  phaseLabel: { fontSize: 14, letterSpacing: -0.2 },
  tip: {
    flexDirection: 'row',
    gap: 10,
    padding: 14,
    borderRadius: 18,
    borderWidth: 1.2,
    alignItems: 'flex-start',
  },
  tipText: { fontSize: 14, lineHeight: 21, flex: 1 },
})
