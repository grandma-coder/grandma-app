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
  MessagesSquare,
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

// ─── Orb state-driven messages ────────────────────────────────────────────

export type OrbState = 'idle-empty' | 'idle-ready' | 'typing' | 'thinking'

// Shown before user has sent anything — invite them to start
const IDLE_EMPTY_MESSAGES = [
  'ask me anything…',
  "I'm all ears…",
  "what's on your mind?",
  'tell me, dear…',
  "don't be shy…",
  'I\'m here, honey…',
  'got a question?',
  'talk to grandma…',
]

// Shown after a reply — waiting for next message
const IDLE_READY_MESSAGES = [
  'what else?',
  "anything else, love?",
  "I'm still here…",
  'keep going, dear…',
  'more questions?',
  'ready when you are…',
]

// Shown while user is actively typing
const TYPING_MESSAGES = [
  'listening…',
  'go on, dear…',
  "I'm listening…",
  'take your time…',
  'mm-hmm…',
  'tell me more…',
]

// Funny thinking messages while Grandma composes a reply
const THINKING_MESSAGES = [
  'flipping through my recipe book…',
  'asking my knitting circle…',
  'checking my old journals…',
  'let me put on my reading glasses…',
  'brewing some wisdom tea…',
  'consulting the ancestors…',
  'digging through decades of experience…',
  'warming up the good advice oven…',
  'untangling the yarn of knowledge…',
  'polishing my grandmother crystals…',
  'stirring the pot of wisdom…',
  'pulling out the big recipe book…',
  'dusting off the old family wisdom…',
  'cross-referencing 40 years of babies…',
  'checking what the elders say…',
  'rummaging through my brain pantry…',
  'heating up the advice casserole…',
  'leafing through my doula notes…',
  'channeling my inner encyclopedia…',
]

function messagePoolFor(state: OrbState): string[] {
  switch (state) {
    case 'idle-empty': return IDLE_EMPTY_MESSAGES
    case 'idle-ready': return IDLE_READY_MESSAGES
    case 'typing': return TYPING_MESSAGES
    case 'thinking': return THINKING_MESSAGES
  }
}

function useOrbMessage(state: OrbState) {
  const [index, setIndex] = useState(() => Math.floor(Math.random() * 6))
  const pulseAnim = useRef(new Animated.Value(0.4)).current

  // Rotate interval tuned per state: snappier for active states
  const interval = state === 'thinking' ? 2600 : state === 'typing' ? 2200 : 3400

  useEffect(() => {
    // Pick a new random starter when state changes
    const pool = messagePoolFor(state)
    setIndex(Math.floor(Math.random() * pool.length))

    const id = setInterval(() => {
      setIndex((prev) => (prev + 1) % messagePoolFor(state).length)
    }, interval)

    // Pulse dots (used for thinking state typing indicator)
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0.4, duration: 600, useNativeDriver: true }),
      ])
    )
    pulse.start()

    return () => {
      clearInterval(id)
      pulse.stop()
    }
  }, [state, interval])

  const pool = messagePoolFor(state)
  return { message: pool[index % pool.length], pulseAnim }
}

// ─── Animated stickers ──────────────────────────────────────────────────

/** Slow rotation loop (like the sun spinning). */
function useRotateAnim(duration = 18000, reverse = false) {
  const v = useRef(new Animated.Value(0)).current
  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(v, { toValue: 1, duration, useNativeDriver: true, isInteraction: false })
    )
    loop.start()
    return () => loop.stop()
  }, [duration])
  return v.interpolate({
    inputRange: [0, 1],
    outputRange: reverse ? ['0deg', '-360deg'] : ['0deg', '360deg'],
  })
}

