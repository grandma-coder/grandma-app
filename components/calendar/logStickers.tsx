/**
 * logStickers — maps a log type (any of the 3 behaviors) to its icon.
 *
 * Used inside LogTile (the "Log something" sheet), ActivityPillCard, exam cards,
 * meal form, and the calendar timeline rows.
 *
 * As of the blob migration this renders the SHARED Character concept-blob
 * (DIFFUSE_LOG_CHARACTER / diffuseLogHue) — the SAME icon system the Diffuse
 * variant uses — so both variants read identically and no two concepts collide
 * on a generic star/leaf shape. The map lives in DiffuseLogTimeline (the single
 * source of truth); add new log types there, not here.
 */

import { ReactNode } from 'react'
import { View } from 'react-native'
import { Character } from '../characters/Characters'
import { DIFFUSE_LOG_CHARACTER, diffuseLogHue } from './DiffuseLogTimeline'

export function logSticker(type: string, size: number, _isDark: boolean): ReactNode {
  const name = DIFFUSE_LOG_CHARACTER[type] ?? 'note'
  const color = diffuseLogHue(type)
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Character name={name} size={size} color={color} />
    </View>
  )
}
