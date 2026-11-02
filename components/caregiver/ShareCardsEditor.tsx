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
import { Ionicons } from '@expo/vector-icons'
import { useTheme } from '../../constants/theme'
import { SiteSticker, type SiteStickerName } from '../stickers/SiteSticker'
import { CAREGIVER_CARDS, roleDefaultCards, type CaregiverBehavior } from '../../lib/caregiverCards'
import type { CaregiverPermissions, CaregiverRole } from '../../types'

interface ShareCardsEditorProps {
  behavior: CaregiverBehavior
  role: CaregiverRole
  value: CaregiverPermissions
  onChange: (next: CaregiverPermissions) => void
}

interface CapabilityRow {
  key: 'log_activity' | 'emergency' | 'chat' | 'edit_child'
  label: string
  sticker: SiteStickerName
}

// Card id → site sticker. Ids are shared across behaviors, so one map covers all.
const CARD_STICKERS: Record<string, SiteStickerName> = {
  'hero-tiles': 'bars',
  'today-summary': 'cal',
  today_summary: 'cal',
  vaccines: 'syringe',
  health: 'thermo',
  exams: 'otest',
  diaper: 'diaper',
  growth_leap: 'ruler',
  reminders: 'bell',
  ask_grandma: 'bubble',
  rewards: 'star',
  essentials: 'doc',
  'week-hero': 'baby',
  daily_message: 'heart',
  appointment: 'cal',
  week_tip: 'leaf',
  kicks: 'shoe',
  birth_guide: 'books',
  journey_ring: 'flower',
  pillars: 'brain',
}

const CAPABILITY_ROWS: CapabilityRow[] = [
  { key: 'log_activity', label: 'Can log activity', sticker: 'pencil' },
  { key: 'emergency', label: 'Can view emergency info', sticker: 'thermo' },
  { key: 'chat', label: 'Can chat', sticker: 'bubble' },
  { key: 'edit_child', label: 'Can edit child profile & health info', sticker: 'baby' },
]

export function ShareCardsEditor({ behavior, role, value, onChange }: ShareCardsEditorProps) {
  const { colors, stickers, spacing, font } = useTheme()

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

  const ink = colors.text

  // Card-less sticker row: sticker + label, ink tick box on the right, hairline below.
  const Row = ({ sticker, label, on, onPress, tag }: { sticker: SiteStickerName; label: string; on: boolean; onPress: () => void; tag?: string }) => (
    <Pressable
      onPress={onPress}
      accessibilityRole="switch"
      accessibilityState={{ checked: on }}
      accessibilityLabel={label}
      style={[styles.row, { borderBottomColor: colors.border }]}
    >
      <SiteSticker name={sticker} size={32} cut />
      <View style={styles.rowLabelBlock}>
        <Text style={[styles.rowLabel, { color: ink, fontFamily: on ? font.bodyBold : font.bodyMedium }]}>{label}</Text>
        {tag ? (
          <View style={[styles.tag, { backgroundColor: stickers.peachSoft, borderColor: ink }]}>
            <Text style={[styles.tagText, { color: ink, fontFamily: font.bodyBold }]}>{tag}</Text>
          </View>
        ) : null}
      </View>
      <View style={[styles.tick, { borderColor: ink, backgroundColor: on ? stickers.yellowSoft : 'transparent' }]}>
        {on ? <Ionicons name="checkmark" size={18} color={ink} /> : null}
      </View>
    </Pressable>
  )

  return (
    <View style={{ gap: spacing.lg }}>
      <View>
        <Text style={[styles.eyebrow, { color: colors.textMuted }]}>What can they see?</Text>
        {cards.map((card) => (
          <Row
            key={card.id}
            sticker={CARD_STICKERS[card.id] ?? 'doc'}
            label={card.label}
            on={sharedIds.includes(card.id)}
            onPress={() => toggleCard(card.id)}
            tag={card.tier === 'intimate' ? 'sensitive' : undefined}
          />
        ))}
      </View>

      <View>
        <Text style={[styles.eyebrow, { color: colors.textMuted }]}>What can they do?</Text>
        {CAPABILITY_ROWS.map((cap) => (
          <Row key={cap.key} sticker={cap.sticker} label={cap.label} on={!!value[cap.key]} onPress={() => toggleCapability(cap.key)} />
        ))}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  eyebrow: { fontSize: 10, fontFamily: 'SpaceMono_400Regular', letterSpacing: 1.4, textTransform: 'uppercase', marginBottom: 4 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  rowLabelBlock: { flex: 1, flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  rowLabel: { fontSize: 14, flexShrink: 1 },
  tag: { borderWidth: 1.5, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 1 },
  tagText: { fontSize: 10, letterSpacing: 0.4, textTransform: 'uppercase' },
  tick: { width: 26, height: 26, borderRadius: 8, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
})
