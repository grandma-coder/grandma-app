/**
 * Notifications Settings (Apr 2026 redesign)
 *
 * Cream canvas, paper card list, big Fraunces title with italic coral subtitle,
 * sticker-icon rows.
 */

import { useState, useEffect } from 'react'
import { View, ScrollView, Switch, StyleSheet } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import AsyncStorage from '@react-native-async-storage/async-storage'
import {
  Sun as SunLine,
  Sparkles as SparklesLine,
  Star as StarLine,
  Moon as MoonLine,
  Heart as HeartLine,
  Flower as FlowerLine,
  Leaf as LeafLine,
} from 'lucide-react-native'
import { useTheme, getModeColor, useDiffuseTheme, getDiffuseAccent, diffuseFont } from '../../constants/theme'
import { useModeStore } from '../../store/useModeStore'
import { ScreenHeader } from '../../components/ui/ScreenHeader'
import { Display, DisplayItalic, Body, MonoCaps } from '../../components/ui/Typography'
import { Sun, Sparkle, Star, Moon, Heart, Flower, Leaf } from '../../components/ui/Stickers'
import { useIsDiffuse } from '../../components/ui/diffuse/DiffuseKit'
import { DiffuseBloomIcon } from '../../components/ui/diffuse/DiffusePrimitives'
import { useTranslation } from '../../lib/i18n'

const STORAGE_KEY = 'grandma:notification_prefs:v1'

type StickerName = 'sun' | 'sparkle' | 'star' | 'moon' | 'heart' | 'flower' | 'leaf'

interface NotifToggle {
  id: string
  label: string
  description: string
  default: boolean
  group: 'daily' | 'health' | 'community'
  sticker: StickerName
}

const NOTIFICATION_SETTINGS: NotifToggle[] = [
  { id: 'daily_reminder', label: 'Daily Log Reminder', description: 'Remind me to log each day', default: true, group: 'daily', sticker: 'sun' },
  { id: 'insights', label: 'New Insights', description: 'When Grandma generates new insights', default: true, group: 'daily', sticker: 'sparkle' },
  { id: 'weekly_summary', label: 'Weekly Summary', description: 'Weekly digest of activity and insights', default: false, group: 'daily', sticker: 'leaf' },
  { id: 'appointments', label: 'Appointment Reminders', description: 'Before scheduled appointments', default: true, group: 'health', sticker: 'star' },
  { id: 'cycle_predictions', label: 'Cycle Predictions', description: 'Period and fertile window alerts', default: true, group: 'health', sticker: 'moon' },
  { id: 'milestones', label: 'Milestone Alerts', description: 'Upcoming developmental milestones', default: false, group: 'health', sticker: 'flower' },
  { id: 'care_circle', label: 'Care Circle Updates', description: 'When caregivers log activities', default: true, group: 'community', sticker: 'heart' },
]

const GROUPS: { id: NotifToggle['group']; label: string }[] = [
  { id: 'daily', label: 'Daily' },
  { id: 'health', label: 'Health' },
  { id: 'community', label: 'Community' },
]

// Lucide line-icon + bloom hue per sticker, for the Diffuse branch. The glyph
// reads quiet (ink3); the bloom carries the sticker's semantic hue.
const DIFFUSE_ICON: Record<StickerName, React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>> = {
  sun: SunLine,
  sparkle: SparklesLine,
  star: StarLine,
  moon: MoonLine,
  heart: HeartLine,
  flower: FlowerLine,
  leaf: LeafLine,
}

function StickerFor({ name, size = 34 }: { name: StickerName; size?: number }) {
  const { stickers } = useTheme()
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()

  if (diffuse) {
    const Glyph = DIFFUSE_ICON[name]
    const bloom: Record<StickerName, string> = {
      sun: dt.stickers.yellow,
      sparkle: dt.stickers.yellow,
      star: dt.stickers.blue,
      moon: dt.stickers.lilac,
      heart: dt.stickers.pink,
      flower: dt.stickers.pink,
      leaf: dt.stickers.green,
    }
    return (
      <DiffuseBloomIcon color={bloom[name]} size={size} intensity={0.5}>
        <Glyph size={Math.round(size * 0.56)} color={dt.colors.ink3} strokeWidth={1.6} />
      </DiffuseBloomIcon>
    )
  }

  switch (name) {
    case 'sun': return <Sun size={size} fill={stickers.yellow} />
    case 'sparkle': return <Sparkle size={size} fill={stickers.yellow} />
    case 'star': return <Star size={size} fill={stickers.blue} />
    case 'moon': return <Moon size={size} fill={stickers.lilac} />
    case 'heart': return <Heart size={size} fill={stickers.pink} />
    case 'flower': return <Flower size={size} petal={stickers.pink} center={stickers.yellow} />
    case 'leaf': return <Leaf size={size} fill={stickers.green} />
  }
}

