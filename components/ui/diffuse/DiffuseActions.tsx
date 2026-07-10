/**
 * DiffuseActions — containerless action components for the v3 "Diffuse"
 * variant: primary CTA, OAuth row, and a muted text link. No fills, no
 * pills — just mono type + hairlines, matching `.solid` / `.pillbtn.oauth` /
 * `.txtlink` in docs/design/Onboarding.html.
 *
 * Token-driven via useDiffuseTheme() / diffuseFont. Used across the
 * Diffuse auth + onboarding screens.
 */

import { Pressable, Text, View, StyleSheet } from 'react-native'
import type { ReactNode } from 'react'
import { ArrowRight, Check } from 'lucide-react-native'
import { useDiffuseTheme, diffuseFont } from '../../../constants/theme'

export function DiffuseSolidCTA({ label, onPress, disabled, icon = 'arrow' }: {
  label: string; onPress: () => void; disabled?: boolean; icon?: 'arrow' | 'check'
}) {
  const { colors } = useDiffuseTheme()
  const Icon = icon === 'check' ? Check : ArrowRight
  return (
    <Pressable onPress={onPress} disabled={disabled}
      style={({ pressed }) => [s.solid, { borderTopColor: colors.line2, opacity: disabled ? 0.4 : pressed ? 0.6 : 1 }]}>
      <Text style={[s.solidLabel, { color: colors.ink, fontFamily: diffuseFont.monoBold }]}>{label}</Text>
      <Icon size={18} color={colors.ink} strokeWidth={1.8} />
    </Pressable>
  )
}

export function DiffuseOAuthRow({ label, icon, onPress }: { label: string; icon: ReactNode; onPress: () => void }) {
  const { colors } = useDiffuseTheme()
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [s.oauth, { borderBottomColor: colors.line2, opacity: pressed ? 0.55 : 1 }]}>
      {icon}
      <Text style={[s.oauthLabel, { color: colors.ink, fontFamily: diffuseFont.monoBold }]}>{label}</Text>
    </Pressable>
  )
}

export function DiffuseTextLink({ label, onPress }: { label: string; onPress: () => void }) {
  const { colors } = useDiffuseTheme()
  return (
    <Pressable onPress={onPress} hitSlop={8} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}>
      <Text style={[s.txtlink, { color: colors.ink3, fontFamily: diffuseFont.monoBold }]}>{label}</Text>
    </Pressable>
  )
}

const s = StyleSheet.create({
  solid: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 18, paddingHorizontal: 2 },
  solidLabel: { fontSize: 13, letterSpacing: 2, textTransform: 'uppercase' },
  oauth: { flexDirection: 'row', alignItems: 'center', gap: 12, borderBottomWidth: StyleSheet.hairlineWidth, paddingVertical: 16, paddingHorizontal: 2 },
  oauthLabel: { fontSize: 12.5, letterSpacing: 1.4, textTransform: 'uppercase' },
  txtlink: { fontSize: 12, letterSpacing: 2, textTransform: 'uppercase', textAlign: 'center', paddingVertical: 15 },
})
