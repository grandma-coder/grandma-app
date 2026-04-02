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
import { pillars } from '../../lib/pillars'
import { useChildStore } from '../../store/useChildStore'
import { CosmicBackground } from '../../components/ui/CosmicBackground'
import { GlassCard } from '../../components/ui/GlassCard'
import { GrandmaBall } from '../../components/home/GrandmaBall'
import { colors, typography, spacing, borderRadius } from '../../constants/theme'
import type { PillarId, Pillar } from '../../types'

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
}

export default function Library() {
  const insets = useSafeAreaInsets()
  const child = useChildStore((s) => s.activeChild)
  const { pillarId, suggestion } = useLocalSearchParams<{ pillarId?: string; suggestion?: string }>()

  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState(suggestion ?? '')
  const [loading, setLoading] = useState(false)
  const flatListRef = useRef<FlatList>(null)

  useEffect(() => {
    if (!child) return
    supabase
      .from('chat_messages')
      .select('*')
      .eq('child_id', child.id)
      .order('created_at', { ascending: true })
      .limit(50)
      .then(({ data }) => {
        if (data) {
          setMessages(data.map((m: any) => ({ id: m.id, role: m.role, content: m.content })))
        }
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
      const reply = await callNana({ messages: allMessages, child, pillarId: pillarId as PillarId })

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
        <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleAssistant]}>
          <Text style={[styles.bubbleText, isUser && styles.bubbleTextUser]}>
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
        <Text style={styles.emptyTitle}>Guru Grandma</Text>
        <Text style={styles.emptySubtitle}>
          I'm not your doctor, dear — but I can share wisdom on pre-pregnancy, pregnancy, feeding, vaccines, emergencies, and so much more.
        </Text>

        {/* Knowledge Pillars */}
        <Text style={styles.pillarsLabel}>KNOWLEDGE PILLARS</Text>
        <View style={styles.pillarsGrid}>
          {pillars.map((pillar) => (
            <Pressable
              key={pillar.id}
              onPress={() => router.push(`/pillar/${pillar.id}`)}
              style={({ pressed }) => [
                styles.pillarChip,
                pressed && { opacity: 0.8 },
              ]}
            >
              <Text style={styles.pillarIcon}>{pillar.icon}</Text>
              <Text style={styles.pillarName}>{pillar.name}</Text>
            </Pressable>
          ))}
        </View>

        {/* Channels placeholder */}
        <Text style={styles.pillarsLabel}>COMMUNITY CHANNELS</Text>
        <GlassCard>
          <View style={styles.channelPlaceholder}>
            <Text style={{ fontSize: 28, marginBottom: 8 }}>💬</Text>
            <Text style={styles.channelTitle}>Coming Soon</Text>
            <Text style={styles.channelSubtitle}>
              Join channels for birth stories, breastfeeding support, recipes, and local meetups.
            </Text>
          </View>
        </GlassCard>
      </ScrollView>
    )
  }

  return (
    <CosmicBackground>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={90}
      >
        <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
          <Text style={styles.title}>Guru Grandma</Text>
          <Text style={styles.headerSubtitle}>Your parenting wisdom guide</Text>
        </View>

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
            style={styles.input}
            placeholder="Ask Grandma..."
            placeholderTextColor={colors.textTertiary}
            value={input}
            onChangeText={setInput}
            multiline
            returnKeyType="send"
            onSubmitEditing={send}
          />
          <Pressable
            onPress={send}
            disabled={loading || !input.trim()}
            style={[styles.sendButton, (!input.trim() || loading) && { opacity: 0.4 }]}
          >
            {loading ? (
              <ActivityIndicator size="small" color={colors.textOnAccent} />
            ) : (
              <Text style={styles.sendText}>Send</Text>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </CosmicBackground>
  )
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: spacing['2xl'],
    paddingBottom: 12,
  },
  title: {
    ...typography.heading,
    marginBottom: 2,
  },
  headerSubtitle: {
    ...typography.caption,
  },
  emptyScroll: {
    paddingHorizontal: spacing['2xl'],
    paddingBottom: 20,
    alignItems: 'center',
  },
  emptyTitle: {
    ...typography.title,
    marginBottom: 8,
  },
  emptySubtitle: {
    ...typography.bodySecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 28,
    paddingHorizontal: 10,
  },
  pillarsLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textTertiary,
    letterSpacing: 1.5,
    alignSelf: 'flex-start',
    marginBottom: 12,
    marginTop: 4,
  },
  pillarsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 24,
    width: '100%',
  },
  pillarChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.surfaceGlass,
    borderRadius: borderRadius.full,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pillarIcon: {
    fontSize: 16,
  },
  pillarName: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  channelPlaceholder: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  channelTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 4,
  },
  channelSubtitle: {
    fontSize: 13,
    color: colors.textTertiary,
    textAlign: 'center',
    lineHeight: 18,
  },
  messageList: {
    paddingHorizontal: spacing['2xl'],
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
    maxWidth: '80%',
    borderRadius: borderRadius.lg,
    padding: 12,
  },
  bubbleUser: {
    backgroundColor: colors.accent,
    borderBottomRightRadius: 4,
  },
  bubbleAssistant: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderBottomLeftRadius: 4,
  },
  bubbleText: {
    fontSize: 15,
    color: colors.text,
    lineHeight: 22,
  },
  bubbleTextUser: {
    color: colors.textOnAccent,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    paddingHorizontal: spacing['2xl'],
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
  },
  input: {
    flex: 1,
    backgroundColor: colors.surfaceGlass,
    borderRadius: borderRadius.xl,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    color: colors.text,
    maxHeight: 100,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sendButton: {
    backgroundColor: colors.accent,
    borderRadius: borderRadius.xl,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  sendText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textOnAccent,
  },
})
