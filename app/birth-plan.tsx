import { useState } from 'react'
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { CosmicBackground } from '../components/ui/CosmicBackground'
import { BirthTypeCard } from '../components/pregnancy/BirthTypeCard'
import { BirthDetailModal } from '../components/pregnancy/BirthDetailModal'
import { Flower, Star, Heart, Bottle, Sparkle } from '../components/ui/Stickers'
import { birthTypes, hospitalBagChecklist } from '../lib/birthData'
import type { BirthTopicKey } from '../lib/birthGuideData'
import { useTheme, spacing, radius } from '../constants/theme'

const BIRTH_TYPE_TO_TOPIC: Record<string, BirthTopicKey> = {
  'natural': 'natural',
  'c-section': 'csection',
  'home-birth': 'home',
  'water-birth': 'water',
}

export default function BirthPlan() {
  const insets = useSafeAreaInsets()
  const { colors, font, stickers } = useTheme()
  const [detailTopic, setDetailTopic] = useState<BirthTopicKey | null>(null)

  return (
    <CosmicBackground variant="pregnancy">
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
          <Text style={[styles.sectionLabel, { color: colors.textMuted, fontFamily: font.bodyMedium }]}>HOSPITAL BAG CHECKLIST</Text>
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
              {section.items.map((item, i) => (
                <View key={i} style={styles.bagItem}>
                  <View style={[styles.checkCircle, { borderColor: colors.borderStrong }]} />
                  <Text style={[styles.bagItemText, { color: colors.textSecondary, fontFamily: font.body }]}>{item}</Text>
                </View>
              ))}
            </View>
          )
        })}
      </ScrollView>

      <BirthDetailModal
        visible={detailTopic !== null}
        topicKey={detailTopic}
        onClose={() => setDetailTopic(null)}
        onAskGrandma={() => {
          setDetailTopic(null)
          router.push('/grandma-talk')
        }}
      />
    </CosmicBackground>
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
  },
  bagItemText: {
    fontSize: 15,
    lineHeight: 22,
  },
})
