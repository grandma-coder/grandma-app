/**
 * Data & Privacy — persistent toggles, data export, clear data, legal.
 *
 * Privacy settings stored in profiles.privacy_settings jsonb column.
 * Data actions work with real Supabase queries.
 */

import { useState, useEffect } from 'react'
import {
  View, Text, Pressable, ScrollView, Switch, Alert, StyleSheet, ActivityIndicator,
} from 'react-native'
import { ChevronRight } from 'lucide-react-native'
import * as FileSystem from 'expo-file-system/legacy'
import * as Sharing from 'expo-sharing'
import { router } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme, brand, useDiffuseTheme, diffuseFont } from '../../constants/theme'
import { useTranslation } from '../../lib/i18n'
import { supabase } from '../../lib/supabase'
import { useChildStore } from '../../store/useChildStore'
import { ScreenHeader } from '../../components/ui/ScreenHeader'
import { Display, DisplayItalic, MonoCaps, Body } from '../../components/ui/Typography'
import { useSavedToast } from '../../components/ui/SavedToast'
import { Heart, Cross, Sparkle, Star, Leaf, GrandmaEye } from '../../components/ui/Stickers'
import { Character, type CharacterName } from '../../components/characters/Characters'
import { useIsDiffuse } from '../../components/ui/diffuse/DiffuseKit'
import { DiffuseBloomIcon } from '../../components/ui/diffuse/DiffusePrimitives'

type StickerKind =
  | 'heart' | 'crossPink' | 'crossCoral' | 'sparkle' | 'star' | 'leaf' | 'eye'

interface PrivacySettings {
  share_with_caregivers: boolean
  share_health_data: boolean
  share_photos: boolean
  ai_data_usage: boolean
  analytics: boolean
  marketing: boolean
}

const DEFAULT_SETTINGS: PrivacySettings = {
  share_with_caregivers: true,
  share_health_data: true,
  share_photos: true,
  ai_data_usage: true,
  analytics: true,
  marketing: false,
}

