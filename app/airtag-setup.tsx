import { useMemo } from 'react'
import { View, Text, Pressable, StyleSheet } from 'react-native'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { PaperCard } from '../components/ui/PaperCard'
import { PillButton } from '../components/ui/PillButton'
import { typography, spacing, useTheme } from '../constants/theme'
import { useTranslation } from '../lib/i18n'
import { MissingStickers } from '../components/stickers/MissingStickers'

export default function AirTagSetup() {
  const insets = useSafeAreaInsets()
  const { colors } = useTheme()
  const { t } = useTranslation()
  const styles = useMemo(() => StyleSheet.create({
    container: {
      flex: 1,
      paddingHorizontal: spacing['2xl'],
    },
    closeBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.surfaceGlass,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: colors.border,
      alignSelf: 'flex-end',
    },
    hero: {
      alignItems: 'center',
      marginTop: 20,
      marginBottom: 32,
    },
    iconCircle: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: colors.primaryTint,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 20,
    },
    title: {
      ...typography.heading,
      marginBottom: 8,
    },
    subtitle: {
      ...typography.bodySecondary,
      textAlign: 'center',
      lineHeight: 22,
      paddingHorizontal: 16,
    },
    steps: {
      gap: 10,
    },
    step: {
      // no extra padding needed
    },
    stepRow: {
      flexDirection: 'row',
      gap: 14,
      alignItems: 'flex-start',
    },
    stepNumber: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: colors.accent,
      alignItems: 'center',
      justifyContent: 'center',
    },
    stepNumberText: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.textInverse,
    },
    stepContent: {
      flex: 1,
    },
    stepTitle: {
      fontSize: 15,
      fontWeight: '700',
      color: colors.text,
      marginBottom: 3,
    },
    stepText: {
      fontSize: 13,
      color: colors.textSecondary,
      lineHeight: 18,
    },
    bottom: {
      marginTop: 'auto',
      gap: 12,
    },
    note: {
      fontSize: 11,
      color: colors.textMuted,
      textAlign: 'center',
      lineHeight: 16,
    },
  }), [colors])

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={[styles.container, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 24 }]}>
        <Pressable onPress={() => router.back()} style={styles.closeBtn}>
          <Ionicons name="close" size={22} color={colors.text} />
        </Pressable>

        <View style={styles.hero}>
          <MissingStickers.AirtagHero size={120} />
          <Text style={styles.title}>{t('airtag_title')}</Text>
          <Text style={styles.subtitle}>
            {t('airtag_subtitle')}
          </Text>
        </View>

        <View style={styles.steps}>
          <PaperCard radius={28} padding={20} style={styles.step}>
            <View style={styles.stepRow}>
              <MissingStickers.AirtagStepAttach size={48} />
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>{t('airtag_step1_title')}</Text>
                <Text style={styles.stepText}>
                  {t('airtag_step1_text')}
                </Text>
              </View>
            </View>
          </PaperCard>

          <PaperCard radius={28} padding={20} style={styles.step}>
            <View style={styles.stepRow}>
              <MissingStickers.AirtagStepPair size={48} />
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>{t('airtag_step2_title')}</Text>
                <Text style={styles.stepText}>
                  {t('airtag_step2_text')}
                </Text>
              </View>
            </View>
          </PaperCard>

          <PaperCard radius={28} padding={20} style={styles.step}>
            <View style={styles.stepRow}>
              <MissingStickers.AirtagStepDone size={48} />
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>{t('airtag_step3_title')}</Text>
                <Text style={styles.stepText}>
                  {t('airtag_step3_text')}
                </Text>
              </View>
            </View>
          </PaperCard>
        </View>

        <View style={styles.bottom}>
          <PillButton
            label="Enable Location Tracking"
            variant="ink"
            height={72}
            onPress={() => {
              router.back()
            }}
          />
          <Text style={styles.note}>
            {t('airtag_note')}
          </Text>
        </View>
      </View>
    </View>
  )
}
