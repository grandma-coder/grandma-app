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
import { useTheme, brand } from '../../../constants/theme'
import { supabase } from '../../../lib/supabase'

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
  const { colors } = useTheme()
  const [text, setText] = useState<string | null>(null)
  const [revealed, setRevealed] = useState(false)
  const [showParticles, setShowParticles] = useState(false)
  const [particles, setParticles] = useState<{ id: number; color: string; x: number; y: number; delay: number }[]>([])

  const orbScale = useRef(new Animated.Value(1)).current
  const orbOpacity = useRef(new Animated.Value(1)).current
  const textOpacity = useRef(new Animated.Value(0)).current
  const textScale = useRef(new Animated.Value(0.85)).current
  const glowOpacity = useRef(new Animated.Value(0)).current

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
      Animated.timing(glowOpacity, { toValue: 0.6, duration: 200, useNativeDriver: true }),
      Animated.timing(glowOpacity, { toValue: 0, duration: 400, useNativeDriver: true }),
    ]).start()

    // Generate particles
    const colors2 = [brand.pregnancy, '#FFD700', '#FF8AD8', '#A2FF86', '#FFFFFF', '#6AABF7']
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
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: 'rgba(185,131,255,0.2)' }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 16 }}>
        <Text style={{ fontSize: 11 }}>✨</Text>
        <Text style={[styles.cardLabel, { color: colors.textMuted, marginBottom: 0 }]}>TODAY'S AFFIRMATION</Text>
      </View>

      {/* Glow burst overlay */}
      <Animated.View
        style={[styles.glowBurst, { opacity: glowOpacity }]}
        pointerEvents="none"
      />

      {/* Particles */}
      {showParticles && particles.map(p => (
        <Particle key={p.id} color={p.color} startX={p.x} startY={p.y} delay={p.delay} />
      ))}

      {!revealed ? (
        <View style={styles.hiddenState}>
          {/* Orb */}
          <Animated.Text
            style={[{ fontSize: 40 }, { opacity: orbOpacity, transform: [{ scale: orbScale }] }]}
          >
            🔮
          </Animated.Text>

          <Text style={[styles.hiddenHint, { color: colors.textMuted }]}>
            Your daily wisdom awaits...
          </Text>

          <Pressable
            onPress={handleReveal}
            style={({ pressed }) => [styles.revealBtn, { opacity: pressed ? 0.8 : 1 }]}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={{ fontSize: 13 }}>✨</Text>
              <Text style={styles.revealBtnText}>Reveal Today's Wisdom</Text>
            </View>
          </Pressable>
        </View>
      ) : (
        <Animated.View style={[styles.revealedState, { opacity: textOpacity, transform: [{ scale: textScale }] }]}>
          <Text style={[styles.affirmationText, { color: colors.text }]}>
            "{text ?? '...'}"
          </Text>
          <Text style={[styles.revealedHint, { color: colors.textMuted }]}>
            Come back tomorrow for a new affirmation
          </Text>
        </Animated.View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    overflow: 'hidden',
    minHeight: 140,
    position: 'relative',
  },
  cardLabel: {
    fontSize: 11,
    fontFamily: 'Satoshi-Variable',
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 16,
  },

  glowBurst: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: brand.pregnancy,
    borderRadius: 24,
  },

  particle: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
  },

  hiddenState: { alignItems: 'center', gap: 10, paddingBottom: 4 },
  orb: { fontSize: 40 },
  hiddenHint: {
    fontSize: 13,
    fontFamily: 'Satoshi-Variable',
    fontStyle: 'italic',
  },
  revealBtn: {
    backgroundColor: brand.pregnancy,
    borderRadius: 999,
    paddingHorizontal: 24,
    paddingVertical: 10,
    shadowColor: brand.pregnancy,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
    marginTop: 4,
  },
  revealBtnText: {
    fontSize: 13,
    fontFamily: 'Satoshi-Variable',
    fontWeight: '700',
    color: '#FFFFFF',
  },

  revealedState: { gap: 10 },
  affirmationText: {
    fontSize: 16,
    fontFamily: 'Satoshi-Variable',
    fontWeight: '500',
    lineHeight: 24,
    fontStyle: 'italic',
  },
  revealedHint: {
    fontSize: 11,
    fontFamily: 'Satoshi-Variable',
    marginTop: 4,
  },
})
