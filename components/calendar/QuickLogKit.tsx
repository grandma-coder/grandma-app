import { useState } from 'react'
import { View, Text, Pressable, StyleSheet } from 'react-native'
import { useTheme, useDiffuseTheme, diffuseFont, radius } from '../../constants/theme'
import { useIsDiffuse } from '../ui/diffuse/DiffuseKit'
import { Character, type CharacterName } from '../characters/Characters'
import { useChildStore } from '../../store/useChildStore'
import { ChevronDown } from 'lucide-react-native'

export interface ChoiceOption { id: string; label: string; blob: CharacterName; color: string }
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
  const ink = diffuse ? dt.colors.ink : colors.text
  const line = diffuse ? dt.colors.line : colors.border

  const press = (id: string) => {
    if (multi) {
      onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id])
    } else {
      onChange([id])
    }
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
                borderColor: on ? ink : line,
                backgroundColor: on ? (diffuse ? dt.colors.surface : colors.surfaceRaised) : 'transparent',
                borderRadius: radius.lg,
                opacity: pressed ? 0.7 : 1,
              },
            ]}
          >
            <Character name={o.blob} size={40} color={o.color} />
            <Text style={[kitStyles.choiceLabel, { color: ink, fontFamily: diffuse ? diffuseFont.body : font.bodySemiBold }]}>
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
        <Text style={[kitStyles.moreLabel, { color: ink3, fontFamily: diffuse ? diffuseFont.mono : font.bodyMedium }]}>{label}</Text>
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
  return (
    <Pressable onPress={next} style={({ pressed }) => [kitStyles.childChip, { borderColor: line, opacity: pressed ? 0.7 : 1 }]} accessibilityRole="button" accessibilityLabel={`Child: ${name}. Tap to switch.`}>
      <Text style={[kitStyles.childChipText, { color: ink, fontFamily: diffuse ? diffuseFont.mono : font.bodySemiBold }]}>{name}</Text>
    </Pressable>
  )
}

const kitStyles = StyleSheet.create({
  choiceRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center' },
  choice: { minWidth: 96, flexGrow: 1, alignItems: 'center', gap: 8, paddingVertical: 18, paddingHorizontal: 12, borderWidth: 1.5 },
  choiceLabel: { fontSize: 14 },
  moreRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12 },
  moreLabel: { fontSize: 12, letterSpacing: 1, textTransform: 'uppercase' },
  moreBody: { gap: 12, paddingBottom: 4 },
  childChip: { alignSelf: 'flex-start', borderWidth: 1, borderRadius: radius.full, paddingHorizontal: 14, paddingVertical: 7 },
  childChipText: { fontSize: 13, letterSpacing: 0.3 },
})
