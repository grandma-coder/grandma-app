/**
 * Affirmation share templates — 20 designs across trying (pre-preg) + pregnancy.
 *
 * Each template renders at 1080×1350 (4:5) and is exported via react-native-view-shot.
 * Text-only mode strips the .bg and .deco slots, keeping only the phrase — for
 * transparent-PNG sharing (Instagram overlays, etc).
 *
 * Ported from docs/affirmation-share-preview.html (templates 01–20).
 */

import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import Svg, {
  Circle,
  Ellipse,
  G,
  Line,
  Path,
  Polygon,
  Rect,
} from 'react-native-svg'

export const CANVAS_W = 1080
export const CANVAS_H = 1350

export type AffirmationMode = 'prePreg' | 'pregnancy'

export interface TemplateProps {
  phrase: string
  /** When true, the template hides .bg / .deco slots and renders only typography. */
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

function splitPoem(phrase: string): string[] {
  const lower = phrase.toLowerCase()
  for (const c of [' and ', ' but ']) {
    const idx = lower.indexOf(c)
    if (idx > 0) return [phrase.slice(0, idx).trim(), phrase.slice(idx + 1).trim()]
  }
  const commaIdx = phrase.indexOf(',')
  if (commaIdx > 0) return [phrase.slice(0, commaIdx).trim(), phrase.slice(commaIdx + 1).trim()]
  const mid = Math.floor(phrase.length / 2)
  let splitAt = phrase.indexOf(' ', mid)
  if (splitAt < 0) splitAt = phrase.lastIndexOf(' ', mid)
  if (splitAt < 0) return [phrase]
  return [phrase.slice(0, splitAt).trim(), phrase.slice(splitAt + 1).trim()]
}

const WM = 'grandma.app'
const Watermark: React.FC<{ color?: string; hidden?: boolean }> = ({ color = 'rgba(20,19,19,0.4)', hidden }) => {
  if (hidden) return null
  return <Text style={[s.watermark, { color }]}>{WM}</Text>
}

// ─── sticker primitives (inline SVG) ───────────────────────────────────────

const StickerHeart: React.FC<{ size: number; fill: string }> = ({ size, fill }) => (
  <Svg width={size} height={size} viewBox="0 0 100 100">
    <Path fill={fill} d="M50 85 C20 60 10 40 25 25 C38 12 50 25 50 32 C50 25 62 12 75 25 C90 40 80 60 50 85 Z" />
  </Svg>
)

const StickerStar: React.FC<{ size: number; fill: string }> = ({ size, fill }) => (
  <Svg width={size} height={size} viewBox="0 0 100 100">
    <Polygon fill={fill} points="50,8 60,40 92,42 66,60 76,92 50,72 24,92 34,60 8,42 40,40" />
  </Svg>
)

const StickerMoon: React.FC<{ size: number; fill: string }> = ({ size, fill }) => (
  <Svg width={size} height={size} viewBox="0 0 100 100">
    <Path fill={fill} d="M70 20 a40 40 0 1 0 10 60 a32 32 0 1 1 -10 -60 Z" />
  </Svg>
)

const StickerBurst: React.FC<{ size: number; fill: string }> = ({ size, fill }) => {
  const pts: string[] = []
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2
    const r = i % 2 === 0 ? 50 : 28
    pts.push(`${50 + Math.cos(a) * r},${50 + Math.sin(a) * r}`)
  }
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Polygon fill={fill} points={pts.join(' ')} />
    </Svg>
  )
}

const StickerDiamond: React.FC<{ size: number; fill: string }> = ({ size, fill }) => (
  <Svg width={size} height={size} viewBox="0 0 100 100">
    <Polygon fill={fill} points="50,5 95,50 50,95 5,50" />
  </Svg>
)

const StickerSparkle: React.FC<{ size: number; fill: string }> = ({ size, fill }) => (
  <Svg width={size} height={size} viewBox="0 0 100 100">
    <Path fill={fill} d="M50 20 L55 45 L80 50 L55 55 L50 80 L45 55 L20 50 L45 45 Z" />
  </Svg>
)

const StickerFlower: React.FC<{ size: number; petal: string; center: string }> = ({ size, petal, center }) => (
  <Svg width={size} height={size} viewBox="0 0 100 100">
    <G>
      <Circle cx={50} cy={20} r={14} fill={petal} />
      <Circle cx={50} cy={80} r={14} fill={petal} />
      <Circle cx={20} cy={50} r={14} fill={petal} />
      <Circle cx={80} cy={50} r={14} fill={petal} />
      <Circle cx={28} cy={28} r={12} fill={petal} />
      <Circle cx={72} cy={28} r={12} fill={petal} />
      <Circle cx={28} cy={72} r={12} fill={petal} />
      <Circle cx={72} cy={72} r={12} fill={petal} />
      <Circle cx={50} cy={50} r={14} fill={center} />
    </G>
  </Svg>
)

