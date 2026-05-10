import React, { useRef, useState, useEffect } from 'react'
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Animated,
  Easing,
} from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { LinearGradient } from 'expo-linear-gradient'
import { useTheme } from '../../../constants/theme'
import { MonoCaps, Body } from '../../ui/Typography'
import { Heart as HeartSticker, Star as StarSticker } from '../../stickers/BrandStickers'
import { supabase } from '../../../lib/supabase'
import { AffirmationShareModal } from './AffirmationShareModal'

// ─── Fetch daily affirmation from Supabase ────────────────────────────────────

async function loadDailyAffirmation(): Promise<string> {
  const today = new Date().toISOString().split('T')[0]
  const cacheKey = `affirmation_${today}`

  try {
    const cached = await AsyncStorage.getItem(cacheKey)
    if (cached) return cached
  } catch {
    // ignore cache errors
  }

  try {
    const { data, error } = await supabase.rpc('get_daily_affirmation', { p_category: 'pregnancy' })
    if (!error && typeof data === 'string' && data.length > 0) {
      await AsyncStorage.setItem(cacheKey, data).catch(() => {})
      return data
    }
  } catch {
    // ignore network errors
  }

  // Fallback phrases — used only when the RPC is unreachable.
  const fallbacks = [
    'Your body knows exactly what to do. Trust it completely.',
    'You are stronger than you know and braver than you feel.',
    'Every day you are growing a miracle. You are extraordinary.',
    'Be gentle with yourself today. You are doing enough.',
    'Your baby feels your love with every heartbeat.',
    'You were made for this. Your instincts are wise.',
    'Rest is productive. Nourishing yourself nourishes your baby.',
    'Your emotions are valid. Growing life is hard and beautiful work.',
    'You are not alone on this journey. You are held and supported.',
    'Every ache and change is your body doing its incredible work.',
    'The love you already feel for your baby is real and powerful.',
    'You are exactly where you are supposed to be right now.',
    'Your body has built a human from scratch. That is extraordinary.',
    'Your baby hears your voice and finds comfort in it.',
    'Take a deep breath. You and your baby are okay.',
    'Trust the process. Your body and your baby are in sync.',
    'You don’t need to be perfect — your baby just needs you.',
    'Today, give yourself credit for every small thing you did right.',
    'You are not falling apart. You are expanding.',
    'You are a miracle carrying a miracle.',
  ]
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000)
  return fallbacks[dayOfYear % fallbacks.length]
}

// ─── Check if already revealed today ─────────────────────────────────────────

async function wasRevealedToday(): Promise<boolean> {
  const today = new Date().toISOString().split('T')[0]
  const val = await AsyncStorage.getItem(`affirmation_revealed_${today}`).catch(() => null)
  return val === '1'
}

async function markRevealedToday(): Promise<void> {
  const today = new Date().toISOString().split('T')[0]
  await AsyncStorage.setItem(`affirmation_revealed_${today}`, '1').catch(() => {})
}

// ─── Particle component ───────────────────────────────────────────────────────

interface ParticleProps {
  color: string
  startX: number
  startY: number
  delay: number
}

function Particle({ color, startX, startY, delay }: ParticleProps) {
  const opacity = useRef(new Animated.Value(0)).current
  const translateX = useRef(new Animated.Value(0)).current
  const translateY = useRef(new Animated.Value(0)).current
  const scale = useRef(new Animated.Value(1)).current

  const angle = Math.random() * Math.PI * 2
  const distance = 30 + Math.random() * 50

  useEffect(() => {
    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.sequence([
          Animated.timing(opacity, { toValue: 1, duration: 100, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 0, duration: 500, useNativeDriver: true, easing: Easing.out(Easing.ease) }),
        ]),
        Animated.timing(translateX, {
          toValue: Math.cos(angle) * distance,
          duration: 600,
          useNativeDriver: true,
          easing: Easing.out(Easing.ease),
        }),
        Animated.timing(translateY, {
          toValue: Math.sin(angle) * distance,
          duration: 600,
          useNativeDriver: true,
          easing: Easing.out(Easing.ease),
        }),
        Animated.timing(scale, {
          toValue: 0.2,
          duration: 600,
          useNativeDriver: true,
          easing: Easing.out(Easing.ease),
        }),
      ]).start()
    }, delay)
    return () => clearTimeout(timer)
  }, [])

  return (
    <Animated.View
      style={[
        styles.particle,
        {
          backgroundColor: color,
          left: startX,
          top: startY,
          opacity,
          transform: [{ translateX }, { translateY }, { scale }],
        },
      ]}
    />
  )
}

