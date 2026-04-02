import { View, Text, Pressable, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { GlassCard } from '../ui/GlassCard'
import { colors, borderRadius } from '../../constants/theme'

interface PartnerViewProps {
  partnerConnected?: boolean
  onInvite?: () => void
}

export function PartnerView({ partnerConnected = false, onInvite }: PartnerViewProps) {
  if (partnerConnected) {
    return (
      <GlassCard variant="accent">
        <View style={styles.row}>
          <View style={styles.iconCircle}>
            <Ionicons name="heart" size={22} color={colors.accent} />
          </View>
          <View style={styles.content}>
            <Text style={styles.title}>Partner Connected</Text>
            <Text style={styles.subtitle}>You're on this journey together</Text>
          </View>
          <Ionicons name="checkmark-circle" size={22} color={colors.success} />
        </View>
      </GlassCard>
    )
  }

  return (
    <GlassCard>
      <View style={styles.row}>
        <View style={styles.iconCircle}>
          <Text style={{ fontSize: 22 }}>💑</Text>
        </View>
        <View style={styles.content}>
          <Text style={styles.title}>Invite Your Partner</Text>
          <Text style={styles.subtitle}>
            Learn together and share the preparation journey
          </Text>
        </View>
      </View>
      <Pressable onPress={onInvite} style={styles.inviteBtn}>
        <Ionicons name="person-add-outline" size={16} color={colors.accent} />
        <Text style={styles.inviteText}>Send Invite</Text>
      </Pressable>
    </GlassCard>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.accentMuted,
    alignItems: 'center',
    justifyContent: 'center',
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
    color: colors.textSecondary,
    marginTop: 2,
    lineHeight: 16,
  },
  inviteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 14,
    paddingVertical: 10,
    backgroundColor: colors.surfaceGlass,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.borderAccent,
  },
  inviteText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.accent,
  },
})
