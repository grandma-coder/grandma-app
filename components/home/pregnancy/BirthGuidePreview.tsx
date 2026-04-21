/**
 * BirthGuidePreview — collapsible birth-guide cards inline on pregnancy home.
 *
 * Mirrors the Birth Guide tab from the Insights screen but lives on home so
 * users don't have to navigate away. Includes warning-signs alert + 5 stages.
 */

import React, { useState } from 'react'
import { View, Text, Pressable, StyleSheet } from 'react-native'
import { ChevronDown, ChevronUp } from 'lucide-react-native'
import { router } from 'expo-router'
import { useTheme, THEME_COLORS } from '../../../constants/theme'
import { PaperCard } from '../../ui/PaperCard'
import { Body, MonoCaps } from '../../ui/Typography'
import {
  NotifyHealthAlert, LogBirthPrep, LogContraction, FirstKick,
  LogUltrasound, PillarPostpartumPrep,
} from '../../stickers/RewardStickers'

type StickerFn = (props: { size?: number; fill?: string; stroke?: string }) => React.ReactElement

interface BirthStage {
  id: string
  Sticker: StickerFn
  accent: string
  tint: keyof ReturnType<typeof useTheme>['stickers']
  title: string
  content: string[]
}

const WARNING_SIGNS = [
  'Water breaks before week 37',
  'Heavy or unusual bleeding',
  'Baby not moving for 2+ hours (week 28+)',
  'Severe headache + vision changes',
  'Fever above 38°C (100.4°F)',
]

const STAGES: BirthStage[] = [
  {
    id: 'early_labor',
    Sticker: LogBirthPrep,
    accent: '#A2FF86',
    tint: 'greenSoft',
    title: 'Early signs & latent labor',
    content: [
      'Cervix dilates from 0–6cm. Contractions are irregular and mild (5–30 min apart).',
      'Stay home: rest, eat lightly, time contractions, keep busy.',
      'Partner role: emotional support, back massage, prepare the hospital bag.',
      'Most first labors: latent phase lasts 6–12 hours. Stay patient.',
    ],
  },
  {
    id: 'active_labor',
    Sticker: LogContraction,
    accent: '#B983FF',
    tint: 'lilacSoft',
    title: 'Active labor',
    content: [
      'Cervix 6–10cm. Contractions every 3–5 min, lasting 60–90 sec, very intense.',
      '5-1-1 rule: contractions every 5 min, lasting 1 min, for 1 hour → go to hospital.',
      'Pain relief options: epidural, gas and air, water, hypnobirthing, movement.',
      'Partner role: breathing cues, position changes, advocate with staff.',
    ],
  },
  {
    id: 'transition',
    Sticker: NotifyHealthAlert,
    accent: '#FBBF24',
    tint: 'yellowSoft',
    title: 'Transition & pushing',
    content: [
      'Fully dilated (10cm). The hardest but shortest phase — usually 15–60 min.',
      'Contractions are 2–3 min apart. Intense pressure, shaking, nausea are normal.',
      'Pushing techniques: directed pushing vs. breathing down. Ask your midwife.',
      'You can do this. Every contraction brings your baby closer.',
    ],
  },
  {
    id: 'birth',
    Sticker: FirstKick,
    accent: '#6AABF7',
    tint: 'blueSoft',
    title: 'Birth & golden hour',
    content: [
      "Skin-to-skin immediately: regulates baby's temperature, heart rate, breathing.",
      'Delayed cord clamping (1–3 min): transfers 80–100mL of blood = important iron.',
      'First breastfeed in the golden hour: colostrum is liquid gold.',
      'Placenta delivery: 5–30 min after birth. Active or physiological management.',
    ],
  },
  {
    id: 'postpartum',
    Sticker: PillarPostpartumPrep,
    accent: '#FF8AD8',
    tint: 'pinkSoft',
    title: 'Recovery & postpartum',
    content: [
      'Lochia (postpartum bleeding): red 3–4 days, pink/brown 2 weeks, creamy to week 6.',
      'Baby blues: days 3–5 as hormones crash. Normal.',
      'PPD: persistent sadness >2 weeks → seek help. Screening at 6-week checkup.',
      'Rest, nourishment, and connection are the only priorities right now.',
    ],
  },
]