/** Heartbeat pulse — scale 1 → 1.12 → 1 with a rest, looping. */
function useHeartbeatAnim() {
  const v = useRef(new Animated.Value(1)).current
  useEffect(() => {
    const beat = Animated.sequence([
      Animated.timing(v, { toValue: 1.15, duration: 140, useNativeDriver: true }),
      Animated.timing(v, { toValue: 1.0, duration: 180, useNativeDriver: true }),
      Animated.timing(v, { toValue: 1.12, duration: 140, useNativeDriver: true }),
      Animated.timing(v, { toValue: 1.0, duration: 180, useNativeDriver: true }),
      Animated.delay(900),
    ])
    const loop = Animated.loop(beat)
    loop.start()
    return () => loop.stop()
  }, [])
  return v
}

/** Gentle sway — rotate between two angles with easing. */
function useSwayAnim(minDeg = -8, maxDeg = 14, duration = 2400) {
  const v = useRef(new Animated.Value(0)).current
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(v, { toValue: 1, duration, useNativeDriver: true }),
        Animated.timing(v, { toValue: 0, duration, useNativeDriver: true }),
      ])
    )
    loop.start()
    return () => loop.stop()
  }, [duration])
  return v.interpolate({ inputRange: [0, 1], outputRange: [`${minDeg}deg`, `${maxDeg}deg`] })
}

// ─── Animated sticker wrappers ──────────────────────────────────────────

function SpinningSun() {
  const rotate = useRotateAnim(22000)
  return (
    <Animated.View style={[styles.stickerTopLeft, { transform: [{ rotate }] }]} pointerEvents="none">
      <Burst size={64} fill={stickerPalette.yellow} points={10} wobble={0.18} />
    </Animated.View>
  )
}

function BeatingHeart() {
  const scale = useHeartbeatAnim()
  const sway = useSwayAnim(6, 16, 2800)
  return (
    <Animated.View
      style={[styles.stickerTopRight, { transform: [{ rotate: sway }, { scale }] }]}
      pointerEvents="none"
    >
      <Heart size={52} fill={stickerPalette.pink} />
    </Animated.View>
  )
}

function SwayingFlower() {
  const sway = useSwayAnim(-12, 22, 2200)
  return (
    <Animated.View style={[styles.cardSticker, { transform: [{ rotate: sway }] }]} pointerEvents="none">
      <Flower size={72} petal={stickerPalette.lilac} center={stickerPalette.yellow} />
    </Animated.View>
  )
}

// ─── Grandma Orb — concentric rings + moon + status text ─────────────────

interface GrandmaOrbProps {
  status: string
  state: OrbState
  size?: number
}

function GrandmaOrb({ status, state, size = 260 }: GrandmaOrbProps) {
  const { font, isDark } = useTheme()
  const breathe = useRef(new Animated.Value(0.94)).current

  // Motion tuned per state:
  //  idle-empty → slow gentle breath (patient invitation)
  //  idle-ready → slow breath (relaxed waiting)
  //  typing     → medium breath (alert, engaged)
  //  thinking   → faster, larger swell (active processing)
  const motion = {
    'idle-empty': { duration: 2200, min: 0.93, max: 1.0 },
    'idle-ready': { duration: 2000, min: 0.94, max: 1.0 },
    'typing':     { duration: 1300, min: 0.95, max: 1.02 },
    'thinking':   { duration: 900,  min: 0.92, max: 1.04 },
  }[state]

  useEffect(() => {
    breathe.setValue(motion.min)
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(breathe, { toValue: motion.max, duration: motion.duration, useNativeDriver: true }),
        Animated.timing(breathe, { toValue: motion.min, duration: motion.duration, useNativeDriver: true }),
      ])
    )
    loop.start()
    return () => loop.stop()
  }, [state])

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

const GREETINGS_KIDS_SINGLE = [
  (name: string) => `Hey there! How's ${name || 'the little one'} doing today? I'm here for anything — feeding, sleep, mystery rashes, you name it.`,
  (name: string) => `Well hello, mama! What's going on with ${name || 'baby'}? I'm all ears.`,
  (name: string) => `Good to see you! Tell me what's happening with ${name || 'the kiddo'}. No question is too small — trust me, I've heard them all.`,
  (name: string) => `Hi sweetheart! How's ${name || 'your little one'} doing? Let's chat.`,
]

