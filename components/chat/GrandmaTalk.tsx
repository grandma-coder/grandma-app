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
  HelpCircle,
  Mic,
  Share2,
  Moon as MoonIcon,
} from 'lucide-react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme, brand, stickers as stickerPalette } from '../../constants/theme'
import { Burst, Heart, Flower } from '../ui/Stickers'
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

// ─── Grandma Orb — concentric rings + moon + status text ─────────────────

interface GrandmaOrbProps {
  status: string
  isActive: boolean
  size?: number
}

function GrandmaOrb({ status, isActive, size = 260 }: GrandmaOrbProps) {
  const { colors, font, isDark } = useTheme()
  const breathe = useRef(new Animated.Value(0.94)).current

  useEffect(() => {
    if (!isActive) {
      breathe.setValue(0.94)
      return
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(breathe, { toValue: 1, duration: 1600, useNativeDriver: true }),
        Animated.timing(breathe, { toValue: 0.94, duration: 1600, useNativeDriver: true }),
      ])
    )
    loop.start()
    return () => loop.stop()
  }, [isActive])

  const ringOuter = isDark ? 'rgba(200,182,232,0.22)' : '#E3D8F2'
  const ringMid = isDark ? 'rgba(200,182,232,0.38)' : '#D0BFEC'
  const ringInner = isDark ? 'rgba(200,182,232,0.58)' : '#C8B6E8'
  const core = isDark ? '#141313' : '#141313'

  const s = size
  return (
    <Animated.View style={[orbStyles.root, { width: s, height: s, transform: [{ scale: breathe }] }]}>
      <View style={[orbStyles.ring, { width: s, height: s, borderRadius: s / 2, backgroundColor: ringOuter }]} />
      <View style={[orbStyles.ring, { width: s * 0.82, height: s * 0.82, borderRadius: (s * 0.82) / 2, backgroundColor: ringMid }]} />
      <View style={[orbStyles.ring, { width: s * 0.66, height: s * 0.66, borderRadius: (s * 0.66) / 2, backgroundColor: ringInner }]} />
      <View style={[orbStyles.core, { width: s * 0.52, height: s * 0.52, borderRadius: (s * 0.52) / 2, backgroundColor: core }]}>
        <MoonIcon size={28} color={stickerPalette.yellow} fill={stickerPalette.yellow} strokeWidth={1.5} />
        <Text style={[orbStyles.status, { color: '#F5EDDC', fontFamily: font.italic }]}>{status}</Text>
      </View>
    </Animated.View>
  )
}

