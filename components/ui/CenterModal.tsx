/**
 * CenterModal — the shared motion for centred dialogs and cards (alerts, pickers, share cards).
 *
 * The backdrop fades while the card rises 16pt and grows from 94% to full size (ease-out, 280ms);
 * on close both play out (200ms) before the Modal unmounts. Same contract as SheetModal: the parent
 * owns `visible`/`onClose`; render the card as children. Reduce Motion: fades only.
 */

import { beginClosing, whenNoneClosing } from '../../lib/modalQueue'
import { ReactNode, useEffect, useRef, useState } from 'react'
import { Animated, Easing, Modal, Pressable, StyleSheet, View, KeyboardAvoidingView, Platform, type StyleProp, type ViewStyle } from 'react-native'
import { useReduceMotion } from './Motion'
import { useTranslation } from '../../lib/i18n'

const IN_MS = 280
const OUT_MS = 200

export interface CenterModalProps {
  visible: boolean
  onClose: () => void
  children: ReactNode
  backdropColor?: string
  /** Tap on the backdrop closes (default true). */
  dismissOnBackdrop?: boolean
  avoidKeyboard?: boolean
  /** Style of the centring container (padding, alignment). */
  containerStyle?: StyleProp<ViewStyle>
}

export function CenterModal({
  visible, onClose, children, backdropColor = 'rgba(20,19,19,0.55)', dismissOnBackdrop = true,
  avoidKeyboard = true, containerStyle,
}: CenterModalProps) {
  const reduce = useReduceMotion()
  const { t } = useTranslation()
  const [mounted, setMounted] = useState(visible)
  const shown = useRef(false)
  const backdrop = useRef(new Animated.Value(0)).current
  const card = useRef(new Animated.Value(0)).current
  const endClosing = useRef<(() => void) | null>(null)
  // Unmounting mid-close must not leave the queue waiting.
  useEffect(() => () => { endClosing.current?.() }, [])

  function animateIn() {
    Animated.parallel([
      Animated.timing(backdrop, { toValue: 1, duration: reduce ? 160 : 220, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.timing(card, { toValue: 1, duration: reduce ? 160 : IN_MS, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start()
  }

  useEffect(() => {
    if (visible) {
      if (shown.current) {
        animateIn()
        endClosing.current?.() // reopened mid-close — it's staying up
        endClosing.current = null
        setMounted(true)
        return
      }
      backdrop.setValue(0); card.setValue(0)
      // iOS can't present a Modal while another is still closing: wait for it.
      return whenNoneClosing(() => setMounted(true))
    } else if (mounted) {
      endClosing.current?.()
      endClosing.current = beginClosing()
      Animated.parallel([
        Animated.timing(backdrop, { toValue: 0, duration: OUT_MS, easing: Easing.in(Easing.quad), useNativeDriver: true }),
        Animated.timing(card, { toValue: 0, duration: OUT_MS, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
      ]).start(({ finished }) => {
        if (finished) { shown.current = false; setMounted(false) }
        endClosing.current?.()
        endClosing.current = null
      })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible])

  if (!mounted) return null

  const scale = card.interpolate({ inputRange: [0, 1], outputRange: [reduce ? 1 : 0.94, 1] })
  const translateY = card.interpolate({ inputRange: [0, 1], outputRange: [reduce ? 0 : 16, 0] })

  const body = (
    <>
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: backdropColor, opacity: backdrop }]}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={dismissOnBackdrop ? onClose : undefined}
          accessibilityRole="button"
          accessibilityLabel={t('common_close')}
        />
      </Animated.View>
      <Animated.View pointerEvents="box-none" style={[styles.center, containerStyle, { opacity: card, transform: [{ translateY }, { scale }] }]}>
        {children}
      </Animated.View>
    </>
  )

  return (
    <Modal
      visible
      transparent
      animationType="none"
      statusBarTranslucent
      onShow={() => { shown.current = true; animateIn() }}
      onRequestClose={onClose}
    >
      {avoidKeyboard ? (
        <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>{body}</KeyboardAvoidingView>
      ) : (
        <View style={styles.root}>{body}</View>
      )}
    </Modal>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
})