export function BirthGuidePreview() {
  const { colors, stickers } = useTheme()
  const [openId, setOpenId] = useState<string | null>(null)

  const toggle = (id: string) => setOpenId((prev) => (prev === id ? null : id))

  return (
    <View style={styles.root}>
      {/* Warning card — always visible, flat */}
      <PaperCard
        tint={THEME_COLORS.orange + '14'}
        borderColor={THEME_COLORS.orange + '44'}
        radius={20}
        padding={16}
        flat
        style={{ marginBottom: 10 }}
      >
        <View style={styles.warnHeader}>
          <NotifyHealthAlert size={26} />
          <Text style={[styles.warnTitle, { color: THEME_COLORS.orange }]}>
            Call your provider or go to hospital if:
          </Text>
        </View>
        {WARNING_SIGNS.map((sign, i) => (
          <Text key={i} style={[styles.warnItem, { color: THEME_COLORS.orange }]}>• {sign}</Text>
        ))}
      </PaperCard>

      {STAGES.map((stage) => {
        const isOpen = openId === stage.id
        const tint = stickers[stage.tint]
        return (
          <View key={stage.id} style={{ marginBottom: 10 }}>
            <Pressable onPress={() => toggle(stage.id)}>
              <PaperCard tint={tint} radius={20} padding={14} flat style={styles.header}>
                <View style={styles.iconWrap}>
                  <stage.Sticker size={32} />
                </View>
                <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
                  {stage.title}
                </Text>
                {isOpen
                  ? <ChevronUp size={16} color={stage.accent} strokeWidth={2.5} />
                  : <ChevronDown size={16} color={stage.accent} strokeWidth={2.5} />}
              </PaperCard>
            </Pressable>

            {isOpen && (
              <PaperCard
                radius={16}
                padding={16}
                flat
                style={[styles.body, { borderColor: stage.accent + '30' }]}
              >
                {stage.content.map((line, i) => (
                  <View key={i} style={styles.bulletRow}>
                    <View style={[styles.bulletDot, { backgroundColor: stage.accent }]} />
                    <Body size={13} color={colors.textSecondary} style={{ flex: 1, lineHeight: 19 }}>
                      {line}
                    </Body>
                  </View>
                ))}
                <Pressable
                  onPress={() => router.push('/grandma-talk')}
                  style={[styles.askBtn, { borderColor: stage.accent + '55' }]}
                >
                  <Text style={[styles.askBtnText, { color: stage.accent }]}>
                    Ask Grandma about {stage.title.toLowerCase()}
                  </Text>
                </Pressable>
              </PaperCard>
            )}
          </View>
        )
      })}

      {/* Full guide link */}
      <Pressable onPress={() => router.push('/insights')} style={styles.fullLink}>
        <MonoCaps size={10} color={colors.textMuted}>OPEN FULL BIRTH GUIDE →</MonoCaps>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { gap: 0 },

  warnHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  warnTitle: { fontSize: 14, fontFamily: 'DMSans_600SemiBold', flex: 1 },
  warnItem: { fontSize: 13, fontFamily: 'DMSans_400Regular', lineHeight: 20 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconWrap: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, fontSize: 14, fontFamily: 'DMSans_600SemiBold' },

  body: {
    marginTop: -6,
    borderTopWidth: 0,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    paddingTop: 14,
    gap: 8,
  },
  bulletRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 2 },
  bulletDot: { width: 6, height: 6, borderRadius: 3, marginTop: 7 },

  askBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 10,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
  },
  askBtnText: { fontSize: 12, fontFamily: 'DMSans_600SemiBold' },

  fullLink: { alignItems: 'center', paddingVertical: 10, marginTop: 4 },
})