// ─── Visual variants — rotated daily ─────────────────────────────────────────

interface Variant {
  paperBg: string
  washColors: [string, string]    // top wash gradient
  accent: string                   // MonoCaps + halo + shadow color
  haloColor: string
  heartFill: string
  starFill: string
  buttonGradient: [string, string]
  inkText: string
  inkMuted: string
}

// Tuple form keeps 50+ variants compact. Each row:
// [paperBg, washColor, accent, halo, heartFill, starFill, btn1, btn2, ink, muted]
type V = [string, string, string, string, string, string, string, string, string, string]

function buildVariants(stickers: ReturnType<typeof useTheme>['stickers']): Variant[] {
  const S = stickers
  const rows: V[] = [
    // ─ Pastel paper backgrounds ─────────────────────────────────────────────
    ['#FFFEF8', S.lilacSoft, S.lilac,    S.lilac,    S.pink,    S.yellow,  '#D9C9F5','#A88EDB','#141313','#6E6763'], // 00 lilac dream
    ['#FFF8F1', S.peach,     '#E07A52',  S.peach,    S.peach,   S.yellow,  '#FFD4B8','#E89F7B','#1A0F08','#7A5B4A'], // 01 peach sunrise
    ['#F6FFF8', S.green,     '#2F7D5C',  S.green,    S.pink,    S.yellow,  '#C9EFD5','#7CC79A','#0F1F16','#557064'], // 02 mint meadow
    ['#FFFDF2', S.yellow,    '#9A7A1F',  S.yellow,   S.pink,    S.lilac,   '#FFF0A8','#E8C964','#1F1A08','#7A6A3F'], // 03 buttercream
    ['#FFF6F8', S.pink,      '#C2547A',  S.pink,    S.pink,     S.yellow,  '#FFD3DF','#EE9CB5','#1F0F14','#7C5564'], // 04 blush rose
    ['#F4FAFF', S.blue,      '#2F6FB0',  S.blue,    S.pink,     S.yellow,  '#CFE3F8','#7FB1E0','#0B1726','#4F6A85'], // 05 sky blue
    ['#FCF6FF', '#E9D6FF',   '#7048B8',  S.lilac,   S.lilac,   S.yellow,   '#E9D6FF','#9C7BD2','#0F0820','#5F4F75'], // 06 violet haze
    ['#F0FBFF', '#C7E8F5',   '#3E8AB0',  S.blue,    S.pink,    S.yellow,   '#D6EDF7','#7FB6CF','#0E1A22','#4D6878'], // 07 ocean glass
    ['#FFF7EC', '#FFD7B0',   '#B85A1E',  S.peach,   S.yellow,   S.pink,    '#FFD7B0','#E08F4F','#1B0F05','#7A5530'], // 08 apricot
    ['#FAFFEC', '#D8EFB0',   '#5A7A2D',  S.green,   S.yellow,   S.peach,   '#E1F2BE','#9ECF63','#16200A','#5F7240'], // 09 sage
    ['#FCEFF7', '#FACBE0',   '#A83C72',  S.pink,    S.lilac,    S.yellow,  '#FACBE0','#D277A0','#220D1A','#7A4862'], // 10 rose petal
    ['#EDFBF6', '#B2EBD3',   '#1F8262',  S.green,   S.pink,     S.yellow,  '#C8EFDD','#6CC4A0','#0A1F18','#406A57'], // 11 jade
    ['#FFF1F1', '#FFC9C9',   '#B0413E',  S.pink,    S.peach,    S.yellow,  '#FFC9C9','#E07F7B','#220D0D','#7A4541'], // 12 cherry blossom
    ['#F1F4FF', '#C8D2FF',   '#3A4DAB',  S.blue,    S.pink,     S.yellow,  '#D6DDFF','#7E90E0','#0B0F26','#4D5980'], // 13 periwinkle
    ['#FFF8DD', '#FFE786',   '#7A5800',  S.yellow,   S.lilac,   S.green,   '#FFEFA6','#E5C44A','#241A03','#7E5F1C'], // 14 honey
    ['#F8F1FF', '#E0CCFF',   '#5C2DAE',  S.lilac,   S.pink,     S.yellow,  '#E0CCFF','#9772D8','#160726','#5C447A'], // 15 amethyst
    ['#FFEFE0', '#FFC79A',   '#A04518',  S.peach,   S.peach,    S.yellow,  '#FFC79A','#DD8847','#220D04','#7A4626'], // 16 terracotta
    ['#EFFCF1', '#B6EDC4',   '#2D7B43',  S.green,   S.pink,     S.yellow,  '#C8EFD0','#6FBF85','#0A1A0F','#4A6E55'], // 17 spring leaf
    ['#FFF6FB', '#FFCBE7',   '#A53A85',  S.pink,    S.lilac,    S.yellow,  '#FFCBE7','#D77BB0','#1F081A','#74446A'], // 18 magnolia
    ['#FAFFE8', '#E0F0A0',   '#5C7220',  S.green,   S.yellow,    S.peach,  '#EAF7B8','#B6CF66','#191F08','#5F702D'], // 19 lemongrass
    ['#FFF1F4', '#FFB8C9',   '#B83A60',  S.pink,    S.pink,     S.yellow,  '#FFB8C9','#E07A99','#22091F','#7A4858'], // 20 watermelon
    ['#F0F8FF', '#B0D6F4',   '#1E5C99',  S.blue,    S.peach,    S.yellow,  '#B0D6F4','#5F9BD4','#091A26','#456680'], // 21 cornflower
    ['#FFFAEC', '#FFE0A0',   '#8C5E10',  S.yellow,   S.peach,   S.lilac,   '#FFEFC9','#E0C26A','#241A05','#7E602A'], // 22 vanilla custard
    ['#F4F0FF', '#D5C5FF',   '#522BA8',  S.lilac,   S.pink,     S.yellow,  '#D5C5FF','#8E72D5','#150826','#544378'], // 23 iris
    ['#FFF7E8', '#F8C870',   '#8C5212',  S.peach,   S.yellow,    S.pink,   '#F8E0A0','#D9A24A','#241804','#7A5C2A'], // 24 amber
    ['#F2FCF2', '#A8E6B8',   '#1F7A38',  S.green,   S.yellow,    S.pink,   '#C5EFCF','#6FBF80','#0A1F12','#4A6E55'], // 25 fern
    ['#FFEEF7', '#FFB8DA',   '#A8327A',  S.pink,    S.yellow,   S.lilac,   '#FFD3E5','#E07AAB','#220A1A','#7A4868'], // 26 hibiscus
    ['#EAF6FF', '#A8D6F2',   '#256BA0',  S.blue,    S.pink,     S.yellow,  '#C8E4F5','#6FA6D0','#0A1A26','#4A6680'], // 27 morning sky
    ['#FFF6E8', '#FFD17A',   '#9C5810',  S.peach,   S.peach,     S.lilac,  '#FFD17A','#DA9540','#241804','#7A5A28'], // 28 marigold
    ['#F8FFEE', '#D6F09A',   '#5A7012',  S.green,   S.peach,     S.pink,   '#E5F5BC','#A6CC5A','#191F05','#5F722A'], // 29 chartreuse
    ['#FFF0F4', '#FFB0C8',   '#B22855',  S.pink,    S.peach,     S.yellow, '#FFB0C8','#DD6F94','#240814','#7A3D58'], // 30 carnation
    ['#F0F8F8', '#A8D6D2',   '#1E6B66',  S.green,   S.pink,      S.yellow, '#C8E4E2','#6FAFA8','#091F1D','#456E68'], // 31 sea foam
    ['#FFF8E0', '#FFE17A',   '#7A5400',  S.yellow,   S.green,    S.pink,   '#FFEFA0','#E0C148','#241A03','#7A5C18'], // 32 mustard light
    ['#F8F4FF', '#C8B4FF',   '#48269A',  S.lilac,   S.pink,      S.yellow, '#D5C4FF','#8870D2','#150626','#544278'], // 33 grape soda
    ['#FFEDE5', '#FFB890',   '#8C3815',  S.peach,    S.peach,    S.yellow, '#FFB890','#D9764A','#220804','#7A3D26'], // 34 papaya
    ['#EEF8E8', '#A8DDA8',   '#1E682D',  S.green,    S.pink,     S.yellow, '#C8E8C8','#6FB07F','#0A1F0F','#456E50'], // 35 grass
    ['#FFF0F8', '#FFC0E5',   '#A82F8A',  S.pink,     S.lilac,    S.yellow, '#FFC0E5','#DD7AB8','#220A1F','#7A446A'], // 36 fairy floss
    ['#EAF2FF', '#B4CCFF',   '#2A4A99',  S.blue,     S.peach,    S.yellow, '#C8DBFF','#6F8FD8','#0A1226','#456080'], // 37 hydrangea
    ['#FFFAE8', '#FFE090',   '#8A5400',  S.yellow,   S.peach,    S.green,  '#FFEAB0','#DDB852','#241A05','#7A5A2C'], // 38 sunbeam
    ['#F6F0FF', '#D6BFFF',   '#5A2DA8',  S.lilac,    S.peach,    S.yellow, '#D6BFFF','#9272D5','#150826','#544378'], // 39 thistle
    ['#FFEEE5', '#FFAA80',   '#8A3008',  S.peach,    S.pink,     S.yellow, '#FFAA80','#D96D40','#220804','#7A3826'], // 40 coral
    ['#F0FBEC', '#BEEDA0',   '#3F7A18',  S.green,    S.lilac,    S.yellow, '#D5F0BD','#88C760','#0F1F08','#506E2C'], // 41 lime sherbet
    ['#FFF6F8', '#FFCAD6',   '#A8385C',  S.pink,     S.peach,    S.yellow, '#FFCAD6','#DD7A95','#220A14','#7A4458'], // 42 cotton candy
    ['#EFF8FF', '#A8D2F2',   '#1E5C99',  S.blue,     S.lilac,    S.yellow, '#C8E4F5','#6FA6D0','#091A26','#456680'], // 43 cyan mist
    ['#FFFAEC', '#FFE5B0',   '#7A4F00',  S.yellow,   S.green,    S.peach,  '#FFE9C0','#E0BC54','#241A05','#7A5C18'], // 44 cream sherbet
    ['#FAF2FF', '#E5D2FF',   '#5C30A8',  S.lilac,    S.green,    S.yellow, '#E5D2FF','#9978D5','#150826','#544378'], // 45 wisteria
    ['#FFF1E8', '#FFCC9A',   '#8C4A1E',  S.peach,    S.lilac,    S.pink,   '#FFCC9A','#DC8E50','#220C04','#7A4626'], // 46 caramel
    ['#F2FBF6', '#B6EDD0',   '#1E7A55',  S.green,    S.pink,     S.peach,  '#C8EFDA','#6FBFA0','#0A1F18','#456E5F'], // 47 eucalyptus
    ['#FFF4FB', '#FFD0EA',   '#A22F7E',  S.pink,     S.yellow,   S.lilac,  '#FFD0EA','#D77BB0','#220A1A','#7A446A'], // 48 lavender rose
    ['#F4F4FF', '#C8C8FF',   '#363696',  S.blue,     S.pink,     S.peach,  '#C8C8FF','#7878D5','#08081F','#404075'], // 49 indigo wash
  ]
  return rows.map(([paperBg, wash, accent, halo, heart, star, b1, b2, ink, muted]) => ({
    paperBg,
    washColors: [wash + 'CC', wash + '00'],
    accent,
    haloColor: halo,
    heartFill: heart,
    starFill: star,
    buttonGradient: [b1, b2],
    inkText: ink,
    inkMuted: muted,
  }))
}

