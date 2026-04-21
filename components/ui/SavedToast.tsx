/**
 * SavedToast — branded success popup replacing native Alert.alert('Saved', …).
 *
 * Anatomy:
 *   - Full-screen dimmed backdrop
 *   - Cream-paper card with 2 sticker accents (Burst + Heart)
 *   - Animated GrandmaLogo (blink + pulse) at the top
 *   - Display-serif title + body
 *   - Primary "OK" pill button (or auto-dismiss after N ms)
 *
 * Usage:
 *   const toast = useSavedToast()
 *   toast.show({ title: 'Saved', message: 'Your profile has been updated.' })
 *
 * The provider mounts once in _layout.tsx. Any screen can call `useSavedToast()`.
 */
import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react'
import { Modal, View, Pressable, StyleSheet, Animated, Easing, Dimensions } from 'react-native'
import { useTheme } from '../../constants/theme'
import { Display, Body } from './Typography'
import { GrandmaLogo } from './GrandmaLogo'
import { Burst, Heart, Sparkle } from './Stickers'
import { PillButton } from './PillButton'

const { width: SW } = Dimensions.get('window')

// ─── Types ────────────────────────────────────────────────────────────────

interface ShowOptions {
  title?: string
  message?: string
  /** Auto-dismiss after this many ms. Pass 0 to require manual OK. Default 2400. */
  autoDismiss?: number
  /** Show OK button. Default true when autoDismiss is 0; false otherwise. */
  showButton?: boolean
  /** Override primary logo accent (heart color). */
  accent?: string
}

interface SavedToastContextValue {
  show: (opts?: ShowOptions) => void
  hide: () => void
}

const SavedToastContext = createContext<SavedToastContextValue | null>(null)

export function useSavedToast(): SavedToastContextValue {
  const ctx = useContext(SavedToastContext)
  if (!ctx) {
    throw new Error('useSavedToast must be used within <SavedToastProvider>')
  }
  return ctx
}

// ─── Provider ─────────────────────────────────────────────────────────────

export function SavedToastProvider({ children }: { children: React.ReactNode }) {
  const [visible, setVisible] = useState(false)
  const [opts, setOpts] = useState<ShowOptions>({})

  const show = useCallback((next: ShowOptions = {}) => {
    setOpts(next)
    setVisible(true)
  }, [])

  const hide = useCallback(() => {
    setVisible(false)
  }, [])

  return (
    <SavedToastContext.Provider value={{ show, hide }}>
      {children}
      <SavedToastOverlay visible={visible} opts={opts} onClose={hide} />
    </SavedToastContext.Provider>
  )
}

// ─── Overlay ──────────────────────────────────────────────────────────────

function SavedToastOverlay({
  visible,
  opts,
  onClose,
}: {
  visible: boolean
  opts: ShowOptions
  onClose: () => void
}) {
  const { colors, isDark, stickers } = useTheme()
  const autoMs = opts.autoDismiss ?? 2400
  const wantsButton = opts.showButton ?? autoMs === 0

  // Entry animation — scale + fade
  const scale = useRef(new Animated.Value(0.88)).current
  const opacity = useRef(new Animated.Value(0)).current

  useEffect(() => {
    if (!visible) return
    scale.setValue(0.88)
    opacity.setValue(0)
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, friction: 7, tension: 80, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 1, duration: 220, easing: Easing.out(Easing.quad), useNativeDriver: true }),
    ]).start()

    if (autoMs > 0) {
      const t = setTimeout(onClose, autoMs)
      return () => clearTimeout(t)
    }
  }, [visible, autoMs, onClose, scale, opacity])

  const title = opts.title ?? 'Saved'
  const message = opts.message ?? 'Your changes have been saved.'

  const paper = isDark ? colors.surface : '#FFFEF8'
  const borderInk = isDark ? 'rgba(255,255,255,0.12)' : 'rgba(20,19,19,0.1)'
  const ink = isDark ? colors.text : '#141313'
  const muted = isDark ? colors.textMuted : '#6E6763'

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Animated.View
          pointerEvents="box-none"
          style={[styles.centerWrap, { opacity, transform: [{ scale }] }]}
        >
          {/* Floating sticker accents — outside the card for a collage feel */}
          <View pointerEvents="none" style={[styles.stickerTopLeft]}>
            <Burst size={46} fill={stickers.yellow} />
          </View>
          <View pointerEvents="none" style={[styles.stickerTopRight]}>
            <Heart size={34} fill={stickers.pink} />
          </View>
          <View pointerEvents="none" style={[styles.stickerBottomLeft]}>
            <Sparkle size={30} fill={stickers.lilac} />
          </View>

          <Pressable
            onPress={(e) => e.stopPropagation()}
            style={[
              styles.card,
              { backgroundColor: paper, borderColor: borderInk },
            ]}
          >
            {/* Animated logo */}
            <View style={styles.logoWrap}>
              <GrandmaLogo
                size={86}
                mode="auto"
                accent={opts.accent}
                outline={ink}
                motion="grow"
              />
            </View>

            <Display size={26} color={ink} align="center" style={styles.title}>
              {title}
            </Display>

            <Body size={15} color={muted} align="center" style={styles.message}>
              {message}
            </Body>

            {wantsButton && (
              <View style={styles.buttonWrap}>
                <PillButton label="OK" onPress={onClose} variant="ink" />
              </View>
            )}
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────

const CARD_W = Math.min(SW - 48, 340)

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerWrap: {
    width: CARD_W,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    paddingTop: 18,
  },
  card: {
    width: '100%',
    borderRadius: 32,
    borderWidth: 1,
    paddingTop: 28,
    paddingBottom: 24,
    paddingHorizontal: 24,
    alignItems: 'center',
    // Soft shadow for depth
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 32,
    shadowOffset: { width: 0, height: 14 },
    elevation: 12,
  },
  logoWrap: {
    marginBottom: 14,
  },
  title: {
    marginBottom: 6,
  },
  message: {
    marginBottom: 4,
    lineHeight: 21,
  },
  buttonWrap: {
    marginTop: 18,
    alignSelf: 'stretch',
  },
  stickerTopLeft: {
    position: 'absolute',
    top: -6,
    left: -10,
    transform: [{ rotate: '-18deg' }],
    zIndex: 5,
  },
  stickerTopRight: {
    position: 'absolute',
    top: -2,
    right: -4,
    transform: [{ rotate: '16deg' }],
    zIndex: 5,
  },
  stickerBottomLeft: {
    position: 'absolute',
    bottom: 8,
    left: -14,
    transform: [{ rotate: '-8deg' }],
    zIndex: 5,
  },
})
