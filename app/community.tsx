/**
 * Community — Channels + Anonymous, split out of the old /connections shell.
 *
 * Two spaces that are both "people talking" (unlike the Village marketplace),
 * so they live together here behind a 2-tab switcher, each with a one-line
 * explainer so the difference is unmistakable:
 *   • Channels  — topic groups you join and post in as yourself.
 *   • Anonymous — a safe space where your name is never shown (was "Circles").
 */

import { useState, useCallback } from 'react'
import { View, Text, Pressable, StyleSheet } from 'react-native'
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme, brand, useDiffuseTheme, diffuseFont, getModeColorSoft } from '../constants/theme'
import { ChannelsTab } from '../components/connections/ChannelsTab'
import { CirclesTab } from '../components/connections/CirclesTab'
import { ScreenHeader } from '../components/ui/ScreenHeader'
import { InkBackButton } from '../components/ui/InkBackButton'
import { SiteSticker } from '../components/stickers/SiteSticker'
import { useTranslation } from '../lib/i18n'
import { useIsDiffuse } from '../components/ui/diffuse/DiffuseKit'
import { useModeStore } from '../store/useModeStore'
import { useQuery } from '@tanstack/react-query'
import { getUnreadCount } from '../lib/notifications'

type CommunityTab = 'channels' | 'anonymous'

export default function CommunityScreen() {
  const { colors, font } = useTheme()
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
  const insets = useSafeAreaInsets()
  const { t } = useTranslation()
  const params = useLocalSearchParams<{ tab?: string }>()
  const [tab, setTab] = useState<CommunityTab>(params.tab === 'anonymous' ? 'anonymous' : 'channels')
  const mode = useModeStore((st) => st.mode)

  // Shared with the tab-bar badge + NotificationBell (same key) so the count
  // always matches the /notifications inbox it opens; refetched on focus.
  const { data: notifCount = 0, refetch } = useQuery({
    queryKey: ['notification-count'],
    queryFn: getUnreadCount,
    staleTime: 30 * 1000,
  })
  useFocusEffect(
    useCallback(() => {
      refetch()
    }, [refetch])
  )

  const ink = diffuse ? dt.colors.ink : colors.text
  const inkMuted = diffuse ? dt.colors.ink3 : colors.textMuted
  const explainer = tab === 'channels' ? t('community_channels_explainer') : t('community_anon_explainer')

  return (
    <View style={[styles.root, { backgroundColor: diffuse ? dt.colors.bg : colors.bg }]}>
      <View style={{ paddingTop: insets.top + 8, paddingHorizontal: 16 }}>
        {diffuse ? (
        <ScreenHeader
          title={t('community_title')}
          right={
            <Pressable onPress={() => router.push('/notifications' as any)} hitSlop={8}>
              <View style={[styles.bellBtn, { backgroundColor: 'transparent', borderColor: dt.colors.line2 }]}>
                <Ionicons name="notifications-outline" size={18} color={dt.colors.ink} />
                {notifCount > 0 && (
                  <View style={[styles.notifBadge, { backgroundColor: dt.colors.error }]}>
                    <Text style={[styles.notifBadgeText, { color: dt.colors.surface, fontFamily: diffuseFont.monoBold }]}>{notifCount > 9 ? '9+' : notifCount}</Text>
                  </View>
                )}
              </View>
            </Pressable>
          }
        />
        ) : (
          <View style={styles.siteHeader}>
            <InkBackButton ink={colors.text} paper={colors.surface} style={{ marginBottom: 0 }} />
            <SiteSticker name="bubble" size={34} cut />
            <Text style={[styles.siteTitle, { color: colors.text, fontFamily: font.display }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
              {t('community_title')}
            </Text>
            <Pressable
              onPress={() => router.push('/notifications' as any)}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={notifCount > 0 ? t('comm_bellA11yUnread', { count: notifCount }) : t('comm_bellA11y')}
            >
              <View style={[styles.bellBtn, { backgroundColor: colors.surface, borderColor: colors.text, borderWidth: 1.5 }]}>
                <SiteSticker name="bell" size={20} cut />
                {notifCount > 0 && (
                  <View style={[styles.notifBadge, { backgroundColor: colors.text }]}>
                    <Text style={[styles.notifBadgeText, { color: colors.bg, fontFamily: font.bodyBold }]}>{notifCount > 9 ? '9+' : notifCount}</Text>
                  </View>
                )}
              </View>
            </Pressable>
          </View>
        )}
      </View>

      {/* Two-tab switcher: Channels | Anonymous */}
      <View style={[styles.tabBar, diffuse
        ? { backgroundColor: 'transparent', borderColor: dt.colors.line, gap: 8 }
        : { backgroundColor: 'transparent', borderColor: 'transparent', padding: 0, gap: 8 }]}>
        {(['channels', 'anonymous'] as const).map((tk) => {
          const active = tab === tk
          return (
            <Pressable key={tk} onPress={() => setTab(tk)} style={styles.tabBtnWrap} accessibilityRole="tab" accessibilityState={{ selected: active }}>
              <View
                style={[
                  styles.tabBtn,
                  diffuse
                    ? {
                        backgroundColor: active ? dt.colors.surface : 'transparent',
                        borderWidth: 1,
                        borderColor: active ? dt.colors.hairline : dt.colors.line,
                      }
                    : { backgroundColor: active ? getModeColorSoft(mode) : colors.surface, borderWidth: 1.5, borderColor: colors.text },
                ]}
              >
                <Text
                  style={[
                    styles.tabText,
                    diffuse
                      ? {
                          fontFamily: active ? diffuseFont.monoBold : diffuseFont.mono,
                          color: active ? dt.colors.ink : dt.colors.ink3,
                          textTransform: 'uppercase',
                          letterSpacing: 1.4,
                          fontSize: 12,
                        }
                      : {
                          fontFamily: active ? font.bodySemiBold : font.bodyMedium,
                          color: colors.text,
                        },
                  ]}
                >
                  {tk === 'channels' ? t('community_tab_channels') : t('community_tab_anon')}
                </Text>
              </View>
            </Pressable>
          )
        })}
      </View>

      {/* One-line explainer so Channels vs Anonymous is unmistakable */}
      <Text style={[styles.explainer, { color: inkMuted, fontFamily: diffuse ? diffuseFont.body : font.body }]}>
        {explainer}
      </Text>

      {tab === 'channels' ? <ChannelsTab /> : <CirclesTab />}
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  siteHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  siteTitle: { flex: 1, fontSize: 26, textTransform: 'uppercase', letterSpacing: 0.3 },
  bellBtn: {
    width: 34, height: 34, borderRadius: 999, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center', position: 'relative',
  },
  notifBadge: {
    position: 'absolute', top: -2, right: -2, minWidth: 16, height: 16,
    borderRadius: 8, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3,
  },
  notifBadgeText: { fontSize: 9, fontWeight: '800' },
  tabBar: {
    flexDirection: 'row', padding: 4, marginHorizontal: 20, marginTop: 12,
    marginBottom: 10, borderRadius: 999, borderWidth: 1,
  },
  tabBtnWrap: { flex: 1 },
  tabBtn: { alignItems: 'center', paddingVertical: 10, borderRadius: 999 },
  tabText: { fontSize: 14, letterSpacing: 0.1 },
  explainer: { fontSize: 12.5, lineHeight: 17, textAlign: 'center', paddingHorizontal: 32, marginBottom: 12 },
})
