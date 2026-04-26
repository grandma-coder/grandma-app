// components/pregnancy/BirthDetailModal.tsx
import React, { useState } from 'react'
import {
  Modal,
  View,
  Pressable,
  ScrollView,
  StyleSheet,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native'
import { X, ChevronDown, ChevronUp, MessageCircle } from 'lucide-react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme } from '../../constants/theme'
import { Display, Body } from '../ui/Typography'
import {
  Leaf, Cross, Cloud, Drop, ClockFace, Bolt, Key, Pill, Lungs, Heart, Moon,
} from '../ui/Stickers'
import { getBirthTopic } from '../../lib/birthGuideData'
import type { BirthTopicKey, BirthSection } from '../../lib/birthGuideData'

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true)
}

const INK = '#141313'

const TOPIC_STICKER: Record<BirthTopicKey, (size: number) => React.ReactNode> = {
  'natural':       (s) => <Leaf size={s} fill="#BDD48C" />,
  'csection':      (s) => <Cross size={s} fill="#C8B6E8" />,
  'home':          (s) => <Cloud size={s} fill="#9DC3E8" />,
  'water':         (s) => <Drop size={s} fill="#9DC3E8" />,
  'labor-stages':  (s) => <ClockFace size={s} fill="#F5D652" />,
  'warning-signs': (s) => <Bolt size={s} fill="#EE7B6D" />,
  'hospital-bag':  (s) => <Key size={s} fill="#F5D652" />,
  'pain-relief':   (s) => <Pill size={s} fill="#F5D652" />,
  'positions':     (s) => <Lungs size={s} fill="#F2B2C7" />,
  'partner-guide': (s) => <Heart size={s} fill="#EE7B6D" />,
  'recovery':      (s) => <Moon size={s} fill="#C8B6E8" />,
}

interface BirthDetailModalProps {
  visible: boolean
  onClose: () => void
  topicKey: BirthTopicKey | null
  onAskGrandma: () => void
}

