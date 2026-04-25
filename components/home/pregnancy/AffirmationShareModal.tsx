import React, { useEffect, useMemo, useRef, useState } from 'react'
import {
  Modal,
  View,
  Text,
  Pressable,
  StyleSheet,
  Dimensions,
  ScrollView,
  Animated,
  Easing,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import ViewShot, { captureRef } from 'react-native-view-shot'
import * as Clipboard from 'expo-clipboard'
import * as MediaLibrary from 'expo-media-library'
import * as Sharing from 'expo-sharing'
import Svg, { Path } from 'react-native-svg'
import {
  templatesForMode,
  CANVAS_W,
  CANVAS_H,
  TemplateMeta,
  AffirmationMode,
} from './affirmationTemplates'
import { useSavedToast } from '../../ui/SavedToast'
import { useTheme, brand } from '../../../constants/theme'
import { PillButton } from '../../ui/PillButton'
import { StickerButton } from '../../ui/StickerButton'
import { Heart, Sparkle, Star, Burst, Flower } from '../../ui/Stickers'

// ─── FloatSticker ──────────────────────────────────────────────────────────
// Wraps any sticker child in a looping float + wobble animation.
// `delay` offsets the phase so multiple stickers don't sync up.

interface FloatStickerProps {
  children: React.ReactNode
  delay?: number
  floatY?: number
  rotateDeg?: number
  duration?: number
  style?: import('react-native').ViewStyle
}

function FloatSticker({
  children,
  delay = 0,
  floatY = 5,
  rotateDeg = 8,
  duration = 2600,
  style,
}: FloatStickerProps) {
  const y = useRef(new Animated.Value(0)).current
  const r = useRef(new Animated.Value(0)).current

  useEffect(() => {
    const floatAnim = Animated.loop(
      Animated.sequence([
        Animated.timing(y, { toValue: -floatY, duration: duration / 2, delay, useNativeDriver: true, easing: Easing.inOut(Easing.sin) }),
        Animated.timing(y, { toValue: floatY, duration: duration / 2, useNativeDriver: true, easing: Easing.inOut(Easing.sin) }),
      ])
    )
    const wobbleAnim = Animated.loop(
      Animated.sequence([
        Animated.timing(r, { toValue: 1, duration: (duration * 0.7) / 2, delay, useNativeDriver: true, easing: Easing.inOut(Easing.sin) }),
        Animated.timing(r, { toValue: -1, duration: (duration * 0.7) / 2, useNativeDriver: true, easing: Easing.inOut(Easing.sin) }),
        Animated.timing(r, { toValue: 0, duration: duration * 0.3, useNativeDriver: true, easing: Easing.inOut(Easing.sin) }),
      ])
    )
    floatAnim.start()
    wobbleAnim.start()
    return () => { floatAnim.stop(); wobbleAnim.stop() }
  }, [])

  const rotate = r.interpolate({ inputRange: [-1, 1], outputRange: [`${-rotateDeg}deg`, `${rotateDeg}deg`] })

  return (
    <Animated.View
      pointerEvents="none"
      style={[style, { transform: [{ translateY: y }, { rotate }] }]}
    >
      {children}
    </Animated.View>
  )
}

interface Props {
  visible: boolean
  phrase: string
  mode?: AffirmationMode
  onClose: () => void
}

const { width: SW } = Dimensions.get('window')
const OUTER_PADDING = 16
const GUTTER = 12
const TILE_W = (SW - OUTER_PADDING * 2 - GUTTER) / 2
const TILE_H = TILE_W * (CANVAS_H / CANVAS_W)

type StyleMode = 'bg' | 'text'


export function AffirmationShareModal({ visible, phrase, mode = 'pregnancy', onClose }: Props) {
  const [styleMode, setStyleMode] = useState<StyleMode>('bg')
  const shotRefs = useRef<Record<string, ViewShot | null>>({})
  const toast = useSavedToast()
  const { colors, font, isDark } = useTheme()

  const templates = useMemo(() => templatesForMode(mode), [mode])

  const { stickers } = useTheme()
  const paperBg = isDark ? colors.bg : '#F3ECD9'
  const cardBg = isDark ? colors.surface : '#FFFEF8'
  const borderCol = isDark ? colors.border : 'rgba(20,19,19,0.08)'

  const handleHeaderShare = async () => {
    const first = templates[0]
    if (!first) return
    const ref = shotRefs.current[first.id]
    if (!ref) return
    try {
      const canShare = await Sharing.isAvailableAsync()
      if (!canShare) {
        toast.show({ title: 'Sharing unavailable', message: 'Your device cannot share right now.', autoDismiss: 1800 })
        return
      }
      const uri = await captureRef(ref, {
        format: 'png',
        quality: 0.95,
        ...(styleMode === 'text' ? { result: 'tmpfile' } : {}),
      })
      await Sharing.shareAsync(uri, {
        mimeType: 'image/png',
        dialogTitle: 'Share affirmation',
        UTI: 'public.png',
      })
    } catch {
      toast.show({ title: 'Share failed', message: 'Please try again.', autoDismiss: 1800 })
    }
  }

  return (
    <Modal visible={visible} presentationStyle="pageSheet" animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={[styles.container, { backgroundColor: paperBg }]} edges={['top']}>

        {/* Header — sparkle accent top-right of title */}
        <View style={[styles.header, { borderBottomColor: borderCol }]}>
          <PillButton
            label="Close"
            onPress={onClose}
            variant="paper"
            height={38}
            style={styles.headerSideBtn}
          />
          <View style={styles.headerCenter}>
            <Text style={[styles.headerTitle, { color: colors.text, fontFamily: font.display }]} numberOfLines={1}>
              Share affirmation
            </Text>
            {/* tiny sparkle floating top-right of title */}
            <FloatSticker style={styles.headerSparkle} delay={0} floatY={3} rotateDeg={15} duration={2200}>
              <Sparkle size={18} fill={stickers.yellow} stroke="#141313" />
            </FloatSticker>
          </View>
          <PillButton
            label="Share"
            onPress={handleHeaderShare}
            variant="ink"
            height={38}
            style={styles.headerSideBtn}
          />
        </View>

        {/* Instruction line */}
        <Text style={[styles.instructions, { color: colors.textMuted, fontFamily: font.bodyMedium }]}>
          {styleMode === 'text' ? 'Tap to copy · Hold to copy' : 'Tap to save · Hold to copy'}
        </Text>

        {/* Sticker toggle — heart floats between the two buttons */}
        <View style={styles.toggleWrap}>
          <StickerButton
            label="With background"
            color={stickers.yellow}
            colorSoft={stickers.yellowSoft}
            colorDark="#C4A828"
            active={styleMode === 'bg'}
            onPress={() => setStyleMode('bg')}
            height={56}
            fontSize={14}
            style={styles.toggleBtn}
          />

          {/* floating heart sticker between buttons */}
          <FloatSticker style={styles.toggleHeart} delay={400} floatY={6} rotateDeg={12} duration={2800}>
            <Heart size={28} fill={stickers.pink} stroke="#141313" />
          </FloatSticker>

          <StickerButton
            label="Text only"
            color={stickers.lilac}
            colorSoft={stickers.lilacSoft}
            colorDark="#8B74C5"
            active={styleMode === 'text'}
            onPress={() => setStyleMode('text')}
            height={56}
            fontSize={14}
            style={styles.toggleBtn}
          />
        </View>

        {/* Decorative sticker row under toggle — each floats at a different rate */}
        <View style={styles.stickerRow} pointerEvents="none">
          <FloatSticker delay={0}    floatY={4} rotateDeg={10} duration={2400} style={{ transform: [{ rotate: '-14deg' }] }}>
            <Star size={22} fill={stickers.yellow} stroke="#141313" />
          </FloatSticker>
          <FloatSticker delay={300}  floatY={5} rotateDeg={8}  duration={2900} style={{ transform: [{ rotate: '8deg' }], marginLeft: 6 }}>
            <Burst size={20} fill={stickers.pink} stroke="#141313" points={10} wobble={0.18} />
          </FloatSticker>
          <FloatSticker delay={700}  floatY={3} rotateDeg={12} duration={3100} style={{ transform: [{ rotate: '-6deg' }], marginLeft: 8 }}>
            <Flower size={22} petal={stickers.lilac} center={stickers.yellow} stroke="#141313" />
          </FloatSticker>
          <FloatSticker delay={1100} floatY={6} rotateDeg={14} duration={2600} style={{ transform: [{ rotate: '18deg' }], marginLeft: 6 }}>
            <Sparkle size={18} fill={stickers.green} stroke="#141313" />
          </FloatSticker>
          <FloatSticker delay={500}  floatY={4} rotateDeg={9}  duration={3300} style={{ transform: [{ rotate: '-10deg' }], marginLeft: 6 }}>
            <Heart size={18} fill={stickers.peach} stroke="#141313" />
          </FloatSticker>
        </View>

        {/* Tile grid */}
        <ScrollView contentContainerStyle={styles.grid}>
          {templates.map((t) => (
            <TemplateTile
              key={t.id}
              meta={t}
              phrase={phrase}
              styleMode={styleMode}
              cardBg={cardBg}
              borderCol={borderCol}
              colors={colors}
              font={font}
              isDark={isDark}
              registerRef={(r) => { shotRefs.current[t.id] = r }}
            />
          ))}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  )
}

function TemplateTile({
  meta,
  phrase,
  styleMode,
  cardBg,
  borderCol,
  colors,
  font,
  isDark,
  registerRef,
}: {
  meta: TemplateMeta
  phrase: string
  styleMode: StyleMode
  cardBg: string
  borderCol: string
  colors: ReturnType<typeof useTheme>['colors']
  font: ReturnType<typeof useTheme>['font']
  isDark: boolean
  registerRef: (r: ViewShot | null) => void
}) {
  const { Component } = meta
  const scale = TILE_W / CANVAS_W
  const shotRef = useRef<ViewShot | null>(null)
  const toast = useSavedToast()

  const checkOpacity = useRef(new Animated.Value(0)).current
  const checkScale = useRef(new Animated.Value(0.5)).current

  const setRef = (r: ViewShot | null) => {
    shotRef.current = r
    registerRef(r)
  }

  const playCheck = () => {
    Animated.parallel([
      Animated.timing(checkOpacity, { toValue: 1, duration: 180, useNativeDriver: true, easing: Easing.out(Easing.ease) }),
      Animated.spring(checkScale, { toValue: 1, friction: 5, tension: 140, useNativeDriver: true }),
    ]).start(() => {
      setTimeout(() => {
        Animated.parallel([
          Animated.timing(checkOpacity, { toValue: 0, duration: 320, useNativeDriver: true }),
          Animated.timing(checkScale, { toValue: 0.5, duration: 320, useNativeDriver: true }),
        ]).start()
      }, 900)
    })
  }

  const captureArgs = styleMode === 'text'
    ? ({ format: 'png', quality: 1, result: 'tmpfile' } as const)
    : ({ format: 'png', quality: 0.95 } as const)

  const handleTapSave = async () => {
    if (!shotRef.current) return
    if (styleMode === 'text') {
      try {
        const base64 = await captureRef(shotRef.current, { format: 'png', quality: 1, result: 'base64' })
        await Clipboard.setImageAsync(base64)
        toast.show({ title: 'Copied!', message: 'Paste into your Story or a message.', autoDismiss: 1800 })
      } catch {
        toast.show({ title: 'Copy failed', message: "Couldn't create image. Try again.", autoDismiss: 1800 })
      }
      return
    }
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync()
      if (status !== 'granted') {
        toast.show({ title: 'Photos access needed', message: 'Enable Photos access in Settings to save templates.', autoDismiss: 2400 })
        return
      }
      const uri = await captureRef(shotRef.current, captureArgs)
      await MediaLibrary.saveToLibraryAsync(uri)
      playCheck()
      toast.show({ title: 'Saved to Photos', message: 'Open Photos to share or edit.', autoDismiss: 1800 })
    } catch {
      toast.show({ title: 'Save failed', message: 'Please try again.', autoDismiss: 1800 })
    }
  }

  const handleLongCopy = async () => {
    if (!shotRef.current) return
    try {
      const base64 = await captureRef(shotRef.current, { format: 'png', quality: 0.95, result: 'base64' })
      await Clipboard.setImageAsync(base64)
      toast.show({ title: 'Copied!', message: 'Paste into your Story or a message.', autoDismiss: 1800 })
    } catch {
      toast.show({ title: 'Copy failed', message: "Couldn't create image. Try again.", autoDismiss: 1800 })
    }
  }

  // Text-only templates export as transparent PNGs for dark story overlays —
  // always preview on dark so the white text is legible regardless of app theme.
  const tileBg = styleMode === 'text' ? '#1A1713' : cardBg
  const nameColor = styleMode === 'text' ? 'rgba(245,237,220,0.6)' : colors.textSecondary

  return (
    <Pressable
      onPress={handleTapSave}
      onLongPress={handleLongCopy}
      delayLongPress={600}
      style={({ pressed }) => [
        styles.tile,
        {
          width: TILE_W,
          height: TILE_H,
          backgroundColor: tileBg,
          borderColor: styleMode === 'text' ? 'rgba(245,237,220,0.12)' : borderCol,
          opacity: pressed ? 0.88 : 1,
        },
      ]}
    >
      <ViewShot
        ref={setRef}
        options={styleMode === 'text' ? { format: 'png', quality: 1 } : { format: 'png', quality: 0.95 }}
        style={{
          width: CANVAS_W,
          height: CANVAS_H,
          transform: [{ scale }],
          transformOrigin: '0 0' as any,
          backgroundColor: styleMode === 'text' ? 'transparent' : undefined,
        }}
      >
        <Component phrase={phrase} textOnly={styleMode === 'text'} />
      </ViewShot>

      {/* Name label */}
      <View style={styles.nameChip} pointerEvents="none">
        <Text style={[styles.nameChipText, { color: nameColor, fontFamily: font.bodySemiBold }]}>
          {meta.name}
        </Text>
      </View>

      {/* Checkmark on save */}
      <Animated.View
        pointerEvents="none"
        style={[styles.checkOverlay, { opacity: checkOpacity, transform: [{ scale: checkScale }] }]}
      >
        <View style={styles.checkCircle}>
          <Svg width={44} height={44} viewBox="0 0 24 24">
            <Path d="M5 12.5 L10 17.5 L19 7.5" stroke="#141313" strokeWidth={3.2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
        </View>
      </Animated.View>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    height: 64,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerSideBtn: {
    minWidth: 80,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  headerTitle: {
    fontSize: 19,
    letterSpacing: -0.3,
    textAlign: 'center',
  },
  headerSparkle: {
    position: 'absolute',
    top: -10,
    right: -4,
    transform: [{ rotate: '20deg' }],
  },
  instructions: {
    textAlign: 'center',
    fontSize: 13,
    marginTop: 14,
    marginBottom: 10,
    letterSpacing: 0.2,
  },
  toggleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 6,
  },
  toggleBtn: {
    flex: 1,
  },
  toggleHeart: {
    width: 36,
    alignItems: 'center',
    marginTop: -20,
    transform: [{ rotate: '10deg' }],
    zIndex: 10,
  },
  stickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 10,
    height: 28,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: OUTER_PADDING,
    paddingBottom: 40,
  },
  tile: {
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: GUTTER,
    position: 'relative',
    borderWidth: 1,
    shadowColor: '#141313',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 2,
  },

  nameChip: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    right: 8,
    alignItems: 'center',
    zIndex: 5,
  },
  nameChipText: {
    fontSize: 10,
    letterSpacing: 0.4,
    textShadowColor: 'rgba(20,19,19,0.15)',
    textShadowRadius: 3,
  },
  checkOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 6,
  },
  checkCircle: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: '#F5D652',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#141313',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 18,
  },
})
