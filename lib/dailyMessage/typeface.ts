// Which face can set a given line of daily-message copy.
//
// The site look's hand-lettered display face (Architects Daughter) only covers
// Latin-1 + common punctuation. Turkish ğ/ş/İ, CJK, Hangul, Devanagari and
// Arabic are missing, and iOS would silently swap fonts glyph-by-glyph
// mid-word. So we detect the text's script and pick ONE face for the whole line.
import { font } from '../../constants/theme'

export type DailyScript = 'hand' | 'latin' | 'cjk' | 'tall'

// Latin-1 + the punctuation the translations use (’ ‘ “ ” „ « » – — … œ ı nbsp).
const HAND_COVERED = /^[\u0000-\u00ff\u0131\u0152\u0153\u2013\u2014\u2018-\u201f\u2026\u202f]*$/
const CJK = /[\u3000-\u30ff\u3400-\u9fff\uac00-\ud7af\uff00-\uffef]/
// Scripts with tall ascenders / stacked marks that need extra line height.
const TALL = /[\u0600-\u06ff\u0750-\u077f\u0900-\u097f]/

export function dailyScript(text: string): DailyScript {
  if (HAND_COVERED.test(text)) return 'hand'
  if (CJK.test(text)) return 'cjk'
  if (TALL.test(text)) return 'tall'
  return 'latin'
}

export interface DailyFace {
  /** undefined = system font (it has every script). */
  fontFamily?: string
  fontWeight?: '400' | '600'
  /** line-height as a multiple of font size */
  lineRatio: number
  /** letter-spacing that suits this face */
  letterSpacing: number
}

/** The display face for daily-message copy (questions, cards, share images). */
export function dailyDisplayFace(text: string): DailyFace {
  switch (dailyScript(text)) {
    case 'hand': return { fontFamily: font.display, lineRatio: 1.28, letterSpacing: 0.2 }
    case 'latin': return { fontFamily: font.bodySemiBold, lineRatio: 1.26, letterSpacing: -0.2 }
    case 'cjk': return { fontWeight: '600', lineRatio: 1.45, letterSpacing: 0 }
    case 'tall': return { fontWeight: '600', lineRatio: 1.6, letterSpacing: 0 }
  }
}
