import { useState } from 'react'
import { View, Text, Pressable, StyleSheet, ScrollView, Animated } from 'react-native'
import { useEffect, useRef } from 'react'
import Svg, { Path } from 'react-native-svg'
import * as Haptics from 'expo-haptics'
import { SiteChoice } from '../ui/SiteChoice'
import { HandDrawnPill } from '../ui/HandDrawn'
import { SiteSticker, type SiteStickerName } from '../stickers/SiteSticker'
import { CHILD_COLORS } from '../ui/ChildPills'
import { useTheme, useDiffuseTheme, diffuseFont, radius, getModeColorSoft } from '../../constants/theme'
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
                ...(!diffuse && on ? { transform: [{ rotate: '-1.5deg' }, { scale: 1.04 }] } : null),
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
export function MoreSection({ children, label = 'More', testID }: MoreSectionProps) {
  const { colors, font } = useTheme()
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
  const ink3 = diffuse ? dt.colors.ink3 : colors.textMuted
  const [open, setOpen] = useState(false)
  return (
    <View testID={testID}>
      <Pressable onPress={() => setOpen((o) => !o)} style={kitStyles.moreRow} accessibilityRole="button">
        <Text style={[kitStyles.moreLabel, diffuse
          ? { color: ink3, fontFamily: diffuseFont.mono }
          : { color: colors.text, fontFamily: font.display, fontSize: 16, letterSpacing: 0.3 }]}>{label}</Text>
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
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 2 }}>
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
  choiceRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center' },
  choice: { minWidth: 96, flexGrow: 1, alignItems: 'center', gap: 8, paddingVertical: 18, paddingHorizontal: 12, borderWidth: 1.5 },
  choiceLabel: { fontSize: 14, textAlign: 'center' },
  tileCell: { minWidth: 96, flexGrow: 1, flexBasis: '28%' },
  tileInner: { alignItems: 'center', gap: 8, paddingVertical: 16, paddingHorizontal: 10 },
  tileTick: { position: 'absolute', top: 8, right: 8, width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  moreRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12 },
  moreLabel: { fontSize: 12, letterSpacing: 1, textTransform: 'uppercase' },
  moreBody: { gap: 12, paddingBottom: 4 },
  childChip: { alignSelf: 'flex-start', borderWidth: 1, borderRadius: radius.full, paddingHorizontal: 14, paddingVertical: 7 },
  childChipText: { fontSize: 13, letterSpacing: 0.3 },
})

// Site look: Character concept → site sticker (falls back to the Character blob).
const SITE_FOR_BLOB: Partial<Record<CharacterName, SiteStickerName>> = {
  sleep: 'moon', night: 'moon', nutrition: 'avocado', calories: 'avocado', water: 'drop', temperature: 'thermo',
  feeding: 'bottle', milk: 'bottle', diaper: 'diaper', potty: 'diaper', bath: 'drop', baby: 'baby',
  medicine: 'syringe', vaccine: 'syringe', heartbeat: 'heart', checkup: 'doc', exam: 'doc',
  period: 'drop', ovulation: 'egg', kick: 'shoe', ultrasound: 'camera', growth: 'ruler', activity: 'shoe',
  star: 'star', sparkle: 'star', sun: 'flower', heart: 'heart', health: 'heart',
}
// Option ids that deserve their own sticker (so a list of one concept doesn't repeat one icon).
const ID_STICKER: Record<string, SiteStickerName> = {
  class: 'brain', school: 'backpack', study: 'pencil', reading: 'books', sport: 'shoe', swim: 'drop',
  dance: 'star', music: 'bell', art: 'flower', playground: 'stroller', walk: 'leaf', therapy: 'heart', playdate: 'us',
  pee: 'drop', poop: 'pumpkin', mixed: 'diaper',
}
const FACE_STICKER: Record<string, SiteStickerName> = {
  happy: 'face4', calm: 'face3', content: 'face3', energetic: 'star', fussy: 'face2', sad: 'face1', cranky: 'face1', tired: 'zz',
}

function SiteChoiceTile({ option, on, onPress, tone }: { option: ChoiceOption; on: boolean; onPress: () => void; tone: string }) {
  const { colors, font } = useTheme()
  const ink = colors.text
  const [size, setSize] = useState({ w: 0, h: 0 })
  const sel = useRef(new Animated.Value(on ? 1 : 0)).current
  const press = useRef(new Animated.Value(0)).current
  useEffect(() => {
    Animated.spring(sel, { toValue: on ? 1 : 0, friction: 6, tension: 160, useNativeDriver: true }).start()
  }, [on, sel])
  const sticker: SiteStickerName | undefined =
    option.blob === 'mood' ? FACE_STICKER[option.face ?? option.id] ?? 'face3' : ID_STICKER[option.id] ?? SITE_FOR_BLOB[option.blob]
  return (
    <Pressable
      onPress={() => { Haptics.selectionAsync().catch(() => {}); onPress() }}
      onPressIn={() => Animated.spring(press, { toValue: 1, friction: 6, tension: 300, useNativeDriver: true }).start()}
      onPressOut={() => Animated.spring(press, { toValue: 0, friction: 4, tension: 200, useNativeDriver: true }).start()}
      accessibilityRole="button"
      accessibilityState={{ selected: on }}
      accessibilityLabel={option.label}
      style={kitStyles.tileCell}
    >
      <Animated.View
        onLayout={(e) => setSize({ w: Math.round(e.nativeEvent.layout.width), h: Math.round(e.nativeEvent.layout.height) })}
        style={{ transform: [
          { rotate: sel.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '-2deg'] }) },
          { scale: Animated.multiply(sel.interpolate({ inputRange: [0, 1], outputRange: [1, 1.04] }), press.interpolate({ inputRange: [0, 1], outputRange: [1, 0.94] })) },
        ] }}
      >
        <HandDrawnPill width={size.w} height={size.h} fill={colors.surface} stroke={ink} strokeWidth={2} radius={20} seed={option.id} />
        <Animated.View style={[StyleSheet.absoluteFill, { opacity: sel }]}>
          <HandDrawnPill width={size.w} height={size.h} fill={tone} stroke={ink} strokeWidth={2.6} radius={20} seed={option.id} />
        </Animated.View>
        <View style={kitStyles.tileInner}>
          {sticker ? <SiteSticker name={sticker} size={40} cut /> : <Character name={option.blob} size={40} color={option.color} face={option.face} />}
          <Text style={[kitStyles.choiceLabel, { color: ink, fontFamily: font.bodyBold }]} numberOfLines={2}>{option.label}</Text>
        </View>
        <Animated.View style={[kitStyles.tileTick, { backgroundColor: ink, opacity: sel, transform: [{ scale: sel }] }]}>
          <Svg width={11} height={11} viewBox="0 0 18 18">
            <Path d="M3.5 9.5 L7.5 13 L14.5 4.5" stroke={colors.surface} strokeWidth={3.4} fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
        </Animated.View>
      </Animated.View>
    </Pressable>
  )
}