const StickerSprig: React.FC<{ size: number; stroke: string }> = ({ size, stroke }) => (
  <Svg width={size} height={size} viewBox="0 0 100 100">
    <G stroke={stroke} strokeWidth={3} fill="none" strokeLinecap="round">
      <Path d="M50 10 L50 90" />
      <Path d="M50 30 Q38 34 34 42" />
      <Path d="M50 45 Q62 49 66 57" />
      <Path d="M50 60 Q38 64 34 72" />
    </G>
  </Svg>
)

const HormoneWave: React.FC<{ width: number; height: number; stroke: string; markFill?: string }> = ({
  width,
  height,
  stroke,
  markFill = '#F5D652',
}) => (
  <Svg width={width} height={height} viewBox="0 0 200 80" preserveAspectRatio="none">
    <Path
      d="M0 55 C 30 20, 50 65, 80 40 S 140 20, 170 55 S 200 45, 200 55"
      fill="none"
      stroke={stroke}
      strokeWidth={3}
      strokeLinecap="round"
    />
    <Circle cx={100} cy={32} r={5} fill={markFill} />
  </Svg>
)

// ─── PRE-PREGNANCY (10) ────────────────────────────────────────────────────

// pp-01 · Cream Heart — Fraunces serif · cream bg · blush heart sticker
const PP01: React.FC<TemplateProps> = ({ phrase, textOnly }) => (
  <View style={s.canvas}>
    {!textOnly && <View style={[s.bgFill, { backgroundColor: '#FFFEF8' }]} />}
    {!textOnly && (
      <View style={{ position: 'absolute', right: -60, bottom: -40, width: 620, height: 620 }}>
        <StickerHeart size={620} fill="#F9D8E2" />
      </View>
    )}
    {!textOnly && (
      <Text style={[s.label, { color: textOnly ? '#FFFFFF' : '#141313', top: '18%' }]}>DAILY AFFIRMATION</Text>
    )}
    <View style={[s.fg, s.fgCenter]}>
      <Text style={{ fontFamily: 'Fraunces_700Bold', fontSize: 108, lineHeight: 118, color: textOnly ? '#FFFFFF' : '#141313', letterSpacing: -2, textAlign: 'center' }}>
        {phrase}
      </Text>
    </View>
    <Watermark hidden={textOnly} />
  </View>
)

// pp-02 · Burgundy Lipstick — Yeseva One italic · deep burgundy
const PP02: React.FC<TemplateProps> = ({ phrase, textOnly }) => (
  <View style={s.canvas}>
    {!textOnly && <View style={[s.bgFill, { backgroundColor: '#3A0E20' }]} />}
    <View style={[s.fg, s.fgCenter]}>
      <Text style={{ fontFamily: 'YesevaOne_400Regular', fontStyle: 'italic', fontSize: 118, lineHeight: 130, color: '#F2B2C7', letterSpacing: -3, textAlign: 'center' }}>
        {phrase}
      </Text>
    </View>
    <Watermark hidden={textOnly} color="rgba(242,178,199,0.5)" />
  </View>
)

// pp-03 · Rose Gold Foil — Abril Fatface · metallic gradient
const PP03: React.FC<TemplateProps> = ({ phrase, textOnly }) => (
  <View style={s.canvas}>
    {!textOnly && (
      <Svg width={CANVAS_W} height={CANVAS_H} style={StyleSheet.absoluteFill}>
        <Rect x={0} y={0} width={CANVAS_W} height={CANVAS_H} fill="#F8E2DA" />
        <Rect x={0} y={CANVAS_H * 0.45} width={CANVAS_W} height={CANVAS_H * 0.55} fill="#E8B8A8" />
        <Rect x={0} y={CANVAS_H * 0.75} width={CANVAS_W} height={CANVAS_H * 0.25} fill="#C79886" />
      </Svg>
    )}
    {!textOnly && (
      <View style={{ position: 'absolute', top: '14%', alignSelf: 'center', width: 150, height: 150 }}>
        <StickerSparkle size={150} fill="#FFFEF8" />
      </View>
    )}
    <View style={[s.fg, s.fgCenter]}>
      <Text style={{ fontFamily: 'AbrilFatface_400Regular', fontSize: 108, lineHeight: 118, color: textOnly ? '#FFFFFF' : '#4A1D2B', textAlign: 'center', letterSpacing: -1 }}>
        {phrase}
      </Text>
    </View>
    <Watermark hidden={textOnly} color="rgba(74,29,43,0.5)" />
  </View>
)

