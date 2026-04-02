import { useEffect, useState } from 'react'
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useChildStore } from '../../store/useChildStore'
import { useVaultStore } from '../../store/useVaultStore'
import { getDocuments, getEmergencyCard } from '../../lib/vault'
import { CosmicBackground } from '../../components/ui/CosmicBackground'
import { colors, THEME_COLORS, borderRadius, shadows, spacing, typography } from '../../constants/theme'

type SectionKey = 'exams' | 'hospital' | 'insurance'

export default function Vault() {
  const insets = useSafeAreaInsets()
  const child = useChildStore((s) => s.activeChild)
  const { documents, emergencyCard, setDocuments, setEmergencyCard } = useVaultStore()
  const [expanded, setExpanded] = useState<Record<SectionKey, boolean>>({
    exams: false,
    hospital: false,
    insurance: false,
  })

  useEffect(() => {
    if (!child?.id) return

    getDocuments(child.id).then(setDocuments).catch(() => {})
    getEmergencyCard(child.id).then((data) => {
      if (data) {
        setEmergencyCard({
          bloodType: data.blood_type,
          allergies: data.allergies,
          medicalConditions: data.medical_conditions,
          primaryContactName: data.primary_contact_name,
          primaryContactPhone: data.primary_contact_phone,
          pediatricianName: data.pediatrician_name,
          pediatricianPhone: data.pediatrician_phone,
        })
      }
    }).catch(() => {})
  }, [child?.id])

  const countByCategory = (cat: string) => documents.filter((d) => d.category === cat).length

  const toggleSection = (key: SectionKey) => {
    setExpanded((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const sections: {
    key: SectionKey
    title: string
    description: string
    icon: keyof typeof Ionicons.glyphMap
    color: string
  }[] = [
    {
      key: 'exams',
      title: 'Exams & Lab Results',
      description: 'Blood tests, radiology reports, and diagnostic results.',
      icon: 'clipboard-outline',
      color: THEME_COLORS.pink,
    },
    {
      key: 'hospital',
      title: 'Hospital Records',
      description: 'Discharge summaries, surgical history, and clinic visits.',
      icon: 'business-outline',
      color: THEME_COLORS.green,
    },
    {
      key: 'insurance',
      title: 'Insurance & Coverage',
      description: 'Policy documents, cards, and claim history.',
      icon: 'document-text-outline',
      color: THEME_COLORS.orange,
    },
  ]

  return (
    <CosmicBackground>
      <ScrollView
        contentContainerStyle={[
          styles.container,
          { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 40 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <Text style={styles.label}>SECURE ARCHIVES</Text>
        <Text style={styles.title}>Vault</Text>
        <Text style={styles.subtitle}>
          Secure archives for your life's most vital documents.
        </Text>

        {/* Emergency Card — Blue solid background */}
        <View style={styles.emergencyCard}>
          <View style={styles.emergencyHeader}>
            <View style={styles.emergencyIconWrap}>
              <Ionicons name="shield-checkmark" size={28} color="#FFFFFF" />
            </View>
            <View style={styles.emergencyBadge}>
              <Text style={styles.emergencyBadgeText}>CRUCIAL MEDICAL PROFILE</Text>
            </View>
          </View>
          <Text style={styles.emergencyTitle}>
            {child?.name ?? 'Baby'}'s Emergency Card
          </Text>
          <Text style={styles.emergencyDesc}>
            Critical health information for emergencies. Accessible offline for caregivers and first responders.
          </Text>
        </View>

        {/* Vaccine Records — Empty state */}
        <View style={styles.vaccineCard}>
          <Ionicons name="snow-outline" size={40} color={colors.textTertiary} />
          <Text style={styles.vaccineTitle}>Vaccine Records</Text>
          <Text style={styles.vaccineDesc}>
            No vaccines recorded yet. Add your child's immunization history.
          </Text>
        </View>

        {/* Expandable sections */}
        {sections.map((section) => {
          const count = countByCategory(section.key)
          return (
            <Pressable
              key={section.key}
              style={styles.sectionCard}
              onPress={() => toggleSection(section.key)}
            >
              <View style={styles.sectionRow}>
                <View style={[styles.sectionIconWrap, { backgroundColor: section.color }]}>
                  <Ionicons name={section.icon} size={20} color="#0A0A0A" />
                </View>
                <View style={styles.sectionContent}>
                  <Text style={styles.sectionTitle}>{section.title}</Text>
                  <Text style={styles.sectionDesc}>{section.description}</Text>
                  <Text style={styles.sectionFileCount}>{count} FILES</Text>
                </View>
                <Ionicons
                  name={expanded[section.key] ? 'chevron-up' : 'chevron-down'}
                  size={20}
                  color={colors.textTertiary}
                />
              </View>
              {expanded[section.key] && (
                <View style={styles.sectionExpanded}>
                  {count === 0 ? (
                    <Text style={styles.sectionEmptyText}>No files uploaded yet.</Text>
                  ) : (
                    documents
                      .filter((d) => d.category === section.key)
                      .map((doc) => (
                        <View key={doc.id} style={styles.docRow}>
                          <Text style={styles.docTitle} numberOfLines={1}>{doc.title}</Text>
                          <Text style={styles.docMeta}>
                            {doc.fileType?.toUpperCase()} · {new Date(doc.createdAt).toLocaleDateString()}
                          </Text>
                        </View>
                      ))
                  )}
                </View>
              )}
            </Pressable>
          )
        })}

        {/* Upload section */}
        <View style={styles.uploadCard}>
          <View style={styles.uploadIconWrap}>
            <Ionicons name="cloud-upload-outline" size={32} color="#0A0A0A" />
          </View>
          <Text style={styles.uploadTitle}>Secure New Document</Text>
          <Text style={styles.uploadDesc}>
            Upload medical records, insurance cards, or any vital document.
          </Text>

          <View style={styles.uploadActions}>
            <Pressable style={styles.uploadActionBtn}>
              <Ionicons name="camera-outline" size={18} color={colors.text} />
              <Text style={styles.uploadActionText}>Scan</Text>
            </Pressable>
            <Pressable style={styles.uploadActionBtn}>
              <Ionicons name="arrow-up-circle-outline" size={18} color={colors.text} />
              <Text style={styles.uploadActionText}>Upload</Text>
            </Pressable>
          </View>

          <Pressable style={styles.addRecordBtn}>
            <Text style={styles.addRecordText}>Add Record</Text>
          </Pressable>
        </View>
      </ScrollView>
    </CosmicBackground>
  )
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing['2xl'],
  },
  label: {
    ...typography.label,
    marginBottom: 8,
  },
  title: {
    ...typography.heading,
    fontWeight: '900',
    marginBottom: 4,
  },
  subtitle: {
    ...typography.bodySecondary,
    marginBottom: 24,
  },

  // Emergency Card
  emergencyCard: {
    backgroundColor: THEME_COLORS.blue,
    borderRadius: borderRadius['2xl'],
    padding: 24,
    marginBottom: 16,
    ...shadows.glowBlue,
  },
  emergencyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  emergencyIconWrap: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.sm,
    backgroundColor: 'rgba(0,0,0,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emergencyBadge: {
    backgroundColor: '#0A0A0A',
    borderRadius: borderRadius.full,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  emergencyBadgeText: {
    fontSize: 10,
    fontWeight: '900',
    color: THEME_COLORS.blue,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  emergencyTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#FFFFFF',
    textTransform: 'uppercase',
    letterSpacing: -0.3,
    marginBottom: 8,
  },
  emergencyDesc: {
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.8)',
    lineHeight: 20,
  },

  // Vaccine Records
  vaccineCard: {
    backgroundColor: colors.surfaceGlass,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 32,
    alignItems: 'center',
    marginBottom: 16,
  },
  vaccineTitle: {
    ...typography.subtitle,
    marginTop: 12,
    marginBottom: 6,
  },
  vaccineDesc: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },

  // Expandable Sections
  sectionCard: {
    backgroundColor: colors.surfaceGlass,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 20,
    marginBottom: 12,
  },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  sectionIconWrap: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionContent: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    marginBottom: 2,
  },
  sectionDesc: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.textSecondary,
    marginBottom: 4,
  },
  sectionFileCount: {
    fontSize: 10,
    fontWeight: '900',
    color: colors.textTertiary,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  sectionExpanded: {
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 12,
  },
  sectionEmptyText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.textTertiary,
    textAlign: 'center',
  },
  docRow: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  docTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
  },
  docMeta: {
    fontSize: 11,
    color: colors.textTertiary,
  },

  // Upload Section
  uploadCard: {
    backgroundColor: colors.surfaceGlass,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 24,
    alignItems: 'center',
    marginTop: 8,
  },
  uploadIconWrap: {
    width: 64,
    height: 64,
    borderRadius: borderRadius.full,
    backgroundColor: THEME_COLORS.yellow,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    ...shadows.glow,
  },
  uploadTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: colors.text,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  uploadDesc: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  uploadActions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
    width: '100%',
  },
  uploadActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 14,
  },
  uploadActionText: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.text,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  addRecordBtn: {
    backgroundColor: THEME_COLORS.yellow,
    borderRadius: borderRadius.full,
    paddingHorizontal: 32,
    paddingVertical: 16,
    ...shadows.glow,
  },
  addRecordText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#0A0A0A',
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
})
