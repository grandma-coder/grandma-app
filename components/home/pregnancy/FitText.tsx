/**
 * FitText — sets a line of daily-message copy as large as it can be while
 * staying inside a fixed box, in any language.
 *
 * 1. Picks ONE face for the whole string (hand-lettered for Latin-1, a clean
 *    sans for Turkish, the system face for CJK / Devanagari / Arabic — see
 *    lib/dailyMessage/typeface.ts), so no glyph-by-glyph font swaps.
 * 2. Estimates a size from the text's length and its longest word (German
 *    compounds) so the first frame is already close.
 * 3. Measures the real layout (onTextLayout) and steps the size down until
 *    every line fits the width and the block fits the height. Never clips.
 */
import { useMemo, useState } from 'react'
import { Text, type StyleProp, type TextStyle, type TextLayoutEventData, type NativeSyntheticEvent } from 'react-native'
import { dailyDisplayFace, type DailyFace } from '../../../lib/dailyMessage/typeface'

interface Props {
  text: string
  /** Box the text must fit (layout units of the parent, before any transform). */
  width: number
  height: number
  maxSize: number
  minSize?: number
  color: string
  align?: 'left' | 'center'
  style?: StyleProp<TextStyle>
}

const WIDE = /[\u1100-\u11ff\u2e80-\u9fff\uac00-\ud7af\uf900-\ufaff\uff00-\uffef]/

function estimate(text: string, face: DailyFace, width: number, height: number, max: number, min: number): number {
  // Average advance per char in ems: full-width CJK ≈ 1, everything else ≈ .52.
  let ems = 0
  for (const ch of text) ems += WIDE.test(ch) ? 1 : 0.52
  ems = Math.max(ems, 1)
  // Area fit with ~35% slack for ragged line ends.
  let size = Math.sqrt((width * height * 0.65) / (ems * face.lineRatio))
  // The longest unbreakable word must fit on one line.
  if (!WIDE.test(text)) {
    const longest = text.split(/\s+/).reduce((n, w) => Math.max(n, w.length), 1)
    size = Math.min(size, width / (longest * 0.6))
  }
  return Math.round(Math.max(min, Math.min(max, size)))
}

export function FitText({ text, width, height, maxSize, minSize = 12, color, align = 'center', style }: Props) {
  const face = useMemo(() => dailyDisplayFace(text), [text])
  const first = useMemo(() => estimate(text, face, width, height, maxSize, minSize), [text, face, width, height, maxSize, minSize])
  // The shrink steps belong to one estimate: new text / box → start over.
  const [fit, setFit] = useState({ from: first, size: first })
  const size = fit.from === first ? fit.size : first

  const onTextLayout = (e: NativeSyntheticEvent<TextLayoutEventData>) => {
    const lines = e.nativeEvent.lines
    if (!lines.length) return
    const total = lines.reduce((h, l) => h + l.height, 0)
    const tooWide = lines.some((l) => l.width > width + 1)
    if ((total > height + 1 || tooWide) && size > minSize) {
      setFit({ from: first, size: Math.max(minSize, Math.floor(size * 0.92)) })
    }
  }

  return (
    <Text
      onTextLayout={onTextLayout}
      style={[
        {
          width,
          color,
          textAlign: align,
          fontSize: size,
          lineHeight: Math.round(size * face.lineRatio),
          letterSpacing: face.letterSpacing,
          fontFamily: face.fontFamily,
          fontWeight: face.fontWeight,
        },
        style,
      ]}
    >
      {text}
    </Text>
  )
}
