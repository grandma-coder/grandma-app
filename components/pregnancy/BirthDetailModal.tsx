// components/pregnancy/BirthDetailModal.tsx
import { useGrandmaChatEnabled } from '../../store/useFeatureFlags'
import React, { useEffect, useRef, useState } from 'react'
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native'
import { ChevronDown, ChevronUp, ExternalLink, Info, TriangleAlert, Lightbulb, Stethoscope, BookOpen } from 'lucide-react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Linking } from 'react-native'
import {
  useTheme, font, getModeColorSoft,
  useDiffuseTheme, getDiffuseAccent, diffuseFont, diffuseRadius,
} from '../../constants/theme'
import { useIsDiffuse, DiffuseFieldSurface, DiffuseArrow } from '../ui/diffuse/DiffuseKit'
import { DiffuseSheet } from '../ui/diffuse/DiffusePrimitives'
import { useTranslation } from '../../lib/i18n'
import { useTranslatedContent } from '../../lib/useTranslatedContent'
import { Display, Body } from '../ui/Typography'
import {
  Leaf, Cross, Cloud, Drop, ClockFace, Bolt, Key, Pill, Lungs, Heart, Moon,
} from '../ui/Stickers'
import { getBirthTopic } from '../../lib/birthGuideData'
import type { BirthTopicKey, BirthSection, BirthCallout, BirthSource } from '../../lib/birthGuideData'
import { Character } from '../characters/Characters'
import { BIRTH_TOPIC_CHARACTER, BIRTH_TOPIC_SITE_STICKER } from './BirthGuideModal'
import { SiteSticker } from '../stickers/SiteSticker'
import { DetailSheetHeader } from '../ui/DetailSheetHeader'
import { SheetModal } from '../ui/SheetModal'

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
  topicKey: topicKeyProp,
  onAskGrandma,
}: BirthDetailModalProps) {
  const { colors, isDark } = useTheme()
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
  const { t } = useTranslation()
  const insets = useSafeAreaInsets()
  const [openIndex, setOpenIndex] = useState<number | null>(null)
  // Light: keep the last topic while the sheet plays its close animation after the parent clears it.
  const lastTopicKey = useRef(topicKeyProp)
  if (topicKeyProp) lastTopicKey.current = topicKeyProp
  const topicKey = diffuse ? topicKeyProp : (topicKeyProp ?? lastTopicKey.current)

  useEffect(() => {
    setOpenIndex(null)
  }, [topicKey, visible])

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
    setOpenIndex(null)
    onClose()
  }

  // Behind the remote grandma_chat flag (command center): off = no Ask Grandma CTA.
  const chatOn = useGrandmaChatEnabled()

  const handleAskGrandma = () => {
    handleClose()
    onAskGrandma()
  }

  // ── Diffuse render path — DiffuseSheet + role-driven sections ──
  if (diffuse) {
    const dAccent = getDiffuseAccent('preg', dt.isDark)
    return (
      <DiffuseSheet
        visible={visible}
        title={topic.title}
        onClose={handleClose}
      >
        {/* Hero — field surface with sticker + subtitle */}
        <DiffuseFieldSurface
          mode="preg"
          isDark={dt.isDark}
          intensity={0.5}
          radius={diffuseRadius.md}
          style={[styles.dHero, { borderWidth: 1, borderColor: dt.colors.line }]}
        >
          <View style={styles.heroSticker}><Character name={BIRTH_TOPIC_CHARACTER[topicKey]} size={52} color={dAccent} /></View>
          <Text style={[styles.dHeroSub, { color: dt.colors.ink3, fontFamily: diffuseFont.body }]}>
            {topic.subtitle}
          </Text>
        </DiffuseFieldSurface>

        {topic.disclaimer && (
          <View style={[styles.dDisclaimer, { borderColor: dt.colors.line, backgroundColor: dt.colors.surfaceRaised }]}>
            <Info size={14} color={dt.colors.ink3} strokeWidth={2} style={{ marginTop: 2 }} />
            <Text style={[styles.dDisclaimerText, { color: dt.colors.ink3, fontFamily: diffuseFont.body }]}>
              {topic.disclaimer}
            </Text>
          </View>
        )}

        <View style={{ gap: 8, marginTop: 12 }}>
          {topic.sections.map((section, index) => (
            <AccordionItem
              key={index}
              topicKey={topicKey}
              section={section}
              index={index}
              isOpen={openIndex === index}
              onToggle={() => toggle(index)}
              ink={ink}
              inkMuted={inkMuted}
              paper={paper}
              paperBorder={paperBorder}
              isDark={isDark}
              diffuse
              dt={dt}
              accent={dAccent}
            />
          ))}
        </View>

        {topic.sources && topic.sources.length > 0 && (
          <SourcesBlock
            sources={topic.sources}
            ink={ink}
            inkMuted={inkMuted}
            paper={paper}
            paperBorder={paperBorder}
            label={t('preg_birthDetail_sources')}
            diffuse
            dt={dt}
          />
        )}

        {chatOn && (<>
        {/* Ask Grandma — containerless hairline action */}
        <Pressable
          onPress={handleAskGrandma}
          accessibilityRole="button"
          accessibilityLabel="Ask Grandma anything about this topic"
          style={({ pressed }) => [styles.dCta, { borderTopColor: dt.colors.line2, opacity: pressed ? 0.6 : 1 }]}
        >
          <Character name="chat" size={16} color={dt.colors.ink} />
          <Text style={[styles.dCtaLabel, { color: dt.colors.ink, fontFamily: diffuseFont.mono }]}>
            {t('preg_birthDetail_askGrandma')}
          </Text>
          <DiffuseArrow color={dt.colors.ink3} size={16} />
        </Pressable>
        </>)}
      </DiffuseSheet>
    )
  }

  const lInk = colors.text
  const lMuted = colors.textSecondary
  const lHair = colors.border
  const soft = getModeColorSoft('preg', isDark)

  return (
    <SheetModal visible={visible} onClose={handleClose}>
      {(dragZone) => (
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: colors.bg,
              borderColor: lInk,
              paddingBottom: insets.bottom + 16,
            },
          ]}
        >
          {/* Handle */}
          <View {...dragZone} style={styles.handleWrap}>
            <View style={[styles.handle, { backgroundColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(22,21,19,0.25)' }]} />
          </View>

          <View {...dragZone} style={styles.heroPad}>
            <DetailSheetHeader
              title={topic.title}
              sticker={BIRTH_TOPIC_SITE_STICKER[topicKey]}
              tone={soft}
              onClose={handleClose}
            />
            <Text style={[styles.lSubtitle, { color: lMuted, fontFamily: font.body }]}>
              {topic.subtitle}
            </Text>
          </View>

          {/* Accordion sections — full content from birthGuideData */}
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {topic.disclaimer && (
              <View style={[styles.disclaimer, { borderColor: lHair }]}>
                <Info size={14} color={lInk} strokeWidth={2.2} style={{ marginTop: 2 }} />
                <Body size={12} color={lMuted} style={{ flex: 1, lineHeight: 17 }}>
                  {topic.disclaimer}
                </Body>
              </View>
            )}

            {topic.sections.map((section, index) => (
              <AccordionItem
                key={index}
                topicKey={topicKey}
                section={section}
                index={index}
                isOpen={openIndex === index}
                onToggle={() => toggle(index)}
                ink={lInk}
                inkMuted={lMuted}
                paper={colors.bg}
                paperBorder={lHair}
                isDark={isDark}
              />
            ))}

            {topic.sources && topic.sources.length > 0 && (
              <SourcesBlock
                sources={topic.sources}
                ink={lInk}
                inkMuted={lMuted}
                paper={colors.bg}
                paperBorder={lHair}
                label={t('preg_birthDetail_sources')}
              />
            )}
          </ScrollView>

          {chatOn && (<>
          {/* Ask Grandma CTA */}
          <View style={styles.ctaPad}>
            <Pressable
              onPress={handleAskGrandma}
              accessibilityRole="button"
              accessibilityLabel="Ask Grandma anything about this topic"
              style={({ pressed }) => [
                styles.cta,
                {
                  backgroundColor: soft,
                  borderColor: lInk,
                  opacity: pressed ? 0.8 : 1,
                },
              ]}
            >
              <SiteSticker name="bubble" size={22} cut />
              <Text style={{ fontFamily: font.bodyBold, fontSize: 14, color: lInk }}>
                {t('preg_birthDetail_askGrandma')}
              </Text>
            </Pressable>
          </View>
          </>)}
        </View>
      )}
    </SheetModal>
  )
}

