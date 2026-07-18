import React, { type JSX } from 'react'
import { View, Text } from 'react-native'
import { useTheme, useDiffuseTheme } from '../../../constants/theme'
import { useIsDiffuse } from '../../ui/diffuse/DiffuseKit'
import { Character } from '../../characters/Characters'
import { MoodFace } from '../../stickers/RewardStickers'
import { moodFaceVariant, moodFaceFill, moodExpression, moodBlobFill } from '../../../lib/moodFace'
import type { MoodStripDatum } from '../../../lib/moodTrend'

function shortDay(isoDate: string): string {
  try {
    const d = new Date(isoDate + 'T12:00:00')
    return d.toLocaleDateString('en-US', { weekday: 'short' }).slice(0, 1)
  } catch {
    return ''
  }
}

export function MoodStrip({ data }: { data: MoodStripDatum[] }): JSX.Element {
  const { colors, font } = useTheme()
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
  const entries = data.slice(-12)

  return (
    <View
      style={[
        {
          borderWidth: 1,
          borderRadius: 22,
          padding: 14,
        },
        diffuse
          ? { backgroundColor: dt.colors.surface, borderColor: dt.colors.line }
          : { backgroundColor: colors.surface, borderColor: 'rgba(20,19,19,0.10)' },
      ]}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center' }}>
        {entries.map((e, i) => (
          <View key={i} style={{ alignItems: 'center', gap: 4 }}>
            {diffuse ? (
              <Character
                name="mood"
                size={28}
                face={moodExpression(e.value ?? undefined)}
                color={moodBlobFill(e.value ?? undefined)}
              />
            ) : (
              <MoodFace
                size={28}
                variant={moodFaceVariant(e.value ?? undefined)}
                fill={moodFaceFill(e.value ?? undefined)}
              />
            )}
            <Text
              style={diffuse
                ? { fontSize: 9, color: dt.colors.ink3, fontFamily: dt.font?.mono ?? 'monospace', letterSpacing: 0.4 }
                : { fontSize: 9, color: colors.textMuted, fontFamily: font.bodyMedium }}
            >
              {shortDay(e.date)}
            </Text>
          </View>
        ))}
      </View>
    </View>
  )
}
