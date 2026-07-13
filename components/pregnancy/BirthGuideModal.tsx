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
import { X, ChevronRight } from 'lucide-react-native'
import { router } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import {
  useTheme, brand, font,
  useDiffuseTheme, getDiffuseAccent, diffuseFont, diffuseRadius,
} from '../../constants/theme'
import { useIsDiffuse, DiffuseFieldSurface } from '../ui/diffuse/DiffuseKit'
import { DiffuseSheet, DiffuseSectionHeader, DiffuseListRow } from '../ui/diffuse/DiffusePrimitives'
import { Character, type CharacterName } from '../characters/Characters'
import { useTranslation } from '../../lib/i18n'
import { Display, MonoCaps, Body } from '../ui/Typography'
import { BirthDetailModal } from './BirthDetailModal'
import {
  Leaf, Cross, Cloud, Drop, ClockFace, Bolt, Key, Pill, Lungs, Heart, Moon,
} from '../ui/Stickers'
import type { BirthTopicKey } from '../../lib/birthGuideData'


interface BirthGuideModalProps {
  visible: boolean
  onClose: () => void
}

interface BirthTypeTile {
  key: BirthTopicKey
  title: string
  subtitle: string
  bg: string
  sticker: (size: number) => React.ReactNode
}

interface ExtraTopicTile {
  key: BirthTopicKey
  title: string
  subtitle: string
  tileBg: string
  sticker: (size: number) => React.ReactNode
}

const BIRTH_TYPES: BirthTypeTile[] = [
  { key: 'natural',  title: 'Natural Birth', subtitle: 'Breathing, positions, stages', bg: '#DDE7BB', sticker: (s) => <Leaf size={s} fill="#BDD48C" /> },
  { key: 'csection', title: 'C-Section',     subtitle: 'Surgery, recovery, VBAC',      bg: '#E0D5F0', sticker: (s) => <Cross size={s} fill="#C8B6E8" /> },
  { key: 'home',     title: 'Home Birth',    subtitle: 'Midwife, safety, planning',    bg: '#CFE0F0', sticker: (s) => <Cloud size={s} fill="#9DC3E8" /> },
  { key: 'water',    title: 'Water Birth',   subtitle: 'Pool, pain relief, logistics', bg: '#F9D8E2', sticker: (s) => <Drop size={s} fill="#9DC3E8" /> },
]

const EXTRA_TOPICS: ExtraTopicTile[] = [
  { key: 'labor-stages',   title: 'Labor Stages',          subtitle: 'Early → Active → Transition → Pushing', tileBg: '#FAEFB5', sticker: (s) => <ClockFace size={s} fill="#F5D652" /> },
  { key: 'warning-signs',  title: 'Warning Signs',         subtitle: 'When to call your provider',            tileBg: '#F9D8E2', sticker: (s) => <Bolt size={s} fill="#EE7B6D" /> },
  { key: 'hospital-bag',   title: 'Hospital Bag Checklist',subtitle: 'For mom, baby & partner',               tileBg: '#CFE0F0', sticker: (s) => <Key size={s} fill="#F5D652" /> },
  { key: 'pain-relief',    title: 'Pain Relief Options',   subtitle: 'Epidural, TENS, breathing & more',      tileBg: '#E0D5F0', sticker: (s) => <Pill size={s} fill="#F5D652" /> },
  { key: 'positions',      title: 'Birth Positions',       subtitle: 'Upright, squatting, hands & knees',     tileBg: '#DDE7BB', sticker: (s) => <Lungs size={s} fill="#F2B2C7" /> },
  { key: 'partner-guide',  title: 'Birth Partner Guide',   subtitle: 'What your support person needs to know', tileBg: '#F2B2C7', sticker: (s) => <Heart size={s} fill="#EE7B6D" /> },
  { key: 'recovery',       title: 'Recovery & Postpartum', subtitle: 'First 24h, healing, emotional changes', tileBg: '#E0D5F0', sticker: (s) => <Moon size={s} fill="#C8B6E8" /> },
]

// Birth topic → Character-blob concept (Diffuse). Cream-paper keeps the branded
// stickers above; under Diffuse the whole grid renders as one blob family.
// Exported so BirthDetailModal's hero uses the exact same mapping.
export const BIRTH_TOPIC_CHARACTER: Record<BirthTopicKey, CharacterName> = {
  natural: 'nutrition', csection: 'health', home: 'cloud', water: 'water',
  'labor-stages': 'clock', 'warning-signs': 'warning', 'hospital-bag': 'key',
  'pain-relief': 'medicine', positions: 'lungs', 'partner-guide': 'heart',
  recovery: 'night',
}

