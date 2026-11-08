import { useState } from 'react'
import { View, Text, Pressable, StyleSheet, ScrollView, Animated } from 'react-native'
import { useEffect, useRef } from 'react'
import Svg, { Path } from 'react-native-svg'
import * as Haptics from 'expo-haptics'
import { SiteChoice } from '../ui/SiteChoice'
import { SiteSticker, type SiteStickerName } from '../stickers/SiteSticker'
import { CHILD_COLORS } from '../ui/ChildPills'
import { useTheme, useDiffuseTheme, diffuseFont, radius, getModeColorSoft } from '../../constants/theme'
import { useTranslation } from '../../lib/i18n'
import { useIsDiffuse } from '../ui/diffuse/DiffuseKit'
import { Character, type CharacterName, type MoodExpression } from '../characters/Characters'
import { useChildStore } from '../../store/useChildStore'
import { useModeStore } from '../../store/useModeStore'
import { ChevronDown } from 'lucide-react-native'

export interface ChoiceOption {
  id: string
  label: string
  blob: CharacterName
  color: string
  /** Optional expression for the `mood` blob (happy/fussy/…), so an expressive
   *  choice log renders a distinct face per option instead of one default face. */
  face?: MoodExpression
}
export interface ChoiceStepProps {
  options: ChoiceOption[]
  value: string[]
  onChange: (ids: string[]) => void
  multi?: boolean
  testID?: string
}

export function ChoiceStep({ options, value, onChange, multi = false, testID }: ChoiceStepProps) {
  const { colors, font } = useTheme()
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
  const mode = useModeStore((s) => s.mode)
  const ink = diffuse ? dt.colors.ink : colors.text
  const line = diffuse ? dt.colors.line : colors.border

  const press = (id: string) => {
    if (multi) {
      onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id])
    } else {
      onChange([id])
    }
  }

  if (!diffuse) {
    return (
      <View style={kitStyles.choiceRow} testID={testID}>
        {options.map((o) => (
          <SiteChoiceTile key={o.id} option={o} on={value.includes(o.id)} onPress={() => press(o.id)} tone={getModeColorSoft(mode)} />
        ))}
      </View>
    )
  }

  return (
    <View style={kitStyles.choiceRow} testID={testID}>
      {options.map((o) => {
        const on = value.includes(o.id)
        return (
          <Pressable
            key={o.id}
            onPress={() => press(o.id)}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
            style={({ pressed }) => [
              kitStyles.choice,
              {
                borderColor: diffuse ? (on ? ink : line) : colors.text,
                backgroundColor: on ? (diffuse ? dt.colors.surface : getModeColorSoft(mode)) : (diffuse ? 'transparent' : colors.surface),
                borderRadius: radius.lg,
                opacity: pressed ? 0.7 : 1,
                ...(!diffuse && on ? { transform: [{ scale: 1.03 }] } : null),
              },
            ]}
          >
            <Character name={o.blob} size={40} color={o.color} face={o.face} />
            <Text style={[kitStyles.choiceLabel, { color: ink, fontFamily: diffuse ? diffuseFont.body : font.bodyBold }]}>
              {o.label}
            </Text>
          </Pressable>
        )
      })}
    </View>
  )
}

export interface MoreSectionProps { children: React.ReactNode; label?: string; testID?: string }
export function MoreSection({ children, label, testID }: MoreSectionProps) {
  const { colors, font } = useTheme()
  const { t } = useTranslation()
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
  const ink3 = diffuse ? dt.colors.ink3 : colors.textMuted
  const [open, setOpen] = useState(false)
  return (
    <View testID={testID}>
      <Pressable onPress={() => setOpen((o) => !o)} style={kitStyles.moreRow} accessibilityRole="button">
        <Text style={[kitStyles.moreLabel, diffuse
          ? { color: ink3, fontFamily: diffuseFont.mono }
          : { color: colors.text, fontFamily: font.display, fontSize: 16, letterSpacing: 0.3 }]}>{label ?? t('sw4_more')}</Text>
        <ChevronDown size={16} color={ink3} strokeWidth={1.8} style={{ transform: [{ rotate: open ? '180deg' : '0deg' }] }} />
      </Pressable>
      {open ? <View style={kitStyles.moreBody}>{children}</View> : null}
    </View>
  )
}

