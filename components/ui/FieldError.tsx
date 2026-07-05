/**
 * FieldError — validation error text displayed below an input.
 *
 * Uses brand.error color, 13px body, 8px top margin. Pair with TextField
 * (which auto-renders this) or render manually below any input.
 */

import { View, Text, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useTheme, spacing, useDiffuseTheme, diffuseFont } from '../../constants/theme'
import { useIsDiffuse } from './diffuse/DiffuseKit'

interface FieldErrorProps {
  message: string
  showIcon?: boolean
}

export function FieldError({ message, showIcon = true }: FieldErrorProps) {
  const diffuse = useIsDiffuse()
  const { brand, font } = useTheme()
  const dt = useDiffuseTheme()

  // Diffuse: mono, uppercase, the carried-forward error red. Otherwise the
  // current body-medium error line.
  const errColor = diffuse ? dt.colors.error : brand.error
  const textStyle = diffuse
    ? { color: errColor, fontFamily: diffuseFont.mono, fontSize: 10, letterSpacing: 1.4, textTransform: 'uppercase' as const }
    : { color: errColor, fontFamily: font.bodyMedium, fontSize: 13 }

  return (
    <View style={styles.row}>
      {showIcon ? (
        <Ionicons name="alert-circle" size={14} color={errColor} style={styles.icon} />
      ) : null}
      <Text style={[styles.text, textStyle]}>
        {message}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  icon: {
    marginRight: 4,
  },
  text: {
    fontSize: 13,
    flexShrink: 1,
  },
})
