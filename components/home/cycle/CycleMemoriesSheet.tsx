/**
 * CycleMemoriesSheet — pop-up sheet for cycle (pre-pregnancy) photo memories.
 *
 * Opened from the "Memories" wallet card (lib/cycleWallet.ts). Shows a simple
 * photo grid (thumbnail + caption + date) backed by useMemories('cycle'), plus
 * a compact inline "add a memory" flow (pick photo(s) → caption → save).
 *
 * Shell branches diffuse vs cream the same way CycleDetailSheets.tsx does:
 * DiffuseSheet under Diffuse, LogSheet under the current cream-paper system.
 *
 * ⚠️ Photo storage limitation: there is no dedicated private storage bucket
 * for cycle memory photos (see supabase/migrations/20260617130000 — only
 * child-photos / profile-avatars / pregnancy-nutrition exist, all scoped by
 * childId/userId path conventions that don't have a cycle equivalent yet).
 * Reusing app/profile/memories.tsx's upload path 1:1 isn't possible without
 * a new bucket + RLS policy (a migration), which is out of scope for this
 * task. Photos are therefore stored as their local picker URI directly in
 * `photos[]`. This works for the current session/device but is NOT a durable
 * upload — the URI can become invalid after the OS clears the picker cache,
 * and it won't sync across devices. Flagging rather than faking a broken
 * remote upload; a follow-up should add a `cycle-photos` bucket (owner-only,
 * path `{userId}/...`) mirroring `pregnancy-nutrition`'s policy and switch
 * this to upload + store the storage path, exactly like memories.tsx.
 */

import React, { useState } from 'react'
import { View, Text, Image, Pressable, TextInput, ActivityIndicator, StyleSheet } from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import { useTheme, useDiffuseTheme, diffuseFont } from '../../../constants/theme'
import { useIsDiffuse } from '../../ui/diffuse/DiffuseKit'
import { useTranslation } from '../../../lib/i18n'
import { useMemories, useAddMemory, type Memory } from '../../../lib/memories'
import { toDateStr } from '../../../lib/cycleLogic'
import { LogSheet } from '../../calendar/LogSheet'
import { DiffuseSheet, DiffuseEmptyState } from '../../ui/diffuse/DiffusePrimitives'
import { Character } from '../../characters/Characters'
import { PillButton } from '../../ui/PillButton'
import { Body } from '../../ui/Typography'

interface CycleMemoriesSheetProps {
  visible: boolean
  onClose: () => void
}

export function CycleMemoriesSheet({ visible, onClose }: CycleMemoriesSheetProps) {
  const { t } = useTranslation()
  const diffuse = useIsDiffuse()

  const title = t('wallet_memories_title')
  const chip = t('wallet_memories_chip')
  const body = <CycleMemoriesBody />

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

function CycleMemoriesBody() {
  const { colors, stickers, font } = useTheme()
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
  const { t } = useTranslation()

  const { data: memories = [], isLoading } = useMemories('cycle')
  const addMemory = useAddMemory('cycle')

  const [adding, setAdding] = useState(false)
  const [pendingPhotos, setPendingPhotos] = useState<string[]>([])
  const [caption, setCaption] = useState('')

  async function pickPhotos() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (status !== 'granted') return
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'], allowsMultipleSelection: true, quality: 0.8, selectionLimit: 10,
    })
    if (result.canceled || result.assets.length === 0) return
    setPendingPhotos(result.assets.map((a) => a.uri))
    setCaption('')
    setAdding(true)
  }

  function handleSave() {
    if (pendingPhotos.length === 0) return
    addMemory.mutate(
      { date: toDateStr(new Date()), photos: pendingPhotos, caption: caption.trim() },
      { onSuccess: () => { setAdding(false); setPendingPhotos([]); setCaption('') } }
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
            message={t('cycleMemories_emptyMsg')}
            ctaLabel={t('cycleMemories_addCta')}
            onCta={pickPhotos}
          />
        ) : (
          <View style={styles.emptyCard}>
            <Character name="photo" size={40} color={stickers.pink} />
            <Text style={[styles.emptyTitle, { color: colors.text, fontFamily: font.display }]}>{t('wallet_memories_title')}</Text>
            <Body size={14} align="center" color={colors.textSecondary}>{t('cycleMemories_emptyMsg')}</Body>
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
                    <Image source={{ uri: m.photos[0] }} style={[styles.gridImage, { borderColor: paperBorder }]} resizeMode="cover" />
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
})
