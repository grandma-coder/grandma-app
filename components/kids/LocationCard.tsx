import { View, Text, Pressable, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { GlassCard } from '../ui/GlassCard'
import { colors, borderRadius } from '../../constants/theme'

interface LocationCardProps {
  childName: string
  connected: boolean
  lastUpdate?: string
  onSetup?: () => void
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

export function LocationCard({ childName, connected, lastUpdate, onSetup }: LocationCardProps) {
  if (!connected) {
    return (
      <GlassCard style={styles.container}>
        <View style={styles.row}>
          <View style={styles.iconCircle}>
            <Ionicons name="location-outline" size={22} color={colors.textTertiary} />
          </View>
          <View style={styles.content}>
            <Text style={styles.title}>Track {childName}'s Location</Text>
            <Text style={styles.subtitle}>Connect an AirTag to see their location</Text>
          </View>
        </View>
        <Pressable onPress={onSetup} style={styles.setupBtn}>
          <Text style={styles.setupText}>Set Up AirTag</Text>
        </Pressable>
      </GlassCard>
    )
  }

  return (
    <GlassCard variant="accent" style={styles.container}>
      <View style={styles.row}>
        <View style={[styles.iconCircle, styles.iconCircleActive]}>
          <Ionicons name="location" size={22} color={colors.accent} />
        </View>
        <View style={styles.content}>
          <Text style={styles.title}>Where is {childName}?</Text>
          <Text style={styles.subtitleActive}>
            Last updated {lastUpdate ? timeAgo(lastUpdate) : 'unknown'}
          </Text>
        </View>
        <Pressable style={styles.mapBtn}>
          <Ionicons name="map-outline" size={18} color={colors.accent} />
        </Pressable>
      </View>

      {/* Map placeholder */}
      <View style={styles.mapPlaceholder}>
        <Ionicons name="navigate-circle-outline" size={32} color={colors.textTertiary} />
        <Text style={styles.mapPlaceholderText}>Map view coming soon</Text>
      </View>
    </GlassCard>
  )
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surfaceGlass,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  iconCircleActive: {
    backgroundColor: colors.accentMuted,
    borderColor: colors.borderAccent,
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  subtitle: {
    fontSize: 12,
    color: colors.textTertiary,
    marginTop: 2,
  },
  subtitleActive: {
    fontSize: 12,
    color: colors.accent,
    marginTop: 2,
  },
  setupBtn: {
    marginTop: 12,
    alignItems: 'center',
    paddingVertical: 10,
    backgroundColor: colors.surfaceGlass,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  setupText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.accent,
  },
  mapBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.accentMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapPlaceholder: {
    marginTop: 12,
    height: 100,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surfaceGlass,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  mapPlaceholderText: {
    fontSize: 12,
    color: colors.textTertiary,
  },
})
