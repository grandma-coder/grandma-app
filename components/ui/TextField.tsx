/**
 * TextField — the canonical wrapped TextInput for free-text entry.
 *
 * Pairs label + input + optional error in one component so forms stay
 * visually consistent. Use this whenever you'd otherwise spread `inputStyles`.
 */

import { forwardRef } from 'react'
import { View, Text, TextInput, type TextInputProps, StyleSheet, type ViewStyle, type StyleProp } from 'react-native'
import { useTheme, useDiffuseTheme, radius, spacing, fontSize as fs, diffuseFont } from '../../constants/theme'
import { FieldError } from './FieldError'
import { useIsDiffuse } from './diffuse/DiffuseKit'

interface TextFieldProps extends TextInputProps {
  label?: string
  error?: string
  containerStyle?: StyleProp<ViewStyle>
  height?: number
}

export const TextField = forwardRef<TextInput, TextFieldProps>(function TextField(props, ref) {
  const diffuse = useIsDiffuse()
  return diffuse
    ? <DiffuseTextField {...props} forwardedRef={ref} />
    : <CurrentTextField {...props} forwardedRef={ref} />
})

type InnerProps = TextFieldProps & { forwardedRef: React.Ref<TextInput> }

function CurrentTextField({ label, error, containerStyle, height = 64, style, forwardedRef, ...rest }: InnerProps) {
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
        ref={forwardedRef}
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
}

// ─── Diffuse — bare underlined field, mono label (.field / .field-lab) ──────
// No card, no radius: transparent input on a bottom hairline. The mono label
// sits above; the rule strengthens to --d-hairline on error (via border color).

function DiffuseTextField({ label, error, containerStyle, height = 56, style, forwardedRef, ...rest }: InnerProps) {
  const { colors } = useDiffuseTheme()
  const hasError = !!error

  return (
    <View style={containerStyle}>
      {label ? (
        <Text style={[diffuseStyles.label, { color: colors.ink3 }]}>{label}</Text>
      ) : null}
      <TextInput
        ref={forwardedRef}
        style={[
          {
            backgroundColor: 'transparent',
            borderBottomWidth: 1.5,
            borderBottomColor: hasError ? colors.error : colors.line2,
            paddingHorizontal: 2,
            paddingTop: 10,
            paddingBottom: 12,
            height,
            fontSize: 18,
            fontFamily: diffuseFont.body,
            color: colors.ink,
          },
          style,
        ]}
        placeholderTextColor={colors.ink4}
        selectionColor={colors.ink}
        {...rest}
      />
      {hasError ? <FieldError message={error!} /> : null}
    </View>
  )
}

const styles = StyleSheet.create({
  label: {
    fontSize: 10,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
})

const diffuseStyles = StyleSheet.create({
  label: {
    fontFamily: diffuseFont.mono,
    fontSize: 10,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
})
