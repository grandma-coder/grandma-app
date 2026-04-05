/**
 * C2 — Pregnancy Home Screen
 *
 * 11-section layout:
 * 1. Week counter card
 * 2. Due date countdown
 * 3. Today's tip
 * 4. Upcoming appointment
 * 5. Weight tracking graph
 * 6. Kick counter (week 28+)
 * 7. Birth plan / hospital bag
 * 8. Partner note
 * 9. Quick log row
 * 10. Grandma talk card
 * 11. Insight cards
 */

import { useState } from 'react'
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native'
import { router } from 'expo-router'
import Svg, { Polyline, Circle } from 'react-native-svg'
import {
  Baby,
  Calendar,
  Heart,
  Scale,
  Stethoscope,
  Smile,
  Frown,
  Meh,
  Zap,
  Moon,
  ClipboardList,
  Luggage,
  Users,
  MessageCircle,
  ChevronRight,
  Hand,
  Activity,
} from 'lucide-react-native'
import { useTheme, brand } from '../../constants/theme'
import { usePregnancyStore } from '../../store/usePregnancyStore'
import { useJourneyStore } from '../../store/useJourneyStore'

// ─── Baby size comparisons by week ─────────────────────────────────────────

const BABY_SIZES: Record<number, { size: string; note: string }> = {
  4: { size: 'a poppy seed', note: 'The neural tube is forming' },
  5: { size: 'a sesame seed', note: 'The heart begins to beat' },
  6: { size: 'a lentil', note: 'Nose, mouth, and ears are taking shape' },
  7: { size: 'a blueberry', note: 'Brain is growing rapidly' },
  8: { size: 'a raspberry', note: 'Fingers and toes are forming' },
  9: { size: 'a grape', note: 'All essential organs have begun' },
  10: { size: 'a kumquat', note: 'Tiny teeth buds are forming under gums' },
  11: { size: 'a fig', note: 'Baby can open and close fists' },
  12: { size: 'a lime', note: 'Reflexes are developing' },
  13: { size: 'a peach', note: 'Fingerprints are forming' },
  14: { size: 'a lemon', note: 'Baby can squint, frown, and grimace' },
  15: { size: 'an apple', note: 'Baby can sense light' },
  16: { size: 'an avocado', note: 'Baby can hear your voice' },
  17: { size: 'a pear', note: 'Skeleton is hardening from cartilage to bone' },
  18: { size: 'a bell pepper', note: 'Baby is yawning and hiccuping' },
  19: { size: 'a mango', note: 'Senses are developing rapidly' },
  20: { size: 'a banana', note: 'Halfway there! Baby can swallow' },
  21: { size: 'a carrot', note: 'Baby movements feel stronger' },
  22: { size: 'a papaya', note: 'Eyes are formed but iris lacks color' },
  23: { size: 'a grapefruit', note: 'Baby can hear sounds outside the womb' },
  24: { size: 'a corn cob', note: 'Lungs are developing surfactant' },
  25: { size: 'a cauliflower', note: 'Baby responds to your voice' },
  26: { size: 'a lettuce head', note: 'Eyes begin to open' },
  27: { size: 'a cabbage', note: 'Baby sleeps and wakes regularly' },
  28: { size: 'an eggplant', note: 'Baby can blink and dream' },
  29: { size: 'a butternut squash', note: 'Bones are fully developed' },
  30: { size: 'a cucumber', note: 'Baby is gaining weight rapidly' },
  31: { size: 'a coconut', note: 'Brain connections are forming fast' },
  32: { size: 'a jicama', note: 'Toenails are visible' },
  33: { size: 'a pineapple', note: 'Bones are hardening' },
  34: { size: 'a cantaloupe', note: 'Central nervous system is maturing' },
  35: { size: 'a honeydew melon', note: 'Kidneys are fully developed' },
  36: { size: 'a head of romaine', note: 'Baby is dropping lower into pelvis' },
  37: { size: 'a bunch of Swiss chard', note: 'Baby is considered early term' },
  38: { size: 'a leek', note: 'Organs are ready for life outside' },
  39: { size: 'a watermelon', note: 'Baby is full term!' },
  40: { size: 'a small pumpkin', note: 'Ready to meet the world!' },
}

