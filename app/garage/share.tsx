/**
 * Share to Channel — pick a channel to share a garage post into.
 */

import { useState, useEffect } from 'react'
import {
  View,
  Text,
  TextInput,
  Pressable,
  FlatList,
  Image,
  Alert,
  StyleSheet,
  ActivityIndicator,
} from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { ArrowLeft, Hash, Check } from 'lucide-react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme } from '../../constants/theme'
import { getChannels, type Channel } from '../../lib/channels'
import { sendMessage, getMyChannelIds } from '../../lib/channelPosts'
import { fetchPost, type GaragePost } from '../../lib/garagePosts'
import { supabase } from '../../lib/supabase'

export default function ShareToChannel() {
  const { colors, radius } = useTheme()
  const insets = useSafeAreaInsets()
  const { postId, caption } = useLocalSearchParams<{ postId: string; caption: string }>()

  const [channels, setChannels] = useState<Channel[]>([])
  const [myChannelIds, setMyChannelIds] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [sharing, setSharing] = useState<string | null>(null)
  const [post, setPost] = useState<GaragePost | null>(null)
  const [personalMsg, setPersonalMsg] = useState('')

  useEffect(() => {
    load()
  }, [])

  async function load() {
    setLoading(true)
    try {
      const [allChannels, myIds, postData] = await Promise.all([
        getChannels(),
        getMyChannelIds(),
        postId ? fetchPost(postId) : null,
      ])
      setChannels(allChannels)
      setMyChannelIds(myIds)
      if (postData) setPost(postData)
    } catch {} finally {
      setLoading(false)
    }
  }

  function confirmAndShare(channelId: string, channelName: string) {
    if (!personalMsg.trim()) {
      Alert.alert(
        'No message',
        'You haven\'t added a personal message. Share without one?',
        [
          { text: 'Add Message', style: 'cancel' },
          { text: 'Share Anyway', onPress: () => doShare(channelId, channelName) },
        ]
      )
    } else {
      doShare(channelId, channelName)
    }
  }

  async function doShare(channelId: string, channelName: string) {
    setSharing(channelId)
    try {
      const authorName = post?.author_name ?? 'someone'
      const postCaption = caption ?? post?.caption?.split('\n')[0] ?? ''
      const userNote = personalMsg.trim()
      const shareTag = `[garage:${postId}]`
      const message = userNote
        ? `${userNote}\n\n📢 Shared from Garage\n"${postCaption}" — ${authorName}\n${shareTag}`
        : `📢 Shared from Garage\n\n"${postCaption}" — ${authorName}\n${shareTag}`

      const photos = post?.media?.[0]?.url ? [post.media[0].url] : undefined

      await sendMessage(channelId, message, { photos })

      // Increment share count
      if (postId) {
        try {
          await supabase
            .from('garage_posts')
            .update({ share_count: (post?.share_count ?? 0) + 1 })
            .eq('id', postId)
        } catch {}
      }

      Alert.alert('Shared!', `Post shared to #${channelName}`, [
        { text: 'Go to Channel', onPress: () => router.replace(`/channel/${channelId}` as any) },
        { text: 'Share More', style: 'cancel' },
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
            <View>
              {/* Post preview */}
              {post && (
                <View style={[s.previewCard, { backgroundColor: colors.surface, borderRadius: radius.xl }]}>
                  {post.media?.[0]?.url && (
                    <Image source={{ uri: post.media[0].url }} style={s.previewImage} />
                  )}
                  <View style={s.previewText}>
                    <Text style={[s.previewCaption, { color: colors.text }]} numberOfLines={2}>
                      {post.caption?.split('\n')[0] ?? 'Post'}
                    </Text>
                    <Text style={[s.previewAuthor, { color: colors.textMuted }]}>
                      by {post.author_name ?? 'you'}
                    </Text>
                  </View>
                </View>
              )}

              {/* Personal message input */}
              <TextInput
                value={personalMsg}
                onChangeText={setPersonalMsg}
                placeholder="Add a message (optional)..."
                placeholderTextColor={colors.textMuted}
                multiline
                style={[s.messageInput, { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg }]}
              />

              {joinedChannels.length > 0 && (
                <Text style={[s.sectionLabel, { color: colors.textMuted }]}>MY CHANNELS</Text>
              )}
            </View>
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
                    confirmAndShare(item.id, item.name)
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
  // Preview card
  previewCard: { flexDirection: 'row', marginHorizontal: 20, marginTop: 16, padding: 12, gap: 12 },
  previewImage: { width: 60, height: 60, borderRadius: 8, resizeMode: 'cover' },
  previewText: { flex: 1, justifyContent: 'center', gap: 4 },
  previewCaption: { fontSize: 14, fontWeight: '600' },
  previewAuthor: { fontSize: 12, fontWeight: '500' },

  // Message input
  messageInput: { marginHorizontal: 20, marginTop: 12, marginBottom: 8, borderWidth: 1, padding: 14, fontSize: 14, fontWeight: '500', minHeight: 50, maxHeight: 100, textAlignVertical: 'top' },

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
