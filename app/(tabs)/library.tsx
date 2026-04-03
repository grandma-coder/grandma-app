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
import { CosmicBackground } from '../../components/ui/CosmicBackground'
import { GlassCard } from '../../components/ui/GlassCard'
import { GrandmaBall } from '../../components/home/GrandmaBall'
import { colors, THEME_COLORS, typography, spacing, borderRadius } from '../../constants/theme'
import type { PillarId, Pillar } from '../../types'

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
}

export default function Library() {
  const insets = useSafeAreaInsets()
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

        {/* Knowledge Pillars — mode-specific */}
        <Text style={styles.pillarsLabel}>KNOWLEDGE PILLARS</Text>
        <View style={styles.pillarsGrid}>
          {modePillars.map((pillar) => (
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
        <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.title}>Guru{'\n'}<Text style={{ color: THEME_COLORS.yellow, fontStyle: 'italic' }}>Grandma</Text></Text>
              <Text style={styles.headerSubtitle}>
            {mode === 'pre-pregnancy' ? 'Your conception guide' : mode === 'pregnancy' ? 'Your pregnancy companion' : 'Your parenting wisdom guide'}
          </Text>
            </View>
            <View style={styles.sparkleBox}>
              <Ionicons name="sparkles" size={20} color={THEME_COLORS.yellow} />
            </View>
          </View>
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
            selectionColor={colors.neon.blue}
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
              <ActivityIndicator size="small" color="#1A1030" />
            ) : (
              <Ionicons name="arrow-up" size={20} color="#1A1030" />
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </CosmicBackground>
  )
}

const styles = StyleSheet.create({
  // matches HTML: header.shrink-0.pt-14.px-8.flex.justify-between.items-start
  header: {
    paddingHorizontal: 32,
    paddingBottom: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  // matches HTML: text-2xl font-light tracking-tight leading-tight uppercase + text-4xl font-bold neon-yellow italic
  title: {
    fontSize: 24,
    fontWeight: '300',
    color: '#FFFFFF',
    textTransform: 'uppercase',
    letterSpacing: -0.5,
    lineHeight: 28,
  },
  // matches HTML: text-sm text-purple-200/60 mt-1 uppercase tracking-[0.2em]
  headerSubtitle: {
    fontSize: 14,
    fontWeight: '400',
    color: 'rgba(200,180,255,0.6)',
    textTransform: 'uppercase',
    letterSpacing: 3,
    marginTop: 4,
  },
  // matches HTML: w-12 h-12 rounded-2xl bg-white/5 border border-white/10
  sparkleBox: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // matches HTML: px-6 pt-10 pb-4 space-y-10
  emptyScroll: {
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 20,
    alignItems: 'center',
  },
  // matches HTML: text-2xl font-bold mb-3 tracking-tight
  emptyTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.5,
    marginBottom: 12,
  },
  // matches HTML: text-purple-100/70 text-[15px] leading-relaxed max-w-[280px]
  emptySubtitle: {
    fontSize: 15,
    fontWeight: '400',
    color: 'rgba(200,180,255,0.7)',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 40,
    maxWidth: 280,
  },
  // matches HTML: text-[11px] font-bold tracking-[0.2em] text-white/40 uppercase
  pillarsLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.4)',
    letterSpacing: 3,
    textTransform: 'uppercase',
    alignSelf: 'flex-start',
    marginBottom: 16,
    paddingLeft: 4,
  },
  // matches HTML: flex flex-wrap gap-2.5
  pillarsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 40,
    width: '100%',
  },
  // matches HTML: glass-pill px-5 py-2.5 rounded-full flex items-center gap-2 text-sm font-medium
  pillarChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 999,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  pillarIcon: {
    fontSize: 16,
  },
  pillarName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  // matches HTML: glass-pill rounded-3xl p-6 border-dashed
  channelPlaceholder: {
    paddingVertical: 0,
  },
  // matches HTML: text-lg font-semibold
  channelTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  // matches HTML: text-xs text-white/40
  channelSubtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.4)',
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
    padding: 20,
  },
  bubbleUser: {
    backgroundColor: THEME_COLORS.yellow,
    borderBottomRightRadius: 4,
    shadowColor: THEME_COLORS.yellow,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
  },
  bubbleAssistant: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderTopLeftRadius: 4,
  },
  bubbleText: {
    fontSize: 16,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.9)',
    lineHeight: 24,
  },
  bubbleTextUser: {
    color: '#1A1030',
    fontWeight: '700',
  },
  // matches HTML: px-6 pb-6 → glass-pill rounded-2xl p-2 pl-5
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 8,
  },
  // matches HTML: bg-transparent flex-1 text-sm, inside glass-pill container
  input: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    height: 52,
    paddingHorizontal: 20,
    paddingRight: 52,
    fontSize: 14,
    fontWeight: '500',
    color: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  // matches HTML: bg-neon-yellow text-[#1A1030] w-10 h-10 rounded-xl
  sendButton: {
    width: 40,
    height: 40,
    backgroundColor: THEME_COLORS.yellow,
    borderRadius: 12,
    marginLeft: -48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#1A1030',
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
})
