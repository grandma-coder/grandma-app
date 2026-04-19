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
import { useTheme } from '../../constants/theme'

type TextVariantProps = Omit<TextProps, 'children'> & {
  children: ReactNode
  color?: string
  size?: number
  align?: 'left' | 'center' | 'right'
}

export function Display({ children, color, size = 40, align, style, ...rest }: TextVariantProps) {
  const { font, colors } = useTheme()
  return (
    <Text
      {...rest}
      style={[
        styles.display,
        { fontFamily: font.display, fontSize: size, color: color ?? colors.text, textAlign: align, lineHeight: size * 1.02 },
        style,
      ]}
    >
      {children}
    </Text>
  )
}

export function DisplayItalic({ children, color, size = 40, align, style, ...rest }: TextVariantProps) {
  const { font, colors } = useTheme()
  return (
    <Text
      {...rest}
      style={[
        styles.displayItalic,
        { fontFamily: font.italic, fontSize: size, color: color ?? colors.text, textAlign: align, lineHeight: size * 1.02 },
        style,
      ]}
    >
      {children}
    </Text>
  )
}

export function MonoCaps({ children, color, size = 10, align, style, ...rest }: TextVariantProps) {
  const { font, colors, isDark } = useTheme()
  const fallback = isDark ? colors.textFaint : '#A69E93'
  return (
    <Text
      {...rest}
      style={[
        styles.monoCaps,
        { fontFamily: font.bodyMedium, fontSize: size, color: color ?? fallback, textAlign: align },
        style,
      ]}
    >
      {children}
    </Text>
  )
}

export function Body({ children, color, size = 15, align, style, ...rest }: TextVariantProps) {
  const { font, colors } = useTheme()
  return (
    <Text
      {...rest}
      style={[{ fontFamily: font.body, fontSize: size, color: color ?? colors.text, textAlign: align }, style]}
    >
      {children}
    </Text>
  )
}

const styles = StyleSheet.create({
  display: { letterSpacing: -0.8 },
  displayItalic: { letterSpacing: -0.4 },
  monoCaps: { letterSpacing: 1.2, textTransform: 'uppercase' },
})
