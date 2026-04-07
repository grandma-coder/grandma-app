/**
 * Share to Channel — pick a channel to share a garage post into.
 */

import { useState, useEffect } from 'react'
import {
  View,
  Text,
  Pressable,
  FlatList,
  Alert,
  StyleSheet,
  ActivityIndicator,
} from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { ArrowLeft, Hash, Check } from 'lucide-react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme } from '../../constants/theme'
import { getChannels, type Channel } from '../../lib/channels'
import { createPost, getMyChannelIds } from '../../lib/channelPosts'

export default function ShareToChannel() {
  const { colors, radius } = useTheme()
  const insets = useSafeAreaInsets()
  const { postId, caption } = useLocalSearchParams<{ postId: string; caption: string }>()

  const [channels, setChannels] = useState<Channel[]>([])
  const [myChannelIds, setMyChannelIds] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [sharing, setSharing] = useState<string | null>(null)

  useEffect(() => {
    load()
  }, [])

  async function load() {
    setLoading(true)
    try {
      const [allChannels, myIds] = await Promise.all([
        getChannels(),
        getMyChannelIds(),
      ])
      setChannels(allChannels)
      setMyChannelIds(myIds)
    } catch {} finally {
      setLoading(false)
    }
  }

  async function shareToChannel(channelId: string, channelName: string) {
    setSharing(channelId)
    try {
      const postLink = `grandma://garage/${postId}`
      const message = `${caption ?? 'Shared a post'}\n\n📎 ${postLink}`
      await createPost(channelId, message)
      Alert.alert('Shared!', `Post shared to #${channelName}`, [
        { text: 'OK', onPress: () => router.back() },
      ])
    } catch (e: any) {
      Alert.alert('Error', e.message)
    } finally {
      setSharing(null)
    }
  }

  const joinedChannels = channels.filter((c) => myChannelIds.includes(c.id))
  const otherChannels = channels.filter((c) => !myChannelIds.includes(c.id))

  return (
    <View style={[s.root, { backgroundColor: colors.bg }]}>
      {/* Header */}
      <View style={[s.header, { paddingTop: insets.top + 8, borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} style={s.headerBtn}>
          <ArrowLeft size={24} color={colors.text} />
        </Pressable>
        <Text style={[s.headerTitle, { color: colors.text }]}>Share to Channel</Text>
        <View style={s.headerBtn} />
      </View>

      {loading ? (
        <View style={s.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={[...joinedChannels, ...otherChannels]}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: 40 }}
          ListHeaderComponent={
            joinedChannels.length > 0 ? (
              <Text style={[s.sectionLabel, { color: colors.textMuted }]}>MY CHANNELS</Text>
            ) : null
          }
          renderItem={({ item, index }) => {
            const isJoined = myChannelIds.includes(item.id)
            const isFirstOther = !isJoined && (index === 0 || myChannelIds.includes(channels[index - 1]?.id))

            return (
              <>
                {isFirstOther && otherChannels.length > 0 && (
                  <Text style={[s.sectionLabel, { color: colors.textMuted }]}>OTHER CHANNELS</Text>
                )}
                <Pressable
                  onPress={() => {
                    if (!isJoined) {
                      Alert.alert('Join first', 'You need to join this channel before sharing.')
                      return
                    }
                    shareToChannel(item.id, item.name)
                  }}
                  style={[s.channelRow, { borderBottomColor: colors.borderLight }]}
                >
                  <View style={[s.channelIcon, { backgroundColor: colors.primaryTint }]}>
                    <Hash size={16} color={colors.primary} strokeWidth={2} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.channelName, { color: colors.text }]}>{item.name}</Text>
                    {item.description && (
                      <Text style={[s.channelDesc, { color: colors.textMuted }]} numberOfLines={1}>
                        {item.description}
                      </Text>
                    )}
                  </View>
                  {sharing === item.id ? (
                    <ActivityIndicator color={colors.primary} size="small" />
                  ) : isJoined ? (
                    <View style={[s.shareBtn, { backgroundColor: colors.primary, borderRadius: radius.lg }]}>
                      <Text style={s.shareBtnText}>Share</Text>
                    </View>
                  ) : (
                    <Text style={[s.notJoined, { color: colors.textMuted }]}>Not joined</Text>
                  )}
                </Pressable>
              </>
            )
          }}
          ListEmptyComponent={
            <View style={s.center}>
              <Text style={[s.emptyText, { color: colors.textMuted }]}>No channels found</Text>
            </View>
          }
        />
      )}
    </View>
  )
}

const s = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  headerBtn: { width: 40, alignItems: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '700' },

  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 8,
  },

  channelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  channelIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  channelName: { fontSize: 15, fontWeight: '600' },
  channelDesc: { fontSize: 12, fontWeight: '400', marginTop: 2 },

  shareBtn: { paddingVertical: 6, paddingHorizontal: 16 },
  shareBtnText: { fontSize: 13, fontWeight: '700', color: '#FFFFFF' },
  notJoined: { fontSize: 12, fontWeight: '500' },

  emptyText: { fontSize: 14, fontWeight: '500' },
})
