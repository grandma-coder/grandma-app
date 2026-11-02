/**
 * Ink-outlined shapes for the site look. Clean by default; `wobble` adds the hand-drawn
 * line of the site's stickers for a few signature buttons only.
 *
 * wobblyPillPath() walks a pill's outline and nudges each point along its normal with a
 * smooth, seeded wobble (a few low-frequency sines), then joins the points with quadratic
 * curves. Same seed → same shape, so a button doesn't re-wobble on every render.
 */

import { ReactNode, useMemo, useState } from 'react'
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native'
import Svg, { Path } from 'react-native-svg'

function hash(str: string): number {
  let h = 2166136261
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return (h >>> 0) / 4294967295
}

/**
 * Rounded-rect outline (a pill when radius ≥ h/2) with a seeded hand wobble.
 * `amp` is the wobble in points; `inset` keeps the stroke inside the box.
 */
export function wobblyPillPath(w: number, h: number, seed: string, amp = 1.4, inset = 2, radius = Infinity): string {
  const x0 = inset + amp
  const y0 = inset + amp
  const W = w - 2 * x0
  const H = h - 2 * y0
  if (W <= 0 || H <= 0) return ''
  const r = Math.min(radius, H / 2, W / 2)
  const LW = W - 2 * r
  const LH = H - 2 * r
  const arc = (Math.PI / 2) * r
  const P = 2 * LW + 2 * LH + 4 * arc
  const ph = [hash(seed) * 6.28, hash(seed + 'b') * 6.28, hash(seed + 'c') * 6.28]
  const N = Math.max(36, Math.round(P / 9))
  // corner centres, clockwise from top-right
  const cx = [x0 + W - r, x0 + W - r, x0 + r, x0 + r]
  const cy = [y0 + r, y0 + H - r, y0 + H - r, y0 + r]

  const pts: [number, number][] = []
  for (let i = 0; i < N; i++) {
    const t = i / N
    let s = t * P
    let x = 0, y = 0, nx = 0, ny = 0
    const edges: [number, () => void][] = [
      [LW, () => { x = x0 + r + s; y = y0; nx = 0; ny = -1 }],
      [arc, () => { const a = -Math.PI / 2 + s / r; x = cx[0] + Math.cos(a) * r; y = cy[0] + Math.sin(a) * r; nx = Math.cos(a); ny = Math.sin(a) }],
      [LH, () => { x = x0 + W; y = y0 + r + s; nx = 1; ny = 0 }],
      [arc, () => { const a = s / r; x = cx[1] + Math.cos(a) * r; y = cy[1] + Math.sin(a) * r; nx = Math.cos(a); ny = Math.sin(a) }],
      [LW, () => { x = x0 + W - r - s; y = y0 + H; nx = 0; ny = 1 }],
      [arc, () => { const a = Math.PI / 2 + s / r; x = cx[2] + Math.cos(a) * r; y = cy[2] + Math.sin(a) * r; nx = Math.cos(a); ny = Math.sin(a) }],
      [LH, () => { x = x0; y = y0 + H - r - s; nx = -1; ny = 0 }],
      [arc, () => { const a = Math.PI + s / r; x = cx[3] + Math.cos(a) * r; y = cy[3] + Math.sin(a) * r; nx = Math.cos(a); ny = Math.sin(a) }],
    ]
    for (let e = 0; e < edges.length; e++) {
      const [len, place] = edges[e]
      if (s < len || e === edges.length - 1) { place(); break }
      s -= len
    }
    const wob =
      amp * (0.55 * Math.sin(2 * Math.PI * 3 * t + ph[0]) + 0.3 * Math.sin(2 * Math.PI * 7 * t + ph[1]) + 0.15 * Math.sin(2 * Math.PI * 13 * t + ph[2]))
    pts.push([x + nx * wob, y + ny * wob])
  }

  const mid = (a: [number, number], b: [number, number]) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]
  const f = (n: number) => n.toFixed(2)
  const start = mid(pts[N - 1], pts[0])
  let d = `M${f(start[0])} ${f(start[1])}`
  for (let i = 0; i < N; i++) {
    const p = pts[i]
    const m = mid(p, pts[(i + 1) % N])
    d += ` Q${f(p[0])} ${f(p[1])} ${f(m[0])} ${f(m[1])}`
  }
  return d + 'Z'
}

/** Absolute-fill SVG pill with a wobbly ink outline. Size it with `width`/`height` from onLayout. */
export function HandDrawnPill({
  width,
  height,
  fill,
  stroke,
  strokeWidth = 2.4,
  seed,
  radius,
  wobble = false,
}: {
  width: number
  height: number
  fill: string
  stroke?: string
  strokeWidth?: number
  seed: string
  /** Corner radius; omit for a full pill. */
  radius?: number
  /**
   * Hand wobble on the outline. Off by default — a clean ink line is calmer and some
   * people find a constantly wobbly UI uncomfortable. Turn it on only for a few
   * signature buttons (action discs, back/close, stepper ±).
   */
  wobble?: boolean
}) {
  const d = useMemo(
    () => (width > 0 ? wobblyPillPath(width, height, seed, wobble ? Math.min(1.4, Math.min(width, height) * 0.03) : 0, 2, radius ?? Infinity) : ''),
    [width, height, seed, radius, wobble],
  )
  if (!d) return null
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Svg width={width} height={height}>
        <Path
          d={d}
          fill={fill}
          stroke={stroke ?? 'none'}
          strokeWidth={stroke ? strokeWidth : 0}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      </Svg>
    </View>
  )
}

/**
 * A View whose border is drawn by hand: put it where you'd put a bordered card or field.
 * Don't give it a borderWidth — the wobbly SVG outline replaces the border.
 */
export function HandDrawnBox({
  children,
  style,
  fill,
  stroke,
  radius = 16,
  strokeWidth = 2.2,
  seed,
}: {
  children?: ReactNode
  style?: StyleProp<ViewStyle>
  fill: string
  stroke: string
  radius?: number
  strokeWidth?: number
  seed: string
}) {
  const [size, setSize] = useState({ w: 0, h: 0 })
  return (
    <View
      style={style}
      onLayout={(e) => {
        const { width, height } = e.nativeEvent.layout
        if (Math.round(width) !== size.w || Math.round(height) !== size.h) setSize({ w: Math.round(width), h: Math.round(height) })
      }}
    >
      <HandDrawnPill width={size.w} height={size.h} fill={fill} stroke={stroke} strokeWidth={strokeWidth} radius={radius} seed={seed} />
      {children}
    </View>
  )
}

/** A hand-drawn horizontal rule — the tab bar's wavy ink edge, stretched to fit. */
export function HandRule({ color, height = 8, strokeWidth = 2 }: { color: string; height?: number; strokeWidth?: number }) {
  return (
    <View style={{ flex: 1, height }}>
      <Svg width="100%" height={height} viewBox="0 0 200 12" preserveAspectRatio="none">
        <Path d="M0 7 C25 3 45 10 75 6 S130 2 160 7 S190 9 200 6" stroke={color} strokeWidth={strokeWidth} fill="none" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      </Svg>
    </View>
  )
}
