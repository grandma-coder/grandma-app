/**
 * ShareCardsEditor — per-section share-toggle editor. Lets a parent pick
 * exactly which home cards a caregiver sees for a given behavior, plus what
 * capabilities (log / emergency / chat) they're granted.
 *
 * Fully controlled: the ON set is always derived from `value._shared_cards`
 * (falling back to the role default) — no internal source-of-truth state.
 * `tier === 'intimate'` cards (e.g. cycle's BBT/LH/intercourse signals) render
 * with a visible "sensitive" hint so a parent doesn't share them by accident.
 */

import { Pressable, Text, View, StyleSheet } from 'react-native'
import { useTheme } from '../../constants/theme'
import { PaperCard } from '../ui/PaperCard'
import { CAREGIVER_CARDS, roleDefaultCards, type CaregiverBehavior } from '../../lib/caregiverCards'
import type { CaregiverPermissions, CaregiverRole } from '../../types'

interface ShareCardsEditorProps {
  behavior: CaregiverBehavior
  role: CaregiverRole
  value: CaregiverPermissions
  onChange: (next: CaregiverPermissions) => void
}

interface CapabilityRow {
  key: 'log_activity' | 'emergency' | 'chat'
  label: string
}

const CAPABILITY_ROWS: CapabilityRow[] = [
  { key: 'log_activity', label: 'Can log activity' },
  { key: 'emergency', label: 'Can view emergency info' },
  { key: 'chat', label: 'Can chat' },
]

export function ShareCardsEditor({ behavior, role, value, onChange }: ShareCardsEditorProps) {
  const { colors, stickers, radius, spacing, font } = useTheme()

  const cards = CAREGIVER_CARDS[behavior]
  const sharedIds = value._shared_cards?.[behavior] ?? roleDefaultCards(behavior, role)

  function toggleCard(id: string) {
    const isOn = sharedIds.includes(id)
    const nextIds = isOn ? sharedIds.filter((cardId) => cardId !== id) : [...sharedIds, id]
    onChange({
      ...value,
      _shared_cards: { ...value._shared_cards, [behavior]: nextIds },
    })
  }

  function toggleCapability(key: CapabilityRow['key']) {
    onChange({ ...value, [key]: !value[key] })
  }

  return (
    <View style={{ gap: spacing.md }}>
      <PaperCard radius={radius.lg} padding={spacing.md}>
        <Text style={[styles.sectionTitle, { color: colors.text, fontFamily: font.bodySemiBold }]}>
          What can they see?
        </Text>
        <View style={{ gap: spacing.sm, marginTop: spacing.sm }}>
          {cards.map((card) => {
            const isOn = sharedIds.includes(card.id)
            const isIntimate = card.tier === 'intimate'
            return (
              <Pressable
                key={card.id}
                onPress={() => toggleCard(card.id)}
                style={[
                  styles.row,
                  {
                    backgroundColor: isOn ? stickers.lilacSoft : colors.surfaceRaised,
                    borderColor: colors.border,
                    borderRadius: radius.md,
                  },
                ]}
              >
                <View style={styles.rowLabelBlock}>
                  <Text
                    style={[
                      styles.rowLabel,
                      { color: isOn ? stickers.lilacInk : colors.text, fontFamily: font.bodyMedium },
                    ]}
                  >
                    {card.label}
                  </Text>
                  {isIntimate && (
                    <Text style={[styles.sensitiveTag, { color: stickers.coralInk, fontFamily: font.bodySemiBold }]}>
                      sensitive
                    </Text>
                  )}
                </View>
                <View
                  style={[
                    styles.pill,
                    {
                      borderRadius: radius.full,
                      backgroundColor: isOn ? stickers.lilac : colors.surface,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.pillText,
                      { color: isOn ? stickers.lilacInk : colors.textSecondary, fontFamily: font.bodySemiBold },
                    ]}
                  >
                    {isOn ? 'ON' : 'OFF'}
                  </Text>
                </View>
              </Pressable>
            )
          })}
        </View>
      </PaperCard>

      <PaperCard radius={radius.lg} padding={spacing.md}>
        <Text style={[styles.sectionTitle, { color: colors.text, fontFamily: font.bodySemiBold }]}>
          What can they do?
        </Text>
        <View style={{ gap: spacing.sm, marginTop: spacing.sm }}>
          {CAPABILITY_ROWS.map((cap) => {
            const isOn = !!value[cap.key]
            return (
              <Pressable
                key={cap.key}
                onPress={() => toggleCapability(cap.key)}
                style={[
                  styles.row,
                  {
                    backgroundColor: isOn ? stickers.blueSoft : colors.surfaceRaised,
                    borderColor: colors.border,
                    borderRadius: radius.md,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.rowLabel,
                    { color: isOn ? stickers.blueInk : colors.text, fontFamily: font.bodyMedium },
                  ]}
                >
                  {cap.label}
                </Text>
                <View
                  style={[
                    styles.pill,
                    {
                      borderRadius: radius.full,
                      backgroundColor: isOn ? stickers.blue : colors.surface,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.pillText,
                      { color: isOn ? stickers.blueInk : colors.textSecondary, fontFamily: font.bodySemiBold },
                    ]}
                  >
                    {isOn ? 'ON' : 'OFF'}
                  </Text>
                </View>
              </Pressable>
            )
          })}
        </View>
      </PaperCard>
    </View>
  )
}

const styles = StyleSheet.create({
  sectionTitle: { fontSize: 16 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    gap: 12,
  },
  rowLabelBlock: { flex: 1, flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  rowLabel: { fontSize: 14, flexShrink: 1 },
  sensitiveTag: { fontSize: 11, letterSpacing: 0.4, textTransform: 'uppercase' },
  pill: { paddingVertical: 6, paddingHorizontal: 14, borderWidth: 1 },
  pillText: { fontSize: 12, letterSpacing: 0.4 },
})
