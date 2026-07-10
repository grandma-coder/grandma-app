/**
 * Affirmation share templates — curated, typography-led set.
 *
 * Each template renders at 1080×1350 (4:5) and is exported via react-native-view-shot.
 * Text-only mode strips the background, keeping only the phrase — for
 * transparent-PNG sharing (Instagram overlays, etc).
 *
 * Design intent: clean and aesthetic. The phrase IS the design — set in our
 * editorial serif / italic on a quiet ground. No bursts, stars, diamonds, or
 * flower stickers. The same six templates serve every mode.
 */

import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { font } from '../../../constants/theme'
import Svg, { Rect } from 'react-native-svg'

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
  /** For text-only export: which color the phrase should be painted. */
  textOnlyColor?: string
  Component: React.FC<TemplateProps>
}

// ─── helpers ───────────────────────────────────────────────────────────────

const WM = 'grandma.app'
const Watermark: React.FC<{ color?: string; hidden?: boolean }> = ({ color = 'rgba(20,19,19,0.32)', hidden }) => {
  if (hidden) return null
  return <Text style={[s.watermark, { color }]}>{WM}</Text>
}

// ─── templates ──────────────────────────────────────────────────────────────

// 01 · Cream Editorial — Fraunces serif, centered, bare cream ground.
const TCream: React.FC<TemplateProps> = ({ phrase, textOnly }) => (
  <View style={s.canvas}>
    {!textOnly && <View style={[s.bgFill, { backgroundColor: '#F3ECD9' }]} />}
    <View style={[s.fg, s.fgCenter]}>
      <Text style={[s.serif, { color: textOnly ? '#FFFFFF' : '#141313' }]}>
        {phrase}
      </Text>
    </View>
    <Watermark hidden={textOnly} />
  </View>
)

// 02 · Soft Italic — Instrument Serif italic, lowercase, warm coral on paper.
const TItalic: React.FC<TemplateProps> = ({ phrase, textOnly }) => (
  <View style={s.canvas}>
    {!textOnly && <View style={[s.bgFill, { backgroundColor: '#FFFEF8' }]} />}
    <View style={[s.fg, s.fgCenter]}>
      <Text style={[s.italic, { color: textOnly ? '#FFFFFF' : '#D4796B' }]}>
        {phrase.toLowerCase()}
      </Text>
    </View>
    <Watermark hidden={textOnly} color="rgba(212,121,107,0.45)" />
  </View>
)

// 03 · Midnight — Instrument italic, cream text on deep ink. Quiet and poetic.
const TMidnight: React.FC<TemplateProps> = ({ phrase, textOnly }) => (
  <View style={s.canvas}>
    {!textOnly && <View style={[s.bgFill, { backgroundColor: '#1A1622' }]} />}
    <View style={[s.fg, s.fgCenter]}>
      <Text style={[s.italic, { color: '#FFFEF8' }]}>
        {phrase.toLowerCase()}
      </Text>
    </View>
    <Watermark hidden={textOnly} color="rgba(255,254,248,0.4)" />
  </View>
)

// 04 · Lilac Soft — Instrument italic, lowercase, on pastel lilac.
const TLilac: React.FC<TemplateProps> = ({ phrase, textOnly }) => (
  <View style={s.canvas}>
    {!textOnly && <View style={[s.bgFill, { backgroundColor: '#E3D8F2' }]} />}
    <View style={[s.fg, s.fgCenter]}>
      <Text style={[s.italic, { color: textOnly ? '#FFFFFF' : '#3F2D63' }]}>
        {phrase.toLowerCase()}
      </Text>
    </View>
    <Watermark hidden={textOnly} color="rgba(63,45,99,0.4)" />
  </View>
)

// 05 · Sage — Fraunces serif, lowercase, sage green ground.
const TSage: React.FC<TemplateProps> = ({ phrase, textOnly }) => (
  <View style={s.canvas}>
    {!textOnly && <View style={[s.bgFill, { backgroundColor: '#C2D1A8' }]} />}
    <View style={[s.fg, s.fgCenter]}>
      <Text style={[s.serif, { color: textOnly ? '#FFFFFF' : '#2C3A1E', letterSpacing: -1 }]}>
        {phrase.toLowerCase()}
      </Text>
    </View>
    <Watermark hidden={textOnly} color="rgba(44,58,30,0.4)" />
  </View>
)

// 06 · Magazine Split — half cream / half lavender, Fraunces left-aligned editorial.
const TMagazine: React.FC<TemplateProps> = ({ phrase, textOnly }) => (
  <View style={s.canvas}>
    {!textOnly && (
      <Svg width={CANVAS_W} height={CANVAS_H} style={StyleSheet.absoluteFill}>
        <Rect x={0} y={0} width={CANVAS_W} height={CANVAS_H * 0.42} fill="#F3ECD9" />
        <Rect x={0} y={CANVAS_H * 0.42} width={CANVAS_W} height={CANVAS_H * 0.58} fill="#C8BBEA" />
      </Svg>
    )}
    <View style={[s.fg, s.fgLeft]}>
      <Text style={[s.serif, { color: textOnly ? '#FFFFFF' : '#141313', textAlign: 'left', letterSpacing: -2 }]}>
        {phrase}
      </Text>
    </View>
    <Watermark hidden={textOnly} />
  </View>
)

// ─── REGISTRY ──────────────────────────────────────────────────────────────

const CURATED: Omit<TemplateMeta, 'mode'>[] = [
  { id: 'cream',    name: 'Cream',    Component: TCream },
  { id: 'italic',   name: 'Soft',     Component: TItalic,   textOnlyColor: '#FFFEF8' },
  { id: 'midnight', name: 'Midnight', Component: TMidnight, textOnlyColor: '#FFFEF8' },
  { id: 'lilac',    name: 'Lilac',    Component: TLilac },
  { id: 'sage',     name: 'Sage',     Component: TSage },
  { id: 'magazine', name: 'Magazine', Component: TMagazine },
]

// The same clean set serves both modes.
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
  bgFill: {
    ...StyleSheet.absoluteFillObject,
  },
  fg: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 2,
    padding: 110,
  },
  fgCenter: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  fgLeft: {
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  serif: {
    fontFamily: font.displayBold,
    fontSize: 104,
    lineHeight: 116,
    letterSpacing: -1.5,
    textAlign: 'center',
  },
  italic: {
    fontFamily: font.italic,
    fontSize: 112,
    lineHeight: 126,
    letterSpacing: -1,
    textAlign: 'center',
  },
  watermark: {
    position: 'absolute',
    bottom: 44,
    left: 0,
    right: 0,
    textAlign: 'center',
    fontFamily: font.bodyMedium,
    fontSize: 24,
    letterSpacing: 2,
    zIndex: 4,
  },
})
