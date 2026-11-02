/**
 * Default font for every text style that doesn't name one.
 *
 * `Text.defaultProps` no longer applies under React 19 (function components ignore
 * defaultProps), so any StyleSheet text style without a `fontFamily` fell back to the
 * system font (SF) instead of Hanken Grotesk. This wraps `StyleSheet.create` once, at
 * boot, and gives each entry that sets `fontSize` / `fontWeight` but no `fontFamily`
 * the Hanken weight that matches its `fontWeight`. Inline styles applied later still win.
 *
 * Must be imported before any module that calls StyleSheet.create at load time — it's the
 * first import in app/_layout.tsx.
 */
import { StyleSheet } from 'react-native'

const HANKEN: Record<string, string> = {
  '100': 'HankenGrotesk_400Regular', '200': 'HankenGrotesk_400Regular', '300': 'HankenGrotesk_400Regular',
  '400': 'HankenGrotesk_400Regular', normal: 'HankenGrotesk_400Regular',
  '500': 'HankenGrotesk_500Medium',
  '600': 'HankenGrotesk_600SemiBold',
  '700': 'HankenGrotesk_700Bold', bold: 'HankenGrotesk_700Bold', '800': 'HankenGrotesk_700Bold', '900': 'HankenGrotesk_700Bold',
}

export function hankenFor(weight: unknown): string {
  return HANKEN[String(weight ?? '400')] ?? 'HankenGrotesk_400Regular'
}

let patched = false
export function patchDefaultFont() {
  if (patched) return
  patched = true
  const create = StyleSheet.create.bind(StyleSheet) as (s: Record<string, unknown>) => unknown
  ;(StyleSheet as { create: unknown }).create = (styles: Record<string, unknown>) => {
    const out: Record<string, unknown> = {}
    for (const key of Object.keys(styles)) {
      const s = styles[key] as Record<string, unknown> | null
      out[key] = s && typeof s === 'object' && !Array.isArray(s) && s.fontFamily === undefined && (s.fontSize !== undefined || s.fontWeight !== undefined)
        ? { ...s, fontFamily: hankenFor(s.fontWeight) }
        : s
    }
    return create(out)
  }
}

patchDefaultFont()
