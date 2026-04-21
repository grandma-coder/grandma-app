/**
 * Exam detail — full view of a single exam row with photo gallery, AI-extracted
 * fields, and a "Share with doctor" action (OS share sheet with formatted text).
 */

import { useState } from 'react'
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  Image,
  Alert,
  Share,
  ActivityIndicator,
  Dimensions,
  Modal,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { router, useLocalSearchParams } from 'expo-router'
import {
  ChevronLeft,
  Share2,
  Trash2,
  Calendar as CalendarIcon,
  User,
  Sparkles,
  X,
} from 'lucide-react-native'

import { useTheme, brand } from '../../constants/theme'
import { useChildStore } from '../../store/useChildStore'
import {
  type Exam,
  type ExamBehavior,
  useExam,
  useExamPhotoUrls,
  deleteExam,
  useInvalidateExams,
  formatExamDate,
  examBehaviorLabel,
} from '../../lib/examData'
import { Display, Body, MonoCaps } from '../../components/ui/Typography'
import { childColor } from '../../components/ui/ChildPills'

const BEHAVIOR_COLORS: Record<ExamBehavior, string> = {
  'pre-pregnancy': brand.prePregnancy,
  pregnancy: brand.pregnancy,
  kids: brand.kids,
}

const { width: SCREEN_W } = Dimensions.get('window')

