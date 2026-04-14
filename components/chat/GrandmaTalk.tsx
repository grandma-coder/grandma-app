/**
 * E1 — Grandma Talk Chat Interface
 *
 * Streaming chat with context-aware AI.
 * User bubbles right, Grandma bubbles left with avatar.
 * Context card at top when opened from insight/analytics.
 * Smart suggestion chips based on mode + child data.
 * Follow-up AI suggestions after each Grandma reply.
 * Behavior selector when user has multiple journeys.
 * Child selector when user has multiple kids.
 * Funny rotating thinking messages.
 * Full chat history — sessions persist across app launches.
 */

import { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import {
  View,
  Text,
  TextInput,
  Pressable,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  ScrollView,
  Animated,
  Keyboard,
} from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import {
  Send,
  X,
  Sparkles,
  Lightbulb,
  History,
  ArrowLeft,
  Trash2,
  Plus,
  MessageCircle,
  ChevronDown,
  Check,
} from 'lucide-react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme, brand } from '../../constants/theme'
import { useModeStore } from '../../store/useModeStore'
import { useBehaviorStore, type Behavior } from '../../store/useBehaviorStore'
import { useChildStore } from '../../store/useChildStore'
import { useGrandmaHistoryStore, type ChatSession } from '../../store/useGrandmaHistoryStore'
import { sendGrandmaMessage, type ChatMessage } from '../../lib/grandmaChat'
import { ChildPills, formatChildAge } from '../ui/ChildPills'

// ─── Lightweight Markdown Renderer ────────────────────────────────────────

interface StyledSegment {
  text: string
  bold?: boolean
  italic?: boolean
}

/** Parse a single line into styled segments (handles **bold** and *italic*) */
function parseInlineMarkdown(line: string): StyledSegment[] {
  const segments: StyledSegment[] = []
  // Match **bold** or *italic* — bold first to avoid conflict
  const regex = /(\*\*(.+?)\*\*|\*(.+?)\*)/g
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = regex.exec(line)) !== null) {
    // Text before the match
    if (match.index > lastIndex) {
      segments.push({ text: line.slice(lastIndex, match.index) })
    }
    if (match[2]) {
      // **bold**
      segments.push({ text: match[2], bold: true })
    } else if (match[3]) {
      // *italic*
      segments.push({ text: match[3], italic: true })
    }
    lastIndex = match.index + match[0].length
  }
  // Remaining text
  if (lastIndex < line.length) {
    segments.push({ text: line.slice(lastIndex) })
  }
  if (segments.length === 0) {
    segments.push({ text: line })
  }
  return segments
}

function FormattedText({ content, color }: { content: string; color: string }) {
  // Split into paragraphs (double newlines) then lines
  const paragraphs = content.split(/\n\n+/)

  return (
    <View style={mdStyles.container}>
      {paragraphs.map((para, pi) => {
        const lines = para.split('\n')
        return (
          <View key={pi} style={pi > 0 ? mdStyles.paragraph : undefined}>
            {lines.map((line, li) => {
              // Detect bullet lines
              const bulletMatch = line.match(/^[\-•]\s+(.*)/)
              const numberedMatch = line.match(/^(\d+)\.\s+(.*)/)
              const textContent = bulletMatch ? bulletMatch[1] : numberedMatch ? numberedMatch[2] : line
              const segments = parseInlineMarkdown(textContent)

              if (bulletMatch || numberedMatch) {
                return (
                  <View key={li} style={mdStyles.bulletRow}>
                    <Text style={[mdStyles.bullet, { color }]}>
                      {bulletMatch ? '•' : `${numberedMatch![1]}.`}
                    </Text>
                    <Text style={[mdStyles.text, { color, flex: 1 }]}>
                      {segments.map((seg, si) => (
                        <Text
                          key={si}
                          style={[
                            seg.bold && mdStyles.bold,
                            seg.italic && mdStyles.italic,
                          ]}
                        >
                          {seg.text}
                        </Text>
                      ))}
                    </Text>
                  </View>
                )
              }

              return (
                <Text key={li} style={[mdStyles.text, { color }]}>
                  {segments.map((seg, si) => (
                    <Text
                      key={si}
                      style={[
                        seg.bold && mdStyles.bold,
                        seg.italic && mdStyles.italic,
                      ]}
                    >
                      {seg.text}
                    </Text>
                  ))}
                  {li < lines.length - 1 ? '\n' : ''}
                </Text>
              )
            })}
          </View>
        )
      })}
    </View>
  )
}

