/**
 * FormRow — paper card row with sticker icon circle + MONO-CAPS label + serif value.
 *
 * Used across onboarding, profile, and any "field as row" pattern in the redesign.
 * Pass `children` to render a custom trailing control (picker, switch, chevron).
 */

import { ReactNode } from 'react'
import { View, Text, Pressable, StyleSheet, ViewStyle, StyleProp } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useTheme, useDiffuseTheme, diffuseFont } from '../../constants/theme'
import { useIsDiffuse } from './diffuse/DiffuseKit'

interface FormRowProps {
  label: string
  value?: string | number
  sticker?: ReactNode
  stickerTint?: string
  onPress?: () => void
  children?: ReactNode
  showChevron?: boolean
  style?: StyleProp<ViewStyle>
}

export function FormRow(props: FormRowProps) {
  const diffuse = useIsDiffuse()
  return diffuse ? <DiffuseFormRow {...props} /> : <CurrentFormRow {...props} />
}

function CurrentFormRow({
  label,
  value,
  sticker,
  stickerTint,
  onPress,
  children,
  showChevron = true,
  style,
}: FormRowProps) {
  const { colors, font, stickers } = useTheme()

  const paper = colors.surface
  const paperBorder = colors.border
  const ink = colors.text
  const ink4 = colors.textFaint
  const stickerBg = stickerTint ?? stickers.yellowSoft

  const Container: any = onPress ? Pressable : View

  return (
    <Container
      onPress={onPress}
      style={({ pressed }: { pressed?: boolean }) => [
        styles.row,
        {
          backgroundColor: paper,
          borderColor: paperBorder,
          opacity: pressed ? 0.9 : 1,
        },
        style,
      ]}
    >
      {sticker && (
        <View style={[styles.stickerCircle, { backgroundColor: stickerBg }]}>
          {sticker}
        </View>
      )}

      <View style={styles.body}>
        <Text
          style={[styles.label, { fontFamily: font.bodyMedium, color: ink4 }]}
          numberOfLines={1}
        >
          {label}
        </Text>
        {value !== undefined && (
          <Text
            style={[styles.value, { fontFamily: font.display, color: ink }]}
            numberOfLines={1}
          >
            {value}
          </Text>
        )}
      </View>

      {children ? <View style={styles.trailing}>{children}</View> : null}

      {showChevron && onPress && !children ? (
        <Ionicons name="chevron-forward" size={18} color={ink4} />
      ) : null}
    </Container>
  )
}

// ─── Diffuse — bare row on a bottom hairline; mono-caps label + serif value ─
// No card fill; the sticker keeps its role but sits in a hairline circle
// instead of a soft-tinted socket.

function DiffuseFormRow({
  label,
  value,
  sticker,
  onPress,
  children,
  showChevron = true,
  style,
}: FormRowProps) {
  const { colors } = useDiffuseTheme()
  const Container: any = onPress ? Pressable : View

  return (
    <Container
      onPress={onPress}
      style={({ pressed }: { pressed?: boolean }) => [
        diffuseStyles.row,
        { borderBottomColor: colors.line2, opacity: pressed ? 0.6 : 1 },
        style,
      ]}
    >
      {sticker && (
        <View style={[diffuseStyles.stickerCircle, { borderColor: colors.line2 }]}>
          {sticker}
        </View>
      )}

      <View style={styles.body}>
        <Text
          style={[diffuseStyles.label, { color: colors.ink3 }]}
          numberOfLines={1}
        >
          {label}
        </Text>
        {value !== undefined && (
          <Text
            style={[diffuseStyles.value, { color: colors.ink }]}
            numberOfLines={1}
          >
            {value}
          </Text>
        )}
      </View>

      {children ? <View style={styles.trailing}>{children}</View> : null}

      {showChevron && onPress && !children ? (
        <Ionicons name="chevron-forward" size={16} color={colors.ink3} />
      ) : null}
    </Container>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 20,
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  stickerCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { flex: 1 },
  label: {
    fontSize: 10,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  value: {
    fontSize: 16,
    letterSpacing: -0.2,
  },
  trailing: {
    marginLeft: 'auto',
  },
})

const diffuseStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderBottomWidth: 1,
    paddingVertical: 16,
    paddingHorizontal: 2,
  },
  stickerCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontFamily: diffuseFont.mono,
    fontSize: 10,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  value: {
    fontFamily: diffuseFont.display,
    fontSize: 18,
    letterSpacing: -0.2,
  },
})
