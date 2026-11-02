/**
 * MenopauseWallet — the "Quick access" card stack on the Menopause home,
 * mirroring CycleWallet / KidsWallet / WeekWallet. Editable: the user picks which
 * shortcut cards show + their order via the Edit affordance (useMenopauseWalletStore).
 * `enabledKeys: null` = not customized yet → the full default order. The shared
 * WalletCard primitive owns the dual-variant (cream / Diffuse) chrome; this file
 * supplies tone + icon + title + tap target per card.
 */
import { useGrandmaChatEnabled, useDailyRewardsEnabled } from '../../store/useFeatureFlags'
import type { ReactNode } from 'react'
import { useState } from 'react'
import { View } from 'react-native'
import { router } from 'expo-router'
import { SlidersHorizontal } from 'lucide-react-native'
import { useTheme, useDiffuseTheme } from '../../constants/theme'
import { useIsDiffuse } from '../ui/diffuse/DiffuseKit'
import { useTranslation } from '../../lib/i18n'
import { useMenopauseWalletStore } from '../../store/useWalletStore'
import type { WalletTone } from '../../lib/wallet'
import { WalletCard } from './WalletCard'
import { WalletPicker, type WalletPickerItem } from './WalletPicker'
import { QuietPill } from '../ui/QuietPill'
import { Character } from '../characters/Characters'
import { SiteSticker } from '../stickers/SiteSticker'
import { GrandmaLogo } from '../ui/GrandmaLogo'
import { StickerTileGrid } from '../ui/StickerTileGrid'
import { Display } from '../ui/Typography'
import type { SiteStickerName } from '../stickers/SiteSticker'

type MenoWalletId = 'ask_grandma' | 'reminders' | 'rewards' | 'community'

// The available shortcut superset + its default order. All shared with the other
// behavior wallets (same titles/routes), so the Menopause wallet reads the same.
const AVAILABLE: MenoWalletId[] = ['ask_grandma', 'reminders', 'rewards', 'community']

export function MenopauseWallet() {
  const { colors, stickers } = useTheme()
  const dt = useDiffuseTheme()
  const diffuse = useIsDiffuse()
  const { t } = useTranslation()
  const enabledKeys = useMenopauseWalletStore((s) => s.enabledKeys)
  const setEnabled = useMenopauseWalletStore((s) => s.setEnabled)
  const [pickerOpen, setPickerOpen] = useState(false)

  const toneFor = (id: MenoWalletId): WalletTone =>
    ({ ask_grandma: 'peach', reminders: 'lilac', rewards: 'yellow', community: 'green' } as const)[id]

  const iconFor = (id: MenoWalletId): ReactNode => {
    switch (id) {
      case 'ask_grandma': return <GrandmaLogo size={26} palette="sky" outline={colors.text} />
      case 'reminders': return diffuse ? <Character name="clock" size={26} color={stickers.blue} /> : <SiteSticker name="bell" size={26} />
      case 'rewards': return diffuse ? <Character name="crown" size={26} color={stickers.yellow} /> : <SiteSticker name="star" size={26} />
      case 'community': return diffuse ? <Character name="community" size={26} color={stickers.green} /> : <SiteSticker name="us" size={26} />
    }
  }

  const titleFor = (id: MenoWalletId): string =>
    ({
      ask_grandma: t('wallet_askGrandma_title'),
      reminders: t('wallet_reminders_title'),
      rewards: t('wallet_rewards_title'),
      community: t('wallet_channels_title'),
    } as const)[id]

  const softFor = (id: MenoWalletId): string =>
    ({
      ask_grandma: stickers.peachSoft,
      reminders: stickers.lilacSoft,
      rewards: stickers.yellowSoft,
      community: stickers.greenSoft,
    } as const)[id]

  const onHeader = (id: MenoWalletId) => {
    switch (id) {
      case 'ask_grandma': return router.push('/grandma-talk' as never)
      case 'reminders': return router.push('/notifications' as never)
      case 'rewards': return router.push('/daily-rewards' as never)
      case 'community': return router.push('/community' as never)
    }
  }

  // Displayed cards: default order when uncustomized; else the user's enabled
  // keys (in their order), dropping any id no longer available.
  // "Talk to Grandma" follows the remote grandma_chat flag (command center): off = not offered or shown.
  const chatOn = useGrandmaChatEnabled()
  const rewardsOn = useDailyRewardsEnabled()
  const available = AVAILABLE.filter((id) => (id !== 'ask_grandma' || chatOn) && (id !== 'rewards' || rewardsOn))
  const displayedIds: MenoWalletId[] =
    enabledKeys === null
      ? available
      : enabledKeys.filter((k): k is MenoWalletId => available.includes(k as MenoWalletId))

  const editColor = diffuse ? dt.colors.ink3 : colors.textMuted
  const pickerItems: WalletPickerItem[] = available.map((id) => ({
    key: id,
    label: titleFor(id),
    icon: iconFor(id),
    soft: softFor(id),
  }))

  const SITE_STICKER: Record<MenoWalletId, SiteStickerName> = {
    ask_grandma: 'bubble', reminders: 'bell', rewards: 'star', community: 'house',
  }

  // Site look: heading + edit on one row, shortcuts as a sticker tile grid.
  if (!diffuse) {
    return (
      <View>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 16, marginBottom: 12 }}>
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

  return (
    <View>
      {/* Edit affordance — icon-only, standardized with the cycle/kids wallets. */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', marginBottom: 6 }}>
        <QuietPill
          leading={<SlidersHorizontal size={16} color={editColor} strokeWidth={2} />}
          onPress={() => setPickerOpen(true)}
          accessibilityLabel={t('kids_quickLogs_edit')}
        />
      </View>

      {displayedIds.map((id, i) => (
        <WalletCard
          key={id}
          tone={toneFor(id)}
          icon={iconFor(id)}
          title={titleFor(id)}
          expanded={false}
          linkOnly
          last={i === displayedIds.length - 1}
          hideChevron
          onPressHeader={() => onHeader(id)}
        />
      ))}

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
