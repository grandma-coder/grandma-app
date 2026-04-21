import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import {
  Heart,
  Burst,
  Moon,
  Star,
  Flower,
} from '../../stickers/BrandStickers'

export const CANVAS_W = 1080
export const CANVAS_H = 1350

export interface TemplateProps {
  phrase: string
}

export interface TemplateMeta {
  id: string
  name: string
  Component: React.FC<TemplateProps>
}

function splitPoem(phrase: string): string[] {
  const lower = phrase.toLowerCase()
  const connectors = [' and ', ' but ']
  for (const c of connectors) {
    const idx = lower.indexOf(c)
    if (idx > 0) {
      return [phrase.slice(0, idx).trim(), phrase.slice(idx + 1).trim()]
    }
  }
  const commaIdx = phrase.indexOf(',')
  if (commaIdx > 0) {
    return [phrase.slice(0, commaIdx).trim(), phrase.slice(commaIdx + 1).trim()]
  }
  const mid = Math.floor(phrase.length / 2)
  let splitAt = phrase.indexOf(' ', mid)
  if (splitAt < 0) splitAt = phrase.lastIndexOf(' ', mid)
  if (splitAt < 0) return [phrase]
  return [phrase.slice(0, splitAt).trim(), phrase.slice(splitAt + 1).trim()]
}

const WATERMARK = 'grandma.app'

function Watermark({ color = 'rgba(20,19,19,0.4)' }: { color?: string }) {
  return <Text style={[styles.watermark, { color }]}>{WATERMARK}</Text>
}

const CreamPaperTemplate: React.FC<TemplateProps> = ({ phrase }) => (
  <View style={[styles.canvas, { backgroundColor: '#FFFEF8' }]}>
    <View style={styles.centerBlock}>
      <Text style={styles.labelCharcoal}>DAILY AFFIRMATION</Text>
      <Text style={styles.fraunces48Charcoal}>{phrase}</Text>
    </View>
    <View style={{ position: 'absolute', right: -40, bottom: -40 }}>
      <Heart size={360} fill="#F9D8E2" />
    </View>
    <Watermark />
  </View>
)

const LilacDreamTemplate: React.FC<TemplateProps> = ({ phrase }) => (
  <View style={[styles.canvas, { backgroundColor: '#E3D8F2' }]}>
    <View style={{ position: 'absolute', top: 60, left: 60 }}>
      <Burst size={220} fill="#F5D652" />
    </View>
    <View style={{ position: 'absolute', bottom: 80, right: 40 }}>
      <Moon size={280} fill="#C8B6E8" />
    </View>
    <View style={styles.centerBlock}>
      <Text style={styles.instrumentItalic46Charcoal}>{phrase.toLowerCase()}</Text>
    </View>
    <Watermark />
  </View>
)

const PeachSunsetTemplate: React.FC<TemplateProps> = ({ phrase }) => (
  <View style={[styles.canvas, { backgroundColor: '#F5B896' }]}>
    <View style={{ position: 'absolute', top: 150, left: 280, opacity: 0.3 }}>
      <Burst size={820} fill="#F5D652" />
    </View>
    <View style={styles.centerBlock}>
      <Text style={styles.cabinet56Cream}>{phrase.toUpperCase()}</Text>
    </View>
    <Watermark color="rgba(20,19,19,0.35)" />
  </View>
)

const LimePunchTemplate: React.FC<TemplateProps> = ({ phrase }) => (
  <View style={[styles.canvas, { backgroundColor: '#BDD48C' }]}>
    <View style={{ position: 'absolute', top: 70, right: 80 }}>
      <Flower size={260} petal="#F2B2C7" center="#F5D652" />
    </View>
    <View style={{ position: 'absolute', top: 520, left: 80 }}>
      <Star size={140} fill="#F5D652" />
    </View>
    <View style={{ position: 'absolute', bottom: 200, right: 120 }}>
      <Star size={100} fill="#F5D652" />
    </View>
    <View style={styles.leftBlock}>
      <Text style={styles.dmsans48Charcoal}>{phrase}</Text>
    </View>
    <Watermark />
  </View>
)

