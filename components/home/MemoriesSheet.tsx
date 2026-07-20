/**
 * MemoriesSheet — behavior-scoped pop-up sheet for photo memories (keepsakes).
 *
 * One component for all three behaviors; the `behavior` prop selects the data
 * scope and storage bucket:
 *   • cycle     → cycle_logs,     bucket cycle-photos       (user-scoped)
 *   • pregnancy → pregnancy_logs, bucket pregnancy-nutrition (user-scoped)
 *   • kids      → child_logs,     bucket child-photos        (active-child-scoped)
 *
 * Photos are re-encoded to JPEG, uploaded to the behavior's PRIVATE bucket, and
 * stored as a bare storage PATH (signed at read time via SignedImage). See
 * lib/memories.ts (uploadMemoryPhotos) + lib/photoSigning.ts.
 *
 * Shell branches diffuse vs cream: DiffuseSheet under Diffuse, LogSheet under
 * the current cream-paper system.
 */

import React, { useState } from 'react'
import { View, Text, Image, Pressable, TextInput, ActivityIndicator, StyleSheet } from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import { useTheme, useDiffuseTheme, diffuseFont } from '../../constants/theme'
import { useIsDiffuse } from '../ui/diffuse/DiffuseKit'
import { useTranslation } from '../../lib/i18n'
import { useMemories, useAddMemory, type Memory, type MemoryBehavior } from '../../lib/memories'
import { SignedImage, PHOTO_BUCKETS, type PhotoBucket } from '../../lib/photoSigning'
import { toDateStr } from '../../lib/cycleLogic'
import { LogSheet } from '../calendar/LogSheet'
import { DiffuseSheet, DiffuseEmptyState } from '../ui/diffuse/DiffusePrimitives'
import { Character } from '../characters/Characters'
import { PillButton } from '../ui/PillButton'
import { Body } from '../ui/Typography'

/** Photo-signing bucket for each behavior's memory photos. */
const BEHAVIOR_BUCKET: Record<MemoryBehavior, PhotoBucket> = {
  cycle: PHOTO_BUCKETS.cycle,
  pregnancy: PHOTO_BUCKETS.pregnancyMeal,
  kids: PHOTO_BUCKETS.child,
}

/** Empty-state message i18n key per behavior. */
const EMPTY_MSG_KEY = {
  cycle: 'cycleMemories_emptyMsg',
  pregnancy: 'pregnancyMemories_emptyMsg',
  kids: 'kidsMemories_emptyMsg',
} as const

interface MemoriesSheetProps {
  behavior: MemoryBehavior
  visible: boolean
  onClose: () => void
}

export function MemoriesSheet({ behavior, visible, onClose }: MemoriesSheetProps) {
  const { t } = useTranslation()
  const diffuse = useIsDiffuse()

  const title = t('wallet_memories_title')
  const chip = t('wallet_memories_chip')
  const body = <MemoriesBody behavior={behavior} />

  if (diffuse) {
    return (
      <DiffuseSheet visible={visible} title={title} chip={chip} onClose={onClose}>
        {body}
      </DiffuseSheet>
    )
  }

  return (
    <LogSheet visible={visible} title={title} chip={chip} onClose={onClose}>
      {body}
    </LogSheet>
  )
}

