/**
 * logStickers — maps log types across all 3 behaviors to playful sticker JSX.
 *
 * Used inside LogTile (Log Activity sheet) and ActivityPillCard to replace
 * lucide icons with brand stickers.
 *
 * Each sticker is wrapped in a uniform square box so shapes with different
 * natural densities (Moon crescent vs Cross) feel visually the same size.
 */

import { ReactNode } from 'react'
import { View } from 'react-native'
import { stickers as stickersLight, stickersDark } from '../../constants/theme'
import {
  Drop,
  Burst,
  Flower,
  Heart,
  CircleDashed,
  Moon,
  Leaf,
  Star,
  Cross,
  Squishy,
  Blob,
} from '../ui/Stickers'

/** Per-sticker visual scale — normalizes how "big" each shape looks in a uniform box. */
const SCALE = {
  drop: 0.9,      // tall teardrop — shrink slightly
  burst: 0.85,    // dense, reduce
  flower: 1.0,    // petals already reach the edge
  heart: 0.9,     // centered, trim a little
  moon: 1.0,      // crescent is narrow — render full
  leaf: 0.95,
  star: 0.95,
  cross: 0.8,     // cross has high visual weight — shrink
  circle: 0.95,
  squishy: 0.95,
  blob: 1.0,
}

function StickerBox({ size, children }: { size: number; children: ReactNode }) {
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      {children}
    </View>
  )
}

export function logSticker(type: string, size: number, isDark: boolean): ReactNode {
  const s = isDark ? stickersDark : stickersLight
  const sz = (factor: number) => Math.round(size * factor)

  switch (type) {
    // ─── cycle ────────────────────────────────────────────────────
    case 'basal_temp':     return <StickerBox size={size}><Drop size={sz(SCALE.drop)} fill={s.blue} /></StickerBox>
    case 'symptom':        return <StickerBox size={size}><Burst size={sz(SCALE.burst)} fill={s.peach} points={8} wobble={0.2} /></StickerBox>
    case 'mood':           return <StickerBox size={size}><Flower size={sz(SCALE.flower)} petal={s.pink} center={s.yellow} /></StickerBox>
    case 'intercourse':    return <StickerBox size={size}><Heart size={sz(SCALE.heart)} fill={s.pink} /></StickerBox>
    case 'period_start':   return <StickerBox size={size}><Drop size={sz(SCALE.drop)} fill={s.coral} /></StickerBox>
    case 'period_end':     return <StickerBox size={size}><CircleDashed size={sz(SCALE.circle)} stroke={s.coral} /></StickerBox>

    // ─── kids ─────────────────────────────────────────────────────
    case 'feeding':        return <StickerBox size={size}><Leaf size={sz(SCALE.leaf)} fill={s.green} /></StickerBox>
    case 'sleep':          return <StickerBox size={size}><Moon size={sz(SCALE.moon)} fill={s.lilac} /></StickerBox>
    case 'wake_up':        return <StickerBox size={size}><Burst size={sz(SCALE.burst)} fill={s.yellow} points={12} wobble={0.22} /></StickerBox>
    case 'diaper':         return <StickerBox size={size}><Drop size={sz(SCALE.drop)} fill={s.blue} /></StickerBox>
    case 'health':         return <StickerBox size={size}><Cross size={sz(SCALE.cross)} fill={s.coral} /></StickerBox>
    case 'activity':       return <StickerBox size={size}><Star size={sz(SCALE.star)} fill={s.green} /></StickerBox>
    case 'memory':         return <StickerBox size={size}><Heart size={sz(SCALE.heart)} fill={s.pink} /></StickerBox>

    // ─── pregnancy ────────────────────────────────────────────────
    case 'vitamins':       return <StickerBox size={size}><Leaf size={sz(SCALE.leaf)} fill={s.green} /></StickerBox>
    case 'water':          return <StickerBox size={size}><Drop size={sz(SCALE.drop)} fill={s.blue} /></StickerBox>
    case 'exercise':       return <StickerBox size={size}><Star size={sz(SCALE.star)} fill={s.green} /></StickerBox>
    case 'kick_count':     return <StickerBox size={size}><Heart size={sz(SCALE.heart)} fill={s.coral} /></StickerBox>
    case 'weight':         return <StickerBox size={size}><Squishy w={sz(SCALE.squishy) * 1.2} h={sz(SCALE.squishy) * 0.8} fill={s.peach} /></StickerBox>
    case 'appointment':    return <StickerBox size={size}><Cross size={sz(SCALE.cross)} fill={s.yellow} /></StickerBox>
    case 'exam_result':    return <StickerBox size={size}><Cross size={sz(SCALE.cross)} fill={s.lilac} /></StickerBox>
    case 'nutrition':      return <StickerBox size={size}><Leaf size={sz(SCALE.leaf)} fill={s.green} /></StickerBox>
    case 'kegel':          return <StickerBox size={size}><Burst size={sz(SCALE.burst)} fill={s.lilac} points={8} wobble={0.2} /></StickerBox>
    case 'nesting':        return <StickerBox size={size}><Blob size={sz(SCALE.blob)} fill={s.peach} variant={1} /></StickerBox>
    case 'birth_prep':     return <StickerBox size={size}><Star size={sz(SCALE.star)} fill={s.lilac} /></StickerBox>
    case 'contraction':    return <StickerBox size={size}><Burst size={sz(SCALE.burst)} fill={s.coral} points={10} wobble={0.25} /></StickerBox>

    // ─── fallback ─────────────────────────────────────────────────
    default:               return <StickerBox size={size}><Blob size={sz(SCALE.blob)} fill={s.yellowSoft} variant={0} /></StickerBox>
  }
}