const mdStyles = StyleSheet.create({
  container: {},
  paragraph: { marginTop: 12 },
  text: { fontSize: 15, fontWeight: '400', lineHeight: 23 },
  bold: { fontWeight: '700' },
  italic: { fontStyle: 'italic' },
  bulletRow: { flexDirection: 'row', paddingLeft: 4, marginTop: 2 },
  bullet: { width: 18, fontSize: 15, lineHeight: 23 },
})

// ─── Helpers ───────────────────────────────────────────────────────────────

let _msgId = 0
function nextId() {
  return `msg_${Date.now()}_${++_msgId}`
}

function newSessionId() {
  return `session_${Date.now()}`
}


/** Derive a display title from the first user message in a session. */
function deriveTitle(messages: ChatMessage[]): string {
  const first = messages.find((m) => m.role === 'user')
  if (!first) return 'New conversation'
  return first.content.length > 48
    ? first.content.slice(0, 48).trimEnd() + '…'
    : first.content
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86_400_000)
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays} days ago`
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

// ─── Funny thinking messages ──────────────────────────────────────────────

const THINKING_MESSAGES = [
  'Flipping through my recipe book…',
  'Asking my knitting circle…',
  'Checking my old journals…',
  'Let me put on my reading glasses…',
  'Brewing some wisdom tea…',
  'Consulting the ancestors…',
  'Digging through decades of experience…',
  'Warming up the good advice oven…',
  'Untangling the yarn of knowledge…',
  'Polishing my grandmother crystals…',
  'Stirring the pot of wisdom…',
  'Pulling out the big recipe book…',
  'Calling my wise friend Google Scholar…',
  'Dusting off the old family wisdom…',
  'Cross-referencing with 40 years of babies…',
  'Checking what the elders say…',
  'Rummaging through my brain pantry…',
  'Heating up the advice casserole…',
  'Leafing through my notes from the doula days…',
  'Channeling my inner encyclopedia…',
]

function useRotatingThinkingMessage(isThinking: boolean) {
  const [index, setIndex] = useState(() => Math.floor(Math.random() * THINKING_MESSAGES.length))
  const pulseAnim = useRef(new Animated.Value(0.4)).current

  useEffect(() => {
    if (!isThinking) return

    // Pick a new random message on start
    setIndex(Math.floor(Math.random() * THINKING_MESSAGES.length))

    // Rotate every 3 seconds
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % THINKING_MESSAGES.length)
    }, 3000)

    // Pulse animation for dots
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0.4, duration: 600, useNativeDriver: true }),
      ])
    )
    pulse.start()

    return () => {
      clearInterval(interval)
      pulse.stop()
    }
  }, [isThinking])

  return { message: THINKING_MESSAGES[index], pulseAnim }
}

// ─── Initial suggestion chips ─────────────────────────────────────────────

interface Suggestion {
  label: string
  prompt: string
  emoji: string
}

function getSuggestions(
  behaviors: string[],
  mode: string,
  childName?: string,
  childAge?: string,
): Suggestion[] {
  const name = childName ?? 'my baby'
  const age = childAge ?? 'their age'

  const kidsSuggestions: Suggestion[] = [
    { emoji: '🍼', label: 'Feeding tips', prompt: `What are the best feeding practices for a ${age}?` },
    { emoji: '😴', label: 'Sleep routine', prompt: `How do I build a healthy sleep routine for ${name}?` },
    { emoji: '💉', label: 'Vaccine schedule', prompt: `What vaccines should a ${age} get?` },
    { emoji: '🌱', label: 'Growth & milestones', prompt: `What milestones should I expect from a ${age}?` },
    { emoji: '🤒', label: 'Fever guidance', prompt: `When should I worry about a fever in a ${age}?` },
    { emoji: '🥣', label: 'Introducing solids', prompt: `How do I safely introduce solid foods to ${name}?` },
  ]
  const pregnancySuggestions: Suggestion[] = [
    { emoji: '🥗', label: 'What to eat', prompt: 'What foods are best to eat during pregnancy?' },
    { emoji: '😖', label: 'Symptom check', prompt: 'What pregnancy symptoms should I watch out for?' },
    { emoji: '🛌', label: 'Better sleep', prompt: 'How can I sleep better during pregnancy?' },
    { emoji: '🏥', label: 'Birth prep', prompt: 'How do I prepare for labor and birth?' },
    { emoji: '🤱', label: 'Breastfeeding', prompt: 'What should I know about breastfeeding before the baby arrives?' },
    { emoji: '💆', label: 'Managing stress', prompt: 'How do I manage stress and anxiety during pregnancy?' },
  ]
  const prePregSuggestions: Suggestion[] = [
    { emoji: '🥦', label: 'Fertility foods', prompt: 'What foods boost fertility?' },
    { emoji: '📅', label: 'Cycle tracking', prompt: 'How do I track my cycle to find my fertile window?' },
    { emoji: '💊', label: 'Pre-natal vitamins', prompt: 'Which vitamins should I start before getting pregnant?' },
    { emoji: '🧘', label: 'Stress & fertility', prompt: 'How does stress affect my ability to conceive?' },
    { emoji: '🩺', label: 'Health checks', prompt: 'What health checks should I do before trying to conceive?' },
    { emoji: '👫', label: 'Partner prep', prompt: 'How can my partner also prepare for pregnancy?' },
  ]

  const pool: Suggestion[] = []
  if (behaviors.includes('kids')) pool.push(...kidsSuggestions)
  if (behaviors.includes('pregnancy')) pool.push(...pregnancySuggestions)
  if (behaviors.includes('pre-pregnancy')) pool.push(...prePregSuggestions)
  if (pool.length === 0) {
    if (mode === 'pre-pregnancy') pool.push(...prePregSuggestions)
    else if (mode === 'pregnancy') pool.push(...pregnancySuggestions)
    else pool.push(...kidsSuggestions)
  }
  const offset = (childName?.charCodeAt(0) ?? 0) % 3
  return [...pool.slice(offset), ...pool.slice(0, offset)]
}

// ─── Greeting ──────────────────────────────────────────────────────────────

const GREETINGS_KIDS = [
  (name: string) => `Hey there! How are the little ones doing today? I'm here for anything — ${name ? name + ', ' : ''}feeding, sleep, those mystery rashes, you name it.`,
  (name: string) => `Well hello, mama! What's on your mind today? Whether it's ${name ? name + "'s schedule" : 'baby questions'} or just needing someone to talk to — I'm all ears.`,
  (name: string) => `Good to see you! Tell me what's going on with ${name ? name : 'the kiddos'}. No question is too small or too weird, trust me — I've heard them all!`,
  (name: string) => `Hi sweetheart! Ready to tackle whatever parenthood threw at you today. ${name ? `How's ${name} doing?` : "How are the little ones?"} Let's chat.`,
]

const GREETINGS_PREGNANCY = [
  () => 'Hello, mama-to-be! How are you and that little one feeling today? I have decades of wisdom ready for whatever you need.',
  () => "Hey there, gorgeous! Pregnancy is a wild ride and I'm right here with you. What's on your mind?",
  () => "Well hello! Whether it's weird cravings, mysterious symptoms, or just needing someone who gets it — I'm your gal. What's up?",
  () => "Hi there, mama! Every week brings something new, doesn't it? Tell me what you're curious about today.",
]

const GREETINGS_PREPREG = [
  () => "Hello, dear! Your fertility journey matters so much to me. What can I help with today — cycle questions, nutrition, emotional stuff?",
  () => "Hey love! Preparing for pregnancy is one of the most exciting times. What's on your mind? I'm here for all of it.",
  () => "Hi there! Whether it's cycle tracking, vitamins, or just needing a pep talk — I'm ready. What would you like to know?",
  () => "Hello! The trying-to-conceive journey can be a rollercoaster. I'm right here with you. What can I help with?",
]

function getGreeting(behavior: string, childName?: string, insightContext?: string): string {
  if (insightContext) {
    const openers = [
      `Oh, I see you have a question about "${insightContext}" — let's dig into that! What would you like to know?`,
      `Ah, "${insightContext}" — great topic! I have a lot to say about this. What specifically would you like to explore?`,
      `"${insightContext}" — now THAT'S something I can help with. Fire away, dear!`,
    ]
    return openers[Math.floor(Math.random() * openers.length)]
  }
  const name = childName ?? ''
  switch (behavior) {
    case 'pre-pregnancy':
      return GREETINGS_PREPREG[Math.floor(Math.random() * GREETINGS_PREPREG.length)]()
    case 'pregnancy':
      return GREETINGS_PREGNANCY[Math.floor(Math.random() * GREETINGS_PREGNANCY.length)]()
    default:
      return GREETINGS_KIDS[Math.floor(Math.random() * GREETINGS_KIDS.length)](name)
  }
}

