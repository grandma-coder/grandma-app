/**
 * E1 — Grandma Talk Chat Interface
 *
 * Streaming chat with context-aware AI.
 * User bubbles right, Grandma bubbles left with avatar.
 * Context card at top when opened from insight/analytics.
 */

import { useState, useRef, useCallback, useEffect } from 'react'
import {
  View,
  Text,
  TextInput,
  Pressable,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  ActivityIndicator,
} from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import {
  Send,
  X,
  Sparkles,
  Lightbulb,
} from 'lucide-react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme, brand } from '../../constants/theme'
import { useModeStore } from '../../store/useModeStore'
import { useBehaviorStore } from '../../store/useBehaviorStore'
import { sendGrandmaMessage, type ChatMessage } from '../../lib/grandmaChat'

// ─── Generate unique ID ────────────────────────────────────────────────────

let _msgId = 0
function nextId() {
  return `msg_${Date.now()}_${++_msgId}`
}

// ─── Greeting by behavior ──────────────────────────────────────────────────

function getGreeting(behavior: string, insightContext?: string): string {
  if (insightContext) {
    return `Hello dear! I see you have a question about: "${insightContext}". I would love to help you with that. What would you like to know?`
  }
  switch (behavior) {
    case 'pre-pregnancy':
      return 'Hello, dear! How is your cycle journey going? I am here to help with anything — fertility questions, nutrition, or just to chat.'
    case 'pregnancy':
      return 'Hello, mama! How are you and the little one feeling today? Ask me anything about your pregnancy.'
    default:
      return 'Hello, dear! How are the little ones doing? I am here to help with feeding, sleep, health — anything at all.'
  }
}

// ─── Main Component ────────────────────────────────────────────────────────

