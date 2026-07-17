/**
 * Data I Hold — Data Subject Access Request (DSAR) screen (Phase 1 / trust).
 *
 * Flo has a static "what data do you hold" list. Ours is a superset: it shows
 * a LIVE inventory — the real row-count we store in each category, for THIS
 * user — plus a copyable user-ID for support and a one-tap full export. Nothing
 * is described that we don't actually hold.
 *
 * The category list mirrors the export-user-data edge function so the two agree.
 * Counts are read client-side via RLS-scoped counts (head:true, no rows pulled).
 */

import { useEffect, useState } from 'react'
import {
  View, Text, Pressable, ScrollView, StyleSheet, ActivityIndicator, Alert,
} from 'react-native'
import * as Clipboard from 'expo-clipboard'
import * as FileSystem from 'expo-file-system/legacy'
import * as Sharing from 'expo-sharing'
import { Copy, Check, Download } from 'lucide-react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme, useDiffuseTheme, diffuseFont, diffuseTypeRole } from '../../constants/theme'
import { useTranslation } from '../../lib/i18n'
import { supabase } from '../../lib/supabase'
import { useChildStore } from '../../store/useChildStore'
import { ScreenHeader } from '../../components/ui/ScreenHeader'
import { Display, DisplayItalic, MonoCaps } from '../../components/ui/Typography'
import { useSavedToast } from '../../components/ui/SavedToast'
import { useIsDiffuse } from '../../components/ui/diffuse/DiffuseKit'

// Each category maps to how the export bundle counts it. `by` decides which
// filter to use: 'user' = column on a user-scoped table, 'child' = child_id in
// the user's children, 'profile' = exactly the one profile row.
interface Category {
  key: string
  labelKey: string
  table: string
  by: 'user' | 'child' | 'profile'
  col?: string // user-scoped column name when it isn't 'user_id'
}

const CATEGORIES: Category[] = [
  { key: 'profile', labelKey: 'dataInv_profile', table: 'profiles', by: 'profile' },
  { key: 'children', labelKey: 'dataInv_children', table: 'children', by: 'user' },
  { key: 'child_logs', labelKey: 'dataInv_childLogs', table: 'child_logs', by: 'child' },
  { key: 'cycle_logs', labelKey: 'dataInv_cycleLogs', table: 'cycle_logs', by: 'user' },
  { key: 'pregnancy_logs', labelKey: 'dataInv_pregnancyLogs', table: 'pregnancy_logs', by: 'user' },
  { key: 'insights', labelKey: 'dataInv_insights', table: 'insights', by: 'child' },
  { key: 'exams', labelKey: 'dataInv_exams', table: 'exams', by: 'child' },
  { key: 'notifications', labelKey: 'dataInv_notifications', table: 'notifications', by: 'user' },
  { key: 'community', labelKey: 'dataInv_community', table: 'channel_posts', by: 'user', col: 'author_id' },
]

