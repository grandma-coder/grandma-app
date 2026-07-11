/**
 * WeekWallet — the pregnancy-home collapsible card stack.
 *
 * Replaces the old TodaySummaryCard + RemindersSection + SlimRow run below the
 * affirmation with one Apple-Wallet-style stack. Owns which card is open
 * (accordion — one at a time, "today" open by default). Bodies reuse existing
 * render logic and route into the modals PregnancyHome already hosts.
 *
 * Pure card list comes from lib/weekWallet.buildWalletCards (unit-tested);
 * this component maps each descriptor to its glyph, title, body, and action.
 */

import React, { useState } from 'react'
import { View, Text, Pressable, StyleSheet } from 'react-native'
import { router } from 'expo-router'
import { useTheme, diffuseFont, useDiffuseTheme } from '../../../constants/theme'
import { useIsDiffuse } from '../../ui/diffuse/DiffuseKit'
import { useTranslation } from '../../../lib/i18n'
import { buildWalletCards, type WalletCardId } from '../../../lib/weekWallet'
import { getUpcomingAppointment } from '../../../lib/pregnancyAppointments'
import type { StandardAppointment } from '../../../lib/pregnancyAppointments'
import { getWeekData } from '../../../lib/pregnancyData'
import type { TodayLogEntry } from '../../../lib/analyticsData'
import { WalletCard } from './WalletCard'
import { TodaySummaryCard } from './TodaySummaryCard'
import { PregnancyUserReminders } from './PregnancyUserReminders'
import {
  NotifyAppointmentDue, TipRead, LogKicks, LogHeartbeat, NotifyRoutine,
} from '../../stickers/RewardStickers'
import { Leaf } from '../../ui/Stickers'
import { GrandmaLogo } from '../../ui/GrandmaLogo'

interface WeekWalletProps {
  weekNumber: number
  todayLogs: Record<string, TodayLogEntry>
  userId: string | undefined
  onLogMetric: (type: string) => void
  onOpenAppointment: (appt: StandardAppointment) => void
  onOpenWeekDetail: () => void
  onOpenBirthGuide: () => void
}

export function WeekWallet({
  weekNumber, todayLogs, userId,
  onLogMetric, onOpenAppointment, onOpenWeekDetail, onOpenBirthGuide,
}: WeekWalletProps) {
  const { colors, stickers, font: f } = useTheme()
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
  const { t } = useTranslation()

  const [openId, setOpenId] = useState<WalletCardId | null>('today')

  const appt = getUpcomingAppointment(weekNumber) ?? null
  const weekData = getWeekData(weekNumber)
  const cards = buildWalletCards({
    weekNumber,
    todayLogs,
    hasWeekTip: !!weekData?.momTip,
    upcomingAppointment: appt,
  })

  const toggle = (id: WalletCardId) => setOpenId((cur) => (cur === id ? null : id))

  const bodyText = (s: string) => (
    <Text
      style={{
        fontSize: 13,
        lineHeight: 19,
        color: diffuse ? dt.colors.ink2 : colors.textMuted,
        fontFamily: diffuse ? diffuseFont.body : f.body,
      }}
    >
      {s}
    </Text>
  )

  const linkBtn = (label: string, onPress: () => void) => (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.linkBtn,
        { borderColor: diffuse ? dt.colors.line2 : colors.borderStrong, opacity: pressed ? 0.7 : 1 },
      ]}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Text
        style={{
          fontSize: 12.5,
          color: diffuse ? dt.colors.ink : colors.text,
          fontFamily: diffuse ? diffuseFont.bodySemiBold : f.bodySemiBold,
        }}
      >
        {label}
      </Text>
    </Pressable>
  )

  const iconFor = (id: WalletCardId): React.ReactNode => {
    switch (id) {
      case 'today': return <LogHeartbeat size={26} />
      case 'appointment': return <NotifyAppointmentDue size={26} />
      case 'week_tip': return <TipRead size={26} />
      case 'kicks': return <LogKicks size={26} />
      case 'reminders': return <NotifyRoutine size={26} />
      case 'birth_guide': return <Leaf size={24} fill={stickers.green} />
      case 'ask_grandma': return <GrandmaLogo size={26} palette="lilac" outline={colors.text} />
    }
  }

  const titleFor = (id: WalletCardId): string => {
    switch (id) {
      case 'today': return t('pregnancy_todayAtGlance')
      case 'appointment': return appt?.name ?? ''
      case 'week_tip': return t('pregnancy_reminder_weekTip', { week: weekNumber })
      case 'kicks': return t('pregnancy_reminder_kickCountTitle')
      case 'reminders': return t('preg_reminders_addButton')
      case 'birth_guide': return t('pregnancy_birthGuideTitle')
      case 'ask_grandma': return t('pregnancy_appt_askGrandma')
    }
  }

  const onHeader = (id: WalletCardId, linkOnly: boolean) => {
    if (id === 'birth_guide') return onOpenBirthGuide()
    if (id === 'ask_grandma') return router.push('/grandma-talk')
    if (linkOnly) return
    toggle(id)
  }

  const bodyFor = (id: WalletCardId): React.ReactNode => {
    switch (id) {
      case 'today':
        return (
          <TodaySummaryCard
            todayLogs={todayLogs}
            weekNumber={weekNumber}
            userId={userId}
            onLogMetric={onLogMetric}
            bare
          />
        )
      case 'appointment':
        return (
          <View style={{ gap: 10 }}>
            {bodyText(`${t('pregnancy_week')} ${appt?.week} · ${appt?.prepNote ?? ''}`)}
            {linkBtn(t('preg_weekCard_tapForDetails'), () => appt && onOpenAppointment(appt))}
          </View>
        )
      case 'week_tip':
        return (
          <View style={{ gap: 10 }}>
            {bodyText(weekData?.momTip ?? '')}
            {linkBtn(t('preg_weekCard_tapForDetails'), onOpenWeekDetail)}
          </View>
        )
      case 'kicks':
        return (
          <View style={{ gap: 10 }}>
            {bodyText(t('pregnancy_reminder_kickCountSubtitle'))}
            {linkBtn(t('pregnancy_logTitle_kicks'), () => onLogMetric('kick_count'))}
          </View>
        )
      case 'reminders':
        return <PregnancyUserReminders userId={userId ?? null} />
      default:
        return null
    }
  }

  return (
    <View>
      {cards.map((c, i) => {
        const isLast = i === cards.length - 1
        return (
          <WalletCard
            key={c.id}
            tone={c.tone}
            icon={iconFor(c.id)}
            title={titleFor(c.id)}
            expanded={openId === c.id}
            linkOnly={c.linkOnly}
            last={isLast}
            onPressHeader={() => onHeader(c.id, c.linkOnly)}
          >
            {bodyFor(c.id)}
          </WalletCard>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  linkBtn: {
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 999,
    borderWidth: 1,
  },
})
