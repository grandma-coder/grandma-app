/**
 * Circles tab (community model: Option B) — anonymous topic forum browse.
 * FOUNDATION: lists circles filtered to the user's journey. Tapping one opens
 * its read-only anonymous feed. Posting is a follow-up.
 */

import { useState, useCallback } from 'react'
import { View, Text, Pressable, FlatList, StyleSheet, ActivityIndicator } from 'react-native'
import { router, useFocusEffect } from 'expo-router'
import { ChevronRight, ShieldCheck } from 'lucide-react-native'
import { useTheme, useDiffuseTheme, diffuseFont } from '../../constants/theme'
import { useTranslation } from '../../lib/i18n'
import { useModeStore } from '../../store/useModeStore'
import { useIsDiffuse } from '../ui/diffuse/DiffuseKit'
import { Character } from '../characters/Characters'
import { circleBlob } from '../../lib/circleBlob'
import { getCircles, type Circle, type CircleJourney } from '../../lib/circles'

export function CirclesTab() {
  const { colors, font, stickers, radius } = useTheme()
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
  const { t } = useTranslation()
  const mode = useModeStore((s) => s.mode)

  const [circles, setCircles] = useState<Circle[]>([])
  const [loading, setLoading] = useState(true)

  const journey: CircleJourney = mode === 'pre-pregnancy' ? 'pre-pregnancy' : mode === 'pregnancy' ? 'pregnancy' : 'kids'

  const load = useCallback(() => {
    setLoading(true)
    getCircles(journey)
      .then(setCircles)
      .catch(() => setCircles([]))
      .finally(() => setLoading(false))
  }, [journey])

  useFocusEffect(useCallback(() => { load() }, [load]))

  const ink = diffuse ? dt.colors.ink : colors.text
  const inkMuted = diffuse ? dt.colors.ink3 : colors.textMuted
  const cardBg = diffuse ? dt.colors.surface : colors.surface
  const cardBorder = diffuse ? dt.colors.line : colors.border
  const accent = diffuse ? dt.stickers.lilac : stickers.lilac
  const iconTint = diffuse ? dt.stickers.lilacSoft : stickers.lilacSoft

  function renderItem({ item }: { item: Circle }) {
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
          {/* bg = the bubble's own fill so cut-out details (e.g. selfcare's steam) blend into the socket */}
          <Character name={circleBlob(item.name)} size={30} bg={iconTint} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.name, { color: ink, fontFamily: diffuse ? diffuseFont.bodySemiBold : font.bodySemiBold }]}>{item.name}</Text>
          {item.description ? (
            <Text style={[styles.desc, { color: inkMuted, fontFamily: diffuse ? diffuseFont.body : font.body }]} numberOfLines={2}>
              {item.description}
            </Text>
          ) : null}
        </View>
        <ChevronRight size={16} color={inkMuted} strokeWidth={diffuse ? 1.5 : 2} />
      </Pressable>
    )
  }

  return (
    <View style={styles.root}>
      {/* Anonymity reassurance banner */}
      <View style={[styles.banner, { backgroundColor: diffuse ? dt.stickers.lilacSoft : stickers.lilacSoft, borderRadius: radius.md }]}>
        <ShieldCheck size={16} color={accent} strokeWidth={2} />
        <Text style={[styles.bannerText, { color: ink, fontFamily: diffuse ? diffuseFont.body : font.body }]}>
          {t('circles_anonBanner')}
        </Text>
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator color={inkMuted} /></View>
      ) : (
        <FlatList
          data={circles}
          keyExtractor={(c) => c.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
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
  banner: { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 20, marginBottom: 12, paddingVertical: 10, paddingHorizontal: 14 },
  bannerText: { fontSize: 12.5, flex: 1, lineHeight: 17 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { paddingHorizontal: 20, paddingBottom: 32, gap: 10 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, borderWidth: 1 },
  iconBubble: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  name: { fontSize: 16 },
  desc: { fontSize: 13, marginTop: 2, lineHeight: 18 },
  empty: { fontSize: 14, textAlign: 'center', marginTop: 40 },
})