export default function DataInventoryScreen() {
  const { colors, font, stickers, radius } = useTheme()
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
  const insets = useSafeAreaInsets()
  const { t } = useTranslation()
  const children = useChildStore((s) => s.children)
  const toast = useSavedToast()

  const [userId, setUserId] = useState<string | null>(null)
  const [counts, setCounts] = useState<Record<string, number | null>>({})
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [exporting, setExporting] = useState(false)

  useEffect(() => {
    void loadInventory()
  }, [children.length])

  async function loadInventory() {
    setLoading(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { setLoading(false); return }
    const uid = session.user.id
    setUserId(uid)

    const childIds = children.map((c) => c.id)
    const next: Record<string, number | null> = {}

    for (const cat of CATEGORIES) {
      try {
        if (cat.by === 'profile') {
          next[cat.key] = 1 // exactly one profile row
          continue
        }
        if (cat.by === 'child' && childIds.length === 0) {
          next[cat.key] = 0
          continue
        }
        let query = supabase.from(cat.table).select('*', { count: 'exact', head: true })
        if (cat.by === 'user') query = query.eq(cat.col ?? 'user_id', uid)
        else query = query.in('child_id', childIds)
        const { count } = await query
        next[cat.key] = count ?? 0
      } catch {
        next[cat.key] = null // table may not exist in this env — show a dash
      }
    }
    setCounts(next)
    setLoading(false)
  }

  async function copyUserId() {
    if (!userId) return
    await Clipboard.setStringAsync(userId)
    setCopied(true)
    toast.show({ title: t('dataInv_copied'), message: t('dataInv_copiedMsg') })
    setTimeout(() => setCopied(false), 1800)
  }

  async function handleExport() {
    setExporting(true)
    try {
      const { data, error } = await supabase.functions.invoke('export-user-data')
      if (error) throw error
      const json = JSON.stringify(data, null, 2)
      const fileUri = `${FileSystem.cacheDirectory}grandma-data-export.json`
      await FileSystem.writeAsStringAsync(fileUri, json, { encoding: FileSystem.EncodingType.UTF8 })
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
  }

  const ink = diffuse ? dt.colors.ink : colors.text
  const inkMuted = diffuse ? dt.colors.ink3 : colors.textMuted
  const line = diffuse ? dt.colors.line : colors.borderLight
  const accent = diffuse ? dt.stickers.lilac : stickers.coral
  const cardBg = diffuse ? dt.colors.surface : colors.surface
  const cardBorder = diffuse ? dt.colors.line : colors.border

  const shortId = userId ? `${userId.slice(0, 8)}…${userId.slice(-4)}` : '—'

  return (
    <View style={[styles.root, { backgroundColor: diffuse ? dt.colors.bg : colors.bg }]}>
      <View style={[styles.headerWrap, { paddingTop: insets.top + 8 }]}>
        <ScreenHeader title="" />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.titleBlock}>
          <Display size={34} color={ink}>{t('dataInv_title')}</Display>
          <DisplayItalic size={18} color={diffuse ? dt.colors.ink : stickers.coral} style={{ marginTop: 6 }}>
            {t('dataInv_subtitle')}
          </DisplayItalic>
        </View>

        <Text style={[styles.intro, { color: inkMuted, fontFamily: diffuse ? diffuseFont.body : font.body }]}>
          {t('dataInv_intro')}
        </Text>

        {/* Live inventory of everything we hold */}
        <View style={{ marginTop: 16 }}>
          <MonoCaps color={inkMuted} style={{ letterSpacing: 1.5 }}>{t('dataInv_sectionHolding')}</MonoCaps>
        </View>
        <View style={[styles.card, diffuse && styles.cardFlat, { backgroundColor: cardBg, borderColor: cardBorder, borderRadius: radius.lg }]}>
          {CATEGORIES.map((cat, i) => (
            <View key={cat.key}>
              {i > 0 && <View style={[styles.divider, { backgroundColor: line }]} />}
              <View style={styles.invRow}>
                <Text style={[styles.invLabel, { color: ink, fontFamily: diffuse ? diffuseFont.body : font.body }]}>
                  {t(cat.labelKey as any)}
                </Text>
                {loading
                  ? <ActivityIndicator size="small" color={inkMuted} />
                  : <Text style={[styles.invCount, { color: accent, fontFamily: diffuse ? diffuseTypeRole.numHero : font.display }]}>
                      {counts[cat.key] === null ? '—' : counts[cat.key]}
                    </Text>}
              </View>
            </View>
          ))}
        </View>

        {/* User ID for support */}
        <View style={{ marginTop: 18 }}>
          <MonoCaps color={inkMuted} style={{ letterSpacing: 1.5 }}>{t('dataInv_sectionSupport')}</MonoCaps>
        </View>
        <Pressable
          onPress={copyUserId}
          style={[styles.card, styles.idCard, diffuse && styles.cardFlat, { backgroundColor: cardBg, borderColor: cardBorder, borderRadius: radius.lg }]}
        >
          <View style={{ flex: 1 }}>
            <Text style={[styles.invLabel, { color: ink, fontFamily: diffuse ? diffuseFont.bodySemiBold : font.bodySemiBold }]}>
              {t('dataInv_userId')}
            </Text>
            <Text style={[styles.idValue, { color: inkMuted, fontFamily: diffuse ? diffuseFont.mono : font.body }]}>
              {shortId}
            </Text>
          </View>
          {copied
            ? <Check size={18} color={diffuse ? dt.stickers.green : stickers.green} strokeWidth={2.5} />
            : <Copy size={18} color={inkMuted} strokeWidth={1.8} />}
        </Pressable>
        <Text style={[styles.footnote, { color: inkMuted, fontFamily: diffuse ? diffuseFont.body : font.body }]}>
          {t('dataInv_userIdHint')}
        </Text>

        {/* Full export */}
        <Pressable
          onPress={exporting ? undefined : handleExport}
          style={[styles.exportBtn, { backgroundColor: accent, borderRadius: radius.full, opacity: exporting ? 0.6 : 1 }]}
        >
          {exporting
            ? <ActivityIndicator size="small" color="#FFFFFF" />
            : <Download size={18} color={diffuse ? dt.colors.bg : '#FFFFFF'} strokeWidth={2} />}
          <Text style={[styles.exportLabel, { color: diffuse ? dt.colors.bg : '#FFFFFF', fontFamily: diffuse ? diffuseFont.bodySemiBold : font.bodySemiBold }]}>
            {t('dataInv_exportBtn')}
          </Text>
        </Pressable>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  headerWrap: { paddingHorizontal: 16 },
  scroll: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 48 },
  titleBlock: { marginTop: 4, marginBottom: 12, paddingHorizontal: 4 },
  intro: { fontSize: 14, lineHeight: 20, paddingHorizontal: 4 },
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
  cardFlat: { shadowOpacity: 0, elevation: 0 },
  divider: { height: 1, marginHorizontal: 18 },
  invRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 15, paddingHorizontal: 18, gap: 12,
  },
  invLabel: { fontSize: 15, flex: 1 },
  invCount: { fontSize: 20 },
  idCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 16, paddingHorizontal: 18,
  },
  idValue: { fontSize: 13, marginTop: 3, letterSpacing: 0.5 },
  footnote: { fontSize: 12, lineHeight: 17, marginTop: 8, paddingHorizontal: 4 },
  exportBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    height: 56, marginTop: 24,
  },
  exportLabel: { fontSize: 15 },
})