export function GrandmaTalk() {
  const { colors, radius } = useTheme()
  const insets = useSafeAreaInsets()
  const mode = useModeStore((s) => s.mode)
  const allBehaviors = useBehaviorStore((s) => s.enrolledBehaviors)
  const params = useLocalSearchParams<{ insightContext?: string; screen?: string }>()

  const insightContext = params.insightContext ?? undefined
  const screen = params.screen ?? undefined

  const listRef = useRef<FlatList>(null)

  // Messages state
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    const greeting = getGreeting(mode, insightContext)
    return [{
      id: nextId(),
      role: 'assistant' as const,
      content: greeting,
    }]
  })

  const [input, setInput] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)

  // Scroll to bottom on new message
  useEffect(() => {
    setTimeout(() => {
      listRef.current?.scrollToEnd({ animated: true })
    }, 100)
  }, [messages])

  const handleSend = useCallback(async () => {
    const text = input.trim()
    if (!text || isStreaming) return

    // Add user message
    const userMsg: ChatMessage = { id: nextId(), role: 'user', content: text }
    setMessages((prev) => [...prev, userMsg])
    setInput('')
    setIsStreaming(true)

    // Build message history for API
    const apiMessages = [...messages, userMsg]
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .map((m) => ({ role: m.role, content: m.content }))

    const context = {
      behavior: mode,
      allBehaviors,
      screen,
      insight: insightContext,
    }

    // Add typing placeholder
    const assistantId = nextId()
    setMessages((prev) => [...prev, { id: assistantId, role: 'assistant', content: '' }])

    try {
      const reply = await sendGrandmaMessage(apiMessages, context)
      setMessages((prev) =>
        prev.map((m) => (m.id === assistantId ? { ...m, content: reply } : m))
      )
    } catch {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? { ...m, content: 'Oh dear, I seem to be having trouble connecting. Please try again in a moment.' }
            : m
        )
      )
    } finally {
      setIsStreaming(false)
    }
  }, [input, messages, isStreaming, mode, insightContext, screen])

  const renderMessage = useCallback(
    ({ item }: { item: ChatMessage }) => {
      const isUser = item.role === 'user'
      const isTyping = item.role === 'assistant' && item.content === '' && isStreaming

      return (
        <View style={[styles.msgRow, isUser && styles.msgRowUser]}>
          {/* Grandma avatar */}
          {!isUser && (
            <View style={[styles.avatar, { backgroundColor: colors.primaryTint }]}>
              <Sparkles size={16} color={colors.primary} strokeWidth={2} />
            </View>
          )}

          <View
            style={[
              styles.bubble,
              isUser
                ? [styles.userBubble, { backgroundColor: colors.primary, borderRadius: radius.xl }]
                : [styles.assistantBubble, { backgroundColor: colors.surface, borderRadius: radius.xl }],
            ]}
          >
            {isTyping ? (
              <View style={styles.typingRow}>
                <ActivityIndicator size="small" color={colors.textMuted} />
                <Text style={[styles.typingText, { color: colors.textMuted }]}>
                  Grandma is thinking...
                </Text>
              </View>
            ) : (
              <Text
                style={[
                  styles.msgText,
                  { color: isUser ? '#FFFFFF' : colors.text },
                ]}
              >
                {item.content}
              </Text>
            )}
          </View>
        </View>
      )
    },
    [colors, radius, isStreaming]
  )

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8, backgroundColor: colors.bg, borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} style={styles.headerBtn}>
          <X size={24} color={colors.text} />
        </Pressable>
        <View style={styles.headerCenter}>
          <Sparkles size={18} color={colors.primary} strokeWidth={2} />
          <Text style={[styles.headerTitle, { color: colors.text }]}>Grandma</Text>
        </View>
        <View style={styles.headerBtn} />
      </View>

      {/* Multi-behavior awareness line */}
      {allBehaviors.length > 1 && (
        <View style={[styles.awarenessLine, { borderBottomColor: colors.border }]}>
          <Text style={[styles.awarenessText, { color: colors.textMuted }]}>
            Grandma knows about your{' '}
            {allBehaviors.map((b, i) => {
              const label = b === 'pre-pregnancy' ? 'cycle' : b === 'pregnancy' ? 'pregnancy' : 'kids'
              const color = b === 'pre-pregnancy' ? brand.prePregnancy : b === 'pregnancy' ? brand.pregnancy : brand.kids
              return (
                <Text key={b}>
                  {i > 0 && (i === allBehaviors.length - 1 ? ' and ' : ', ')}
                  <Text style={{ color, fontWeight: '700' }}>{label}</Text>
                </Text>
              )
            })}
          </Text>
        </View>
      )}

      {/* Context card (when opened from insight) */}
      {insightContext && (
        <View style={[styles.contextCard, { backgroundColor: colors.primaryTint, borderBottomColor: colors.border }]}>
          <Lightbulb size={16} color={colors.primary} strokeWidth={2} />
          <Text style={[styles.contextText, { color: colors.primary }]} numberOfLines={2}>
            {insightContext}
          </Text>
        </View>
      )}

      {/* Messages */}
      <KeyboardAvoidingView
        style={styles.chatArea}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(m) => m.id}
          renderItem={renderMessage}
          contentContainerStyle={styles.messageList}
          showsVerticalScrollIndicator={false}
        />

        {/* Input bar */}
        <View style={[styles.inputBar, { paddingBottom: insets.bottom + 8, backgroundColor: colors.bg, borderTopColor: colors.border }]}>
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder="Ask Grandma anything..."
            placeholderTextColor={colors.textMuted}
            multiline
            maxLength={2000}
            style={[
              styles.input,
              {
                color: colors.text,
                backgroundColor: colors.surface,
                borderColor: colors.border,
                borderRadius: radius.xl,
              },
            ]}
            onSubmitEditing={handleSend}
            returnKeyType="send"
            blurOnSubmit={false}
          />
          <Pressable
            onPress={handleSend}
            disabled={!input.trim() || isStreaming}
            style={({ pressed }) => [
              styles.sendBtn,
              {
                backgroundColor: input.trim() && !isStreaming ? colors.primary : colors.surfaceRaised,
                borderRadius: radius.full,
              },
              pressed && { opacity: 0.8 },
            ]}
          >
            {isStreaming ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Send size={18} color={input.trim() ? '#FFFFFF' : colors.textMuted} strokeWidth={2} />
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </View>
  )
}

// ─── Styles ────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1 },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  headerBtn: { width: 40, alignItems: 'center' },
  headerCenter: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  headerTitle: { fontSize: 18, fontWeight: '700' },

  // Awareness line
  awarenessLine: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderBottomWidth: 1,
    alignItems: 'center',
  },
  awarenessText: {
    fontSize: 11,
    fontWeight: '500',
    textAlign: 'center',
  },

  // Context
  contextCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  contextText: { flex: 1, fontSize: 13, fontWeight: '600' },

  // Chat area
  chatArea: { flex: 1 },
  messageList: { paddingHorizontal: 16, paddingVertical: 12, gap: 12 },

  // Messages
  msgRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  msgRowUser: { flexDirection: 'row-reverse' },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  bubble: { maxWidth: '78%', paddingHorizontal: 16, paddingVertical: 12 },
  userBubble: {},
  assistantBubble: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  msgText: { fontSize: 15, fontWeight: '400', lineHeight: 22 },
  typingRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  typingText: { fontSize: 13, fontWeight: '500', fontStyle: 'italic' },

  // Input
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 8,
    borderTopWidth: 1,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    fontWeight: '500',
    maxHeight: 120,
    minHeight: 44,
  },
  sendBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
