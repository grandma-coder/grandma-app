/**
 * Affirmation share templates — one coherent family in the site look.
 *
 * Each template renders at 1080×1350 (4:5) and is exported via react-native-view-shot.
 * Every card is the same composition: one soft ground from the sticker palette,
 * a hand-drawn sticker, the phrase set by FitText (one face per line, auto-sized
 * so it never clips in German, Turkish, CJK, Hindi or Arabic) and a small
 * grandma.app mark. Only the ground, ink and sticker change between cards — no
 * split backgrounds, no mixed fonts, no forced lowercase.
 *
 * Text-only mode drops the ground, sticker and mark and paints just the phrase
 * (a different light tone per card) for transparent-PNG story overlays.
 */

import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { font } from '../../../constants/theme'
import { SiteSticker, type SiteStickerName } from '../../stickers/SiteSticker'
import { FitText } from './FitText'

export const CANVAS_W = 1080
export const CANVAS_H = 1350

export type AffirmationMode = 'prePreg' | 'pregnancy'

export interface TemplateProps {
  phrase: string
  /** When true, the template hides its background and renders only typography. */
  textOnly?: boolean
}

export interface TemplateMeta {
  id: string
  name: string
  mode: AffirmationMode
  /** For text-only export: which color the phrase is painted. */
  textOnlyColor?: string
  Component: React.FC<TemplateProps>
}

// ─── layout (canvas units) ─────────────────────────────────────────────────

const SIDE = 120                       // left/right margin for the phrase
const TEXT_W = CANVAS_W - SIDE * 2     // 840
const STICKER = 168
const TOP = 120                        // sticker top
const TEXT_TOP = TOP + STICKER + 70    // phrase box top
const TEXT_BOTTOM = 170                // room for the mark
const TEXT_H = CANVAS_H - TEXT_TOP - TEXT_BOTTOM
// Text-only: no sticker / mark, so the phrase gets the whole card.
const TO_TOP = 150
const TO_H = CANVAS_H - TO_TOP * 2

interface Look {
  id: string
  name: string
  ground: string
  ink: string
  mark: string
  sticker: SiteStickerName
  textOnlyColor: string
}

// Grounds + inks come from the app's sticker palette (constants/theme
// stickersLight — soft wash + matching dark ink). Static on purpose: an exported
// image must look the same in light and dark app themes.
const LOOKS: Look[] = [
  { id: 'paper',  name: 'Paper',  ground: '#FBF6EA', ink: '#161513', mark: 'rgba(22,21,19,0.45)',   sticker: 'star',   textOnlyColor: '#FFFFFF' },
  { id: 'butter', name: 'Butter', ground: '#FFF1B8', ink: '#5E4709', mark: 'rgba(94,71,9,0.5)',     sticker: 'sun',    textOnlyColor: '#F9C846' },
  { id: 'blush',  name: 'Blush',  ground: '#F9CFE0', ink: '#7A2F49', mark: 'rgba(122,47,73,0.5)',   sticker: 'flower', textOnlyColor: '#F4A6C9' },
  { id: 'lilac',  name: 'Lilac',  ground: '#DCCFF9', ink: '#3A2A6E', mark: 'rgba(58,42,110,0.5)',   sticker: 'moon',   textOnlyColor: '#C8B6F5' },
  { id: 'sage',   name: 'Sage',   ground: '#D7F0DD', ink: '#2F4712', mark: 'rgba(47,71,18,0.5)',    sticker: 'leaf',   textOnlyColor: '#9ED8B0' },
  { id: 'night',  name: 'Night',  ground: '#161513', ink: '#FBF6EA', mark: 'rgba(251,246,234,0.5)', sticker: 'cloud',  textOnlyColor: '#FBF6EA' },
]

function makeTemplate(look: Look): React.FC<TemplateProps> {
  const T: React.FC<TemplateProps> = ({ phrase, textOnly }) => (
    <View style={s.canvas}>
      {textOnly ? (
        <View style={[s.box, { top: TO_TOP, height: TO_H }]}>
          <FitText text={phrase} width={TEXT_W} height={TO_H} maxSize={120} minSize={34} color={look.textOnlyColor} />
        </View>
      ) : (
        <>
          <View style={[StyleSheet.absoluteFill, { backgroundColor: look.ground }]} />
          <View style={s.stickerRow}>
            <SiteSticker name={look.sticker} size={STICKER} cut />
          </View>
          <View style={[s.box, { top: TEXT_TOP, height: TEXT_H }]}>
            <FitText text={phrase} width={TEXT_W} height={TEXT_H} maxSize={104} minSize={30} color={look.ink} />
          </View>
          <Text style={[s.mark, { color: look.mark }]}>grandma.app</Text>
        </>
      )}
    </View>
  )
  T.displayName = `AffirmationTemplate_${look.id}`
  return T
}

// ─── REGISTRY ──────────────────────────────────────────────────────────────

const CURATED: Omit<TemplateMeta, 'mode'>[] = LOOKS.map((l) => ({
  id: l.id,
  name: l.name,
  textOnlyColor: l.textOnlyColor,
  Component: makeTemplate(l),
}))

// The same set serves both modes.
export const allAffirmationTemplates: TemplateMeta[] = [
  ...CURATED.map((t) => ({ ...t, mode: 'prePreg' as const })),
  ...CURATED.map((t) => ({ ...t, mode: 'pregnancy' as const })),
]

// Backwards-compat alias — the modal filters by mode.
export const affirmationTemplates = allAffirmationTemplates

export function templatesForMode(mode: AffirmationMode): TemplateMeta[] {
  return CURATED.map((t) => ({ ...t, mode }))
}

// ─── STYLES ────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  canvas: {
    width: CANVAS_W,
    height: CANVAS_H,
    position: 'relative',
    overflow: 'hidden',
  },
  stickerRow: {
    position: 'absolute',
    top: TOP,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  box: {
    position: 'absolute',
    left: SIDE,
    width: TEXT_W,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mark: {
    position: 'absolute',
    bottom: 70,
    left: 0,
    right: 0,
    textAlign: 'center',
    fontFamily: font.bodySemiBold,
    fontSize: 30,
    letterSpacing: 2,
  },
})
