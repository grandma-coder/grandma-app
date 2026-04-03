import { useState, useRef, useEffect } from 'react'
import { View, Text, Pressable, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { GlassCard } from '../ui/GlassCard'
import { colors, THEME_COLORS, borderRadius, shadows, typography } from '../../constants/theme'

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
      {/* Main counter card */}
      <GlassCard style={styles.counterCard}>
        <Text style={styles.counterLabel}>KICK COUNTER</Text>
        <Text style={styles.counterSubtitle}>
          Goal: 10 kicks in under 2 hours
        </Text>

        {!counting ? (
          <Pressable
            onPress={startSession}
            style={({ pressed }) => [styles.startButton, pressed && { transform: [{ scale: 0.95 }] }]}
          >
            <Ionicons name="play" size={32} color={colors.textOnAccent} />
            <Text style={styles.startText}>START SESSION</Text>
          </Pressable>
        ) : (
          <>
            {/* Timer + count display */}
            <View style={styles.displayRow}>
              <View style={styles.displayBox}>
                <Text style={styles.displayNumber}>{kickCount}</Text>
                <Text style={styles.displayLabel}>KICKS</Text>
              </View>
              <View style={styles.displayBox}>
                <Text style={styles.displayNumber}>{formatDuration(elapsedSeconds)}</Text>
                <Text style={styles.displayLabel}>TIME</Text>
              </View>
            </View>

            {/* Goal indicator */}
            {goalReached && (
              <View style={styles.goalBanner}>
                <Ionicons name="checkmark-circle" size={20} color={THEME_COLORS.green} />
                <Text style={styles.goalText}>Goal reached! Baby is active and healthy.</Text>
              </View>
            )}

            {/* Tap button */}
            <Pressable
              onPress={recordKick}
              style={({ pressed }) => [styles.kickButton, pressed && { transform: [{ scale: 0.9 }] }]}
            >
              <Ionicons name="hand-left" size={48} color={colors.textOnAccent} />
              <Text style={styles.kickText}>TAP FOR KICK</Text>
            </Pressable>

            {/* End session */}
            <Pressable onPress={endSession} style={styles.endButton}>
              <Ionicons name="stop-circle-outline" size={20} color={THEME_COLORS.orange} />
              <Text style={styles.endText}>End Session</Text>
            </Pressable>
          </>
        )}
      </GlassCard>

      {/* Past sessions */}
      {sessions.length > 0 && (
        <View>
          <Text style={styles.sectionLabel}>RECENT SESSIONS</Text>
          {sessions.slice(0, 5).map((session) => (
            <GlassCard key={session.id} style={styles.sessionCard}>
              <View style={styles.sessionRow}>
                <View style={styles.sessionIconBox}>
                  <Ionicons name="footsteps-outline" size={18} color={THEME_COLORS.pink} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.sessionKicks}>{session.count} kicks</Text>
                  <Text style={styles.sessionDuration}>
                    {formatDuration(session.durationSeconds)}
                  </Text>
                </View>
                <Text style={styles.sessionDate}>
                  {new Date(session.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                </Text>
              </View>
            </GlassCard>
          ))}
        </View>
      )}

      {/* Info card */}
      <GlassCard style={styles.infoCard}>
        <Ionicons name="information-circle-outline" size={20} color={THEME_COLORS.blue} />
        <Text style={styles.infoText}>
          Count movements (kicks, rolls, jabs) starting from week 28. If you don't feel 10 movements in 2 hours, contact your healthcare provider.
        </Text>
      </GlassCard>
    </View>
  )
}

const styles = StyleSheet.create({
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
  },
  counterSubtitle: {
    fontSize: 12,
    color: colors.textTertiary,
    marginBottom: 24,
  },

  startButton: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: THEME_COLORS.yellow,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.glow,
  },
  startText: {
    fontSize: 12,
    fontWeight: '900',
    color: colors.textOnAccent,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: 8,
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
    color: THEME_COLORS.yellow,
  },
  displayLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.textTertiary,
    letterSpacing: 2,
    marginTop: 4,
  },

  goalBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: THEME_COLORS.green + '15',
    borderRadius: borderRadius.full,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginBottom: 20,
  },
  goalText: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME_COLORS.green,
  },

  kickButton: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: THEME_COLORS.pink,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    ...shadows.glowPink,
  },
  kickText: {
    fontSize: 10,
    fontWeight: '900',
    color: colors.textOnAccent,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: 4,
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
    color: THEME_COLORS.orange,
    textTransform: 'uppercase',
  },

  sectionLabel: {
    ...typography.label,
    marginBottom: 12,
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
    borderRadius: 14,
    backgroundColor: THEME_COLORS.pink + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sessionKicks: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.text,
    textTransform: 'uppercase',
  },
  sessionDuration: {
    fontSize: 12,
    color: colors.textTertiary,
    marginTop: 2,
  },
  sessionDate: {
    fontSize: 12,
    color: colors.textTertiary,
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
  },
})
