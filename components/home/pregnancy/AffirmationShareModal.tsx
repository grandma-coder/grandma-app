import React, { useRef } from 'react'
import {
  Modal,
  View,
  Text,
  Pressable,
  StyleSheet,
  Dimensions,
  ScrollView,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import ViewShot, { captureRef } from 'react-native-view-shot'
import * as Clipboard from 'expo-clipboard'
import * as MediaLibrary from 'expo-media-library'
import * as Sharing from 'expo-sharing'
import {
  affirmationTemplates,
  CANVAS_W,
  CANVAS_H,
  TemplateMeta,
} from './affirmationTemplates'
import { useSavedToast } from '../../ui/SavedToast'

interface Props {
  visible: boolean
  phrase: string
  onClose: () => void
}

const { width: SW } = Dimensions.get('window')
const OUTER_PADDING = 16
const GUTTER = 12
const TILE_W = (SW - OUTER_PADDING * 2 - GUTTER) / 2
const TILE_H = TILE_W * (CANVAS_H / CANVAS_W)

export function AffirmationShareModal({ visible, phrase, onClose }: Props) {
  const shotRefs = useRef<(ViewShot | null)[]>([])
  const toast = useSavedToast()

  const handleHeaderShare = async () => {
    const first = shotRefs.current[0]
    if (!first) return
    try {
      const canShare = await Sharing.isAvailableAsync()
      if (!canShare) {
        toast.show({
          title: 'Sharing unavailable',
          message: 'Your device cannot share right now.',
          autoDismiss: 1800,
        })
        return
      }
      const uri = await captureRef(first, { format: 'png', quality: 0.95 })
      await Sharing.shareAsync(uri, {
        mimeType: 'image/png',
        dialogTitle: 'Share affirmation',
        UTI: 'public.png',
      })
    } catch {
      toast.show({
        title: 'Share failed',
        message: 'Please try again.',
        autoDismiss: 1800,
      })
    }
  }

  return (
    <Modal
      visible={visible}
      presentationStyle="pageSheet"
      animationType="slide"
      onRequestClose={onClose}
    >
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

        <Text style={styles.instructions}>Tap to copy · Hold to save</Text>

        <ScrollView contentContainerStyle={styles.grid}>
          {affirmationTemplates.map((t, i) => (
            <TemplateTile
              key={t.id}
              meta={t}
              phrase={phrase}
              registerRef={(r) => {
                shotRefs.current[i] = r
              }}
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
  registerRef,
}: {
  meta: TemplateMeta
  phrase: string
  registerRef: (r: ViewShot | null) => void
}) {
  const { Component } = meta
  const scale = TILE_W / CANVAS_W
  const shotRef = useRef<ViewShot | null>(null)
  const toast = useSavedToast()

  const setRef = (r: ViewShot | null) => {
    shotRef.current = r
    registerRef(r)
  }

  const handleCopy = async () => {
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
      toast.show({
        title: 'Copy failed',
        message: "Couldn't create image. Try again.",
        autoDismiss: 1800,
      })
    }
  }

  const handleSave = async () => {
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
      const uri = await captureRef(shotRef.current, {
        format: 'png',
        quality: 0.95,
      })
      await MediaLibrary.saveToLibraryAsync(uri)
      toast.show({
        title: 'Saved to Photos',
        message: 'Open Photos to share or edit.',
        autoDismiss: 1800,
      })
    } catch {
      toast.show({
        title: 'Save failed',
        message: 'Please try again.',
        autoDismiss: 1800,
      })
    }
  }

  return (
    <Pressable
      onPress={handleCopy}
      onLongPress={handleSave}
      delayLongPress={600}
      style={({ pressed }) => [
        styles.tile,
        { width: TILE_W, height: TILE_H, opacity: pressed ? 0.85 : 1 },
      ]}
    >
      <ViewShot
        ref={setRef}
        style={{
          width: CANVAS_W,
          height: CANVAS_H,
          transform: [{ scale }],
          transformOrigin: '0 0' as any,
        }}
      >
        <Component phrase={phrase} />
      </ViewShot>
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
    marginBottom: 16,
    letterSpacing: 0.5,
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
  },
})
