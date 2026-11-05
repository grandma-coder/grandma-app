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

import React, { useEffect, useState } from 'react'
import {
  View,
  Text,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Dimensions,
} from 'react-native'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated'
import { X, ArrowLeft, ChevronRight } from 'lucide-react-native'
import { InkBackButton } from '../../ui/InkBackButton'
import { useTheme, font, useDiffuseTheme, diffuseFont, getDiffuseAccent, getModeField, getModeColorSoft } from '../../../constants/theme'
import { useIsDiffuse, SoftBloom, DiffuseGrain } from '../../ui/diffuse/DiffuseKit'
import { DiffuseBloomIcon } from '../../ui/diffuse/DiffusePrimitives'
import { useTranslation, type TranslationKey } from '../../../lib/i18n'
import { useLanguageStore } from '../../../store/useLanguageStore'
import { getWeekData } from '../../../lib/pregnancyData'
import { getWeekStat, formatWeight } from '../../../lib/weekStats'
import { getWeekContent, PrepItemDef } from '../../../lib/weekContent'
import { localizedWeekContent, localizedPrepGuide } from '../../../lib/pregnancyContent'
import { StickerIcon } from './stickerIcons'
import { BabyIllustration } from './babyIllustrations'
import { localizeBabySizeName } from '../../../lib/pregnancyData'
import { SheetModal } from '../../ui/SheetModal'

const SCREEN_W = Dimensions.get('window').width
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
  { // 0 — lilac (bg: stickers.lilacSoft, fg/metaFg: stickers.lilacInk)
    bg: '#E3D8F2', fg: '#141313', metaFg: '#3A2A6E',
    accent: '#9A7A1F', accentSoft: '#FBEA9E',
  },
  { // 1 — cream
    bg: '#FFFEF8', fg: '#141313', metaFg: '#6B5E56',
    accent: '#EE7B6D', accentSoft: '#F9D6C0',
  },
  { // 2 — peach
    bg: '#F5B896', fg: '#141313', metaFg: '#5A3A24',
    accent: '#7048B8', accentSoft: '#E0D5F3', // accent: brand.primary (was neon #B983FF)
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

// ─── Main-sheet row helpers (each wraps one hook call — see AccordionItem
// pattern in BirthDetailModal.tsx for why this can't live inline in a .map) ──

function DevPointRow({
  point,
  dotColor,
  textColor,
}: { point: string; dotColor: string; textColor: string }) {
  const diffuse = useIsDiffuse()
  const text = point
  return (
    <View style={styles.devRow}>
      <View style={[styles.devDot, { backgroundColor: dotColor }]} />
      <Text style={[styles.devText, { color: textColor }, diffuse ? { fontFamily: diffuseFont.body } : null]}>{text}</Text>
    </View>
  )
}

function PrepListRow({
  item,
  cardBg,
  cardBorder,
  iconBg,
  titleColor,
  descColor,
  chevronColor,
  accent,
  onPress,
}: {
  item: PrepItemDef
  cardBg: string
  cardBorder: string
  iconBg: string
  titleColor: string
  descColor: string
  chevronColor: string
  accent: string
  onPress: () => void
}) {
  const diffuse = useIsDiffuse()
  const desc = item.d
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={item.t}
      style={({ pressed }) => [
        styles.prepCard,
        { backgroundColor: cardBg, borderColor: cardBorder, opacity: pressed ? 0.7 : 1 },
        diffuse ? null : styles.prepCardCalm,
      ]}
    >
      {diffuse ? (
        <DiffuseBloomIcon color={accent} size={44}>
          <StickerIcon name={item.i} size={30} />
        </DiffuseBloomIcon>
      ) : (
        <View style={[styles.prepIconBox, { backgroundColor: iconBg, width: 44, height: 44 }]}>
          <StickerIcon name={item.i} size={38} />
        </View>
      )}
      <View style={{ flex: 1 }}>
        <Text style={[styles.prepTitle, { color: titleColor }, diffuse ? { fontFamily: diffuseFont.bodySemiBold } : null]}>{item.t}</Text>
        <Text style={[styles.prepDesc, { color: descColor }, diffuse ? { fontFamily: diffuseFont.body } : null]}>{desc}</Text>
      </View>
      <ChevronRight size={18} color={diffuse ? chevronColor : titleColor} strokeWidth={2} />
    </Pressable>
  )
}