export function BirthDetailModal({
  visible,
  onClose,
  topicKey,
  onAskGrandma,
}: BirthDetailModalProps) {
  const { colors, isDark } = useTheme()
  const insets = useSafeAreaInsets()
  const [openIndex, setOpenIndex] = useState<number | null>(0)

  if (!topicKey) return null
  const topic = getBirthTopic(topicKey)
  const renderSticker = TOPIC_STICKER[topicKey]

  const ink = isDark ? colors.text : INK
  const inkMuted = isDark ? colors.textMuted : 'rgba(20,19,19,0.55)'
  const paper = isDark ? colors.surface : '#FFFEF8'
  const paperBorder = isDark ? colors.border : INK

  const toggle = (index: number) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
    setOpenIndex((prev) => (prev === index ? null : index))
  }

  const handleClose = () => {
    setOpenIndex(0)
    onClose()
  }

  const handleAskGrandma = () => {
    handleClose()
    onAskGrandma()
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: isDark ? colors.bg : '#FFFEF8',
              borderColor: paperBorder,
              paddingBottom: insets.bottom + 16,
            },
          ]}
        >
          {/* Handle */}
          <View style={styles.handleWrap}>
            <View style={[styles.handle, { backgroundColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(20,19,19,0.18)' }]} />
          </View>

          {/* Header — close + hero card */}
          <View style={styles.headerRow}>
            <View style={{ flex: 1 }} />
            <Pressable
              onPress={handleClose}
              hitSlop={10}
              style={({ pressed }) => [
                styles.closeChip,
                {
                  backgroundColor: paper,
                  borderColor: paperBorder,
                  shadowColor: INK,
                  shadowOffset: { width: 0, height: pressed ? 1 : 3 },
                  shadowOpacity: 1,
                  shadowRadius: 0,
                  elevation: 4,
                  transform: [{ translateY: pressed ? 2 : 0 }],
                },
              ]}
            >
              <X size={16} color={ink} strokeWidth={2.4} />
            </Pressable>
          </View>

          <View style={styles.heroPad}>
            <View
              style={[
                styles.hero,
                {
                  backgroundColor: isDark ? colors.surfaceRaised : topic.heroColor,
                  borderColor: paperBorder,
                },
              ]}
            >
              <View style={styles.heroSticker}>{renderSticker(54)}</View>
              <View style={{ flex: 1 }}>
                <Display size={22} color={ink}>
                  {topic.title}
                </Display>
                <Body size={13} color={inkMuted} style={{ marginTop: 4, lineHeight: 18 }}>
                  {topic.subtitle}
                </Body>
              </View>
            </View>
          </View>

          {/* Accordion sections — full content from birthGuideData */}
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {topic.sections.map((section, index) => (
              <AccordionItem
                key={index}
                section={section}
                index={index}
                isOpen={openIndex === index}
                onToggle={() => toggle(index)}
                ink={ink}
                inkMuted={inkMuted}
                paper={paper}
                paperBorder={paperBorder}
                isDark={isDark}
              />
            ))}
          </ScrollView>

          {/* Ask Grandma CTA — sticker pill */}
          <View style={styles.ctaPad}>
            <Pressable
              onPress={handleAskGrandma}
              style={({ pressed }) => [
                styles.cta,
                {
                  backgroundColor: '#F5D652',
                  borderColor: paperBorder,
                  shadowColor: INK,
                  shadowOffset: { width: 0, height: pressed ? 1 : 3 },
                  shadowOpacity: 1,
                  shadowRadius: 0,
                  elevation: 4,
                  transform: [{ translateY: pressed ? 2 : 0 }],
                },
              ]}
            >
              <MessageCircle size={16} color={INK} strokeWidth={2.2} />
              <Body size={14} color={INK} style={{ fontFamily: 'DMSans_700Bold' }}>
                Ask Grandma anything
              </Body>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  )
}

interface AccordionItemProps {
  section: BirthSection
  index: number
  isOpen: boolean
  onToggle: () => void
  ink: string
  inkMuted: string
  paper: string
  paperBorder: string
  isDark: boolean
}

function AccordionItem({
  section, index, isOpen, onToggle, ink, inkMuted, paper, paperBorder, isDark,
}: AccordionItemProps) {
  const numFill = ['#F5D652', '#F2B2C7', '#9DC3E8', '#BDD48C', '#C8B6E8', '#EE7B6D'][index % 6]
  return (
    <View style={styles.accordionItem}>
      <Pressable
        onPress={onToggle}
        style={({ pressed }) => [
          styles.accordionHeader,
          {
            backgroundColor: paper,
            borderColor: paperBorder,
            opacity: pressed ? 0.92 : 1,
            borderBottomLeftRadius: isOpen ? 0 : 14,
            borderBottomRightRadius: isOpen ? 0 : 14,
            borderBottomWidth: isOpen ? 0 : 1.5,
          },
        ]}
      >
        <View
          style={[
            styles.numCircle,
            {
              backgroundColor: numFill,
              borderColor: isDark ? 'rgba(255,255,255,0.2)' : INK,
            },
          ]}
        >
          <Body size={11} color={INK} style={{ fontFamily: 'Fraunces_700Bold' }}>
            {index + 1}
          </Body>
        </View>
        <View style={{ flex: 1 }}>
          <Body size={14} color={ink} style={{ fontFamily: 'DMSans_700Bold' }}>
            {section.title}
          </Body>
        </View>
        <View
          style={[
            styles.chevWrap,
            {
              backgroundColor: paper,
              borderColor: paperBorder,
            },
          ]}
        >
          {isOpen
            ? <ChevronUp size={13} color={ink} strokeWidth={2.4} />
            : <ChevronDown size={13} color={ink} strokeWidth={2.4} />}
        </View>
      </Pressable>

      {isOpen && (
        <View
          style={[
            styles.accordionBody,
            {
              backgroundColor: paper,
              borderColor: paperBorder,
            },
          ]}
        >
          <Body size={13} color={inkMuted} style={{ lineHeight: 20 }}>
            {section.content}
          </Body>
          {section.bullets && section.bullets.length > 0 && (
            <View style={styles.bulletList}>
              {section.bullets.map((bullet, i) => (
                <View key={i} style={styles.bulletRow}>
                  <View style={[styles.bulletDot, { backgroundColor: numFill, borderColor: isDark ? 'rgba(255,255,255,0.3)' : INK }]} />
                  <Body size={13} color={ink} style={{ flex: 1, lineHeight: 19 }}>
                    {bullet}
                  </Body>
                </View>
              ))}
            </View>
          )}
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(20,19,19,0.55)',
  },
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 1.5,
    borderLeftWidth: 1.5,
    borderRightWidth: 1.5,
    height: '90%',
  },
  handleWrap: {
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 4,
  },
  handle: {
    width: 42,
    height: 4,
    borderRadius: 2,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 6,
    paddingBottom: 4,
  },
  closeChip: {
    width: 34,
    height: 34,
    borderRadius: 999,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroPad: { paddingHorizontal: 16, paddingTop: 6, paddingBottom: 4 },
  hero: {
    borderRadius: 22,
    borderWidth: 1.5,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  heroSticker: {
    width: 64,
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12, gap: 8 },
  accordionItem: {},
  accordionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 14,
    borderWidth: 1.5,
    padding: 12,
  },
  numCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1.2,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  chevWrap: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.2,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  accordionBody: {
    borderWidth: 1.5,
    borderTopWidth: 0,
    borderBottomLeftRadius: 14,
    borderBottomRightRadius: 14,
    padding: 14,
    gap: 8,
  },
  bulletList: { gap: 8, marginTop: 6 },
  bulletRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  bulletDot: { width: 7, height: 7, borderRadius: 4, marginTop: 7, flexShrink: 0, borderWidth: 0.8 },
  ctaPad: { paddingHorizontal: 16, paddingTop: 8 },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 999,
    borderWidth: 1.5,
    paddingVertical: 14,
  },
})
