/**
 * KidsWallet — the kids-home wallet card stack.
 *
 * Same wallet system as the pregnancy Week Wallet (reuses the shared WalletCard
 * primitive). Replaces the run of sections below the 2×2 stat tiles: Set Goals,
 * Health & Care, Diaper, Growth Leap, Reminders, Ask Grandma, Rewards, plus the
 * addable common shortcuts (Exams · Channels · Village).
 *
 * Editable: the default card list comes from lib/kidsWallet.buildKidsWalletCards
 * (unit-tested, contextual). The user can customize which cards show + their
 * order via the Edit picker (useKidsWalletStore). When the store hasn't been
 * customized (enabledKeys null) the builder's default order is used. Every card
 * taps straight to a route / pop-up sheet — nothing expands inline.
 */

import React, { useState } from 'react'
import { View } from 'react-native'
import { router } from 'expo-router'
import { useTheme, useDiffuseTheme } from '../../constants/theme'
import { useTranslation } from '../../lib/i18n'
import type { TranslationKeys } from '../../lib/i18n/keys'
import { buildKidsWalletCards, type KidsWalletCardId } from '../../lib/kidsWallet'
import { WALLET_SHORTCUTS } from '../../lib/walletCatalog'
import { useKidsWalletStore } from '../../store/useWalletStore'
import type { WalletTone } from '../../lib/wallet'
import { WalletCard } from './WalletCard'
import { WalletPicker, type WalletPickerItem } from './WalletPicker'
import { QuietPill } from '../ui/QuietPill'
import { useIsDiffuse } from '../ui/diffuse/DiffuseKit'
import { SlidersHorizontal } from 'lucide-react-native'
import { Character } from '../characters/Characters'
import { MemoriesSheet } from './MemoriesSheet'
import {
  NotifyGoalAchieved, NotifyRoutine, LogDiaper, LogGrowth,
} from '../stickers/RewardStickers'
import { Heart as HeartSticker, Star as StarSticker } from '../ui/Stickers'
import { GrandmaLogo } from '../ui/GrandmaLogo'

/**
 * Superset of card ids the kids wallet can render (contextual + shortcuts).
 * `essentials` is intentionally excluded — it's pinned above the wallet by the
 * home (EssentialsWalletCard), never listed inside the stack.
 */
type KidsCardId = Exclude<KidsWalletCardId, 'essentials'> | 'channels' | 'village'

interface KidsWalletProps {
  hasDiaper: boolean
  hasGrowthLeap: boolean
  /** the child's active growth-leap name, for the growth_leap card title */
  growthLeapName?: string
  onOpenGoals: () => void
  onOpenHealth: () => void
  onOpenVaccines: () => void
  onOpenDiaper: () => void
  /** opens the growth-leap info pop-up sheet (owned by KidsHome) */
  onOpenGrowthLeap: () => void
  /** opens the reminders pop-up sheet (owned by KidsHome) */
  onOpenReminders: () => void
  /** Caregiver share allowlist (card ids). Null → owner: show every card. */
  visibleCardIds?: Set<string> | null
}

// Tone per shortcut-only card (contextual card tones come from the builder).
const SHORTCUT_TONE: Record<string, WalletTone> = { channels: 'peach', village: 'green' }

