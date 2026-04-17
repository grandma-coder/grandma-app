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
import { LinearGradient } from 'expo-linear-gradient'
import { X, ChevronRight, ArrowLeft } from 'lucide-react-native'
import { useTheme, brand } from '../../../constants/theme'
import { getWeekDetail, PrepItem } from '../../../lib/weekDetailData'
import { getWeekData } from '../../../lib/pregnancyData'

const SCREEN_W = Dimensions.get('window').width

interface Props {
  visible: boolean
  week: number
  onClose: () => void
}

const WEEK_EMOJI: Record<number, string> = {
  1: '🌱', 2: '🌱', 3: '🌱', 4: '🫘', 5: '🍎', 6: '🫛', 7: '🫐', 8: '🍇',
  9: '🍒', 10: '🍓', 11: '🍋', 12: '🍑', 13: '🍑', 14: '🍋', 15: '🍏',
  16: '🥑', 17: '🍐', 18: '🫑', 19: '🥭', 20: '🍌', 21: '🥕', 22: '🍈',
  23: '🍊', 24: '🌽', 25: '🫚', 26: '🥬', 27: '🥦', 28: '🍆', 29: '🎃',
  30: '🥬', 31: '🥥', 32: '🌰', 33: '🍍', 34: '🍈', 35: '🍈', 36: '🥬',
  37: '🥬', 38: '🌿', 39: '🍉', 40: '🎃',
}

function getTrimester(week: number): 1 | 2 | 3 {
  if (week <= 13) return 1
  if (week <= 26) return 2
  return 3
}

// ─── Prep Detail sub-sheet ────────────────────────────────────────────────────

interface PrepDetailProps {
  item: PrepItem
  onBack: () => void
}

function PrepDetailSheet({ item, onBack }: PrepDetailProps) {
  const { colors } = useTheme()
  return (
    <View style={[styles.prepDetailRoot, { backgroundColor: colors.bgWarm }]}>
      <Pressable onPress={onBack} style={styles.prepBackRow}>
        <ArrowLeft size={18} color={brand.pregnancy} strokeWidth={2} />
        <Text style={[styles.prepBackText, { color: brand.pregnancy }]}>Back</Text>
      </Pressable>

      <View style={[styles.prepDetailHeader, { backgroundColor: colors.surface }]}>
        <Text style={styles.prepDetailIcon}>{item.icon}</Text>
        <View style={styles.prepDetailHeaderText}>
          <Text style={[styles.prepDetailTitle, { color: colors.text }]}>{item.title}</Text>
          <Text style={[styles.prepDetailSummary, { color: colors.textSecondary }]}>{item.summary}</Text>
        </View>
      </View>

      <ScrollView style={styles.prepDetailBody} showsVerticalScrollIndicator={false}>
        <Text style={[styles.prepDetailContent, { color: colors.textSecondary }]}>
          {item.detail}
        </Text>
      </ScrollView>
    </View>
  )
}

// ─── Main WeekDetailModal ─────────────────────────────────────────────────────

