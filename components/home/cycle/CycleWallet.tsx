/**
 * CycleWallet — the pre-pregnancy (cycle) home collapsible card stack.
 *
 * Same wallet system as the pregnancy Week Wallet and the kids wallet (reuses
 * the shared WalletCard primitive). Replaces the run of sections below the
 * phase ring + standalone quick-log card: daily nudge, mood & symptoms, and the
 * pillars grid. Each card expands to its existing component as the body.
 * (Today's log summary was lifted into the standalone quick-log card.)
 */

import React, { useState } from 'react'
import { View } from 'react-native'
import { useTheme } from '../../../constants/theme'
import { useTranslation } from '../../../lib/i18n'
import { buildCycleWalletCards, type CycleWalletCardId } from '../../../lib/cycleWallet'
import type { CycleConfig, CyclePhase } from '../../../lib/cycleLogic'
import { WalletCard } from '../WalletCard'
import { DailyNudgeCard } from './DailyNudgeCard'
import { MoodSymptomStrip } from './MoodSymptomStrip'
import { CyclePillarsGrid } from './CyclePillarsGrid'
import { TipRead, MoodFace, LogOvulation } from '../../stickers/RewardStickers'

interface CycleWalletProps {
  cycleConfig: CycleConfig
  selectedDate: string
  phase: CyclePhase
}

export function CycleWallet({ cycleConfig, selectedDate, phase }: CycleWalletProps) {
  const { stickers } = useTheme()
  const { t } = useTranslation()

  const [openId, setOpenId] = useState<CycleWalletCardId | null>('nudge')
  const cards = buildCycleWalletCards()

  const toggle = (id: CycleWalletCardId) => setOpenId((cur) => (cur === id ? null : id))

  const iconFor = (id: CycleWalletCardId): React.ReactNode => {
    switch (id) {
      case 'nudge': return <TipRead size={24} />
      case 'mood': return <MoodFace size={22} variant="okay" fill={stickers.pink} />
      case 'pillars': return <LogOvulation size={24} />
    }
  }

  const titleFor = (id: CycleWalletCardId): string => {
    switch (id) {
      case 'nudge': return t('cycle_wallet_nudge')
      case 'mood': return t('cycle_wallet_mood')
      case 'pillars': return t('cycle_wallet_pillars')
    }
  }

  const bodyFor = (id: CycleWalletCardId): React.ReactNode => {
    switch (id) {
      case 'nudge': return <DailyNudgeCard cycleConfig={cycleConfig} selectedDate={selectedDate} />
      case 'mood': return <MoodSymptomStrip phase={phase} />
      case 'pillars': return <CyclePillarsGrid />
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
            onPressHeader={() => toggle(c.id)}
          >
            {bodyFor(c.id)}
          </WalletCard>
        )
      })}
    </View>
  )
}