function PrepDetailSheet({
  item,
  englishItem,
  onBack,
  accent,
  accentSoft,
}: { item: PrepItemDef; englishItem: PrepItemDef; onBack: () => void; accent: string; accentSoft: string }) {
  const { colors, isDark } = useTheme()
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
  const { t } = useTranslation()
  const lang = useLanguageStore((s) => s.language)
  const guide = localizedPrepGuide(englishItem, lang)
  const ink = diffuse ? dt.colors.ink : colors.text
  const ink2 = diffuse ? dt.colors.ink2 : colors.textSecondary
  const ink3 = diffuse ? dt.colors.ink3 : colors.textMuted
  const rootBg = diffuse ? dt.colors.bg : colors.bg
  const headerBg = diffuse ? dt.colors.surface : 'transparent'

  const prepSummary = item.d
  const prepWhy = guide.why
  const prepWatch = guide.watch ?? ''

  return (
    <View style={[styles.prepDetailRoot, { backgroundColor: rootBg }]}>
      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.prepDetailScroll}
      >
        <Pressable
          onPress={onBack}
          style={styles.prepBackRow}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={t('common_back')}
        >
          <ArrowLeft size={18} color={accent} strokeWidth={2} />
          <Text style={[styles.prepBackText, { color: accent }, diffuse ? { fontFamily: diffuseFont.mono, fontSize: 12, letterSpacing: 1.5, textTransform: 'uppercase' } : null]}>{t('common_back')}</Text>
        </Pressable>

        <View style={[styles.prepDetailHeader, { backgroundColor: headerBg }, diffuse ? { borderWidth: 1, borderColor: dt.colors.line } : { padding: 0, borderRadius: 0 }]}>
          {diffuse ? (
            <DiffuseBloomIcon color={accent} size={48}>
              <StickerIcon name={item.i} size={34} />
            </DiffuseBloomIcon>
          ) : (
            <View style={[styles.prepIconBox, { backgroundColor: 'transparent', width: 52, height: 52 }]}>
              <StickerIcon name={item.i} size={46} />
            </View>
          )}
          <View style={{ flex: 1 }}>
            <Text style={[styles.prepDetailTitle, { color: ink }, diffuse ? { fontFamily: diffuseFont.display } : { textTransform: 'uppercase', letterSpacing: 0.3 }]}>{item.t}</Text>
            <Text style={[styles.prepDetailSummary, { color: ink3 }, diffuse ? { fontFamily: diffuseFont.body } : null]}>
              {prepSummary}
            </Text>
          </View>
        </View>

        <Text style={[styles.prepSectionTitle, { color: ink3 }, diffuse ? { fontFamily: diffuseFont.mono } : styles.monoEyebrow]}>{t('preg_weekDetail_prep_whyNow')}</Text>
        <Text style={[styles.prepDetailContent, { color: ink2 }, diffuse ? { fontFamily: diffuseFont.body } : null]}>
          {prepWhy}
        </Text>

        <Text style={[styles.prepSectionTitle, { color: ink3, marginTop: 22 }, diffuse ? { fontFamily: diffuseFont.mono } : styles.monoEyebrow]}>{t('preg_weekDetail_prep_howToDoIt')}</Text>
        {guide.how.map((step, i) => (
          <PrepStepRow key={i} step={step} accent={accent} textColor={ink2} />
        ))}

        {guide.watch ? (
          <>
            <Text style={[styles.prepSectionTitle, { color: ink3, marginTop: 22 }, diffuse ? { fontFamily: diffuseFont.mono } : styles.monoEyebrow]}>{t('preg_weekDetail_prep_watchFor')}</Text>
            <View style={[styles.prepWatchBox, diffuse ? { backgroundColor: dt.colors.surface, borderColor: dt.colors.line } : { backgroundColor: accentSoft, borderColor: ink, borderWidth: 1.5 }]}>
              <Text style={[styles.prepDetailContent, { color: ink2 }, diffuse ? { fontFamily: diffuseFont.body } : null]}>{prepWatch}</Text>
            </View>
          </>
        ) : null}
      </ScrollView>
    </View>
  )
}

function PrepStepRow({
  step,
  accent,
  textColor,
}: { step: string; accent: string; textColor: string }) {
  const diffuse = useIsDiffuse()
  const text = step
  return (
    <View style={styles.prepStepRow}>
      <View style={[styles.prepStepDot, { backgroundColor: accent }]} />
      <Text style={[styles.prepStepText, { color: textColor }, diffuse ? { fontFamily: diffuseFont.body } : null]}>{text}</Text>
    </View>
  )
}

// ─── Main WeekDetailModal ─────────────────────────────────────────────────────

