/**
 * CycleWallet — the pre-pregnancy (cycle) home collapsible card stack.
 *
 * Same wallet system as the pregnancy Week Wallet and the kids wallet (reuses
 * the shared WalletCard primitive). Below the phase ring + Daily Message card +
 * standalone quick-log card, the wallet now holds only the pillars grid.
 * (Today's log summary → standalone quick-log card; the daily nudge → Daily
 * Message module; mood & symptoms → tappable signals in the Today card.)
 */

import React, { useState } from 'react'
import { View } from 'react-native'
import { useTranslation } from '../../../lib/i18n'
import { buildCycleWalletCards, type CycleWalletCardId } from '../../../lib/cycleWallet'
import { WalletCard } from '../WalletCard'
import { CyclePillarsGrid } from './CyclePillarsGrid'
import { LogOvulation } from '../../stickers/RewardStickers'

export function CycleWallet() {
  const { t } = useTranslation()

  const [openId, setOpenId] = useState<CycleWalletCardId | null>('pillars')
  const cards = buildCycleWalletCards()

  const toggle = (id: CycleWalletCardId) => setOpenId((cur) => (cur === id ? null : id))

  const iconFor = (id: CycleWalletCardId): React.ReactNode => {
    switch (id) {
      case 'pillars': return <LogOvulation size={24} />
    }
  }

  const titleFor = (id: CycleWalletCardId): string => {
    switch (id) {
      case 'pillars': return t('cycle_wallet_pillars')
    }
  }

  const bodyFor = (id: CycleWalletCardId): React.ReactNode => {
    switch (id) {
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
