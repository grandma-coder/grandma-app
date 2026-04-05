/**
 * C3 — Kids Home Screen
 *
 * 10-section layout:
 * 1. Child cards (horizontal FlatList)
 * 2. Daily log shortcut row
 * 3. Growth chart
 * 4. Allergy + medication reference
 * 5. Upcoming appointments
 * 6. Food log card
 * 7. Memory capture shortcut
 * 8. Quick log row
 * 9. Grandma talk card
 * 10. Insight cards
 */

import { useState } from 'react'
import {
  View,
  Text,
  Pressable,
  FlatList,
  Image,
  ScrollView,
  StyleSheet,
} from 'react-native'
import { router } from 'expo-router'
import Svg, { Polyline, Circle } from 'react-native-svg'
import {
  Baby,
  Utensils,
  Moon,
  Smile,
  Activity,
  Heart,
  Camera,
  Calendar,
  Pill,
  AlertTriangle,
  Stethoscope,
  MessageCircle,
  ChevronRight,
  User,
  Apple,
} from 'lucide-react-native'
import { useTheme, brand } from '../../constants/theme'
import { useChildStore } from '../../store/useChildStore'
import type { ChildWithRole } from '../../types'

// ─── Daily log shortcuts ───────────────────────────────────────────────────

const DAILY_LOGS = [
  { id: 'feeding', label: 'Feeding', icon: Utensils, color: brand.kids },
  { id: 'sleep', label: 'Sleep', icon: Moon, color: brand.pregnancy },
  { id: 'mood', label: 'Mood', icon: Smile, color: brand.accent },
  { id: 'activity', label: 'Activity', icon: Activity, color: brand.phase.ovulation },
]

// ─── Quick log actions ─────────────────────────────────────────────────────

const QUICK_LOGS = [
  { id: 'feeding', label: 'Feeding', icon: Utensils },
  { id: 'sleep', label: 'Sleep', icon: Moon },
  { id: 'mood', label: 'Mood', icon: Smile },
  { id: 'health', label: 'Health Event', icon: Heart },
  { id: 'memory', label: 'Memory', icon: Camera },
]

// ─── Mock data ─────────────────────────────────────────────────────────────

const MOCK_GROWTH_WEIGHTS = [3.5, 4.8, 6.2, 7.5, 8.3, 9.1]
const MOCK_GROWTH_HEIGHTS = [50, 55, 60, 64, 67, 70]
const MOCK_APPOINTMENT = { date: '2026-04-20', type: 'Pediatric Checkup', child: '' }
const MOCK_LAST_MEAL = { name: 'Mashed banana + oats', quality: 'good' }

// ─── Age formatter ─────────────────────────────────────────────────────────

function formatAge(birthDate: string): string {
  if (!birthDate) return ''
  const born = new Date(birthDate)
  const now = new Date()
  const months =
    (now.getFullYear() - born.getFullYear()) * 12 +
    (now.getMonth() - born.getMonth())
  if (months < 1) return 'Newborn'
  if (months < 12) return `${months}mo`
  const years = Math.floor(months / 12)
  const rem = months % 12
  if (rem === 0) return `${years}y`
  return `${years}y ${rem}mo`
}

// ─── Milestone by age ──────────────────────────────────────────────────────

function getNextMilestone(birthDate: string): string {
  if (!birthDate) return 'Set birth date for milestones'
  const months =
    (new Date().getFullYear() - new Date(birthDate).getFullYear()) * 12 +
    (new Date().getMonth() - new Date(birthDate).getMonth())

  if (months < 2) return 'First social smile coming soon'
  if (months < 4) return 'Starting to reach for objects'
  if (months < 6) return 'Rolling over milestone ahead'
  if (months < 9) return 'Sitting without support soon'
  if (months < 12) return 'First words on the horizon'
  if (months < 15) return 'First steps approaching'
  if (months < 18) return 'Learning to use a spoon'
  if (months < 24) return 'Two-word phrases coming'
  if (months < 36) return 'Imaginative play developing'
  return 'Growing beautifully'
}