export function WeekDetailModal({ visible, week, onClose }: Props) {
  const { colors, isDark } = useTheme()
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
  const { t } = useTranslation()
  const lang = useLanguageStore((st) => st.language)
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null)
  // Keep the last prep item rendered while sliding back so the animation has content
  const [pendingIdx, setPendingIdx] = useState<number | null>(null)
  const slide = useSharedValue(0) // 0 = main, 1 = prep detail

  useEffect(() => {
    if (selectedIdx != null) {
      setPendingIdx(selectedIdx)
      slide.value = withTiming(1, { duration: 280, easing: Easing.out(Easing.cubic) })
    } else {
      slide.value = withTiming(0, { duration: 260, easing: Easing.out(Easing.cubic) }, (finished) => {
        if (finished) {
          // Clear pending after the animation completes (runs on UI thread → defer to JS)
        }
      })
      // Clear after the animation duration so the view stays mounted while sliding back
      const t = setTimeout(() => setPendingIdx(null), 280)
      return () => clearTimeout(t)
    }
  }, [selectedIdx, slide])

  const mainAnimStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: -slide.value * SCREEN_W * 0.25 }],
    opacity: 1 - slide.value * 0.4,
  }))

  const prepAnimStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: (1 - slide.value) * SCREEN_W }],
  }))

  const weekData = getWeekData(week)
  const content = localizedWeekContent(week, lang)
  const enContent = getWeekContent(week)
  const selectedPrep = selectedIdx != null ? content.prep[selectedIdx] ?? null : null
  const setSelectedPrep = (_: null) => setSelectedIdx(null)
  const pendingPrep = pendingIdx != null ? content.prep[pendingIdx] ?? null : null
  const stat = getWeekStat(week)
  const tri = getTrimester(week)

  const weekStr = String(week).padStart(2, '0')
  const lengthStr = `${stat.cm}cm`
  const weightStr = formatWeight(stat.g)
  const fruitName = localizeBabySizeName(weekData.babySize).toLowerCase()
  // English reads "a lime" / "an apple"; other languages show the bare name (gendered articles differ).
  const article = lang === 'en' ? (/^[aeiou]/i.test(fruitName) ? 'an ' : 'a ') : ''

  // Same proportional scaling as WeekCard.illustrationSize, capped at 130 for the smaller hero.
  const cm = stat.cm > 0 ? stat.cm : 0
  const fruitSize = (() => {
    const min = 22
    const max = 130
    if (cm <= 0) return min
    const t = Math.min(1, Math.sqrt(cm / 51))
    return min + (max - min) * t
  })()

  // Diffuse-resolved accent + field (warm plum + peach→plum stops).
  const dAccent = getDiffuseAccent('preg', dt.isDark)
  const [dField1, dField2] = getModeField('preg', dt.isDark)

  // Cream paper body background — adapts to dark mode
  const paperBg = diffuse ? dt.colors.bg : colors.bg
  const pillBg = diffuse ? 'transparent' : colors.surface
  const pillBorder = diffuse ? dt.colors.line2 : colors.text
  const prepCardBg = diffuse ? dt.colors.surface : 'transparent'
  const prepCardBorder = diffuse ? dt.colors.line : colors.border
  const bodyInk = diffuse ? dt.colors.ink : colors.text
  const bodyInk2 = diffuse ? dt.colors.ink2 : colors.textSecondary
  const bodyInk3 = diffuse ? dt.colors.ink3 : colors.textMuted
  // Under Diffuse: dev dots + prep icon socket use the accent, not the palette hue.
  const devDotColor = diffuse ? dAccent : colors.text
  const prepIconBg = diffuse ? dAccent : 'transparent'
  // Hero: colored palette bg (current) → soft paper + accent bloom (Diffuse).
  const heroBg = diffuse ? dt.colors.surface : getModeColorSoft('preg', isDark)
  const heroMetaFg = diffuse ? dt.colors.ink3 : colors.textSecondary
  const heroFg = diffuse ? dt.colors.ink : colors.text
  const heroCloseIcon = diffuse ? dt.colors.ink : '#141313'

  const renderSheet = (dragZone: object = {}) => (
    <View style={[styles.sheet, { backgroundColor: paperBg }, diffuse ? null : { borderTopWidth: 2.5, borderColor: colors.text, borderTopLeftRadius: 26, borderTopRightRadius: 26 }]}>
      <Animated.View style={[styles.layer, mainAnimStyle]} pointerEvents={selectedPrep ? 'none' : 'auto'}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 36 }}>
          {/* Hero — inherits card's palette (current) / soft accent field (Diffuse) */}
          <View style={[styles.hero, { backgroundColor: heroBg }, diffuse ? { borderBottomWidth: 1, borderBottomColor: dt.colors.line } : { borderBottomWidth: 1.5, borderBottomColor: colors.text, borderTopLeftRadius: 24, borderTopRightRadius: 24 }]}>
            {diffuse ? (
              <>
                <SoftBloom color={dField1} cx="88%" cy="18%" opacity={dt.isDark ? 0.32 : 0.46} spread={0.5} />
                <SoftBloom color={dField2} cx="62%" cy="46%" opacity={dt.isDark ? 0.2 : 0.28} spread={0.5} />
                <DiffuseGrain opacity={0.04} />
              </>
            ) : null}
            {diffuse ? (
              <Pressable
                onPress={onClose}
                style={[styles.closeBtn, { backgroundColor: 'transparent', borderWidth: 1, borderColor: dt.colors.hairline }]}
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel={t('sw4_closeWeekDetails')}
              >
                <X size={18} color={heroCloseIcon} strokeWidth={2.5} />
              </Pressable>
            ) : (
              <View style={styles.closeCalm}>
                <InkBackButton onPress={onClose} ink={colors.text} paper={colors.surface} icon="close" label={t('sw4_closeWeekDetails')} style={{ marginBottom: 0 }} />
              </View>
            )}

            {/* Static baby-size illustration — proportional to actual size, like the WeekCard */}
            <View style={styles.heroFruit} pointerEvents="none">
              <BabyIllustration week={week} size={fruitSize} />
            </View>

            <Text style={[styles.heroLabel, { color: heroMetaFg }, diffuse ? { fontFamily: diffuseFont.mono, letterSpacing: 1.6 } : styles.monoEyebrow]}>
              {t(`preg_weekDetail_heroLabel_t${tri}` as TranslationKey, { week })}
            </Text>

            <Text style={[styles.heroMega, { color: heroFg }, diffuse ? { fontFamily: diffuseFont.displayLight, fontWeight: '300' } : null]}>{weekStr}</Text>

            <View style={styles.heroSizeRow}>
              <Text style={[styles.heroSize, { color: heroFg }, diffuse ? { fontFamily: diffuseFont.display } : null]}>
                {article}
                <Text style={[styles.heroSizeBold, diffuse ? { fontFamily: diffuseFont.italic } : null]}>{fruitName}</Text>
              </Text>
              <Text style={[styles.heroSizeDot, { color: heroFg }]}>{t('common_dotSeparator')}</Text>
              <View style={styles.heroStatBox}>
                {diffuse ? <View style={[styles.heroStatTick, { backgroundColor: dAccent }]} /> : null}
                <Text style={[styles.heroStat, { color: heroFg }, diffuse ? { fontFamily: diffuseFont.mono, fontSize: 13 } : null]}>{lengthStr}</Text>
              </View>
              <Text style={[styles.heroSizeDot, { color: heroFg }]}>{t('common_dotSeparator')}</Text>
              <View style={styles.heroStatBox}>
                {diffuse ? <View style={[styles.heroStatTick, { backgroundColor: dAccent }]} /> : null}
                <Text style={[styles.heroStat, { color: heroFg }, diffuse ? { fontFamily: diffuseFont.mono, fontSize: 13 } : null]}>{weightStr}</Text>
              </View>
            </View>
          </View>

          <View style={styles.body}>
            {/* Baby's Development */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: bodyInk3 }, diffuse ? { fontFamily: diffuseFont.mono } : styles.monoEyebrow]}>{t('preg_weekDetail_babyDevelopment')}</Text>
              {content.dev.map((point, i) => (
                <DevPointRow key={i} point={point} dotColor={devDotColor} textColor={bodyInk2} />
              ))}
            </View>

            {/* Common Symptoms */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: bodyInk3 }, diffuse ? { fontFamily: diffuseFont.mono } : styles.monoEyebrow]}>{t('preg_weekDetail_commonSymptoms')}</Text>
              <View style={styles.pillsRow}>
                {content.sym.map((sym) => (
                  <View
                    key={sym}
                    style={[styles.pill, { backgroundColor: pillBg, borderColor: pillBorder }, diffuse ? null : { borderWidth: 1.5 }]}
                  >
                    <Text style={[styles.pillText, { color: bodyInk2 }, diffuse ? { fontFamily: diffuseFont.mono, fontSize: 11, letterSpacing: 0.4, textTransform: 'uppercase' } : null]}>{sym}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* What to Prepare */}
            {content.prep.length > 0 && (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: bodyInk3 }, diffuse ? { fontFamily: diffuseFont.mono } : styles.monoEyebrow]}>{t('preg_weekDetail_whatToPrepare')}</Text>
                {content.prep.map((item, i) => (
                  <PrepListRow
                    key={`${item.i}-${i}`}
                    item={item}
                    cardBg={prepCardBg}
                    cardBorder={prepCardBorder}
                    iconBg={prepIconBg}
                    titleColor={bodyInk}
                    descColor={bodyInk3}
                    chevronColor={bodyInk3}
                    accent={dAccent}
                    onPress={() => setSelectedIdx(i)}
                  />
                ))}
              </View>
            )}
          </View>
        </ScrollView>
      </Animated.View>

      <Animated.View
        style={[styles.layer, prepAnimStyle]}
        pointerEvents={selectedPrep ? 'auto' : 'none'}
      >
        {pendingPrep ? (
          <PrepDetailSheet
            item={pendingPrep}
            englishItem={enContent.prep[pendingIdx as number]}
            onBack={() => setSelectedPrep(null)}
            accent={diffuse ? dAccent : colors.text}
            accentSoft={diffuse ? paletteForWeek(week).accentSoft : getModeColorSoft('preg', isDark)}
          />
        ) : null}
      </Animated.View>
    </View>
  )

  return (
    diffuse ? (
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

          {renderSheet()}
        </View>
      </Modal>
    ) : (
      <SheetModal visible={visible} onClose={() => (selectedPrep ? setSelectedPrep(null) : onClose())}>
        {(dragZone) => renderSheet(dragZone)}
      </SheetModal>
    )
  )
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  overlayBg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(20,19,19,0.55)',
  },
  sheet: {
    height: SCREEN_H * 0.95,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    overflow: 'hidden',
  },
  layer: {
    ...StyleSheet.absoluteFillObject,
  },
  closeCalm: { position: 'absolute', top: 10, right: 12, zIndex: 2 },
  monoEyebrow: { fontFamily: 'SpaceMono_400Regular', fontSize: 10, letterSpacing: 1.4 },
  prepCardCalm: {
    borderRadius: 0, borderWidth: 0, borderBottomWidth: StyleSheet.hairlineWidth,
    paddingLeft: 0, paddingRight: 2, marginBottom: 0, paddingVertical: 14,
  },

  // Hero
  hero: {
    paddingTop: 30,
    paddingBottom: 26,
    paddingHorizontal: 28,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    position: 'relative',
    overflow: 'hidden',
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
  heroFruit: {
    position: 'absolute',
    top: 56,
    right: 24,
    width: 140,
    height: 140,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  heroLabel: {
    fontFamily: font.bodyBold,
    fontSize: 10.5,
    letterSpacing: 2.3,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  heroMega: {
    fontFamily: font.displayBold,
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
    fontFamily: 'ArchitectsDaughter_400Regular',
    fontSize: 22,
    letterSpacing: -0.4,
  },
  heroSizeBold: {
    fontFamily: font.italic,
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
    fontFamily: font.bodySemiBold,
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
    fontFamily: font.bodyBold,
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
    fontFamily: font.body,
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
    fontFamily: font.bodyMedium,
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
    fontFamily: font.bodyBold,
    fontSize: 15,
    marginBottom: 2,
    lineHeight: 19,
  },
  prepDesc: {
    fontFamily: font.body,
    fontSize: 13,
    lineHeight: 18,
  },

  // Prep drill-down sub-sheet
  prepDetailRoot: {
    flex: 1,
  },
  prepDetailScroll: {
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 48,
  },
  prepBackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    alignSelf: 'flex-start',
  },
  prepBackText: {
    fontFamily: font.bodySemiBold,
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
    fontFamily: font.display,
    fontSize: 20,
    marginBottom: 2,
  },
  prepDetailSummary: {
    fontFamily: font.body,
    fontSize: 13,
    lineHeight: 18,
  },
  prepDetailContent: {
    fontFamily: font.body,
    fontSize: 15,
    lineHeight: 24,
  },
  prepSectionTitle: {
    fontFamily: font.bodyBold,
    fontSize: 10.5,
    letterSpacing: 2.3,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  prepStepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  prepStepDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    marginTop: 9,
    marginRight: 12,
  },
  prepStepText: {
    flex: 1,
    fontFamily: font.body,
    fontSize: 15,
    lineHeight: 22,
  },
  prepWatchBox: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
  },
})
