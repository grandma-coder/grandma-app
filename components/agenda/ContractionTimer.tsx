import { useState, useRef, useEffect, useMemo } from 'react'
import { View, Text, Pressable, StyleSheet, Alert } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { PaperCard } from '../ui/PaperCard'
import { useTheme } from '../../constants/theme'

type ThemeShape = ReturnType<typeof useTheme>
import { supabase } from '../../lib/supabase'
import { toDateStr } from '../../lib/cycleLogic'
import { queryClient } from '../../lib/queryClient'
import { useTranslation } from '../../lib/i18n'

interface Contraction {
  start: number
  end?: number
}

interface ContractionTimerProps {
  onSave?: (contractions: { durationSeconds: number; intervalSeconds: number }[]) => void
}

function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000)
  const m = Math.floor(totalSeconds / 60)
  const s = totalSeconds % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export function ContractionTimer({ onSave }: ContractionTimerProps) {
  const theme = useTheme()
  const { colors, stickers, font, radius } = theme
  const styles = useMemo(() => makeStyles(theme), [theme])
  const { t } = useTranslation()

  const [contractions, setContractions] = useState<Contraction[]>([])
  const [isActive, setIsActive] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [saving, setSaving] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const startTimeRef = useRef(0)

  useEffect(() => {
    if (isActive) {
      startTimeRef.current = Date.now() - elapsed
      intervalRef.current = setInterval(() => {
        setElapsed(Date.now() - startTimeRef.current)
      }, 100)
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [isActive])

  async function persistContraction(durationSeconds: number, intervalSeconds: number) {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      const { error } = await supabase.from('pregnancy_logs').insert({
        user_id: session.user.id,
        log_date: toDateStr(new Date()),
        log_type: 'contraction',
        value: durationSeconds.toString(),
        notes: JSON.stringify({ intervalSeconds }),
      })
      if (error) {
        Alert.alert(t('common_saveFailed'), t('contractionTimer_notSaved', { message: error.message }))
        return
      }
      queryClient.invalidateQueries({ queryKey: ['pregnancy-week-logs'] })
      queryClient.invalidateQueries({ queryKey: ['pregnancy-today-logs'] })
    } catch (e: any) {
      Alert.alert(t('common_saveFailed'), e?.message ?? t('contractionTimer_couldNotSave'))
    }
  }

  function handlePress() {
    if (!isActive) {
      setIsActive(true)
      setElapsed(0)
      setContractions((prev) => [...prev, { start: Date.now() }])
    } else {
      setIsActive(false)
      if (intervalRef.current) clearInterval(intervalRef.current)
      const endTs = Date.now()
      setContractions((prev) => {
        const updated = [...prev]
        const last = updated[updated.length - 1]
        if (last && !last.end) {
          updated[updated.length - 1] = { ...last, end: endTs }
          const durationSeconds = Math.round((endTs - last.start) / 1000)
          const prevCompleted = updated.slice(0, -1).filter((c) => c.end)
          const prevEnd = prevCompleted.length > 0 ? prevCompleted[prevCompleted.length - 1].end! : null
          const intervalSeconds = prevEnd ? Math.round((last.start - prevEnd) / 1000) : 0
          persistContraction(durationSeconds, intervalSeconds)
        }
        return updated
      })
      setElapsed(0)
    }
  }

  async function handleSaveSession() {
    if (!onSave || saving) return
    const completed = contractions.filter((c) => c.end)
    if (completed.length === 0) return
    setSaving(true)
    try {
      const payload = completed.map((c, i) => {
        const durationSeconds = Math.round((c.end! - c.start) / 1000)
        const prev = completed[i - 1]
        const intervalSeconds = prev ? Math.round((c.start - prev.end!) / 1000) : 0
        return { durationSeconds, intervalSeconds }
      })
      onSave(payload)
    } finally {
      setSaving(false)
    }
  }

  function handleReset() {
    setIsActive(false)
    if (intervalRef.current) clearInterval(intervalRef.current)
    setContractions([])
    setElapsed(0)
  }

  const completedContractions = contractions.filter((c) => c.end)
  const intervals: { duration: number; interval: number }[] = []
  for (let i = 0; i < completedContractions.length; i++) {
    const c = completedContractions[i]
    const duration = (c.end! - c.start) / 1000
    const interval = i > 0 ? (c.start - completedContractions[i - 1].end!) / 1000 : 0
    intervals.push({ duration, interval })
  }

  const avgInterval = intervals.length > 1
    ? intervals.slice(1).reduce((sum, i) => sum + i.interval, 0) / (intervals.length - 1)
    : 0
  const avgDuration = intervals.length > 0
    ? intervals.reduce((sum, i) => sum + i.duration, 0) / intervals.length
    : 0
  const isActiveLabor = avgInterval > 0 && avgInterval <= 300 && avgDuration >= 45

  return (
    <View style={styles.container}>
      <PaperCard radius={radius.lg} padding={20} style={styles.mainCard}>
        <Text style={styles.title}>{t('preg_contractions_title')}</Text>
        <Text style={styles.subtitle}>
          {t('preg_contractions_subtitle')}
        </Text>

        <Text style={styles.timer}>{formatTime(elapsed)}</Text>
        <Text style={styles.timerLabel}>
          {isActive ? t('preg_contractions_inProgress') : t('preg_contractions_ready')}
        </Text>

        <Pressable
          onPress={handlePress}
          style={({ pressed }) => [
            styles.mainButton,
            isActive && { backgroundColor: stickers.coral },
            pressed && { transform: [{ scale: 0.95 }] },
          ]}
          accessibilityRole="button"
          accessibilityLabel={isActive ? t('contractionTimer_a11yEnd') : t('contractionTimer_a11yStart')}
        >
          <Ionicons
            name={isActive ? 'stop' : 'play'}
            size={32}
            color={colors.textInverse}
          />
          <Text style={styles.mainButtonText}>
            {isActive ? t('preg_contractions_ended') : t('preg_contractions_started')}
          </Text>
        </Pressable>

        {isActiveLabor && (
          <View style={styles.alertBanner}>
            <Ionicons name="alert-circle" size={20} color={stickers.coral} />
            <Text style={styles.alertText}>
              {t('preg_contractions_alert511')}
            </Text>
          </View>
        )}

        {intervals.length > 0 && (
          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{completedContractions.length}</Text>
              <Text style={styles.statLabel}>{t('preg_contractions_total')}</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>
                {avgDuration > 0 ? `${Math.round(avgDuration)}s` : '--'}
              </Text>
              <Text style={styles.statLabel}>{t('preg_contractions_avgDuration')}</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>
                {avgInterval > 0 ? `${Math.round(avgInterval / 60)}m` : '--'}
              </Text>
              <Text style={styles.statLabel}>{t('preg_contractions_avgInterval')}</Text>
            </View>
          </View>
        )}

        {contractions.length > 0 && !isActive && (
          <View style={styles.sessionControls}>
            {onSave && (
              <Pressable
                onPress={handleSaveSession}
                disabled={saving}
                style={[styles.saveButton, saving && { opacity: 0.5 }]}
                accessibilityRole="button"
                accessibilityLabel={t('contractionTimer_a11ySaveSession')}
              >
                <Text style={styles.saveButtonText}>{saving ? t('preg_contractions_saving') : t('preg_contractions_saveSession')}</Text>
              </Pressable>
            )}
            <Pressable
              onPress={handleReset}
              style={styles.resetButton}
              accessibilityRole="button"
              accessibilityLabel={t('contractionTimer_a11yReset')}
            >
              <Text style={styles.resetText}>{t('preg_contractions_reset')}</Text>
            </Pressable>
          </View>
        )}
      </PaperCard>

      {intervals.length > 0 && (
        <View>
          <Text style={styles.sectionLabel}>{t('preg_contractions_thisSession')}</Text>
          {intervals.map((item, i) => (
            <PaperCard radius={radius.lg} padding={20} key={i} style={styles.historyCard}>
              <View style={styles.historyRow}>
                <Text style={styles.historyNum}>#{i + 1}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.historyDuration}>
                    {t('preg_contractions_durationSeconds', { seconds: Math.round(item.duration) })}
                  </Text>
                  {item.interval > 0 && (
                    <Text style={styles.historyInterval}>
                      {t('preg_contractions_intervalApart', {
                        minutes: Math.round(item.interval / 60),
                        seconds: Math.round(item.interval % 60),
                      })}
                    </Text>
                  )}
                </View>
              </View>
            </PaperCard>
          ))}
        </View>
      )}

      <PaperCard radius={radius.lg} padding={20} style={styles.infoCard}>
        <Ionicons name="information-circle-outline" size={20} color={stickers.blue} />
        <Text style={styles.infoText}>
          {t('preg_contractions_rule511')}
        </Text>
      </PaperCard>
    </View>
  )
}

function makeStyles({ colors, stickers, font, radius }: ThemeShape) {
  return StyleSheet.create({
    container: {},
    mainCard: {
      alignItems: 'center',
      marginBottom: 24,
    },
    title: {
      fontSize: 20,
      fontWeight: '900',
      color: colors.text,
      letterSpacing: 2,
      marginBottom: 4,
      fontFamily: font.bodySemiBold,
    },
    subtitle: {
      fontSize: 12,
      color: colors.textMuted,
      marginBottom: 24,
      textAlign: 'center',
      fontFamily: font.body,
    },
    timer: {
      fontSize: 64,
      fontWeight: '900',
      color: colors.text,
      letterSpacing: 2,
      fontFamily: font.display,
    },
    timerLabel: {
      fontSize: 10,
      fontWeight: '800',
      color: colors.textMuted,
      letterSpacing: 2,
      marginBottom: 24,
      fontFamily: font.bodySemiBold,
    },
    mainButton: {
      width: '100%',
      height: 64,
      borderRadius: radius.full,
      backgroundColor: stickers.yellow,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
    },
    mainButtonText: {
      fontSize: 14,
      fontWeight: '900',
      color: colors.textInverse,
      textTransform: 'uppercase',
      letterSpacing: 1,
      fontFamily: font.bodySemiBold,
    },
    alertBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: stickers.coral + '22',
      borderRadius: radius.lg,
      padding: 14,
      marginTop: 16,
      width: '100%',
    },
    alertText: {
      flex: 1,
      fontSize: 12,
      fontWeight: '700',
      color: stickers.coral,
      lineHeight: 17,
      fontFamily: font.bodySemiBold,
    },
    statsRow: {
      flexDirection: 'row',
      gap: 16,
      marginTop: 20,
      width: '100%',
    },
    statBox: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: 12,
      backgroundColor: colors.surfaceRaised,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.border,
    },
    statValue: {
      fontSize: 20,
      fontWeight: '900',
      color: colors.text,
      fontFamily: font.display,
    },
    statLabel: {
      fontSize: 8,
      fontWeight: '800',
      color: colors.textMuted,
      letterSpacing: 1,
      marginTop: 4,
      fontFamily: font.bodySemiBold,
    },
    sessionControls: {
      marginTop: 16,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
    },
    saveButton: {
      flex: 1,
      backgroundColor: stickers.blue,
      paddingVertical: 14,
      borderRadius: radius.full,
      alignItems: 'center',
    },
    saveButtonText: {
      fontSize: 14,
      fontWeight: '800',
      color: colors.textInverse,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      fontFamily: font.bodySemiBold,
    },
    resetButton: {
      paddingVertical: 10,
      paddingHorizontal: 14,
    },
    resetText: {
      fontSize: 14,
      fontWeight: '800',
      color: colors.textMuted,
      textTransform: 'uppercase',
      fontFamily: font.bodySemiBold,
    },
    sectionLabel: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.textMuted,
      letterSpacing: 3,
      textTransform: 'uppercase',
      marginBottom: 12,
      fontFamily: font.bodySemiBold,
    },
    historyCard: { marginBottom: 6 },
    historyRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    historyNum: {
      fontSize: 16,
      fontWeight: '900',
      color: stickers.yellow,
      width: 30,
      fontFamily: font.display,
    },
    historyDuration: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.text,
      fontFamily: font.bodySemiBold,
    },
    historyInterval: {
      fontSize: 12,
      color: colors.textMuted,
      marginTop: 2,
      fontFamily: font.body,
    },
    infoCard: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 10,
      marginTop: 16,
    },
    infoText: {
      flex: 1,
      fontSize: 12,
      color: colors.textSecondary,
      lineHeight: 18,
      fontFamily: font.body,
    },
  })
}