function getBabySize(week: number) {
  const clamped = Math.max(4, Math.min(40, week))
  return BABY_SIZES[clamped] ?? { size: 'a little miracle', note: 'Growing beautifully' }
}

// ─── Pregnancy tips ────────────────────────────────────────────────────────

const DAILY_TIPS = [
  'Your body is doing incredible work. Take a moment to appreciate it.',
  'Stay hydrated — aim for 10 glasses of water today.',
  'A short walk can do wonders for your mood and circulation.',
  'Talk to your baby — they can hear you from week 16 onwards.',
  'Rest when you need to. Growing a human is no small feat.',
  'Gentle stretching can help with back pain and stiffness.',
  'Your little one is dreaming right now. How beautiful is that?',
]

// ─── Quick log actions ─────────────────────────────────────────────────────

const QUICK_LOGS = [
  { id: 'mood', label: 'Mood', icon: Smile },
  { id: 'symptoms', label: 'Symptoms', icon: Activity },
  { id: 'weight', label: 'Weight', icon: Scale },
  { id: 'appointment', label: 'Appointment', icon: Calendar },
]

// ─── Mock data ─────────────────────────────────────────────────────────────

const MOCK_WEIGHTS = [62.5, 63.1, 63.8, 64.2, 65.0, 65.5]
const MOCK_APPOINTMENT = { date: '2026-04-15', type: 'Ultrasound', doctor: 'Dr. Mitchell' }

// ─── Main Component ────────────────────────────────────────────────────────