function MemoriesBody({ behavior }: { behavior: MemoryBehavior }) {
  const { colors, stickers, font } = useTheme()
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
  const { t } = useTranslation()

  const { data: memories = [], isLoading } = useMemories(behavior)
  const addMemory = useAddMemory(behavior)
  const bucket = BEHAVIOR_BUCKET[behavior]
  const emptyMsg = t(EMPTY_MSG_KEY[behavior])

  const [adding, setAdding] = useState(false)
  const [pendingPhotos, setPendingPhotos] = useState<string[]>([])
  const [caption, setCaption] = useState('')
  const [pickError, setPickError] = useState<string | null>(null)

  async function pickPhotos() {
    setPickError(null)
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
      if (status !== 'granted') {
        setPickError(t('memories_permissionDenied'))
        return
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'], allowsMultipleSelection: true, quality: 0.8, selectionLimit: 10,
      })
      if (result.canceled || result.assets.length === 0) return
      setPendingPhotos(result.assets.map((a) => a.uri))
      setCaption('')
      setAdding(true)
    } catch {
      // iOS can throw "Cannot load representation of type public.jpeg" for
      // iCloud-optimized / HEIC originals. Surface a friendly message instead
      // of an uncaught promise rejection. The upload path re-encodes to JPEG,
      // so most photos still work if re-picked.
      setPickError(t('memories_pickFailed'))
    }
  }

  function handleSave() {
    if (pendingPhotos.length === 0) return
    setPickError(null)
    addMemory.mutate(
      { date: toDateStr(new Date()), photos: pendingPhotos, caption: caption.trim() },
      {
        onSuccess: () => { setAdding(false); setPendingPhotos([]); setCaption('') },
        onError: (e) => setPickError(e instanceof Error ? e.message : t('memories_saveFailed')),
      }
    )
  }

  const ink = diffuse ? dt.colors.ink : colors.text
  const ink3 = diffuse ? dt.colors.ink3 : colors.textMuted
  const paper = diffuse ? dt.colors.surface : colors.surface
  const paperBorder = diffuse ? dt.colors.line : colors.border

  if (isLoading) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator size="small" color={ink3} />
      </View>
    )
  }

  return (
    <View style={{ gap: 18 }}>
      {memories.length === 0 && !adding ? (
        diffuse ? (
          <DiffuseEmptyState
            icon={<Character name="photo" size={40} color={stickers.pink} />}
            title={t('wallet_memories_title')}
            message={emptyMsg}
            ctaLabel={t('cycleMemories_addCta')}
            onCta={pickPhotos}
          />
        ) : (
          <View style={styles.emptyCard}>
            <Character name="photo" size={40} color={stickers.pink} />
            <Text style={[styles.emptyTitle, { color: colors.text, fontFamily: font.display }]}>{t('wallet_memories_title')}</Text>
            <Body size={14} align="center" color={colors.textSecondary}>{emptyMsg}</Body>
            <PillButton label={t('cycleMemories_addCta')} variant="ink" onPress={pickPhotos} style={{ marginTop: 4 }} />
          </View>
        )
      ) : (
        <>
          {memories.length > 0 && (
            <View style={styles.grid}>
              {memories.map((m: Memory) => (
                <View key={m.id} style={styles.gridItem}>
                  {m.photos[0] ? (
                    <SignedImage value={m.photos[0]} bucket={bucket} style={[styles.gridImage, { borderColor: paperBorder }]} resizeMode="cover" />
                  ) : (
                    <View style={[styles.gridImage, styles.gridImagePlaceholder, { backgroundColor: stickers.pinkSoft, borderColor: paperBorder }]}>
                      <Character name="photo" size={22} color={stickers.pink} />
                    </View>
                  )}
                  {m.caption ? (
                    <Text
                      numberOfLines={1}
                      style={[
                        styles.gridCaption,
                        diffuse
                          ? { color: ink3, fontFamily: diffuseFont.mono, fontSize: 10 }
                          : { color: colors.textMuted, fontFamily: font.body, fontSize: 11 },
                      ]}
                    >
                      {m.caption}
                    </Text>
                  ) : null}
                  <Text
                    numberOfLines={1}
                    style={[
                      styles.gridDate,
                      diffuse
                        ? { color: dt.colors.ink4, fontFamily: diffuseFont.mono, fontSize: 9, textTransform: 'uppercase', letterSpacing: 0.6 }
                        : { color: colors.textMuted, fontFamily: font.body, fontSize: 10 },
                    ]}
                  >
                    {m.date}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {!adding && (
            <Pressable
              onPress={pickPhotos}
              style={({ pressed }) => [
                styles.addRow,
                { borderColor: paperBorder, opacity: pressed ? 0.7 : 1 },
              ]}
            >
              <Text
                style={[
                  diffuse
                    ? { color: ink, fontFamily: diffuseFont.monoBold, fontSize: 12, letterSpacing: 1, textTransform: 'uppercase' }
                    : { color: colors.text, fontFamily: font.bodySemiBold, fontSize: 14 },
                ]}
              >
                {`+ ${t('cycleMemories_addCta')}`}
              </Text>
            </Pressable>
          )}
        </>
      )}

      {pickError ? (
        <Text style={[styles.errorText, { color: stickers.coral }]}>{pickError}</Text>
      ) : null}

      {adding && (
        <View style={[styles.addPanel, { borderColor: paperBorder, backgroundColor: paper }]}>
          <View style={styles.previewRow}>
            {pendingPhotos.map((uri, i) => (
              <Image key={i} source={{ uri }} style={styles.previewImage} />
            ))}
          </View>
          <TextInput
            value={caption}
            onChangeText={setCaption}
            placeholder={t('memories_captionPlaceholder')}
            placeholderTextColor={ink3}
            style={[
              styles.captionInput,
              { color: ink, borderColor: paperBorder, fontFamily: diffuse ? diffuseFont.body : font.body },
            ]}
          />
          <View style={styles.addPanelActions}>
            <Pressable
              onPress={() => { setAdding(false); setPendingPhotos([]) }}
              style={({ pressed }) => [styles.cancelBtn, { opacity: pressed ? 0.6 : 1 }]}
            >
              <Text style={{ color: ink3, fontFamily: diffuse ? diffuseFont.mono : font.bodyMedium, fontSize: 13 }}>
                {t('common_cancel')}
              </Text>
            </Pressable>
            <PillButton
              label={addMemory.isPending ? t('memories_uploading') : t('cycleMemories_addCta')}
              variant="ink"
              onPress={handleSave}
              disabled={addMemory.isPending || pendingPhotos.length === 0}
              leading={addMemory.isPending ? <ActivityIndicator size="small" color={colors.bg} /> : undefined}
              height={48}
            />
          </View>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  loadingWrap: { paddingVertical: 32, alignItems: 'center' },
  emptyCard: { alignItems: 'center', padding: 24, gap: 12 },
  emptyTitle: { fontSize: 18 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  gridItem: { width: '31%', gap: 3 },
  gridImage: { width: '100%', aspectRatio: 1, borderRadius: 14, borderWidth: 1 },
  gridImagePlaceholder: { alignItems: 'center', justifyContent: 'center' },
  gridCaption: {},
  gridDate: {},
  addRow: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 20,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addPanel: { borderWidth: 1, borderRadius: 20, padding: 14, gap: 12 },
  previewRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  previewImage: { width: 64, height: 64, borderRadius: 12 },
  captionInput: { borderWidth: 1, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, minHeight: 44 },
  addPanelActions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 12 },
  cancelBtn: { paddingHorizontal: 8, paddingVertical: 10 },
  errorText: { fontSize: 13, textAlign: 'center', lineHeight: 18 },
})
