/**
 * CycleWallet — the pre-pregnancy (cycle) home collapsible card stack.
 *
 * Mirrors the pregnancy Week Wallet model: each card taps straight to a pop-up
 * sheet — nothing expands inline. Holds a Reminders card (opens a sheet with the
 * shared UserReminders add+list) and a Pillars card (opens a sheet with the
 * cycle pillar grid, each tile → /pillar/[id]).
 */

import React, { useEffect, useState } from 'react'
import { View } from 'react-native'
import { router } from 'expo-router'
import { useTheme } from '../../../constants/theme'
import { useTranslation } from '../../../lib/i18n'
import { supabase } from '../../../lib/supabase'
import { buildCycleWalletCards, type CycleWalletCardId } from '../../../lib/cycleWallet'
import { loadReminders, upcomingReminders, type Reminder } from '../../../lib/reminders'
import { WalletCard } from '../WalletCard'
import { LogSheet } from '../../calendar/LogSheet'
import { UserReminders } from '../UserReminders'
import { CyclePillarsGrid } from './CyclePillarsGrid'
import { NotifyRoutine, LogOvulation } from '../../stickers/RewardStickers'
import { Character } from '../../characters/Characters'

export function CycleWallet() {
  const { stickers } = useTheme()
  const { t } = useTranslation()

  const [userId, setUserId] = useState<string | null>(null)
  useEffect(() => {
    void supabase.auth.getSession().then(({ data: { session } }) => setUserId(session?.user.id ?? null))
  }, [])

  const [remindersOpen, setRemindersOpen] = useState(false)
  const [pillarsOpen, setPillarsOpen] = useState(false)
  const cards = buildCycleWalletCards()

  const [reminders, setReminders] = useState<Reminder[]>([])
  useEffect(() => {
    if (remindersOpen) return // don't refetch while editing
    loadReminders(userId ?? null, 'pre-pregnancy').then(setReminders)
  }, [userId, remindersOpen])
  const upcoming = upcomingReminders(reminders, 2)

  const iconFor = (id: CycleWalletCardId): React.ReactNode => {
    switch (id) {
      case 'reminders': return <NotifyRoutine size={26} />
      case 'pillars': return <LogOvulation size={24} />
      case 'exams': return <Character name="exam" size={26} color={stickers.blue} />
    }
  }

  const titleFor = (id: CycleWalletCardId): string => {
    switch (id) {
      case 'reminders': return t('wallet_reminders_title')
      case 'pillars': return t('cycle_wallet_pillars')
      case 'exams': return t('wallet_exams_title')
    }
  }

  // Every card taps straight to its pop-up sheet — nothing expands inline.
  const onHeader = (id: CycleWalletCardId) => {
    if (id === 'reminders') return setRemindersOpen(true)
    if (id === 'pillars') return setPillarsOpen(true)
    if (id === 'exams') return router.push('/exams?behavior=pre-pregnancy')
  }

  return (
    <View>
      {cards.map((c, i) => {
        const isLast = i === cards.length - 1
        // Reminders card shows a notification-style count badge (upcoming) and
        // taps straight to the sheet — no inline expanded body.
        const reminderBadge = c.id === 'reminders' ? upcoming.length : undefined
        return (
          <WalletCard
            key={c.id}
            tone={c.tone}
            icon={iconFor(c.id)}
            title={titleFor(c.id)}
            badge={reminderBadge}
            expanded={false}
            linkOnly={c.linkOnly}
            last={isLast}
            hideChevron
            onPressHeader={() => onHeader(c.id)}
          />
        )
      })}

      {/* Reminders — pop-up sheet (shared add + list, cycle-scoped) */}
      <LogSheet visible={remindersOpen} title={t('pregnancy_reminders_title')} onClose={() => setRemindersOpen(false)}>
        <UserReminders userId={userId} context="pre-pregnancy" />
      </LogSheet>

      {/* Pillars — pop-up sheet with the pillar grid; each tile opens /pillar/[id]
          and closes the sheet on the way out. */}
      <LogSheet visible={pillarsOpen} title={t('cycle_wallet_pillars')} onClose={() => setPillarsOpen(false)}>
        <CyclePillarsGrid bare onNavigate={() => setPillarsOpen(false)} />
      </LogSheet>
    </View>
  )
}