const orbStyles = StyleSheet.create({
  root: { alignItems: 'center', justifyContent: 'center' },
  ring: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  core: { alignItems: 'center', justifyContent: 'center', gap: 8 },
  status: { fontSize: 16, letterSpacing: -0.3 },
})

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
  const { colors, radius, font, isDark } = useTheme()
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
  const inputRef = useRef<TextInput>(null)
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

  // Find the index of the last assistant message (for inverted "latest" styling)
  const lastAssistantIndex = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'assistant') return i
    }
    return -1
  }, [messages])

  const renderMessage = useCallback(
    ({ item, index }: { item: ChatMessage; index: number }) => {
      const isUser = item.role === 'user'
      const isTyping = item.role === 'assistant' && item.content === '' && isStreaming
      const isLatestGrandma = !isUser && index === lastAssistantIndex

      const cardBg = isLatestGrandma
        ? (isDark ? colors.text : '#141313')
        : colors.surface
      const textColor = isLatestGrandma ? colors.textInverse : colors.text
      const labelColor = isLatestGrandma ? 'rgba(245,237,220,0.55)' : colors.textMuted

      const timeAgo = isUser ? 'A MOMENT AGO' : ''
      const label = isUser ? `YOU, ${timeAgo}` : 'GRANDMA'

      return (
        <View style={[styles.cardWrap, isLatestGrandma && styles.cardWrapLatest]}>
          {isLatestGrandma && (
            <View style={styles.cardSticker} pointerEvents="none">
              <Flower size={72} petal={stickerPalette.lilac} center={stickerPalette.yellow} />
            </View>
          )}
          <View
            style={[
              styles.card,
              {
                backgroundColor: cardBg,
                borderColor: isLatestGrandma ? 'transparent' : colors.borderLight,
                borderWidth: isLatestGrandma ? 0 : 1,
              },
            ]}
          >
            <Text style={[styles.cardLabel, { color: labelColor, fontFamily: font.bodySemiBold }]}>
              {label}
            </Text>
            {isTyping ? (
              <View style={styles.typingRow}>
                <Animated.View style={[styles.dot, { backgroundColor: labelColor, opacity: pulseAnim }]} />
                <Animated.View style={[styles.dot, { backgroundColor: labelColor, opacity: pulseAnim, transform: [{ scale: pulseAnim }] }]} />
                <Animated.View style={[styles.dot, { backgroundColor: labelColor, opacity: pulseAnim }]} />
                <Text style={[styles.typingText, { color: textColor, fontFamily: font.italic }]}>{thinkingMessage}</Text>
              </View>
            ) : isUser ? (
              <Text style={[styles.cardBody, { color: textColor, fontFamily: font.body }]}>
                {item.content}
              </Text>
            ) : (
              <FormattedText content={item.content} color={textColor} />
            )}
          </View>
        </View>
      )
    },
    [colors, font, isStreaming, thinkingMessage, pulseAnim, lastAssistantIndex, isDark]
  )

  // Show the AI follow-up suggestions (after Grandma replies)
  const showAiSuggestions = !isStreaming && aiSuggestions.length > 0
  // Show the initial suggestions only before any user messages
  const showInitialSuggestions = !hasUserMessages && !isStreaming

  const orbStatus = isStreaming ? thinkingMessage : 'listening…'

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 10, backgroundColor: colors.bg }]}>
        <Pressable
          onPress={() => router.back()}
          style={[styles.headerCircleBtn, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}
          hitSlop={8}
        >
          <X size={18} color={colors.text} strokeWidth={1.75} />
        </Pressable>
        <View style={styles.headerTitleBlock}>
          <Text style={[styles.headerTitle, { color: colors.text, fontFamily: font.display }]}>
            grandma{' '}
            <Text style={[styles.headerTitleItalic, { fontFamily: font.italic }]}>talk</Text>
          </Text>
          {allBehaviors.length > 1 && (
            <Pressable
              onPress={() => setShowBehaviorDropdown((v) => !v)}
              style={[styles.behaviorBadge, { backgroundColor: modeColor + '22', borderColor: modeColor + '44' }]}
              hitSlop={6}
            >
              <Text style={[styles.behaviorBadgeLabel, { color: modeColor, fontFamily: font.bodySemiBold }]}>
                {getBehaviorLabel(chatBehavior)}
              </Text>
              <ChevronDown size={11} color={modeColor} strokeWidth={2.5} />
            </Pressable>
          )}
        </View>
        <Pressable
          onPress={() => setShowHistory(true)}
          style={[styles.headerCircleBtn, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}
          hitSlop={8}
        >
          <Share2 size={17} color={colors.text} strokeWidth={1.75} />
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
          ListHeaderComponent={
            <View style={styles.heroWrap}>
              <View style={[styles.stickerTopLeft]} pointerEvents="none">
                <Burst size={64} fill={stickerPalette.yellow} points={10} wobble={0.18} />
              </View>
              <View style={[styles.stickerTopRight]} pointerEvents="none">
                <Heart size={52} fill={stickerPalette.pink} />
              </View>
              <GrandmaOrb status={orbStatus} isActive={isStreaming || !hasUserMessages} />
            </View>
          }
        />

        {/* Initial suggestion chips (before first message) */}
        {showInitialSuggestions && (
          <View style={styles.suggestionsWrapper}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.suggestionsRow}
            >
              {suggestions.slice(0, 4).map((s, i) => (
                <Pressable
                  key={i}
                  onPress={() => sendText(s.prompt)}
                  style={({ pressed }) => [
                    styles.chip,
                    {
                      backgroundColor: pressed ? colors.surfaceRaised : colors.surface,
                      borderColor: colors.borderLight,
                    },
                  ]}
                >
                  <Text style={[styles.chipLabel, { color: colors.text, fontFamily: font.body }]}>
                    {s.label}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        )}

        {/* AI follow-up suggestions (after Grandma replies) */}
        {showAiSuggestions && (
          <View style={styles.suggestionsWrapper}>
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
                    styles.chip,
                    {
                      backgroundColor: pressed ? colors.surfaceRaised : colors.surface,
                      borderColor: colors.borderLight,
                    },
                  ]}
                >
                  <Text style={[styles.chipLabel, { color: colors.text, fontFamily: font.body }]} numberOfLines={1}>
                    {s}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Input bar — voice-first "Tap to talk" pill + mic */}
        <View style={[styles.inputBar, { paddingBottom: Math.max(insets.bottom, 4), backgroundColor: colors.bg }]}>
          <View
            style={[
              styles.input,
              {
                backgroundColor: colors.surface,
                borderColor: colors.borderLight,
                borderRadius: radius.full,
              },
            ]}
          >
            <TextInput
              ref={inputRef}
              value={input}
              onChangeText={setInput}
              placeholder="Tap to talk to grandma…"
              placeholderTextColor={colors.textMuted}
              multiline
              maxLength={2000}
              style={[
                styles.inputField,
                { color: colors.text, fontFamily: font.body },
              ]}
              onSubmitEditing={handleSend}
              returnKeyType="send"
              blurOnSubmit={false}
            />
            {input.trim().length > 0 && (
              <Pressable onPress={handleSend} hitSlop={6} style={styles.inlineSendBtn}>
                <Send size={16} color={colors.primary} strokeWidth={2} />
              </Pressable>
            )}
          </View>
          <Pressable
            onPress={() => inputRef.current?.focus()}
            style={({ pressed }) => [
              styles.micBtn,
              {
                backgroundColor: isDark ? colors.text : '#141313',
                borderRadius: radius.full,
              },
              pressed && { opacity: 0.82 },
            ]}
          >
            <Mic size={20} color={isDark ? colors.bg : '#F5EDDC'} strokeWidth={2} fill={isDark ? colors.bg : '#F5EDDC'} />
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

  // Header — circular buttons flanking serif title
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  headerCircleBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  headerTitleBlock: { alignItems: 'center', gap: 4 },
  headerTitle: { fontSize: 22, letterSpacing: -0.4 },
  headerTitleItalic: { fontSize: 22, letterSpacing: -0.2 },

  // Behavior badge (in header, under title)
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
  },

  contextCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  contextText: { flex: 1, fontSize: 13, fontWeight: '600' },

  chatArea: { flex: 1 },
  messageList: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 8, gap: 12 },

  // Hero orb area with stickers
  heroWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
    position: 'relative',
  },
  stickerTopLeft: {
    position: 'absolute',
    left: 10,
    top: 18,
    transform: [{ rotate: '-8deg' }],
    zIndex: 1,
  },
  stickerTopRight: {
    position: 'absolute',
    right: 18,
    top: 32,
    transform: [{ rotate: '12deg' }],
    zIndex: 1,
  },

  // Message cards — labeled rectangles (not bubbles)
  cardWrap: { position: 'relative' },
  cardWrapLatest: { paddingRight: 20 },
  card: {
    borderRadius: 18,
    paddingHorizontal: 18,
    paddingVertical: 14,
    gap: 8,
  },
  cardLabel: {
    fontSize: 10,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  cardBody: { fontSize: 15, fontWeight: '400', lineHeight: 23 },
  cardSticker: {
    position: 'absolute',
    right: -18,
    bottom: -18,
    zIndex: 2,
    transform: [{ rotate: '18deg' }],
  },

  // Thinking animation
  typingRow: { flexDirection: 'row', gap: 6, alignItems: 'center', flexWrap: 'wrap' },
  dot: { width: 6, height: 6, borderRadius: 3 },
  typingText: { fontSize: 14, marginLeft: 4 },

  // Suggestions — pill chips
  suggestionsWrapper: {
    paddingTop: 8,
    paddingBottom: 8,
  },
  suggestionsRow: { paddingHorizontal: 16, gap: 8 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 999,
    borderWidth: 1,
  },
  chipLabel: { fontSize: 14, fontWeight: '500' },

  // Input bar — "Tap to talk" pill + mic
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  input: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    paddingHorizontal: 20,
    paddingVertical: 4,
    minHeight: 50,
  },
  inputField: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 10,
    maxHeight: 120,
  },
  inlineSendBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  micBtn: {
    width: 50,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