// ─── Main Component ────────────────────────────────────────────────────────

export function KidsHome() {
  const { colors, radius } = useTheme()
  const children = useChildStore((s) => s.children)
  const activeChild = useChildStore((s) => s.activeChild)
  const setActiveChild = useChildStore((s) => s.setActiveChild)

  const child = activeChild ?? children[0]
  const hasMultiple = children.length > 1

  return (
    <View style={styles.root}>
      {/* 1. Child Cards — horizontal FlatList */}
      {children.length > 0 && (
        <FlatList
          data={children}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(c) => c.id}
          contentContainerStyle={styles.childListContent}
          renderItem={({ item }) => (
            <ChildCard
              child={item}
              isActive={item.id === child?.id}
              onPress={() => setActiveChild(item)}
            />
          )}
        />
      )}

      {/* 2. Daily Log Shortcut Row */}
      <View style={styles.dailyLogRow}>
        {DAILY_LOGS.map((log) => {
          const Icon = log.icon
          return (
            <Pressable
              key={log.id}
              style={[
                styles.dailyLogButton,
                { backgroundColor: log.color + '15', borderRadius: radius.lg },
              ]}
            >
              <View
                style={[
                  styles.dailyLogIcon,
                  { backgroundColor: log.color + '25', borderRadius: radius.md },
                ]}
              >
                <Icon size={20} color={log.color} strokeWidth={2} />
              </View>
              <Text style={[styles.dailyLogLabel, { color: colors.text }]}>
                {log.label}
              </Text>
            </Pressable>
          )
        })}
      </View>

      {/* 3. Growth Chart */}
      <View
        style={[
          styles.card,
          { backgroundColor: colors.surface, borderRadius: radius.xl },
        ]}
      >
        <Text style={[styles.cardTitle, { color: colors.text }]}>Growth Chart</Text>
        <Text style={[styles.cardSubtitle, { color: colors.textMuted }]}>
          {child?.name ? `${child.name}'s progress` : 'Weight & height over time'}
        </Text>
        <GrowthChart weights={MOCK_GROWTH_WEIGHTS} heights={MOCK_GROWTH_HEIGHTS} />
      </View>

      {/* 4. Allergy + Medication Reference */}
      {child && (child.allergies.length > 0 || child.medications.length > 0) && (
        <View
          style={[
            styles.card,
            { backgroundColor: colors.surface, borderRadius: radius.xl },
          ]}
        >
          {child.allergies.length > 0 && (
            <View style={styles.refSection}>
              <View style={styles.refHeader}>
                <AlertTriangle size={16} color={brand.error} strokeWidth={2} />
                <Text style={[styles.refLabel, { color: brand.error }]}>Allergies</Text>
              </View>
              <View style={styles.chipRow}>
                {child.allergies.map((a) => (
                  <View
                    key={a}
                    style={[
                      styles.chip,
                      { backgroundColor: brand.error + '15', borderRadius: radius.full },
                    ]}
                  >
                    <Text style={[styles.chipText, { color: brand.error }]}>{a}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
          {child.medications.length > 0 && (
            <View style={[styles.refSection, child.allergies.length > 0 && { marginTop: 12 }]}>
              <View style={styles.refHeader}>
                <Pill size={16} color={brand.secondary} strokeWidth={2} />
                <Text style={[styles.refLabel, { color: brand.secondary }]}>
                  Medications
                </Text>
              </View>
              <View style={styles.chipRow}>
                {child.medications.map((m) => (
                  <View
                    key={m}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: brand.secondary + '15',
                        borderRadius: radius.full,
                      },
                    ]}
                  >
                    <Text style={[styles.chipText, { color: brand.secondary }]}>
                      {m}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </View>
      )}

      {/* 5. Upcoming Appointment */}
      <View
        style={[
          styles.card,
          { backgroundColor: colors.surface, borderRadius: radius.xl },
        ]}
      >
        <View style={styles.appointmentHeader}>
          <Stethoscope size={18} color={colors.primary} strokeWidth={2} />
          <Text style={[styles.cardTitle, { color: colors.text, marginBottom: 0 }]}>
            Next Appointment
          </Text>
        </View>
        <Text style={[styles.appointmentType, { color: colors.text }]}>
          {MOCK_APPOINTMENT.type}
        </Text>
        <Text style={[styles.appointmentDate, { color: colors.textSecondary }]}>
          {new Date(MOCK_APPOINTMENT.date + 'T00:00:00').toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
          })}
        </Text>
      </View>

      {/* 6. Food Log Card */}
      <View
        style={[
          styles.card,
          { backgroundColor: colors.surface, borderRadius: radius.xl },
        ]}
      >
        <View style={styles.foodHeader}>
          <Apple size={18} color={brand.phase.ovulation} strokeWidth={2} />
          <Text style={[styles.cardTitle, { color: colors.text, marginBottom: 0 }]}>
            Last Meal
          </Text>
        </View>
        <Text style={[styles.foodName, { color: colors.text }]}>
          {MOCK_LAST_MEAL.name}
        </Text>
        <View style={styles.foodQualityRow}>
          <View
            style={[
              styles.foodQualityDot,
              {
                backgroundColor:
                  MOCK_LAST_MEAL.quality === 'good'
                    ? brand.success
                    : MOCK_LAST_MEAL.quality === 'okay'
                    ? brand.accent
                    : brand.error,
              },
            ]}
          />
          <Text style={[styles.foodQualityText, { color: colors.textSecondary }]}>
            {MOCK_LAST_MEAL.quality === 'good'
              ? 'Great meal!'
              : MOCK_LAST_MEAL.quality === 'okay'
              ? 'Could be better'
              : 'Needs improvement'}
          </Text>
        </View>
      </View>

      {/* 7. Memory Capture */}
      <Pressable
        style={({ pressed }) => [
          styles.memoryButton,
          {
            backgroundColor: colors.surfaceRaised,
            borderRadius: radius.xl,
            borderColor: colors.border,
          },
          pressed && { opacity: 0.9, transform: [{ scale: 0.99 }] },
        ]}
      >
        <Camera size={24} color={colors.primary} strokeWidth={2} />
        <View style={styles.memoryText}>
          <Text style={[styles.memoryTitle, { color: colors.text }]}>
            Capture a memory
          </Text>
          <Text style={[styles.memorySub, { color: colors.textMuted }]}>
            Snap a photo to save this moment
          </Text>
        </View>
        <ChevronRight size={20} color={colors.textMuted} />
      </Pressable>

      {/* 8. Quick Log Row */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.quickLogScroll}
      >
        {QUICK_LOGS.map((log) => {
          const Icon = log.icon
          return (
            <Pressable
              key={log.id}
              style={[
                styles.quickLogPill,
                { backgroundColor: colors.primaryTint, borderRadius: radius.full },
              ]}
            >
              <Icon size={16} color={colors.primary} strokeWidth={2} />
              <Text style={[styles.quickLogText, { color: colors.primary }]}>
                {log.label}
              </Text>
            </Pressable>
          )
        })}
      </ScrollView>

      {/* 9. Grandma Talk Card */}
      <Pressable
        onPress={() => router.push('/grandma-talk')}
        style={({ pressed }) => [
          styles.card,
          { backgroundColor: colors.primaryTint, borderRadius: radius.xl },
          pressed && { opacity: 0.9, transform: [{ scale: 0.99 }] },
        ]}
      >
        <View style={styles.grandmaRow}>
          <View style={styles.grandmaTextWrap}>
            <Text style={[styles.grandmaTitle, { color: colors.primary }]}>
              Ask Grandma anything
            </Text>
            <Text style={[styles.grandmaSub, { color: colors.textSecondary }]}>
              Feeding advice, sleep tips, milestone tracking
            </Text>
          </View>
          <View style={[styles.grandmaIcon, { backgroundColor: colors.primary }]}>
            <MessageCircle size={20} color="#FFFFFF" strokeWidth={2} />
          </View>
        </View>
      </Pressable>

      {/* 10. Insight Cards */}
      <View style={styles.insightRow}>
        <InsightCard
          title={child ? getNextMilestone(child.birthDate) : 'Add a child to see milestones'}
          tag="Milestone"
          tagColor={brand.kids}
        />
        <InsightCard
          title="Consistent sleep routines help brain development in the first years"
          tag="Tip"
          tagColor={brand.accent}
        />
        {hasMultiple && (
          <InsightCard
            title="Tap a child card above to switch between your children"
            tag="Hint"
            tagColor={brand.phase.ovulation}
          />
        )}
      </View>
    </View>
  )
}

// ─── Child Card ────────────────────────────────────────────────────────────

function ChildCard({
  child,
  isActive,
  onPress,
}: {
  child: ChildWithRole
  isActive: boolean
  onPress: () => void
}) {
  const { colors, radius } = useTheme()
  const age = formatAge(child.birthDate)
  const milestone = getNextMilestone(child.birthDate)

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.childCard,
        {
          backgroundColor: colors.surface,
          borderRadius: radius.xl,
          borderColor: isActive ? colors.primary : colors.border,
          borderWidth: isActive ? 2 : 1,
        },
        pressed && { opacity: 0.9 },
      ]}
    >
      {/* Photo or placeholder */}
      <View style={[styles.childPhoto, { backgroundColor: colors.surfaceRaised }]}>
        <User size={24} color={colors.textMuted} strokeWidth={1.5} />
      </View>

      <Text style={[styles.childName, { color: colors.text }]} numberOfLines={1}>
        {child.name}
      </Text>
      {age ? (
        <Text style={[styles.childAge, { color: colors.textSecondary }]}>{age}</Text>
      ) : null}
      <Text style={[styles.childMilestone, { color: colors.textMuted }]} numberOfLines={2}>
        {milestone}
      </Text>
    </Pressable>
  )
}

// ─── Growth Chart ──────────────────────────────────────────────────────────

function GrowthChart({
  weights,
  heights,
}: {
  weights: number[]
  heights: number[]
}) {
  const { colors } = useTheme()

  const width = 280
  const height = 90
  const padding = 16

  function toPoints(data: number[]) {
    const min = Math.min(...data) - 1
    const max = Math.max(...data) + 1
    const range = max - min || 1
    return data.map((v, i) => ({
      x: padding + (i / (data.length - 1)) * (width - padding * 2),
      y: height - padding - ((v - min) / range) * (height - padding * 2),
      v,
    }))
  }

  const wPoints = toPoints(weights)
  const hPoints = toPoints(heights)

  return (
    <View style={styles.chartWrap}>
      <Svg width={width} height={height}>
        {/* Weight line */}
        <Polyline
          points={wPoints.map((p) => `${p.x},${p.y}`).join(' ')}
          fill="none"
          stroke={brand.kids}
          strokeWidth={2}
          strokeLinecap="round"
        />
        {wPoints.map((p, i) => (
          <Circle
            key={`w${i}`}
            cx={p.x}
            cy={p.y}
            r={3}
            fill={brand.kids}
            stroke={colors.surface}
            strokeWidth={2}
          />
        ))}
        {/* Height line */}
        <Polyline
          points={hPoints.map((p) => `${p.x},${p.y}`).join(' ')}
          fill="none"
          stroke={brand.phase.ovulation}
          strokeWidth={2}
          strokeLinecap="round"
          strokeDasharray="4,4"
        />
        {hPoints.map((p, i) => (
          <Circle
            key={`h${i}`}
            cx={p.x}
            cy={p.y}
            r={3}
            fill={brand.phase.ovulation}
            stroke={colors.surface}
            strokeWidth={2}
          />
        ))}
      </Svg>
      <View style={styles.chartLegend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: brand.kids }]} />
          <Text style={[styles.legendText, { color: colors.textMuted }]}>Weight (kg)</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: brand.phase.ovulation }]} />
          <Text style={[styles.legendText, { color: colors.textMuted }]}>Height (cm)</Text>
        </View>
      </View>
    </View>
  )
}

