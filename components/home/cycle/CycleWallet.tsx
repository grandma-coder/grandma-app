/**
 * CycleWallet — the pre-pregnancy (cycle) home collapsible card stack.
 *
 * Mirrors the pregnancy Week Wallet model: each card taps straight to a pop-up
 * sheet — nothing expands inline. Holds a Reminders card (opens a sheet with the
 * shared UserReminders add+list) and a Pillars card (opens a sheet with the
 * cycle pillar grid, each tile → /pillar/[id]).
 */

import React, { useEffect, useState } from 'react'
import { View, Text } from 'react-native'
import { router } from 'expo-router'
import { useTheme, useDiffuseTheme, diffuseFont, font } from '../../../constants/theme'
import { useIsDiffuse } from '../../ui/diffuse/DiffuseKit'
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
  const { colors, stickers } = useTheme()
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
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
      case 'reminders': return t('preg_reminders_addButton')
      case 'pillars': return t('cycle_wallet_pillars')
      case 'exams': return t('kids_home_exams_title')
    }
  }

  // Every card taps straight to its pop-up sheet — nothing expands inline.
  const onHeader = (id: CycleWalletCardId) => {
    if (id === 'reminders') return setRemindersOpen(true)
    if (id === 'pillars') return setPillarsOpen(true)
    if (id === 'exams') return router.push('/exams')
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
            linkOnly={showPreview ? false : c.linkOnly}
            last={isLast}
            hideChevron={!showPreview}
            onPressHeader={() => onHeader(c.id)}
          >
            {showPreview ? (
              <View style={{ gap: 6 }}>
                {upcoming.map((r) => (
                  <Text
                    key={r.id}
                    numberOfLines={1}
                    style={{
                      fontFamily: diffuse ? diffuseFont.body : font.body,
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