export default function PrivacyScreen() {
  const { colors, font, stickers, radius, spacing, isDark } = useTheme()
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
  const insets = useSafeAreaInsets()
  const { t } = useTranslation()
  const children = useChildStore((s) => s.children)
  const toast = useSavedToast()

  const [settings, setSettings] = useState<PrivacySettings>(DEFAULT_SETTINGS)
  const [loadingSettings, setLoadingSettings] = useState(true)
  const [clearingLogs, setClearingLogs] = useState(false)
  const [clearingChat, setClearingChat] = useState(false)
  const [clearingMemories, setClearingMemories] = useState(false)

  // Load settings from profiles table
  useEffect(() => {
    loadSettings()
  }, [])

  async function loadSettings() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    // Try to read from profiles — stored as jsonb or we use defaults
    // Since we may not have a privacy_settings column yet, gracefully handle
    try {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single()

      if (data) {
        // Check if there are stored settings (could be in any jsonb-friendly way)
        const stored = (data as any).privacy_settings
        if (stored && typeof stored === 'object') {
          setSettings({ ...DEFAULT_SETTINGS, ...stored })
        }
      }
    } catch { /* column may not exist yet, use defaults */ }
    setLoadingSettings(false)
  }

  async function updateSetting(key: keyof PrivacySettings, value: boolean) {
    const previous = settings
    const updated = { ...settings, [key]: value }
    setSettings(updated) // optimistic

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    const { error } = await supabase
      .from('profiles')
      .update({ privacy_settings: updated })
      .eq('id', session.user.id)

    if (error) {
      // Roll back the optimistic toggle and let the user know it didn't stick.
      setSettings(previous)
      Alert.alert(t('common_error') ?? 'Error', error.message)
    }
  }

  // ─── Data Actions ───────────────────────────────────────────────

  const [exporting, setExporting] = useState(false)

  async function handleExportData() {
    Alert.alert(
      t('privacy_exportTitle'),
      t('privacy_exportMsg'),
      [
        { text: t('common_cancel') ?? 'Cancel', style: 'cancel' },
        {
          text: t('privacy_exportNow'),
          onPress: async () => {
            setExporting(true)
            try {
              // Server-side gather of the full data bundle (bypasses RLS/joins).
              const { data, error } = await supabase.functions.invoke('export-user-data')
              if (error) throw error

              // Write a real .json file, then share it as a document.
              const json = JSON.stringify(data, null, 2)
              const fileUri = `${FileSystem.cacheDirectory}grandma-data-export.json`
              await FileSystem.writeAsStringAsync(fileUri, json, {
                encoding: FileSystem.EncodingType.UTF8,
              })

              if (await Sharing.isAvailableAsync()) {
                await Sharing.shareAsync(fileUri, {
                  mimeType: 'application/json',
                  dialogTitle: t('privacy_exportTitle'),
                  UTI: 'public.json',
                })
              } else {
                Alert.alert(t('privacy_exportTitle'), t('privacy_exportSavedMsg'))
              }
            } catch (e: any) {
              Alert.alert(t('common_error'), e.message ?? t('privacy_exportFailedMsg'))
            } finally {
              setExporting(false)
            }
          },
        },
      ]
    )
  }

  async function handleClearLogs() {
    const childIds = children.map((c) => c.id)
    if (childIds.length === 0) return Alert.alert(t('privacy_noData'), 'No children to clear logs for.')

    Alert.alert(
      t('privacy_clearLogsTitle'),
      `Delete all feeding, sleep, diaper, and mood logs for ${children.map((c) => c.name).join(', ')}?\n\nHealth records and memories will NOT be deleted.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: t('privacy_clearLogsBtn'),
          style: 'destructive',
          onPress: async () => {
            setClearingLogs(true)
            try {
              const { error } = await supabase
                .from('child_logs')
                .delete()
                .in('child_id', childIds)
                .in('type', ['feeding', 'sleep', 'diaper', 'mood'])

              if (error) throw error
              toast.show({ title: 'Cleared', message: 'Activity logs have been cleared.' })
            } catch (e: any) { Alert.alert('Error', e.message) }
            finally { setClearingLogs(false) }
          },
        },
      ]
    )
  }

  async function handleClearChat() {
    const childIds = children.map((c) => c.id)

    Alert.alert(
      t('privacy_clearChatTitle'),
      'Delete all conversations with Grandma AI? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: t('privacy_clearChatBtn'),
          style: 'destructive',
          onPress: async () => {
            setClearingChat(true)
            try {
              if (childIds.length > 0) {
                const { error } = await supabase.from('chat_messages').delete().in('child_id', childIds)
                if (error) throw error
              }
              toast.show({ title: 'Cleared', message: 'Chat history has been cleared.' })
            } catch (e: any) { Alert.alert('Error', e.message) }
            finally { setClearingChat(false) }
          },
        },
      ]
    )
  }

  async function handleClearMemories() {
    const childIds = children.map((c) => c.id)
    if (childIds.length === 0) return Alert.alert(t('privacy_noData'), 'No children to clear memories for.')

    Alert.alert(
      t('privacy_clearMemoriesTitle'),
      'Delete ALL photos and memories? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: t('privacy_clearMemoriesBtn'),
          style: 'destructive',
          onPress: async () => {
            setClearingMemories(true)
            try {
              const { error } = await supabase
                .from('child_logs')
                .delete()
                .in('child_id', childIds)
                .eq('type', 'photo')

              if (error) throw error
              toast.show({ title: 'Cleared', message: 'All memories have been deleted.' })
            } catch (e: any) { Alert.alert('Error', e.message) }
            finally { setClearingMemories(false) }
          },
        },
      ]
    )
  }

  async function handleClearHealthRecords() {
    const childIds = children.map((c) => c.id)
    if (childIds.length === 0) return Alert.alert(t('privacy_noData'), 'No children to clear records for.')

    Alert.alert(
      t('privacy_clearHealthTitle'),
      'Delete all vaccines, medications, temperature, growth, and milestone records? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: t('privacy_clearHealthBtn'),
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('child_logs')
                .delete()
                .in('child_id', childIds)
                .in('type', ['vaccine', 'medicine', 'temperature', 'growth', 'milestone', 'note'])

              if (error) throw error
              toast.show({ title: 'Cleared', message: 'Health records have been deleted.' })
            } catch (e: any) { Alert.alert('Error', e.message) }
          },
        },
      ]
    )
  }

  const cardStyle = diffuse
    ? { backgroundColor: dt.colors.surface, borderColor: dt.colors.line, borderRadius: radius.lg }
    : { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg }
  const dividerColor = diffuse ? dt.colors.line : colors.borderLight
  const sectionLabelColor = diffuse ? dt.colors.ink3 : colors.textMuted

  return (
    <View style={[styles.root, { backgroundColor: diffuse ? dt.colors.bg : colors.bg }]}>
      <View style={[styles.headerWrap, { paddingTop: insets.top + 8 }]}>
        <ScreenHeader title="" />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Big Fraunces title */}
        <View style={styles.titleBlock}>
          <Display size={34} color={diffuse ? dt.colors.ink : colors.text}>{t('privacy_title')}</Display>
          <DisplayItalic size={18} color={diffuse ? dt.colors.ink : stickers.coral} style={{ marginTop: 6 }}>
            {t('privacy_subtitle')}
          </DisplayItalic>
        </View>

        {/* Data Sharing */}
        <View style={{ marginTop: 8 }}>
          <MonoCaps color={sectionLabelColor} style={{ letterSpacing: 1.5 }}>{t('privacy_sectionDataSharing')}</MonoCaps>
        </View>
        <View style={[styles.card, diffuse && styles.cardFlat, cardStyle]}>
          <ToggleRow stickerKind="heart" label={t('privacy_toggleShareCareCircle')} desc={t('privacy_toggleShareCareCircleDesc')}
            value={settings.share_with_caregivers} onToggle={(v) => updateSetting('share_with_caregivers', v)} />
          <View style={[styles.divider, { backgroundColor: dividerColor }]} />
          <ToggleRow stickerKind="crossPink" label={t('privacy_toggleShareHealth')} desc={t('privacy_toggleShareHealthDesc')}
            value={settings.share_health_data} onToggle={(v) => updateSetting('share_health_data', v)} />
          <View style={[styles.divider, { backgroundColor: dividerColor }]} />
          <ToggleRow stickerKind="sparkle" label={t('privacy_toggleSharePhotos')} desc={t('privacy_toggleSharePhotosDesc')}
            value={settings.share_photos} onToggle={(v) => updateSetting('share_photos', v)} />
        </View>

        {/* AI & Analytics */}
        <View style={{ marginTop: 18 }}>
          <MonoCaps color={sectionLabelColor} style={{ letterSpacing: 1.5 }}>{t('privacy_sectionAI')}</MonoCaps>
        </View>
        <View style={[styles.card, diffuse && styles.cardFlat, cardStyle]}>
          <ToggleRow stickerKind="eye" label={t('privacy_toggleAI')} desc={t('privacy_toggleAIDesc')}
            value={settings.ai_data_usage} onToggle={(v) => updateSetting('ai_data_usage', v)} />
          <View style={[styles.divider, { backgroundColor: dividerColor }]} />
          <ToggleRow stickerKind="star" label={t('privacy_toggleAnalytics')} desc={t('privacy_toggleAnalyticsDesc')}
            value={settings.analytics} onToggle={(v) => updateSetting('analytics', v)} />
          <View style={[styles.divider, { backgroundColor: dividerColor }]} />
          <ToggleRow stickerKind="heart" label={t('privacy_toggleMarketing')} desc={t('privacy_toggleMarketingDesc')}
            value={settings.marketing} onToggle={(v) => updateSetting('marketing', v)} />
        </View>

        {/* Your Rights — DSAR + transparency (Phase 1) */}
        <View style={{ marginTop: 18 }}>
          <MonoCaps color={sectionLabelColor} style={{ letterSpacing: 1.5 }}>{t('privacy_sectionRights')}</MonoCaps>
        </View>
        <View style={[styles.card, diffuse && styles.cardFlat, cardStyle]}>
          <ActionRow stickerKind="eye" label={t('privacy_dataInventory')} desc={t('privacy_dataInventoryDesc')} onPress={() => router.push('/profile/data-inventory')} />
          <View style={[styles.divider, { backgroundColor: dividerColor }]} />
          <ActionRow stickerKind="leaf" label={t('privacy_transparency')} desc={t('privacy_transparencyDesc')} onPress={() => router.push('/profile/data-transparency')} />
        </View>

        {/* Your Data */}
        <View style={{ marginTop: 18 }}>
          <MonoCaps color={sectionLabelColor} style={{ letterSpacing: 1.5 }}>{t('privacy_sectionYourData')}</MonoCaps>
        </View>
        <View style={[styles.card, diffuse && styles.cardFlat, cardStyle]}>
          <ActionRow stickerKind="leaf" label={t('privacy_exportData')} desc={t('privacy_exportDataDesc')} onPress={handleExportData} loading={exporting} />
          <View style={[styles.divider, { backgroundColor: dividerColor }]} />
          <ActionRow stickerKind="crossCoral" label={t('privacy_clearLogs')} desc={t('privacy_clearLogsDesc')} onPress={handleClearLogs} loading={clearingLogs} danger />
          <View style={[styles.divider, { backgroundColor: dividerColor }]} />
          <ActionRow stickerKind="crossCoral" label={t('privacy_clearChat')} desc={t('privacy_clearChatDesc')} onPress={handleClearChat} loading={clearingChat} danger />
          <View style={[styles.divider, { backgroundColor: dividerColor }]} />
          <ActionRow stickerKind="crossCoral" label={t('privacy_clearMemories')} desc={t('privacy_clearMemoriesDesc')} onPress={handleClearMemories} loading={clearingMemories} danger />
          <View style={[styles.divider, { backgroundColor: dividerColor }]} />
          <ActionRow stickerKind="crossCoral" label={t('privacy_clearHealth')} desc={t('privacy_clearHealthDesc')} onPress={handleClearHealthRecords} danger />
        </View>

        {/* Legal */}
        <View style={{ marginTop: 18 }}>
          <MonoCaps color={sectionLabelColor} style={{ letterSpacing: 1.5 }}>{t('privacy_sectionLegal')}</MonoCaps>
        </View>
        <View style={[styles.card, diffuse && styles.cardFlat, cardStyle]}>
          <ActionRow stickerKind="star" label={t('privacy_privacyPolicy')} desc={t('privacy_privacyPolicyDesc')} onPress={() => router.push('/legal/privacy')} />
          <View style={[styles.divider, { backgroundColor: dividerColor }]} />
          <ActionRow stickerKind="sparkle" label={t('privacy_termsOfService')} desc={t('privacy_termsOfServiceDesc')} onPress={() => router.push('/legal/terms')} />
        </View>

        <Text style={[styles.footer, { color: diffuse ? dt.colors.ink3 : colors.textMuted, fontFamily: diffuse ? diffuseFont.body : font.body }]}>
          {t('privacy_footer')}
        </Text>
      </ScrollView>
    </View>
  )
}

// Character-blob concept per sticker kind, for the Diffuse branch — chosen for
// the row's meaning, not the legacy sticker shape. The blob sits inside the
// bloom (which carries the sticker's semantic hue).
const DIFFUSE_CHARACTER: Record<StickerKind, CharacterName> = {
  heart: 'community',   // share with care circle
  crossPink: 'health',  // share health data
  crossCoral: 'warning',// clear-data danger rows
  sparkle: 'photo',     // share photos
  star: 'star',         // analytics / policy
  leaf: 'observe',      // transparency / export
  eye: 'observe',       // AI data usage / inventory
}

function StickerGlyph({ kind, size = 34 }: { kind: StickerKind; size?: number }) {
  const { stickers } = useTheme()
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()

  if (diffuse) {
    const bloom: Record<StickerKind, string> = {
      heart: dt.stickers.pink,
      crossPink: dt.stickers.pink,
      crossCoral: dt.stickers.coral,
      sparkle: dt.stickers.yellow,
      star: dt.stickers.yellow,
      leaf: dt.stickers.green,
      eye: dt.stickers.lilac,
    }
    return (
      <DiffuseBloomIcon color={bloom[kind]} size={size} intensity={0.5}>
        <Character name={DIFFUSE_CHARACTER[kind]} size={Math.round(size * 0.62)} />
      </DiffuseBloomIcon>
    )
  }

  switch (kind) {
    case 'heart': return <Heart size={size} fill={stickers.pink} />
    case 'crossPink': return <Cross size={size} fill={stickers.pink} />
    case 'crossCoral': return <Cross size={size} fill={stickers.coral} />
    case 'sparkle': return <Sparkle size={size} fill={stickers.yellow} />
    case 'star': return <Star size={size} fill={stickers.yellow} />
    case 'leaf': return <Leaf size={size} fill={stickers.green} />
    case 'eye': return <GrandmaEye size={size} body={stickers.lilac} accent={stickers.coral} />
  }
}

function ToggleRow({ stickerKind, label, desc, value, onToggle }: {
  stickerKind: StickerKind; label: string; desc: string; value: boolean; onToggle: (v: boolean) => void
}) {
  const { colors, font, brand } = useTheme()
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
  return (
    <View style={styles.toggleRow}>
      <View style={styles.stickerWrap}><StickerGlyph kind={stickerKind} /></View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.rowLabel, { color: diffuse ? dt.colors.ink : colors.text, fontFamily: diffuse ? diffuseFont.bodySemiBold : font.bodySemiBold }]}>{label}</Text>
        <Text style={[styles.rowDesc, { color: diffuse ? dt.colors.ink3 : colors.textMuted, fontFamily: diffuse ? diffuseFont.body : font.body }]}>{desc}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ false: diffuse ? dt.colors.line2 : colors.borderStrong, true: diffuse ? dt.colors.ink : brand.pregnancy }}
        thumbColor={diffuse ? dt.colors.surface : '#FFFFFF'}
        ios_backgroundColor={diffuse ? dt.colors.line2 : colors.borderStrong}
      />
    </View>
  )
}

function ActionRow({ stickerKind, label, desc, onPress, loading, danger }: {
  stickerKind: StickerKind; label: string; desc: string; onPress: () => void; loading?: boolean; danger?: boolean
}) {
  const { colors, font, stickers } = useTheme()
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
  return (
    <Pressable onPress={loading ? undefined : onPress} style={[styles.row, loading && { opacity: 0.5 }]}>
      <View style={styles.rowLeft}>
        <View style={styles.stickerWrap}><StickerGlyph kind={stickerKind} /></View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.rowLabel, { color: diffuse ? dt.colors.ink : colors.text, fontFamily: diffuse ? diffuseFont.bodySemiBold : font.bodySemiBold }]}>{label}</Text>
          <Text style={[styles.rowDesc, { color: diffuse ? dt.colors.ink3 : colors.textMuted, fontFamily: diffuse ? diffuseFont.body : font.body }]}>{desc}</Text>
        </View>
      </View>
      {loading
        ? <ActivityIndicator size="small" color={diffuse ? dt.colors.ink : colors.text} />
        : <ChevronRight size={16} color={diffuse ? (danger ? dt.colors.error : dt.colors.ink3) : (danger ? stickers.coral : colors.textMuted)} strokeWidth={diffuse ? 1.5 : 2} />}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  headerWrap: { paddingHorizontal: 16 },
  scroll: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 40 },
  card: {
    padding: 4,
    marginTop: 8,
    borderWidth: 1,
    shadowColor: '#141313',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
  },
  cardFlat: {
    shadowOpacity: 0,
    elevation: 0,
  },
  divider: { height: 1, marginHorizontal: 20 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 16, paddingHorizontal: 20, gap: 12 },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  rowLabel: { fontSize: 15 },
  rowDesc: { fontSize: 12, marginTop: 2, lineHeight: 16 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 18, gap: 12 },
  stickerWrap: { width: 38, alignItems: 'center', justifyContent: 'center' },
  footer: { fontSize: 12, textAlign: 'center', marginTop: 22, lineHeight: 18, paddingHorizontal: 20 },
  titleBlock: { marginTop: 4, marginBottom: 18, paddingHorizontal: 4 },
})