function pickVariantIndex(count: number): number {
  const start = new Date(new Date().getFullYear(), 0, 0).getTime()
  const dayOfYear = Math.floor((Date.now() - start) / 86400000)
  return ((dayOfYear % count) + count) % count
}

// ─── AffirmationRevealCard ────────────────────────────────────────────────────

export function AffirmationRevealCard() {
  const { stickers } = useTheme()
  const variants = buildVariants(stickers)
  const variant = variants[pickVariantIndex(variants.length)]
  const [text, setText] = useState<string | null>(null)
  const [revealed, setRevealed] = useState(false)
  const [showParticles, setShowParticles] = useState(false)
  const [particles, setParticles] = useState<{ id: number; color: string; x: number; y: number; delay: number }[]>([])
  const [shareOpen, setShareOpen] = useState(false)

  const orbScale = useRef(new Animated.Value(1)).current
  const orbOpacity = useRef(new Animated.Value(1)).current
  const textOpacity = useRef(new Animated.Value(0)).current
  const textScale = useRef(new Animated.Value(0.85)).current
  const glowOpacity = useRef(new Animated.Value(0)).current

  // Ambient VFX: pulsing halo + slowly rotating/floating stars
  const haloPulse = useRef(new Animated.Value(0)).current
  const starFloat = useRef(new Animated.Value(0)).current
  const shimmer = useRef(new Animated.Value(0)).current

  // Card always renders as paper (even in dark mode) — variant rotates the palette.
  const paperBg = variant.paperBg
  const inkText = variant.inkText
  const inkMuted = variant.inkMuted
  const accent = variant.accent

  // Continuous ambient animations — halo pulse, star float, shimmer sweep
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(haloPulse, { toValue: 1, duration: 2200, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
        Animated.timing(haloPulse, { toValue: 0, duration: 2200, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
      ]),
    ).start()
    Animated.loop(
      Animated.sequence([
        Animated.timing(starFloat, { toValue: 1, duration: 3200, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
        Animated.timing(starFloat, { toValue: 0, duration: 3200, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
      ]),
    ).start()
    Animated.loop(
      Animated.timing(shimmer, { toValue: 1, duration: 4000, useNativeDriver: true, easing: Easing.linear }),
    ).start()
  }, [])

  useEffect(() => {
    loadDailyAffirmation().then(setText)
    wasRevealedToday().then(alreadyRevealed => {
      if (alreadyRevealed) {
        setRevealed(true)
        orbOpacity.setValue(0)
        textOpacity.setValue(1)
        textScale.setValue(1)
      }
    })
  }, [])

  const handleReveal = async () => {
    if (revealed) return

    // Pulse orb before burst
    Animated.sequence([
      Animated.timing(orbScale, { toValue: 1.3, duration: 200, useNativeDriver: true }),
      Animated.timing(orbScale, { toValue: 0.1, duration: 300, useNativeDriver: true, easing: Easing.in(Easing.ease) }),
    ]).start()

    Animated.timing(orbOpacity, {
      toValue: 0,
      duration: 450,
      useNativeDriver: true,
      easing: Easing.in(Easing.ease),
    }).start()

    // Glow burst
    Animated.sequence([
      Animated.timing(glowOpacity, { toValue: 0.4, duration: 200, useNativeDriver: true }),
      Animated.timing(glowOpacity, { toValue: 0, duration: 400, useNativeDriver: true }),
    ]).start()

    // Generate particles
    const colors2 = [variant.accent, variant.haloColor, variant.heartFill, variant.starFill, stickers.lilac, stickers.peach]
    const newParticles = Array.from({ length: 16 }, (_, i) => ({
      id: i,
      color: colors2[Math.floor(Math.random() * colors2.length)],
      x: 40 + Math.random() * 80,
      y: 10 + Math.random() * 40,
      delay: i * 30,
    }))
    setParticles(newParticles)
    setShowParticles(true)

    // Reveal text after orb disappears
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(textOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.spring(textScale, { toValue: 1, friction: 6, tension: 80, useNativeDriver: true }),
      ]).start()
      setRevealed(true)
      markRevealedToday()
    }, 350)

    // Clean up particles after animation
    setTimeout(() => setShowParticles(false), 1000)
  }

  return (
    <>
    <View style={[styles.card, { backgroundColor: paperBg, borderColor: 'rgba(20,19,19,0.10)', shadowColor: accent }]}>
      {/* Top gradient wash for depth (variant-tinted) */}
      <LinearGradient
        colors={variant.washColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={styles.topWash}
        pointerEvents="none"
      />

      {/* Diagonal shimmer sweep */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.shimmer,
          {
            transform: [
              {
                translateX: shimmer.interpolate({ inputRange: [0, 1], outputRange: [-260, 380] }),
              },
              { rotate: '18deg' },
            ],
          },
        ]}
      >
        <LinearGradient
          colors={['rgba(255,255,255,0)', 'rgba(255,255,255,0.55)', 'rgba(255,255,255,0)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>

      {/* Pulsing halo behind heart */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.heartHalo,
          {
            backgroundColor: variant.haloColor,
            opacity: haloPulse.interpolate({ inputRange: [0, 1], outputRange: [0.18, 0.42] }),
            transform: [{ scale: haloPulse.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1.15] }) }],
          },
        ]}
      />

      {/* Floating heart sticker on the right */}
      <Animated.View
        style={[
          styles.heartSticker,
          {
            transform: [
              { translateY: starFloat.interpolate({ inputRange: [0, 1], outputRange: [0, -6] }) },
              { rotate: starFloat.interpolate({ inputRange: [0, 1], outputRange: ['-4deg', '4deg'] }) },
            ],
          },
        ]}
        pointerEvents="none"
      >
        <HeartSticker size={110} fill={variant.heartFill} stroke="#141313" />
      </Animated.View>

      {/* Decorative floating stars */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.starTopRight,
          {
            transform: [
              { translateY: starFloat.interpolate({ inputRange: [0, 1], outputRange: [0, 4] }) },
              { rotate: starFloat.interpolate({ inputRange: [0, 1], outputRange: ['-8deg', '12deg'] }) },
            ],
          },
        ]}
      >
        <StarSticker size={22} fill={variant.starFill} stroke="#141313" />
      </Animated.View>


      <MonoCaps size={10} color={accent} style={{ marginBottom: 12 }}>
        DAILY AFFIRMATION
      </MonoCaps>

      {/* Glow burst overlay */}
      <Animated.View
        style={[styles.glowBurst, { opacity: glowOpacity, backgroundColor: accent }]}
        pointerEvents="none"
      />

      {/* Particles */}
      {showParticles && particles.map(p => (
        <Particle key={p.id} color={p.color} startX={p.x} startY={p.y} delay={p.delay} />
      ))}

      {!revealed ? (
        <View style={styles.hiddenState}>
          <Body size={14} color={inkMuted} style={styles.hiddenHint}>
            Your daily wisdom awaits...
          </Body>

          <Pressable
            onPress={handleReveal}
            style={({ pressed }) => [
              styles.revealBtn,
              {
                shadowColor: accent,
                opacity: pressed ? 0.92 : 1,
                transform: [{ scale: pressed ? 0.97 : 1 }],
              },
            ]}
          >
            <LinearGradient
              colors={variant.buttonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <Text style={[styles.revealBtnText, { color: '#1A1030' }]}>Reveal today's  →</Text>
          </Pressable>
        </View>
      ) : (
        <Animated.View style={[styles.revealedState, { opacity: textOpacity, transform: [{ scale: textScale }] }]}>
          <Text style={[styles.affirmationText, { color: inkText }]}>
            {text ?? '...'}
          </Text>
          <Body size={11} color={inkMuted} style={{ marginTop: 10 }}>
            Come back tomorrow for a new affirmation
          </Body>
          {text ? (
            <Pressable
              onPress={() => setShareOpen(true)}
              style={({ pressed }) => [
                styles.shareBtn,
                {
                  shadowColor: accent,
                  opacity: pressed ? 0.92 : 1,
                  transform: [{ scale: pressed ? 0.97 : 1 }],
                },
              ]}
            >
              <LinearGradient
                colors={variant.buttonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
              <Text style={[styles.shareBtnText, { color: '#1A1030' }]}>Share ↗</Text>
            </Pressable>
          ) : null}
        </Animated.View>
      )}
    </View>
    <AffirmationShareModal
      visible={shareOpen}
      phrase={text ?? ''}
      mode="pregnancy"
      onClose={() => setShareOpen(false)}
    />
    </>
  )
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 28,
    padding: 22,
    borderWidth: 1,
    overflow: 'hidden',
    minHeight: 160,
    position: 'relative',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.22,
    shadowRadius: 22,
    elevation: 8,
  },

  topWash: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 120,
  },

  shimmer: {
    position: 'absolute',
    top: -40,
    left: 0,
    width: 110,
    height: 260,
  },

  heartHalo: {
    position: 'absolute',
    right: -40,
    bottom: -40,
    width: 180,
    height: 180,
    borderRadius: 90,
  },

  starTopRight: {
    position: 'absolute',
    top: 14,
    right: 20,
  },

  heartSticker: {
    position: 'absolute',
    right: -18,
    bottom: -18,
    opacity: 0.95,
  },

  glowBurst: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 28,
  },

  particle: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
  },

  hiddenState: { gap: 14, paddingBottom: 4 },
  hiddenHint: {
    fontFamily: 'Fraunces_600SemiBold',
    fontSize: 20,
    lineHeight: 26,
    letterSpacing: -0.3,
  },
  revealBtn: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 20,
    paddingVertical: 11,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 14,
    elevation: 6,
  },
  revealBtnText: {
    fontSize: 13,
    fontFamily: 'DMSans_700Bold',
    letterSpacing: 0.2,
  },

  revealedState: { gap: 6, paddingRight: 60 },
  affirmationText: {
    fontSize: 22,
    fontFamily: 'Fraunces_600SemiBold',
    lineHeight: 28,
    letterSpacing: -0.4,
  },
  shareBtn: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 20,
    paddingVertical: 11,
    marginTop: 14,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 14,
    elevation: 6,
  },
  shareBtnText: {
    fontSize: 13,
    fontFamily: 'DMSans_700Bold',
    letterSpacing: 0.2,
  },
})
