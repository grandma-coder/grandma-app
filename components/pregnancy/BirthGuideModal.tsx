// components/pregnancy/BirthGuideModal.tsx
import { afterSheets } from '../../lib/afterSheets'
import React, { useState } from 'react'
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
} from 'react-native'
import { ChevronRight } from 'lucide-react-native'
import { router } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import {
  useTheme, font, getModeColorSoft,
  useDiffuseTheme, getDiffuseAccent, diffuseFont, diffuseRadius,
} from '../../constants/theme'
import { useIsDiffuse, DiffuseFieldSurface } from '../ui/diffuse/DiffuseKit'
import { DiffuseSheet, DiffuseSectionHeader, DiffuseListRow } from '../ui/diffuse/DiffusePrimitives'
import { Character, type CharacterName } from '../characters/Characters'
import { useTranslation, type TranslationKey } from '../../lib/i18n'
import { SiteSticker, type SiteStickerName } from '../stickers/SiteSticker'
import { DetailSheetHeader } from '../ui/DetailSheetHeader'
import { BirthDetailModal } from './BirthDetailModal'
import {
  Leaf, Cross, Cloud, Drop, ClockFace, Bolt, Key, Pill, Lungs, Heart, Moon,
} from '../ui/Stickers'
import type { BirthTopicKey } from '../../lib/birthGuideData'
import { SheetModal } from '../ui/SheetModal'


interface BirthGuideModalProps {
  visible: boolean
  onClose: () => void
}

interface BirthTypeTile {
  key: BirthTopicKey
  titleKey: TranslationKey
  subtitleKey: TranslationKey
  bg: string
  sticker: (size: number) => React.ReactNode
}

interface ExtraTopicTile {
  key: BirthTopicKey
  titleKey: TranslationKey
  subtitleKey: TranslationKey
  tileBg: string
  sticker: (size: number) => React.ReactNode
}

const BIRTH_TYPES: BirthTypeTile[] = [
  { key: 'natural',  titleKey: 'sw1_bg_natural', subtitleKey: 'sw1_bg_natural_sub', bg: '#DDE7BB', sticker: (s) => <Leaf size={s} fill="#BDD48C" /> },
  { key: 'csection', titleKey: 'sw1_bg_csection',     subtitleKey: 'sw1_bg_csection_sub',      bg: '#E0D5F0', sticker: (s) => <Cross size={s} fill="#C8B6E8" /> },
  { key: 'home',     titleKey: 'sw1_bg_home',    subtitleKey: 'sw1_bg_home_sub',    bg: '#CFE0F0', sticker: (s) => <Cloud size={s} fill="#9DC3E8" /> },
  { key: 'water',    titleKey: 'sw1_bg_water',   subtitleKey: 'sw1_bg_water_sub', bg: '#F9D8E2', sticker: (s) => <Drop size={s} fill="#9DC3E8" /> },
]

