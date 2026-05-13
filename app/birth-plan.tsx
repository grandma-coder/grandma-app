import { useState, useEffect, useMemo } from 'react'
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { BirthTypeCard } from '../components/pregnancy/BirthTypeCard'
import { BirthDetailModal } from '../components/pregnancy/BirthDetailModal'
import { Flower, Star, Heart, Bottle, Sparkle } from '../components/ui/Stickers'
import { birthTypes, hospitalBagChecklist } from '../lib/birthData'
import type { BirthTopicKey } from '../lib/birthGuideData'
import { useTheme, spacing, radius, getModeColor } from '../constants/theme'

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
  const { colors, font, stickers, isDark } = useTheme()
  const accent = getModeColor('preg', isDark)
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
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView
        contentContainerStyle={[
          styles.container,
          { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 40 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Pressable
          onPress={() => router.back()}
          style={[styles.backBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
          accessibilityRole="button"
          accessibilityLabel="Back"
        >
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </Pressable>

        <Text style={[styles.title, { color: colors.text, fontFamily: font.display }]}>Birth Planning</Text>
        <Text style={[styles.subtitleItalic, { color: stickers.coral, fontFamily: font.italic }]}>
          explore your options, prepare for the big day, dear
        </Text>

        {/* Birth Types */}
        <View style={styles.sectionLabelRow}>
          <Flower size={16} petal={stickers.pink} />
          <Text style={[styles.sectionLabel, { color: colors.textMuted, fontFamily: font.bodyMedium }]}>TYPES OF BIRTH</Text>
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
          <Star size={16} fill={stickers.yellow} />
          <Text style={[styles.sectionLabel, { color: colors.textMuted, fontFamily: font.bodyMedium }]}>
            HOSPITAL BAG · {doneCount}/{total}
          </Text>
        </View>
        {hospitalBagChecklist.map((section) => {
          const cat = section.category.toLowerCase()
          const Sticker = cat.includes('mom')
            ? <Heart size={20} fill={stickers.pink} />
            : cat.includes('baby')
            ? <Bottle size={20} fill={stickers.blue} />
            : <Sparkle size={20} fill={stickers.yellow} />
          return (
            <View
              key={section.category}
              style={[
                styles.bagSection,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  borderRadius: radius.lg,
                },
              ]}
            >
              <View style={styles.bagCategoryRow}>
                {Sticker}
                <Text style={[styles.bagCategory, { color: colors.text, fontFamily: font.display }]}>{section.category}</Text>
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
                    accessibilityLabel={`${item} — ${isChecked ? 'packed' : 'not packed'}`}
                  >
                    <View
                      style={[
                        styles.checkCircle,
                        {
                          borderColor: isChecked ? accent : colors.borderStrong,
                          backgroundColor: isChecked ? accent : 'transparent',
                        },
                      ]}
                    >
                      {isChecked && (
                        <Ionicons name="checkmark" size={14} color={colors.textInverse} />
                      )}
                    </View>
                    <Text
                      style={[
                        styles.bagItemText,
                        {
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
