// components/ui/diffuse/pickers/AvatarBloomGrid.tsx
//
// AvatarBloomGrid — the 4-column soft-bloom avatar picker from the Diffuse KIDS
// onboarding flow ("KIDS 05 · pick a look"). Each option is a circular tile with
// a feathered SoftBloom (option.color) behind a thin caller-supplied Lucide-style
// glyph. Selecting a tile brightens its bloom and draws an inset ink ring. An
// optional leading "camera" tile (transparent, no bloom) lets the user choose a
// photo instead — it taps through to `onPickPhoto` and is never part of the
// selected set.
//
// Presentational only — no data/store logic. RN equivalent of the HTML
// `.avgrid` / `.av` markup in docs/design/Onboarding.html.

import { ReactNode } from 'react'
import { View, Pressable, StyleSheet } from 'react-native'
import { useDiffuseTheme } from '../../../../constants/theme'
import { SoftBloom } from '../DiffuseKit'

export interface AvatarOption {
  key: string
  /** Bloom color, caller-supplied — passed straight through to SoftBloom. */
  color: string
  /** A thin Lucide-style glyph (already colored/stroked by the caller). */
  icon: ReactNode
}

interface AvatarBloomGridProps {
  options: AvatarOption[]
  value: string | null
  onChange: (key: string) => void
  /**
   * When provided, a leading transparent "camera" tile is rendered as the first
   * cell. Tapping it fires this instead of onChange (choose a photo flow).
   */
  onPickPhoto?: () => void
  /** The camera-tile glyph (a thin Lucide Camera). Only used when onPickPhoto is set. */
  cameraIcon?: ReactNode
}

// 4 per row; each tile is a fixed circle so blooms stay round regardless of
// container width (the reference uses aspect-ratio:1 in a repeat(4,1fr) grid).
const TILE_SIZE = 66

export function AvatarBloomGrid({
  options,
  value,
  onChange,
  onPickPhoto,
  cameraIcon,
}: AvatarBloomGridProps) {
  const { colors } = useDiffuseTheme()

  return (
    <View style={styles.grid}>
      {onPickPhoto ? (
        <Pressable
          onPress={onPickPhoto}
          accessibilityRole="button"
          accessibilityLabel="Choose a photo"
          style={[styles.tile, styles.tileCam, { borderColor: colors.hairline }]}
        >
          <View style={styles.cameraGlyph}>{cameraIcon}</View>
        </Pressable>
      ) : null}

      {options.map((opt) => {
        const selected = opt.key === value
        return (
          <Pressable
            key={opt.key}
            onPress={() => onChange(opt.key)}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            style={[
              styles.tile,
              selected && { borderWidth: 2, borderColor: colors.hairline },
            ]}
          >
            <SoftBloom
              color={opt.color}
              opacity={selected ? 0.9 : 0.72}
              spread={selected ? 0.55 : 0.6}
              radius="55%"
            />
            <View style={styles.glyph}>{opt.icon}</View>
          </Pressable>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 13,
  },
  tile: {
    width: TILE_SIZE,
    height: TILE_SIZE,
    borderRadius: TILE_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    // hairline default frame keeps the disc read even before selection; the
    // inset ink ring on select is applied via the selected borderWidth override.
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'transparent',
  },
  tileCam: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
  },
  glyph: {
    zIndex: 1,
    opacity: 0.82,
  },
  cameraGlyph: {
    opacity: 0.55,
  },
})
