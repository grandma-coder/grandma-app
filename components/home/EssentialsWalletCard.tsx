/**
 * EssentialsWalletCard — the unified "child essentials" card in every wallet
 * stack. Lite form (name · allergies · pediatrician) by default; full form
 * (adds emergency contact + insurance) only when the viewer holds `emergency`.
 * For caregivers it renders pinned at the top of their home.
 */
import { useMemo } from 'react'
import { Text, StyleSheet } from 'react-native'
import { useTheme, font, radius } from '../../constants/theme'
import { PaperCard } from '../ui/PaperCard'
import { useChildEssentials } from '../../lib/childEssentials'

interface Props {
  childId: string
  ownerUserId: string
  showFull: boolean
  pinned?: boolean
}

export function EssentialsWalletCard({ childId, ownerUserId, showFull, pinned }: Props) {
  const { colors } = useTheme()
  const styles = useMemo(() => makeStyles(colors), [colors])
  const { data, isLoading } = useChildEssentials(childId, ownerUserId)

  if (isLoading || !data) {
    return (
      <PaperCard radius={radius.lg} padding={16} style={pinned ? styles.pinned : undefined}>
        <Text style={styles.label}>ESSENTIALS</Text>
        <Text style={styles.line}>Loading…</Text>
      </PaperCard>
    )
  }

  return (
    <PaperCard radius={radius.lg} padding={16} style={pinned ? styles.pinned : undefined}>
      <Text style={styles.label}>{data.childName.toUpperCase()}'S CARD</Text>
      {data.allergies.length > 0 && (
        <Text style={styles.line}>⚠️ Allergy: {data.allergies.join(', ')}</Text>
      )}
      {data.pediatricianName && (
        <Text style={styles.line}>🩺 {data.pediatricianName}{data.pediatricianPhone ? ` — ${data.pediatricianPhone}` : ''}</Text>
      )}
      {showFull && data.emergencyContactName && (
        <Text style={styles.line}>🆘 {data.emergencyContactName}{data.emergencyContactPhone ? ` — ${data.emergencyContactPhone}` : ''}</Text>
      )}
      {showFull && data.insuranceProvider && (
        <Text style={styles.line}>💳 {data.insuranceProvider}{data.insuranceMemberId ? ` · ${data.insuranceMemberId}` : ''}</Text>
      )}
    </PaperCard>
  )
}

const makeStyles = (colors: ReturnType<typeof useTheme>['colors']) =>
  StyleSheet.create({
    pinned: { marginBottom: 16 },
    label: { fontFamily: font.body, fontSize: 11, letterSpacing: 1.4, color: colors.textMuted, marginBottom: 8 },
    line: { fontFamily: font.body, fontSize: 14, color: colors.text, lineHeight: 24 },
  })
