/**
 * Badge Wallet — full collection of all badges, earned and locked.
 */

import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  Platform,
} from 'react-native'
import { router } from 'expo-router'
import { ArrowLeft, Lock } from 'lucide-react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme } from '../../constants/theme'
import {
  useBadgeStore,
  BADGE_DEFS,
  getBadgeDef,
  getTierColor,
  type BadgeCategory,
} from '../../store/useBadgeStore'

const SECTIONS: { key: BadgeCategory; label: string; color: string }[] = [
  { key: 'streak',    label: 'Streaks',    color: '#F59E0B' },
  { key: 'daily',     label: 'Daily Rewards', color: '#A07FDC' },
  { key: 'nutrition', label: 'Nutrition',  color: '#A2FF86' },
  { key: 'sleep',     label: 'Sleep',      color: '#B983FF' },
  { key: 'mood',      label: 'Mood',       color: '#FF8AD8' },
  { key: 'health',    label: 'Health',     color: '#4D96FF' },
  { key: 'growth',    label: 'Growth',     color: '#F59E0B' },
  { key: 'community', label: 'Community',  color: '#7048B8' },
  { key: 'milestone', label: 'Milestones', color: '#FF6B35' },
]

export default function BadgeWalletScreen() {
  const { colors, radius } = useTheme()
  const insets = useSafeAreaInsets()
  const earnedBadges = useBadgeStore((s) => s.earnedBadges)
  const totalPoints = useBadgeStore((s) => s.totalPoints)

  const earnedSet = new Set(earnedBadges.map((b) => b.badgeId))
  const earnedCount = earnedBadges.length
  const totalCount = BADGE_DEFS.length

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 40 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <ArrowLeft size={24} color={colors.text} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Badge Wallet</Text>
        </View>

        {/* Summary */}
        <View style={[styles.summary, { backgroundColor: colors.surface, borderRadius: radius.xl }]}>
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryValue, { color: '#FFD700' }]}>{earnedCount}</Text>
            <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>Earned</Text>
          </View>
          <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryValue, { color: colors.textSecondary }]}>{totalCount - earnedCount}</Text>
            <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>Locked</Text>
          </View>
          <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryValue, { color: '#FFD700' }]}>{totalPoints}</Text>
            <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>Points</Text>
          </View>
        </View>

        {/* Badge Sections */}
        {SECTIONS.map((section) => {
          const badges = BADGE_DEFS.filter((d) => d.category === section.key)
          if (badges.length === 0) return null

          return (
            <View key={section.key} style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={[styles.sectionDot, { backgroundColor: section.color }]} />
                <Text style={[styles.sectionTitle, { color: colors.text }]}>{section.label}</Text>
                <Text style={[styles.sectionCount, { color: colors.textMuted }]}>
                  {badges.filter((d) => earnedSet.has(d.id)).length}/{badges.length}
                </Text>
              </View>

              <View style={styles.badgeGrid}>
                {badges.map((def) => {
                  const isEarned = earnedSet.has(def.id)
                  const earned = earnedBadges.find((e) => e.badgeId === def.id)
                  return (
                    <View
                      key={def.id}
                      style={[
                        styles.badgeCard,
                        {
                          backgroundColor: isEarned ? def.color + '10' : colors.surfaceRaised,
                          borderColor: isEarned ? def.color + '25' : colors.border,
                          borderRadius: radius.xl,
                        },
                      ]}
                    >
                      {isEarned ? (
                        <Text style={styles.badgeEmoji}>{def.icon}</Text>
                      ) : (
                        <View style={[styles.lockedIcon, { backgroundColor: colors.surface }]}>
                          <Lock size={16} color={colors.textMuted} strokeWidth={2} />
                        </View>
                      )}
                      <Text
                        style={[styles.badgeName, { color: isEarned ? colors.text : colors.textMuted }]}
                        numberOfLines={1}
                      >
                        {def.name}
                      </Text>
                      <Text
                        style={[styles.badgeDesc, { color: isEarned ? colors.textSecondary : colors.textMuted }]}
                        numberOfLines={2}
                      >
                        {def.description}
                      </Text>
                      <View style={[styles.tierPill, { backgroundColor: isEarned ? getTierColor(def.tier) + '20' : 'transparent' }]}>
                        <Text style={[styles.tierText, { color: isEarned ? getTierColor(def.tier) : colors.textMuted }]}>
                          {def.tier}
                        </Text>
                      </View>
                      {isEarned && earned && (
                        <Text style={[styles.earnedDate, { color: colors.textMuted }]}>
                          {new Date(earned.earnedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </Text>
                      )}
                    </View>
                  )
                })}
              </View>
            </View>
          )
        })}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingHorizontal: 16, gap: 20 },

  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerTitle: { fontSize: 22, fontWeight: '800' },

  summary: { flexDirection: 'row', padding: 16 },
  summaryItem: { flex: 1, alignItems: 'center', gap: 4 },
  summaryValue: { fontSize: 24, fontWeight: '900' },
  summaryLabel: { fontSize: 12, fontWeight: '600' },
  summaryDivider: { width: 1, height: 36 },

  section: { gap: 10 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionDot: { width: 8, height: 8, borderRadius: 4 },
  sectionTitle: { fontSize: 16, fontWeight: '800', flex: 1 },
  sectionCount: { fontSize: 13, fontWeight: '600' },

  badgeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  badgeCard: { width: '31.5%', padding: 12, alignItems: 'center', gap: 6, borderWidth: 1 },
  badgeEmoji: { fontSize: 28, fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif' },
  lockedIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  badgeName: { fontSize: 12, fontWeight: '800', textAlign: 'center' },
  badgeDesc: { fontSize: 10, fontWeight: '500', textAlign: 'center', lineHeight: 14 },
  tierPill: { paddingVertical: 2, paddingHorizontal: 8, borderRadius: 999 },
  tierText: { fontSize: 9, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1 },
  earnedDate: { fontSize: 9, fontWeight: '600' },
})
