import { useState, useEffect, useMemo } from 'react'
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { ArrowLeft, Check } from 'lucide-react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { BirthTypeCard } from '../components/pregnancy/BirthTypeCard'
import { BirthDetailModal } from '../components/pregnancy/BirthDetailModal'
import { SiteSticker } from '../components/stickers/SiteSticker'
import { InkBackButton } from '../components/ui/InkBackButton'
import { birthTypes, hospitalBagChecklist } from '../lib/birthData'
import type { BirthTopicKey } from '../lib/birthGuideData'
import { useTheme, spacing, radius, getModeColor, getModeColorSoft, useDiffuseTheme, diffuseFont, getDiffuseAccent } from '../constants/theme'
import { useIsDiffuse } from '../components/ui/diffuse/DiffuseKit'
import { DiffuseBloomIcon } from '../components/ui/diffuse/DiffusePrimitives'
import { Character } from '../components/characters/Characters'
import { useTranslation } from '../lib/i18n'

const BIRTH_TYPE_TO_TOPIC: Record<string, BirthTopicKey> = {
  'natural': 'natural',
  'c-section': 'csection',
  'home-birth': 'home',
  'water-birth': 'water',
}

// AsyncStorage key for the persisted hospital-bag checklist state.
// Map keyed by "<section>::<item>" → boolean.
const BAG_STATE_KEY = 'grandma:hospital_bag_checklist:v1'

