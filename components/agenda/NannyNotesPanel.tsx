import { useState } from 'react'
import {
  View, Text, TextInput, Pressable, Modal, ScrollView, StyleSheet,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { GlassCard } from '../ui/GlassCard'
import { colors, THEME_COLORS, borderRadius, shadows } from '../../constants/theme'

export interface NoteEntry {
  id: string
  authorName: string
  authorRole: string
  topic: string
  content: string
  createdAt: string
}

interface NotesPanelProps {
  notes: NoteEntry[]
  onAddNote?: (content: string, topic: string) => void
}

const TOPICS = [
  { id: 'food', label: 'Food', icon: 'restaurant-outline', color: THEME_COLORS.green },
  { id: 'vaccine', label: 'Vaccine', icon: 'medkit-outline', color: THEME_COLORS.pink },
  { id: 'activity', label: 'Activity', icon: 'body-outline', color: THEME_COLORS.blue },
  { id: 'health', label: 'Health', icon: 'heart-outline', color: THEME_COLORS.orange },
  { id: 'reminder', label: 'Reminder', icon: 'alarm-outline', color: THEME_COLORS.yellow },
  { id: 'general', label: 'General', icon: 'document-text-outline', color: THEME_COLORS.purple },
]

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

export function NotesPanel({ notes, onAddNote }: NotesPanelProps) {
  const [showCompose, setShowCompose] = useState(false)
  const [selectedTopic, setSelectedTopic] = useState('general')
  const [noteText, setNoteText] = useState('')

  function handleSubmit() {
    if (!noteText.trim()) return
    onAddNote?.(noteText.trim(), selectedTopic)
    setNoteText('')
    setSelectedTopic('general')
    setShowCompose(false)
  }

  const selectedTopicData = TOPICS.find((t) => t.id === selectedTopic)!

  return (
    <View style={styles.container}>
      {/* Add Note button */}
      <Pressable
        onPress={() => setShowCompose(true)}
        style={({ pressed }) => [styles.addButton, pressed && { transform: [{ scale: 0.97 }] }]}
      >
        <Ionicons name="add-circle-outline" size={20} color={THEME_COLORS.yellow} />
        <Text style={styles.addButtonText}>Add Note</Text>
      </Pressable>

      {/* Notes list */}
      {notes.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="document-text-outline" size={40} color={colors.textTertiary} />
          <Text style={styles.emptyTitle}>No notes yet</Text>
          <Text style={styles.emptyDesc}>
            Add notes about food, vaccines, activities, health, or reminders. All caregivers can see and contribute.
          </Text>
        </View>
      ) : (
        notes.map((note) => {
          const topic = TOPICS.find((t) => t.id === note.topic) ?? TOPICS[5]
          return (
            <GlassCard key={note.id} style={styles.noteCard}>
              {/* Header */}
              <View style={styles.noteHeader}>
                <View style={[styles.noteTopicDot, { backgroundColor: topic.color }]} />
                <Text style={styles.noteTopicLabel}>{topic.label}</Text>
                <View style={{ flex: 1 }} />
                <Text style={styles.noteTime}>{timeAgo(note.createdAt)}</Text>
              </View>
              {/* Content */}
              <Text style={styles.noteContent}>{note.content}</Text>
              {/* Author */}
              <Text style={styles.noteAuthor}>
                {note.authorName} · {note.authorRole}
              </Text>
            </GlassCard>
          )
        })
      )}

      {/* ─── Compose Modal ─── */}
      <Modal visible={showCompose} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            {/* Handle bar */}
            <View style={styles.modalHandle} />

            <Text style={styles.modalTitle}>New Note</Text>
            <Text style={styles.modalSubtitle}>
              Select a topic and write your note
            </Text>

            {/* Topic selector */}
            <Text style={styles.modalLabel}>TOPIC</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.topicRow}
            >
              {TOPICS.map((topic) => {
                const isActive = selectedTopic === topic.id
                return (
                  <Pressable
                    key={topic.id}
                    onPress={() => setSelectedTopic(topic.id)}
                    style={[
                      styles.topicChip,
                      isActive && { borderColor: topic.color, backgroundColor: topic.color + '15' },
                    ]}
                  >
                    <Ionicons
                      name={topic.icon as any}
                      size={16}
                      color={isActive ? topic.color : colors.textTertiary}
                    />
                    <Text style={[styles.topicChipText, isActive && { color: topic.color }]}>
                      {topic.label}
                    </Text>
                  </Pressable>
                )
              })}
            </ScrollView>

            {/* Note text area */}
            <Text style={styles.modalLabel}>NOTE</Text>
            <TextInput
              style={styles.textArea}
              selectionColor={THEME_COLORS.blue}
              placeholder="Write your note here..."
              placeholderTextColor={colors.textTertiary}
              value={noteText}
              onChangeText={setNoteText}
              multiline
              textAlignVertical="top"
            />

            {/* Actions */}
            <View style={styles.modalActions}>
              <Pressable
                onPress={() => setShowCompose(false)}
                style={styles.cancelButton}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={handleSubmit}
                style={[styles.submitButton, !noteText.trim() && { opacity: 0.5 }]}
                disabled={!noteText.trim()}
              >
                <Text style={styles.submitText}>Add Note</Text>
                <Ionicons name="send" size={16} color={colors.textOnAccent} />
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {},

  // Add button
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 56,
    borderRadius: borderRadius.full,
    borderWidth: 2,
    borderColor: THEME_COLORS.yellow,
    borderStyle: 'dashed',
    marginBottom: 20,
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: '800',
    color: THEME_COLORS.yellow,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },

  // Empty
  empty: {
    alignItems: 'center',
    paddingVertical: 32,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: colors.textSecondary,
    textTransform: 'uppercase',
  },
  emptyDesc: {
    fontSize: 13,
    color: colors.textTertiary,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 16,
  },

  // Note cards
  noteCard: {
    marginBottom: 10,
  },
  noteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  noteTopicDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  noteTopicLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.text,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  noteTime: {
    fontSize: 11,
    color: colors.textTertiary,
  },
  noteContent: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.textSecondary,
    lineHeight: 22,
    marginBottom: 8,
  },
  noteAuthor: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    paddingHorizontal: 24,
    paddingBottom: 40,
    maxHeight: '85%',
  },
  modalHandle: {
    width: 48,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.border,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: colors.text,
    textTransform: 'uppercase',
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textSecondary,
    marginBottom: 24,
  },
  modalLabel: {
    fontSize: 10,
    fontWeight: '900',
    color: colors.textTertiary,
    letterSpacing: 3,
    textTransform: 'uppercase',
    marginBottom: 10,
  },

  // Topic chips
  topicRow: {
    flexDirection: 'row',
    gap: 8,
    paddingBottom: 20,
  },
  topicChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: borderRadius.full,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surfaceGlass,
  },
  topicChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textTertiary,
    textTransform: 'uppercase',
  },

  // Text area
  textArea: {
    backgroundColor: colors.surfaceGlass,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    padding: 20,
    fontSize: 16,
    fontWeight: '500',
    color: colors.text,
    minHeight: 140,
    marginBottom: 24,
  },

  // Actions
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    height: 56,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.textSecondary,
    textTransform: 'uppercase',
  },
  submitButton: {
    flex: 2,
    height: 56,
    borderRadius: borderRadius.full,
    backgroundColor: THEME_COLORS.yellow,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    ...shadows.glow,
  },
  submitText: {
    fontSize: 14,
    fontWeight: '900',
    color: colors.textOnAccent,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
})