const EXTRA_TOPICS: ExtraTopicTile[] = [
  { key: 'labor-stages',   titleKey: 'sw1_bg_labor',          subtitleKey: 'sw1_bg_labor_sub', tileBg: '#FAEFB5', sticker: (s) => <ClockFace size={s} fill="#F5D652" /> },
  { key: 'warning-signs',  titleKey: 'sw1_bg_warning',         subtitleKey: 'sw1_bg_warning_sub',            tileBg: '#F9D8E2', sticker: (s) => <Bolt size={s} fill="#EE7B6D" /> },
  { key: 'hospital-bag',   titleKey: 'sw1_bg_bag',subtitleKey: 'sw1_bg_bag_sub',               tileBg: '#CFE0F0', sticker: (s) => <Key size={s} fill="#F5D652" /> },
  { key: 'pain-relief',    titleKey: 'sw1_bg_pain',   subtitleKey: 'sw1_bg_pain_sub',      tileBg: '#E0D5F0', sticker: (s) => <Pill size={s} fill="#F5D652" /> },
  { key: 'positions',      titleKey: 'sw1_bg_positions',       subtitleKey: 'sw1_bg_positions_sub',     tileBg: '#DDE7BB', sticker: (s) => <Lungs size={s} fill="#F2B2C7" /> },
  { key: 'partner-guide',  titleKey: 'sw1_bg_partner',   subtitleKey: 'sw1_bg_partner_sub', tileBg: '#F2B2C7', sticker: (s) => <Heart size={s} fill="#EE7B6D" /> },
  { key: 'recovery',       titleKey: 'sw1_bg_recovery', subtitleKey: 'sw1_bg_recovery_sub', tileBg: '#E0D5F0', sticker: (s) => <Moon size={s} fill="#C8B6E8" /> },
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

export const BIRTH_TOPIC_SITE_STICKER: Record<BirthTopicKey, SiteStickerName> = {
  natural: 'leaf', csection: 'hospital', home: 'house', water: 'wave',
  'labor-stages': 'stopwatch', 'warning-signs': 'alert', 'hospital-bag': 'backpack',
  'pain-relief': 'syringe', positions: 'me', 'partner-guide': 'love', recovery: 'moon',
}

export function BirthGuideModal({ visible, onClose }: BirthGuideModalProps) {
  const { colors, isDark } = useTheme()
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
  const { t } = useTranslation()
  const birthTypes = BIRTH_TYPES.map((b) => ({ ...b, title: t(b.titleKey), subtitle: t(b.subtitleKey) }))
  const extraTopics = EXTRA_TOPICS.map((b) => ({ ...b, title: t(b.titleKey), subtitle: t(b.subtitleKey) }))
  const insets = useSafeAreaInsets()
  const [detailTopic, setDetailTopic] = useState<BirthTopicKey | null>(null)

  const ink = colors.text
  const paperBorder = isDark ? colors.border : colors.text

  const handleClose = () => {
    setDetailTopic(null)
    onClose()
  }

  const handleAskGrandma = () => {
    handleClose()
    afterSheets(() => router.push('/grandma-talk'))
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
            {birthTypes.map((item) => (
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
            {extraTopics.map((item, i) => (
              <DiffuseListRow
                key={item.key}
                title={item.title}
                sub={item.subtitle}
                icon={<Character name={BIRTH_TOPIC_CHARACTER[item.key]} size={26} color={dAccent} />}
                onPress={() => setDetailTopic(item.key)}
                showArrow
                last={i === extraTopics.length - 1}
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

  const soft = getModeColorSoft('preg', isDark)
  const hairline = colors.border
  const renderRow = (item: { key: BirthTopicKey; title: string; subtitle: string }, last: boolean) => (
    <Pressable
      key={item.key}
      onPress={() => setDetailTopic(item.key)}
      accessibilityRole="button"
      accessibilityLabel={`${item.title}. ${item.subtitle}`}
      style={({ pressed }) => [
        styles.lRow,
        { borderBottomColor: hairline, borderBottomWidth: last ? 0 : StyleSheet.hairlineWidth },
        pressed && { opacity: 0.7 },
      ]}
    >
      <View style={styles.lSticker}>
        <SiteSticker name={BIRTH_TOPIC_SITE_STICKER[item.key]} size={34} cut />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.lRowTitle, { color: ink, fontFamily: font.bodyBold }]}>{item.title}</Text>
        <Text style={[styles.lRowSub, { color: colors.textSecondary, fontFamily: font.body }]}>{item.subtitle}</Text>
      </View>
      <ChevronRight size={16} color={ink} strokeWidth={2.2} />
    </Pressable>
  )

  return (
    <>
      <SheetModal visible={visible} onClose={handleClose}>
        {(dragZone) => (
          <View
            style={[
              styles.sheet,
              {
                backgroundColor: colors.bg,
                borderColor: paperBorder,
                paddingBottom: insets.bottom + 16,
              },
            ]}
          >
            {/* Handle */}
            <View {...dragZone} style={styles.handleWrap}>
              <View style={[styles.handle, { backgroundColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(22,21,19,0.25)' }]} />
            </View>

            <View {...dragZone} style={styles.headerRow}>
              <View style={{ flex: 1 }}>
                <DetailSheetHeader
                  title={t('preg_birthGuide_title')}
                  sticker="books"
                  tone={soft}
                  onClose={handleClose}
                />
                <Text style={[styles.lSubtitle, { color: colors.textSecondary, fontFamily: font.body }]}>
                  {t('preg_birthGuide_subtitle')}
                </Text>
              </View>
            </View>

            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
            >
              <View>
                {birthTypes.map((item, i) => renderRow(item, i === birthTypes.length - 1))}
              </View>

              {/* Also in this guide */}
              <Text style={[styles.lEyebrow, { color: colors.textMuted }]}>
                {t('preg_birthGuide_alsoIn')}
              </Text>

              <View>
                {extraTopics.map((item, i) => renderRow(item, i === extraTopics.length - 1))}
              </View>
            </ScrollView>
          </View>
        )}
      </SheetModal>

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
    borderTopWidth: 2.5,
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
  lRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14 },
  lSticker: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  lRowTitle: { fontSize: 15 },
  lRowSub: { fontSize: 13, lineHeight: 18, marginTop: 2 },
  lSubtitle: { fontSize: 14, lineHeight: 20, marginBottom: 4 },
  lEyebrow: { fontFamily: 'SpaceMono_400Regular', fontSize: 10, letterSpacing: 1.4, textTransform: 'uppercase', marginTop: 28, marginBottom: 4 },
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
