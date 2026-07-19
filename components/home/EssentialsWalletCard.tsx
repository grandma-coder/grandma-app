/**
 * EssentialsWalletCard — the unified "child essentials" card in every wallet
 * stack. Sourced from the active child in the store, which the boot RPC
 * (`get_caregiver_children`) has ALREADY PHI-masked per the caregiver's
 * capabilities: a non-`emergency` caregiver gets empty allergies / null
 * pediatrician / masked blood type, so the card safely degrades to just the
 * child's name. It never re-queries the raw `children` table (that SELECT RLS
 * hands accepted caregivers the full unmasked row — the PHI leak this closes).
 *
 * Lite form (name · allergies · pediatrician) by default; full form (adds blood
 * type · conditions · medications) when the viewer holds `emergency`. All rows
 * come from the same masked source, so an ungranted viewer sees nothing extra.
 *
 * For caregivers it renders pinned at the top of their home.
 */
import { useMemo } from 'react'
import { Text, StyleSheet } from 'react-native'
import { useTheme, font, radius } from '../../constants/theme'
import { PaperCard } from '../ui/PaperCard'
import { useChildStore } from '../../store/useChildStore'

interface Props {
  // Kept for call-site compatibility (KidsHome/PregnancyHome/CycleHome) and the
  // future caregiver emergency_contacts/insurance migration; the card now reads
  // the masked active child from the store instead of fetching by these.
  childId: string
  ownerUserId: string
  showFull: boolean
  pinned?: boolean
}

export function EssentialsWalletCard({ childId: _childId, ownerUserId: _ownerUserId, showFull, pinned }: Props) {
  const { colors } = useTheme()
  const styles = useMemo(() => makeStyles(colors), [colors])
  const child = useChildStore((s) => s.activeChild)

  if (!child) {
    return (
      <PaperCard radius={radius.lg} padding={16} style={pinned ? styles.pinned : undefined}>
        <Text style={styles.label}>ESSENTIALS</Text>
        <Text style={styles.line}>Loading…</Text>
      </PaperCard>
    )
  }

  const allergies = child.allergies ?? []
  const conditions = child.conditions ?? []
  const medications = child.medications ?? []

  return (
    <PaperCard radius={radius.lg} padding={16} style={pinned ? styles.pinned : undefined}>
      <Text style={styles.label}>{child.name.toUpperCase()}'S CARD</Text>
      {allergies.length > 0 && (
        <Text style={styles.line}>⚠️ Allergy: {allergies.join(', ')}</Text>
      )}
      {child.pediatrician?.name && (
        <Text style={styles.line}>🩺 {child.pediatrician.name}{child.pediatrician.phone ? ` — ${child.pediatrician.phone}` : ''}</Text>
      )}
      {/* Full form (emergency-granted): extra fields the RPC also masks for
          non-emergency caregivers, so they degrade to nothing on their own. */}
      {showFull && child.bloodType && (
        <Text style={styles.line}>🩸 Blood type: {child.bloodType}</Text>
      )}
      {showFull && conditions.length > 0 && (
        <Text style={styles.line}>📋 Conditions: {conditions.join(', ')}</Text>
      )}
      {showFull && medications.length > 0 && (
        <Text style={styles.line}>💊 Medications: {medications.join(', ')}</Text>
      )}
      {/* TODO(caregiver): emergency_contacts/insurance need a caregiver-read RLS
          migration before they can show here — no caregiver-safe source today. */}
    </PaperCard>
  )
}

const makeStyles = (colors: ReturnType<typeof useTheme>['colors']) =>
  StyleSheet.create({
    pinned: { marginBottom: 16 },
    label: { fontFamily: font.body, fontSize: 11, letterSpacing: 1.4, color: colors.textMuted, marginBottom: 8 },
    line: { fontFamily: font.body, fontSize: 14, color: colors.text, lineHeight: 24 },
  })
