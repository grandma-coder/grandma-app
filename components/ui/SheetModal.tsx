/**
 * SheetModal — the shared motion for bottom sheets.
 *
 * RN's `<Modal animationType="slide">` slides the WHOLE modal, so the dark backdrop rose from the
 * bottom with the sheet like a block, and closing just cut it. Here the Modal itself doesn't
 * animate: the backdrop fades, the sheet eases up, and on close both play out BEFORE the Modal
 * unmounts. Dragging the grab zone (handle + header, via `dragZone`) down past a threshold, or
 * flicking it, closes the sheet. Same API as before: the parent owns `visible` and `onClose`.
 * Reduce Motion: fades only.
 */

import { ReactNode, useEffect, useRef, useState } from 'react'
import {
  Animated, Easing, Modal, PanResponder, Pressable, StyleSheet, View, KeyboardAvoidingView, Platform,
  useWindowDimensions, type StyleProp, type ViewStyle,
} from 'react-native'
import { useReduceMotion } from './Motion'
import { useTranslation } from '../../lib/i18n'

const IN_MS = 300
const OUT_MS = 220
const BACKDROP = 'rgba(20,19,19,0.55)'

export interface SheetModalProps {
  visible: boolean
  onClose: () => void
  /** Render the sheet. `dragZone` goes on the handle/header so dragging it down closes the sheet. */
  children: (dragZone: object) => ReactNode
  backdropColor?: string
  /** Wrap in a KeyboardAvoidingView (forms). Default true. */
  avoidKeyboard?: boolean
  style?: StyleProp<ViewStyle>
}

export function SheetModal({ visible, onClose, children, backdropColor = BACKDROP, avoidKeyboard = true, style }: SheetModalProps) {
  const { height: screenH } = useWindowDimensions()
  const reduce = useReduceMotion()
  const { t } = useTranslation()
  const [mounted, setMounted] = useState(visible)
  const backdrop = useRef(new Animated.Value(0)).current
  const offset = useRef(new Animated.Value(screenH)).current
  const drag = useRef(new Animated.Value(0)).current
  const shown = useRef(false)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useEffect(() => {
    if (visible) {
      // Park the sheet below and the backdrop clear; the entrance starts in the Modal's onShow —
      // starting here lost the first ~250ms to the Modal's own presentation, so the sheet popped.
      drag.setValue(0)
      if (shown.current) {
        // Reopened while the Modal is still presented (e.g. during the close animation): onShow
        // won't fire again, so ease back in from wherever it is.
        animateIn()
      } else {
        offset.setValue(reduce ? 0 : screenH * 0.6)
        backdrop.setValue(0)
      }
      setMounted(true)
    } else if (mounted) {
      Animated.parallel([
        Animated.timing(backdrop, { toValue: 0, duration: OUT_MS, easing: Easing.in(Easing.quad), useNativeDriver: true }),
        Animated.timing(offset, { toValue: reduce ? 0 : screenH * 0.6, duration: reduce ? 0 : OUT_MS, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
      ]).start(({ finished }) => {
        if (finished) { shown.current = false; setMounted(false) }
      })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible])

  function animateIn() {
    Animated.parallel([
      Animated.timing(backdrop, { toValue: 1, duration: reduce ? 160 : 220, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.timing(offset, { toValue: 0, duration: reduce ? 0 : IN_MS, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start()
  }

  const pan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_e, g) => g.dy > 6 && Math.abs(g.dy) > Math.abs(g.dx),
      onPanResponderMove: (_e, g) => { drag.setValue(Math.max(0, g.dy)) },
      onPanResponderRelease: (_e, g) => {
        if (g.dy > 120 || g.vy > 1.1) {
          onCloseRef.current()
        } else {
          Animated.spring(drag, { toValue: 0, useNativeDriver: true, damping: 18, stiffness: 220, mass: 0.6 }).start()
        }
      },
      onPanResponderTerminate: () => {
        Animated.spring(drag, { toValue: 0, useNativeDriver: true, damping: 18, stiffness: 220, mass: 0.6 }).start()
      },
    }),
  ).current

  if (!mounted) return null

  const sheet = (
    <>
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: backdropColor, opacity: backdrop }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityRole="button" accessibilityLabel={t('common_close')} />
      </Animated.View>
      {/* Full-screen, bottom-aligned mover: the sheet's own percentage maxHeight ('95%') resolves
          against the screen. box-none lets taps above the sheet reach the backdrop. */}
      <Animated.View
        pointerEvents="box-none"
        style={[StyleSheet.absoluteFill, styles.mover, { transform: [{ translateY: Animated.add(offset, drag) }] }]}
      >
        {style ? <View style={[styles.capped, style]}>{children(pan.panHandlers)}</View> : children(pan.panHandlers)}
      </Animated.View>
    </>
  )

  return (
    <Modal visible transparent animationType="none" statusBarTranslucent onShow={() => { shown.current = true; animateIn() }} onRequestClose={onClose}>
      {avoidKeyboard ? (
        <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          {sheet}
        </KeyboardAvoidingView>
      ) : (
        <View style={styles.root}>{sheet}</View>
      )}
    </Modal>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  mover: { justifyContent: 'flex-end' },
  // A caller-provided cap (e.g. maxHeight '85%') — its children shrink to fit it.
  capped: { flexShrink: 1 },
})