type DiffuseTokens = ReturnType<typeof useDiffuseTheme>

interface AccordionItemProps {
  topicKey: BirthTopicKey
  section: BirthSection
  index: number
  isOpen: boolean
  onToggle: () => void
  ink: string
  inkMuted: string
  paper: string
  paperBorder: string
  isDark: boolean
  diffuse?: boolean
  dt?: DiffuseTokens
  accent?: string
}

function AccordionItem({
  topicKey, section, index, isOpen, onToggle, ink, inkMuted, paper, paperBorder, isDark,
  diffuse, dt, accent,
}: AccordionItemProps) {
  const numFill = ['#F5D652', '#F2B2C7', '#9DC3E8', '#BDD48C', '#C8B6E8', '#EE7B6D'][index % 6]
  // Long-form birth-guide prose is translated at runtime + cached (Phase C).
  // Stable id-based keys so cache survives content edits (hash guards staleness).
  const { text: sectionTitle } = useTranslatedContent(`birthguide_${topicKey}_${index}_title`, section.title)
  const { text: sectionContent } = useTranslatedContent(`birthguide_${topicKey}_${index}_content`, section.content)

  if (diffuse && dt) {
    const acc = accent ?? dt.colors.ink
    return (
      <View>
        <Pressable
          onPress={onToggle}
          style={({ pressed }) => [
            styles.dAccHeader,
            {
              backgroundColor: dt.colors.surface,
              borderColor: dt.colors.line,
              opacity: pressed ? 0.9 : 1,
              borderBottomLeftRadius: isOpen ? 0 : diffuseRadius.sm,
              borderBottomRightRadius: isOpen ? 0 : diffuseRadius.sm,
              borderBottomWidth: isOpen ? 0 : 1,
            },
          ]}
        >
          <View style={[styles.dNumCircle, { borderColor: dt.colors.line2 }]}>
            <Text style={{ fontFamily: diffuseFont.mono, fontSize: 11, color: dt.colors.ink2 }}>
              {index + 1}
            </Text>
          </View>
          <Text style={[styles.dAccTitle, { flex: 1, color: dt.colors.ink, fontFamily: diffuseFont.bodySemiBold }]}>
            {sectionTitle}
          </Text>
          <View style={[styles.dChevWrap, { borderColor: dt.colors.line2 }]}>
            {isOpen
              ? <ChevronUp size={13} color={dt.colors.ink3} strokeWidth={2} />
              : <ChevronDown size={13} color={dt.colors.ink3} strokeWidth={2} />}
          </View>
        </Pressable>

        {isOpen && (
          <View style={[styles.dAccBody, { backgroundColor: dt.colors.surface, borderColor: dt.colors.line }]}>
            <Text style={[styles.dBodyText, { color: dt.colors.ink2, fontFamily: diffuseFont.body }]}>
              {sectionContent}
            </Text>
            {section.bullets && section.bullets.length > 0 && (
              <View style={styles.bulletList}>
                {section.bullets.map((bullet, i) => (
                  <View key={i} style={styles.bulletRow}>
                    <View style={[styles.bulletDot, { backgroundColor: acc, borderColor: 'transparent' }]} />
                    <Text style={[styles.dBulletText, { color: dt.colors.ink, fontFamily: diffuseFont.body }]}>
                      {bullet}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            {section.subsections && section.subsections.length > 0 && (
              <View style={styles.subList}>
                {section.subsections.map((sub, i) => (
                  <View key={i} style={[styles.subCard, { borderColor: dt.colors.line, backgroundColor: dt.colors.surfaceRaised }]}>
                    <Text style={[styles.dSubTitle, { color: dt.colors.ink, fontFamily: diffuseFont.bodySemiBold }]}>
                      {sub.title}
                    </Text>
                    <Text style={[styles.dBodyText, { color: dt.colors.ink2, fontFamily: diffuseFont.body }]}>
                      {sub.content}
                    </Text>
                    {sub.bullets && sub.bullets.length > 0 && (
                      <View style={[styles.bulletList, { marginTop: 8 }]}>
                        {sub.bullets.map((bullet, j) => (
                          <View key={j} style={styles.bulletRow}>
                            <View style={[styles.bulletDot, { backgroundColor: acc, borderColor: 'transparent' }]} />
                            <Text style={[styles.dBulletTextSm, { color: dt.colors.ink, fontFamily: diffuseFont.body }]}>
                              {bullet}
                            </Text>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                ))}
              </View>
            )}

            {section.callout && (
              <CalloutBlock callout={section.callout} ink={ink} inkMuted={inkMuted} paperBorder={paperBorder} isDark={isDark} diffuse dt={dt} />
            )}
          </View>
        )}
      </View>
    )
  }

  const num = String(index + 1).padStart(2, '0')
  return (
    <View style={[styles.lAccItem, { borderBottomColor: paperBorder }]}>
      <Pressable
        onPress={onToggle}
        accessibilityRole="button"
        accessibilityState={{ expanded: isOpen }}
        style={({ pressed }) => [styles.lAccHeader, { opacity: pressed ? 0.7 : 1 }]}
      >
        <Text style={[styles.lNum, { color: inkMuted }]}>{num}</Text>
        <Text style={[styles.lAccTitle, { color: ink, fontFamily: font.bodyBold }]}>{sectionTitle}</Text>
        {isOpen
          ? <ChevronUp size={16} color={ink} strokeWidth={2.2} />
          : <ChevronDown size={16} color={ink} strokeWidth={2.2} />}
      </Pressable>

      {isOpen && (
        <View style={styles.lAccBody}>
          <Text style={[styles.lBody, { color: inkMuted, fontFamily: font.body }]}>{sectionContent}</Text>
          {section.bullets && section.bullets.length > 0 && (
            <View style={styles.bulletList}>
              {section.bullets.map((bullet, i) => (
                <View key={i} style={styles.bulletRow}>
                  <View style={[styles.lDot, { backgroundColor: ink }]} />
                  <Text style={[styles.lBullet, { color: ink, fontFamily: font.body }]}>{bullet}</Text>
                </View>
              ))}
            </View>
          )}

          {section.subsections && section.subsections.length > 0 && (
            <View style={styles.subList}>
              {section.subsections.map((sub, i) => (
                <View key={i} style={[styles.lSub, { borderLeftColor: ink }]}>
                  <Text style={[styles.lSubTitle, { color: ink, fontFamily: font.bodyBold }]}>{sub.title}</Text>
                  <Text style={[styles.lBody, { color: inkMuted, fontFamily: font.body }]}>{sub.content}</Text>
                  {sub.bullets && sub.bullets.length > 0 && (
                    <View style={[styles.bulletList, { marginTop: 8 }]}>
                      {sub.bullets.map((bullet, j) => (
                        <View key={j} style={styles.bulletRow}>
                          <View style={[styles.lDot, { backgroundColor: ink }]} />
                          <Text style={[styles.lBullet, { color: ink, fontFamily: font.body }]}>{bullet}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              ))}
            </View>
          )}

          {section.callout && (
            <CalloutBlock callout={section.callout} ink={ink} inkMuted={inkMuted} paperBorder={paperBorder} isDark={isDark} />
          )}
        </View>
      )}
    </View>
  )
}

interface CalloutBlockProps {
  callout: BirthCallout
  ink: string
  inkMuted: string
  paperBorder: string
  isDark: boolean
  diffuse?: boolean
  dt?: DiffuseTokens
}

function CalloutBlock({ callout, ink, inkMuted, paperBorder, isDark, diffuse, dt }: CalloutBlockProps) {
  const palette = {
    provider: { bg: isDark ? 'rgba(157,195,232,0.12)' : '#E0EEF8', accent: '#9DC3E8', Icon: Stethoscope },
    urgent:   { bg: isDark ? 'rgba(238,123,109,0.14)' : '#FCE3DE', accent: '#EE7B6D', Icon: TriangleAlert },
    tip:      { bg: isDark ? 'rgba(245,214,82,0.14)' : '#FBF1C8', accent: '#F5D652', Icon: Lightbulb },
  }[callout.variant]

  const IconCmp = palette.Icon

  if (diffuse && dt) {
    return (
      <View style={[styles.dCallout, { borderColor: dt.colors.line, backgroundColor: dt.colors.surfaceRaised }]}>
        <View style={[styles.dCalloutIcon, { borderColor: dt.colors.line2 }]}>
          <IconCmp size={14} color={dt.colors.ink2} strokeWidth={2} />
        </View>
        <View style={{ flex: 1 }}>
          {callout.title && (
            <Text style={[styles.dCalloutTitle, { color: dt.colors.ink, fontFamily: diffuseFont.bodySemiBold }]}>
              {callout.title}
            </Text>
          )}
          <Text style={[styles.dCalloutText, { color: dt.colors.ink3, fontFamily: diffuseFont.body }]}>
            {callout.text}
          </Text>
        </View>
      </View>
    )
  }

  return (
    <View style={[styles.lCallout, { borderLeftColor: palette.accent }]}>
      <IconCmp size={15} color={ink} strokeWidth={2.2} style={{ marginTop: 2 }} />
      <View style={{ flex: 1 }}>
        {callout.title && (
          <Text style={[styles.lSubTitle, { color: ink, fontFamily: font.bodyBold, marginBottom: 3 }]}>
            {callout.title}
          </Text>
        )}
        <Text style={[styles.lBody, { color: inkMuted, fontFamily: font.body, fontSize: 13, lineHeight: 19 }]}>
          {callout.text}
        </Text>
      </View>
    </View>
  )
}

interface SourcesBlockProps {
  sources: BirthSource[]
  ink: string
  inkMuted: string
  paper: string
  paperBorder: string
  label: string
  diffuse?: boolean
  dt?: DiffuseTokens
}

function SourcesBlock({ sources, ink, inkMuted, paper, paperBorder, label, diffuse, dt }: SourcesBlockProps) {
  // Collapsed by default — sources are reassurance, not primary content. The
  // user can tap to expand and check them if they want to.
  const [open, setOpen] = useState(false)

  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
    setOpen((prev) => !prev)
  }

  if (diffuse && dt) {
    return (
      <View style={[styles.dSourcesCard, { backgroundColor: dt.colors.surface, borderColor: dt.colors.line }]}>
        <Pressable
          onPress={toggle}
          accessibilityRole="button"
          accessibilityState={{ expanded: open }}
          accessibilityLabel={`${label}, ${sources.length} ${sources.length === 1 ? 'source' : 'sources'}`}
          style={({ pressed }) => [styles.sourcesHeader, { opacity: pressed ? 0.7 : 1 }]}
        >
          <Character name="book" size={13} color={dt.colors.ink3} />
          <Text style={[styles.dSourcesLabel, { flex: 1, color: dt.colors.ink3, fontFamily: diffuseFont.mono }]}>
            {`${label} (${sources.length})`}
          </Text>
          {open
            ? <ChevronUp size={14} color={dt.colors.ink3} strokeWidth={2} />
            : <ChevronDown size={14} color={dt.colors.ink3} strokeWidth={2} />}
        </Pressable>

        {open && (
          <View style={{ marginTop: 6 }}>
            {sources.map((s, i) => (
              <Pressable
                key={i}
                onPress={() => Linking.openURL(s.url).catch(() => {})}
                style={({ pressed }) => [styles.sourceRow, { opacity: pressed ? 0.6 : 1 }]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[styles.dSourceLabel, { color: dt.colors.ink, fontFamily: diffuseFont.bodySemiBold }]}>
                    {s.label}
                  </Text>
                  <Text style={[styles.dSourceOrg, { color: dt.colors.ink3, fontFamily: diffuseFont.body }]}>
                    {s.org}
                  </Text>
                </View>
                <ExternalLink size={13} color={dt.colors.ink3} strokeWidth={2} />
              </Pressable>
            ))}
          </View>
        )}
      </View>
    )
  }

  return (
    <View style={[styles.lSources, { borderTopColor: paperBorder }]}>
      <Pressable
        onPress={toggle}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={`${label}, ${sources.length} ${sources.length === 1 ? 'source' : 'sources'}`}
        style={({ pressed }) => [styles.sourcesHeader, { opacity: pressed ? 0.7 : 1 }]}
      >
        <BookOpen size={13} color={inkMuted} strokeWidth={2.2} />
        <Text style={[styles.lEyebrow, { flex: 1, color: inkMuted }]}>
          {`${label} (${sources.length})`}
        </Text>
        {open
          ? <ChevronUp size={14} color={ink} strokeWidth={2.2} />
          : <ChevronDown size={14} color={ink} strokeWidth={2.2} />}
      </Pressable>

      {open && (
        <View style={{ marginTop: 6 }}>
          {sources.map((s, i) => (
            <Pressable
              key={i}
              onPress={() => Linking.openURL(s.url).catch(() => {})}
              style={({ pressed }) => [styles.sourceRow, { opacity: pressed ? 0.6 : 1 }]}
            >
              <View style={{ flex: 1 }}>
                <Text style={{ color: ink, fontFamily: font.bodyBold, fontSize: 13, lineHeight: 18 }}>{s.label}</Text>
                <Text style={{ color: inkMuted, fontFamily: font.body, fontSize: 12, lineHeight: 16, marginTop: 2 }}>{s.org}</Text>
              </View>
              <ExternalLink size={13} color={ink} strokeWidth={2.2} />
            </Pressable>
          ))}
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
    borderTopWidth: 2.5,
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
  heroPad: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 4 },
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
  scrollContent: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12 },
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
  subList: { gap: 10, marginTop: 12 },
  subCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
  },
  callout: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    borderWidth: 1.2,
    borderRadius: 14,
    padding: 12,
    marginTop: 12,
  },
  calloutIcon: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  disclaimer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingBottom: 14,
    marginBottom: 4,
  },
  sourcesCard: {
    borderWidth: 1.5,
    borderRadius: 14,
    padding: 14,
    marginTop: 8,
  },
  sourcesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sourceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
  },
  ctaPad: { paddingHorizontal: 20, paddingTop: 8 },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 999,
    borderWidth: 1.5,
    paddingVertical: 14,
  },
  lSubtitle: { fontSize: 14, lineHeight: 20, marginTop: 2, marginBottom: 6 },
  lAccItem: { borderBottomWidth: StyleSheet.hairlineWidth },
  lAccHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 16 },
  lNum: { fontFamily: 'SpaceMono_400Regular', fontSize: 10, letterSpacing: 1.4 },
  lAccTitle: { flex: 1, fontSize: 15, lineHeight: 20 },
  lAccBody: { paddingBottom: 18, gap: 8 },
  lBody: { fontSize: 14, lineHeight: 21 },
  lBullet: { flex: 1, fontSize: 14, lineHeight: 20 },
  lDot: { width: 5, height: 5, borderRadius: 3, marginTop: 8, flexShrink: 0 },
  lSub: { borderLeftWidth: 2, paddingLeft: 12, gap: 4 },
  lSubTitle: { fontSize: 14, lineHeight: 19 },
  lCallout: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, borderLeftWidth: 3, paddingLeft: 12, paddingVertical: 4, marginTop: 12 },
  lSources: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 16, marginTop: 8 },
  lEyebrow: { fontFamily: 'SpaceMono_400Regular', fontSize: 10, letterSpacing: 1.4, textTransform: 'uppercase' },
  // ── Diffuse ──
  dHero: {
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginTop: 4,
  },
  dHeroSub: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  dDisclaimer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    borderWidth: 1,
    borderRadius: diffuseRadius.sm,
    padding: 12,
    marginTop: 12,
  },
  dDisclaimerText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
  },
  dAccHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: diffuseRadius.sm,
    borderWidth: 1,
    padding: 12,
  },
  dNumCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  dAccTitle: {
    fontSize: 14,
  },
  dChevWrap: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  dAccBody: {
    borderWidth: 1,
    borderTopWidth: 0,
    borderBottomLeftRadius: diffuseRadius.sm,
    borderBottomRightRadius: diffuseRadius.sm,
    padding: 14,
    gap: 8,
  },
  dBodyText: {
    fontSize: 13,
    lineHeight: 20,
  },
  dBulletText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
  },
  dBulletTextSm: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
  },
  dSubTitle: {
    fontSize: 13,
    marginBottom: 6,
  },
  dCallout: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    borderWidth: 1,
    borderRadius: diffuseRadius.sm,
    padding: 12,
    marginTop: 12,
  },
  dCalloutIcon: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  dCalloutTitle: {
    fontSize: 13,
    marginBottom: 3,
  },
  dCalloutText: {
    fontSize: 12,
    lineHeight: 18,
  },
  dSourcesCard: {
    borderWidth: 1,
    borderRadius: diffuseRadius.sm,
    padding: 14,
    marginTop: 12,
  },
  dSourcesLabel: {
    fontSize: 11,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  dSourceLabel: {
    fontSize: 12,
    lineHeight: 17,
  },
  dSourceOrg: {
    fontSize: 11,
    lineHeight: 15,
    marginTop: 2,
  },
  dCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderTopWidth: 1,
    paddingTop: 18,
    marginTop: 16,
  },
  dCtaLabel: {
    fontSize: 12,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
  },
})
