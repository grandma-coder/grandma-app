/**
 * CycleWallet — the pre-pregnancy (cycle) home collapsible card stack.
 *
 * Mirrors the pregnancy Week Wallet model: each card taps straight to a pop-up
 * sheet / route — nothing expands inline. Default cards (Reminders · Pillars ·
 * Exams) come from lib/cycleWallet.buildCycleWalletCards; the common shortcuts
 * (Ask Grandma · Rewards · Channels · Village) can be added via the Edit picker
 * (useCycleWalletStore). Uncustomized (enabledKeys null) → builder order.
 */

import { useGrandmaChatEnabled, useDailyRewardsEnabled } from '../../../store/useFeatureFlags'
import React, { useEffect, useState } from 'react'
import { View } from 'react-native'
import { router } from 'expo-router'
import { useTheme, useDiffuseTheme } from '../../../constants/theme'
import { useIsDiffuse } from '../../ui/diffuse/DiffuseKit'
import { SlidersHorizontal } from 'lucide-react-native'
import { useTranslation } from '../../../lib/i18n'
import { supabase } from '../../../lib/supabase'
import { buildCycleWalletCards, type CycleWalletCardId } from '../../../lib/cycleWallet'
import { WALLET_SHORTCUTS } from '../../../lib/walletCatalog'
import { useCycleWalletStore } from '../../../store/useWalletStore'
import type { WalletTone } from '../../../lib/wallet'
import { openReminderCount } from '../../../lib/reminders'
import { useReminders } from '../../../store/useRemindersStore'
import { WalletCard } from '../WalletCard'
import { WalletPicker, type WalletPickerItem } from '../WalletPicker'
import { QuietPill } from '../../ui/QuietPill'
import { LogSheet } from '../../calendar/LogSheet'
import { UserReminders } from '../UserReminders'
import { CyclePillarsGrid } from './CyclePillarsGrid'
import { MemoriesSheet } from '../MemoriesSheet'
import { NotifyRoutine, LogOvulation, NotifyGoalAchieved } from '../../stickers/RewardStickers'
import { Character } from '../../characters/Characters'
import { SiteSticker, type SiteStickerName } from '../../stickers/SiteSticker'
import { StickerTileGrid } from '../../ui/StickerTileGrid'
import { Display } from '../../ui/Typography'
import { GrandmaLogo } from '../../ui/GrandmaLogo'

/**
 * Superset of card ids the cycle wallet can render (default + shortcuts).
 * `essentials` is intentionally excluded — it's pinned above the wallet by the
 * home (EssentialsWalletCard), never listed inside the stack.
 */
type CycleCardId = Exclude<CycleWalletCardId, 'essentials'> | 'ask_grandma' | 'rewards' | 'channels' | 'village'

const SHORTCUT_TONE: Record<string, WalletTone> = {
  ask_grandma: 'lilac', rewards: 'coral', channels: 'peach', village: 'green',
}

interface CycleWalletProps {
  /** Caregiver share allowlist (card ids). Null → owner: show every card. */
  visibleCardIds?: Set<string> | null
}

const FACTORY_ON: CycleCardId[] = ['reminders', 'pillars', 'exams']

