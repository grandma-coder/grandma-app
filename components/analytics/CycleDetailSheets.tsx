/**
 * CycleDetailSheets — tap-through detail for each CycleAnalytics stat tile.
 *
 * One exported `CycleDetailSheet` driven by a `type` prop; each type has its
 * own internal body component that calls the matching cycleAnalytics hook.
 */

import { View, Text, ActivityIndicator, StyleSheet, ScrollView } from 'react-native'
import { useTheme } from '../../constants/theme'
import { LogSheet } from '../calendar/LogSheet'
import { Body } from '../ui/Typography'

export type CycleDetailType =
  | 'cycleLength'
  | 'regularity'
  | 'pms'
  | 'fertile'
  | 'mood'

interface Props {
  type: CycleDetailType | null
  onClose: () => void
}

const TITLES: Record<CycleDetailType, string> = {
  cycleLength: 'Cycle Length',
  regularity: 'Regularity',
  pms: 'PMS Days',
  fertile: 'Fertile Window',
  mood: 'Mood',
}

export function CycleDetailSheet({ type, onClose }: Props) {
  const visible = type !== null
  const title = type ? TITLES[type] : ''

  return (
    <LogSheet visible={visible} title={title} onClose={onClose}>
      <ScrollView
        style={{ maxHeight: 540 }}
        contentContainerStyle={styles.body}
        showsVerticalScrollIndicator={false}
      >
        {type === 'cycleLength' && <CycleLengthDetail />}
        {type === 'regularity' && <RegularityDetail />}
        {type === 'pms' && <PMSDetail />}
        {type === 'fertile' && <FertileDetail />}
        {type === 'mood' && <MoodDetail />}
      </ScrollView>
    </LogSheet>
  )
}

// ─── Placeholder bodies (filled in by later tasks) ────────────────────────

function CycleLengthDetail() { return <Loading /> }
function RegularityDetail() { return <Loading /> }
function PMSDetail() { return <Loading /> }
function FertileDetail() { return <Loading /> }
function MoodDetail() { return <Loading /> }

// ─── Shared UI helpers ────────────────────────────────────────────────────

function Loading() {
  const { colors } = useTheme()
  return (
    <View style={styles.center}>
      <ActivityIndicator color={colors.primary} />
    </View>
  )
}

export function EmptyState({ copy }: { copy: string }) {
  const { colors } = useTheme()
  return (
    <View style={styles.center}>
      <Body size={14} color={colors.textMuted} align="center">{copy}</Body>
    </View>
  )
}

export function ErrorState() {
  const { colors } = useTheme()
  return (
    <View style={styles.center}>
      <Body size={14} color={colors.textMuted} align="center">
        Couldn't load. Please try again.
      </Body>
    </View>
  )
}

const styles = StyleSheet.create({
  body: {
    paddingBottom: 8,
    gap: 16,
  },
  center: {
    paddingVertical: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