// pp-04 · Ticker Tape — Space Mono · black with pink ticker lines
const PP04: React.FC<TemplateProps> = ({ phrase, textOnly }) => {
  const upper = phrase.toUpperCase()
  const tick = (upper + ' · ').repeat(5)
  return (
    <View style={s.canvas}>
      {!textOnly && <View style={[s.bgFill, { backgroundColor: '#000000' }]} />}
      {!textOnly && (
        <View style={{ position: 'absolute', top: '10%', left: 0, right: 0, overflow: 'hidden', height: 40 }}>
          <Text numberOfLines={1} style={{ fontFamily: 'SpaceMono_400Regular', fontSize: 28, letterSpacing: 4, color: '#FF4D9D', opacity: 0.6 }}>
            {tick}
          </Text>
        </View>
      )}
      {!textOnly && (
        <View style={{ position: 'absolute', bottom: '10%', left: 0, right: 0, overflow: 'hidden', height: 40 }}>
          <Text numberOfLines={1} style={{ fontFamily: 'SpaceMono_400Regular', fontSize: 28, letterSpacing: 4, color: '#FF4D9D', opacity: 0.6 }}>
            {tick}
          </Text>
        </View>
      )}
      <View style={[s.fg, s.fgCenter]}>
        <Text style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 74, lineHeight: 90, color: '#FFFEF8', letterSpacing: -1, textAlign: 'center' }}>
          {upper}
        </Text>
      </View>
      <Watermark hidden={textOnly} color="rgba(255,77,157,0.5)" />
    </View>
  )
}

// pp-05 · Neon Billboard — Archivo Black · hot pink with white stars
const PP05: React.FC<TemplateProps> = ({ phrase, textOnly }) => (
  <View style={s.canvas}>
    {!textOnly && <View style={[s.bgFill, { backgroundColor: '#FF4D9D' }]} />}
    {!textOnly && (
      <>
        <View style={{ position: 'absolute', top: '10%', left: '8%', width: 130, height: 130 }}>
          <StickerStar size={130} fill="#FFFEF8" />
        </View>
        <View style={{ position: 'absolute', top: '16%', right: '12%', width: 90, height: 90 }}>
          <StickerStar size={90} fill="#FFFEF8" />
        </View>
        <View style={{ position: 'absolute', bottom: '16%', left: '14%', width: 80, height: 80 }}>
          <StickerStar size={80} fill="#FFFEF8" />
        </View>
        <View style={{ position: 'absolute', bottom: '22%', right: '10%', width: 110, height: 110 }}>
          <StickerStar size={110} fill="#FFFEF8" />
        </View>
      </>
    )}
    <View style={[s.fg, s.fgCenter]}>
      <Text style={{ fontFamily: 'ArchivoBlack_400Regular', fontSize: 104, lineHeight: 108, color: '#FFFEF8', letterSpacing: -2, textAlign: 'center' }}>
        {phrase.toUpperCase()}
      </Text>
    </View>
    <Watermark hidden={textOnly} color="rgba(255,254,248,0.6)" />
  </View>
)

