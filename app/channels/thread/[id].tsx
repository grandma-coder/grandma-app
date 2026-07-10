import { useEffect, useMemo, useState } from 'react'
import {
  View, Text, FlatList, TextInput, Pressable, StyleSheet,
  KeyboardAvoidingView, Platform,
} from 'react-native'
import { useLocalSearchParams, router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { getReplies, postReply, type Reply } from '../../../lib/channels'
import { brand, typography, spacing, borderRadius, useTheme, useDiffuseTheme, diffuseFont } from '../../../constants/theme'
import { useIsDiffuse } from '../../../components/ui/diffuse/DiffuseKit'
import { useTranslation } from '../../../lib/i18n'

export default function ThreadDetail() {
  const { colors } = useTheme()
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
  const { t } = useTranslation()
  const styles = useMemo(() => createStyles(colors), [colors])
  const insets = useSafeAreaInsets()
  const { id } = useLocalSearchParams<{ id: string }>()
  const [replies, setReplies] = useState<Reply[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (id) getReplies(id).then(setReplies).catch(() => {})
  }, [id])

  async function handleSend() {
    if (!input.trim() || !id) return
    setLoading(true)
    try {
      const reply = await postReply(id, input.trim())
      setReplies((prev) => [...prev, reply])
      setInput('')
    } catch {
      // handle error
    } finally {
      setLoading(false)
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: diffuse ? dt.colors.bg : colors.bg }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
          <Pressable onPress={() => router.back()} style={[styles.backBtn, diffuse && { backgroundColor: 'transparent', borderColor: dt.colors.line2 }]}>
            <Ionicons name="arrow-back" size={22} color={diffuse ? dt.colors.ink : colors.text} />
          </Pressable>
          <Text style={[styles.title, diffuse && { fontFamily: diffuseFont.display, color: dt.colors.ink }]}>{t('channelThreadDetail_title')}</Text>
          <View style={{ width: 40 }} />
        </View>

        <FlatList
          data={replies}
          renderItem={({ item }) => (
            <View style={[styles.replyBubble, diffuse && { backgroundColor: dt.colors.surface, borderColor: dt.colors.line }]}>
              <View style={styles.replyHeader}>
                <View style={[styles.replyAvatar, diffuse && { backgroundColor: 'transparent', borderWidth: 1, borderColor: dt.colors.line2 }]}>
                  <Text style={{ fontSize: 12 }}>{t('channelThreadDetail_avatarIcon')}</Text>
                </View>
                <Text style={[styles.replyAuthor, diffuse && { fontFamily: diffuseFont.bodySemiBold, color: dt.colors.ink }]}>{t('channelThreadDetail_memberFallback')}</Text>
                <Text style={[styles.replyTime, diffuse && { fontFamily: diffuseFont.mono, color: dt.colors.ink3, letterSpacing: 0.5 }]}>
                  {new Date(item.createdAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>
              <Text style={[styles.replyContent, diffuse && { fontFamily: diffuseFont.body, color: dt.colors.ink2 }]}>{item.content}</Text>
            </View>
          )}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={[styles.emptyText, diffuse && { fontFamily: diffuseFont.body, color: dt.colors.ink3 }]}>{t('channelThreadDetail_emptyText')}</Text>
            </View>
          }
        />

        <View style={[styles.inputBar, { paddingBottom: insets.bottom + 8 }, diffuse && { borderTopColor: dt.colors.line, backgroundColor: dt.colors.bg }]}>
          <TextInput
            style={[styles.input, diffuse && { backgroundColor: dt.colors.surface, borderColor: dt.colors.line, color: dt.colors.ink, fontFamily: diffuseFont.body }]}
            selectionColor={diffuse ? dt.colors.ink : brand.kids}
            placeholder={t('channelThreadDetail_replyPlaceholder')}
            placeholderTextColor={diffuse ? dt.colors.ink4 : colors.textMuted}
            value={input}
            onChangeText={setInput}
            multiline
          />
          <Pressable
            onPress={handleSend}
            disabled={loading || !input.trim()}
            style={[styles.sendBtn, diffuse && { backgroundColor: dt.colors.surface, borderWidth: 1, borderColor: dt.colors.line2 }, (!input.trim() || loading) && { opacity: 0.4 }]}
          >
            <Ionicons name="send" size={16} color={diffuse ? dt.colors.ink : colors.textInverse} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </View>
  )
}

const createStyles = (colors: ReturnType<typeof useTheme>['colors']) => StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing['2xl'],
    paddingBottom: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surfaceGlass,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  title: {
    ...typography.title,
  },
  list: {
    paddingHorizontal: spacing['2xl'],
    paddingBottom: 8,
  },
  replyBubble: {
    backgroundColor: colors.surfaceGlass,
    borderRadius: borderRadius.md,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  replyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  replyAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.surfaceRaised,
    alignItems: 'center',
    justifyContent: 'center',
  },
  replyAuthor: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
    flex: 1,
  },
  replyTime: {
    fontSize: 11,
    color: colors.textMuted,
  },
  replyContent: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  empty: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: colors.textMuted,
  },
  inputBar: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: spacing['2xl'],
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.bg,
  },
  input: {
    flex: 1,
    backgroundColor: colors.surfaceGlass,
    borderRadius: borderRadius.xl,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
    maxHeight: 80,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-end',
  },
})
