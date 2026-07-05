import { useEffect, useRef } from 'react'
import { Animated, Modal, Pressable, StyleSheet, Text, View } from 'react-native'
import { useTheme, radius, spacing, useDiffuseTheme, diffuseFont, getDiffuseAccent } from '../../constants/theme'
import { useModeStore } from '../../store/useModeStore'
import { useIsDiffuse } from './diffuse/DiffuseKit'

export interface PaperAlertButton {
  label: string
  onPress?: () => void
  variant?: 'primary' | 'secondary' | 'danger'
}

interface PaperAlertProps {
  visible: boolean
  title: string
  message?: string
  italic?: string
  buttons?: PaperAlertButton[]
  onRequestClose?: () => void
}

export function PaperAlert(props: PaperAlertProps) {
  const diffuse = useIsDiffuse()
  return diffuse ? <DiffusePaperAlert {...props} /> : <CurrentPaperAlert {...props} />
}

function CurrentPaperAlert({
  visible,
  title,
  message,
  italic,
  buttons = [{ label: 'OK', variant: 'primary' }],
  onRequestClose,
}: PaperAlertProps) {
  const { colors, font, stickers, brand } = useTheme()
  const fade = useRef(new Animated.Value(0)).current
  const scale = useRef(new Animated.Value(0.92)).current

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fade, { toValue: 1, duration: 180, useNativeDriver: true }),
        Animated.spring(scale, { toValue: 1, friction: 7, tension: 90, useNativeDriver: true }),
      ]).start()
    } else {
      fade.setValue(0)
      scale.setValue(0.92)
    }
  }, [visible, fade, scale])

  const handle = (b: PaperAlertButton) => {
    b.onPress?.()
    onRequestClose?.()
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onRequestClose}
    >
      <Pressable onPress={onRequestClose} style={[styles.backdrop, { opacity: 0.4 }]} />
      <View pointerEvents="box-none" style={styles.center}>
        <Animated.View
          style={[
            styles.card,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              opacity: fade,
              transform: [{ scale }],
            },
          ]}
        >
          <Text style={[styles.title, { color: colors.text, fontFamily: font.display }]}>
            {title}
          </Text>
          {italic ? (
            <Text style={[styles.italic, { color: stickers.coral, fontFamily: font.italic }]}>
              {italic}
            </Text>
          ) : null}
          {message ? (
            <Text style={[styles.message, { color: colors.textSecondary, fontFamily: font.body }]}>
              {message}
            </Text>
          ) : null}
          <View style={styles.buttons}>
            {buttons.map((b, i) => {
              const isPrimary = (b.variant ?? 'primary') === 'primary'
              const isDanger = b.variant === 'danger'
              const bg = isDanger
                ? stickers.peachSoft
                : isPrimary
                ? brand.pregnancy
                : 'transparent'
              const fg = isDanger ? stickers.coral : isPrimary ? colors.text : colors.textSecondary
              const border = !isPrimary && !isDanger ? colors.borderStrong : 'transparent'
              return (
                <Pressable
                  key={i}
                  onPress={() => handle(b)}
                  style={({ pressed }) => [
                    styles.btn,
                    {
                      backgroundColor: bg,
                      borderColor: border,
                      borderWidth: !isPrimary && !isDanger ? 1 : 0,
                      opacity: pressed ? 0.85 : 1,
                    },
                  ]}
                >
                  <Text style={[styles.btnLabel, { color: fg, fontFamily: font.bodySemiBold }]}>
                    {b.label}
                  </Text>
                </Pressable>
              )
            })}
          </View>
        </Animated.View>
      </View>
    </Modal>
  )
}

// ─── Diffuse — hairline card, serif title, containerless mono buttons ───────
// primary → soft accent-glass row · danger → coral mono link · secondary →
// quiet mono link. All on hairlines, no filled pills.

function DiffusePaperAlert({
  visible,
  title,
  message,
  italic,
  buttons = [{ label: 'OK', variant: 'primary' }],
  onRequestClose,
}: PaperAlertProps) {
  const { colors } = useDiffuseTheme()
  const mode = useModeStore((s) => s.mode)
  const accent = getDiffuseAccent(mode)
  const fade = useRef(new Animated.Value(0)).current
  const scale = useRef(new Animated.Value(0.92)).current

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fade, { toValue: 1, duration: 180, useNativeDriver: true }),
        Animated.spring(scale, { toValue: 1, friction: 7, tension: 90, useNativeDriver: true }),
      ]).start()
    } else {
      fade.setValue(0)
      scale.setValue(0.92)
    }
  }, [visible, fade, scale])

  const handle = (b: PaperAlertButton) => {
    b.onPress?.()
    onRequestClose?.()
  }

  return (
    <Modal visible={visible} transparent animationType="none" statusBarTranslucent onRequestClose={onRequestClose}>
      <Pressable onPress={onRequestClose} style={[styles.backdrop, { opacity: 0.4 }]} />
      <View pointerEvents="box-none" style={styles.center}>
        <Animated.View
          style={[
            styles.card,
            diffuseStyles.card,
            { backgroundColor: colors.surface, borderColor: colors.line, opacity: fade, transform: [{ scale }] },
          ]}
        >
          <Text style={[styles.title, { color: colors.ink, fontFamily: diffuseFont.display }]}>{title}</Text>
          {italic ? (
            <Text style={[styles.italic, { color: accent, fontFamily: diffuseFont.italic }]}>{italic}</Text>
          ) : null}
          {message ? (
            <Text style={[styles.message, { color: colors.ink2, fontFamily: diffuseFont.body }]}>{message}</Text>
          ) : null}
          <View style={diffuseStyles.buttons}>
            {buttons.map((b, i) => {
              const variant = b.variant ?? 'primary'
              const fg = variant === 'danger' ? colors.error : variant === 'primary' ? colors.ink : colors.ink3
              const showRule = variant === 'primary'
              return (
                <Pressable
                  key={i}
                  onPress={() => handle(b)}
                  style={({ pressed }) => [
                    diffuseStyles.btn,
                    showRule ? { borderTopWidth: 1, borderTopColor: colors.line2 } : null,
                    { opacity: pressed ? 0.6 : 1 },
                  ]}
                >
                  <Text style={[diffuseStyles.btnLabel, { color: fg }]}>{b.label}</Text>
                </Pressable>
              )
            })}
          </View>
        </Animated.View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#141313',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  card: {
    width: '100%',
    maxWidth: 340,
    borderRadius: radius.xl,
    borderWidth: 1,
    paddingHorizontal: spacing.lg + 4,
    paddingTop: spacing.lg + 4,
    paddingBottom: spacing.md,
    shadowColor: '#141313',
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.22,
    shadowRadius: 36,
    elevation: 14,
  },
  title: {
    fontSize: 24,
    letterSpacing: -0.4,
    lineHeight: 28,
  },
  italic: {
    fontSize: 16,
    lineHeight: 22,
    marginTop: 4,
  },
  message: {
    fontSize: 15,
    lineHeight: 22,
    marginTop: 10,
  },
  buttons: {
    marginTop: spacing.lg,
    gap: 10,
  },
  btn: {
    height: 52,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnLabel: {
    fontSize: 15,
  },
})

const diffuseStyles = StyleSheet.create({
  card: {
    shadowColor: '#1A1916',
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.22,
    shadowRadius: 34,
    elevation: 10,
  },
  buttons: {
    marginTop: spacing.lg,
    gap: 4,
  },
  btn: {
    minHeight: 50,
    paddingTop: 16,
    paddingBottom: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnLabel: {
    fontFamily: diffuseFont.mono,
    fontSize: 12.5,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
})