// ─── Behavior config ──────────────────────────────────────────────────────

function getBehaviorLabel(b: string) {
  return b === 'pre-pregnancy' ? 'Cycle' : b === 'pregnancy' ? 'Pregnancy' : 'Kids'
}

function getBehaviorColor(b: string) {
  return b === 'pre-pregnancy' ? brand.prePregnancy : b === 'pregnancy' ? brand.pregnancy : brand.kids
}

function getBehaviorEmoji(b: string) {
  return b === 'pre-pregnancy' ? '🌸' : b === 'pregnancy' ? '🤰' : '👶'
}

// ─── History Panel ─────────────────────────────────────────────────────────

interface HistoryPanelProps {
  onClose: () => void
  onSelect: (session: ChatSession) => void
  onNewChat: () => void
}

function HistoryPanel({ onClose, onSelect, onNewChat }: HistoryPanelProps) {
  const { colors } = useTheme()
  const insets = useSafeAreaInsets()
  const sessions = useGrandmaHistoryStore((s) => s.sessions)
  const deleteSession = useGrandmaHistoryStore((s) => s.deleteSession)

  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.bg, zIndex: 10 }]}>
      {/* History header */}
      <View style={[
        histStyles.header,
        { paddingTop: insets.top + 10, borderBottomColor: colors.border, backgroundColor: colors.bg }
      ]}>
        <Pressable onPress={onClose} style={histStyles.headerBtn} hitSlop={8}>
          <ArrowLeft size={22} color={colors.textSecondary} />
        </Pressable>
        <Text style={[histStyles.headerTitle, { color: colors.text }]}>Past conversations</Text>
        <Pressable onPress={onNewChat} style={histStyles.headerBtn} hitSlop={8}>
          <Plus size={22} color={colors.primary} />
        </Pressable>
      </View>

      {sessions.length === 0 ? (
        <View style={histStyles.empty}>
          <MessageCircle size={48} color={colors.textMuted} strokeWidth={1.5} />
          <Text style={[histStyles.emptyTitle, { color: colors.text }]}>No past chats yet</Text>
          <Text style={[histStyles.emptySubtitle, { color: colors.textMuted }]}>
            Your conversations with Grandma will appear here
          </Text>
          <Pressable
            onPress={onNewChat}
            style={[histStyles.newChatBtn, { backgroundColor: colors.primary }]}
          >
            <Plus size={16} color="#FFF" strokeWidth={2.5} />
            <Text style={histStyles.newChatBtnLabel}>Start a conversation</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={sessions}
          keyExtractor={(s) => s.id}
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: insets.bottom + 16, gap: 10 }}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <Pressable
              onPress={onNewChat}
              style={[histStyles.newSessionRow, { backgroundColor: colors.surface, borderColor: colors.border }]}
            >
              <View style={[histStyles.newSessionIcon, { backgroundColor: colors.primaryTint }]}>
                <Plus size={18} color={colors.primary} strokeWidth={2.5} />
              </View>
              <Text style={[histStyles.newSessionLabel, { color: colors.primary }]}>New conversation</Text>
            </Pressable>
          }
          renderItem={({ item }) => (
            <Pressable
              onPress={() => onSelect(item)}
              style={({ pressed }) => [
                histStyles.sessionCard,
                {
                  backgroundColor: pressed ? colors.surfaceRaised : colors.surface,
                  borderColor: colors.border,
                },
              ]}
            >
              <View style={histStyles.sessionCardLeft}>
                <View style={[histStyles.sessionAvatar, { backgroundColor: colors.primaryTint }]}>
                  <Sparkles size={14} color={colors.primary} strokeWidth={2.5} />
                </View>
                <View style={histStyles.sessionMeta}>
                  <Text style={[histStyles.sessionTitle, { color: colors.text }]} numberOfLines={2}>
                    {item.title}
                  </Text>
                  <View style={histStyles.sessionTags}>
                    <Text style={[histStyles.sessionDate, { color: colors.textMuted }]}>
                      {formatDate(item.createdAt)}
                    </Text>
                    <View style={[histStyles.sessionBadge, { backgroundColor: getBehaviorColor(item.behavior) + '22' }]}>
                      <Text style={[histStyles.sessionBadgeText, { color: getBehaviorColor(item.behavior) }]}>
                        {getBehaviorLabel(item.behavior)}
                      </Text>
                    </View>
                    {item.childName && (
                      <View style={[histStyles.sessionBadge, { backgroundColor: colors.surfaceRaised }]}>
                        <Text style={[histStyles.sessionBadgeText, { color: colors.textSecondary }]}>
                          {item.childName}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              </View>
              <Pressable
                onPress={() => deleteSession(item.id)}
                hitSlop={8}
                style={histStyles.deleteBtn}
              >
                <Trash2 size={16} color={colors.textMuted} strokeWidth={1.5} />
              </Pressable>
            </Pressable>
          )}
        />
      )}
    </View>
  )
}