export interface ActiveChildChipProps { childId: string; onChange: (id: string) => void }
export function ActiveChildChip({ childId, onChange }: ActiveChildChipProps) {
  const { colors, font } = useTheme()
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
  const children = useChildStore((s) => s.children)
  if (children.length < 2) return null
  const ink = diffuse ? dt.colors.ink : colors.text
  const line = diffuse ? dt.colors.line : colors.border
  const cur = children.findIndex((c) => c.id === childId)
  const next = () => onChange(children[(cur + 1) % children.length].id)
  const name = children[cur]?.name ?? children[0]?.name ?? ''
  if (!diffuse) {
    // Site look: every child visible as a pill — no hidden tap-to-cycle.
    return (
      <ScrollView horizontal style={{ flexGrow: 0 }} showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 2, alignItems: 'center' }}>
        {children.map((c, i) => (
          <SiteChoice key={c.id} compact wobble tick={false} label={c.name} selected={c.id === (childId || children[0]?.id)}
            tone={CHILD_COLORS[i % CHILD_COLORS.length]} onPress={() => onChange(c.id)} />
        ))}
      </ScrollView>
    )
  }
  return (
    <Pressable onPress={next} style={({ pressed }) => [kitStyles.childChip, { borderColor: line, opacity: pressed ? 0.7 : 1 }]} accessibilityRole="button" accessibilityLabel={`Child: ${name}. Tap to switch.`}>
      <Text style={[kitStyles.childChipText, { color: ink, fontFamily: diffuse ? diffuseFont.mono : font.bodySemiBold }]}>{name}</Text>
    </Pressable>
  )
}

const kitStyles = StyleSheet.create({
  choiceRow: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 2, justifyContent: 'center' },
  choice: { minWidth: 96, flexGrow: 1, alignItems: 'center', gap: 8, paddingVertical: 18, paddingHorizontal: 12, borderWidth: 1.5 },
  choiceLabel: { fontSize: 14, textAlign: 'center' },
  tileCell: { width: '25%', alignItems: 'center', paddingTop: 2 },
  tileDiscWrap: { width: 58, height: 58, alignItems: 'center', justifyContent: 'center' },
  tileDisc: { position: 'absolute', width: 56, height: 56, borderRadius: 28, borderWidth: 1.5 },
  tileLabel: { fontSize: 13, marginTop: 1, textAlign: 'center', paddingHorizontal: 2 },
  moreRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12 },
  moreLabel: { fontSize: 12, letterSpacing: 1, textTransform: 'uppercase' },
  moreBody: { gap: 12, paddingBottom: 4 },
  childChip: { alignSelf: 'flex-start', borderWidth: 1, borderRadius: radius.full, paddingHorizontal: 14, paddingVertical: 7 },
  childChipText: { fontSize: 13, letterSpacing: 0.3 },
})

// Site look: Character concept → site sticker (falls back to the Character blob).
const SITE_FOR_BLOB: Partial<Record<CharacterName, SiteStickerName>> = {
  sleep: 'moon', night: 'moon', nutrition: 'avocado', calories: 'avocado', water: 'glass', temperature: 'thermo',
  feeding: 'bottle', milk: 'bottle', diaper: 'diaper', potty: 'diaper', bath: 'cloud', baby: 'baby',
  medicine: 'syringe', vaccine: 'syringe', heartbeat: 'heart', checkup: 'doc', exam: 'doc',
  period: 'drop', ovulation: 'egg', kick: 'shoe', ultrasound: 'camera', growth: 'ruler', activity: 'shoe',
  star: 'star', sparkle: 'star', sun: 'flower', heart: 'heart', health: 'heart',
}
// Option ids that deserve their own sticker (so a list of one concept doesn't repeat one icon).
const ID_STICKER: Record<string, SiteStickerName> = {
  // Kids activities — never reuse a sticker that means something else in the app (the red drop is
  // a period, the leaf the end of a period, the brain the pillars).
  class: 'owl', school: 'backpack', study: 'pencil', reading: 'books', sport: 'shoe', swim: 'sun',
  dance: 'star', music: 'bell', art: 'flower', playground: 'stroller', walk: 'foot', therapy: 'heart', playdate: 'baby2',
  pee: 'pee', poop: 'poop', mixed: 'diaper',
}
const FACE_STICKER: Record<string, SiteStickerName> = {
  happy: 'face4', calm: 'face3', content: 'face3', energetic: 'star', fussy: 'face2', sad: 'face1', cranky: 'face1', tired: 'zz',
}

