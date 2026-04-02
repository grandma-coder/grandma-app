import { useState } from 'react'
import { View, Text, Pressable, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { GlassCard } from '../ui/GlassCard'
import { colors, borderRadius } from '../../constants/theme'

export interface DocumentItem {
  id: string
  title: string
  fileType?: string
  fileSizeBytes?: number
  createdAt: string
}

interface DocumentSectionProps {
  title: string
  description: string
  icon: string
  documents: DocumentItem[]
  onViewDocument?: (doc: DocumentItem) => void
  onAddDocument?: () => void
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / 1048576).toFixed(1)} MB`
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

export function DocumentSection({
  title,
  description,
  icon,
  documents,
  onViewDocument,
  onAddDocument,
}: DocumentSectionProps) {
  const [expanded, setExpanded] = useState(false)

  return (
    <GlassCard style={styles.container}>
      <Pressable onPress={() => setExpanded(!expanded)} style={styles.header}>
        <View style={styles.iconCircle}>
          <Text style={styles.icon}>{icon}</Text>
        </View>
        <View style={styles.headerText}>
          <View style={styles.titleRow}>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.count}>{documents.length} Files</Text>
          </View>
          <Text style={styles.description} numberOfLines={expanded ? undefined : 1}>
            {description}
          </Text>
        </View>
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={18}
          color={colors.textTertiary}
        />
      </Pressable>

      {expanded && (
        <View style={styles.body}>
          {documents.length === 0 ? (
            <Text style={styles.emptyText}>No documents yet</Text>
          ) : (
            documents.map((doc) => (
              <Pressable
                key={doc.id}
                onPress={() => onViewDocument?.(doc)}
                style={styles.docRow}
              >
                <Ionicons name="document-outline" size={18} color={colors.textSecondary} />
                <View style={styles.docInfo}>
                  <Text style={styles.docTitle} numberOfLines={1}>{doc.title}</Text>
                  <Text style={styles.docMeta}>
                    {doc.fileType?.toUpperCase()}
                    {doc.fileSizeBytes ? ` · ${formatSize(doc.fileSizeBytes)}` : ''}
                    {` · ${formatDate(doc.createdAt)}`}
                  </Text>
                </View>
                <Ionicons name="download-outline" size={18} color={colors.textTertiary} />
              </Pressable>
            ))
          )}

          {onAddDocument && (
            <Pressable onPress={onAddDocument} style={styles.addBtn}>
              <Ionicons name="add" size={16} color={colors.accent} />
              <Text style={styles.addText}>Add Document</Text>
            </Pressable>
          )}
        </View>
      )}
    </GlassCard>
  )
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surfaceGlass,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  icon: {
    fontSize: 20,
  },
  headerText: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  count: {
    fontSize: 12,
    color: colors.textTertiary,
  },
  description: {
    fontSize: 12,
    color: colors.textTertiary,
    marginTop: 2,
    lineHeight: 16,
  },
  body: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  emptyText: {
    fontSize: 13,
    color: colors.textTertiary,
    textAlign: 'center',
    paddingVertical: 8,
  },
  docRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  docInfo: {
    flex: 1,
  },
  docTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  docMeta: {
    fontSize: 11,
    color: colors.textTertiary,
    marginTop: 2,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    marginTop: 8,
  },
  addText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.accent,
  },
})
