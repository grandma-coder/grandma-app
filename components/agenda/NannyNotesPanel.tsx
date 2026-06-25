import { useState, useMemo } from 'react'
import {
  View, Text, TextInput, Pressable, Modal, ScrollView, StyleSheet,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { PaperCard } from '../ui/PaperCard'
import { brand, stickers, borderRadius, shadows, useTheme, font } from '../../constants/theme'
import { useTranslation } from '../../lib/i18n'

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

const TOPIC_DEFS = [
  { id: 'food', labelKey: 'kids_nannyNotes_topicFood' as const, icon: 'restaurant-outline', color: stickers.green },
  { id: 'vaccine', labelKey: 'kids_nannyNotes_topicVaccine' as const, icon: 'medkit-outline', color: brand.prePregnancy },
  { id: 'activity', labelKey: 'kids_nannyNotes_topicActivity' as const, icon: 'body-outline', color: brand.kids },
  { id: 'health', labelKey: 'kids_nannyNotes_topicHealth' as const, icon: 'heart-outline', color: stickers.coral },
  { id: 'reminder', labelKey: 'kids_nannyNotes_topicReminder' as const, icon: 'alarm-outline', color: stickers.yellow },
  { id: 'general', labelKey: 'kids_nannyNotes_topicGeneral' as const, icon: 'document-text-outline', color: brand.pregnancy },
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
  const { colors } = useTheme()
  const { t } = useTranslation()
  const styles = useMemo(() => makeStyles(colors), [colors])
  const [showCompose, setShowCompose] = useState(false)
  const [selectedTopic, setSelectedTopic] = useState('general')
  const [noteText, setNoteText] = useState('')

  const TOPICS = TOPIC_DEFS.map((d) => ({ ...d, label: t(d.labelKey) }))

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
        <Ionicons name="add-circle-outline" size={20} color={stickers.yellow} />
        <Text style={styles.addButtonText}>{t('kids_nannyNotes_addNote')}</Text>
      </Pressable>

      {/* Notes list */}
      {notes.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="document-text-outline" size={40} color={colors.textMuted} />
          <Text style={styles.emptyTitle}>{t('kids_nannyNotes_emptyTitle')}</Text>
          <Text style={styles.emptyDesc}>
            Add notes about food, vaccines, activities, health, or reminders. All caregivers can see and contribute.
          </Text>
        </View>
      ) : (
        notes.map((note) => {
          const topic = TOPICS.find((t) => t.id === note.topic) ?? TOPICS[5]
          return (
            <PaperCard radius={28} padding={20} key={note.id} style={styles.noteCard}>
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
            </PaperCard>
          )
        })
      )}

      {/* ─── Compose Modal ─── */}
      <Modal visible={showCompose} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            {/* Handle bar */}
            <View style={styles.modalHandle} />

            <Text style={styles.modalTitle}>{t('kids_nannyNotes_newNote')}</Text>
            <Text style={styles.modalSubtitle}>
              {t('kids_nannyNotes_subtitle')}
            </Text>

            {/* Topic selector */}
            <Text style={styles.modalLabel}>{t('kids_nannyNotes_topicLabel')}</Text>
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
                      color={isActive ? topic.color : colors.textMuted}
                    />
                    <Text style={[styles.topicChipText, isActive && { color: topic.color }]}>
                      {topic.label}
                    </Text>
                  </Pressable>
                )
              })}
            </ScrollView>

            {/* Note text area */}
            <Text style={styles.modalLabel}>{t('kids_nannyNotes_noteLabel')}</Text>
            <TextInput
              style={styles.textArea}
              selectionColor={brand.kids}
              placeholder={t('kids_nannyNotes_placeholder')}
              placeholderTextColor={colors.textMuted}
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
                <Text style={styles.cancelText}>{t('kids_logForm_cancel')}</Text>
              </Pressable>
              <Pressable
                onPress={handleSubmit}
                style={[styles.submitButton, !noteText.trim() && { opacity: 0.5 }]}
                disabled={!noteText.trim()}
              >
                <Text style={styles.submitText}>{t('kids_nannyNotes_addNote')}</Text>
                <Ionicons name="send" size={16} color={colors.textInverse} />
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  )
}

const makeStyles = (colors: ReturnType<typeof useTheme>['colors']) => StyleSheet.create({
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
    borderColor: stickers.yellow,
    borderStyle: 'dashed',
    marginBottom: 20,
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: '800',
    color: stickers.yellow,
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
    color: colors.textMuted,
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
    color: colors.textMuted,
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
    color: colors.textMuted,
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
    marginBottom: 4, fontFamily: font.display },
  modalSubtitle: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textSecondary,
    marginBottom: 24,
  },
  modalLabel: {
    fontSize: 10,
    fontWeight: '900',
    color: colors.textMuted,
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
    color: colors.textMuted,
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
    backgroundColor: stickers.yellow,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    ...shadows.pop,
  },
  submitText: {
    fontSize: 14,
    fontWeight: '900',
    color: colors.textInverse,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
})
