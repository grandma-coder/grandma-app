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

  // Fallback phrases
  const fallbacks = [
    'Your body knows exactly what to do. Trust it completely.',
    'You are stronger than you know and braver than you feel.',
    'Every day you are growing a miracle. You are extraordinary.',
    'Be gentle with yourself today. You are doing enough.',
    'Your baby feels your love with every heartbeat.',
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

// ─── AffirmationRevealCard ────────────────────────────────────────────────────

export function AffirmationRevealCard() {
  const { stickers } = useTheme()
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

  // Card always renders as cream paper (even in dark mode) — the "paper pop" pattern.
  const paperBg = '#FFFEF8'
  const inkText = '#141313'
  const inkMuted = '#6E6763'
  const lilac = stickers.lilac
  const lilacSoft = stickers.lilacSoft

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
    const colors2 = [stickers.lilac, stickers.yellow, stickers.pink, stickers.green, stickers.peach, stickers.blue]
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
    <View style={[styles.card, { backgroundColor: paperBg, borderColor: 'rgba(20,19,19,0.10)', shadowColor: lilac }]}>
      {/* Top lilac gradient wash for depth */}
      <LinearGradient
        colors={[lilacSoft + 'CC', lilacSoft + '00']}
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
            backgroundColor: lilac,
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
        <HeartSticker size={110} fill={stickers.pink} stroke="#141313" />
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
        <StarSticker size={22} fill={stickers.yellow} stroke="#141313" />
      </Animated.View>


      <MonoCaps size={10} color={lilac} style={{ marginBottom: 12 }}>
        DAILY AFFIRMATION
      </MonoCaps>

      {/* Glow burst overlay */}
      <Animated.View
        style={[styles.glowBurst, { opacity: glowOpacity, backgroundColor: lilac }]}
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
                shadowColor: lilac,
                opacity: pressed ? 0.92 : 1,
                transform: [{ scale: pressed ? 0.97 : 1 }],
              },
            ]}
          >
            <LinearGradient
              colors={['#D9C9F5', '#A88EDB']}
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
                  shadowColor: lilac,
                  opacity: pressed ? 0.92 : 1,
                  transform: [{ scale: pressed ? 0.97 : 1 }],
                },
              ]}
            >
              <LinearGradient
                colors={['#D9C9F5', '#A88EDB']}
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
