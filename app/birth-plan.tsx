import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { CosmicBackground } from '../components/ui/CosmicBackground'
import { GlassCard } from '../components/ui/GlassCard'
import { BirthTypeCard } from '../components/pregnancy/BirthTypeCard'
import { birthTypes, hospitalBagChecklist } from '../lib/birthData'
import { colors, typography, spacing } from '../constants/theme'

export default function BirthPlan() {
  const insets = useSafeAreaInsets()

  return (
    <CosmicBackground variant="pregnancy">
      <ScrollView
        contentContainerStyle={[
          styles.container,
          { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 40 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </Pressable>

        <Text style={styles.title}>Birth Planning</Text>
        <Text style={styles.subtitle}>
          Explore your options and prepare for the big day, dear.
        </Text>

        {/* Birth Types */}
        <Text style={styles.sectionLabel}>TYPES OF BIRTH</Text>
        {birthTypes.map((bt) => (
          <BirthTypeCard key={bt.id} birthType={bt} />
        ))}

        {/* Hospital Bag */}
        <Text style={styles.sectionLabel}>HOSPITAL BAG CHECKLIST</Text>
        {hospitalBagChecklist.map((section) => (
          <GlassCard key={section.category} style={styles.bagSection}>
            <Text style={styles.bagCategory}>{section.category}</Text>
            {section.items.map((item, i) => (
              <View key={i} style={styles.bagItem}>
                <Ionicons name="ellipse-outline" size={14} color={colors.textTertiary} />
                <Text style={styles.bagItemText}>{item}</Text>
              </View>
            ))}
          </GlassCard>
        ))}
      </ScrollView>
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
    backgroundColor: colors.surfaceGlass,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 20,
  },
  title: {
    ...typography.heading,
    marginBottom: 4,
  },
  subtitle: {
    ...typography.bodySecondary,
    marginBottom: 28,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textTertiary,
    letterSpacing: 1.5,
    marginBottom: 12,
    marginTop: 8,
  },
  bagSection: {
    marginBottom: 12,
  },
  bagCategory: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 10,
  },
  bagItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 5,
  },
  bagItemText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
})