export function PregnancyHome() {
  const { colors, radius } = useTheme()
  const weekNumber = usePregnancyStore((s) => s.weekNumber) ?? 24
  const dueDate = usePregnancyStore((s) => s.dueDate)
  const parentName = useJourneyStore((s) => s.parentName)

  const babyInfo = getBabySize(weekNumber)
  const dailyTip = DAILY_TIPS[new Date().getDay()]
  const showKickCounter = weekNumber >= 28
  const daysLeft = dueDate ? daysUntil(dueDate) : null
  const trimester = weekNumber <= 13 ? 1 : weekNumber <= 26 ? 2 : 3
  const hasPartner = false // TODO: read from store

  return (
    <View style={styles.root}>
      {/* 1. Week Counter Card */}
      <View
        style={[
          styles.weekCard,
          { backgroundColor: colors.primary, borderRadius: radius.xl },
        ]}
      >
        <View style={styles.weekCardHeader}>
          <Baby size={24} color="#FFFFFF" strokeWidth={2} />
          <Text style={styles.weekCardTrimester}>Trimester {trimester}</Text>
        </View>
        <Text style={styles.weekCardTitle}>
          You are {weekNumber} weeks pregnant
        </Text>
        <Text style={styles.weekCardSize}>
          Your baby is the size of {babyInfo.size}
        </Text>
        <Text style={styles.weekCardNote}>{babyInfo.note}</Text>
      </View>

      {/* 2. Due Date Countdown */}
      {daysLeft !== null && (
        <View
          style={[
            styles.card,
            { backgroundColor: brand.accentTint, borderRadius: radius.xl, borderColor: brand.accent + '30', borderWidth: 1 },
          ]}
        >
          <View style={styles.countdownRow}>
            <View>
              <Text style={[styles.countdownNumber, { color: brand.accent }]}>
                {daysLeft}
              </Text>
              <Text style={[styles.countdownLabel, { color: colors.textSecondary }]}>
                days until your due date
              </Text>
            </View>
            <Calendar size={32} color={brand.accent} strokeWidth={1.5} />
          </View>
        </View>
      )}

      {/* 3. Today's Tip */}
      <View
        style={[
          styles.card,
          { backgroundColor: colors.surface, borderRadius: radius.xl },
        ]}
      >
        <Text style={[styles.tipLabel, { color: colors.textMuted }]}>
          TODAY'S AFFIRMATION
        </Text>
        <Text style={[styles.tipText, { color: colors.text }]}>
          "{dailyTip}"
        </Text>
      </View>

      {/* 4. Upcoming Appointment */}
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
        <View style={styles.appointmentBody}>
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
          <Text style={[styles.appointmentDoctor, { color: colors.textMuted }]}>
            {MOCK_APPOINTMENT.doctor}
          </Text>
        </View>
      </View>

      {/* 5. Weight Tracking Graph */}
      <View
        style={[
          styles.card,
          { backgroundColor: colors.surface, borderRadius: radius.xl },
        ]}
      >
        <Text style={[styles.cardTitle, { color: colors.text }]}>
          Weight Tracking
        </Text>
        <Text style={[styles.cardSubtitle, { color: colors.textMuted }]}>
          Last {MOCK_WEIGHTS.length} entries
        </Text>
        <WeightChart weights={MOCK_WEIGHTS} />
      </View>

      {/* 6. Kick Counter (week 28+) */}
      {showKickCounter && (
        <Pressable
          onPress={() => {/* TODO: navigate to kick counter */}}
          style={({ pressed }) => [
            styles.card,
            {
              backgroundColor: brand.pregnancy + '15',
              borderRadius: radius.xl,
              borderColor: brand.pregnancy + '30',
              borderWidth: 1,
            },
            pressed && { opacity: 0.9, transform: [{ scale: 0.99 }] },
          ]}
        >
          <View style={styles.kickRow}>
            <View style={[styles.kickButton, { backgroundColor: brand.pregnancy }]}>
              <Hand size={28} color="#FFFFFF" strokeWidth={2} />
            </View>
            <View style={styles.kickText}>
              <Text style={[styles.kickTitle, { color: colors.text }]}>
                Kick Counter
              </Text>
              <Text style={[styles.kickSubtitle, { color: colors.textSecondary }]}>
                Track 10 kicks — tap to start a session
              </Text>
            </View>
            <ChevronRight size={20} color={colors.textMuted} />
          </View>
        </Pressable>
      )}

      {/* 7. Birth Plan / Hospital Bag */}
      <View
        style={[
          styles.card,
          { backgroundColor: colors.surface, borderRadius: radius.xl },
        ]}
      >
        <View style={styles.birthPlanRow}>
          {weekNumber >= 32 ? (
            <>
              <Luggage size={20} color={brand.accent} strokeWidth={2} />
              <View style={styles.birthPlanText}>
                <Text style={[styles.cardTitle, { color: colors.text, marginBottom: 2 }]}>
                  Hospital Bag Checklist
                </Text>
                <Text style={[styles.birthPlanSub, { color: colors.textSecondary }]}>
                  Time to start packing! Tap to see what you need.
                </Text>
              </View>
            </>
          ) : (
            <>
              <ClipboardList size={20} color={brand.secondary} strokeWidth={2} />
              <View style={styles.birthPlanText}>
                <Text style={[styles.cardTitle, { color: colors.text, marginBottom: 2 }]}>
                  Birth Plan
                </Text>
                <Text style={[styles.birthPlanSub, { color: colors.textSecondary }]}>
                  Start thinking about your birth preferences.
                </Text>
              </View>
            </>
          )}
          <ChevronRight size={20} color={colors.textMuted} />
        </View>
      </View>

      {/* 8. Partner Note */}
      {hasPartner && (
        <View
          style={[
            styles.card,
            { backgroundColor: colors.surfaceRaised, borderRadius: radius.xl },
          ]}
        >
          <View style={styles.partnerHeader}>
            <Users size={18} color={colors.primary} strokeWidth={2} />
            <Text style={[styles.cardTitle, { color: colors.text, marginBottom: 0 }]}>
              Partner Note
            </Text>
          </View>
          <Text style={[styles.partnerNote, { color: colors.textSecondary }]}>
            No shared notes yet. Leave a message for your partner.
          </Text>
        </View>
      )}

      {/* 9. Quick Log Row */}
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

      {/* 10. Grandma Talk Card */}
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
              Pregnancy questions, week-by-week guidance, nutrition
            </Text>
          </View>
          <View style={[styles.grandmaIcon, { backgroundColor: colors.primary }]}>
            <MessageCircle size={20} color="#FFFFFF" strokeWidth={2} />
          </View>
        </View>
      </Pressable>

      {/* 11. Insight Cards */}
      <View style={styles.insightRow}>
        <InsightCard
          title={babyInfo.note}
          tag={`Week ${weekNumber}`}
          tagColor={brand.pregnancy}
        />
        <InsightCard
          title={weekNumber >= 28
            ? 'Count kicks daily — 10 movements in 2 hours is healthy'
            : 'Eat iron-rich foods to support your growing blood volume'}
          tag="Tip"
          tagColor={brand.accent}
        />
      </View>
    </View>
  )
}

