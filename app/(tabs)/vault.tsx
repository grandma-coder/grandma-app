import { useEffect } from 'react'
import { View, Text, ScrollView, StyleSheet } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useChildStore } from '../../store/useChildStore'
import { useVaultStore } from '../../store/useVaultStore'
import { getDocuments, getEmergencyCard } from '../../lib/vault'
import { CosmicBackground } from '../../components/ui/CosmicBackground'
import { EmergencyCard } from '../../components/vault/EmergencyCard'
import { DocumentSection, type DocumentItem } from '../../components/vault/DocumentSection'
import { VaccineRecord } from '../../components/vault/VaccineRecord'
import { DocumentUpload } from '../../components/vault/DocumentUpload'
import { colors, typography, spacing } from '../../constants/theme'

export default function Vault() {
  const insets = useSafeAreaInsets()
  const child = useChildStore((s) => s.activeChild)
  const { documents, emergencyCard, setDocuments, setEmergencyCard } = useVaultStore()

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

  const examDocs: DocumentItem[] = documents
    .filter((d) => d.category === 'exams')
    .map((d) => ({ id: d.id, title: d.title, fileType: d.fileType, fileSizeBytes: d.fileSizeBytes, createdAt: d.createdAt }))

  const hospitalDocs: DocumentItem[] = documents
    .filter((d) => d.category === 'hospital')
    .map((d) => ({ id: d.id, title: d.title, fileType: d.fileType, fileSizeBytes: d.fileSizeBytes, createdAt: d.createdAt }))

  const insuranceDocs: DocumentItem[] = documents
    .filter((d) => d.category === 'insurance')
    .map((d) => ({ id: d.id, title: d.title, fileType: d.fileType, fileSizeBytes: d.fileSizeBytes, createdAt: d.createdAt }))

  return (
    <CosmicBackground>
      <ScrollView
        contentContainerStyle={[
          styles.container,
          { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 40 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Vault</Text>
        <Text style={styles.subtitle}>
          Secure archives for your life's most vital documents.
        </Text>

        {/* Emergency Card */}
        <EmergencyCard
          data={emergencyCard ?? {}}
          childName={child?.name ?? 'Baby'}
        />

        {/* Vaccine Records */}
        <VaccineRecord vaccines={[]} />

        {/* Document Sections */}
        <DocumentSection
          title="Exams"
          description="Blood tests, radiology reports, and diagnostic results."
          icon="🔬"
          documents={examDocs}
        />

        <DocumentSection
          title="Hospital Records"
          description="Discharge summaries, surgical history, and clinic visits."
          icon="🏥"
          documents={hospitalDocs}
        />

        <DocumentSection
          title="Insurance"
          description="Policy documents, cards, and claim history."
          icon="🛡️"
          documents={insuranceDocs}
        />

        {/* Recent Documents */}
        {documents.length > 0 && (
          <View style={styles.recentSection}>
            <Text style={styles.sectionLabel}>RECENT DOCUMENTS</Text>
            {documents.slice(0, 5).map((doc) => (
              <View key={doc.id} style={styles.recentRow}>
                <Text style={styles.recentTitle} numberOfLines={1}>{doc.title}</Text>
                <Text style={styles.recentMeta}>
                  {doc.fileType?.toUpperCase()} · {new Date(doc.createdAt).toLocaleDateString()}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Upload */}
        <DocumentUpload />
      </ScrollView>
    </CosmicBackground>
  )
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing['2xl'],
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
  recentSection: {
    marginBottom: 20,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '900',
    color: colors.textTertiary,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  recentRow: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  recentTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
  },
  recentMeta: {
    fontSize: 11,
    color: colors.textTertiary,
  },
})
