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
import { WalletCard } from '../WalletCard'
import { PregnancyUserReminders } from './PregnancyUserReminders'
import {
  NotifyAppointmentDue, TipRead, LogKicks, NotifyRoutine,
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

  const [openId, setOpenId] = useState<WalletCardId | null>('reminders')

  const appt = getUpcomingAppointment(weekNumber) ?? null
  const weekData = getWeekData(weekNumber)
  const cards = buildWalletCards({
    weekNumber,
    todayLogs,
    hasWeekTip: !!weekData?.momTip,
    upcomingAppointment: appt,
  })

  const toggle = (id: WalletCardId) => setOpenId((cur) => (cur === id ? null : id))


  const iconFor = (id: WalletCardId): React.ReactNode => {
    switch (id) {
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
      case 'appointment': return appt?.name ?? ''
      case 'week_tip': return t('pregnancy_reminder_weekTip', { week: weekNumber })
      case 'kicks': return t('pregnancy_reminder_kickCountTitle')
      case 'reminders': return t('preg_reminders_addButton')
      case 'birth_guide': return t('pregnancy_birthGuideTitle')
      case 'ask_grandma': return t('pregnancy_appt_askGrandma')
    }
  }

  // Tapping a card acts directly (opens a detail sheet / logs / routes) instead
  // of expanding inline — except 'reminders', which is a genuine inline list.
  const onHeader = (id: WalletCardId, linkOnly: boolean) => {
    if (id === 'birth_guide') return onOpenBirthGuide()
    if (id === 'ask_grandma') return router.push('/grandma-talk')
    if (id === 'appointment') return appt && onOpenAppointment(appt)
    if (id === 'week_tip') return onOpenWeekDetail()
    if (id === 'kicks') return onLogMetric('kick_count')
    if (linkOnly) return
    toggle(id) // reminders
  }

  // Only 'reminders' renders an inline body now; every other card taps straight
  // to its detail sheet / log / route (see onHeader).
  const bodyFor = (id: WalletCardId): React.ReactNode =>
    id === 'reminders' ? <PregnancyUserReminders userId={userId ?? null} /> : null

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
            // Only 'reminders' keeps the inline body + chevron; every other card
            // taps straight to a detail sheet / log / route (no arrow).
            hideChevron={c.id !== 'reminders'}
            onPressHeader={() => onHeader(c.id, c.linkOnly)}
          >
            {bodyFor(c.id)}
          </WalletCard>
        )
      })}
    </View>
  )
}

