import React, { useState, useRef, useEffect } from 'react'
import {
  View,
  Text,
  FlatList,
  TextInput,
  Pressable,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
} from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { supabase } from '../../lib/supabase'
import { callNana } from '../../lib/claude'
import { useChildStore } from '../../store/useChildStore'
import { useModeStore } from '../../store/useModeStore'
import { useJourneyStore } from '../../store/useJourneyStore'
import { getModeConfig } from '../../lib/modeConfig'
import { PaperCard } from '../../components/ui/PaperCard'
import { GrandmaBall } from '../../components/home/GrandmaBall'
import { useTheme, getModeColor } from '../../constants/theme'
import type { PillarId } from '../../types'

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
}

export default function Library() {
  const insets = useSafeAreaInsets()
  const { colors, font, radius, isDark } = useTheme()
  const child = useChildStore((s) => s.activeChild)
  const mode = useModeStore((s) => s.mode)
  const modeConfig = getModeConfig(mode)
  const modePillars = modeConfig.pillars
  const { pillarId, suggestion } = useLocalSearchParams<{ pillarId?: string; suggestion?: string }>()

  const weekNumber = useJourneyStore((s) => s.weekNumber)

  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState(suggestion ?? '')
  const [loading, setLoading] = useState(false)
  const flatListRef = useRef<FlatList>(null)

  const accent = getModeColor(mode, isDark)
  const subtitleCopy =
    mode === 'pre-pregnancy'
      ? 'Your conception guide'
      : mode === 'pregnancy'
        ? 'Your pregnancy companion'
        : 'Your parenting wisdom guide'

  useEffect(() => {
    if (!child) return
    supabase
      .from('chat_messages')
      .select('id, role, content')
      .eq('child_id', child.id)
      .order('created_at', { ascending: true })
      .limit(50)
      .then(({ data, error }) => {
        if (error) {
          console.warn('[library] failed to load chat history:', error.message)
          return
        }
        const rows = (data ?? []) as { id: string; role: ChatMessage['role']; content: string }[]
        setMessages(rows.map((m) => ({ id: m.id, role: m.role, content: m.content })))
      })
  }, [child?.id])

  async function send() {
    const text = input.trim()
    if (!text || loading) return

    const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', content: text }
    setMessages((prev) => [...prev, userMsg])
    setInput('')
    setLoading(true)

    try {
      if (child) {
        await supabase.from('chat_messages').insert({
          child_id: child.id,
          pillar_id: pillarId ?? null,
          role: 'user',
          content: text,
        })
      }

      const allMessages = [...messages, userMsg].map((m) => ({ role: m.role, content: m.content }))
      const reply = await callNana({ messages: allMessages, child, pillarId: pillarId as PillarId, mode, weekNumber })

      const assistantMsg: ChatMessage = { id: (Date.now() + 1).toString(), role: 'assistant', content: reply }
      setMessages((prev) => [...prev, assistantMsg])

      if (child) {
        await supabase.from('chat_messages').insert({
          child_id: child.id,
          pillar_id: pillarId ?? null,
          role: 'assistant',
          content: reply,
        })
      }
    } catch (e: any) {
      const errMsg: ChatMessage = { id: (Date.now() + 1).toString(), role: 'assistant', content: `Sorry dear, something went wrong: ${e.message}` }
      setMessages((prev) => [...prev, errMsg])
    } finally {
      setLoading(false)
    }
  }

  function renderMessage({ item }: { item: ChatMessage }) {
    const isUser = item.role === 'user'
    return (
      <View style={[styles.msgRow, isUser && styles.msgRowUser]}>
        <View
          style={[
            styles.bubble,
            isUser
              ? { backgroundColor: accent, borderBottomRightRadius: 4 }
              : { backgroundColor: colors.surface, borderTopLeftRadius: 4, borderWidth: 1, borderColor: colors.border },
          ]}
        >
          <Text
            style={[
              styles.bubbleText,
              { color: isUser ? colors.textInverse : colors.text, fontFamily: font.body },
            ]}
          >
            {item.content}
          </Text>
        </View>
      </View>
    )
  }

  function EmptyState() {
    return (
      <ScrollView
        contentContainerStyle={styles.emptyScroll}
        showsVerticalScrollIndicator={false}
      >
        <GrandmaBall onPress={() => {}} />
        <Text style={[styles.emptyTitle, { color: colors.text, fontFamily: font.display }]}>
          Guru Grandma
        </Text>
        <Text style={[styles.emptySubtitle, { color: colors.textMuted, fontFamily: font.body }]}>
          I'm not your doctor, dear — but I can share wisdom on pre-pregnancy, pregnancy, feeding, vaccines, emergencies, and so much more.
        </Text>

        {/* Knowledge Pillars — mode-specific */}
        <Text style={[styles.pillarsLabel, { color: colors.textMuted, fontFamily: font.bodySemiBold }]}>
          KNOWLEDGE PILLARS
        </Text>
        <View style={styles.pillarsGrid}>
          {modePillars.map((pillar) => (
            <Pressable
              key={pillar.id}
              onPress={() => router.push(`/pillar/${pillar.id}`)}
              style={({ pressed }) => [
                styles.pillarChip,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  borderRadius: radius.full,
                },
                pressed && { opacity: 0.85 },
              ]}
              accessibilityRole="button"
              accessibilityLabel={`Open ${pillar.name} pillar`}
            >
              <Text style={styles.pillarIcon}>{pillar.icon}</Text>
              <Text style={[styles.pillarName, { color: colors.text, fontFamily: font.bodySemiBold }]}>
                {pillar.name}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Channels placeholder */}
        <Text style={[styles.pillarsLabel, { color: colors.textMuted, fontFamily: font.bodySemiBold }]}>
          COMMUNITY CHANNELS
        </Text>
        <PaperCard radius={28} padding={20}>
          <View style={styles.channelPlaceholder}>
            <Text style={[styles.channelTitle, { color: colors.text, fontFamily: font.display }]}>
              Coming Soon
            </Text>
            <Text style={[styles.channelSubtitle, { color: colors.textMuted, fontFamily: font.body }]}>
              Join channels for birth stories, breastfeeding support, recipes, and local meetups.
            </Text>
          </View>
        </PaperCard>
      </ScrollView>
    )
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={90}
      >
        <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
          <View style={styles.headerRow}>
            <View>
              <Text style={[styles.title, { color: colors.text, fontFamily: font.display }]}>
                Guru{'\n'}
                <Text style={{ color: accent, fontStyle: 'italic' }}>Grandma</Text>
              </Text>
              <Text style={[styles.headerSubtitle, { color: colors.textMuted, fontFamily: font.bodySemiBold }]}>
                {subtitleCopy}
              </Text>
            </View>
            <View style={[styles.sparkleBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Ionicons name="sparkles" size={20} color={accent} />
            </View>
          </View>
        </View>

        {/* Chat persistence requires an active child (kids mode). When the
            user is on "All Kids" view we still allow chatting, but warn
            that the history won't save — otherwise the bug felt random
            ("why don't my messages stick?"). */}
        {mode === 'kids' && !child ? (
          <View style={{ marginHorizontal: 16, marginTop: 8, padding: 12, borderRadius: 12, backgroundColor: colors.surfaceRaised }}>
            <Text style={{ color: colors.textMuted, fontSize: 12, fontFamily: font.body }}>
              Pick a child to save chat history. This conversation will end when you leave the screen.
            </Text>
          </View>
        ) : null}

        {messages.length === 0 ? (
          <EmptyState />
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={renderMessage}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.messageList}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          />
        )}

        {/* Input bar */}
        <View style={[styles.inputBar, { paddingBottom: insets.bottom + 8 }]}>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                color: colors.text,
                fontFamily: font.body,
                borderRadius: radius.md,
              },
            ]}
            selectionColor={accent}
            placeholder="Ask Grandma..."
            placeholderTextColor={colors.textFaint}
            value={input}
            onChangeText={setInput}
            multiline
            returnKeyType="send"
            onSubmitEditing={send}
          />
          <Pressable
            onPress={send}
            disabled={loading || !input.trim()}
            style={[
              styles.sendButton,
              { backgroundColor: accent, borderRadius: radius.sm },
              (!input.trim() || loading) && { opacity: 0.4 },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Send message to Grandma"
          >
            {loading ? (
              <ActivityIndicator size="small" color={colors.textInverse} />
            ) : (
              <Ionicons name="arrow-up" size={20} color={colors.textInverse} />
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </View>
  )
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 32,
    paddingBottom: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  title: {
    fontSize: 28,
    fontWeight: '300',
    textTransform: 'uppercase',
    letterSpacing: -0.5,
    lineHeight: 32,
  },
  headerSubtitle: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 3,
    marginTop: 6,
  },
  sparkleBox: {
    width: 48,
    height: 48,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyScroll: {
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 20,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.5,
    marginTop: 24,
    marginBottom: 12,
  },
  emptySubtitle: {
    fontSize: 15,
    fontWeight: '400',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 40,
    maxWidth: 320,
  },
  pillarsLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 3,
    textTransform: 'uppercase',
    alignSelf: 'flex-start',
    marginBottom: 16,
    paddingLeft: 4,
  },
  pillarsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 40,
    width: '100%',
  },
  pillarChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderWidth: 1,
  },
  pillarIcon: {
    fontSize: 16,
  },
  pillarName: {
    fontSize: 14,
    fontWeight: '500',
  },
  channelPlaceholder: {
    paddingVertical: 0,
  },
  channelTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 6,
  },
  channelSubtitle: {
    fontSize: 13,
    lineHeight: 19,
  },
  messageList: {
    paddingHorizontal: 24,
    paddingBottom: 8,
  },
  msgRow: {
    marginBottom: 12,
    alignItems: 'flex-start',
  },
  msgRowUser: {
    alignItems: 'flex-end',
  },
  bubble: {
    maxWidth: '85%',
    borderRadius: 24,
    padding: 16,
  },
  bubbleText: {
    fontSize: 15,
    fontWeight: '500',
    lineHeight: 22,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 8,
  },
  input: {
    flex: 1,
    height: 52,
    paddingHorizontal: 20,
    paddingRight: 52,
    fontSize: 14,
    fontWeight: '500',
    borderWidth: 1,
  },
  sendButton: {
    width: 40,
    height: 40,
    marginLeft: -48,
    justifyContent: 'center',
    alignItems: 'center',
  },
})
