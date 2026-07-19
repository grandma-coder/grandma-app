/**
 * WeekWallet — the pregnancy-home collapsible card stack.
 *
 * Replaces the old TodaySummaryCard + RemindersSection + SlimRow run below the
 * affirmation with one Apple-Wallet-style stack. Bodies reuse existing render
 * logic and route into the modals PregnancyHome already hosts.
 *
 * Editable: the default (contextual) card list comes from
 * lib/weekWallet.buildWalletCards (unit-tested). The user can customize which
 * cards show + their order via the Edit picker (usePregnancyWalletStore); the
 * common shortcuts (Rewards · Channels · Village) can be added on top of the
 * behavior cards. When uncustomized (enabledKeys null) the builder order is used.
 */

import React, { useState, useEffect } from 'react'
import { View, Pressable, Text } from 'react-native'
import { router } from 'expo-router'
import { useTheme, diffuseFont, useDiffuseTheme } from '../../../constants/theme'
import { useIsDiffuse } from '../../ui/diffuse/DiffuseKit'
import { SlidersHorizontal } from 'lucide-react-native'
import { Character } from '../../characters/Characters'
import { useTranslation } from '../../../lib/i18n'
import { buildWalletCards, type WalletCardId } from '../../../lib/weekWallet'
import { WALLET_SHORTCUTS } from '../../../lib/walletCatalog'
import { usePregnancyWalletStore } from '../../../store/useWalletStore'
import type { WalletTone } from '../../../lib/wallet'
import { getUpcomingAppointment } from '../../../lib/pregnancyAppointments'
import type { StandardAppointment } from '../../../lib/pregnancyAppointments'
import { getWeekData } from '../../../lib/pregnancyData'
import type { TodayLogEntry } from '../../../lib/analyticsData'
import { loadReminders, upcomingReminders, type Reminder } from '../../../lib/reminders'
import { WalletCard } from '../WalletCard'
import { WalletPicker, type WalletPickerItem } from '../WalletPicker'
import { LogSheet } from '../../calendar/LogSheet'
import { PregnancyUserReminders } from './PregnancyUserReminders'
import {
  NotifyAppointmentDue, TipRead, LogKicks, NotifyRoutine, NotifyGoalAchieved,
} from '../../stickers/RewardStickers'
import { Leaf } from '../../ui/Stickers'
import { GrandmaLogo } from '../../ui/GrandmaLogo'

/** Superset of card ids the week wallet can show (contextual + shortcuts). */
type PregCardId = WalletCardId | 'rewards' | 'channels' | 'village'

interface WeekWalletProps {
  weekNumber: number
  todayLogs: Record<string, TodayLogEntry>
  userId: string | undefined
  onLogMetric: (type: string) => void
  onOpenAppointment: (appt: StandardAppointment) => void
  onOpenWeekDetail: () => void
  onOpenBirthGuide: () => void
}

const SHORTCUT_TONE: Record<string, WalletTone> = { rewards: 'coral', channels: 'peach', village: 'green' }

