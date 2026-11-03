/**
 * Typography primitives — matches `.display`, `.display-italic`, `.mono-caps` from tokens.css.
 *
 *   Display       — Fraunces 600, tight tracking, for big headings
 *   DisplayItalic — Instrument Serif italic, for accent words in the hero
 *   MonoCaps      — DM Sans 500, uppercase, 1.2px tracking — field labels
 *   Body          — DM Sans 400/500/600 — default UI text
 */

import { ReactNode } from 'react'
import { Text, TextProps, StyleSheet } from 'react-native'
import { useTheme, useDiffuseTheme, diffuseFont } from '../../constants/theme'
import { useIsDiffuse } from './diffuse/DiffuseKit'

type TextVariantProps = Omit<TextProps, 'children'> & {
  children: ReactNode
  color?: string
  size?: number
  align?: 'left' | 'center' | 'right'
}

// These primitives self-branch on the theme variant so every call site renders
// the correct family without per-call edits: under Diffuse, Cormorant serif /
// Hanken sans / Space Mono + the diffuse ink ramp; otherwise the current
// Fraunces / DM Sans + cream tokens. `color`/`style` overrides still win.

export function Display({ children, color, size = 40, align, style, ...rest }: TextVariantProps) {
  const { font, colors } = useTheme()
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
  const fam = diffuse ? diffuseFont.display : font.display
  const fallback = diffuse ? dt.colors.ink : colors.text
  return (
    <Text
      {...rest}
      style={[
        diffuse ? styles.display : styles.displaySite,
        { fontFamily: fam, fontSize: size, color: color ?? fallback, textAlign: align, lineHeight: size * (diffuse ? 1.02 : 1.24) },
        style,
      ]}
    >
      {children}
    </Text>
  )
}

export function DisplayItalic({ children, color, size = 40, align, style, ...rest }: TextVariantProps) {
  const { font, colors } = useTheme()
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
  const fam = diffuse ? diffuseFont.italic : font.italic
  const fallback = diffuse ? dt.colors.ink : colors.text
  return (
    <Text
      {...rest}
      style={[
        diffuse ? styles.displayItalic : styles.displayItalicSite,
        { fontFamily: fam, fontSize: size, color: color ?? fallback, textAlign: align, lineHeight: size * (diffuse ? 1.02 : 1.24) },
        style,
      ]}
    >
      {children}
    </Text>
  )
}

export function MonoCaps({ children, color, size = 10, align, style, ...rest }: TextVariantProps) {
  const { font, colors } = useTheme()
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
  // Under Diffuse this is the true mono "data voice" (Space Mono); the current
  // theme keeps its DM Sans medium (as before).
  const fam = diffuse ? diffuseFont.mono : 'SpaceMono_400Regular'
  const fallback = diffuse ? dt.colors.ink3 : colors.textMuted
  return (
    <Text
      {...rest}
      style={[
        diffuse ? styles.monoCaps : styles.monoCapsSite,
        { fontFamily: fam, fontSize: size, color: color ?? fallback, textAlign: align },
        style,
      ]}
    >
      {children}
    </Text>
  )
}

export function Body({ children, color, size = 15, align, style, ...rest }: TextVariantProps) {
  const { font, colors } = useTheme()
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
  const fam = diffuse ? diffuseFont.body : font.body
  const fallback = diffuse ? dt.colors.ink : colors.text
  return (
    <Text
      {...rest}
      style={[{ fontFamily: fam, fontSize: size, color: color ?? fallback, textAlign: align }, style]}
    >
      {children}
    </Text>
  )
}

const styles = StyleSheet.create({
  display: { letterSpacing: -0.8 },
  displayItalic: { letterSpacing: -0.4 },
  monoCaps: { letterSpacing: 1.2, textTransform: 'uppercase' },
  displaySite: { letterSpacing: 0.2, textTransform: 'uppercase' },
  displayItalicSite: { letterSpacing: 0 },
  monoCapsSite: { letterSpacing: 1.4, textTransform: 'uppercase' },
})
