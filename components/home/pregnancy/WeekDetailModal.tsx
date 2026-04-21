/**
 * WeekDetailModal — pregnancy week detail sheet (v3, latest)
 *
 * Ported from pregnancy-weeks.html `.popup-*` styles:
 *  - Peach/colored hero matching the card's palette
 *  - Cream/paper body with 3 sections:
 *      · BABY'S DEVELOPMENT (bullets with accent dots)
 *      · COMMON SYMPTOMS (pills)
 *      · WHAT TO PREPARE (action cards with colored icon squares)
 */

import React, { useState } from 'react'
import {
  View,
  Text,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Dimensions,
} from 'react-native'
import { X, ArrowLeft, ChevronRight } from 'lucide-react-native'
import { useTheme } from '../../../constants/theme'
import { getWeekData } from '../../../lib/pregnancyData'
import { getWeekStat, formatWeight } from '../../../lib/weekStats'
import { getWeekContent, PrepItemDef } from '../../../lib/weekContent'
import { StickerIcon } from './stickerIcons'

const SCREEN_H = Dimensions.get('window').height

interface Props {
  visible: boolean
  week: number
  onClose: () => void
}

function getTrimester(week: number): 1 | 2 | 3 {
  if (week <= 13) return 1
  if (week <= 26) return 2
  return 3
}
const TRI_NAMES = ['First', 'Second', 'Third'] as const

interface HeroPalette {
  bg: string
  fg: string
  metaFg: string
  accent: string    // dev dot + icon square bg
  accentSoft: string
}

// Palettes from pregnancy-weeks.html — keyed to the card's cycling bg.
// accent/accentSoft pairs mirror the popup's dev-dot and icon-square tints.
const PALETTES: HeroPalette[] = [
  { // 0 — deep purple
    bg: '#2A1F4A', fg: '#FFFEF8', metaFg: '#E9DFFF',
    accent: '#F5D652', accentSoft: '#FBEA9E',
  },
  { // 1 — cream
    bg: '#FFFEF8', fg: '#141313', metaFg: '#6B5E56',
    accent: '#EE7B6D', accentSoft: '#F9D6C0',
  },
  { // 2 — peach
    bg: '#F5B896', fg: '#141313', metaFg: '#5A3A24',
    accent: '#B983FF', accentSoft: '#E0D5F3',
  },
  { // 3 — coral
    bg: '#EE7B6D', fg: '#FFFEF8', metaFg: '#FFE6E0',
    accent: '#BDD48C', accentSoft: '#DDE7BB',
  },
  { // 4 — green
    bg: '#BDD48C', fg: '#141313', metaFg: '#3E5A20',
    accent: '#7048B8', accentSoft: '#E0D5F3',
  },
]
function paletteForWeek(week: number): HeroPalette {
  return PALETTES[(week - 1) % PALETTES.length]
}

// ─── Prep Detail sub-sheet ────────────────────────────────────────────────────

function PrepDetailSheet({
  item,
  onBack,
  accent,
  accentSoft,
}: { item: PrepItemDef; onBack: () => void; accent: string; accentSoft: string }) {
  const { colors } = useTheme()
  return (
    <View style={[styles.prepDetailRoot, { backgroundColor: colors.bg }]}>
      <Pressable onPress={onBack} style={styles.prepBackRow} hitSlop={8}>
        <ArrowLeft size={18} color={accent} strokeWidth={2} />
        <Text style={[styles.prepBackText, { color: accent }]}>Back</Text>
      </Pressable>

      <View style={[styles.prepDetailHeader, { backgroundColor: colors.surface }]}>
        <View style={[styles.prepIconBox, { backgroundColor: accentSoft }]}>
          <StickerIcon name={item.i} size={36} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.prepDetailTitle, { color: colors.text }]}>{item.t}</Text>
          <Text style={[styles.prepDetailSummary, { color: colors.textSecondary }]}>
            {item.d}
          </Text>
        </View>
      </View>

      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
        <Text style={[styles.prepDetailContent, { color: colors.textSecondary }]}>
          {item.d}
        </Text>
      </ScrollView>
    </View>
  )
}

// ─── Main WeekDetailModal ─────────────────────────────────────────────────────