export function WeekWallet({
  weekNumber, todayLogs, userId,
  onLogMetric, onOpenAppointment, onOpenWeekDetail, onOpenBirthGuide,
}: WeekWalletProps) {
  const { colors, stickers } = useTheme()
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
  const { t } = useTranslation()
  const enabledKeys = usePregnancyWalletStore((s) => s.enabledKeys)
  const setEnabled = usePregnancyWalletStore((s) => s.setEnabled)
  const [pickerOpen, setPickerOpen] = useState(false)

  const [remindersOpen, setRemindersOpen] = useState(false)
  const [reminders, setReminders] = useState<Reminder[]>([])
  useEffect(() => {
    if (remindersOpen) return // don't refetch while editing
    loadReminders(userId ?? null, 'pregnancy').then(setReminders)
  }, [userId, remindersOpen])
  const upcoming = upcomingReminders(reminders, 2)

  const appt = getUpcomingAppointment(weekNumber) ?? null
  const weekData = getWeekData(weekNumber)
  const defaultCards = buildWalletCards({
    weekNumber,
    todayLogs,
    hasWeekTip: !!weekData?.momTip,
    upcomingAppointment: appt,
  })

  const shortcutOnlyIds: PregCardId[] = WALLET_SHORTCUTS
    .map((s) => s.key)
    .filter((k) => !defaultCards.some((c) => c.id === k)) as PregCardId[]
  const availableIds: PregCardId[] = [...defaultCards.map((c) => c.id), ...shortcutOnlyIds]

  const displayedIds: PregCardId[] =
    enabledKeys === null
      ? defaultCards.map((c) => c.id)
      : enabledKeys.filter((k): k is PregCardId => availableIds.includes(k as PregCardId))

  const toneFor = (id: PregCardId): WalletTone =>
    defaultCards.find((c) => c.id === id)?.tone ?? SHORTCUT_TONE[id] ?? 'surface'

  const linkOnlyFor = (id: PregCardId): boolean =>
    defaultCards.find((c) => c.id === id)?.linkOnly ?? true

  const iconFor = (id: PregCardId): React.ReactNode => {
    // Diffuse: Character blobs per card. Legacy theme keeps the reward stickers.
    if (diffuse) {
      switch (id) {
        case 'appointment': return <Character name="checkup" size={26} color={stickers.lilac} />
        case 'week_tip': return <Character name="tip" size={26} color={stickers.yellow} />
        case 'kicks': return <Character name="kick" size={26} color={stickers.coral} />
        case 'reminders': return <Character name="bell" size={26} color={stickers.blue} />
        case 'exams': return <Character name="exam" size={26} color={stickers.lilac} />
        case 'birth_guide': return <Character name="nutrition" size={26} color={stickers.green} />
        case 'ask_grandma': return <GrandmaLogo size={26} palette="lilac" outline={colors.text} />
        case 'rewards': return <Character name="reward" size={26} color={stickers.yellow} />
        case 'channels': return <Character name="community" size={26} color={stickers.peach} />
        case 'village': return <Character name="community" size={26} color={stickers.green} />
      }
    }
    switch (id) {
      case 'appointment': return <NotifyAppointmentDue size={26} />
      case 'week_tip': return <TipRead size={26} />
      case 'kicks': return <LogKicks size={26} />
      case 'reminders': return <NotifyRoutine size={26} />
      case 'exams': return <Character name="exam" size={26} color={stickers.lilac} />
      case 'birth_guide': return <Leaf size={24} fill={stickers.green} />
      case 'ask_grandma': return <GrandmaLogo size={26} palette="lilac" outline={colors.text} />
      case 'rewards': return <NotifyGoalAchieved size={24} />
      case 'channels': return <Character name="community" size={26} color={stickers.peach} />
      case 'village': return <Character name="community" size={26} color={stickers.green} />
    }
  }

  const titleFor = (id: PregCardId): string => {
    switch (id) {
      case 'appointment': return appt?.name ?? ''
      case 'week_tip': return t('pregnancy_reminder_weekTip', { week: weekNumber })
      case 'kicks': return t('pregnancy_reminder_kickCountTitle')
      case 'reminders': return t('wallet_reminders_title')
      case 'exams': return t('wallet_exams_title')
      case 'birth_guide': return t('pregnancy_birthGuideTitle')
      case 'ask_grandma': return t('wallet_askGrandma_title')
      case 'rewards': return t('wallet_rewards_title')
      case 'channels': return t('wallet_channels_title')
      case 'village': return t('wallet_village_title')
    }
  }

  const softFor = (id: PregCardId): string => {
    switch (id) {
      case 'appointment': return stickers.yellowSoft
      case 'week_tip': return stickers.lilacSoft
      case 'kicks': return stickers.greenSoft
      case 'reminders': return stickers.blueSoft
      case 'exams': return stickers.lilacSoft
      case 'birth_guide': return stickers.greenSoft
      case 'ask_grandma': return stickers.lilacSoft
      case 'rewards': return stickers.peachSoft
      case 'channels': return stickers.peachSoft
      case 'village': return stickers.greenSoft
    }
  }

  // Every card taps straight to a detail sheet / log / route — nothing expands
  // inline. Reminders opens its own full sheet.
  const onHeader = (id: PregCardId, linkOnly: boolean) => {
    if (id === 'birth_guide') return onOpenBirthGuide()
    if (id === 'exams') return router.push('/exams?behavior=pregnancy')
    if (id === 'ask_grandma') return router.push('/grandma-talk')
    if (id === 'rewards') return router.push('/daily-rewards')
    if (id === 'channels') return router.push('/community?tab=channels')
    if (id === 'village') return router.push('/village')
    if (id === 'appointment') return appt && onOpenAppointment(appt)
    if (id === 'week_tip') return onOpenWeekDetail()
    if (id === 'kicks') return onLogMetric('kick_count')
    if (id === 'reminders') return setRemindersOpen(true)
    if (linkOnly) return
  }

  const pickerItems: WalletPickerItem[] = availableIds.map((id) => ({
    key: id,
    label: titleFor(id),
    icon: iconFor(id),
    soft: softFor(id),
  }))

  const editColor = diffuse ? dt.colors.ink3 : colors.textMuted

  return (
    <View>
      {/* Edit affordance — opens the wallet customization picker. */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', marginBottom: 8 }}>
        <Pressable onPress={() => setPickerOpen(true)} hitSlop={10} style={({ pressed }) => [{ flexDirection: 'row', alignItems: 'center', gap: 5, opacity: pressed ? 0.6 : 1 }]}>
          <SlidersHorizontal size={14} color={editColor} strokeWidth={2} />
          <Text style={{ fontFamily: diffuse ? diffuseFont.mono : undefined, fontSize: 11, letterSpacing: diffuse ? 0.8 : 0, textTransform: diffuse ? 'uppercase' : 'none', color: editColor }}>
            {t('kids_quickLogs_edit')}
          </Text>
        </Pressable>
      </View>

      {displayedIds.map((id, i) => {
        const isLast = i === displayedIds.length - 1
        // Reminders card shows a notification-style count badge (upcoming).
        const reminderBadge = id === 'reminders' ? upcoming.length : undefined
        return (
          <WalletCard
            key={id}
            tone={toneFor(id)}
            icon={iconFor(id)}
            title={titleFor(id)}
            badge={reminderBadge}
            expanded={false}
            linkOnly={linkOnlyFor(id)}
            last={isLast}
            hideChevron
            onPressHeader={() => onHeader(id, linkOnlyFor(id))}
          />
        )
      })}

      {/* Reminders — full pop-up sheet (compact list + add) */}
      <LogSheet visible={remindersOpen} title={t('pregnancy_reminders_title')} onClose={() => setRemindersOpen(false)}>
        <PregnancyUserReminders userId={userId ?? null} />
      </LogSheet>

      <WalletPicker
        visible={pickerOpen}
        onClose={() => setPickerOpen(false)}
        items={pickerItems}
        enabledKeys={displayedIds}
        onSave={setEnabled}
      />
    </View>
  )
}
