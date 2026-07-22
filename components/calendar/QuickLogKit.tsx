import { View, Text, Pressable, StyleSheet } from 'react-native'
import { useTheme, useDiffuseTheme, diffuseFont, radius } from '../../constants/theme'
import { useIsDiffuse } from '../ui/diffuse/DiffuseKit'
import { Character, type CharacterName } from '../characters/Characters'

export interface ChoiceOption { id: string; label: string; blob: CharacterName; color: string }
export interface ChoiceStepProps {
  options: ChoiceOption[]
  value: string[]
  onChange: (ids: string[]) => void
  multi?: boolean
  testID?: string
}

export function ChoiceStep({ options, value, onChange, multi = false, testID }: ChoiceStepProps) {
  const { colors, font, stickers } = useTheme()
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

const kitStyles = StyleSheet.create({
  choiceRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center' },
  choice: { minWidth: 96, flexGrow: 1, alignItems: 'center', gap: 8, paddingVertical: 18, paddingHorizontal: 12, borderWidth: 1.5 },
  choiceLabel: { fontSize: 14 },
})