export default function ExamDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { colors } = useTheme()
  const insets = useSafeAreaInsets()
  const children = useChildStore((s) => s.children)
  const invalidate = useInvalidateExams()

  const { data: exam, isLoading } = useExam(id)
  const signedUrls = useExamPhotoUrls(exam?.photos ?? [])
  const [viewerIndex, setViewerIndex] = useState<number | null>(null)
  const [deleting, setDeleting] = useState(false)

  if (isLoading || !exam) {
    return (
      <View style={[styles.root, styles.centered, { backgroundColor: colors.bg }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    )
  }

  const accent = BEHAVIOR_COLORS[exam.behavior]
  const child = exam.childId ? children.find((c) => c.id === exam.childId) : undefined
  const childIdx = child ? children.findIndex((c) => c.id === child.id) : -1

  async function handleShare(currentExam: Exam) {
    // Build a doctor-ready text summary. We deliberately do NOT include photo
    // URLs — photos live in a private bucket and their signed URLs expire.
    const lines: string[] = []
    lines.push(`Exam: ${currentExam.title}`)
    lines.push(`Date: ${formatExamDate(currentExam.examDate)}`)
    if (currentExam.provider) lines.push(`Provider: ${currentExam.provider}`)
    if (currentExam.result) lines.push(`Result: ${currentExam.result}`)
    if (currentExam.extracted?.referenceRange) lines.push(`Reference range: ${currentExam.extracted.referenceRange}`)
    if (currentExam.extracted?.flagged && currentExam.extracted.flagged.length > 0) {
      lines.push('')
      lines.push('Flagged findings:')
      for (const f of currentExam.extracted.flagged) lines.push(`  • ${f}`)
    }
    if (currentExam.notes) {
      lines.push('')
      lines.push('Notes:')
      lines.push(currentExam.notes)
    }
    if (currentExam.photos.length > 0) {
      lines.push('')
      lines.push(`(${currentExam.photos.length} photo${currentExam.photos.length === 1 ? '' : 's'} attached in app)`)
    }
    try {
      await Share.share({ message: lines.join('\n'), title: currentExam.title })
    } catch (e) {
      Alert.alert('Share failed', e instanceof Error ? e.message : 'Unknown error')
    }
  }

  function handleDelete(currentExam: Exam) {
    Alert.alert('Delete exam?', 'This removes the record and its photos.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setDeleting(true)
          try {
            await deleteExam(currentExam.id)
            invalidate()
            router.back()
          } catch (e) {
            Alert.alert('Delete failed', e instanceof Error ? e.message : 'Unknown error')
          } finally {
            setDeleting(false)
          }
        },
      },
    ])
  }

  const flagged = exam.extracted?.flagged ?? []

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      {/* Header */}
      <View style={[styles.headerWrap, { paddingTop: insets.top + 12 }]}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={styles.iconBtn}>
          <ChevronLeft size={24} color={colors.text} strokeWidth={2} />
        </Pressable>
        <View style={styles.headerTitle}>
          <MonoCaps size={10} color={accent}>{examBehaviorLabel(exam.behavior)}</MonoCaps>
        </View>
        <Pressable onPress={() => handleShare(exam)} hitSlop={10} style={styles.iconBtn}>
          <Share2 size={20} color={colors.text} strokeWidth={2} />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 120 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <View style={styles.hero}>
          <Display size={28} color={colors.text}>{exam.title}</Display>
          {exam.result && (
            <Text style={[styles.heroResult, { color: accent }]}>{exam.result}</Text>
          )}
          <View style={styles.metaChipRow}>
            <MetaChip icon={<CalendarIcon size={12} color={colors.textSecondary} strokeWidth={2} />} label={formatExamDate(exam.examDate)} colors={colors} />
            {exam.provider && (
              <MetaChip icon={<User size={12} color={colors.textSecondary} strokeWidth={2} />} label={exam.provider} colors={colors} />
            )}
            {child && childIdx >= 0 && (
              <View style={[styles.chip, { backgroundColor: childColor(childIdx) + '18', borderColor: childColor(childIdx) + '40' }]}>
                <Text style={[styles.chipText, { color: childColor(childIdx) }]}>{child.name}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Flagged */}
        {flagged.length > 0 && (
          <View style={[styles.flaggedBox, { backgroundColor: brand.error + '12', borderColor: brand.error + '30' }]}>
            <Text style={[styles.flaggedTitle, { color: brand.error }]}>Flagged findings</Text>
            {flagged.map((f, i) => (
              <Text key={i} style={[styles.flaggedItem, { color: colors.text }]}>• {f}</Text>
            ))}
            <Text style={[styles.flaggedNote, { color: colors.textMuted }]}>
              Discuss these with your doctor — this is not a diagnosis.
            </Text>
          </View>
        )}

        {/* Notes */}
        {exam.notes && (
          <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <MonoCaps size={10} color={colors.textMuted}>Notes</MonoCaps>
            <Body size={14} color={colors.text} style={{ marginTop: 6, lineHeight: 20 }}>
              {exam.notes}
            </Body>
          </View>
        )}

        {/* AI Extracted metadata */}
        {exam.extracted && (
          <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.sectionHead}>
              <Sparkles size={14} color={colors.primary} strokeWidth={2} />
              <MonoCaps size={10} color={colors.primary}>AI extracted</MonoCaps>
            </View>
            {exam.extracted.referenceRange && (
              <ExtractRow label="Reference range" value={exam.extracted.referenceRange} colors={colors} />
            )}
            {exam.extracted.examDate && (
              <ExtractRow label="Exam date (parsed)" value={exam.extracted.examDate} colors={colors} />
            )}
            {exam.extracted.provider && (
              <ExtractRow label="Provider" value={exam.extracted.provider} colors={colors} />
            )}
          </View>
        )}

        {/* Photos */}
        {exam.photos.length > 0 && (
          <View style={styles.photosSection}>
            <MonoCaps size={10} color={colors.textMuted} style={{ marginBottom: 8, paddingHorizontal: 4 }}>
              {exam.photos.length} {exam.photos.length === 1 ? 'photo' : 'photos'}
            </MonoCaps>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.photoStrip}
            >
              {exam.photos.map((path, i) => {
                const url = signedUrls[i]
                return (
                  <Pressable key={path} onPress={() => url && setViewerIndex(i)}>
                    <View style={[styles.photo, { backgroundColor: colors.surface }]}>
                      {url && <Image source={{ uri: url }} style={styles.photo} />}
                    </View>
                  </Pressable>
                )
              })}
            </ScrollView>
          </View>
        )}

        {/* Delete */}
        <Pressable
          onPress={() => handleDelete(exam)}
          disabled={deleting}
          style={({ pressed }) => [
            styles.deleteBtn,
            { borderColor: brand.error + '40', opacity: pressed ? 0.7 : 1 },
          ]}
        >
          <Trash2 size={16} color={brand.error} strokeWidth={2} />
          <Text style={[styles.deleteText, { color: brand.error }]}>Delete exam</Text>
        </Pressable>
      </ScrollView>

      {/* Full-screen photo viewer */}
      <Modal
        visible={viewerIndex !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setViewerIndex(null)}
      >
        <View style={styles.viewerRoot}>
          <Pressable onPress={() => setViewerIndex(null)} style={[styles.viewerClose, { top: insets.top + 12 }]}>
            <X size={22} color="#fff" strokeWidth={2.5} />
          </Pressable>
          {viewerIndex !== null && (
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              contentOffset={{ x: viewerIndex * SCREEN_W, y: 0 }}
            >
              {exam.photos.map((path, i) => {
                const url = signedUrls[i]
                return (
                  <View key={path} style={{ width: SCREEN_W, alignItems: 'center', justifyContent: 'center' }}>
                    {url && (
                      <Image source={{ uri: url }} style={{ width: SCREEN_W, height: '100%' }} resizeMode="contain" />
                    )}
                  </View>
                )
              })}
            </ScrollView>
          )}
        </View>
      </Modal>
    </View>
  )
}

