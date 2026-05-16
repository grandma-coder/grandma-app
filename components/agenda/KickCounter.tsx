import { useState, useRef, useEffect, useMemo } from 'react'
import { View, Text, Pressable, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { PaperCard } from '../ui/PaperCard'
import { useTheme } from '../../constants/theme'
import { PulseBubblesLive } from '../charts/GalleryCharts'
import { useTranslation } from '../../lib/i18n'

type ThemeShape = ReturnType<typeof useTheme>

interface KickSession {
  id: string
  date: string
  count: number
  durationSeconds: number
}

interface KickCounterProps {
  sessions?: KickSession[]
  onSaveSession?: (count: number, durationSeconds: number) => void
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export function KickCounter({ sessions = [], onSaveSession }: KickCounterProps) {
  const theme = useTheme()
  const { colors, stickers, radius } = theme
  const styles = useMemo(() => makeStyles(theme), [theme])
  const { t } = useTranslation()

  const [counting, setCounting] = useState(false)
  const [kickCount, setKickCount] = useState(0)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (counting) {
      intervalRef.current = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1)
      }, 1000)
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [counting])

  function startSession() {
    setKickCount(0)
    setElapsedSeconds(0)
    setCounting(true)
  }

  function recordKick() {
    setKickCount((prev) => prev + 1)
  }

  function endSession() {
    setCounting(false)
    if (intervalRef.current) clearInterval(intervalRef.current)
    if (kickCount > 0) {
      onSaveSession?.(kickCount, elapsedSeconds)
    }
    setKickCount(0)
    setElapsedSeconds(0)
  }

  const goalReached = kickCount >= 10

  return (
    <View style={styles.container}>
      <PaperCard radius={radius.lg} padding={20} style={styles.counterCard}>
        <Text style={styles.counterLabel}>{t('preg_kicks_title')}</Text>
        <Text style={styles.counterSubtitle}>
          {t('preg_kicks_goal')}
        </Text>

        {!counting ? (
          <Pressable
            onPress={startSession}
            style={({ pressed }) => [styles.startButton, pressed && { transform: [{ scale: 0.95 }] }]}
            accessibilityRole="button"
            accessibilityLabel="Start kick counting session"
          >
            <Ionicons name="play" size={32} color={colors.textInverse} />
            <Text style={styles.startText}>{t('preg_kicks_startSession')}</Text>
          </Pressable>
        ) : (
          <>
            <PulseBubblesLive
              state="live"
              color={stickers.pink}
              size={120}
            />

            <View style={styles.displayRow}>
              <View style={styles.displayBox}>
                <Text style={styles.displayNumber}>{kickCount}</Text>
                <Text style={styles.displayLabel}>{t('preg_kicks_kicksLabel')}</Text>
              </View>
              <View style={styles.displayBox}>
                <Text style={styles.displayNumber}>{formatDuration(elapsedSeconds)}</Text>
                <Text style={styles.displayLabel}>{t('preg_kicks_timeLabel')}</Text>
              </View>
            </View>

            {goalReached && (
              <View style={styles.goalBanner}>
                <Ionicons name="checkmark-circle" size={20} color={stickers.green} />
                <Text style={styles.goalText}>{t('preg_kicks_goalReached')}</Text>
              </View>
            )}

            <Pressable
              onPress={recordKick}
              style={({ pressed }) => [styles.kickButton, pressed && { transform: [{ scale: 0.9 }] }]}
              accessibilityRole="button"
              accessibilityLabel="Record a kick"
            >
              <Ionicons name="hand-left" size={48} color={colors.textInverse} />
              <Text style={styles.kickText}>{t('preg_kicks_tapForKick')}</Text>
            </Pressable>

            <Pressable
              onPress={endSession}
              style={styles.endButton}
              accessibilityRole="button"
              accessibilityLabel="End kick session"
            >
              <Ionicons name="stop-circle-outline" size={20} color={stickers.coral} />
              <Text style={styles.endText}>{t('preg_kicks_endSession')}</Text>
            </Pressable>
          </>
        )}
      </PaperCard>

      {sessions.length > 0 && (
        <View>
          <Text style={styles.sectionLabel}>{t('preg_kicks_recentSessions')}</Text>
          {sessions.slice(0, 5).map((session) => (
            <PaperCard radius={radius.lg} padding={20} key={session.id} style={styles.sessionCard}>
              <View style={styles.sessionRow}>
                <View style={styles.sessionIconBox}>
                  <Ionicons name="footsteps-outline" size={18} color={stickers.pink} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.sessionKicks}>{t('preg_kicks_countLabel', { count: session.count })}</Text>
                  <Text style={styles.sessionDuration}>
                    {formatDuration(session.durationSeconds)}
                  </Text>
                </View>
                <Text style={styles.sessionDate}>
                  {new Date(session.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                </Text>
              </View>
            </PaperCard>
          ))}
        </View>
      )}

      <PaperCard radius={radius.lg} padding={20} style={styles.infoCard}>
        <Ionicons name="information-circle-outline" size={20} color={stickers.blue} />
        <Text style={styles.infoText}>
          {t('preg_kicks_info')}
        </Text>
      </PaperCard>
    </View>
  )
}

