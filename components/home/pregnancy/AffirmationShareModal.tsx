import React, { useMemo, useRef, useState } from 'react'
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

  const templates = useMemo(() => templatesForMode(mode), [mode])

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
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <Pressable onPress={onClose} hitSlop={12} style={styles.headerBtn}>
            <Text style={styles.closeX}>✕</Text>
          </Pressable>
          <Text style={styles.headerTitle} numberOfLines={1}>
            Share affirmation
          </Text>
          <Pressable hitSlop={12} style={styles.headerBtn} onPress={handleHeaderShare}>
            <Text style={styles.shareWord}>Share…</Text>
          </Pressable>
        </View>

        <Text style={styles.instructions}>Tap to save · Hold to copy</Text>

        {/* Segmented toggle: With background / Text only */}
        <View style={styles.toggleRow}>
          <SegmentButton active={styleMode === 'bg'} label="With background" onPress={() => setStyleMode('bg')} />
          <SegmentButton active={styleMode === 'text'} label="Text only" onPress={() => setStyleMode('text')} />
        </View>

        <ScrollView contentContainerStyle={styles.grid}>
          {templates.map((t) => (
            <TemplateTile
              key={t.id}
              meta={t}
              phrase={phrase}
              styleMode={styleMode}
              registerRef={(r) => {
                shotRefs.current[t.id] = r
              }}
            />
          ))}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  )
}

function SegmentButton({ active, label, onPress }: { active: boolean; label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.segBtn, active && styles.segBtnActive]}
      hitSlop={4}
    >
      <Text style={[styles.segBtnText, active && styles.segBtnTextActive]}>{label}</Text>
    </Pressable>
  )
}

function TemplateTile({
  meta,
  phrase,
  styleMode,
  registerRef,
}: {
  meta: TemplateMeta
  phrase: string
  styleMode: StyleMode
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
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync()
      if (status !== 'granted') {
        toast.show({
          title: 'Photos access needed',
          message: 'Enable Photos access in Settings to save templates.',
          autoDismiss: 2400,
        })
        return
      }
      const uri = await captureRef(shotRef.current, captureArgs)
      await MediaLibrary.saveToLibraryAsync(uri)
      playCheck()
      toast.show({
        title: 'Saved to Photos',
        message: styleMode === 'text' ? 'Transparent PNG — ready to overlay.' : 'Open Photos to share or edit.',
        autoDismiss: 1800,
      })
    } catch {
      toast.show({ title: 'Save failed', message: 'Please try again.', autoDismiss: 1800 })
    }
  }

  const handleLongCopy = async () => {
    if (!shotRef.current) return
    try {
      const base64 = await captureRef(shotRef.current, {
        format: 'png',
        quality: 0.95,
        result: 'base64',
      })
      await Clipboard.setImageAsync(base64)
      toast.show({
        title: 'Copied!',
        message: 'Paste into your Story or a message.',
        autoDismiss: 1800,
      })
    } catch {
      toast.show({ title: 'Copy failed', message: "Couldn't create image. Try again.", autoDismiss: 1800 })
    }
  }

  return (
    <Pressable
      onPress={handleTapSave}
      onLongPress={handleLongCopy}
      delayLongPress={600}
      style={({ pressed }) => [
        styles.tile,
        styleMode === 'text' && styles.tileTextOnly,
        { width: TILE_W, height: TILE_H, opacity: pressed ? 0.85 : 1 },
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

      {/* Style label chip */}
      <View style={styles.nameChip} pointerEvents="none">
        <Text style={styles.nameChipText}>{meta.name}</Text>
      </View>

      {/* Checkmark overlay on tap-save */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.checkOverlay,
          { opacity: checkOpacity, transform: [{ scale: checkScale }] },
        ]}
      >
        <View style={styles.checkCircle}>
          <Svg width={44} height={44} viewBox="0 0 24 24">
            <Path d="M5 12.5 L10 17.5 L19 7.5" stroke="#0E0B1A" strokeWidth={3.2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
        </View>
      </Animated.View>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0E0B1A',
  },
  header: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  headerBtn: {
    minWidth: 60,
    justifyContent: 'center',
  },
  closeX: {
    color: '#FFFFFF',
    fontSize: 22,
    fontFamily: 'DMSans_500Medium',
  },
  headerTitle: {
    flex: 1,
    color: '#FFFFFF',
    fontFamily: 'Fraunces_600SemiBold',
    fontSize: 18,
    textAlign: 'center',
  },
  shareWord: {
    color: '#C4A8F0',
    fontSize: 15,
    fontFamily: 'DMSans_600SemiBold',
    textAlign: 'right',
  },
  instructions: {
    color: 'rgba(255,255,255,0.55)',
    textAlign: 'center',
    fontFamily: 'DMSans_500Medium',
    fontSize: 13,
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  toggleRow: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 14,
    padding: 3,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  segBtn: {
    flex: 1,
    paddingVertical: 9,
    alignItems: 'center',
    borderRadius: 999,
  },
  segBtnActive: {
    backgroundColor: '#A07FDC',
  },
  segBtnText: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 12,
    letterSpacing: 0.4,
    color: 'rgba(255,255,255,0.6)',
  },
  segBtnTextActive: {
    color: '#0E0B1A',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: OUTER_PADDING,
    paddingBottom: 40,
  },
  tile: {
    borderRadius: 18,
    overflow: 'hidden',
    marginBottom: GUTTER,
    backgroundColor: '#000',
    position: 'relative',
  },
  tileTextOnly: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    borderStyle: 'dashed',
  },
  nameChip: {
    position: 'absolute',
    bottom: 6,
    left: 8,
    right: 8,
    alignItems: 'center',
    zIndex: 5,
  },
  nameChipText: {
    color: 'rgba(255,255,255,0.7)',
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 10,
    letterSpacing: 0.5,
    textShadowColor: 'rgba(0,0,0,0.9)',
    textShadowRadius: 4,
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 18,
  },
})