export function WeekDetailModal({ visible, week, onClose }: Props) {
  const { colors } = useTheme()
  const [selectedPrep, setSelectedPrep] = useState<PrepItem | null>(null)

  const weekData = getWeekData(week)
  const detail = getWeekDetail(week)
  const tri = getTrimester(week)
  const emoji = WEEK_EMOJI[week] ?? '👶'

  const gradientColors: [string, string] =
    tri === 1 ? ['#1A2A4A', '#2D4A8A']
    : tri === 2 ? ['#2A1050', '#5C2FA8']
    : ['#2A0A3A', '#7B1FA2']

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
        <Pressable style={styles.overlayBg} onPress={() => {
          if (selectedPrep) setSelectedPrep(null)
          else onClose()
        }} />

        <View style={[styles.sheet, { backgroundColor: colors.bgWarm }]}>
          <View style={styles.handle} />

          {/* Prep detail sub-screen */}
          {selectedPrep ? (
            <PrepDetailSheet item={selectedPrep} onBack={() => setSelectedPrep(null)} />
          ) : (
            <>
              {/* Header close */}
              <Pressable onPress={onClose} style={styles.closeBtn}>
                <X size={18} color={colors.textMuted} strokeWidth={2} />
              </Pressable>

              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                {/* Mini hero */}
                <LinearGradient colors={gradientColors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.miniHero}>
                  <Text style={styles.miniHeroEmoji}>{emoji}</Text>
                  <View style={styles.miniHeroText}>
                    <Text style={styles.miniHeroWeek}>Week {week}</Text>
                    <Text style={styles.miniHeroSub}>
                      {weekData.babySize} · {weekData.babyLength} · {weekData.babyWeight}
                    </Text>
                    <Text style={[styles.miniHeroTri, { color: brand.pregnancy }]}>
                      {tri === 1 ? '🌱 First Trimester' : tri === 2 ? '🌙 Second Trimester' : '⭐ Third Trimester'}
                    </Text>
                  </View>
                </LinearGradient>

                {/* Development */}
                <View style={styles.section}>
                  <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>BABY'S DEVELOPMENT</Text>
                  {detail.developmentPoints.map((point, i) => (
                    <View key={i} style={styles.devRow}>
                      <View style={[styles.devDot, { backgroundColor: brand.pregnancy }]} />
                      <Text style={[styles.devText, { color: colors.textSecondary }]}>{point}</Text>
                    </View>
                  ))}
                </View>

                {/* Common symptoms */}
                <View style={styles.section}>
                  <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>COMMON SYMPTOMS</Text>
                  <View style={styles.chipsRow}>
                    {detail.symptoms.map((sym) => (
                      <View key={sym} style={[styles.symChip, { backgroundColor: colors.surfaceGlass, borderColor: colors.border }]}>
                        <Text style={[styles.symChipText, { color: colors.textSecondary }]}>{sym}</Text>
                      </View>
                    ))}
                  </View>
                </View>

                {/* What to prepare */}
                {detail.prepItems.length > 0 && (
                  <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>WHAT TO PREPARE</Text>
                    {detail.prepItems.map((item) => (
                      <Pressable
                        key={item.id}
                        onPress={() => setSelectedPrep(item)}
                        style={({ pressed }) => [
                          styles.prepRow,
                          { backgroundColor: colors.surface, opacity: pressed ? 0.75 : 1 },
                        ]}
                      >
                        <Text style={styles.prepIcon}>{item.icon}</Text>
                        <View style={styles.prepBody}>
                          <Text style={[styles.prepTitle, { color: colors.text }]}>{item.title}</Text>
                          <Text style={[styles.prepSummary, { color: colors.textMuted }]}>{item.summary}</Text>
                        </View>
                        <ChevronRight size={16} color={brand.pregnancy} strokeWidth={2} />
                      </Pressable>
                    ))}
                  </View>
                )}

                {/* Grandma's tip */}
                <View style={styles.section}>
                  <View style={[styles.grandmaTip, { backgroundColor: colors.surfaceGlass, borderColor: 'rgba(185,131,255,0.2)' }]}>
                    <Text style={styles.grandmaEmoji}>👵</Text>
                    <Text style={[styles.grandmaTipText, { color: colors.textSecondary }]}>
                      "{detail.grandmaTip}"
                    </Text>
                  </View>
                </View>

                <View style={{ height: 20 }} />
              </ScrollView>
            </>
          )}
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  overlayBg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  sheet: {
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    maxHeight: '88%',
    paddingTop: 12,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignSelf: 'center',
    marginBottom: 8,
  },
  closeBtn: {
    position: 'absolute',
    top: 12,
    right: 20,
    padding: 8,
    zIndex: 10,
  },
  scrollContent: {
    paddingBottom: 40,
  },

  miniHero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    margin: 16,
    borderRadius: 20,
    padding: 16,
  },
  miniHeroEmoji: { fontSize: 48 },
  miniHeroText: { flex: 1 },
  miniHeroWeek: {
    fontSize: 20,
    fontFamily: 'CabinetGrotesk-Black',
    color: '#FFFFFF',
  },
  miniHeroSub: {
    fontSize: 12,
    fontFamily: 'Satoshi-Variable',
    color: 'rgba(255,255,255,0.6)',
    marginTop: 2,
  },
  miniHeroTri: {
    fontSize: 12,
    fontFamily: 'Satoshi-Variable',
    fontWeight: '600',
    marginTop: 4,
  },

  section: { paddingHorizontal: 20, marginTop: 20 },
  sectionTitle: {
    fontSize: 11,
    fontFamily: 'Satoshi-Variable',
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 12,
  },

  devRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 8,
  },
  devDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 6,
    flexShrink: 0,
  },
  devText: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Satoshi-Variable',
    lineHeight: 20,
  },

  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  symChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  symChipText: {
    fontSize: 12,
    fontFamily: 'Satoshi-Variable',
    fontWeight: '600',
  },

  prepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    padding: 14,
    marginBottom: 8,
    gap: 12,
  },
  prepIcon: { fontSize: 24 },
  prepBody: { flex: 1 },
  prepTitle: {
    fontSize: 14,
    fontFamily: 'Satoshi-Variable',
    fontWeight: '700',
    marginBottom: 2,
  },
  prepSummary: {
    fontSize: 12,
    fontFamily: 'Satoshi-Variable',
    lineHeight: 16,
  },

  grandmaTip: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
  },
  grandmaEmoji: { fontSize: 28 },
  grandmaTipText: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Satoshi-Variable',
    fontStyle: 'italic',
    lineHeight: 20,
  },

  // Prep detail sub-screen
  prepDetailRoot: { flex: 1, padding: 20 },
  prepBackRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 16 },
  prepBackText: { fontSize: 14, fontFamily: 'Satoshi-Variable', fontWeight: '700' },
  prepDetailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
  },
  prepDetailIcon: { fontSize: 36 },
  prepDetailHeaderText: { flex: 1 },
  prepDetailTitle: {
    fontSize: 16,
    fontFamily: 'CabinetGrotesk-Black',
    marginBottom: 4,
  },
  prepDetailSummary: {
    fontSize: 13,
    fontFamily: 'Satoshi-Variable',
    lineHeight: 18,
  },
  prepDetailBody: { flex: 1 },
  prepDetailContent: {
    fontSize: 15,
    fontFamily: 'Satoshi-Variable',
    lineHeight: 24,
  },
})
