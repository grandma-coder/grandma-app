// components/pregnancy/BirthDetailModal.tsx
import React, { useState } from 'react'
import {
  Modal,
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native'
import { X, ChevronDown, ChevronUp } from 'lucide-react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme } from '../../constants/theme'
import { Display, Body } from '../ui/Typography'
import { getBirthTopic } from '../../lib/birthGuideData'
import type { BirthTopicKey, BirthSection } from '../../lib/birthGuideData'

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true)
}

interface BirthDetailModalProps {
  visible: boolean
  onClose: () => void
  topicKey: BirthTopicKey | null
  onAskGrandma: (topicTitle: string) => void
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
    onAskGrandma(topic.title)
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
            { backgroundColor: isDark ? colors.surface : '#FFFEF8', paddingBottom: insets.bottom + 16 },
          ]}
        >
          {/* Handle */}
          <View style={styles.handleWrap}>
            <View style={[styles.handle, { backgroundColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(20,19,19,0.15)' }]} />
            <Pressable onPress={handleClose} style={styles.closeBtn} hitSlop={8}>
              <X size={20} color={colors.textMuted} strokeWidth={2} />
            </Pressable>
          </View>

          {/* Hero */}
          <View style={styles.heroPad}>
            <View
              style={[
                styles.hero,
                { backgroundColor: topic.heroColor, borderColor: topic.heroBorder },
              ]}
            >
              <Text style={styles.heroEmoji}>{topic.emoji}</Text>
              <View style={{ flex: 1 }}>
                <Display size={20} color={isDark ? colors.text : '#141313'}>
                  {topic.title}
                </Display>
                <Body size={12} color={isDark ? colors.textSecondary : '#777'} style={{ marginTop: 2 }}>
                  {topic.subtitle}
                </Body>
              </View>
            </View>
          </View>

          {/* Accordion */}
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
                accentColor={topic.heroBorder}
                isDark={isDark}
                colors={colors}
              />
            ))}
          </ScrollView>

          {/* Ask Grandma CTA */}
          <View style={styles.ctaPad}>
            <Pressable
              onPress={handleAskGrandma}
              style={({ pressed }) => [
                styles.cta,
                { backgroundColor: isDark ? 'rgba(112,72,184,0.15)' : '#F0EBFF', borderColor: '#C4B5FD', opacity: pressed ? 0.75 : 1 },
              ]}
            >
              <Text style={styles.ctaText}>💬 Ask Grandma anything →</Text>
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
  accentColor: string
  isDark: boolean
  colors: ReturnType<typeof useTheme>['colors']
}

function AccordionItem({ section, index, isOpen, onToggle, accentColor, isDark, colors }: AccordionItemProps) {
  return (
    <View style={styles.accordionItem}>
      <Pressable
        onPress={onToggle}
        style={({ pressed }) => [
          styles.accordionHeader,
          {
            backgroundColor: isOpen
              ? (isDark ? 'rgba(196,181,253,0.12)' : '#F4F0FF')
              : (isDark ? colors.surface : '#FFFEF8'),
            borderColor: isOpen ? '#C4B5FD' : (isDark ? colors.border : '#E8E0CC'),
            opacity: pressed ? 0.8 : 1,
          },
        ]}
      >
        <View style={[styles.numCircle, { backgroundColor: accentColor + '40', borderColor: accentColor }]}>
          <Text style={[styles.numText, { color: isDark ? colors.text : '#141313' }]}>{index + 1}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Body size={14} color={isDark ? colors.text : '#141313'} style={{ fontFamily: 'DMSans_600SemiBold' }}>
            {section.title}
          </Body>
        </View>
        {isOpen
          ? <ChevronUp size={16} color={accentColor} strokeWidth={2.5} />
          : <ChevronDown size={16} color={isDark ? colors.textMuted : '#AAAAAA'} strokeWidth={2.5} />}
      </Pressable>

      {isOpen && (
        <View
          style={[
            styles.accordionBody,
            {
              backgroundColor: isDark ? 'rgba(196,181,253,0.06)' : '#FDFBFF',
              borderColor: isDark ? colors.border : '#E8E0CC',
            },
          ]}
        >
          <Body size={13} color={isDark ? colors.textSecondary : '#555'} style={{ lineHeight: 20 }}>
            {section.content}
          </Body>
          {section.bullets && section.bullets.length > 0 && (
            <View style={styles.bulletList}>
              {section.bullets.map((bullet, i) => (
                <View key={i} style={styles.bulletRow}>
                  <View style={[styles.bulletDot, { backgroundColor: accentColor }]} />
                  <Body size={12} color={isDark ? colors.textSecondary : '#555'} style={{ flex: 1, lineHeight: 18 }}>
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
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    maxHeight: '92%',
  },
  handleWrap: {
    alignItems: 'center',
    paddingTop: 12,
    paddingHorizontal: 20,
    paddingBottom: 4,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    position: 'absolute',
    top: 12,
  },
  closeBtn: {
    position: 'absolute',
    right: 20,
    top: 8,
    padding: 8,
  },
  heroPad: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4 },
  hero: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  heroEmoji: { fontSize: 32 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8, gap: 8 },
  accordionItem: { gap: 0 },
  accordionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
  },
  numCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  numText: { fontSize: 11, fontFamily: 'DMSans_600SemiBold' },
  accordionBody: {
    borderWidth: 1,
    borderTopWidth: 0,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    padding: 14,
    gap: 8,
    marginTop: -2,
  },
  bulletList: { gap: 6, marginTop: 8 },
  bulletRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  bulletDot: { width: 5, height: 5, borderRadius: 3, marginTop: 7, flexShrink: 0 },
  ctaPad: { paddingHorizontal: 16, paddingTop: 8 },
  cta: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    alignItems: 'center',
  },
  ctaText: {
    fontSize: 14,
    fontFamily: 'DMSans_600SemiBold',
    color: '#7048B8',
  },
})
