/**
 * CycleWallet — the pre-pregnancy (cycle) home collapsible card stack.
 *
 * Same wallet system as the pregnancy Week Wallet and the kids wallet (reuses
 * the shared WalletCard primitive). Holds the run of sections below the phase
 * ring + Daily Message card + standalone quick-log card: mood & symptoms, and
 * the pillars grid. Each card expands to its existing component as the body.
 * (Today's log summary → standalone quick-log card; the old daily nudge →
 * Daily Message module, both above the wallet now.)
 */

import React, { useState } from 'react'
import { View } from 'react-native'
import { useTheme } from '../../../constants/theme'
import { useTranslation } from '../../../lib/i18n'
import { buildCycleWalletCards, type CycleWalletCardId } from '../../../lib/cycleWallet'
import type { CyclePhase } from '../../../lib/cycleLogic'
import { WalletCard } from '../WalletCard'
import { MoodSymptomStrip } from './MoodSymptomStrip'
import { CyclePillarsGrid } from './CyclePillarsGrid'
import { MoodFace, LogOvulation } from '../../stickers/RewardStickers'

interface CycleWalletProps {
  phase: CyclePhase
}

export function CycleWallet({ phase }: CycleWalletProps) {
  const { stickers } = useTheme()
  const { t } = useTranslation()

  const [openId, setOpenId] = useState<CycleWalletCardId | null>('mood')
  const cards = buildCycleWalletCards()

  const toggle = (id: CycleWalletCardId) => setOpenId((cur) => (cur === id ? null : id))

  const iconFor = (id: CycleWalletCardId): React.ReactNode => {
    switch (id) {
      case 'mood': return <MoodFace size={22} variant="okay" fill={stickers.pink} />
      case 'pillars': return <LogOvulation size={24} />
    }
  }

  const titleFor = (id: CycleWalletCardId): string => {
    switch (id) {
      case 'mood': return t('cycle_wallet_mood')
      case 'pillars': return t('cycle_wallet_pillars')
    }
  }

  const bodyFor = (id: CycleWalletCardId): React.ReactNode => {
    switch (id) {
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