function SiteChoiceTile({ option, on, onPress, tone }: { option: ChoiceOption; on: boolean; onPress: () => void; tone: string }) {
  const sticker: SiteStickerName | undefined =
    option.blob === 'mood' ? FACE_STICKER[option.face ?? option.id] ?? 'face3' : ID_STICKER[option.id] ?? SITE_FOR_BLOB[option.blob]
  return (
    <StickerChoice label={option.label} sticker={sticker} on={on} onPress={onPress} tone={tone}
      fallback={<Character name={option.blob} size={36} color={option.color} face={option.face} />} />
  )
}

/** Card-less sticker option: the sticker is the button; selected = tone disc + pop + bold label + wavy underline. */
export function StickerChoice({ label, sticker, on, onPress, tone, width = '25%', fallback }: {
  label: string; sticker?: SiteStickerName; on: boolean; onPress: () => void; tone: string
  width?: `${number}%`; fallback?: React.ReactNode
}) {
  // No card: the sticker IS the button (like the home log dock). Selected = tone disc
  // behind the sticker, a little pop, bold label + wavy underline.
  const { colors, font } = useTheme()
  const ink = colors.text
  const sel = useRef(new Animated.Value(on ? 1 : 0)).current
  const press = useRef(new Animated.Value(0)).current
  useEffect(() => {
    Animated.spring(sel, { toValue: on ? 1 : 0, friction: 5, tension: 180, useNativeDriver: true }).start()
  }, [on, sel])
  return (
    <Pressable
      onPress={() => { Haptics.selectionAsync().catch(() => {}); onPress() }}
      onPressIn={() => Animated.spring(press, { toValue: 1, friction: 6, tension: 300, useNativeDriver: true }).start()}
      onPressOut={() => Animated.spring(press, { toValue: 0, friction: 4, tension: 200, useNativeDriver: true }).start()}
      accessibilityRole="button"
      accessibilityState={{ selected: on }}
      accessibilityLabel={label}
      style={[kitStyles.tileCell, { width }]}
    >
      <Animated.View style={[kitStyles.tileDiscWrap, { transform: [{ scale: press.interpolate({ inputRange: [0, 1], outputRange: [1, 0.88] }) }] }]}>
        <Animated.View style={[kitStyles.tileDisc, { backgroundColor: tone, borderColor: ink, opacity: sel, transform: [{ scale: sel }] }]} />
        <Animated.View style={{ transform: [
          { scale: sel.interpolate({ inputRange: [0, 1], outputRange: [1, 1.12] }) },
          { rotate: sel.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '-8deg'] }) },
        ] }}>
          {sticker ? <SiteSticker name={sticker} size={36} /> : fallback}
        </Animated.View>
      </Animated.View>
      <Text style={[kitStyles.tileLabel, { color: ink, fontFamily: on ? font.bodyBold : font.bodyMedium }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
        {label}
      </Text>
      <Animated.View style={{ opacity: sel, height: 6 }}>
        <Svg width={36} height={6} viewBox="0 0 60 8">
          <Path d="M2 5 C12 2 20 7 30 4 S48 2 58 5" stroke={ink} strokeWidth={3} fill="none" strokeLinecap="round" />
        </Svg>
      </Animated.View>
    </Pressable>
  )
}
