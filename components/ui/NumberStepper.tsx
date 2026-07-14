/**
 * NumberStepper — a −/+ dial for numeric log values (weight, temperature,
 * glasses, …). The user nudges the number up and down instead of erasing and
 * retyping. Press-and-hold repeats with a gentle acceleration.
 *
 * The value is still tappable to type directly (decimal-pad) as a fallback for
 * a big jump, but stepping is the primary interaction. Dual-mode styling:
 * cream-paper sticker buttons (current) and hairline pill buttons (Diffuse).
 */

import { useEffect, useRef, useState } from 'react'
import { View, Text, Pressable, TextInput, StyleSheet } from 'react-native'
import { Minus, Plus } from 'lucide-react-native'
import { useTheme, useDiffuseTheme, diffuseFont } from '../../constants/theme'
import { useIsDiffuse, SoftBloom } from './diffuse/DiffuseKit'

interface NumberStepperProps {
  value: number
  onChange: (n: number) => void
  /** Amount added/removed per tap. Decimals allowed (e.g. 0.1). Default 1. */
  step?: number
  min?: number
  max?: number
  /** Decimal places to display + round to. Default derived from step. */
  precision?: number
  /** Unit suffix shown next to the number (e.g. "kg", "°C"). */
  unit?: string
  /** Accent color for the +/− buttons + active border (mode/brand color). */
  color: string
}

const HOLD_START_DELAY = 400 // ms before repeat kicks in
const HOLD_INTERVAL = 90 // ms between repeats
const HOLD_ACCEL_AFTER = 12 // repeats before speeding up

function decimalsOf(step: number): number {
  if (Number.isInteger(step)) return 0
  const s = step.toString()
  const i = s.indexOf('.')
  return i === -1 ? 0 : s.length - i - 1
}

export function NumberStepper({
  value,
  onChange,
  step = 1,
  min = 0,
  max = Number.MAX_SAFE_INTEGER,
  precision,
  unit,
  color,
}: NumberStepperProps) {
  const { colors, font } = useTheme()
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()

  const places = precision ?? decimalsOf(step)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')

  // Hold-to-repeat plumbing. Kept in refs so the timers read the latest value
  // without re-arming on every change.
  const valueRef = useRef(value)
  valueRef.current = value
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const repeatTimer = useRef<ReturnType<typeof setInterval> | null>(null)

  const clamp = (n: number) => Math.max(min, Math.min(max, n))
  const round = (n: number) => {
    const f = Math.pow(10, places)
    return Math.round(n * f) / f
  }

  const nudge = (dir: 1 | -1) => {
    const next = clamp(round(valueRef.current + dir * step))
    if (next !== valueRef.current) onChange(next)
  }

  const clearTimers = () => {
    if (holdTimer.current) { clearTimeout(holdTimer.current); holdTimer.current = null }
    if (repeatTimer.current) { clearInterval(repeatTimer.current); repeatTimer.current = null }
  }

  const startHold = (dir: 1 | -1) => {
    nudge(dir) // immediate first step
    holdTimer.current = setTimeout(() => {
      let repeats = 0
      repeatTimer.current = setInterval(() => {
        repeats += 1
        // After a while, take bigger strides so long holds move fast.
        const bigStride = repeats > HOLD_ACCEL_AFTER
        const next = clamp(round(valueRef.current + dir * step * (bigStride ? 5 : 1)))
        if (next !== valueRef.current) onChange(next)
      }, HOLD_INTERVAL)
    }, HOLD_START_DELAY)
  }

  useEffect(() => clearTimers, [])

  const commitDraft = () => {
    const parsed = parseFloat(draft.replace(',', '.'))
    if (!isNaN(parsed)) onChange(clamp(round(parsed)))
    setEditing(false)
  }

  const display = places > 0 ? value.toFixed(places) : String(value)
  const atMin = value <= min
  const atMax = value >= max

  // ── Button styling, per variant ──
  // Diffuse: our signature soft-bloom node — a hairline circle with the accent
  //   color blooming softly from within (clipped by overflow:hidden, like the
  //   center FAB), glyph in the accent color.
  // Current: filled sticker pill — accent fill + ink hairline border, the
  //   cream-paper button shape.
  const btnStyle = (disabled: boolean) =>
    diffuse
      ? {
          backgroundColor: dt.colors.surface,
          borderColor: disabled ? dt.colors.line : color,
          overflow: 'hidden' as const,
          opacity: disabled ? 0.4 : 1,
        }
      : {
          backgroundColor: disabled ? colors.surface : color,
          borderColor: '#141313',
          opacity: disabled ? 0.5 : 1,
        }

  const glyphColor = diffuse ? dt.colors.ink : '#141313'

  // Soft accent bloom that lives inside the Diffuse button node.
  const Bloom = () =>
    diffuse ? (
      <View pointerEvents="none" style={StyleSheet.absoluteFillObject}>
        <SoftBloom color={color} opacity={dt.isDark ? 0.5 : 0.62} spread={0.5} radius="70%" />
      </View>
    ) : null

  return (
    <View style={styles.row}>
      <Pressable
        onPressIn={() => !atMin && startHold(-1)}
        onPressOut={clearTimers}
        disabled={atMin}
        hitSlop={8}
        style={({ pressed }) => [
          styles.btn,
          btnStyle(atMin),
          pressed && !atMin && { transform: [{ scale: 0.92 }] },
        ]}
        accessibilityRole="button"
        accessibilityLabel="Decrease"
      >
        <Bloom />
        <Minus size={22} color={glyphColor} strokeWidth={2.5} />
      </Pressable>

      <View style={styles.valueWrap}>
        {editing ? (
          <TextInput
            value={draft}
            onChangeText={setDraft}
            onBlur={commitDraft}
            onSubmitEditing={commitDraft}
            keyboardType="decimal-pad"
            autoFocus
            selectTextOnFocus
            style={[
              styles.value,
              { color: diffuse ? dt.colors.ink : colors.text, fontFamily: diffuse ? diffuseFont.display : font.display },
            ]}
          />
        ) : (
          <Pressable onPress={() => { setDraft(display); setEditing(true) }} hitSlop={10}>
            <Text
              style={[
                styles.value,
                { color: diffuse ? dt.colors.ink : colors.text, fontFamily: diffuse ? diffuseFont.display : font.display },
              ]}
            >
              {display}
              {unit ? (
                <Text
                  style={[
                    styles.unit,
                    diffuse
                      ? { color: dt.colors.ink3, fontFamily: diffuseFont.mono, letterSpacing: 1.4 }
                      : { color: colors.textMuted, fontFamily: font.bodyMedium },
                  ]}
                >
                  {' '}{diffuse && unit.length <= 3 ? unit.toUpperCase() : unit}
                </Text>
              ) : null}
            </Text>
          </Pressable>
        )}
      </View>

      <Pressable
        onPressIn={() => !atMax && startHold(1)}
        onPressOut={clearTimers}
        disabled={atMax}
        hitSlop={8}
        style={({ pressed }) => [
          styles.btn,
          btnStyle(atMax),
          pressed && !atMax && { transform: [{ scale: 0.92 }] },
        ]}
        accessibilityRole="button"
        accessibilityLabel="Increase"
      >
        <Bloom />
        <Plus size={22} color={glyphColor} strokeWidth={2.5} />
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  btn: {
    width: 56,
    height: 56,
    borderRadius: 999,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  valueWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  value: {
    fontSize: 44,
    letterSpacing: -1,
    textAlign: 'center',
    minWidth: 120,
  },
  unit: {
    fontSize: 16,
  },
})
