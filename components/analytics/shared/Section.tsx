import React from 'react'
import { View, Text, Pressable } from 'react-native'
import { ChevronRight } from 'lucide-react-native'
import { useTheme, diffuseFont, useDiffuseTheme } from '../../../constants/theme'
import { useIsDiffuse } from '../../ui/diffuse/DiffuseKit'

export function Section({
  title, subtitle, onPress, children,
}: {
  title: string
  subtitle?: string
  onPress?: () => void
  children: React.ReactNode
}) {
  const { colors, font } = useTheme()
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
  return (
    <View style={{ paddingHorizontal: 20, marginTop: 24 }}>
      <Pressable
        onPress={onPress}
        disabled={!onPress}
        style={({ pressed }) => [{ opacity: pressed && onPress ? 0.7 : 1 }]}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 20, color: diffuse ? dt.colors.ink : colors.text, fontFamily: diffuse ? diffuseFont.display : font.display, letterSpacing: diffuse ? -0.3 : 0.2, ...(diffuse ? null : { textTransform: 'uppercase' as const }) }}>
              {title}
            </Text>
            {subtitle ? (
              <Text style={diffuse
                ? { fontSize: 10, color: dt.colors.ink3, fontFamily: diffuseFont.mono, marginTop: 4, letterSpacing: 1, textTransform: 'uppercase' }
                : { fontSize: 10, color: colors.textMuted, fontFamily: 'SpaceMono_400Regular', marginTop: 3, letterSpacing: 1.4, textTransform: 'uppercase' }}>
                {subtitle}
              </Text>
            ) : null}
          </View>
          {onPress ? <ChevronRight size={16} color={diffuse ? dt.colors.ink3 : colors.textMuted} strokeWidth={diffuse ? 1.6 : 2} /> : null}
        </View>
      </Pressable>
      {children}
    </View>
  )
}
