/**
 * Circles tab (community model: Option B) — anonymous topic forum browse.
 * FOUNDATION: lists circles filtered to the user's journey. Tapping one opens
 * its read-only anonymous feed. Posting is a follow-up.
 */

import { useState, useCallback, useRef } from 'react'
import { View, Text, Pressable, FlatList, StyleSheet, ActivityIndicator } from 'react-native'
import { router, useFocusEffect } from 'expo-router'
import { ChevronRight } from 'lucide-react-native'
import { useTheme, useDiffuseTheme, diffuseFont } from '../../constants/theme'
import { useTranslation } from '../../lib/i18n'
import { useModeStore } from '../../store/useModeStore'
import { useIsDiffuse } from '../ui/diffuse/DiffuseKit'
import { Character } from '../characters/Characters'
import { SiteSticker } from '../stickers/SiteSticker'
import { circleBlob } from '../../lib/circleBlob'
import { getCircles, type Circle, type CircleJourney } from '../../lib/circles'
import { PillButton } from '../ui/PillButton'
import { circleDisplayName, circleDisplayDesc } from './communityLabels'

export function CirclesTab() {
  const { colors, font, stickers, radius } = useTheme()
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
  const { t } = useTranslation()
  const mode = useModeStore((s) => s.mode)

  const [circles, setCircles] = useState<Circle[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)

  const journey: CircleJourney = mode === 'pre-pregnancy' ? 'pre-pregnancy' : mode === 'pregnancy' ? 'pregnancy' : 'kids'

  // Spinner only when there's nothing on screen yet — refocusing (back from a
  // circle) refreshes quietly. A failed load is an error state, not "empty".
  const loadedOnce = useRef(false)
  const load = useCallback(() => {
    if (!loadedOnce.current) setLoading(true)
    getCircles(journey)
      .then((c) => { setCircles(c); setLoadError(false); loadedOnce.current = true })
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false))
  }, [journey])

  useFocusEffect(useCallback(() => { load() }, [load]))

  const ink = diffuse ? dt.colors.ink : colors.text
  const inkMuted = diffuse ? dt.colors.ink3 : colors.textMuted
  const cardBg = diffuse ? dt.colors.surface : colors.surface
  const cardBorder = diffuse ? dt.colors.line : colors.border
  const iconTint = diffuse ? dt.stickers.lilacSoft : stickers.lilacSoft

  function renderItem({ item }: { item: Circle }) {
    if (!diffuse) {
      return (
        <Pressable
          onPress={() => router.push(`/circle/${item.id}` as any)}
          style={({ pressed }) => [styles.siteRow, { borderBottomColor: colors.border }, pressed && { opacity: 0.7 }]}
        >
          <View style={[styles.siteDisc, { backgroundColor: iconTint, borderColor: colors.text }]}>
            <SiteSticker name="owl" size={28} cut />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.name, { color: colors.text, fontFamily: font.bodySemiBold }]}>{circleDisplayName(item.name)}</Text>
            {circleDisplayDesc(item.name, item.description) ? (
              <Text style={[styles.desc, { color: colors.textSecondary, fontFamily: font.body }]} numberOfLines={2}>
                {circleDisplayDesc(item.name, item.description)}
              </Text>
            ) : null}
          </View>
          <ChevronRight size={16} color={colors.text} strokeWidth={2} />
        </Pressable>
      )
    }
    return (
      <Pressable
        onPress={() => router.push(`/circle/${item.id}` as any)}
        style={({ pressed }) => [
          styles.card,
          { backgroundColor: cardBg, borderColor: cardBorder, borderRadius: radius.lg },
          pressed && { opacity: 0.7 },
        ]}
      >
        <View style={[styles.iconBubble, { backgroundColor: iconTint }]}>
          <Character name={circleBlob(item.name)} size={30} bg={iconTint} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.name, { color: ink, fontFamily: diffuseFont.bodySemiBold }]}>{item.name}</Text>
          {item.description ? (
            <Text style={[styles.desc, { color: inkMuted, fontFamily: diffuseFont.body }]} numberOfLines={2}>
              {item.description}
            </Text>
          ) : null}
        </View>
        <ChevronRight size={16} color={inkMuted} strokeWidth={1.5} />
      </Pressable>
    )
  }

  return (
    <View style={styles.root}>
      {/* The anonymity reassurance now lives in the Community screen's per-tab
          explainer (community_anon_explainer), so no banner is repeated here. */}
      {loading ? (
        <View style={styles.center}><ActivityIndicator color={inkMuted} /></View>
      ) : loadError && circles.length === 0 && !diffuse ? (
        <View style={[styles.center, { paddingHorizontal: 40, gap: 10 }]}>
          <SiteSticker name="cloud" size={64} cut />
          <Text style={[styles.empty, { marginTop: 0, color: colors.textSecondary, fontFamily: font.body }]}>{t('common_couldntLoad')}</Text>
          <View style={{ alignSelf: 'stretch', marginTop: 8 }}>
            <PillButton variant="ink" label={t('channelScreen_tryAgain')} onPress={load} />
          </View>
        </View>
      ) : (
        <FlatList
          data={circles}
          keyExtractor={(c) => c.id}
          renderItem={renderItem}
          contentContainerStyle={[styles.list, !diffuse && { gap: 0 }]}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <Text style={[styles.empty, { color: inkMuted, fontFamily: diffuse ? diffuseFont.body : font.body }]}>{t('circles_empty')}</Text>
          }
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { paddingHorizontal: 20, paddingBottom: 32, gap: 10 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, borderWidth: 1 },
  siteRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  siteDisc: { width: 48, height: 48, borderRadius: 24, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  iconBubble: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  name: { fontSize: 16 },
  desc: { fontSize: 13, marginTop: 2, lineHeight: 18 },
  empty: { fontSize: 14, textAlign: 'center', marginTop: 40 },
})