export function BirthGuideModal({ visible, onClose }: BirthGuideModalProps) {
  const { colors, isDark } = useTheme()
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
  const { t } = useTranslation()
  const insets = useSafeAreaInsets()
  const [detailTopic, setDetailTopic] = useState<BirthTopicKey | null>(null)

  const ink = colors.text
  const inkMuted = colors.textMuted
  const paper = colors.surface
  const paperBorder = isDark ? colors.border : colors.text

  const handleClose = () => {
    setDetailTopic(null)
    onClose()
  }

  const handleAskGrandma = () => {
    handleClose()
    router.push('/grandma-talk')
  }

  // ── Diffuse render path — DiffuseSheet + field tiles + hairline rows ──
  if (diffuse) {
    const dAccent = getDiffuseAccent('preg', dt.isDark)
    return (
      <>
        <DiffuseSheet
          visible={visible && detailTopic === null}
          title={t('preg_birthGuide_title')}
          onClose={handleClose}
        >
          <Text style={[styles.dSubtitle, { color: dt.colors.ink3, fontFamily: diffuseFont.italic }]}>
            {t('preg_birthGuide_subtitle')}
          </Text>

          {/* Birth type grid — soft field tiles, sticker hero */}
          <View style={styles.grid}>
            {BIRTH_TYPES.map((item) => (
              <Pressable
                key={item.key}
                onPress={() => setDetailTopic(item.key)}
                accessibilityRole="button"
                accessibilityLabel={`${item.title}. ${item.subtitle}`}
                style={({ pressed }) => [styles.dTypeCardWrap, { opacity: pressed ? 0.9 : 1 }]}
              >
                <DiffuseFieldSurface
                  mode="preg"
                  isDark={dt.isDark}
                  intensity={0.45}
                  radius={diffuseRadius.md}
                  style={[styles.dTypeCard, { borderWidth: 1, borderColor: dt.colors.line }]}
                >
                  <View style={styles.typeStickerRow}>
                    <Character name={BIRTH_TOPIC_CHARACTER[item.key]} size={38} color={getDiffuseAccent('preg', dt.isDark)} />
                  </View>
                  <Text style={[styles.dTypeTitle, { color: dt.colors.ink, fontFamily: diffuseFont.display }]}>
                    {item.title}
                  </Text>
                  <Text style={[styles.dTypeSub, { color: dt.colors.ink3, fontFamily: diffuseFont.body }]}>
                    {item.subtitle}
                  </Text>
                </DiffuseFieldSurface>
              </Pressable>
            ))}
          </View>

          {/* Also in this guide — hairline rows */}
          <DiffuseSectionHeader
            title={t('preg_birthGuide_alsoIn')}
            style={{ marginTop: 26, marginBottom: 6 }}
          />

          <View>
            {EXTRA_TOPICS.map((item, i) => (
              <DiffuseListRow
                key={item.key}
                title={item.title}
                sub={item.subtitle}
                icon={<Character name={BIRTH_TOPIC_CHARACTER[item.key]} size={26} color={dAccent} />}
                onPress={() => setDetailTopic(item.key)}
                showArrow
                last={i === EXTRA_TOPICS.length - 1}
              />
            ))}
          </View>
        </DiffuseSheet>

        <BirthDetailModal
          visible={detailTopic !== null}
          topicKey={detailTopic}
          onClose={() => setDetailTopic(null)}
          onAskGrandma={handleAskGrandma}
        />
      </>
    )
  }

  return (
    <>
      <Modal
        visible={visible && detailTopic === null}
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

            {/* Header — Display title + sticker close */}
            <View style={styles.headerRow}>
              <View style={{ flex: 1, paddingRight: 12 }}>
                <Display size={26} color={ink}>{t('preg_birthGuide_title')}</Display>
                <Body size={13} color={inkMuted} style={{ marginTop: 4 }}>
                  {t('preg_birthGuide_subtitle')}
                </Body>
              </View>
              <Pressable
                onPress={handleClose}
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel="Close birth guide"
                style={({ pressed }) => [
                  styles.closeChip,
                  {
                    backgroundColor: paper,
                    borderColor: paperBorder,
                    shadowColor: colors.text,
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

            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
            >
              {/* Birth type grid — sticker hero per card */}
              <View style={styles.grid}>
                {BIRTH_TYPES.map((item) => (
                  <Pressable
                    key={item.key}
                    onPress={() => setDetailTopic(item.key)}
                    accessibilityRole="button"
                    accessibilityLabel={`${item.title}. ${item.subtitle}`}
                    style={({ pressed }) => [
                      styles.typeCard,
                      {
                        backgroundColor: isDark ? colors.surfaceRaised : item.bg,
                        borderColor: paperBorder,
                        shadowColor: colors.text,
                        shadowOffset: { width: 0, height: pressed ? 1 : 3 },
                        shadowOpacity: 1,
                        shadowRadius: 0,
                        elevation: 4,
                        transform: [{ translateY: pressed ? 2 : 0 }],
                      },
                    ]}
                  >
                    <View style={styles.typeStickerRow}>
                      {item.sticker(38)}
                    </View>
                    <Body size={14} color={ink} style={{ fontFamily: font.displayBold, marginTop: 6 }}>
                      {item.title}
                    </Body>
                    <Body size={11} color={inkMuted} style={{ marginTop: 2, lineHeight: 15 }}>
                      {item.subtitle}
                    </Body>
                  </Pressable>
                ))}
              </View>

              {/* Also in this guide */}
              <MonoCaps
                size={11}
                color={isDark ? colors.textMuted : colors.text}
                style={{ marginTop: 22, marginBottom: 10, letterSpacing: 1.6 }}
              >
                {t('preg_birthGuide_alsoIn')}
              </MonoCaps>

              <View style={styles.extraList}>
                {EXTRA_TOPICS.map((item) => (
                  <Pressable
                    key={item.key}
                    onPress={() => setDetailTopic(item.key)}
                    accessibilityRole="button"
                    accessibilityLabel={`${item.title}. ${item.subtitle}`}
                    style={({ pressed }) => [
                      styles.extraRow,
                      {
                        backgroundColor: paper,
                        borderColor: paperBorder,
                        shadowColor: colors.text,
                        shadowOffset: { width: 0, height: pressed ? 1 : 2 },
                        shadowOpacity: 1,
                        shadowRadius: 0,
                        elevation: 3,
                        transform: [{ translateY: pressed ? 1 : 0 }],
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.extraTile,
                        {
                          backgroundColor: isDark ? colors.surfaceRaised : item.tileBg,
                          borderColor: paperBorder,
                        },
                      ]}
                    >
                      {item.sticker(28)}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Body size={14} color={ink} style={{ fontFamily: font.displayBold }}>
                        {item.title}
                      </Body>
                      <Body size={12} color={inkMuted} style={{ marginTop: 2, lineHeight: 16 }}>
                        {item.subtitle}
                      </Body>
                    </View>
                    <View style={[styles.extraChevron, { backgroundColor: paper, borderColor: paperBorder }]}>
                      <ChevronRight size={14} color={ink} strokeWidth={2.2} />
                    </View>
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
    paddingBottom: 6,
  },
  handle: {
    width: 42,
    height: 4,
    borderRadius: 2,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 14,
  },
  closeChip: {
    width: 34,
    height: 34,
    borderRadius: 999,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  scrollContent: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 24 },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  typeCard: {
    width: '47.5%',
    borderRadius: 22,
    borderWidth: 1.5,
    padding: 14,
    paddingTop: 12,
  },
  typeStickerRow: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  extraList: { gap: 10 },
  extraRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 18,
    borderWidth: 1.5,
    padding: 12,
  },
  extraTile: {
    width: 44,
    height: 44,
    borderRadius: 14,
    borderWidth: 1.2,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  extraChevron: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1.2,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  // ── Diffuse ──
  dSubtitle: {
    fontSize: 14,
    lineHeight: 19,
    marginTop: -6,
    marginBottom: 18,
  },
  dTypeCardWrap: {
    width: '47.5%',
  },
  dTypeCard: {
    padding: 14,
    paddingTop: 12,
  },
  dTypeTitle: {
    fontSize: 17,
    letterSpacing: -0.4,
    marginTop: 8,
  },
  dTypeSub: {
    fontSize: 11,
    lineHeight: 15,
    marginTop: 3,
  },
})
