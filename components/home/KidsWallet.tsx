/**
 * KidsWallet — the kids-home collapsible card stack.
 *
 * Same wallet system as the pregnancy Week Wallet (reuses the shared WalletCard
 * primitive). Replaces the run of sections below the 2×2 stat tiles: Set Goals,
 * Health & Care, Diaper, Growth Leap, Reminders, Ask Grandma, Rewards.
 *
 * The card list comes from lib/kidsWallet.buildKidsWalletCards (unit-tested);
 * this component maps each descriptor to its glyph, title, and action. Actions
 * that open modals / route are owned by KidsHome and passed in as callbacks;
 * the growth-leap inline body is passed in as a render prop so KidsWallet stays
 * decoupled from KidsHome's internal GrowthLeapCard.
 */

import React, { useState } from 'react'
import { View } from 'react-native'
import { router } from 'expo-router'
import { useTheme } from '../../constants/theme'
import { useTranslation } from '../../lib/i18n'
import { buildKidsWalletCards, type KidsWalletCardId } from '../../lib/kidsWallet'
import { WalletCard } from './WalletCard'
import { useIsDiffuse } from '../ui/diffuse/DiffuseKit'
import { Character } from '../characters/Characters'
import {
  NotifyGoalAchieved, NotifyRoutine, LogDiaper, LogGrowth,
} from '../stickers/RewardStickers'
import { Heart as HeartSticker, Star as StarSticker } from '../ui/Stickers'
import { GrandmaLogo } from '../ui/GrandmaLogo'

interface KidsWalletProps {
  hasDiaper: boolean
  hasGrowthLeap: boolean
  /** the child's active growth-leap name, for the growth_leap card title */
  growthLeapName?: string
  onOpenGoals: () => void
  onOpenHealth: () => void
  onOpenDiaper: () => void
  /** inline body for the growth-leap card (KidsHome's <GrowthLeapCard/>) */
  growthLeapBody?: React.ReactNode
  /** inline body for the reminders card (KidsHome's add-reminder input + view-all) */
  remindersBody?: React.ReactNode
}

export function KidsWallet({
  hasDiaper, hasGrowthLeap, growthLeapName,
  onOpenGoals, onOpenHealth, onOpenDiaper, growthLeapBody, remindersBody,
}: KidsWalletProps) {
  const { colors, stickers } = useTheme()
  const { t } = useTranslation()
  const diffuse = useIsDiffuse()

  const [openId, setOpenId] = useState<KidsWalletCardId | null>(null)
  const cards = buildKidsWalletCards({ hasDiaper, hasGrowthLeap })

  const toggle = (id: KidsWalletCardId) => setOpenId((cur) => (cur === id ? null : id))

  const iconFor = (id: KidsWalletCardId): React.ReactNode => {
    // Under Diffuse, the wallet rows use the unified Character-blob family
    // (ask_grandma keeps the brand mark). Current cream-paper keeps the
    // branded / reward stickers.
    if (diffuse) {
      switch (id) {
        case 'goals': return <Character name="star" size={26} color={stickers.yellow} />
        case 'health': return <Character name="health" size={26} color={stickers.coral} />
        case 'diaper': return <Character name="diaper" size={26} color={stickers.peach} />
        case 'growth_leap': return <Character name="growth" size={26} color={stickers.green} />
        case 'reminders': return <Character name="clock" size={26} color={stickers.blue} />
        case 'ask_grandma': return <GrandmaLogo size={26} palette="sky" outline={colors.text} />
        case 'rewards': return <Character name="crown" size={26} color={stickers.yellow} />
      }
    }
    switch (id) {
      case 'goals': return <StarSticker size={24} fill={stickers.yellow} stroke="#141313" />
      case 'health': return <HeartSticker size={24} fill={stickers.coral} />
      case 'diaper': return <LogDiaper size={24} />
      case 'growth_leap': return <LogGrowth size={24} />
      case 'reminders': return <NotifyRoutine size={24} />
      case 'ask_grandma': return <GrandmaLogo size={26} palette="sky" outline={colors.text} />
      case 'rewards': return <NotifyGoalAchieved size={24} />
    }
  }

  const titleFor = (id: KidsWalletCardId): string => {
    switch (id) {
      case 'goals': return t('kids_home_set_goals_btn')
      case 'health': return t('kids_home_section_health_care')
      case 'diaper': return t('kids_home_diaper_tracker_title')
      case 'growth_leap': return growthLeapName ?? t('kids_home_section_reminders')
      case 'reminders': return t('kids_home_section_reminders')
      case 'ask_grandma': return t('kids_home_grandma_cta_title')
      case 'rewards': return t('kids_home_rewards_title')
    }
  }

  const onHeader = (id: KidsWalletCardId, linkOnly: boolean) => {
    switch (id) {
      case 'goals': return onOpenGoals()
      case 'health': return onOpenHealth()
      case 'diaper': return onOpenDiaper()
      case 'ask_grandma': return router.push('/grandma-talk' as never)
      case 'rewards': return router.push('/daily-rewards' as never)
      case 'growth_leap':
      case 'reminders':
        if (!linkOnly) toggle(id)
        return
    }
  }

  const bodyFor = (id: KidsWalletCardId): React.ReactNode => {
    if (id === 'growth_leap') return growthLeapBody
    if (id === 'reminders') return remindersBody
    return null
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
