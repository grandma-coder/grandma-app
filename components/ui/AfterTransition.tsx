/**
 * AfterTransition — mount heavy screen content once the push animation has finished.
 *
 * Big screens (care circle, pregnancy profile, channel, health history…) rendered everything on
 * the first frame of the native slide, so the JS thread was busy exactly while the screen was
 * moving and the slide stuttered. The header and frame slide in immediately; the body mounts on
 * the stack's `transitionEnd` (with a timeout fallback) behind a light placeholder, then fades in.
 */

import { ReactNode, useEffect, useRef, useState } from 'react'
import { Animated, Easing, View, StyleSheet } from 'react-native'
import { useNavigation } from 'expo-router'
import { useReduceMotion } from './Motion'
import { Skeleton } from './Skeleton'

const FALLBACK_MS = 450

export function useAfterTransition(): boolean {
  const navigation = useNavigation()
  const [ready, setReady] = useState(false)
  useEffect(() => {
    let done = false
    const finish = () => { if (!done) { done = true; setReady(true) } }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const unsub = (navigation as any)?.addListener?.('transitionEnd', finish)
    const timer = setTimeout(finish, FALLBACK_MS)
    return () => { clearTimeout(timer); unsub?.() }
  }, [navigation])
  return ready
}

export function AfterTransition({ children, placeholder }: { children: ReactNode; placeholder?: ReactNode }) {
  const ready = useAfterTransition()
  const reduce = useReduceMotion()
  const opacity = useRef(new Animated.Value(0)).current
  useEffect(() => {
    if (!ready) return
    Animated.timing(opacity, { toValue: 1, duration: reduce ? 0 : 200, easing: Easing.out(Easing.quad), useNativeDriver: true }).start()
  }, [ready, reduce, opacity])

  if (!ready) {
    return (
      placeholder ?? (
        <View style={styles.placeholder}>
          <Skeleton height={88} radius={22} />
          <Skeleton height={64} radius={18} />
          <Skeleton height={64} radius={18} />
        </View>
      )
    )
  }
  return <Animated.View style={{ flex: 1, opacity }}>{children}</Animated.View>
}

const styles = StyleSheet.create({
  placeholder: { paddingHorizontal: 20, paddingTop: 16, gap: 12 },
})
