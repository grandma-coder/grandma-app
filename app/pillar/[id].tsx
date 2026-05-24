/**
 * Pillar detail screen — cream-paper redesign.
 *
 * Single screen for all 3 modes (pre-preg / pregnancy / kids). Renders the
 * pillar's sticker as a hero, then a list of tip cards, then a "Ask Guru
 * Grandma" suggestion section as rose pill buttons.
 */

import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useLocalSearchParams, router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme } from '../../constants/theme'
import { Pillar } from '../../types'
import { pillars } from '../../lib/pillars'
import { prePregPillars } from '../../lib/prePregPillars'
import { pregnancyPillars } from '../../lib/pregnancyPillars'
import TipCard from '../../components/pillar/TipCard'
import PillarMetrics from '../../components/pillar/PillarMetrics'
import { PillButton } from '../../components/ui/PillButton'
import { ScribbleUnderline } from '../../components/ui/ScribbleUnderline'
import { getPillarSticker } from '../../lib/pillarStickerMap'

export default function PillarDetail() {
  const insets = useSafeAreaInsets()
  const { id } = useLocalSearchParams<{ id: string }>()
  const { colors, stickers, font, radius, isDark } = useTheme()
  const ink = isDark ? colors.text : '#141313'

  const pillar = (
    pillars.find((p) => p.id === id)
      ?? prePregPillars.find((p) => p.id === id)
      ?? pregnancyPillars.find((p) => p.id === id)
  ) as Pillar | undefined

  if (!pillar) {
    return (
      <View style={[styles.center, { backgroundColor: colors.bg }]}>
        <Text style={{ fontSize: 16, color: colors.text, fontFamily: font.body }}>
          Pillar not found
        </Text>
      </View>
    )
  }

  function handleSuggestion(suggestion: string) {
    router.push({
      pathname: '/grandma-talk',
      params: { prefill: suggestion, pillarId: pillar!.id },
    })
  }

  const Sticker = getPillarSticker(pillar.id)

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 40 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Pressable
          onPress={() => router.back()}
          style={[styles.back, { backgroundColor: colors.surface, borderColor: colors.border }]}
          accessibilityRole="button"
          accessibilityLabel="Back"
        >
          <Ionicons name="arrow-back" size={22} color={ink} />
        </Pressable>

        <View style={styles.heroWrap}>
          <View
            style={[
              styles.stickerHero,
              { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.full },
            ]}
          >
            {Sticker ? <Sticker size={88} /> : <Text style={{ fontSize: 56 }}>{pillar.icon}</Text>}
          </View>
        </View>

        <Text style={[styles.name, { color: ink, fontFamily: font.display }]}>{pillar.name}</Text>
        <Text style={[styles.subtitle, { color: stickers.coral, fontFamily: font.italic }]}>
          {pillar.description}
        </Text>

        <PillarMetrics pillarId={pillar.id} />

        {pillar.intro && (
          <Text
            style={[
              styles.intro,
              { color: colors.textSecondary, fontFamily: font.body },
            ]}
          >
            {pillar.intro}
          </Text>
        )}

        <View style={styles.sectionHeading}>
          <ScribbleUnderline color={stickers.coral} strokeWidth={2.5}>
            <Text style={[styles.sectionTitle, { color: ink, fontFamily: font.display }]}>Tips</Text>
          </ScribbleUnderline>
        </View>
        {pillar.tips.map((tip, index) => (
          <TipCard
            key={index}
            label={tip.label}
            text={tip.text}
            index={index + 1}
            isLast={index === pillar.tips.length - 1}
            accent={stickers.coral}
          />
        ))}

        <View style={[styles.sectionHeading, { marginTop: 24 }]}>
          <ScribbleUnderline color={stickers.coral} strokeWidth={2.5}>
            <Text style={[styles.sectionTitle, { color: ink, fontFamily: font.display }]}>
              Ask Guru Grandma
            </Text>
          </ScribbleUnderline>
        </View>
        <View style={styles.chipsContainer}>
          {pillar.suggestions.map((suggestion, index) => (
            <PillButton
              key={index}
              label={suggestion}
              variant="paper"
              onPress={() => handleSuggestion(suggestion)}
              style={{ alignSelf: 'flex-start' }}
            />
          ))}
        </View>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { paddingHorizontal: 20 },
  back: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, marginBottom: 20,
  },
  heroWrap: { alignItems: 'center', marginTop: 8, marginBottom: 16 },
  stickerHero: {
    width: 132, height: 132, borderWidth: 1.5,
    alignItems: 'center', justifyContent: 'center',
  },
  name: { fontSize: 32, letterSpacing: -0.5, marginBottom: 4 },
  subtitle: { fontSize: 16, lineHeight: 22, marginBottom: 16 },
  intro: { fontSize: 15, lineHeight: 22, marginTop: 8, marginBottom: 16 },
  sectionHeading: { marginTop: 8, marginBottom: 4 },
  sectionTitle: { fontSize: 26, letterSpacing: -0.4 },
  chipsContainer: { flexDirection: 'column', gap: 10, marginTop: 12 },
})