const GREETINGS_KIDS_MULTI = [
  (names: string[], active: string) => `Hey there! Got all ${names.length} of yours on my mind — ${names.join(', ')}. We're on ${active} right now. What's up?`,
  (names: string[], active: string) => `Well hello, mama! ${formatNameList(names)} — you're busy! Tap a pill above to switch kids. Right now we're talking about ${active}.`,
  (names: string[], active: string) => `Good to see you! I know ${formatNameList(names)} are all different beasts — tell me what's going on with ${active}.`,
  (names: string[], active: string) => `Hi love! Three (or more!) little humans to keep up with — ${formatNameList(names)}. What's ${active} up to today?`,
]

function formatNameList(names: string[]): string {
  if (names.length === 0) return ''
  if (names.length === 1) return names[0]
  if (names.length === 2) return `${names[0]} and ${names[1]}`
  return `${names.slice(0, -1).join(', ')}, and ${names[names.length - 1]}`
}

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

interface GreetingCtx {
  behavior: string
  childName?: string
  allChildNames?: string[]
  insightContext?: string
}

function getGreeting({ behavior, childName, allChildNames, insightContext }: GreetingCtx): string {
  if (insightContext) {
    const openers = [
      `Oh, I see you have a question about "${insightContext}" — let's dig into that! What would you like to know?`,
      `Ah, "${insightContext}" — great topic! I have a lot to say about this. What specifically would you like to explore?`,
      `"${insightContext}" — now THAT'S something I can help with. Fire away, dear!`,
    ]
    return openers[Math.floor(Math.random() * openers.length)]
  }
  switch (behavior) {
    case 'pre-pregnancy':
      return GREETINGS_PREPREG[Math.floor(Math.random() * GREETINGS_PREPREG.length)]()
    case 'pregnancy':
      return GREETINGS_PREGNANCY[Math.floor(Math.random() * GREETINGS_PREGNANCY.length)]()
    default: {
      const names = allChildNames ?? []
      const active = childName ?? names[0] ?? ''
      if (names.length > 1) {
        return GREETINGS_KIDS_MULTI[Math.floor(Math.random() * GREETINGS_KIDS_MULTI.length)](names, active)
      }
      return GREETINGS_KIDS_SINGLE[Math.floor(Math.random() * GREETINGS_KIDS_SINGLE.length)](active)
    }
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
  const { colors, isDark } = useTheme()
  const insets = useSafeAreaInsets()
  const sessions = useGrandmaHistoryStore((s) => s.sessions)
  const deleteSession = useGrandmaHistoryStore((s) => s.deleteSession)

  // Sticker palette
  const ST_INK = '#141313'
  const ST_YELLOW = isDark ? '#F0CE4C' : '#F5D652'
  const ST_LILAC = isDark ? '#D0BFEC' : '#C8B6E8'
  const PAPER = isDark ? colors.surface : '#FFFEF8'
  const ink = isDark ? colors.text : ST_INK
  const ink3 = colors.textMuted

  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.bg, zIndex: 10 }]}>
      {/* History header */}
      <View style={[
        histStyles.header,
        { paddingTop: insets.top + 10, borderBottomColor: colors.border, backgroundColor: colors.bg }
      ]}>
        <Pressable onPress={onClose} style={histStyles.headerBtn} hitSlop={8}>
          <ArrowLeft size={22} color={ink} strokeWidth={2} />
        </Pressable>
        <Text style={{ fontSize: 22, fontFamily: 'Fraunces_600SemiBold', color: ink, letterSpacing: -0.4 }}>
          Past conversations
        </Text>
        <Pressable
          onPress={onNewChat}
          hitSlop={8}
          style={({ pressed }) => ({
            width: 38, height: 38, borderRadius: 19,
            backgroundColor: ST_YELLOW,
            borderWidth: 1.5, borderColor: ST_INK,
            alignItems: 'center', justifyContent: 'center',
            shadowColor: ST_INK,
            shadowOffset: { width: 0, height: pressed ? 1 : 3 },
            shadowOpacity: 1, shadowRadius: 0, elevation: 4,
            transform: [{ translateY: pressed ? 2 : 0 }],
          })}
        >
          <Plus size={18} color={ST_INK} strokeWidth={2.5} />
        </Pressable>
      </View>

      {sessions.length === 0 ? (
        <View style={histStyles.empty}>
          <MessageCircle size={48} color={ink3} strokeWidth={1.5} />
          <Text style={{ fontSize: 22, fontFamily: 'Fraunces_600SemiBold', color: ink, textAlign: 'center', letterSpacing: -0.4 }}>
            No past chats yet
          </Text>
          <Text style={{ fontSize: 14, fontFamily: 'DMSans_400Regular', color: ink3, textAlign: 'center', lineHeight: 20 }}>
            Your conversations with Grandma will appear here
          </Text>
          <Pressable
            onPress={onNewChat}
            style={({ pressed }) => ({
              flexDirection: 'row', alignItems: 'center', gap: 8,
              paddingHorizontal: 24, paddingVertical: 12,
              borderRadius: 999,
              backgroundColor: ST_YELLOW,
              borderWidth: 1.5, borderColor: ST_INK,
              marginTop: 12,
              shadowColor: ST_INK,
              shadowOffset: { width: 0, height: pressed ? 1 : 3 },
              shadowOpacity: 1, shadowRadius: 0, elevation: 4,
              transform: [{ translateY: pressed ? 2 : 0 }],
            })}
          >
            <Plus size={16} color={ST_INK} strokeWidth={2.5} />
            <Text style={{ color: ST_INK, fontFamily: 'DMSans_700Bold', fontSize: 15, letterSpacing: -0.2 }}>
              Start a conversation
            </Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={sessions}
          keyExtractor={(s) => s.id}
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: insets.bottom + 16, gap: 12 }}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <Pressable
              onPress={onNewChat}
              style={({ pressed }) => ({
                flexDirection: 'row', alignItems: 'center', gap: 12,
                borderRadius: 18,
                borderWidth: 1.5, borderColor: ST_INK,
                padding: 14, marginBottom: 4,
                backgroundColor: ST_YELLOW,
                shadowColor: ST_INK,
                shadowOffset: { width: 0, height: pressed ? 1 : 3 },
                shadowOpacity: 1, shadowRadius: 0, elevation: 4,
                transform: [{ translateY: pressed ? 2 : 0 }],
              })}
            >
              <View style={{
                width: 36, height: 36, borderRadius: 18,
                backgroundColor: PAPER, borderWidth: 1.5, borderColor: ST_INK,
                alignItems: 'center', justifyContent: 'center',
              }}>
                <Plus size={18} color={ST_INK} strokeWidth={2.5} />
              </View>
              <Text style={{ fontSize: 15, fontFamily: 'DMSans_700Bold', color: ST_INK, letterSpacing: -0.2 }}>
                New conversation
              </Text>
            </Pressable>
          }
          renderItem={({ item }) => (
            <Pressable
              onPress={() => onSelect(item)}
              style={({ pressed }) => ({
                flexDirection: 'row', alignItems: 'center', gap: 12,
                borderRadius: 18, padding: 14,
                backgroundColor: PAPER,
                borderWidth: 1.5, borderColor: ST_INK,
                shadowColor: ST_INK,
                shadowOffset: { width: 0, height: pressed ? 1 : 3 },
                shadowOpacity: 1, shadowRadius: 0, elevation: 3,
                transform: [{ translateY: pressed ? 2 : 0 }],
              })}
            >
              <View style={histStyles.sessionCardLeft}>
                <View style={{
                  width: 36, height: 36, borderRadius: 18,
                  backgroundColor: ST_LILAC, borderWidth: 1.5, borderColor: ST_INK,
                  alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2,
                }}>
                  <Sparkles size={14} color={ST_INK} strokeWidth={2.5} />
                </View>
                <View style={histStyles.sessionMeta}>
                  <Text style={{ fontSize: 14, fontFamily: 'DMSans_600SemiBold', color: ink, lineHeight: 20 }} numberOfLines={2}>
                    {item.title}
                  </Text>
                  <View style={histStyles.sessionTags}>
                    <Text style={{ fontSize: 11, fontFamily: 'DMSans_500Medium', color: ink3 }}>
                      {formatDate(item.createdAt)}
                    </Text>
                    <View style={{
                      paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999,
                      backgroundColor: getBehaviorColor(item.behavior) + (isDark ? '30' : 'AA'),
                      borderWidth: 1, borderColor: ST_INK + '30',
                    }}>
                      <Text style={{ fontSize: 10, fontFamily: 'DMSans_700Bold', color: ST_INK, textTransform: 'uppercase', letterSpacing: 0.6 }}>
                        {getBehaviorLabel(item.behavior)}
                      </Text>
                    </View>
                    {item.childName && (
                      <View style={{
                        paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999,
                        backgroundColor: isDark ? colors.surfaceRaised : '#F7F0DF',
                        borderWidth: 1, borderColor: ST_INK + '30',
                      }}>
                        <Text style={{ fontSize: 10, fontFamily: 'DMSans_700Bold', color: ink, textTransform: 'uppercase', letterSpacing: 0.6 }}>
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
                <Trash2 size={16} color={ink3} strokeWidth={1.8} />
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

  const allChildNames = children.map((c) => c.name)

  const [messages, setMessages] = useState<ChatMessage[]>(() => [{
    id: nextId(),
    role: 'assistant' as const,
    content: getGreeting({ behavior: mode, childName, allChildNames, insightContext }),
  }])

  const [input, setInput] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([])
  const [showBehaviorDropdown, setShowBehaviorDropdown] = useState(false)

  const hasUserMessages = messages.some((m) => m.role === 'user')
  const suggestions = getSuggestions(allBehaviors, chatBehavior, childName, childAge)
  const modeColor = getBehaviorColor(chatBehavior)

  // Orb state — drives text and motion
  const orbState: OrbState = isStreaming
    ? 'thinking'
    : input.trim().length > 0
      ? 'typing'
      : hasUserMessages
        ? 'idle-ready'
        : 'idle-empty'

  const { message: orbMessage, pulseAnim } = useOrbMessage(orbState)

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

  // Refresh greeting when behavior or active child changes — only if user hasn't sent anything yet
  useEffect(() => {
    if (hasUserMessages || insightContext) return
    setMessages([{
      id: nextId(),
      role: 'assistant' as const,
      content: getGreeting({ behavior: chatBehavior, childName, allChildNames, insightContext }),
    }])
  }, [chatBehavior, childName, allChildNames.join('|')])

  const startNewChat = useCallback(() => {
    sessionIdRef.current = newSessionId()
    setMessages([{
      id: nextId(),
      role: 'assistant' as const,
      content: getGreeting({ behavior: chatBehavior, childName, allChildNames, insightContext }),
    }])
    setInput('')
    setAiSuggestions([])
    setShowHistory(false)
  }, [chatBehavior, childName, allChildNames.join('|'), insightContext])

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
          {isLatestGrandma && <SwayingFlower />}
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
                <Text style={[styles.typingText, { color: textColor, fontFamily: font.italic }]}>{orbMessage}</Text>
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
    [colors, font, isStreaming, orbMessage, pulseAnim, lastAssistantIndex, isDark]
  )

  // Show the AI follow-up suggestions (after Grandma replies)
  const showAiSuggestions = !isStreaming && aiSuggestions.length > 0
  // Show the initial suggestions only before any user messages
  const showInitialSuggestions = !hasUserMessages && !isStreaming


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
          accessibilityLabel="Past conversations"
        >
          <MessagesSquare size={18} color={colors.text} strokeWidth={1.75} />
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
              <SpinningSun />
              <BeatingHeart />
              <GrandmaOrb status={orbMessage} state={orbState} />
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
    zIndex: 1,
  },
  stickerTopRight: {
    position: 'absolute',
    right: 18,
    top: 32,
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
