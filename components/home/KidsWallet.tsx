/**
 * KidsWallet — the kids-home wallet card stack.
 *
 * Same wallet system as the pregnancy Week Wallet (reuses the shared WalletCard
 * primitive). Replaces the run of sections below the 2×2 stat tiles: Set Goals,
 * Health & Care, Diaper, Growth Leap, Reminders, Ask Grandma, Rewards.
 *
 * Follows the pregnancy pattern: every card taps straight to a route / pop-up
 * sheet — nothing expands inline, and no trailing arrows (hideChevron). The card
 * list comes from lib/kidsWallet.buildKidsWalletCards (unit-tested); this
 * component maps each descriptor to its glyph, title, and action. All modals /
 * routes are owned by KidsHome and passed in as callbacks.
 */

import React from 'react'
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
  /** opens the growth-leap info pop-up sheet (owned by KidsHome) */
  onOpenGrowthLeap: () => void
  /** opens the reminders pop-up sheet (owned by KidsHome) */
  onOpenReminders: () => void
}

export function KidsWallet({
  hasDiaper, hasGrowthLeap, growthLeapName,
  onOpenGoals, onOpenHealth, onOpenDiaper, onOpenGrowthLeap, onOpenReminders,
}: KidsWalletProps) {
  const { colors, stickers } = useTheme()
  const { t } = useTranslation()
  const diffuse = useIsDiffuse()

  const cards = buildKidsWalletCards({ hasDiaper, hasGrowthLeap })

  const iconFor = (id: KidsWalletCardId): React.ReactNode => {
    // Under Diffuse, the wallet rows use the unified Character-blob family
    // (ask_grandma keeps the brand mark). Current cream-paper keeps the
    // branded / reward stickers.
    if (diffuse) {
      switch (id) {
        case 'goals': return <Character name="star" size={26} color={stickers.yellow} />
        case 'health': return <Character name="health" size={26} color={stickers.coral} />
        case 'exams': return <Character name="exam" size={26} color={stickers.lilac} />
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
      case 'exams': return <Character name="exam" size={24} color={stickers.lilac} />
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
      case 'exams': return t('wallet_exams_title')
      case 'diaper': return t('kids_home_diaper_tracker_title')
      case 'growth_leap': return growthLeapName ?? t('kids_growthLeaps')
      case 'reminders': return t('wallet_reminders_title')
      case 'ask_grandma': return t('wallet_askGrandma_title')
      case 'rewards': return t('wallet_rewards_title')
    }
  }

  // Every card taps straight to a route / pop-up sheet — nothing expands inline.
  const onHeader = (id: KidsWalletCardId) => {
    switch (id) {
      case 'goals': return onOpenGoals()
      case 'health': return onOpenHealth()
      case 'exams': return router.push('/exams?behavior=kids' as never)
      case 'diaper': return onOpenDiaper()
      case 'ask_grandma': return router.push('/grandma-talk' as never)
      case 'rewards': return router.push('/daily-rewards' as never)
      case 'growth_leap': return onOpenGrowthLeap()
      case 'reminders': return onOpenReminders()
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
            expanded={false}
            linkOnly={c.linkOnly}
            last={isLast}
            hideChevron
            onPressHeader={() => onHeader(c.id)}
          />
        )
      })}
    </View>
  )
}
