import { useState } from 'react'
import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { GlassCard } from '../ui/GlassCard'
import { colors, borderRadius } from '../../constants/theme'

interface NannyNote {
  id: string
  authorName: string
  direction: 'parent_to_nanny' | 'nanny_to_parent'
  category: string
  content: string
  isRead: boolean
  createdAt: string
}

interface NannyNotesPanelProps {
  notes: NannyNote[]
  userRole: 'parent' | 'nanny' | 'family'
  onSendNote?: (content: string, category: string) => void
}

const CATEGORIES = [
  { id: 'schedule', label: 'Schedule', icon: '📅' },
  { id: 'nutrition', label: 'Nutrition', icon: '🥗' },
  { id: 'medication', label: 'Meds', icon: '💊' },
  { id: 'behavior', label: 'Behavior', icon: '😊' },
  { id: 'general', label: 'General', icon: '📝' },
]

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

export function NannyNotesPanel({ notes, userRole, onSendNote }: NannyNotesPanelProps) {
  const [draft, setDraft] = useState('')
  const [category, setCategory] = useState('general')

  function handleSend() {
    if (!draft.trim()) return
    onSendNote?.(draft.trim(), category)
    setDraft('')
  }

  const directionLabel =
    userRole === 'parent' ? 'Notes for Nanny' : 'Notes for Parents'

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>{directionLabel}</Text>

      {/* Category pills */}
      <View style={styles.categories}>
        {CATEGORIES.map((cat) => (
          <Pressable
            key={cat.id}
            onPress={() => setCategory(cat.id)}
            style={[styles.catPill, category === cat.id && styles.catPillActive]}
          >
            <Text style={styles.catIcon}>{cat.icon}</Text>
            <Text style={[styles.catLabel, category === cat.id && styles.catLabelActive]}>
              {cat.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Compose */}
      <View style={styles.composeRow}>
        <TextInput
          style={styles.input}
          placeholder="Write a note..."
          placeholderTextColor={colors.textTertiary}
          value={draft}
          onChangeText={setDraft}
          multiline
        />
        <Pressable
          onPress={handleSend}
          disabled={!draft.trim()}
          style={[styles.sendBtn, !draft.trim() && { opacity: 0.4 }]}
        >
          <Ionicons name="send" size={16} color={colors.textOnAccent} />
        </Pressable>
      </View>

      {/* Notes list */}
      {notes.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>
            No notes yet. Leave instructions or updates for your care team.
          </Text>
        </View>
      ) : (
        notes.map((note) => (
          <GlassCard key={note.id} style={styles.noteCard}>
            <View style={styles.noteHeader}>
              <Text style={styles.noteName}>{note.authorName}</Text>
              <Text style={styles.noteTime}>{timeAgo(note.createdAt)}</Text>
            </View>
            <Text style={styles.noteContent}>{note.content}</Text>
            <View style={styles.noteFooter}>
              <View style={styles.noteTag}>
                <Text style={styles.noteTagText}>{note.category}</Text>
              </View>
              {note.direction === 'nanny_to_parent' && (
                <View style={[styles.noteTag, styles.noteTagNanny]}>
                  <Text style={styles.noteTagText}>from nanny</Text>
                </View>
              )}
            </View>
          </GlassCard>
        ))
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12,
  },
  categories: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
  },
  catPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surfaceGlass,
    borderWidth: 1,
    borderColor: colors.border,
  },
  catPillActive: {
    borderColor: colors.accent,
    backgroundColor: colors.accentMuted,
  },
  catIcon: {
    fontSize: 12,
  },
  catLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textTertiary,
  },
  catLabelActive: {
    color: colors.accent,
  },
  composeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  input: {
    flex: 1,
    backgroundColor: colors.surfaceGlass,
    borderRadius: borderRadius.md,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
    maxHeight: 80,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-end',
  },
  empty: {
    paddingVertical: 16,
  },
  emptyText: {
    fontSize: 13,
    color: colors.textTertiary,
    textAlign: 'center',
  },
  noteCard: {
    marginBottom: 8,
  },
  noteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  noteName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  noteTime: {
    fontSize: 11,
    color: colors.textTertiary,
  },
  noteContent: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: 8,
  },
  noteFooter: {
    flexDirection: 'row',
    gap: 6,
  },
  noteTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.surfaceGlass,
    borderWidth: 1,
    borderColor: colors.border,
  },
  noteTagNanny: {
    backgroundColor: 'rgba(196, 181, 253, 0.15)',
    borderColor: 'rgba(196, 181, 253, 0.3)',
  },
  noteTagText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
})
