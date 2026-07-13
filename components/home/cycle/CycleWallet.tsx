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
import { useTheme } from '../../../constants/theme'
import { useTranslation } from '../../../lib/i18n'
import { supabase } from '../../../lib/supabase'
import { buildCycleWalletCards, type CycleWalletCardId } from '../../../lib/cycleWallet'
import { WalletCard } from '../WalletCard'
import { LogSheet } from '../../calendar/LogSheet'
import { UserReminders } from '../UserReminders'
import { CyclePillarsGrid } from './CyclePillarsGrid'
import { NotifyRoutine, LogOvulation } from '../../stickers/RewardStickers'

export function CycleWallet() {
  const { colors } = useTheme()
  const { t } = useTranslation()

  const [userId, setUserId] = useState<string | null>(null)
  useEffect(() => {
    void supabase.auth.getSession().then(({ data: { session } }) => setUserId(session?.user.id ?? null))
  }, [])

  const [remindersOpen, setRemindersOpen] = useState(false)
  const [pillarsOpen, setPillarsOpen] = useState(false)
  const cards = buildCycleWalletCards()

  const iconFor = (id: CycleWalletCardId): React.ReactNode => {
    switch (id) {
      case 'reminders': return <NotifyRoutine size={26} />
      case 'pillars': return <LogOvulation size={24} />
    }
  }

  const titleFor = (id: CycleWalletCardId): string => {
    switch (id) {
      case 'reminders': return t('preg_reminders_addButton')
      case 'pillars': return t('cycle_wallet_pillars')
    }
  }

  // Every card taps straight to its pop-up sheet — nothing expands inline.
  const onHeader = (id: CycleWalletCardId) => {
    if (id === 'reminders') return setRemindersOpen(true)
    if (id === 'pillars') return setPillarsOpen(true)
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
