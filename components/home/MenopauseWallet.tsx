/**
 * MenopauseWallet — the "Quick access" card stack on the Menopause home,
 * mirroring CycleWallet / KidsWallet / WeekWallet so every behavior home carries
 * the same wallet section. Static shortcut set for E1 (no per-user customization
 * store/picker yet — the sibling wallets' Edit affordance is deferred). The
 * shared WalletCard primitive owns the dual-variant (cream / Diffuse) chrome, so
 * this file just supplies tone + icon + title + tap target per row.
 */
import type { ReactNode } from 'react'
import { View } from 'react-native'
import { router } from 'expo-router'
import { useTheme } from '../../constants/theme'
import { useTranslation } from '../../lib/i18n'
import type { WalletTone } from '../../lib/wallet'
import { WalletCard } from './WalletCard'
import { Character } from '../characters/Characters'
import { GrandmaLogo } from '../ui/GrandmaLogo'

type MenoWalletId = 'ask_grandma' | 'reminders' | 'rewards'

export function MenopauseWallet() {
  const { colors, stickers } = useTheme()
  const { t } = useTranslation()

  const tiles: { id: MenoWalletId; tone: WalletTone; title: string; icon: ReactNode; onPress: () => void }[] = [
    {
      id: 'ask_grandma',
      tone: 'peach',
      title: t('wallet_askGrandma_title'),
      icon: <GrandmaLogo size={26} palette="sky" outline={colors.text} />,
      onPress: () => router.push('/grandma-talk' as never),
    },
    {
      id: 'reminders',
      tone: 'lilac',
      title: t('wallet_reminders_title'),
      icon: <Character name="clock" size={26} color={stickers.blue} />,
      onPress: () => router.push('/notifications' as never),
    },
    {
      id: 'rewards',
      tone: 'yellow',
      title: t('wallet_rewards_title'),
      icon: <Character name="crown" size={26} color={stickers.yellow} />,
      onPress: () => router.push('/daily-rewards' as never),
    },
  ]

  return (
    <View>
      {tiles.map((tile, i) => (
        <WalletCard
          key={tile.id}
          tone={tile.tone}
          icon={tile.icon}
          title={tile.title}
          expanded={false}
          linkOnly
          last={i === tiles.length - 1}
          hideChevron
          onPressHeader={tile.onPress}
        />
      ))}
    </View>
  )
}