const histStyles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  headerBtn: { width: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '700', letterSpacing: -0.3 },

  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingHorizontal: 40 },
  emptyTitle: { fontSize: 18, fontWeight: '700', textAlign: 'center' },
  emptySubtitle: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
  newChatBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 999,
    marginTop: 8,
  },
  newChatBtnLabel: { color: '#FFF', fontWeight: '700', fontSize: 15 },

  newSessionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    marginBottom: 4,
  },
  newSessionIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  newSessionLabel: { fontSize: 15, fontWeight: '700' },

  sessionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    gap: 12,
  },
  sessionCardLeft: { flex: 1, flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  sessionAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginTop: 2,
  },
  sessionMeta: { flex: 1, gap: 6 },
  sessionTitle: { fontSize: 14, fontWeight: '600', lineHeight: 20 },
  sessionTags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, alignItems: 'center' },
  sessionDate: { fontSize: 11, fontWeight: '500' },
  sessionBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 },
  sessionBadgeText: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.3 },
  deleteBtn: { padding: 6 },
})

// ─── Main Component ────────────────────────────────────────────────────────

export function GrandmaTalk() {
  const { colors, radius } = useTheme()
  const insets = useSafeAreaInsets()
  const mode = useModeStore((s) => s.mode)
  const allBehaviors = useBehaviorStore((s) => s.enrolledBehaviors)
  const switchBehavior = useBehaviorStore((s) => s.switchTo)
  const children = useChildStore((s) => s.children)
  const activeChild = useChildStore((s) => s.activeChild)
  const setActiveChild = useChildStore((s) => s.setActiveChild)
  const upsertSession = useGrandmaHistoryStore((s) => s.upsertSession)
  const params = useLocalSearchParams<{ insightContext?: string; screen?: string }>()

  const insightContext = params.insightContext ?? undefined
  const screen = params.screen ?? undefined

  const childName = activeChild?.name
  const childAge = activeChild?.birthDate ? formatChildAge(activeChild.birthDate) : undefined

  // Chat behavior — tracks which behavior is active in THIS chat session
  const [chatBehavior, setChatBehavior] = useState<string>(mode)

  const listRef = useRef<FlatList>(null)
  const sessionIdRef = useRef(newSessionId())

  const [messages, setMessages] = useState<ChatMessage[]>(() => [{
    id: nextId(),
    role: 'assistant' as const,
    content: getGreeting(mode, childName, insightContext),
  }])

  const [input, setInput] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([])
  const [showBehaviorDropdown, setShowBehaviorDropdown] = useState(false)

  const hasUserMessages = messages.some((m) => m.role === 'user')
  const suggestions = getSuggestions(allBehaviors, chatBehavior, childName, childAge)
  const modeColor = getBehaviorColor(chatBehavior)

  // Thinking message hook
  const { message: thinkingMessage, pulseAnim } = useRotatingThinkingMessage(isStreaming)

  // Scroll to bottom on new message
  useEffect(() => {
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100)
  }, [messages])

  // Scroll to bottom when keyboard appears
  useEffect(() => {
    const event = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow'
    const sub = Keyboard.addListener(event, () => {
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 150)
    })
    return () => sub.remove()
  }, [])

  // Persist session whenever messages change (only after user sends something)
  useEffect(() => {
    if (!hasUserMessages) return
    const session: ChatSession = {
      id: sessionIdRef.current,
      title: deriveTitle(messages),
      createdAt: new Date().toISOString(),
      behavior: chatBehavior,
      childName,
      messages,
    }
    upsertSession(session)
  }, [messages])

  const startNewChat = useCallback(() => {
    sessionIdRef.current = newSessionId()
    setMessages([{
      id: nextId(),
      role: 'assistant' as const,
      content: getGreeting(chatBehavior, childName, insightContext),
    }])
    setInput('')
    setAiSuggestions([])
    setShowHistory(false)
  }, [chatBehavior, childName, insightContext])

  const loadSession = useCallback((session: ChatSession) => {
    sessionIdRef.current = session.id
    setMessages(session.messages)
    setInput('')
    setAiSuggestions([])
    setShowHistory(false)
  }, [])

  // Switch behavior inside chat
  const handleBehaviorSwitch = useCallback((b: Behavior) => {
    setChatBehavior(b)
    switchBehavior(b)
  }, [switchBehavior])

  // Switch child inside chat
  const handleChildSwitch = useCallback((child: { id: string; name: string; birthDate: string }) => {
    const full = children.find((c) => c.id === child.id)
    if (full) setActiveChild(full)
  }, [children, setActiveChild])

  const sendText = useCallback(async (text: string) => {
    if (!text.trim() || isStreaming) return

    const userMsg: ChatMessage = { id: nextId(), role: 'user', content: text }
    setMessages((prev) => [...prev, userMsg])
    setInput('')
    setAiSuggestions([])
    setIsStreaming(true)

    const apiMessages = [...messages, userMsg]
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .map((m) => ({ role: m.role, content: m.content }))

    const context = {
      behavior: chatBehavior,
      allBehaviors,
      screen,
      insight: insightContext,
      activeChildId: activeChild?.id,
    }
    const assistantId = nextId()
    setMessages((prev) => [...prev, { id: assistantId, role: 'assistant', content: '' }])

    try {
      const { reply, suggestions: newSuggestions } = await sendGrandmaMessage(apiMessages, context)
      setMessages((prev) =>
        prev.map((m) => (m.id === assistantId ? { ...m, content: reply } : m))
      )
      setAiSuggestions(newSuggestions)
    } catch {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? { ...m, content: 'Oh dear, something went wrong on my end. Give me a moment and try again — I promise I won\'t forget what we were talking about!' }
            : m
        )
      )
    } finally {
      setIsStreaming(false)
    }
  }, [input, messages, isStreaming, chatBehavior, allBehaviors, insightContext, screen, activeChild])

  const handleSend = useCallback(() => sendText(input.trim()), [input, sendText])

  // Auto-send insight context so Grandma immediately analyzes
  const insightAutoSentRef = useRef(false)
  useEffect(() => {
    if (insightContext && !insightAutoSentRef.current && !isStreaming) {
      insightAutoSentRef.current = true
      const autoMessage = `Here are the analytics:\n\n${insightContext}\n\nPlease analyze this and give me your thoughts on what needs attention and what's going well.`
      setTimeout(() => sendText(autoMessage), 600)
    }
  }, [insightContext, sendText, isStreaming])

  const renderMessage = useCallback(
    ({ item }: { item: ChatMessage }) => {
      const isUser = item.role === 'user'
      const isTyping = item.role === 'assistant' && item.content === '' && isStreaming

      return (
        <View style={[styles.msgRow, isUser && styles.msgRowUser]}>
          {!isUser && (
            <View style={[styles.avatarWrap, { shadowColor: colors.primary }]}>
              <View style={[styles.avatar, { backgroundColor: colors.primaryTint }]}>
                <Sparkles size={15} color={colors.primary} strokeWidth={2.5} />
              </View>
            </View>
          )}
          <View
            style={[
              styles.bubble,
              isUser
                ? [styles.userBubble, { backgroundColor: colors.primary }]
                : [styles.assistantBubble, { backgroundColor: colors.surface, borderColor: colors.border }],
            ]}
          >
            {isTyping ? (
              <View style={styles.typingContainer}>
                <View style={styles.typingRow}>
                  <Animated.View style={[styles.dot, { backgroundColor: modeColor, opacity: pulseAnim }]} />
                  <Animated.View style={[styles.dot, { backgroundColor: modeColor, opacity: pulseAnim, transform: [{ scale: pulseAnim }] }]} />
                  <Animated.View style={[styles.dot, { backgroundColor: modeColor, opacity: pulseAnim }]} />
                </View>
                <Text style={[styles.typingText, { color: colors.textSecondary }]}>{thinkingMessage}</Text>
              </View>
            ) : isUser ? (
              <Text style={[styles.msgText, { color: '#FFFFFF' }]}>
                {item.content}
              </Text>
            ) : (
              <FormattedText content={item.content} color={colors.text} />
            )}
          </View>
        </View>
      )
    },
    [colors, isStreaming, thinkingMessage, pulseAnim, modeColor]
  )

  // Show the AI follow-up suggestions (after Grandma replies)
  const showAiSuggestions = !isStreaming && aiSuggestions.length > 0
  // Show the initial suggestions only before any user messages
  const showInitialSuggestions = !hasUserMessages && !isStreaming

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 10, backgroundColor: colors.bg, borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} style={styles.headerBtn} hitSlop={8}>
          <X size={22} color={colors.textSecondary} />
        </Pressable>
        <View style={styles.headerCenter}>
          <View style={[styles.headerAvatarRing, { borderColor: modeColor + '55' }]}>
            <View style={[styles.headerAvatar, { backgroundColor: colors.primaryTint }]}>
              <Sparkles size={14} color={colors.primary} strokeWidth={2.5} />
            </View>
          </View>
          <View>
            <View style={styles.headerTitleRow}>
              <Text style={[styles.headerTitle, { color: colors.text }]}>Grandma</Text>
              {allBehaviors.length > 1 && (
                <Pressable
                  onPress={() => setShowBehaviorDropdown((v) => !v)}
                  style={[styles.behaviorBadge, { backgroundColor: modeColor + '20', borderColor: modeColor + '44' }]}
                  hitSlop={6}
                >
                  <Text style={[styles.behaviorBadgeLabel, { color: modeColor }]}>
                    {getBehaviorEmoji(chatBehavior)} {getBehaviorLabel(chatBehavior)}
                  </Text>
                  <ChevronDown size={11} color={modeColor} strokeWidth={2.5} />
                </Pressable>
              )}
            </View>
            <Text style={[styles.headerSubtitle, { color: colors.textMuted }]}>Always here for you</Text>
          </View>
        </View>
        <Pressable onPress={() => setShowHistory(true)} style={styles.headerBtn} hitSlop={8}>
          <History size={21} color={colors.textSecondary} strokeWidth={1.75} />
        </Pressable>
      </View>

      {/* Child selector row (only in kids mode with multiple children) */}
      {children.length > 1 && chatBehavior === 'kids' && (
        <View style={[styles.childSelectorRow, { borderBottomColor: colors.border }]}>
          <ChildPills
            children={children}
            activeChildId={activeChild?.id}
            onSelect={handleChildSwitch}
          />
        </View>
      )}

      {/* Context card (when opened from insight) */}
      {insightContext && (
        <View style={[styles.contextCard, { backgroundColor: colors.primaryTint, borderBottomColor: colors.border }]}>
          <Lightbulb size={15} color={colors.primary} strokeWidth={2} />
          <Text style={[styles.contextText, { color: colors.primary }]} numberOfLines={2}>
            {insightContext}
          </Text>
        </View>
      )}

      {/* Messages + input */}
      <KeyboardAvoidingView
        style={styles.chatArea}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top + 60 : 0}
      >
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(m) => m.id}
          renderItem={renderMessage}
          contentContainerStyle={styles.messageList}
          showsVerticalScrollIndicator={false}
        />

        {/* Initial suggestion chips (before first message) */}
        {showInitialSuggestions && (
          <View style={[styles.suggestionsWrapper, { borderTopColor: colors.border }]}>
            <Text style={[styles.suggestionsLabel, { color: colors.textMuted }]}>Try asking about</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.suggestionsRow}
            >
              {suggestions.map((s, i) => (
                <Pressable
                  key={i}
                  onPress={() => sendText(s.prompt)}
                  style={({ pressed }) => [
                    styles.chip,
                    {
                      backgroundColor: pressed ? colors.surfaceRaised : colors.surface,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <Text style={styles.chipEmoji}>{s.emoji}</Text>
                  <Text style={[styles.chipLabel, { color: colors.text }]}>{s.label}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        )}

        {/* AI follow-up suggestions (after Grandma replies) */}
        {showAiSuggestions && (
          <View style={[styles.suggestionsWrapper, { borderTopColor: colors.border }]}>
            <View style={styles.aiSuggestionsHeader}>
              <Sparkles size={11} color={modeColor} strokeWidth={2.5} />
              <Text style={[styles.suggestionsLabel, { color: colors.textMuted, marginBottom: 0, paddingHorizontal: 0 }]}>
                Keep exploring
              </Text>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.suggestionsRow}
            >
              {aiSuggestions.map((s, i) => (
                <Pressable
                  key={i}
                  onPress={() => sendText(s)}
                  style={({ pressed }) => [
                    styles.aiChip,
                    {
                      backgroundColor: pressed ? modeColor + '20' : modeColor + '10',
                      borderColor: modeColor + '30',
                    },
                  ]}
                >
                  <Text style={[styles.aiChipLabel, { color: colors.text }]} numberOfLines={2}>
                    {s}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Input bar */}
        <View style={[styles.inputBar, { paddingBottom: Math.max(insets.bottom, 4), backgroundColor: colors.bg, borderTopColor: colors.border }]}>
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder="Ask Grandma anything…"
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
                shadowColor: input.trim() && !isStreaming ? colors.primary : 'transparent',
              },
              pressed && { opacity: 0.8 },
            ]}
          >
            {isStreaming ? (
              <Sparkles size={18} color={modeColor} strokeWidth={2} />
            ) : (
              <Send size={18} color={input.trim() ? '#FFFFFF' : colors.textMuted} strokeWidth={2} />
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>

      {/* Behavior dropdown overlay */}
      {showBehaviorDropdown && (
        <Pressable
          style={[StyleSheet.absoluteFill, { zIndex: 20 }]}
          onPress={() => setShowBehaviorDropdown(false)}
        >
          <View style={[
            styles.dropdown,
            {
              top: insets.top + 58,
              backgroundColor: colors.surface,
              borderColor: colors.border,
              shadowColor: '#000',
            },
          ]}>
            {allBehaviors.map((b) => {
              const isActive = b === chatBehavior
              const color = getBehaviorColor(b)
              return (
                <Pressable
                  key={b}
                  onPress={() => {
                    handleBehaviorSwitch(b)
                    setShowBehaviorDropdown(false)
                  }}
                  style={({ pressed }) => [
                    styles.dropdownItem,
                    isActive && { backgroundColor: color + '12' },
                    pressed && { backgroundColor: color + '18' },
                  ]}
                >
                  <Text style={styles.dropdownEmoji}>{getBehaviorEmoji(b)}</Text>
                  <Text style={[
                    styles.dropdownLabel,
                    { color: isActive ? color : colors.text },
                    isActive && { fontWeight: '700' },
                  ]}>
                    {getBehaviorLabel(b)}
                  </Text>
                  {isActive && <Check size={15} color={color} strokeWidth={2.5} />}
                </Pressable>
              )
            })}
          </View>
        </Pressable>
      )}

      {/* History overlay */}
      {showHistory && (
        <HistoryPanel
          onClose={() => setShowHistory(false)}
          onSelect={loadSession}
          onNewChat={startNewChat}
        />
      )}
    </View>
  )
}

// ─── Styles ────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  headerBtn: { width: 40, alignItems: 'center', justifyContent: 'center' },
  headerCenter: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerAvatarRing: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontSize: 16, fontWeight: '700', letterSpacing: -0.3 },
  headerTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerSubtitle: { fontSize: 11, fontWeight: '500', marginTop: 1 },

  // Behavior badge (in header, next to title)
  behaviorBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    borderWidth: 1,
  },
  behaviorBadgeLabel: { fontSize: 11, fontWeight: '700' },

  // Behavior dropdown
  dropdown: {
    position: 'absolute',
    left: 16,
    right: 16,
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    zIndex: 50,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 10,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  dropdownEmoji: { fontSize: 16 },
  dropdownLabel: { flex: 1, fontSize: 15, fontWeight: '500' },

  // Child selector row
  childSelectorRow: {
    paddingVertical: 8,
    borderBottomWidth: 1,
  },

  contextCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  contextText: { flex: 1, fontSize: 13, fontWeight: '600' },

  chatArea: { flex: 1 },
  messageList: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8, gap: 14 },

  msgRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 10 },
  msgRowUser: { flexDirection: 'row-reverse' },
  avatarWrap: {
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 4,
  },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  bubble: { maxWidth: '78%', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 20 },
  userBubble: {},
  assistantBubble: { borderWidth: 1 },
  msgText: { fontSize: 15, fontWeight: '400', lineHeight: 23 },

  // Thinking animation
  typingContainer: { gap: 6 },
  typingRow: { flexDirection: 'row', gap: 5, alignItems: 'center' },
  dot: { width: 7, height: 7, borderRadius: 4 },
  typingText: { fontSize: 13, fontWeight: '500', fontStyle: 'italic' },

  // Suggestions
  suggestionsWrapper: {
    paddingTop: 10,
    paddingBottom: 6,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  suggestionsLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  suggestionsRow: { paddingHorizontal: 16, gap: 8 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
    borderWidth: 1,
  },
  chipEmoji: { fontSize: 14 },
  chipLabel: { fontSize: 13, fontWeight: '600' },

  // AI follow-up suggestions
  aiSuggestionsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  aiChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
    borderWidth: 1,
    maxWidth: 220,
  },
  aiChipLabel: { fontSize: 13, fontWeight: '500', lineHeight: 18 },

  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 10,
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
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
  },
})