export default function NotificationsScreen() {
  const { colors, font, stickers, radius, spacing, isDark } = useTheme()
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
  const { t } = useTranslation()
  const insets = useSafeAreaInsets()
  const mode = useModeStore((s) => s.mode)
  const accent = diffuse ? getDiffuseAccent(mode, dt.isDark) : getModeColor(mode, isDark)

  const [toggles, setToggles] = useState<Record<string, boolean>>(
    Object.fromEntries(NOTIFICATION_SETTINGS.map((n) => [n.id, n.default]))
  )
  const [hydrated, setHydrated] = useState(false)

  // Load persisted toggles on mount.
  useEffect(() => {
    let alive = true
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (!alive) return
        if (raw) {
          try {
            const stored = JSON.parse(raw) as Record<string, boolean>
            setToggles((prev) => ({ ...prev, ...stored }))
          } catch {
            // ignore parse errors — fall back to defaults
          }
        }
        setHydrated(true)
      })
      .catch(() => setHydrated(true))
    return () => {
      alive = false
    }
  }, [])

  // Persist whenever toggles change (only after first hydration so we don't
  // overwrite stored prefs with defaults on mount).
  useEffect(() => {
    if (!hydrated) return
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(toggles)).catch(() => {})
  }, [toggles, hydrated])

  function handleToggle(id: string) {
    setToggles((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  return (
    <View style={[styles.root, { backgroundColor: diffuse ? dt.colors.bg : colors.bg }]}>
      <View style={[styles.headerWrap, { paddingTop: insets.top + 8 }]}>
        <ScreenHeader title="" />
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Big serif title */}
        <View style={styles.titleBlock}>
          <Display size={34} color={diffuse ? dt.colors.ink : colors.text}>{t('notifications_title')}</Display>
          <DisplayItalic size={18} color={diffuse ? accent : stickers.coral} style={{ marginTop: 6 }}>
            {t('notificationsSettings_subtitle')}
          </DisplayItalic>
        </View>

        {GROUPS.map((group) => {
          const items = NOTIFICATION_SETTINGS.filter((n) => n.group === group.id)
          return (
            <View key={group.id} style={{ marginBottom: spacing.lg }}>
              <View style={{ marginTop: spacing.sm, marginBottom: spacing.sm }}>
                <MonoCaps color={diffuse ? dt.colors.ink3 : colors.textMuted} style={{ letterSpacing: 1.5 }}>
                  {group.label}
                </MonoCaps>
              </View>
              <View style={[
                styles.card,
                diffuse
                  ? { backgroundColor: dt.colors.surface, borderColor: dt.colors.line, borderRadius: radius.lg }
                  : { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg },
              ]}>
                {items.map((notif, i) => (
                  <View key={notif.id}>
                    <View style={styles.row}>
                      <View style={styles.stickerWrap}>
                        <StickerFor name={notif.sticker} size={34} />
                      </View>
                      <View style={styles.rowText}>
                        <Body
                          size={16}
                          color={diffuse ? dt.colors.ink : colors.text}
                          style={{ fontFamily: diffuse ? diffuseFont.bodySemiBold : font.bodySemiBold, marginBottom: 2 }}
                        >
                          {notif.label}
                        </Body>
                        <Body
                          size={13}
                          color={diffuse ? dt.colors.ink3 : colors.textMuted}
                          style={{ fontFamily: diffuse ? diffuseFont.body : font.body }}
                        >
                          {notif.description}
                        </Body>
                      </View>
                      <Switch
                        value={toggles[notif.id]}
                        onValueChange={() => handleToggle(notif.id)}
                        trackColor={{ false: diffuse ? dt.colors.line2 : colors.borderStrong, true: accent }}
                        thumbColor={diffuse ? dt.colors.surface : colors.surface}
                        ios_backgroundColor={diffuse ? dt.colors.line2 : colors.borderStrong}
                        accessibilityLabel={notif.label}
                      />
                    </View>
                    {i < items.length - 1 && (
                      <View style={[styles.divider, { backgroundColor: diffuse ? dt.colors.line : colors.borderLight }]} />
                    )}
                  </View>
                ))}
              </View>
            </View>
          )
        })}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  headerWrap: { paddingHorizontal: 16 },
  scroll: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  titleBlock: {
    marginTop: 4,
    marginBottom: 18,
    paddingHorizontal: 4,
  },
  card: {
    borderWidth: 1,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 18,
    gap: 12,
  },
  stickerWrap: {
    width: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: { flex: 1, gap: 2 },
  divider: { height: 1, marginHorizontal: 20 },
})
