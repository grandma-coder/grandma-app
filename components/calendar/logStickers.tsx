/**
 * logStickers — maps log types across all 3 behaviors to playful sticker JSX.
 *
 * Used inside LogTile (Log Activity sheet) and ActivityPillCard to replace
 * lucide icons with brand stickers.
 */

import { ReactNode } from 'react'
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
  GrandmaEye,
} from '../ui/Stickers'

export function logSticker(type: string, size: number, isDark: boolean): ReactNode {
  const s = isDark ? stickersDark : stickersLight

  switch (type) {
    // ─── cycle ────────────────────────────────────────────────────
    case 'basal_temp':     return <Drop size={size} fill={s.blue} />
    case 'symptom':        return <Burst size={size} fill={s.peach} points={8} wobble={0.2} />
    case 'mood':           return <Flower size={size} petal={s.pink} center={s.yellow} />
    case 'intercourse':    return <Heart size={size} fill={s.pink} />
    case 'period_start':   return <Drop size={size} fill={s.coral} />
    case 'period_end':     return <CircleDashed size={size} stroke={s.coral} />

    // ─── kids ─────────────────────────────────────────────────────
    case 'feeding':        return <Leaf size={size} fill={s.green} />
    case 'sleep':          return <Moon size={size} fill={s.lilac} />
    case 'wake_up':        return <Burst size={size} fill={s.yellow} points={12} wobble={0.22} />
    case 'diaper':         return <Drop size={size} fill={s.blue} />
    case 'health':         return <Cross size={size} fill={s.coral} />
    case 'activity':       return <Star size={size} fill={s.green} />
    case 'memory':         return <Heart size={size} fill={s.pink} />

    // ─── pregnancy ────────────────────────────────────────────────
    case 'vitamins':       return <Leaf size={size} fill={s.green} />
    case 'water':          return <Drop size={size} fill={s.blue} />
    case 'exercise':       return <Star size={size} fill={s.green} />
    case 'kick_count':     return <Heart size={size} fill={s.coral} />
    case 'weight':         return <Squishy w={size * 1.3} h={size} fill={s.peach} />
    case 'appointment':    return <Cross size={size} fill={s.yellow} />
    case 'exam_result':    return <Cross size={size} fill={s.lilac} />
    case 'nutrition':      return <Leaf size={size} fill={s.green} />
    case 'kegel':          return <Burst size={size} fill={s.lilac} points={8} wobble={0.2} />
    case 'nesting':        return <Blob size={size} fill={s.peach} variant={1} />
    case 'birth_prep':     return <Star size={size} fill={s.lilac} />
    case 'contraction':    return <Burst size={size} fill={s.coral} points={10} wobble={0.25} />

    // ─── fallback ─────────────────────────────────────────────────
    default:               return <Blob size={size} fill={s.yellowSoft} variant={0} />
  }
}
