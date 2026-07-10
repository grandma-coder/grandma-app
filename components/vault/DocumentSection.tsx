import { useState } from 'react'
import { View, Text, Pressable, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { FileText, Download, ChevronUp, ChevronDown } from 'lucide-react-native'
import { PaperCard } from '../ui/PaperCard'
import { useTheme, useDiffuseTheme, diffuseFont } from '../../constants/theme'
import { useIsDiffuse, DiffuseArrow } from '../ui/diffuse/DiffuseKit'
import { DiffuseBloomIcon } from '../ui/diffuse/DiffusePrimitives'
import { useTranslation } from '../../lib/i18n'

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
  const { colors } = useTheme()
  const dt = useDiffuseTheme()
  const diffuse = useIsDiffuse()
  const { t } = useTranslation()
  const [expanded, setExpanded] = useState(false)

  return (
    <PaperCard
      radius={28}
      padding={20}
      style={styles.container}
      {...(diffuse ? { flat: true, tint: dt.colors.surface, borderColor: dt.colors.line } : {})}
    >
      <Pressable onPress={() => setExpanded(!expanded)} style={styles.header}>
        {diffuse ? (
          <DiffuseBloomIcon color={dt.colors.ink3} size={40} intensity={0.4}>
            <Text style={styles.icon}>{icon}</Text>
          </DiffuseBloomIcon>
        ) : (
          <View style={[styles.iconCircle, { backgroundColor: colors.surfaceGlass, borderColor: colors.border }]}>
            <Text style={styles.icon}>{icon}</Text>
          </View>
        )}
        <View style={styles.headerText}>
          <View style={styles.titleRow}>
            <Text
              style={[
                styles.title,
                diffuse
                  ? { color: dt.colors.ink, fontFamily: diffuseFont.display, fontWeight: '400', fontSize: 17, letterSpacing: -0.3 }
                  : { color: colors.text },
              ]}
            >
              {title}
            </Text>
            <Text
              style={[
                styles.count,
                diffuse
                  ? { color: dt.colors.ink3, fontFamily: diffuseFont.mono, letterSpacing: 1, textTransform: 'uppercase', fontSize: 10 }
                  : { color: colors.textMuted },
              ]}
            >
              {t('vault_filesCount', { count: documents.length })}
            </Text>
          </View>
          <Text
            style={[
              styles.description,
              diffuse ? { color: dt.colors.ink3, fontFamily: diffuseFont.body } : { color: colors.textMuted },
            ]}
            numberOfLines={expanded ? undefined : 1}
          >
            {description}
          </Text>
        </View>
        {diffuse ? (
          expanded ? (
            <ChevronUp size={18} color={dt.colors.ink3} strokeWidth={1.8} />
          ) : (
            <ChevronDown size={18} color={dt.colors.ink3} strokeWidth={1.8} />
          )
        ) : (
          <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={18} color={colors.textMuted} />
        )}
      </Pressable>

      {expanded && (
        <View style={[styles.body, { borderTopColor: diffuse ? dt.colors.line : colors.border }]}>
          {documents.length === 0 ? (
            <Text
              style={[
                styles.emptyText,
                diffuse
                  ? { color: dt.colors.ink3, fontFamily: diffuseFont.body }
                  : { color: colors.textMuted },
              ]}
            >
              {t('vault_noDocuments2')}
            </Text>
          ) : (
            documents.map((doc) => (
              <Pressable
                key={doc.id}
                onPress={() => onViewDocument?.(doc)}
                style={[styles.docRow, { borderBottomColor: diffuse ? dt.colors.line : colors.border }]}
              >
                {diffuse ? (
                  <FileText size={18} color={dt.colors.ink3} strokeWidth={1.8} />
                ) : (
                  <Ionicons name="document-outline" size={18} color={colors.textSecondary} />
                )}
                <View style={styles.docInfo}>
                  <Text
                    style={[
                      styles.docTitle,
                      diffuse
                        ? { color: dt.colors.ink, fontFamily: diffuseFont.bodySemiBold }
                        : { color: colors.text },
                    ]}
                    numberOfLines={1}
                  >
                    {doc.title}
                  </Text>
                  <Text
                    style={[
                      styles.docMeta,
                      diffuse
                        ? { color: dt.colors.ink3, fontFamily: diffuseFont.mono, letterSpacing: 0.8, textTransform: 'uppercase' }
                        : { color: colors.textMuted },
                    ]}
                  >
                    {doc.fileType?.toUpperCase()}
                    {doc.fileSizeBytes ? ` · ${formatSize(doc.fileSizeBytes)}` : ''}
                    {` · ${formatDate(doc.createdAt)}`}
                  </Text>
                </View>
                {diffuse ? (
                  <Download size={18} color={dt.colors.ink3} strokeWidth={1.8} />
                ) : (
                  <Ionicons name="download-outline" size={18} color={colors.textMuted} />
                )}
              </Pressable>
            ))
          )}

          {onAddDocument && (
            <Pressable onPress={onAddDocument} style={[styles.addBtn, diffuse && styles.addBtnDiffuse]}>
              {diffuse ? (
                <>
                  <Text style={[styles.addTextDiffuse, { color: dt.colors.ink }]}>{t('vault_addDocument')}</Text>
                  <DiffuseArrow color={dt.colors.ink3} size={16} />
                </>
              ) : (
                <>
                  <Ionicons name="add" size={16} color={colors.accent} />
                  <Text style={[styles.addText, { color: colors.accent }]}>{t('vault_addDocument')}</Text>
                </>
              )}
            </Pressable>
          )}
        </View>
      )}
    </PaperCard>
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
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
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
  },
  count: {
    fontSize: 12,
  },
  description: {
    fontSize: 12,
    marginTop: 2,
    lineHeight: 16,
  },
  body: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
  },
  emptyText: {
    fontSize: 13,
    textAlign: 'center',
    paddingVertical: 8,
  },
  docRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  docInfo: {
    flex: 1,
  },
  docTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  docMeta: {
    fontSize: 11,
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
  addBtnDiffuse: {
    gap: 8,
  },
  addText: {
    fontSize: 13,
    fontWeight: '600',
  },
  addTextDiffuse: {
    fontSize: 12,
    fontFamily: diffuseFont.mono,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
  },
})
