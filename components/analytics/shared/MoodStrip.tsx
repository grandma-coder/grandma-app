import React, { type JSX } from 'react'
import { View, Text } from 'react-native'
import { useTheme, useDiffuseTheme } from '../../../constants/theme'
import { useIsDiffuse } from '../../ui/diffuse/DiffuseKit'
import { Character } from '../../characters/Characters'
import { SiteSticker, type SiteStickerName } from '../../stickers/SiteSticker'
import { moodFaceVariant, moodExpression, moodBlobFill } from '../../../lib/moodFace'
import type { MoodStripDatum } from '../../../lib/moodTrend'
import { dateLoc } from '../../../lib/kpLocale'

// Site look: the four mood faces the log forms use (sad → grin).
function siteFace(mood: string | null | undefined): SiteStickerName {
  switch (moodFaceVariant(mood ?? undefined)) {
    case 'great': case 'happy': case 'energetic': return 'face4'
    case 'good': case 'calm': return 'face3'
    case 'low': case 'cranky': return 'face1'
    default: return 'face2'
  }
}

function shortDay(isoDate: string): string {
  try {
    const d = new Date(isoDate + 'T12:00:00')
    return d.toLocaleDateString(dateLoc(), { weekday: 'short' }).slice(0, 1)
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
          : { borderWidth: 0, padding: 0, paddingVertical: 6 },
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
              <SiteSticker name={siteFace(e.value)} size={26} />
            )}
            <Text
              style={diffuse
                ? { fontSize: 9, color: dt.colors.ink3, fontFamily: dt.font?.mono ?? 'monospace', letterSpacing: 0.4 }
                : { fontSize: 9, color: colors.textMuted, fontFamily: 'SpaceMono_400Regular', letterSpacing: 1 }}
            >
              {shortDay(e.date)}
            </Text>
          </View>
        ))}
      </View>
    </View>
  )
}
