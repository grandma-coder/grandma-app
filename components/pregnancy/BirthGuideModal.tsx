// components/pregnancy/BirthGuideModal.tsx
import React, { useState } from 'react'
import {
  Modal,
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
} from 'react-native'
import { X } from 'lucide-react-native'
import { router } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme, brand } from '../../constants/theme'
import { Display, MonoCaps, Body } from '../ui/Typography'
import { BirthDetailModal } from './BirthDetailModal'
import type { BirthTopicKey } from '../../lib/birthGuideData'

interface BirthGuideModalProps {
  visible: boolean
  onClose: () => void
}

const BIRTH_TYPES: {
  key: BirthTopicKey
  emoji: string
  title: string
  subtitle: string
  bg: string
  border: string
}[] = [
  { key: 'natural', emoji: '🌿', title: 'Natural Birth', subtitle: 'Breathing, positions, stages', bg: '#E8F8E8', border: '#B7E5B7' },
  { key: 'csection', emoji: '🏥', title: 'C-Section', subtitle: 'Surgery, recovery, VBAC', bg: '#F0EBFF', border: '#C4B5FD' },
  { key: 'home', emoji: '🏡', title: 'Home Birth', subtitle: 'Midwife, safety, planning', bg: '#E8F0FF', border: '#B7C8F5' },
  { key: 'water', emoji: '🌊', title: 'Water Birth', subtitle: 'Pool, pain relief, logistics', bg: '#FFF0F5', border: '#F5B7CC' },
]

const EXTRA_TOPICS: {
  key: BirthTopicKey
  emoji: string
  title: string
  subtitle: string
  tileBg: string
}[] = [
  { key: 'labor-stages', emoji: '⏱️', title: 'Labor Stages', subtitle: 'Early → Active → Transition → Pushing', tileBg: '#FEF9E8' },
  { key: 'warning-signs', emoji: '🚨', title: 'Warning Signs', subtitle: 'When to call your provider', tileBg: '#FFF0F0' },
  { key: 'hospital-bag', emoji: '🧳', title: 'Hospital Bag Checklist', subtitle: 'For mom, baby & partner', tileBg: '#E8F8F8' },
  { key: 'pain-relief', emoji: '💊', title: 'Pain Relief Options', subtitle: 'Epidural, TENS, breathing & more', tileBg: '#F0F8FF' },
  { key: 'positions', emoji: '🤸', title: 'Birth Positions', subtitle: 'Upright, squatting, hands & knees', tileBg: '#F5F0FF' },
  { key: 'partner-guide', emoji: '👐', title: 'Birth Partner Guide', subtitle: 'What your support person needs to know', tileBg: '#FFF5E8' },
  { key: 'recovery', emoji: '🌙', title: 'Recovery & Postpartum', subtitle: 'First 24h, healing, emotional changes', tileBg: '#F0F0FF' },
]

export function BirthGuideModal({ visible, onClose }: BirthGuideModalProps) {
  const { colors, isDark } = useTheme()
  const insets = useSafeAreaInsets()
  const [detailTopic, setDetailTopic] = useState<BirthTopicKey | null>(null)

  const handleClose = () => {
    setDetailTopic(null)
    onClose()
  }

  const handleAskGrandma = (topicTitle: string) => {
    handleClose()
    router.push('/grandma-talk')
  }

  return (
    <>
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
              { backgroundColor: colors.surface, paddingBottom: insets.bottom + 16 },
            ]}
          >
            {/* Handle */}
            <View style={styles.handleWrap}>
              <View style={[styles.handle, { backgroundColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(20,19,19,0.15)' }]} />
              <Pressable onPress={handleClose} style={styles.closeBtn} hitSlop={8}>
                <X size={20} color={colors.textMuted} strokeWidth={2} />
              </Pressable>
            </View>

            {/* Header */}
            <View style={styles.headerPad}>
              <Display size={22}>Birth Guide 🌿</Display>
              <Body size={13} color={isDark ? colors.textSecondary : '#888'} style={{ marginTop: 4 }}>
                What do you want to explore?
              </Body>
            </View>

            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
            >
              {/* Birth type grid */}
              <View style={styles.grid}>
                {BIRTH_TYPES.map((item) => (
                  <Pressable
                    key={item.key}
                    onPress={() => setDetailTopic(item.key)}
                    style={({ pressed }) => [
                      styles.typeCard,
                      {
                        backgroundColor: isDark ? colors.surfaceRaised ?? colors.surface : item.bg,
                        borderColor: item.border,
                        opacity: pressed ? 0.8 : 1,
                      },
                    ]}
                  >
                    <Text style={styles.typeEmoji}>{item.emoji}</Text>
                    <Body size={13} color={colors.text} style={{ fontFamily: 'DMSans_600SemiBold', marginTop: 4 }}>
                      {item.title}
                    </Body>
                    <Body size={11} color={isDark ? colors.textSecondary : '#777'} style={{ marginTop: 2 }}>
                      {item.subtitle}
                    </Body>
                  </Pressable>
                ))}
              </View>

              {/* Also in this guide */}
              <MonoCaps size={10} color={brand.pregnancy} style={{ marginTop: 20, marginBottom: 10, letterSpacing: 0.8 }}>
                ALSO IN THIS GUIDE
              </MonoCaps>

              <View style={styles.extraList}>
                {EXTRA_TOPICS.map((item) => (
                  <Pressable
                    key={item.key}
                    onPress={() => setDetailTopic(item.key)}
                    style={({ pressed }) => [
                      styles.extraRow,
                      {
                        backgroundColor: isDark ? colors.surface : '#FFFEF8',
                        borderColor: isDark ? colors.border : '#E8E0CC',
                        opacity: pressed ? 0.8 : 1,
                      },
                    ]}
                  >
                    <View style={[styles.extraTile, { backgroundColor: isDark ? colors.surface : item.tileBg }]}>
                      <Text style={styles.extraEmoji}>{item.emoji}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Body size={14} color={colors.text} style={{ fontFamily: 'DMSans_600SemiBold' }}>
                        {item.title}
                      </Body>
                      <Body size={12} color={isDark ? colors.textSecondary : '#888'} style={{ marginTop: 2 }}>
                        {item.subtitle}
                      </Body>
                    </View>
                    <Text style={[styles.extraChevron, { color: brand.pregnancy }]}>›</Text>
                  </Pressable>
                ))}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <BirthDetailModal
        visible={detailTopic !== null}
        topicKey={detailTopic}
        onClose={() => setDetailTopic(null)}
        onAskGrandma={handleAskGrandma}
      />
    </>
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
  headerPad: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 4 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 16 },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  typeCard: {
    width: '47.5%',
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
  },
  typeEmoji: { fontSize: 24 },
  extraList: { gap: 8 },
  extraRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
  },
  extraTile: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  extraEmoji: { fontSize: 18 },
  extraChevron: { fontSize: 20 },
})
