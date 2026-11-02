/**
 * Default font for text that doesn't name one.
 *
 * `Text.defaultProps` no longer applies under React 19 (function components ignore
 * defaultProps), so any text without a `fontFamily` fell back to the system font (SF)
 * instead of Hanken Grotesk. This swaps react-native's `Text` / `TextInput` exports for thin
 * wrappers that look at the FINAL flattened style at render time and, only when no
 * `fontFamily` is set anywhere in it, add the Hanken weight matching its `fontWeight`.
 * A font set by any style in the array is never overridden (an earlier StyleSheet-level
 * patch did that and clobbered display titles via later modifier styles).
 *
 * Babel compiles `import { Text } from 'react-native'` to a property read at each use, so
 * replacing the getter here reaches every screen. Imported first in app/_layout.tsx.
 */
import { createElement, forwardRef } from 'react'
import { StyleSheet, type StyleProp, type TextStyle } from 'react-native'

// The real exports object (not an interop copy) — other modules read `.Text` from it at use time.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const RN: Record<string, any> = require('react-native')

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

/** The style to render with: unchanged when a fontFamily is present, else Hanken by weight. */
export function withDefaultFont(style: unknown): unknown {
  const flat = (StyleSheet.flatten(style as StyleProp<TextStyle>) ?? {}) as TextStyle
  if (flat.fontFamily) return style
  return [style, { fontFamily: hankenFor(flat.fontWeight) }]
}

function wrap(Orig: any, name: string) {
  const Wrapped = forwardRef<unknown, any>((props, ref) =>
    createElement(Orig, { ...props, ref, style: withDefaultFont(props.style) }),
  )
  ;(Wrapped as { displayName?: string }).displayName = name
  return Wrapped
}

let patched = false
export function patchDefaultFont() {
  if (patched) return
  patched = true
  try {
    const OrigText = RN.Text
    const OrigInput = RN.TextInput
    const Text = Object.assign(wrap(OrigText, 'Text'), OrigText)
    const TextInput = Object.assign(wrap(OrigInput, 'TextInput'), OrigInput)
    Object.defineProperty(RN, 'Text', { configurable: true, enumerable: true, get: () => Text })
    Object.defineProperty(RN, 'TextInput', { configurable: true, enumerable: true, get: () => TextInput })
  } catch {
    // Export not redefinable in this environment (e.g. some test mocks) — leave the system default.
  }
}

patchDefaultFont()