function makeStyles({ colors, stickers, font, radius }: ThemeShape) {
  return StyleSheet.create({
    container: {},
    counterCard: {
      alignItems: 'center',
      marginBottom: 24,
    },
    counterLabel: {
      fontSize: 20,
      fontWeight: '900',
      color: colors.text,
      letterSpacing: 2,
      marginBottom: 4,
      fontFamily: font.bodySemiBold,
    },
    counterSubtitle: {
      fontSize: 12,
      color: colors.textMuted,
      marginBottom: 24,
      fontFamily: font.body,
    },
    startButton: {
      width: 160,
      height: 160,
      borderRadius: 80,
      backgroundColor: stickers.yellow,
      alignItems: 'center',
      justifyContent: 'center',
    },
    startText: {
      fontSize: 12,
      fontWeight: '900',
      color: colors.textInverse,
      textTransform: 'uppercase',
      letterSpacing: 1,
      marginTop: 8,
      fontFamily: font.bodySemiBold,
    },
    displayRow: {
      flexDirection: 'row',
      gap: 24,
      marginBottom: 24,
    },
    displayBox: {
      alignItems: 'center',
      minWidth: 100,
    },
    displayNumber: {
      fontSize: 48,
      fontWeight: '900',
      color: colors.text,
      fontFamily: font.display,
    },
    displayLabel: {
      fontSize: 10,
      fontWeight: '800',
      color: colors.textMuted,
      letterSpacing: 2,
      marginTop: 4,
      fontFamily: font.bodySemiBold,
    },
    goalBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: stickers.green + '22',
      borderRadius: radius.full,
      paddingHorizontal: 16,
      paddingVertical: 10,
      marginBottom: 20,
    },
    goalText: {
      fontSize: 12,
      fontWeight: '700',
      color: stickers.green,
      fontFamily: font.bodySemiBold,
    },
    kickButton: {
      width: 140,
      height: 140,
      borderRadius: 70,
      backgroundColor: stickers.pink,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 20,
    },
    kickText: {
      fontSize: 10,
      fontWeight: '900',
      color: colors.textInverse,
      textTransform: 'uppercase',
      letterSpacing: 1,
      marginTop: 4,
      fontFamily: font.bodySemiBold,
    },
    endButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingVertical: 12,
    },
    endText: {
      fontSize: 14,
      fontWeight: '800',
      color: stickers.coral,
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
    sessionCard: { marginBottom: 8 },
    sessionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    sessionIconBox: {
      width: 40,
      height: 40,
      borderRadius: radius.md,
      backgroundColor: stickers.pink + '22',
      alignItems: 'center',
      justifyContent: 'center',
    },
    sessionKicks: {
      fontSize: 14,
      fontWeight: '800',
      color: colors.text,
      textTransform: 'uppercase',
      fontFamily: font.bodySemiBold,
    },
    sessionDuration: {
      fontSize: 12,
      color: colors.textMuted,
      marginTop: 2,
      fontFamily: font.body,
    },
    sessionDate: {
      fontSize: 12,
      color: colors.textMuted,
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
