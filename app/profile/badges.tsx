/**
 * Badge Wallet — full collection of all badges, earned and locked.
 */

import {
  View,
  Text,
  ScrollView,
  StyleSheet,
} from 'react-native'
import { Lock } from 'lucide-react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme } from '../../constants/theme'
import {
  useBadgeStore,
  BADGE_DEFS,
  getTierColor,
  type BadgeCategory,
} from '../../store/useBadgeStore'
import { ScreenHeader } from '../../components/ui/ScreenHeader'
import { Display, MonoCaps } from '../../components/ui/Typography'
import { BadgeIcon } from '../../components/stickers/BadgeIcon'

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
  const { colors, font, isDark } = useTheme()
  const insets = useSafeAreaInsets()
  const earnedBadges = useBadgeStore((s) => s.earnedBadges)
  const totalPoints = useBadgeStore((s) => s.totalPoints)

  const earnedSet = new Set(earnedBadges.map((b) => b.badgeId))
  const earnedCount = earnedBadges.length
  const totalCount = BADGE_DEFS.length

  const bg = isDark ? colors.bg : '#F3ECD9'
  const paper = isDark ? colors.surface : '#FFFEF8'
  const paperBorder = isDark ? colors.border : 'rgba(20,19,19,0.08)'
  const ink = isDark ? colors.text : '#141313'
  const ink3 = isDark ? colors.textMuted : '#6E6763'

  return (
    <View style={[styles.root, { backgroundColor: bg }]}>
      <View style={[styles.headerWrap, { paddingTop: insets.top + 8 }]}>
        <ScreenHeader title="Badge Wallet" />
      </View>
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: insets.bottom + 40 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Summary paper card */}
        <View style={[styles.summary, { backgroundColor: paper, borderColor: paperBorder }]}>
          <View style={styles.summaryItem}>
            <Display size={28} color={ink}>{earnedCount}</Display>
            <MonoCaps color={ink3}>Earned</MonoCaps>
          </View>
          <View style={[styles.summaryDivider, { backgroundColor: paperBorder }]} />
          <View style={styles.summaryItem}>
            <Display size={28} color={ink3}>{totalCount - earnedCount}</Display>
            <MonoCaps color={ink3}>Locked</MonoCaps>
          </View>
          <View style={[styles.summaryDivider, { backgroundColor: paperBorder }]} />
          <View style={styles.summaryItem}>
            <Display size={28} color={ink}>{totalPoints}</Display>
            <MonoCaps color={ink3}>Points</MonoCaps>
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
                <Text style={[styles.sectionTitle, { color: colors.text, fontFamily: font.display }]}>{section.label}</Text>
                <Text style={[styles.sectionCount, { color: colors.textMuted, fontFamily: font.bodyMedium }]}>
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
                          borderRadius: 20,
                        },
                      ]}
                    >
                      {isEarned ? (
                        <View style={styles.badgeStickerWrap}>
                          <BadgeIcon badgeId={def.id} size={48} />
                        </View>
                      ) : (
                        <View style={[styles.lockedIcon, { backgroundColor: colors.surface }]}>
                          <Lock size={16} color={colors.textMuted} strokeWidth={2} />
                        </View>
                      )}
                      <Text
                        style={[styles.badgeName, { color: isEarned ? colors.text : colors.textMuted, fontFamily: font.bodySemiBold }]}
                        numberOfLines={1}
                      >
                        {def.name}
                      </Text>
                      <Text
                        style={[styles.badgeDesc, { color: isEarned ? colors.textSecondary : colors.textMuted, fontFamily: font.body }]}
                        numberOfLines={2}
                      >
                        {def.description}
                      </Text>
                      <View style={[styles.tierPill, { backgroundColor: isEarned ? getTierColor(def.tier) + '24' : 'transparent' }]}>
                        <Text style={[styles.tierText, { color: isEarned ? getTierColor(def.tier) : colors.textMuted, fontFamily: font.bodySemiBold }]}>
                          {def.tier}
                        </Text>
                      </View>
                      {isEarned && earned && (
                        <Text style={[styles.earnedDate, { color: colors.textMuted, fontFamily: font.body }]}>
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
  headerWrap: { paddingHorizontal: 16 },
  scroll: { paddingHorizontal: 16, paddingTop: 12, gap: 20 },

  summary: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 24,
    borderWidth: 1,
  },
  summaryItem: { flex: 1, alignItems: 'center', gap: 4 },
  summaryDivider: { width: 1, height: 36 },

  section: { gap: 10 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionDot: { width: 8, height: 8, borderRadius: 4 },
  sectionTitle: { fontSize: 18, flex: 1, letterSpacing: -0.2 },
  sectionCount: { fontSize: 13 },

  badgeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  badgeCard: { width: '31.5%', padding: 14, alignItems: 'center', gap: 6, borderWidth: 1, borderRadius: 22 },
  badgeStickerWrap: { width: 54, height: 54, alignItems: 'center', justifyContent: 'center', marginBottom: 2 },
  lockedIcon: { width: 36, height: 36, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  badgeName: { fontSize: 12, textAlign: 'center' },
  badgeDesc: { fontSize: 10, textAlign: 'center', lineHeight: 14 },
  tierPill: { paddingVertical: 3, paddingHorizontal: 10, borderRadius: 999 },
  tierText: { fontSize: 9, textTransform: 'uppercase', letterSpacing: 1 },
  earnedDate: { fontSize: 9 },
})
