/**
 * CaregiverHome — the scoped surface a nanny/family caregiver sees instead of
 * the owner dashboard. Renders the active caregiver-linked child, a "log the
 * day" entry point (only when log_activity is granted), and the recent-activity
 * readout. Every affordance is gated by hasCapability — withheld capabilities
 * are HIDDEN (not shown-disabled), so a View-Only caregiver sees a clean
 * read-only surface. RLS remains the security boundary; this is UX gating.
 *
 * Selection: rendered by app/(tabs)/index.tsx when the active child is one the
 * user is a caregiver for. The render is gated on useCaregiverStore.hydrated
 * upstream so the persona never flashes.
 */

import { useMemo, useState } from 'react'
import { ScrollView, View, Text, StyleSheet } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useChildStore } from '../../store/useChildStore'
import { useTheme, font, radius } from '../../constants/theme'
import { hasCapability, CAPABILITY } from '../../lib/caregiverPermissions'
import { PaperCard } from '../ui/PaperCard'
import { PillButton } from '../ui/PillButton'
import { RoleNanny, RoleFamily } from '../stickers/RewardStickers'
import { NannyUpdatesFeed } from '../home/NannyUpdatesFeed'
import { CaregiverChildPicker } from './CaregiverChildPicker'
import { CaregiverLogSheet } from './CaregiverLogSheet'

export function CaregiverHome() {
  const insets = useSafeAreaInsets()
  const { colors } = useTheme()
  const activeChild = useChildStore((s) => s.activeChild)
  const styles = useMemo(() => makeStyles(colors), [colors])
  const [logOpen, setLogOpen] = useState(false)

  // Empty state: invited but not linked to any child yet (owner removed the
  // child, or the link hasn't resolved). Give a clear "ask the owner" message
  // rather than a blank screen.
  if (!activeChild) {
    return (
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 40 },
        ]}
      >
        <PaperCard radius={28} padding={24}>
          <View style={styles.emptyWrap}>
            <RoleFamily size={56} />
            <Text style={styles.emptyTitle}>No children yet</Text>
            <Text style={styles.emptyText}>
              You're not linked to a child yet. Ask the parent to add you to their
              care circle, or check that your invite was accepted.
            </Text>
          </View>
        </PaperCard>
      </ScrollView>
    )
  }

  const canLog = hasCapability(activeChild, CAPABILITY.LOG_ACTIVITY)
  const isFamily = activeChild.caregiverRole === 'family'

  return (
    <>
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 40 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Multi-child switcher (renders only when 2+ caregiver children) */}
        <CaregiverChildPicker />

        {/* Child identity header — name + role badge. Non-PHI. */}
        <PaperCard radius={28} padding={20} style={styles.headerCard}>
          <View style={styles.headerRow}>
            <View style={styles.avatar}>
              {isFamily ? <RoleFamily size={36} /> : <RoleNanny size={36} />}
            </View>
            <View style={styles.headerText}>
              <Text style={styles.childName}>{activeChild.name}</Text>
              <Text style={styles.roleLabel}>
                {isFamily ? 'Family caregiver' : 'Nanny'}
              </Text>
            </View>
          </View>
        </PaperCard>

        {/* Primary action — log the day. Hidden entirely when not granted. */}
        {canLog && (
          <View style={styles.ctaWrap}>
            <PillButton
              label="Log the day"
              variant="ink"
              onPress={() => setLogOpen(true)}
            />
          </View>
        )}

        {/* Recent activity readout (reuses the presentational feed). */}
        <NannyUpdatesFeed />
      </ScrollView>

      {logOpen && (
        <CaregiverLogSheet
          child={activeChild}
          onClose={() => setLogOpen(false)}
        />
      )}
    </>
  )
}

const makeStyles = (colors: ReturnType<typeof useTheme>['colors']) =>
  StyleSheet.create({
    scroll: {
      paddingHorizontal: 16,
    },
    headerCard: {
      marginBottom: 16,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
    },
    avatar: {
      width: 52,
      height: 52,
      borderRadius: 26,
      backgroundColor: colors.primaryTint,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerText: {
      flex: 1,
    },
    childName: {
      fontSize: 22,
      fontFamily: font.display,
      color: colors.text,
    },
    roleLabel: {
      fontSize: 13,
      fontFamily: font.bodyMedium,
      color: colors.textMuted,
      marginTop: 2,
    },
    ctaWrap: {
      marginBottom: 20,
    },
    emptyWrap: {
      alignItems: 'center',
      gap: 10,
      paddingVertical: 16,
    },
    emptyTitle: {
      fontSize: 18,
      fontFamily: font.display,
      color: colors.text,
    },
    emptyText: {
      fontSize: 14,
      fontFamily: font.body,
      color: colors.textMuted,
      textAlign: 'center',
      lineHeight: 20,
    },
  })
