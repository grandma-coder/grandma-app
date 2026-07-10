// components/ui/diffuse/DiffuseField.tsx
import { View, Text, TextInput, StyleSheet, type KeyboardTypeOptions } from 'react-native'
import { useDiffuseTheme, diffuseFont } from '../../../constants/theme'

export function DiffuseFieldLabel({ children }: { children: string }) {
  const { colors } = useDiffuseTheme()
  return <Text style={[s.lab, { color: colors.ink3, fontFamily: diffuseFont.mono }]}>{children}</Text>
}

export function DiffuseField(props: {
  value: string; onChangeText: (t: string) => void; placeholder?: string
  secureTextEntry?: boolean; keyboardType?: KeyboardTypeOptions; autoCapitalize?: 'none' | 'words' | 'sentences'
}) {
  const { colors } = useDiffuseTheme()
  return (
    <TextInput
      value={props.value} onChangeText={props.onChangeText} placeholder={props.placeholder}
      placeholderTextColor={colors.ink4} secureTextEntry={props.secureTextEntry}
      keyboardType={props.keyboardType} autoCapitalize={props.autoCapitalize}
      style={[s.field, { color: colors.ink, borderBottomColor: colors.line2, fontFamily: diffuseFont.body }]}
    />
  )
}

export function DiffuseDivider({ label }: { label: string }) {
  const { colors } = useDiffuseTheme()
  return (
    <View style={s.divRow}>
      <View style={[s.divLine, { backgroundColor: colors.line2 }]} />
      <Text style={[s.divLab, { color: colors.ink3, fontFamily: diffuseFont.mono }]}>{label}</Text>
      <View style={[s.divLine, { backgroundColor: colors.line2 }]} />
    </View>
  )
}

const s = StyleSheet.create({
  lab: { fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 4 },
  field: { borderBottomWidth: 1.5, paddingVertical: 12, fontSize: 17 },
  divRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginVertical: 22 },
  divLine: { flex: 1, height: 1 },
  divLab: { fontSize: 10, letterSpacing: 1.6, textTransform: 'uppercase' },
})