// ─── Weight Mini Chart ─────────────────────────────────────────────────────

function WeightChart({ weights }: { weights: number[] }) {
  const { colors } = useTheme()

  const width = 280
  const height = 80
  const padding = 16
  const minVal = Math.min(...weights) - 1
  const maxVal = Math.max(...weights) + 1
  const range = maxVal - minVal || 1

  const points = weights.map((v, i) => {
    const x = padding + (i / (weights.length - 1)) * (width - padding * 2)
    const y = height - padding - ((v - minVal) / range) * (height - padding * 2)
    return { x, y, v }
  })

  const polylinePoints = points.map((p) => `${p.x},${p.y}`).join(' ')

  return (
    <View style={styles.chartWrap}>
      <Svg width={width} height={height}>
        <Polyline
          points={polylinePoints}
          fill="none"
          stroke={brand.pregnancy}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {points.map((p, i) => (
          <Circle
            key={i}
            cx={p.x}
            cy={p.y}
            r={4}
            fill={brand.pregnancy}
            stroke={colors.surface}
            strokeWidth={2}
          />
        ))}
      </Svg>
      <View style={styles.chartLabels}>
        {weights.map((v, i) => (
          <Text key={i} style={[styles.chartLabel, { color: colors.textMuted }]}>
            {v}
          </Text>
        ))}
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
      <View style={[styles.insightTag, { backgroundColor: tagColor + '20', borderRadius: radius.sm }]}>
        <Text style={[styles.insightTagText, { color: tagColor }]}>{tag}</Text>
      </View>
      <Text style={[styles.insightTitle, { color: colors.text }]} numberOfLines={3}>
        {title}
      </Text>
    </View>
  )
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function daysUntil(dueDateStr: string): number {
  const due = new Date(dueDateStr + 'T00:00:00')
  const now = new Date()
  return Math.max(0, Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
}

// ─── Styles ────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    gap: 16,
  },

  // Shared
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

  // 1. Week card
  weekCard: {
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  weekCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  weekCardTrimester: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.7)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  weekCardTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  weekCardSize: {
    fontSize: 16,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.85)',
    marginBottom: 4,
  },
  weekCardNote: {
    fontSize: 14,
    fontWeight: '400',
    color: 'rgba(255,255,255,0.65)',
    lineHeight: 20,
  },

  // 2. Countdown
  countdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  countdownNumber: {
    fontSize: 40,
    fontWeight: '900',
    letterSpacing: -1,
  },
  countdownLabel: {
    fontSize: 15,
    fontWeight: '600',
  },

  // 3. Tip
  tipLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  tipText: {
    fontSize: 16,
    fontWeight: '500',
    fontStyle: 'italic',
    lineHeight: 24,
  },

  // 4. Appointment
  appointmentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  appointmentBody: {
    gap: 2,
  },
  appointmentType: {
    fontSize: 17,
    fontWeight: '700',
  },
  appointmentDate: {
    fontSize: 14,
    fontWeight: '500',
  },
  appointmentDoctor: {
    fontSize: 13,
    fontWeight: '500',
    marginTop: 2,
  },

  // 5. Chart
  chartWrap: {
    alignItems: 'center',
    marginTop: 4,
  },
  chartLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: 280,
    paddingHorizontal: 16,
    marginTop: 4,
  },
  chartLabel: {
    fontSize: 11,
    fontWeight: '600',
  },

  // 6. Kick counter
  kickRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  kickButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kickText: {
    flex: 1,
    gap: 2,
  },
  kickTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  kickSubtitle: {
    fontSize: 13,
    fontWeight: '500',
  },

  // 7. Birth plan
  birthPlanRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  birthPlanText: {
    flex: 1,
  },
  birthPlanSub: {
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 18,
  },

  // 8. Partner
  partnerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  partnerNote: {
    fontSize: 14,
    fontWeight: '500',
    fontStyle: 'italic',
    lineHeight: 20,
  },

  // 9. Quick log
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

  // 10. Grandma
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

  // 11. Insights
  insightRow: {
    flexDirection: 'row',
    gap: 12,
  },
  insightCard: {
    flex: 1,
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
