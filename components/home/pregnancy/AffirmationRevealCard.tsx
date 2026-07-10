import React, { useRef, useState, useEffect } from 'react'
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Animated,
} from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { ArrowUpRight } from 'lucide-react-native'
import { useTheme, font, diffuseFont, useDiffuseTheme, getDiffuseAccent } from '../../../constants/theme'
import { useIsDiffuse } from '../../ui/diffuse/DiffuseKit'
import { MonoCaps } from '../../ui/Typography'
import { supabase } from '../../../lib/supabase'
import { toDateStr } from '../../../lib/cycleLogic'
import { useTranslation } from '../../../lib/i18n'
import { AffirmationShareModal } from './AffirmationShareModal'

// ─── Fetch daily affirmation from Supabase ────────────────────────────────────

async function loadDailyAffirmation(): Promise<string> {
  const today = toDateStr(new Date())
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

// ─── Reveal persistence ──────────────────────────────────────────────────────

async function wasRevealedToday(): Promise<boolean> {
  const today = toDateStr(new Date())
  const val = await AsyncStorage.getItem(`affirmation_revealed_${today}`).catch(() => null)
  return val === '1'
}

async function markRevealedToday(): Promise<void> {
  const today = toDateStr(new Date())
  await AsyncStorage.setItem(`affirmation_revealed_${today}`, '1').catch(() => {})
}

// ─── AffirmationRevealCard ────────────────────────────────────────────────────
//
// Editorial, card-less daily affirmation. The phrase is set large in the
// display serif directly on the cream canvas — no card chrome, no stickers.
// Tap "Reveal today's" to unveil; a quiet "Share" link sits underneath.

export function AffirmationRevealCard() {
  const { colors, stickers, isDark } = useTheme()
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
  const { t } = useTranslation()
  // Warm, muted ink for the revealed phrase — soft coral on cream, brighter
  // peach in dark mode so the italic line stays delicate but legible. Under
  // Diffuse the phrase takes the pregnancy accent (warm plum).
  const phraseInk = diffuse ? getDiffuseAccent('preg', dt.isDark) : (isDark ? stickers.peach : stickers.coral)
  // Resolve the neutral inks/fonts by variant so JSX below stays single-path.
  const labelColor = diffuse ? dt.colors.ink3 : colors.textMuted
  const mutedColor = diffuse ? dt.colors.ink3 : colors.textMuted
  const strongColor = diffuse ? dt.colors.ink : colors.text
  const phraseFont = diffuse ? diffuseFont.italic : font.italic
  const affordanceFont = diffuse ? diffuseFont.mono : font.bodySemiBold
  const [text, setText] = useState<string | null>(null)
  const [revealed, setRevealed] = useState(false)
  const [shareOpen, setShareOpen] = useState(false)

  const textOpacity = useRef(new Animated.Value(0)).current
  const textTranslate = useRef(new Animated.Value(8)).current

  useEffect(() => {
    loadDailyAffirmation().then(setText)
    wasRevealedToday().then(alreadyRevealed => {
      if (alreadyRevealed) {
        setRevealed(true)
        textOpacity.setValue(1)
        textTranslate.setValue(0)
      }
    })
  }, [])

  const handleReveal = () => {
    if (revealed) return
    Animated.parallel([
      Animated.timing(textOpacity, { toValue: 1, duration: 450, useNativeDriver: true }),
      Animated.spring(textTranslate, { toValue: 0, friction: 7, tension: 70, useNativeDriver: true }),
    ]).start()
    setRevealed(true)
    markRevealedToday()
  }

  return (
    <>
      <View style={styles.wrap}>
        {diffuse ? (
          <Text style={[styles.diffuseLabel, { color: labelColor }]}>
            {t('pregnancy_dailyAffirmation')}
          </Text>
        ) : (
          <MonoCaps size={10} color={colors.textMuted} style={{ marginBottom: 12 }}>
            {t('pregnancy_dailyAffirmation')}
          </MonoCaps>
        )}

        {!revealed ? (
          <Pressable onPress={handleReveal} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}>
            <Text style={[styles.phrase, { color: mutedColor, fontFamily: phraseFont }]}>
              {t('pregnancy_affirmationAwaits')}
            </Text>
            <View style={styles.revealRow}>
              <Text style={[styles.revealText, { color: strongColor, fontFamily: affordanceFont }]}>{t('pregnancy_revealToday')}</Text>
              <ArrowUpRight size={16} color={strongColor} strokeWidth={2.5} />
            </View>
          </Pressable>
        ) : (
          <Animated.View
            style={{ opacity: textOpacity, transform: [{ translateY: textTranslate }] }}
          >
            <Text style={[styles.phrase, { color: phraseInk, fontFamily: phraseFont }]}>
              {text ? text.toLowerCase() : '…'}
            </Text>
            {text ? (
              <Pressable
                onPress={() => setShareOpen(true)}
                style={({ pressed }) => [styles.shareLink, { opacity: pressed ? 0.6 : 1 }]}
              >
                <Text style={[styles.shareText, { color: mutedColor, fontFamily: affordanceFont }]}>
                  {t('pregnancy_share')}
                </Text>
                <ArrowUpRight size={14} color={mutedColor} strokeWidth={2.5} />
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
  wrap: {
    paddingVertical: 4,
  },
  phrase: {
    fontFamily: font.italic,
    fontSize: 30,
    lineHeight: 37,
    letterSpacing: -0.2,
  },
  revealRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 14,
  },
  revealText: {
    fontFamily: font.bodySemiBold,
    fontSize: 14,
    letterSpacing: 0.2,
  },
  shareLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 16,
  },
  shareText: {
    fontSize: 12,
    letterSpacing: 0.8,
  },
  diffuseLabel: {
    fontFamily: diffuseFont.mono,
    fontSize: 10,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
})