// ─── Subcomponents ─────────────────────────────────────────────────────────

function MetaChip({
  icon,
  label,
  colors,
}: {
  icon: React.ReactNode
  label: string
  colors: ReturnType<typeof useTheme>['colors']
}) {
  return (
    <View style={[styles.chip, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      {icon}
      <Text style={[styles.chipText, { color: colors.textSecondary, marginLeft: 4 }]}>{label}</Text>
    </View>
  )
}

function ExtractRow({
  label,
  value,
  colors,
}: {
  label: string
  value: string
  colors: ReturnType<typeof useTheme>['colors']
}) {
  return (
    <View style={styles.extractRow}>
      <Text style={[styles.extractLabel, { color: colors.textMuted }]}>{label}</Text>
      <Text style={[styles.extractValue, { color: colors.text }]}>{value}</Text>
    </View>
  )
}

// ─── Styles ────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1 },
  centered: { alignItems: 'center', justifyContent: 'center' },
  headerWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 4,
  },
  iconBtn: { padding: 4 },
  headerTitle: { flex: 1, alignItems: 'center' },
  scroll: { paddingHorizontal: 16, paddingTop: 16 },
  hero: { marginBottom: 16, gap: 6 },
  heroResult: { fontSize: 20, fontWeight: '700', marginTop: 2 },
  metaChipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
  },
  chipText: { fontSize: 11, fontWeight: '600' },
  flaggedBox: { padding: 14, borderRadius: 16, borderWidth: 1, marginBottom: 12, gap: 4 },
  flaggedTitle: { fontSize: 13, fontWeight: '700', marginBottom: 4 },
  flaggedItem: { fontSize: 13, lineHeight: 18 },
  flaggedNote: { fontSize: 11, marginTop: 6, fontStyle: 'italic' },
  section: { padding: 14, borderRadius: 16, borderWidth: 1, marginBottom: 12 },
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  extractRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  extractLabel: { fontSize: 12, fontWeight: '600' },
  extractValue: { fontSize: 13, fontWeight: '600', flex: 1, textAlign: 'right', marginLeft: 12 },
  photosSection: { marginBottom: 14 },
  photoStrip: { gap: 10, paddingVertical: 4 },
  photo: { width: 120, height: 120, borderRadius: 14 },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 999,
    borderWidth: 1,
    marginTop: 12,
  },
  deleteText: { fontSize: 14, fontWeight: '700' },
  viewerRoot: { flex: 1, backgroundColor: 'rgba(0,0,0,0.95)' },
  viewerClose: {
    position: 'absolute',
    right: 16,
    zIndex: 10,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
})