export default function BirthPlan() {
  const insets = useSafeAreaInsets()
  const { colors, font, isDark } = useTheme()
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
  const { t } = useTranslation()
  const accent = diffuse ? getDiffuseAccent('preg', dt.isDark) : getModeColor('preg', isDark)
  const soft = getModeColorSoft('preg', isDark)
  const [detailTopic, setDetailTopic] = useState<BirthTopicKey | null>(null)
  const [checked, setChecked] = useState<Record<string, boolean>>({})
  const [hydrated, setHydrated] = useState(false)

  // Total + remaining counts for the header progress line.
  const { total, doneCount } = useMemo(() => {
    let total = 0
    let done = 0
    for (const section of hospitalBagChecklist) {
      for (const item of section.items) {
        total += 1
        if (checked[`${section.category}::${item}`]) done += 1
      }
    }
    return { total, doneCount: done }
  }, [checked])

  // Load persisted state on mount.
  useEffect(() => {
    let alive = true
    AsyncStorage.getItem(BAG_STATE_KEY)
      .then((raw) => {
        if (!alive) return
        if (raw) {
          try {
            setChecked(JSON.parse(raw))
          } catch {
            // ignore parse errors
          }
        }
        setHydrated(true)
      })
      .catch(() => setHydrated(true))
    return () => {
      alive = false
    }
  }, [])

  // Persist on change, but only after hydration so we don't overwrite stored
  // state with the empty default on mount.
  useEffect(() => {
    if (!hydrated) return
    AsyncStorage.setItem(BAG_STATE_KEY, JSON.stringify(checked)).catch(() => {})
  }, [checked, hydrated])

  function toggle(section: string, item: string) {
    const key = `${section}::${item}`
    setChecked((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  return (
    <View style={{ flex: 1, backgroundColor: diffuse ? dt.colors.bg : colors.bg }}>
      <ScrollView
        contentContainerStyle={[
          styles.container,
          { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 40 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {diffuse ? (
          <Pressable
            onPress={() => router.back()}
            style={[styles.backBtn, { backgroundColor: 'transparent', borderColor: dt.colors.line2 }]}
            accessibilityRole="button"
            accessibilityLabel="Back"
          >
            <ArrowLeft size={22} color={dt.colors.ink} strokeWidth={1.8} />
          </Pressable>
        ) : (
          <InkBackButton ink={colors.text} paper={colors.surface} />
        )}

        {diffuse ? (
          <>
            <View style={{ alignItems: 'center', marginBottom: 8 }}>
              <DiffuseBloomIcon color={accent} size={96} intensity={0.5}>
                <Character name="note" size={52} color={dt.colors.ink3} />
              </DiffuseBloomIcon>
            </View>
            <Text style={[styles.title, { color: dt.colors.ink, fontFamily: diffuseFont.display }]}>
              {t('preg_birthPlan_title')}
            </Text>
            <Text style={[styles.subtitleItalic, { color: dt.colors.ink3, fontFamily: diffuseFont.italic }]}>
              {t('preg_birthPlan_italicSubtitle')}
            </Text>
          </>
        ) : (
          <>
            <View style={styles.lHeaderRow}>
              <SiteSticker name="pencil" size={52} cut />
              <Text style={[styles.lTitle, { color: colors.text, fontFamily: font.display }]}>
                {t('preg_birthPlan_title')}
              </Text>
            </View>
            <Text style={[styles.lSubtitle, { color: colors.textSecondary, fontFamily: font.body }]}>
              {t('preg_birthPlan_italicSubtitle')}
            </Text>
          </>
        )}

        {/* Birth Types */}
        <View style={styles.sectionLabelRow}>
          {diffuse ? null : <SiteSticker name="flower" size={22} cut />}
          <Text
            style={[
              styles.sectionLabel,
              diffuse
                ? { color: dt.colors.ink3, fontFamily: diffuseFont.mono }
                : { color: colors.textMuted, fontFamily: 'SpaceMono_400Regular', letterSpacing: 1.4, fontSize: 10 },
            ]}
          >
            {t('preg_birthPlan_typesOfBirth')}
          </Text>
        </View>
        {birthTypes.map((bt) => {
          const topicKey = BIRTH_TYPE_TO_TOPIC[bt.id]
          return (
            <BirthTypeCard
              key={bt.id}
              birthType={bt}
              onPress={topicKey ? () => setDetailTopic(topicKey) : undefined}
            />
          )
        })}

        {/* Hospital Bag */}
        <View style={styles.sectionLabelRow}>
          {diffuse ? null : <SiteSticker name="backpack" size={24} cut />}
          <Text
            style={[
              styles.sectionLabel,
              diffuse
                ? { color: dt.colors.ink3, fontFamily: diffuseFont.mono }
                : { color: colors.textMuted, fontFamily: 'SpaceMono_400Regular', letterSpacing: 1.4, fontSize: 10 },
            ]}
          >
            {t('preg_birthPlan_hospitalBagHeader', { done: doneCount, total })}
          </Text>
        </View>
        {hospitalBagChecklist.map((section) => {
          const cat = section.category.toLowerCase()
          const isMom = cat.includes('mom')
          const isBaby = cat.includes('baby')
          const Sticker = diffuse ? (
            <DiffuseBloomIcon color={accent} size={26} intensity={0.45}>
              {isMom ? (
                <Character name="heart" size={16} color={dt.colors.ink3} />
              ) : isBaby ? (
                <Character name="baby" size={16} color={dt.colors.ink3} />
              ) : (
                <Character name="sparkle" size={16} color={dt.colors.ink3} />
              )}
            </DiffuseBloomIcon>
          ) : (
            <SiteSticker name={isMom ? 'heart' : isBaby ? 'bottle' : 'star'} size={26} cut />
          )
          return (
            <View
              key={section.category}
              style={[
                styles.bagSection,
                diffuse
                  ? {
                      backgroundColor: dt.colors.surface,
                      borderColor: dt.colors.line,
                      borderRadius: radius.lg,
                    }
                  : styles.lBagSection,
                !diffuse && { borderBottomColor: colors.border },
              ]}
            >
              <View style={styles.bagCategoryRow}>
                {Sticker}
                <Text
                  style={[
                    styles.bagCategory,
                    diffuse
                      ? { color: dt.colors.ink, fontFamily: diffuseFont.display }
                      : { color: colors.text, fontFamily: font.display, fontSize: 18, letterSpacing: 0.3, textTransform: 'uppercase' },
                  ]}
                >
                  {section.category}
                </Text>
              </View>
              {section.items.map((item, i) => {
                const key = `${section.category}::${item}`
                const isChecked = !!checked[key]
                return (
                  <Pressable
                    key={i}
                    onPress={() => toggle(section.category, item)}
                    style={({ pressed }) => [styles.bagItem, pressed && { opacity: 0.7 }]}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: isChecked }}
                    accessibilityLabel={`${item} — ${isChecked ? t('preg_birthPlan_a11y_packed') : t('preg_birthPlan_a11y_notPacked')}`}
                  >
                    <View
                      style={[
                        styles.checkCircle,
                        diffuse
                          ? {
                              borderColor: isChecked ? accent : dt.colors.line2,
                              backgroundColor: isChecked ? accent : 'transparent',
                            }
                          : {
                              borderColor: colors.text,
                              borderWidth: 1.5,
                              backgroundColor: isChecked ? soft : colors.surface,
                            },
                      ]}
                    >
                      {isChecked && (
                        diffuse ? (
                          <Check size={14} color={dt.colors.surface} strokeWidth={2.4} />
                        ) : (
                          <Ionicons name="checkmark" size={14} color={colors.text} />
                        )
                      )}
                    </View>
                    <Text
                      style={[
                        styles.bagItemText,
                        diffuse
                          ? {
                              color: isChecked ? dt.colors.ink3 : dt.colors.ink2,
                              fontFamily: diffuseFont.body,
                              textDecorationLine: isChecked ? 'line-through' : 'none',
                            }
                          : {
                              color: isChecked ? colors.textMuted : colors.textSecondary,
                              fontFamily: font.body,
                              textDecorationLine: isChecked ? 'line-through' : 'none',
                            },
                      ]}
                    >
                      {item}
                    </Text>
                  </Pressable>
                )
              })}
            </View>
          )
        })}
      </ScrollView>

      <BirthDetailModal
        visible={detailTopic !== null}
        topicKey={detailTopic}
        onClose={() => setDetailTopic(null)}
        onAskGrandma={() => {
          // Carry the selected topic into the chat as starter context.
          const topic = detailTopic
          setDetailTopic(null)
          router.push({
            pathname: '/grandma-talk',
            params: topic ? { insightContext: `birth: ${topic}` } : undefined,
          } as any)
        }}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing['2xl'],
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    marginBottom: 20,
  },
  lHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 6 },
  lTitle: { flex: 1, fontSize: 30, lineHeight: 38, letterSpacing: 0.3, textTransform: 'uppercase' },
  lSubtitle: { fontSize: 15, lineHeight: 22, marginBottom: 24 },
  lBagSection: { borderBottomWidth: StyleSheet.hairlineWidth, paddingBottom: spacing.md, marginBottom: spacing.md },
  title: {
    fontSize: 40,
    letterSpacing: -0.8,
    marginBottom: 4,
  },
  subtitleItalic: {
    fontSize: 16,
    lineHeight: 22,
    marginBottom: 28,
  },
  sectionLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
    marginTop: 8,
  },
  sectionLabel: {
    fontSize: 11,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  bagSection: {
    marginBottom: 12,
    borderWidth: 1,
    padding: spacing.lg,
  },
  bagCategoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  bagCategory: {
    fontSize: 22,
    letterSpacing: -0.3,
  },
  bagItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
  },
  checkCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bagItemText: {
    fontSize: 15,
    lineHeight: 22,
    flex: 1,
  },
})