export function KidsWallet({
  hasDiaper, hasGrowthLeap, growthLeapName,
  onOpenGoals, onOpenHealth, onOpenVaccines, onOpenDiaper, onOpenGrowthLeap, onOpenReminders,
  visibleCardIds = null,
}: KidsWalletProps) {
  const { colors, stickers } = useTheme()
  const { t } = useTranslation()
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
  const enabledKeys = useKidsWalletStore((s) => s.enabledKeys)
  const setEnabled = useKidsWalletStore((s) => s.setEnabled)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [showMemories, setShowMemories] = useState(false)

  // Default (contextual) cards from the pure builder. `essentials` is pinned by
  // the home above the wallet (EssentialsWalletCard), so it never lives here.
  const defaultCards = buildKidsWalletCards({ hasDiaper, hasGrowthLeap })
    .filter((c): c is typeof c & { id: KidsCardId } => c.id !== 'essentials')
  const toneFor = (id: KidsCardId): WalletTone =>
    defaultCards.find((c) => c.id === id)?.tone ?? SHORTCUT_TONE[id] ?? 'surface'

  // The full available superset = default cards + catalog shortcuts not already
  // present (exams / ask_grandma / rewards are in the builder; add channels /
  // village). Order: builder cards first, then the extra shortcuts.
  const shortcutOnlyIds: KidsCardId[] = WALLET_SHORTCUTS
    .map((s) => s.key)
    .filter((k) => !defaultCards.some((c) => c.id === k)) as KidsCardId[]
  const availableIds: KidsCardId[] = [...defaultCards.map((c) => c.id), ...shortcutOnlyIds]

  // Displayed cards: builder order when uncustomized; else the user's enabled
  // keys (in their order), dropping any key whose card isn't currently available
  // (e.g. a contextual card with no data this session). For a caregiver, further
  // restrict to the shared allowlist (owner → visibleCardIds null → no filter).
  const displayedIds: KidsCardId[] = (
    enabledKeys === null
      ? defaultCards.map((c) => c.id)
      : enabledKeys.filter((k): k is KidsCardId => availableIds.includes(k as KidsCardId))
  ).filter((id) => visibleCardIds === null || visibleCardIds.has(id))

  const iconFor = (id: KidsCardId): React.ReactNode => {
    if (diffuse) {
      switch (id) {
        case 'goals': return <Character name="star" size={26} color={stickers.yellow} />
        case 'health': return <Character name="health" size={26} color={stickers.coral} />
        case 'vaccines': return <Character name="vaccine" size={26} color={stickers.blue} />
        case 'exams': return <Character name="exam" size={26} color={stickers.lilac} />
        case 'diaper': return <Character name="diaper" size={26} color={stickers.peach} />
        case 'growth_leap': return <Character name="growth" size={26} color={stickers.green} />
        case 'reminders': return <Character name="clock" size={26} color={stickers.blue} />
        case 'memories': return <Character name="photo" size={26} color={stickers.pink} />
        case 'ask_grandma': return <GrandmaLogo size={26} palette="sky" outline={colors.text} />
        case 'rewards': return <Character name="crown" size={26} color={stickers.yellow} />
        case 'channels': return <Character name="community" size={26} color={stickers.peach} />
        case 'village': return <Character name="community" size={26} color={stickers.green} />
      }
    }
    switch (id) {
      case 'goals': return <StarSticker size={24} fill={stickers.yellow} stroke="#141313" />
      case 'health': return <HeartSticker size={24} fill={stickers.coral} />
      case 'vaccines': return <Character name="vaccine" size={24} color={stickers.blue} />
      case 'exams': return <Character name="exam" size={24} color={stickers.lilac} />
      case 'diaper': return <LogDiaper size={24} />
      case 'growth_leap': return <LogGrowth size={24} />
      case 'reminders': return <NotifyRoutine size={24} />
      case 'memories': return <Character name="photo" size={24} color={stickers.pink} />
      case 'ask_grandma': return <GrandmaLogo size={26} palette="sky" outline={colors.text} />
      case 'rewards': return <NotifyGoalAchieved size={24} />
      case 'channels': return <Character name="community" size={24} color={stickers.peach} />
      case 'village': return <Character name="community" size={24} color={stickers.green} />
    }
  }

  const titleFor = (id: KidsCardId): string => {
    switch (id) {
      case 'goals': return t('kids_home_set_goals_btn')
      case 'health': return t('kids_home_section_health_care')
      case 'vaccines': return t('kids_vaccines_title' as keyof TranslationKeys)
      case 'exams': return t('wallet_exams_title')
      case 'diaper': return t('kids_home_diaper_tracker_title')
      case 'growth_leap': return growthLeapName ?? t('kids_growthLeaps')
      case 'reminders': return t('wallet_reminders_title')
      case 'memories': return t('wallet_memories_title')
      case 'ask_grandma': return t('wallet_askGrandma_title')
      case 'rewards': return t('wallet_rewards_title')
      case 'channels': return t('wallet_channels_title')
      case 'village': return t('wallet_village_title')
    }
  }

  // Soft socket tint per card, for the picker rows.
  const softFor = (id: KidsCardId): string => {
    switch (id) {
      case 'goals': return stickers.yellowSoft
      case 'health': return stickers.peachSoft
      case 'vaccines': return stickers.blueSoft
      case 'exams': return stickers.lilacSoft
      case 'diaper': return stickers.peachSoft
      case 'growth_leap': return stickers.greenSoft
      case 'reminders': return stickers.blueSoft
      case 'memories': return stickers.pinkSoft
      case 'ask_grandma': return stickers.lilacSoft
      case 'rewards': return stickers.yellowSoft
      case 'channels': return stickers.peachSoft
      case 'village': return stickers.greenSoft
    }
  }

  // Every card taps straight to a route / pop-up sheet — nothing expands inline.
  const onHeader = (id: KidsCardId) => {
    switch (id) {
      case 'goals': return onOpenGoals()
      case 'health': return onOpenHealth()
      case 'vaccines': return onOpenVaccines()
      case 'exams': return router.push('/exams?behavior=kids' as never)
      case 'diaper': return onOpenDiaper()
      case 'ask_grandma': return router.push('/grandma-talk' as never)
      case 'rewards': return router.push('/daily-rewards' as never)
      case 'growth_leap': return onOpenGrowthLeap()
      case 'reminders': return onOpenReminders()
      case 'memories': return setShowMemories(true)
      case 'channels': return router.push('/community?tab=channels' as never)
      case 'village': return router.push('/village' as never)
    }
  }

  const linkOnlyFor = (id: KidsCardId): boolean =>
    defaultCards.find((c) => c.id === id)?.linkOnly ?? true

  const pickerItems: WalletPickerItem[] = availableIds.map((id) => ({
    key: id,
    label: titleFor(id),
    icon: iconFor(id),
    soft: softFor(id),
  }))

  const editColor = diffuse ? dt.colors.ink3 : colors.textMuted

  return (
    <View>
      {/* Edit affordance — icon-only (no "EDIT" text), standardized with the
          summary card + cycle wallet edit controls. */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', marginBottom: 6 }}>
        <QuietPill
          leading={<SlidersHorizontal size={16} color={editColor} strokeWidth={2} />}
          onPress={() => setPickerOpen(true)}
          accessibilityLabel={t('kids_quickLogs_edit')}
        />
      </View>

      {displayedIds.map((id, i) => {
        const isLast = i === displayedIds.length - 1
        return (
          <WalletCard
            key={id}
            tone={toneFor(id)}
            icon={iconFor(id)}
            title={titleFor(id)}
            expanded={false}
            linkOnly={linkOnlyFor(id)}
            last={isLast}
            hideChevron
            onPressHeader={() => onHeader(id)}
          />
        )
      })}

      <WalletPicker
        visible={pickerOpen}
        onClose={() => setPickerOpen(false)}
        items={pickerItems}
        enabledKeys={displayedIds}
        onSave={setEnabled}
      />

      <MemoriesSheet behavior="kids" visible={showMemories} onClose={() => setShowMemories(false)} />
    </View>
  )
}
