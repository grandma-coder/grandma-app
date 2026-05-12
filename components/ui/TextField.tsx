/**
 * TextField — the canonical wrapped TextInput for free-text entry.
 *
 * Pairs label + input + optional error in one component so forms stay
 * visually consistent. Use this whenever you'd otherwise spread `inputStyles`.
 */

import { forwardRef } from 'react'
import { View, Text, TextInput, type TextInputProps, StyleSheet, type ViewStyle, type StyleProp } from 'react-native'
import { useTheme, radius, spacing, fontSize as fs } from '../../constants/theme'
import { FieldError } from './FieldError'

interface TextFieldProps extends TextInputProps {
  label?: string
  error?: string
  containerStyle?: StyleProp<ViewStyle>
  height?: number
}

export const TextField = forwardRef<TextInput, TextFieldProps>(function TextField(
  { label, error, containerStyle, height = 64, style, ...rest },
  ref,
) {
  const { colors, font, brand } = useTheme()
  const hasError = !!error

  return (
    <View style={containerStyle}>
      {label ? (
        <Text style={[styles.label, { fontFamily: font.bodyMedium, color: colors.textFaint }]}>
          {label}
        </Text>
      ) : null}
      <TextInput
        ref={ref}
        style={[
          {
            backgroundColor: colors.surface,
            borderColor: hasError ? brand.error : colors.border,
            borderWidth: hasError ? 1.5 : 1,
            borderRadius: radius.md,
            paddingHorizontal: spacing.lg,
            height,
            fontSize: fs.md,
            fontFamily: font.bodyMedium,
            color: colors.text,
          },
          style,
        ]}
        placeholderTextColor={colors.textMuted}
        selectionColor={brand.secondary}
        {...rest}
      />
      {hasError ? <FieldError message={error!} /> : null}
    </View>
  )
})

const styles = StyleSheet.create({
  label: {
    fontSize: 10,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
})