// ─── Insight Card ──────────────────────────────────────────────────────────

function InsightCard({
  title,
  tag,
  tagColor,
}: {
  title: string
  tag: string
  tagColor: string
}) {
  const { colors, radius } = useTheme()

  return (
    <View
      style={[
        styles.insightCard,
        { backgroundColor: colors.surface, borderRadius: radius.xl },
      ]}
    >
      <View
        style={[
          styles.insightTag,
          { backgroundColor: tagColor + '20', borderRadius: radius.sm },
        ]}
      >
        <Text style={[styles.insightTagText, { color: tagColor }]}>{tag}</Text>
      </View>
      <Text style={[styles.insightTitle, { color: colors.text }]} numberOfLines={3}>
        {title}
      </Text>
    </View>
  )
}

// ─── Styles ────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    gap: 16,
  },

  // 1. Child cards
  childListContent: {
    gap: 12,
    paddingVertical: 4,
  },
  childCard: {
    width: 150,
    padding: 16,
    alignItems: 'center',
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  childPhoto: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  childName: {
    fontSize: 15,
    fontWeight: '700',
  },
  childAge: {
    fontSize: 13,
    fontWeight: '600',
  },
  childMilestone: {
    fontSize: 11,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 15,
  },

  // 2. Daily log
  dailyLogRow: {
    flexDirection: 'row',
    gap: 8,
  },
  dailyLogButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
    gap: 8,
  },
  dailyLogIcon: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dailyLogLabel: {
    fontSize: 12,
    fontWeight: '600',
  },

  // Shared card
  card: {
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 12,
  },
  cardSubtitle: {
    fontSize: 13,
    fontWeight: '500',
    marginTop: -8,
    marginBottom: 12,
  },

  // 3. Growth chart
  chartWrap: {
    alignItems: 'center',
    marginTop: 4,
  },
  chartLegend: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 11,
    fontWeight: '600',
  },

  // 4. Allergy/Medication
  refSection: {},
  refHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  refLabel: {
    fontSize: 14,
    fontWeight: '700',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  chip: {
    paddingVertical: 5,
    paddingHorizontal: 12,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
  },

  // 5. Appointment
  appointmentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  appointmentType: {
    fontSize: 16,
    fontWeight: '700',
  },
  appointmentDate: {
    fontSize: 14,
    fontWeight: '500',
    marginTop: 2,
  },

  // 6. Food log
  foodHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  foodName: {
    fontSize: 16,
    fontWeight: '600',
  },
  foodQualityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
  },
  foodQualityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  foodQualityText: {
    fontSize: 13,
    fontWeight: '500',
  },

  // 7. Memory
  memoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    gap: 14,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  memoryText: {
    flex: 1,
    gap: 2,
  },
  memoryTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  memorySub: {
    fontSize: 13,
    fontWeight: '500',
  },

  // 8. Quick log
  quickLogScroll: {
    gap: 8,
    paddingVertical: 4,
  },
  quickLogPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  quickLogText: {
    fontSize: 13,
    fontWeight: '600',
  },

  // 9. Grandma
  grandmaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  grandmaTextWrap: {
    flex: 1,
    gap: 4,
  },
  grandmaTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  grandmaSub: {
    fontSize: 13,
    fontWeight: '500',
  },
  grandmaIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },

  // 10. Insights
  insightRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  insightCard: {
    flex: 1,
    minWidth: '45%',
    padding: 16,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  insightTag: {
    alignSelf: 'flex-start',
    paddingVertical: 3,
    paddingHorizontal: 8,
  },
  insightTagText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  insightTitle: {
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
})
