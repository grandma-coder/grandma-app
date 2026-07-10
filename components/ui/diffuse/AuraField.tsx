// components/ui/diffuse/AuraField.tsx
import { View, StyleSheet, type StyleProp, type ViewStyle } from 'react-native'
import type { ReactNode } from 'react'
import { SoftBloom, DiffuseGrain } from './DiffuseKit'

export interface AuraBloom { color: string; cx: string; cy: string; opacity?: number; spread?: number }

interface AuraFieldProps {
  blooms: AuraBloom[]
  grain?: boolean
  radius?: number
  style?: StyleProp<ViewStyle>
  children?: ReactNode
}

/** The signature Diffuse background: several soft corner blooms + grain.
 *  RN equivalent of the HTML `.aura` multi-radial-gradient field. */
export function AuraField({ blooms, grain = true, radius = 0, style, children }: AuraFieldProps) {
  return (
    <View style={[styles.root, style]}>
      <View pointerEvents="none" style={StyleSheet.absoluteFillObject}>
        {blooms.map((b, i) => (
          <SoftBloom key={i} color={b.color} cx={b.cx} cy={b.cy} opacity={b.opacity ?? 0.4} spread={b.spread ?? 0.55} radius="70%" />
        ))}
        {grain ? <DiffuseGrain opacity={0.05} radius={radius} /> : null}
      </View>
      {children}
    </View>
  )
}

const styles = StyleSheet.create({ root: { flex: 1, overflow: 'hidden' } })

// Recipes transcribed from docs/design/Onboarding.html `.aura` values.
export const AURA: Record<string, AuraBloom[]> = {
  // Auth · Welcome: peach 18/16, rose 88/24, lilac 50/108
  welcome: [
    { color: '#F4C9A0', cx: '18%', cy: '16%', opacity: 0.5 },
    { color: '#ED88A6', cx: '88%', cy: '24%', opacity: 0.5 },
    { color: '#A98BDD', cx: '50%', cy: '100%', opacity: 0.45 },
  ],
  // Auth · Sign in: yellow 84/12, rose 14/30, lilac 70/104
  signin: [
    { color: '#F5D652', cx: '84%', cy: '12%', opacity: 0.5 },
    { color: '#ED88A6', cx: '14%', cy: '30%', opacity: 0.5 },
    { color: '#A98BDD', cx: '70%', cy: '100%', opacity: 0.45 },
  ],
  // Auth · Sign up: peach 86/14, lilac 12/22, rose 64/106 (cy clamped to 100)
  signup: [
    { color: '#F4C9A0', cx: '86%', cy: '14%', opacity: 0.5 },
    { color: '#A98BDD', cx: '12%', cy: '22%', opacity: 0.5 },
    { color: '#ED88A6', cx: '64%', cy: '100%', opacity: 0.45 },
  ],
  // (transcribe the remaining frames as their screens are built — see each screen task)
}