export function WeekDetailModal({ visible, week, onClose }: Props) {
  const { colors, isDark } = useTheme()
  const [selectedPrep, setSelectedPrep] = useState<PrepItemDef | null>(null)

  const weekData = getWeekData(week)
  const content = getWeekContent(week)
  const stat = getWeekStat(week)
  const pal = paletteForWeek(week)
  const tri = getTrimester(week)

  const weekStr = String(week).padStart(2, '0')
  const lengthStr = `${stat.cm}cm`
  const weightStr = formatWeight(stat.g)
  const fruitName = weekData.babySize.toLowerCase()
  const article = /^[aeiou]/i.test(fruitName) ? 'an' : 'a'

  // Cream paper body background — adapts to dark mode
  const paperBg = isDark ? colors.surface : '#FFFEF8'
  const pillBg = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(20,19,19,0.05)'
  const pillBorder = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(20,19,19,0.14)'
  const prepCardBg = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(20,19,19,0.035)'
  const prepCardBorder = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(20,19,19,0.08)'
  const bodyInk = isDark ? colors.text : '#141313'
  const bodyInk2 = isDark ? colors.textSecondary : '#3A3533'
  const bodyInk3 = isDark ? colors.textMuted : '#6E6763'

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={() => {
        if (selectedPrep) setSelectedPrep(null)
        else onClose()
      }}
    >
      <View style={styles.overlay}>
        <Pressable
          style={styles.overlayBg}
          onPress={() => (selectedPrep ? setSelectedPrep(null) : onClose())}
        />

        <View style={[styles.sheet, { backgroundColor: paperBg }]}>
          {selectedPrep ? (
            <PrepDetailSheet
              item={selectedPrep}
              onBack={() => setSelectedPrep(null)}
              accent={pal.accent}
              accentSoft={pal.accentSoft}
            />
          ) : (
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 36 }}>
              {/* Hero — inherits card's palette */}
              <View style={[styles.hero, { backgroundColor: pal.bg }]}>
                <Pressable onPress={onClose} style={styles.closeBtn} hitSlop={10}>
                  <X size={18} color="#141313" strokeWidth={2.5} />
                </Pressable>

                <Text style={[styles.heroLabel, { color: pal.metaFg }]}>
                  WEEK {week} · {TRI_NAMES[tri - 1].toUpperCase()} TRIMESTER
                </Text>

                <Text style={[styles.heroMega, { color: pal.fg }]}>{weekStr}</Text>

                <View style={styles.heroSizeRow}>
                  <Text style={[styles.heroSize, { color: pal.fg }]}>
                    {article}{' '}
                    <Text style={styles.heroSizeBold}>{fruitName}</Text>
                  </Text>
                  <Text style={[styles.heroSizeDot, { color: pal.fg }]}>·</Text>
                  <View style={styles.heroStatBox}>
                    <View style={[styles.heroStatTick, { backgroundColor: pal.fg }]} />
                    <Text style={[styles.heroStat, { color: pal.fg }]}>{lengthStr}</Text>
                  </View>
                  <Text style={[styles.heroSizeDot, { color: pal.fg }]}>·</Text>
                  <View style={styles.heroStatBox}>
                    <View style={[styles.heroStatTick, { backgroundColor: pal.fg }]} />
                    <Text style={[styles.heroStat, { color: pal.fg }]}>{weightStr}</Text>
                  </View>
                </View>
              </View>

              <View style={styles.body}>
                {/* Baby's Development */}
                <View style={styles.section}>
                  <Text style={[styles.sectionTitle, { color: bodyInk3 }]}>BABY'S DEVELOPMENT</Text>
                  {content.dev.map((point, i) => (
                    <View key={i} style={styles.devRow}>
                      <View style={[styles.devDot, { backgroundColor: pal.accent }]} />
                      <Text style={[styles.devText, { color: bodyInk2 }]}>{point}</Text>
                    </View>
                  ))}
                </View>

                {/* Common Symptoms */}
                <View style={styles.section}>
                  <Text style={[styles.sectionTitle, { color: bodyInk3 }]}>COMMON SYMPTOMS</Text>
                  <View style={styles.pillsRow}>
                    {content.sym.map((sym) => (
                      <View
                        key={sym}
                        style={[styles.pill, { backgroundColor: pillBg, borderColor: pillBorder }]}
                      >
                        <Text style={[styles.pillText, { color: bodyInk2 }]}>{sym}</Text>
                      </View>
                    ))}
                  </View>
                </View>

                {/* What to Prepare */}
                {content.prep.length > 0 && (
                  <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: bodyInk3 }]}>WHAT TO PREPARE</Text>
                    {content.prep.map((item, i) => (
                      <Pressable
                        key={`${item.i}-${i}`}
                        onPress={() => setSelectedPrep(item)}
                        style={({ pressed }) => [
                          styles.prepCard,
                          {
                            backgroundColor: prepCardBg,
                            borderColor: prepCardBorder,
                            opacity: pressed ? 0.7 : 1,
                          },
                        ]}
                      >
                        <View style={[styles.prepIconBox, { backgroundColor: pal.accentSoft }]}>
                          <StickerIcon name={item.i} size={34} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.prepTitle, { color: bodyInk }]}>{item.t}</Text>
                          <Text style={[styles.prepDesc, { color: bodyInk3 }]}>{item.d}</Text>
                        </View>
                        <ChevronRight size={18} color={bodyInk3} strokeWidth={2} />
                      </Pressable>
                    ))}
                  </View>
                )}
              </View>
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  overlayBg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(20,19,19,0.55)',
  },
  sheet: {
    maxHeight: SCREEN_H * 0.92,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    overflow: 'hidden',
  },

  // Hero
  hero: {
    paddingTop: 30,
    paddingBottom: 26,
    paddingHorizontal: 28,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    position: 'relative',
  },
  closeBtn: {
    position: 'absolute',
    top: 14,
    right: 16,
    width: 36,
    height: 36,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,254,248,0.85)',
    zIndex: 2,
  },
  heroLabel: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 10.5,
    letterSpacing: 2.3,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  heroMega: {
    fontFamily: 'Fraunces_700Bold',
    fontSize: 58,
    fontWeight: '700',
    letterSpacing: -2.6,
    lineHeight: 58,
    marginBottom: 12,
  },
  heroSizeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'baseline',
    gap: 10,
  },
  heroSize: {
    fontFamily: 'Fraunces_500Medium',
    fontSize: 22,
    letterSpacing: -0.4,
  },
  heroSizeBold: {
    fontFamily: 'InstrumentSerif_400Regular_Italic',
    fontStyle: 'italic',
  },
  heroSizeDot: { fontSize: 18, opacity: 0.5 },
  heroStatBox: {
    paddingTop: 8,
    alignItems: 'flex-start',
  },
  heroStatTick: {
    width: 36,
    height: 1.5,
    marginBottom: 8,
    opacity: 0.85,
  },
  heroStat: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 15,
    opacity: 0.9,
  },

  // Body
  body: {
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  section: { marginBottom: 26 },
  sectionTitle: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 10.5,
    letterSpacing: 2.3,
    textTransform: 'uppercase',
    marginBottom: 14,
  },

  // Development
  devRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    paddingLeft: 2,
  },
  devDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 8,
    marginRight: 14,
  },
  devText: {
    flex: 1,
    fontFamily: 'DMSans_400Regular',
    fontSize: 15,
    lineHeight: 22,
  },

  // Symptom pills
  pillsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
  pillText: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 13,
  },

  // Prep cards
  prepCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 12,
    paddingLeft: 12,
    paddingRight: 16,
    borderRadius: 18,
    borderWidth: 1,
    marginBottom: 10,
  },
  prepIconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  prepIcon: { fontSize: 24 },
  prepTitle: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 15,
    marginBottom: 2,
    lineHeight: 19,
  },
  prepDesc: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    lineHeight: 18,
  },

  // Prep drill-down sub-sheet
  prepDetailRoot: {
    minHeight: SCREEN_H * 0.7,
    padding: 24,
  },
  prepBackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    alignSelf: 'flex-start',
  },
  prepBackText: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 14,
  },
  prepDetailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    borderRadius: 20,
    marginTop: 10,
    marginBottom: 18,
  },
  prepDetailIcon: { fontSize: 32 },
  prepDetailTitle: {
    fontFamily: 'Fraunces_600SemiBold',
    fontSize: 20,
    marginBottom: 2,
  },
  prepDetailSummary: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    lineHeight: 18,
  },
  prepDetailContent: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 15,
    lineHeight: 24,
  },
})
