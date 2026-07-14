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

import React, { useState, useEffect } from 'react'
import { View, Text, Pressable, StyleSheet } from 'react-native'
import { router } from 'expo-router'
import { useTheme, diffuseFont, useDiffuseTheme } from '../../../constants/theme'
import { useIsDiffuse } from '../../ui/diffuse/DiffuseKit'
import { Character } from '../../characters/Characters'
import { useTranslation } from '../../../lib/i18n'
import { buildWalletCards, type WalletCardId } from '../../../lib/weekWallet'
import { getUpcomingAppointment } from '../../../lib/pregnancyAppointments'
import type { StandardAppointment } from '../../../lib/pregnancyAppointments'
import { getWeekData } from '../../../lib/pregnancyData'
import type { TodayLogEntry } from '../../../lib/analyticsData'
import { loadReminders, upcomingReminders, type Reminder } from '../../../lib/reminders'
import { WalletCard } from '../WalletCard'
import { LogSheet } from '../../calendar/LogSheet'
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

  const [remindersOpen, setRemindersOpen] = useState(false)

  const [reminders, setReminders] = useState<Reminder[]>([])
  useEffect(() => {
    if (remindersOpen) return // don't refetch while editing
    loadReminders(userId ?? null, 'pregnancy').then(setReminders)
  }, [userId, remindersOpen])
  const upcoming = upcomingReminders(reminders, 2)

  const appt = getUpcomingAppointment(weekNumber) ?? null
  const weekData = getWeekData(weekNumber)
  const cards = buildWalletCards({
    weekNumber,
    todayLogs,
    hasWeekTip: !!weekData?.momTip,
    upcomingAppointment: appt,
  })


  const iconFor = (id: WalletCardId): React.ReactNode => {
    switch (id) {
      case 'appointment': return <NotifyAppointmentDue size={26} />
      case 'week_tip': return <TipRead size={26} />
      case 'kicks': return <LogKicks size={26} />
      case 'reminders': return <NotifyRoutine size={26} />
      case 'exams': return <Character name="exam" size={26} color={stickers.lilac} />
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
      case 'exams': return t('kids_home_exams_title')
      case 'birth_guide': return t('pregnancy_birthGuideTitle')
      case 'ask_grandma': return t('pregnancy_appt_askGrandma')
    }
  }

  // Every card taps straight to a detail sheet / log / route — nothing expands
  // inline. Reminders opens its own full sheet.
  const onHeader = (id: WalletCardId, linkOnly: boolean) => {
    if (id === 'birth_guide') return onOpenBirthGuide()
    if (id === 'exams') return router.push('/exams')
    if (id === 'ask_grandma') return router.push('/grandma-talk')
    if (id === 'appointment') return appt && onOpenAppointment(appt)
    if (id === 'week_tip') return onOpenWeekDetail()
    if (id === 'kicks') return onLogMetric('kick_count')
    if (id === 'reminders') return setRemindersOpen(true)
    if (linkOnly) return
  }

  return (
    <View>
      {cards.map((c, i) => {
        const isLast = i === cards.length - 1
        const showPreview = c.id === 'reminders' && upcoming.length > 0
        return (
          <WalletCard
            key={c.id}
            tone={c.tone}
            icon={iconFor(c.id)}
            title={titleFor(c.id)}
            expanded={showPreview}
            linkOnly={c.linkOnly}
            last={isLast}
            hideChevron={!showPreview}
            onPressHeader={() => onHeader(c.id, c.linkOnly)}
          >
            {showPreview ? (
              <View style={{ gap: 6 }}>
                {upcoming.map((r) => (
                  <Text
                    key={r.id}
                    numberOfLines={1}
                    style={{
                      fontFamily: diffuse ? diffuseFont.body : f.body,
                      fontSize: 13,
                      color: diffuse ? dt.colors.ink2 : colors.textMuted,
                    }}
                  >
                    {`• ${r.text}${r.dueDate ? ` · ${new Date(r.dueDate + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}` : ''}`}
                  </Text>
                ))}
              </View>
            ) : undefined}
          </WalletCard>
        )
      })}

      {/* Reminders — full pop-up sheet (compact list + add) */}
      <LogSheet visible={remindersOpen} title={t('pregnancy_reminders_title')} onClose={() => setRemindersOpen(false)}>
        <PregnancyUserReminders userId={userId ?? null} />
      </LogSheet>
    </View>
  )
}

