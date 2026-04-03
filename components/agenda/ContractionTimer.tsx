import { useState, useRef, useEffect } from 'react'
import { View, Text, Pressable, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { GlassCard } from '../ui/GlassCard'
import { colors, THEME_COLORS, borderRadius, shadows, typography } from '../../constants/theme'

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
  const [contractions, setContractions] = useState<Contraction[]>([])
  const [isActive, setIsActive] = useState(false)
  const [elapsed, setElapsed] = useState(0)
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

  function handlePress() {
    if (!isActive) {
      // Start a contraction
      setIsActive(true)
      setElapsed(0)
      setContractions((prev) => [...prev, { start: Date.now() }])
    } else {
      // End current contraction
      setIsActive(false)
      if (intervalRef.current) clearInterval(intervalRef.current)
      setContractions((prev) => {
        const updated = [...prev]
        const last = updated[updated.length - 1]
        if (last && !last.end) {
          updated[updated.length - 1] = { ...last, end: Date.now() }
        }
        return updated
      })
      setElapsed(0)
    }
  }

  function handleReset() {
    setIsActive(false)
    if (intervalRef.current) clearInterval(intervalRef.current)
    setContractions([])
    setElapsed(0)
  }

  // Calculate intervals between contractions
  const completedContractions = contractions.filter((c) => c.end)
  const intervals: { duration: number; interval: number }[] = []
  for (let i = 0; i < completedContractions.length; i++) {
    const c = completedContractions[i]
    const duration = (c.end! - c.start) / 1000
    const interval = i > 0 ? (c.start - completedContractions[i - 1].end!) / 1000 : 0
    intervals.push({ duration, interval })
  }

  // 5-1-1 rule: contractions 5 min apart, lasting 1 min, for 1 hour
  const avgInterval = intervals.length > 1
    ? intervals.slice(1).reduce((sum, i) => sum + i.interval, 0) / (intervals.length - 1)
    : 0
  const avgDuration = intervals.length > 0
    ? intervals.reduce((sum, i) => sum + i.duration, 0) / intervals.length
    : 0
  const isActiveLabor = avgInterval > 0 && avgInterval <= 300 && avgDuration >= 45

  return (
    <View style={styles.container}>
      <GlassCard style={styles.mainCard}>
        <Text style={styles.title}>CONTRACTION TIMER</Text>
        <Text style={styles.subtitle}>
          Track timing and duration between contractions
        </Text>

        {/* Timer display */}
        <Text style={styles.timer}>{formatTime(elapsed)}</Text>
        <Text style={styles.timerLabel}>
          {isActive ? 'CONTRACTION IN PROGRESS' : 'READY'}
        </Text>

        {/* Main button */}
        <Pressable
          onPress={handlePress}
          style={({ pressed }) => [
            styles.mainButton,
            isActive && { backgroundColor: THEME_COLORS.orange },
            pressed && { transform: [{ scale: 0.95 }] },
          ]}
        >
          <Ionicons
            name={isActive ? 'stop' : 'play'}
            size={32}
            color={colors.textOnAccent}
          />
          <Text style={styles.mainButtonText}>
            {isActive ? 'CONTRACTION ENDED' : 'CONTRACTION STARTED'}
          </Text>
        </Pressable>

        {/* Active labor warning */}
        {isActiveLabor && (
          <View style={styles.alertBanner}>
            <Ionicons name="alert-circle" size={20} color={THEME_COLORS.orange} />
            <Text style={styles.alertText}>
              Contractions are close together! Consider heading to the hospital (5-1-1 rule).
            </Text>
          </View>
        )}

        {/* Stats */}
        {intervals.length > 0 && (
          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{completedContractions.length}</Text>
              <Text style={styles.statLabel}>TOTAL</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>
                {avgDuration > 0 ? `${Math.round(avgDuration)}s` : '--'}
              </Text>
              <Text style={styles.statLabel}>AVG DURATION</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>
                {avgInterval > 0 ? `${Math.round(avgInterval / 60)}m` : '--'}
              </Text>
              <Text style={styles.statLabel}>AVG INTERVAL</Text>
            </View>
          </View>
        )}

        {/* Reset */}
        {contractions.length > 0 && !isActive && (
          <Pressable onPress={handleReset} style={styles.resetButton}>
            <Text style={styles.resetText}>Reset</Text>
          </Pressable>
        )}
      </GlassCard>

      {/* History */}
      {intervals.length > 0 && (
        <View>
          <Text style={styles.sectionLabel}>THIS SESSION</Text>
          {intervals.map((item, i) => (
            <GlassCard key={i} style={styles.historyCard}>
              <View style={styles.historyRow}>
                <Text style={styles.historyNum}>#{i + 1}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.historyDuration}>
                    {Math.round(item.duration)}s duration
                  </Text>
                  {item.interval > 0 && (
                    <Text style={styles.historyInterval}>
                      {Math.round(item.interval / 60)}m {Math.round(item.interval % 60)}s apart
                    </Text>
                  )}
                </View>
              </View>
            </GlassCard>
          ))}
        </View>
      )}

      {/* Info */}
      <GlassCard style={styles.infoCard}>
        <Ionicons name="information-circle-outline" size={20} color={THEME_COLORS.blue} />
        <Text style={styles.infoText}>
          The 5-1-1 rule: head to the hospital when contractions are 5 minutes apart, lasting 1 minute each, for at least 1 hour.
        </Text>
      </GlassCard>
    </View>
  )
}

const styles = StyleSheet.create({
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
  },
  subtitle: {
    fontSize: 12,
    color: colors.textTertiary,
    marginBottom: 24,
    textAlign: 'center',
  },

  timer: {
    fontSize: 64,
    fontWeight: '900',
    color: THEME_COLORS.yellow,
    letterSpacing: 2,
  },
  timerLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.textTertiary,
    letterSpacing: 2,
    marginBottom: 24,
  },

  mainButton: {
    width: '100%',
    height: 64,
    borderRadius: borderRadius.full,
    backgroundColor: THEME_COLORS.yellow,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    ...shadows.glow,
  },
  mainButtonText: {
    fontSize: 14,
    fontWeight: '900',
    color: colors.textOnAccent,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },

  alertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: THEME_COLORS.orange + '15',
    borderRadius: borderRadius.lg,
    padding: 14,
    marginTop: 16,
    width: '100%',
  },
  alertText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
    color: THEME_COLORS.orange,
    lineHeight: 17,
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
    backgroundColor: colors.surfaceGlass,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '900',
    color: colors.text,
  },
  statLabel: {
    fontSize: 8,
    fontWeight: '800',
    color: colors.textTertiary,
    letterSpacing: 1,
    marginTop: 4,
  },

  resetButton: {
    marginTop: 16,
    paddingVertical: 10,
  },
  resetText: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.textTertiary,
    textTransform: 'uppercase',
  },

  sectionLabel: {
    ...typography.label,
    marginBottom: 12,
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
    color: THEME_COLORS.yellow,
    width: 30,
  },
  historyDuration: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  historyInterval: {
    fontSize: 12,
    color: colors.textTertiary,
    marginTop: 2,
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
