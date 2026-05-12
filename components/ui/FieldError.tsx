/**
 * FieldError — validation error text displayed below an input.
 *
 * Uses brand.error color, 13px body, 8px top margin. Pair with TextField
 * (which auto-renders this) or render manually below any input.
 */

import { View, Text, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useTheme, spacing } from '../../constants/theme'

interface FieldErrorProps {
  message: string
  showIcon?: boolean
}

export function FieldError({ message, showIcon = true }: FieldErrorProps) {
  const { brand, font } = useTheme()

  return (
    <View style={styles.row}>
      {showIcon ? (
        <Ionicons name="alert-circle" size={14} color={brand.error} style={styles.icon} />
      ) : null}
      <Text style={[styles.text, { color: brand.error, fontFamily: font.bodyMedium }]}>
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