export function CycleWallet({ visibleCardIds = null }: CycleWalletProps = {}) {
  const { colors, stickers } = useTheme()
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
  const { t } = useTranslation()
  const enabledKeys = useCycleWalletStore((s) => s.enabledKeys)
  const setEnabled = useCycleWalletStore((s) => s.setEnabled)
  const [pickerOpen, setPickerOpen] = useState(false)

  const [userId, setUserId] = useState<string | null>(null)
  useEffect(() => {
    void supabase.auth.getSession().then(({ data: { session } }) => setUserId(session?.user.id ?? null))
  }, [])

  const [remindersOpen, setRemindersOpen] = useState(false)
  const [pillarsOpen, setPillarsOpen] = useState(false)
  const [showMemories, setShowMemories] = useState(false)
  // `essentials` is pinned by the home above the wallet (EssentialsWalletCard),
  // so it never lives in the stack.
  const defaultCards = buildCycleWalletCards()
    .filter((c): c is typeof c & { id: CycleCardId } => c.id !== 'essentials')

  // Shared with the sheet (store) so the badge updates live; it counts every open reminder.
  const { reminders } = useReminders(userId ?? null, 'pre-pregnancy')
  const openReminders = openReminderCount(reminders)

  const shortcutOnlyIds: CycleCardId[] = WALLET_SHORTCUTS
    .map((s) => s.key)
    .filter((k) => !defaultCards.some((c) => c.id === k)) as CycleCardId[]
  // "Talk to Grandma" follows the remote grandma_chat flag (command center): off = not offered or shown.
  const chatOn = useGrandmaChatEnabled()
  const rewardsOn = useDailyRewardsEnabled()
  const availableIds: CycleCardId[] = [...defaultCards.map((c) => c.id), ...shortcutOnlyIds]
    .filter((id) => (id !== 'ask_grandma' || chatOn) && (id !== 'rewards' || rewardsOn))

  // For a caregiver, restrict to the shared allowlist (owner → null → no filter).
  const displayedIds: CycleCardId[] = (
    enabledKeys === null
      // Factory set: only the few that matter for this journey; the rest wait in the ⚙ picker.
      ? defaultCards.map((c) => c.id).filter((id) => (FACTORY_ON as string[]).includes(id))
      : enabledKeys.filter((k): k is CycleCardId => availableIds.includes(k as CycleCardId))
  ).filter((id) => visibleCardIds === null || visibleCardIds.has(id))

  const toneFor = (id: CycleCardId): WalletTone =>
    defaultCards.find((c) => c.id === id)?.tone ?? SHORTCUT_TONE[id] ?? 'surface'

  const linkOnlyFor = (id: CycleCardId): boolean =>
    defaultCards.find((c) => c.id === id)?.linkOnly ?? true

  const iconFor = (id: CycleCardId): React.ReactNode => {
    // Diffuse: Character blobs; legacy theme keeps the reward stickers.
    if (diffuse) {
      switch (id) {
        case 'reminders': return <Character name="bell" size={26} color={stickers.blue} />
        case 'pillars': return <Character name="sparkle" size={26} color={stickers.pink} />
        case 'memories': return <Character name="photo" size={26} color={stickers.pink} />
        case 'exams': return <Character name="exam" size={26} color={stickers.blue} />
        case 'ask_grandma': return <GrandmaLogo size={26} palette="rose" outline={colors.text} />
        case 'rewards': return <Character name="reward" size={26} color={stickers.yellow} />
        case 'channels': return <Character name="community" size={26} color={stickers.peach} />
        case 'village': return <Character name="community" size={26} color={stickers.green} />
      }
    }
    switch (id) {
      case 'reminders': return <SiteSticker name="bell" size={26} />
      case 'pillars': return <SiteSticker name="books" size={26} />
      case 'memories': return <SiteSticker name="camera" size={26} />
      case 'exams': return <SiteSticker name="doc" size={26} />
      case 'ask_grandma': return <GrandmaLogo size={26} palette="rose" outline={colors.text} />
      case 'rewards': return <SiteSticker name="star" size={26} />
      case 'channels': return <SiteSticker name="globe" size={26} />
      case 'village': return <SiteSticker name="house" size={26} />
    }
  }

  const titleFor = (id: CycleCardId): string => {
    switch (id) {
      case 'reminders': return t('wallet_reminders_title')
      case 'pillars': return t('cycle_wallet_pillars')
      case 'memories': return t('wallet_memories_title')
      case 'exams': return t('wallet_exams_title')
      case 'ask_grandma': return t('wallet_askGrandma_title')
      case 'rewards': return t('wallet_rewards_title')
      case 'channels': return t('wallet_channels_title')
      case 'village': return t('wallet_village_title')
    }
  }

  const softFor = (id: CycleCardId): string => {
    switch (id) {
      case 'reminders': return stickers.blueSoft
      case 'pillars': return stickers.pinkSoft
      case 'memories': return stickers.pinkSoft
      case 'exams': return stickers.blueSoft
      case 'ask_grandma': return stickers.lilacSoft
      case 'rewards': return stickers.peachSoft
      case 'channels': return stickers.peachSoft
      case 'village': return stickers.greenSoft
    }
  }

  // Every card taps straight to its pop-up sheet / route — nothing expands inline.
  const onHeader = (id: CycleCardId) => {
    if (id === 'reminders') return setRemindersOpen(true)
    if (id === 'pillars') return setPillarsOpen(true)
    if (id === 'memories') return setShowMemories(true)
    if (id === 'exams') return router.push('/exams?behavior=pre-pregnancy')
    if (id === 'ask_grandma') return router.push('/grandma-talk')
    if (id === 'rewards') return router.push('/daily-rewards')
    if (id === 'channels') return router.push('/community?tab=channels')
    if (id === 'village') return router.push('/village')
  }

  const pickerItems: WalletPickerItem[] = availableIds.map((id) => ({
    key: id,
    label: titleFor(id),
    icon: iconFor(id),
    soft: softFor(id),
  }))

  const editColor = diffuse ? dt.colors.ink3 : colors.textMuted

  const SITE_STICKER: Record<CycleCardId, SiteStickerName> = {
    reminders: 'bell', pillars: 'books', memories: 'camera', exams: 'doc',
    ask_grandma: 'bubble', rewards: 'star', channels: 'globe', village: 'house',
  }

  return (
    <View>
      {!diffuse ? (
        <>
          {/* Site look: heading + edit on one row, shortcuts as a sticker tile grid. */}
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
            <Display size={18} style={{ flex: 1 }}>{t('home_wallet_label')}</Display>
            <QuietPill
              leading={<SlidersHorizontal size={16} color={editColor} strokeWidth={2} />}
              onPress={() => setPickerOpen(true)}
              accessibilityLabel={t('kids_quickLogs_edit')}
            />
          </View>
          <StickerTileGrid
            tiles={displayedIds.map((id) => ({
              key: id,
              label: titleFor(id),
              sticker: SITE_STICKER[id],
              tone: softFor(id),
              onPress: () => onHeader(id),
            }))}
          />
        </>
      ) : (
        <>
      {/* Edit affordance — opens the wallet customization picker. */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', marginBottom: 8 }}>
        <QuietPill
          leading={<SlidersHorizontal size={16} color={editColor} strokeWidth={2} />}
          onPress={() => setPickerOpen(true)}
          accessibilityLabel={t('kids_quickLogs_edit')}
        />
      </View>

      {displayedIds.map((id, i) => {
        const isLast = i === displayedIds.length - 1
        const reminderBadge = id === 'reminders' ? openReminders : undefined
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
            onPressHeader={() => onHeader(id)}
          />
        )
      })}
        </>
      )}

      {/* Reminders — pop-up sheet (shared add + list, cycle-scoped) */}
      <LogSheet sticker="bell" visible={remindersOpen} title={t('pregnancy_reminders_title')} onClose={() => setRemindersOpen(false)}>
        <UserReminders userId={userId} context="pre-pregnancy" />
      </LogSheet>

      {/* Pillars — pop-up sheet with the pillar grid; each tile opens /pillar/[id]
          and closes the sheet on the way out. */}
      <LogSheet visible={pillarsOpen} title={t('cycle_wallet_pillars')} onClose={() => setPillarsOpen(false)}>
        <CyclePillarsGrid bare onNavigate={() => setPillarsOpen(false)} />
      </LogSheet>

      {/* Memories — pop-up sheet with cycle photo memories (grid + add) */}
      <MemoriesSheet behavior="cycle" visible={showMemories} onClose={() => setShowMemories(false)} />

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