// pp-06 · Ransom Zine — Permanent Marker + Caveat + Mono mix · cream with tape
const PP06: React.FC<TemplateProps> = ({ phrase, textOnly }) => {
  const words = phrase.split(' ')
  return (
    <View style={s.canvas}>
      {!textOnly && <View style={[s.bgFill, { backgroundColor: '#FFFEF8' }]} />}
      {!textOnly && (
        <View
          style={{
            position: 'absolute',
            top: '12%',
            left: -80,
            right: -80,
            height: 80,
            backgroundColor: '#F5D652',
            transform: [{ rotate: '-3deg' }],
            opacity: 0.85,
          }}
        />
      )}
      {!textOnly && (
        <View
          style={{
            position: 'absolute',
            bottom: '20%',
            left: -80,
            right: -80,
            height: 60,
            backgroundColor: '#F2B2C7',
            transform: [{ rotate: '2deg' }],
            opacity: 0.85,
          }}
        />
      )}
      <View style={[s.fg, s.fgCenter, { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' }]}>
        {words.map((w, i) => {
          const rot = i % 2 === 0 ? '-2deg' : '3deg'
          const family = i % 3 === 0 ? 'PermanentMarker_400Regular' : i % 3 === 1 ? 'Caveat_700Bold' : 'SpaceMono_700Bold'
          const size = i % 3 === 0 ? 96 : i % 3 === 1 ? 118 : 72
          return (
            <Text
              key={i}
              style={{
                fontFamily: family,
                fontSize: size,
                lineHeight: size * 1.05,
                color: textOnly ? '#FFFFFF' : '#141313',
                marginHorizontal: 16,
                transform: [{ rotate: rot }],
              }}
            >
              {w}
            </Text>
          )
        })}
      </View>
      <Watermark hidden={textOnly} />
    </View>
  )
}

// pp-07 · Candy Stripes — Fraunces italic inside a white disc
const PP07: React.FC<TemplateProps> = ({ phrase, textOnly }) => (
  <View style={s.canvas}>
    {!textOnly && (
      <Svg width={CANVAS_W} height={CANVAS_H} style={StyleSheet.absoluteFill}>
        {Array.from({ length: 60 }).map((_, i) => {
          const x = -600 + i * 48
          return <Rect key={i} x={x} y={-200} width={24} height={2000} fill={i % 2 === 0 ? '#FFFEF8' : '#F7CFDD'} transform={`rotate(45 ${CANVAS_W / 2} ${CANVAS_H / 2})`} />
        })}
      </Svg>
    )}
    <View style={[s.fg, s.fgCenter]}>
      <View style={[textOnly ? s.transparentDisc : s.disc]}>
        <Text style={{ fontFamily: 'Fraunces_600SemiBold', fontStyle: 'italic', fontSize: 82, lineHeight: 94, color: textOnly ? '#FFFFFF' : '#E58BB4', textAlign: 'center', letterSpacing: -1 }}>
          {phrase}
        </Text>
      </View>
    </View>
    <Watermark hidden={textOnly} />
  </View>
)

// pp-08 · Sunset Photo — Playfair Display Black Italic · purple→coral→yellow
const PP08: React.FC<TemplateProps> = ({ phrase, textOnly }) => (
  <View style={s.canvas}>
    {!textOnly && (
      <Svg width={CANVAS_W} height={CANVAS_H} style={StyleSheet.absoluteFill}>
        <Rect x={0} y={0} width={CANVAS_W} height={CANVAS_H * 0.45} fill="#6B2FBF" />
        <Rect x={0} y={CANVAS_H * 0.45} width={CANVAS_W} height={CANVAS_H * 0.45} fill="#E85D75" />
        <Rect x={0} y={CANVAS_H * 0.8} width={CANVAS_W} height={CANVAS_H * 0.2} fill="#FFD166" />
      </Svg>
    )}
    <View style={[s.fg, s.fgBottom]}>
      <Text style={{ fontFamily: 'PlayfairDisplay_900Black_Italic', fontSize: 108, lineHeight: 114, color: '#FFFEF8', letterSpacing: -2, textAlign: 'center' }}>
        {phrase}
      </Text>
    </View>
    <Watermark hidden={textOnly} color="rgba(255,254,248,0.6)" />
  </View>
)

// pp-09 · Hormone Chart — IBM Plex Serif italic · dark data-viz
const PP09: React.FC<TemplateProps> = ({ phrase, textOnly }) => (
  <View style={s.canvas}>
    {!textOnly && <View style={[s.bgFill, { backgroundColor: '#120820' }]} />}
    {!textOnly && (
      <View style={{ position: 'absolute', top: '26%', left: '8%', right: '8%', height: CANVAS_H * 0.28 }}>
        <HormoneWave width={CANVAS_W * 0.84} height={CANVAS_H * 0.28} stroke="#E58BB4" />
      </View>
    )}
    {!textOnly && (
      <View
        style={{
          position: 'absolute',
          top: '26%',
          left: '8%',
          right: '8%',
          height: CANVAS_H * 0.28,
          borderTopWidth: 1,
          borderBottomWidth: 1,
          borderColor: 'rgba(255,255,255,0.15)',
          borderStyle: 'dashed',
        }}
      />
    )}
    {!textOnly && (
      <Text style={[s.label, { color: textOnly ? '#FFFFFF' : '#E58BB4', top: '12%', fontFamily: 'SpaceMono_700Bold' }]}>
        DAY 14 · OVULATION
      </Text>
    )}
    <View style={[s.fg, s.fgBottom]}>
      <Text style={{ fontFamily: 'IBMPlexSerif_400Regular_Italic', fontSize: 78, lineHeight: 96, color: '#FFFEF8', textAlign: 'center' }}>
        {phrase}
      </Text>
    </View>
    <Watermark hidden={textOnly} color="rgba(229,139,180,0.5)" />
  </View>
)

// pp-10 · Polaroid Scrapbook — Caveat · cream + tilted polaroid + washi
const PP10: React.FC<TemplateProps> = ({ phrase, textOnly }) => (
  <View style={s.canvas}>
    {!textOnly && <View style={[s.bgFill, { backgroundColor: '#FFFEF8' }]} />}
    {!textOnly && (
      <View
        style={{
          position: 'absolute',
          top: '10%',
          left: '11%',
          right: '11%',
          bottom: '10%',
          backgroundColor: '#F7CFDD',
          borderWidth: 28,
          borderColor: '#FFFEF8',
          transform: [{ rotate: '-4deg' }],
          alignItems: 'center',
          justifyContent: 'center',
          padding: 120,
          shadowColor: '#000',
          shadowOffset: { width: 12, height: 12 },
          shadowOpacity: 0.12,
          shadowRadius: 0,
        }}
      >
        <Text style={{ fontFamily: 'Caveat_700Bold', fontSize: 120, lineHeight: 130, color: textOnly ? '#FFFFFF' : '#141313', textAlign: 'center' }}>
          {phrase}
        </Text>
      </View>
    )}
    {textOnly && (
      <View style={[s.fg, s.fgCenter]}>
        <Text style={{ fontFamily: 'Caveat_700Bold', fontSize: 120, lineHeight: 130, color: textOnly ? '#FFFFFF' : '#141313', textAlign: 'center' }}>
          {phrase}
        </Text>
      </View>
    )}
    {!textOnly && (
      <View
        style={{
          position: 'absolute',
          top: '8%',
          left: '16%',
          width: '38%',
          height: 90,
          backgroundColor: '#F5D652',
          opacity: 0.9,
          transform: [{ rotate: '-8deg' }],
        }}
      />
    )}
    <Watermark hidden={textOnly} />
  </View>
)

// ─── PREGNANCY (10) ────────────────────────────────────────────────────────

// pg-01 · Midnight Poem — Instrument Serif italic · deep ink · star + moon
const PG01: React.FC<TemplateProps> = ({ phrase, textOnly }) => {
  const lines = splitPoem(phrase)
  return (
    <View style={s.canvas}>
      {!textOnly && <View style={[s.bgFill, { backgroundColor: '#0E0B1A' }]} />}
      {!textOnly && (
        <View style={{ position: 'absolute', top: '10%', left: '14%', width: 130, height: 130 }}>
          <StickerStar size={130} fill="#F5D652" />
        </View>
      )}
      {!textOnly && (
        <View style={{ position: 'absolute', bottom: '10%', right: '6%', width: 280, height: 280 }}>
          <StickerMoon size={280} fill="#C8B6E8" />
        </View>
      )}
      <View style={[s.fg, s.fgCenter]}>
        {lines.map((l, i) => (
          <Text key={i} style={{ fontFamily: 'InstrumentSerif_400Regular_Italic', fontSize: 108, lineHeight: 130, color: '#FFFEF8', textAlign: 'center' }}>
            {l}
          </Text>
        ))}
      </View>
      <Watermark hidden={textOnly} color="rgba(255,254,248,0.5)" />
    </View>
  )
}

// pg-02 · Lilac Soft — Instrument italic lowercase · pastel lilac
const PG02: React.FC<TemplateProps> = ({ phrase, textOnly }) => (
  <View style={s.canvas}>
    {!textOnly && <View style={[s.bgFill, { backgroundColor: '#E3D8F2' }]} />}
    {!textOnly && (
      <View style={{ position: 'absolute', top: '6%', left: '6%', width: 280, height: 280 }}>
        <StickerBurst size={280} fill="#F5D652" />
      </View>
    )}
    {!textOnly && (
      <View style={{ position: 'absolute', bottom: '8%', right: '6%', width: 340, height: 340 }}>
        <StickerMoon size={340} fill="#C8B6E8" />
      </View>
    )}
    <View style={[s.fg, s.fgCenter]}>
      <Text style={{ fontFamily: 'InstrumentSerif_400Regular_Italic', fontSize: 118, lineHeight: 130, color: textOnly ? '#FFFFFF' : '#141313', textAlign: 'center' }}>
        {phrase.toLowerCase()}
      </Text>
    </View>
    <Watermark hidden={textOnly} />
  </View>
)

// pg-03 · Peach Poster — Archivo Black · peach with sun burst
const PG03: React.FC<TemplateProps> = ({ phrase, textOnly }) => (
  <View style={s.canvas}>
    {!textOnly && <View style={[s.bgFill, { backgroundColor: '#F5B896' }]} />}
    {!textOnly && (
      <View style={{ position: 'absolute', top: '8%', left: '6%', right: '6%', bottom: '22%', opacity: 0.35 }}>
        <StickerBurst size={CANVAS_W * 0.88} fill="#F5D652" />
      </View>
    )}
    <View style={[s.fg, s.fgCenter]}>
      <Text style={{ fontFamily: 'ArchivoBlack_400Regular', fontSize: 110, lineHeight: 108, color: '#FFFEF8', letterSpacing: -3, textAlign: 'center' }}>
        {phrase.toUpperCase()}
      </Text>
    </View>
    <Watermark hidden={textOnly} />
  </View>
)

// pg-04 · Retro Mustard — Shrikhand · mustard yellow
const PG04: React.FC<TemplateProps> = ({ phrase, textOnly }) => (
  <View style={s.canvas}>
    {!textOnly && <View style={[s.bgFill, { backgroundColor: '#E5C46B' }]} />}
    {!textOnly && (
      <>
        <View style={{ position: 'absolute', top: '8%', left: '10%', width: 110, height: 110 }}>
          <StickerDiamond size={110} fill="#2A1A3A" />
        </View>
        <View style={{ position: 'absolute', bottom: '14%', right: '12%', width: 110, height: 110 }}>
          <StickerDiamond size={110} fill="#2A1A3A" />
        </View>
      </>
    )}
    <View style={[s.fg, s.fgCenter]}>
      <Text style={{ fontFamily: 'Shrikhand_400Regular', fontSize: 104, lineHeight: 118, color: textOnly ? '#FFFFFF' : '#2A1A3A', textAlign: 'center' }}>
        {phrase}
      </Text>
    </View>
    <Watermark hidden={textOnly} color="rgba(42,26,58,0.5)" />
  </View>
)

// pg-05 · Sage Minimal — Libre Caslon italic · sage green + sprig
const PG05: React.FC<TemplateProps> = ({ phrase, textOnly }) => (
  <View style={s.canvas}>
    {!textOnly && <View style={[s.bgFill, { backgroundColor: '#A8B89D' }]} />}
    {!textOnly && (
      <View style={{ position: 'absolute', top: '54%', alignSelf: 'center', width: 60, height: 60 }}>
        <StickerSprig size={60} stroke="#2F3B27" />
      </View>
    )}
    <View style={[s.fg, { justifyContent: 'flex-start', paddingTop: '22%' }]}>
      <Text style={{ fontFamily: 'LibreCaslonText_400Regular_Italic', fontSize: 92, lineHeight: 124, color: textOnly ? '#FFFFFF' : '#1F2A18', textAlign: 'center' }}>
        {phrase.toLowerCase()}
      </Text>
    </View>
    <Watermark hidden={textOnly} color="rgba(31,42,24,0.5)" />
  </View>
)

// pg-06 · Lime Punch — DM Sans left-aligned · lime green
const PG06: React.FC<TemplateProps> = ({ phrase, textOnly }) => (
  <View style={s.canvas}>
    {!textOnly && <View style={[s.bgFill, { backgroundColor: '#BDD48C' }]} />}
    {!textOnly && (
      <View style={{ position: 'absolute', top: '6%', right: '8%', width: 280, height: 280 }}>
        <StickerFlower size={280} petal="#F2B2C7" center="#F5D652" />
      </View>
    )}
    {!textOnly && (
      <View style={{ position: 'absolute', top: '40%', left: '8%', width: 130, height: 130 }}>
        <StickerStar size={130} fill="#F5D652" />
      </View>
    )}
    {!textOnly && (
      <View style={{ position: 'absolute', bottom: '18%', right: '12%', width: 100, height: 100 }}>
        <StickerStar size={100} fill="#F5D652" />
      </View>
    )}
    <View style={[s.fg, s.fgLeft]}>
      <Text style={{ fontFamily: 'DMSans_700Bold', fontSize: 98, lineHeight: 108, color: textOnly ? '#FFFFFF' : '#141313', letterSpacing: -2, textAlign: 'left' }}>
        {phrase}
      </Text>
    </View>
    <Watermark hidden={textOnly} />
  </View>
)

// pg-07 · Pink Blush — Fraunces · pink with tilted hearts + signature
const PG07: React.FC<TemplateProps> = ({ phrase, textOnly }) => (
  <View style={s.canvas}>
    {!textOnly && <View style={[s.bgFill, { backgroundColor: '#F2B2C7' }]} />}
    {!textOnly && (
      <View style={{ position: 'absolute', top: '8%', left: '6%', width: 220, height: 220, transform: [{ rotate: '-14deg' }] }}>
        <StickerHeart size={220} fill="#C8B6E8" />
      </View>
    )}
    {!textOnly && (
      <View style={{ position: 'absolute', top: '12%', right: '10%', width: 160, height: 160, transform: [{ rotate: '12deg' }] }}>
        <StickerHeart size={160} fill="#FBEA9E" />
      </View>
    )}
    {!textOnly && (
      <View style={{ position: 'absolute', bottom: -80, left: '32%', width: 360, height: 360 }}>
        <StickerHeart size={360} fill="#F9D8E2" />
      </View>
    )}
    <View style={[s.fg, s.fgCenter]}>
      <Text style={{ fontFamily: 'Fraunces_600SemiBold', fontSize: 102, lineHeight: 118, color: textOnly ? '#FFFFFF' : '#141313', letterSpacing: -2, textAlign: 'center' }}>
        {phrase}
      </Text>
      {!textOnly && (
        <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 40, color: textOnly ? '#FFFFFF' : '#141313', marginTop: 40, opacity: 0.7, textAlign: 'center' }}>
          — xo, Grandma
        </Text>
      )}
    </View>
    <Watermark hidden={textOnly} />
  </View>
)

// pg-08 · Week Numeral — giant background "24" + Instrument italic caption
const PG08: React.FC<TemplateProps> = ({ phrase, textOnly }) => (
  <View style={s.canvas}>
    {!textOnly && (
      <Svg width={CANVAS_W} height={CANVAS_H} style={StyleSheet.absoluteFill}>
        <Rect x={0} y={0} width={CANVAS_W} height={CANVAS_H} fill="#6B4FB8" />
        <Rect x={0} y={CANVAS_H * 0.5} width={CANVAS_W} height={CANVAS_H * 0.5} fill="#B7A6E8" opacity={0.25} />
      </Svg>
    )}
    {!textOnly && (
      <Text
        style={{
          position: 'absolute',
          top: 20,
          left: 0,
          right: 0,
          textAlign: 'center',
          fontFamily: 'Fraunces_800ExtraBold',
          fontSize: 820,
          lineHeight: 820,
          color: 'rgba(255,255,255,0.13)',
          letterSpacing: -30,
        }}
      >
        24
      </Text>
    )}
    {!textOnly && (
      <Text style={[s.label, { color: '#FFFEF8', top: '22%', fontFamily: 'SpaceMono_700Bold' }]}>
        WEEK · TRIMESTER II
      </Text>
    )}
    <View style={[s.fg, { paddingTop: '40%' }]}>
      <Text style={{ fontFamily: 'InstrumentSerif_400Regular_Italic', fontSize: 98, lineHeight: 118, color: '#FFFEF8', textAlign: 'center' }}>
        {phrase}
      </Text>
    </View>
    <Watermark hidden={textOnly} color="rgba(255,254,248,0.6)" />
  </View>
)

// pg-09 · Magazine Split — half cream / half lavender · Fraunces editorial
const PG09: React.FC<TemplateProps> = ({ phrase, textOnly }) => (
  <View style={s.canvas}>
    {!textOnly && (
      <Svg width={CANVAS_W} height={CANVAS_H} style={StyleSheet.absoluteFill}>
        <Rect x={0} y={0} width={CANVAS_W / 2} height={CANVAS_H} fill="#FFFEF8" />
        <Rect x={CANVAS_W / 2} y={0} width={CANVAS_W / 2} height={CANVAS_H} fill="#B7A6E8" />
      </Svg>
    )}
    {!textOnly && (
      <Text
        style={{
          position: 'absolute',
          top: '8%',
          left: '8%',
          fontFamily: 'SpaceMono_700Bold',
          fontSize: 22,
          letterSpacing: 3,
          color: textOnly ? '#FFFFFF' : '#141313',
        }}
      >
        GRANDMA · VOL. 24
      </Text>
    )}
    {!textOnly && (
      <View style={{ position: 'absolute', bottom: '12%', right: '10%', width: 240, height: 240 }}>
        <StickerHeart size={240} fill="#FFFEF8" />
      </View>
    )}
    <View style={[s.fg, s.fgLeft, { paddingLeft: 80, paddingRight: 80 }]}>
      <Text style={{ fontFamily: 'Fraunces_700Bold', fontSize: 92, lineHeight: 106, color: textOnly ? '#FFFFFF' : '#141313', letterSpacing: -2, textAlign: 'left' }}>
        {phrase}
      </Text>
    </View>
    <Watermark hidden={textOnly} />
  </View>
)

// pg-10 · Navy Bars — Bebas Neue condensed · deep navy with yellow bars
const PG10: React.FC<TemplateProps> = ({ phrase, textOnly }) => (
  <View style={s.canvas}>
    {!textOnly && <View style={[s.bgFill, { backgroundColor: '#0E1840' }]} />}
    {!textOnly && (
      <View style={{ position: 'absolute', top: '16%', left: '10%', width: '30%', height: 8, backgroundColor: '#F5D652' }} />
    )}
    {!textOnly && (
      <View style={{ position: 'absolute', bottom: '16%', right: '10%', width: '30%', height: 8, backgroundColor: '#F5D652' }} />
    )}
    {!textOnly && (
      <Text
        style={{
          position: 'absolute',
          top: '22%',
          left: '10%',
          fontFamily: 'SpaceMono_700Bold',
          fontSize: 28,
          letterSpacing: 4,
          color: '#F5D652',
        }}
      >
        KEEP GOING
      </Text>
    )}
    <View style={[s.fg, s.fgLeft, { paddingTop: 280 }]}>
      <Text style={{ fontFamily: 'BebasNeue_400Regular', fontSize: 160, lineHeight: 160, color: '#FFFEF8', letterSpacing: 2, textAlign: 'left' }}>
        {phrase.toUpperCase()}
      </Text>
    </View>
    <Watermark hidden={textOnly} color="rgba(245,214,82,0.6)" />
  </View>
)

// ─── REGISTRY ──────────────────────────────────────────────────────────────

export const allAffirmationTemplates: TemplateMeta[] = [
  // Pre-pregnancy (trying) — 10
  { id: 'pp-01', name: 'Cream Heart',       mode: 'prePreg',   Component: PP01 },
  { id: 'pp-02', name: 'Burgundy Lipstick', mode: 'prePreg',   Component: PP02, textOnlyColor: '#F2B2C7' },
  { id: 'pp-03', name: 'Rose Gold',         mode: 'prePreg',   Component: PP03, textOnlyColor: '#4A1D2B' },
  { id: 'pp-04', name: 'Ticker Tape',       mode: 'prePreg',   Component: PP04, textOnlyColor: '#FFFEF8' },
  { id: 'pp-05', name: 'Neon Billboard',    mode: 'prePreg',   Component: PP05, textOnlyColor: '#FFFEF8' },
  { id: 'pp-06', name: 'Ransom Zine',       mode: 'prePreg',   Component: PP06 },
  { id: 'pp-07', name: 'Candy Stripes',     mode: 'prePreg',   Component: PP07, textOnlyColor: '#E58BB4' },
  { id: 'pp-08', name: 'Sunset Photo',      mode: 'prePreg',   Component: PP08, textOnlyColor: '#FFFEF8' },
  { id: 'pp-09', name: 'Hormone Chart',     mode: 'prePreg',   Component: PP09, textOnlyColor: '#FFFEF8' },
  { id: 'pp-10', name: 'Polaroid',          mode: 'prePreg',   Component: PP10 },

  // Pregnancy — 10
  { id: 'pg-01', name: 'Midnight Poem',     mode: 'pregnancy', Component: PG01, textOnlyColor: '#FFFEF8' },
  { id: 'pg-02', name: 'Lilac Soft',        mode: 'pregnancy', Component: PG02 },
  { id: 'pg-03', name: 'Peach Poster',      mode: 'pregnancy', Component: PG03, textOnlyColor: '#FFFEF8' },
  { id: 'pg-04', name: 'Retro Mustard',     mode: 'pregnancy', Component: PG04, textOnlyColor: '#2A1A3A' },
  { id: 'pg-05', name: 'Sage Minimal',      mode: 'pregnancy', Component: PG05 },
  { id: 'pg-06', name: 'Lime Punch',        mode: 'pregnancy', Component: PG06 },
  { id: 'pg-07', name: 'Pink Blush',        mode: 'pregnancy', Component: PG07 },
  { id: 'pg-08', name: 'Week Numeral',      mode: 'pregnancy', Component: PG08, textOnlyColor: '#FFFEF8' },
  { id: 'pg-09', name: 'Magazine Split',    mode: 'pregnancy', Component: PG09 },
  { id: 'pg-10', name: 'Navy Bars',         mode: 'pregnancy', Component: PG10, textOnlyColor: '#FFFEF8' },
]

// Backwards-compat alias — the modal now filters by mode.
export const affirmationTemplates = allAffirmationTemplates

export function templatesForMode(mode: AffirmationMode): TemplateMeta[] {
  return allAffirmationTemplates.filter((t) => t.mode === mode)
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
    inset: 0 as any,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 2,
    padding: 100,
  },
  fgCenter: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  fgLeft: {
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  fgBottom: {
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 180,
  },
  label: {
    position: 'absolute',
    left: 0,
    right: 0,
    textAlign: 'center',
    fontFamily: 'DMSans_700Bold',
    fontSize: 30,
    letterSpacing: 6,
    zIndex: 3,
  },
  watermark: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    textAlign: 'center',
    fontFamily: 'DMSans_500Medium',
    fontSize: 24,
    letterSpacing: 2,
    zIndex: 4,
  },
  disc: {
    width: CANVAS_W * 0.78,
    aspectRatio: 1,
    borderRadius: 9999,
    backgroundColor: '#FFFEF8',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 100,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.15,
    shadowRadius: 40,
  },
  transparentDisc: {
    width: CANVAS_W * 0.78,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 100,
  },
})