const MidnightPoemTemplate: React.FC<TemplateProps> = ({ phrase }) => {
  const lines = splitPoem(phrase)
  return (
    <View style={[styles.canvas, { backgroundColor: '#2A2624' }]}>
      <View style={{ position: 'absolute', top: 90, left: 120 }}>
        <Star size={120} fill="#F5D652" />
      </View>
      <View style={{ position: 'absolute', bottom: 100, right: 60 }}>
        <Moon size={240} fill="#C8B6E8" />
      </View>
      <View style={styles.centerBlock}>
        {lines.map((line, i) => (
          <Text key={i} style={styles.instrumentItalic44Cream}>
            {line}
          </Text>
        ))}
      </View>
      <Watermark color="rgba(255,254,248,0.4)" />
    </View>
  )
}

const PinkBlushTemplate: React.FC<TemplateProps> = ({ phrase }) => (
  <View style={[styles.canvas, { backgroundColor: '#F2B2C7' }]}>
    <View style={{ position: 'absolute', top: 80, left: 60, transform: [{ rotate: '-14deg' }] }}>
      <Heart size={220} fill="#C8B6E8" />
    </View>
    <View style={{ position: 'absolute', top: 140, right: 100, transform: [{ rotate: '12deg' }] }}>
      <Heart size={150} fill="#FBEA9E" />
    </View>
    <View style={{ position: 'absolute', bottom: -30, left: 300 }}>
      <Heart size={300} fill="#F9D8E2" />
    </View>
    <View style={styles.centerBlock}>
      <Text style={styles.fraunces46Charcoal}>{phrase}</Text>
      <Text style={styles.signature}>— xo, Grandma</Text>
    </View>
    <Watermark />
  </View>
)

export const affirmationTemplates: TemplateMeta[] = [
  { id: 'cream',    name: 'Cream Paper',   Component: CreamPaperTemplate },
  { id: 'lilac',    name: 'Lilac Dream',   Component: LilacDreamTemplate },
  { id: 'peach',    name: 'Peach Sunset',  Component: PeachSunsetTemplate },
  { id: 'lime',     name: 'Lime Punch',    Component: LimePunchTemplate },
  { id: 'midnight', name: 'Midnight Poem', Component: MidnightPoemTemplate },
  { id: 'blush',    name: 'Pink Blush',    Component: PinkBlushTemplate },
]

const styles = StyleSheet.create({
  canvas: {
    width: CANVAS_W,
    height: CANVAS_H,
    position: 'relative',
    overflow: 'hidden',
  },

  centerBlock: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 100,
    zIndex: 2,
  },

  leftBlock: {
    flex: 1,
    alignItems: 'flex-start',
    justifyContent: 'center',
    paddingHorizontal: 100,
    zIndex: 2,
  },

  labelCharcoal: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 22,
    letterSpacing: 3,
    color: '#141313',
    marginBottom: 48,
    textAlign: 'center',
  },

  fraunces48Charcoal: {
    fontFamily: 'Fraunces_600SemiBold',
    fontSize: 76,
    lineHeight: 88,
    color: '#141313',
    textAlign: 'center',
    letterSpacing: -0.6,
  },

  fraunces46Charcoal: {
    fontFamily: 'Fraunces_600SemiBold',
    fontSize: 72,
    lineHeight: 84,
    color: '#141313',
    textAlign: 'center',
    letterSpacing: -0.5,
  },

  instrumentItalic46Charcoal: {
    fontFamily: 'InstrumentSerif_400Regular_Italic',
    fontSize: 82,
    lineHeight: 94,
    color: '#141313',
    textAlign: 'center',
    letterSpacing: -0.4,
  },

  instrumentItalic44Cream: {
    fontFamily: 'InstrumentSerif_400Regular_Italic',
    fontSize: 72,
    lineHeight: 96,
    color: '#FFFEF8',
    textAlign: 'center',
    letterSpacing: -0.3,
  },

  cabinet56Cream: {
    fontFamily: 'CabinetGrotesk-Black',
    fontSize: 92,
    lineHeight: 96,
    color: '#FFFEF8',
    textAlign: 'center',
    letterSpacing: -1.5,
  },

  dmsans48Charcoal: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 76,
    lineHeight: 88,
    color: '#141313',
    textAlign: 'left',
    letterSpacing: -0.6,
  },

  signature: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 36,
    color: '#141313',
    marginTop: 40,
    textAlign: 'center',
    opacity: 0.7,
  },

  watermark: {
    position: 'absolute',
    bottom: 36,
    alignSelf: 'center',
    left: 0,
    right: 0,
    textAlign: 'center',
    fontFamily: 'DMSans_500Medium',
    fontSize: 22,
    letterSpacing: 1.2,
    zIndex: 3,
  },
})
