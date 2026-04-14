/**
 * Emergency Contacts & Insurance — profile sub-screen.
 *
 * Two sections:
 * 1. Emergency contacts — add/edit/delete contacts with phone, relationship, primary flag
 * 2. Insurance plans — add/edit/delete health/dental/vision plans
 *
 * Follows the account.tsx / personal.tsx UI pattern.
 */

import { useState, useCallback } from 'react'
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  Alert,
  Modal,
  StyleSheet,
  Platform,
  KeyboardAvoidingView,
  ActivityIndicator,
} from 'react-native'
import { router, useFocusEffect } from 'expo-router'
import {
  ArrowLeft,
  Phone,
  Mail,
  User,
  Heart,
  Shield,
  Plus,
  Trash2,
  Edit3,
  Star,
  X,
  ChevronDown,
  Building2,
  CreditCard,
  FileText,
  Users,
  Camera,
  ImageIcon,
} from 'lucide-react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme, brand } from '../../constants/theme'

/** Neon orange — insurance accent per design system */
const INSURANCE_ORANGE = '#FF6B35'
import { useEmergencyInsuranceStore } from '../../store/useEmergencyInsuranceStore'
import {
  getEmergencyContacts,
  upsertEmergencyContact,
  deleteEmergencyContact,
  getInsurancePlans,
  upsertInsurancePlan,
  deleteInsurancePlan,
  type EmergencyContact,
  type InsurancePlan,
  type ContactRelationship,
  type InsurancePlanType,
  pickAndScanInsuranceCard,
  type ScannedCardData,
} from '../../lib/emergencyInsurance'

// ─── Constants ──────────────────────────────────────────────────────────────

const RELATIONSHIPS: { id: ContactRelationship; label: string }[] = [
  { id: 'spouse', label: 'Spouse / Partner' },
  { id: 'parent', label: 'Parent' },
  { id: 'sibling', label: 'Sibling' },
  { id: 'friend', label: 'Friend' },
  { id: 'doctor', label: 'Doctor' },
  { id: 'neighbor', label: 'Neighbor' },
  { id: 'other', label: 'Other' },
]

const PLAN_TYPES: { id: InsurancePlanType; label: string; icon: typeof Shield }[] = [
  { id: 'health', label: 'Health', icon: Shield },
  { id: 'dental', label: 'Dental', icon: Shield },
  { id: 'vision', label: 'Vision', icon: Shield },
]

function relationshipLabel(r: ContactRelationship): string {
  return RELATIONSHIPS.find((rel) => rel.id === r)?.label ?? r
}

function planTypeLabel(t: InsurancePlanType): string {
  return PLAN_TYPES.find((p) => p.id === t)?.label ?? t
}

// ─── Main Component ─────────────────────────────────────────────────────────

export default function EmergencyInsuranceScreen() {
  const { colors, radius } = useTheme()
  const insets = useSafeAreaInsets()

  const store = useEmergencyInsuranceStore()
  const [loading, setLoading] = useState(true)

  // Modal state
  const [contactModalVisible, setContactModalVisible] = useState(false)
  const [planModalVisible, setPlanModalVisible] = useState(false)
  const [editingContact, setEditingContact] = useState<EmergencyContact | null>(null)
  const [editingPlan, setEditingPlan] = useState<InsurancePlan | null>(null)

  // ─── Load data ──────────────────────────────────────────────────────────

  useFocusEffect(
    useCallback(() => {
      loadData()
    }, [])
  )

  async function loadData() {
    setLoading(true)
    try {
      const [contacts, plans] = await Promise.all([
        getEmergencyContacts(),
        getInsurancePlans(),
      ])
      store.setContacts(contacts)
      store.setPlans(plans)
    } catch (e) {
      console.warn('Failed to load emergency/insurance data:', e)
    }
    setLoading(false)
  }

  // ─── Contact actions ────────────────────────────────────────────────────

  function openAddContact() {
    setEditingContact(null)
    setContactModalVisible(true)
  }

  function openEditContact(contact: EmergencyContact) {
    setEditingContact(contact)
    setContactModalVisible(true)
  }

  function confirmDeleteContact(contact: EmergencyContact) {
    Alert.alert(
      'Remove Contact',
      `Remove ${contact.name} from your emergency contacts?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteEmergencyContact(contact.id)
              store.removeContact(contact.id)
            } catch (e: any) {
              Alert.alert('Error', e.message)
            }
          },
        },
      ]
    )
  }

  // ─── Plan actions ───────────────────────────────────────────────────────

  function openAddPlan() {
    setEditingPlan(null)
    setPlanModalVisible(true)
  }

  function openEditPlan(plan: InsurancePlan) {
    setEditingPlan(plan)
    setPlanModalVisible(true)
  }

  function confirmDeletePlan(plan: InsurancePlan) {
    Alert.alert(
      'Remove Plan',
      `Remove ${plan.providerName} ${planTypeLabel(plan.planType)} plan?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteInsurancePlan(plan.id)
              store.removePlan(plan.id)
            } catch (e: any) {
              Alert.alert('Error', e.message)
            }
          },
        },
      ]
    )
  }

  // ─── Render ─────────────────────────────────────────────────────────────

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={() => router.back()} style={styles.headerBtn}>
          <ArrowLeft size={24} color={colors.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          Emergency & Insurance
        </Text>
        <View style={styles.headerBtn} />
      </View>

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 40 }]}
          showsVerticalScrollIndicator={false}
        >
          {/* ── Emergency Contacts Section ───────────────────────────── */}
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>
              EMERGENCY CONTACTS
            </Text>
            <Pressable onPress={openAddContact} hitSlop={8}>
              <View style={[styles.addPill, { backgroundColor: colors.primaryTint, borderRadius: radius.full }]}>
                <Plus size={14} color={colors.primary} strokeWidth={3} />
                <Text style={[styles.addPillText, { color: colors.primary }]}>Add</Text>
              </View>
            </Pressable>
          </View>

          {store.contacts.length === 0 ? (
            <Pressable
              onPress={openAddContact}
              style={[styles.emptyCard, { backgroundColor: colors.surface, borderRadius: radius.xl, borderColor: colors.border }]}
            >
              <View style={[styles.emptyIcon, { backgroundColor: brand.error + '15' }]}>
                <Phone size={24} color={brand.error} strokeWidth={1.5} />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.text }]}>
                No emergency contacts yet
              </Text>
              <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>
                Add people to call in case of an emergency. Grandma wants you safe.
              </Text>
            </Pressable>
          ) : (
            <View style={[styles.cardGroup, { backgroundColor: colors.surface, borderRadius: radius.xl }]}>
              {store.contacts.map((contact, idx) => (
                <Pressable
                  key={contact.id}
                  onPress={() => openEditContact(contact)}
                  style={[
                    styles.contactRow,
                    idx < store.contacts.length - 1 && {
                      borderBottomWidth: 1,
                      borderBottomColor: colors.borderLight,
                    },
                  ]}
                >
                  <View style={[styles.contactAvatar, { backgroundColor: brand.error + '15' }]}>
                    <User size={18} color={brand.error} strokeWidth={2} />
                  </View>
                  <View style={styles.contactInfo}>
                    <View style={styles.contactNameRow}>
                      <Text style={[styles.contactName, { color: colors.text }]}>
                        {contact.name}
                      </Text>
                      {contact.isPrimary && (
                        <View style={[styles.primaryBadge, { backgroundColor: brand.accent + '20', borderRadius: radius.full }]}>
                          <Star size={10} color={brand.accent} strokeWidth={2.5} fill={brand.accent} />
                          <Text style={[styles.primaryText, { color: brand.accent }]}>Primary</Text>
                        </View>
                      )}
                    </View>
                    <Text style={[styles.contactMeta, { color: colors.textSecondary }]}>
                      {relationshipLabel(contact.relationship)}
                    </Text>
                    <Text style={[styles.contactPhone, { color: colors.primary }]}>
                      {contact.phone}
                    </Text>
                  </View>
                  <Pressable onPress={() => confirmDeleteContact(contact)} hitSlop={8}>
                    <Trash2 size={16} color={colors.textMuted} strokeWidth={2} />
                  </Pressable>
                </Pressable>
              ))}
            </View>
          )}

          {/* ── Insurance Plans Section ──────────────────────────────── */}
          <View style={[styles.sectionHeader, { marginTop: 28 }]}>
            <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>
              INSURANCE PLANS
            </Text>
            <Pressable onPress={openAddPlan} hitSlop={8}>
              <View style={[styles.addPill, { backgroundColor: INSURANCE_ORANGE + '15', borderRadius: radius.full }]}>
                <Plus size={14} color={INSURANCE_ORANGE} strokeWidth={3} />
                <Text style={[styles.addPillText, { color: INSURANCE_ORANGE }]}>Add</Text>
              </View>
            </Pressable>
          </View>

          {store.plans.length === 0 ? (
            <Pressable
              onPress={openAddPlan}
              style={[styles.emptyCard, { backgroundColor: colors.surface, borderRadius: radius.xl, borderColor: colors.border }]}
            >
              <View style={[styles.emptyIcon, { backgroundColor: INSURANCE_ORANGE + '15' }]}>
                <CreditCard size={24} color={INSURANCE_ORANGE} strokeWidth={1.5} />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.text }]}>
                No insurance plans yet
              </Text>
              <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>
                Keep your health, dental, and vision plans handy in one place.
              </Text>
            </Pressable>
          ) : (
            <View style={styles.planCards}>
              {store.plans.map((plan) => (
                <Pressable
                  key={plan.id}
                  onPress={() => openEditPlan(plan)}
                  style={[styles.planCard, { backgroundColor: colors.surface, borderRadius: radius.xl }]}
                >
                  <View style={styles.planHeader}>
                    <View style={[styles.planTypeIcon, { backgroundColor: INSURANCE_ORANGE + '15' }]}>
                      <Building2 size={18} color={INSURANCE_ORANGE} strokeWidth={2} />
                    </View>
                    <View style={styles.planHeaderText}>
                      <Text style={[styles.planProvider, { color: colors.text }]}>
                        {plan.providerName}
                      </Text>
                      <View style={[styles.planTypeBadge, { backgroundColor: INSURANCE_ORANGE + '15', borderRadius: radius.full }]}>
                        <Text style={[styles.planTypeText, { color: INSURANCE_ORANGE }]}>
                          {planTypeLabel(plan.planType)}
                        </Text>
                      </View>
                    </View>
                    <Pressable onPress={() => confirmDeletePlan(plan)} hitSlop={8}>
                      <Trash2 size={16} color={colors.textMuted} strokeWidth={2} />
                    </Pressable>
                  </View>

                  {/* Plan details */}
                  <View style={styles.planDetails}>
                    {plan.planName && (
                      <PlanField label="Plan" value={plan.planName} colors={colors} />
                    )}
                    {plan.policyNumber && (
                      <PlanField label="Policy #" value={plan.policyNumber} colors={colors} />
                    )}
                    {plan.groupNumber && (
                      <PlanField label="Group #" value={plan.groupNumber} colors={colors} />
                    )}
                    {plan.memberId && (
                      <PlanField label="Member ID" value={plan.memberId} colors={colors} />
                    )}
                    {plan.phone && (
                      <PlanField label="Phone" value={plan.phone} colors={colors} />
                    )}
                  </View>
                </Pressable>
              ))}
            </View>
          )}
        </ScrollView>
      )}

      {/* ── Modals ──────────────────────────────────────────────────── */}
      <ContactFormModal
        visible={contactModalVisible}
        contact={editingContact}
        onClose={() => setContactModalVisible(false)}
        onSave={async (contact) => {
          const saved = await upsertEmergencyContact(contact)
          if (editingContact) {
            store.updateContact(saved)
          } else {
            store.addContact(saved)
          }
          // If marked primary, unset others locally
          if (saved.isPrimary) {
            store.setContacts(
              store.contacts
                .map((c) => (c.id === saved.id ? saved : { ...c, isPrimary: false }))
                .sort((a, b) => (b.isPrimary ? 1 : 0) - (a.isPrimary ? 1 : 0))
            )
          }
          setContactModalVisible(false)
        }}
      />

      <PlanFormModal
        visible={planModalVisible}
        plan={editingPlan}
        onClose={() => setPlanModalVisible(false)}
        onSave={async (plan) => {
          const saved = await upsertInsurancePlan(plan)
          if (editingPlan) {
            store.updatePlan(saved)
          } else {
            store.addPlan(saved)
          }
          setPlanModalVisible(false)
        }}
      />
    </View>
  )
}

// ─── Plan Field ─────────────────────────────────────────────────────────────

function PlanField({ label, value, colors }: { label: string; value: string; colors: any }) {
  return (
    <View style={styles.planField}>
      <Text style={[styles.planFieldLabel, { color: colors.textMuted }]}>{label}</Text>
      <Text style={[styles.planFieldValue, { color: colors.text }]}>{value}</Text>
    </View>
  )
}

// ─── Contact Form Modal ─────────────────────────────────────────────────────

function ContactFormModal({
  visible,
  contact,
  onClose,
  onSave,
}: {
  visible: boolean
  contact: EmergencyContact | null
  onClose: () => void
  onSave: (data: {
    id?: string
    name: string
    relationship: ContactRelationship
    phone: string
    email?: string | null
    isPrimary?: boolean
    notes?: string | null
  }) => Promise<void>
}) {
  const { colors, radius } = useTheme()
  const insets = useSafeAreaInsets()
  const isEdit = !!contact

  const [name, setName] = useState('')
  const [relationship, setRelationship] = useState<ContactRelationship>('spouse')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [isPrimary, setIsPrimary] = useState(false)
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [showRelPicker, setShowRelPicker] = useState(false)

  // Reset form when modal opens
  useState(() => {
    if (visible) {
      setName(contact?.name ?? '')
      setRelationship(contact?.relationship ?? 'spouse')
      setPhone(contact?.phone ?? '')
      setEmail(contact?.email ?? '')
      setIsPrimary(contact?.isPrimary ?? false)
      setNotes(contact?.notes ?? '')
    }
  })

  // Also reset on visibility change
  const resetForm = useCallback(() => {
    setName(contact?.name ?? '')
    setRelationship(contact?.relationship ?? 'spouse')
    setPhone(contact?.phone ?? '')
    setEmail(contact?.email ?? '')
    setIsPrimary(contact?.isPrimary ?? false)
    setNotes(contact?.notes ?? '')
    setSaving(false)
    setShowRelPicker(false)
  }, [contact])

  async function handleSave() {
    if (!name.trim()) return Alert.alert('Name required')
    if (!phone.trim()) return Alert.alert('Phone required')
    setSaving(true)
    try {
      await onSave({
        ...(contact?.id ? { id: contact.id } : {}),
        name: name.trim(),
        relationship,
        phone: phone.trim(),
        email: email.trim() || null,
        isPrimary,
        notes: notes.trim() || null,
      })
    } catch (e: any) {
      Alert.alert('Error', e.message)
    }
    setSaving(false)
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
      onShow={resetForm}
    >
      <KeyboardAvoidingView
        style={[styles.modalRoot, { backgroundColor: colors.bg }]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Modal header */}
        <View style={[styles.modalHeader, { paddingTop: insets.top + 8 }]}>
          <Pressable onPress={onClose} style={styles.headerBtn}>
            <X size={24} color={colors.textMuted} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            {isEdit ? 'Edit Contact' : 'Add Contact'}
          </Text>
          <View style={styles.headerBtn} />
        </View>

        <ScrollView
          contentContainerStyle={styles.modalScroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Name */}
          <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>NAME</Text>
          <View style={[styles.inputRow, { backgroundColor: colors.surface, borderRadius: radius.lg, borderColor: colors.border }]}>
            <User size={18} color={colors.textMuted} strokeWidth={2} />
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Contact name"
              placeholderTextColor={colors.textMuted}
              style={[styles.inputText, { color: colors.text }]}
              autoCapitalize="words"
            />
          </View>

          {/* Relationship */}
          <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>RELATIONSHIP</Text>
          <Pressable
            onPress={() => setShowRelPicker(!showRelPicker)}
            style={[styles.inputRow, { backgroundColor: colors.surface, borderRadius: radius.lg, borderColor: colors.border }]}
          >
            <Users size={18} color={colors.textMuted} strokeWidth={2} />
            <Text style={[styles.inputText, { color: colors.text, flex: 1 }]}>
              {relationshipLabel(relationship)}
            </Text>
            <ChevronDown size={18} color={colors.textMuted} />
          </Pressable>
          {showRelPicker && (
            <View style={[styles.pickerList, { backgroundColor: colors.surfaceRaised, borderRadius: radius.lg }]}>
              {RELATIONSHIPS.map((rel) => (
                <Pressable
                  key={rel.id}
                  onPress={() => { setRelationship(rel.id); setShowRelPicker(false) }}
                  style={[
                    styles.pickerItem,
                    relationship === rel.id && { backgroundColor: colors.primaryTint },
                  ]}
                >
                  <Text style={[styles.pickerItemText, { color: relationship === rel.id ? colors.primary : colors.text }]}>
                    {rel.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}

          {/* Phone */}
          <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>PHONE</Text>
          <View style={[styles.inputRow, { backgroundColor: colors.surface, borderRadius: radius.lg, borderColor: colors.border }]}>
            <Phone size={18} color={colors.textMuted} strokeWidth={2} />
            <TextInput
              value={phone}
              onChangeText={setPhone}
              placeholder="Phone number"
              placeholderTextColor={colors.textMuted}
              keyboardType="phone-pad"
              style={[styles.inputText, { color: colors.text }]}
            />
          </View>

          {/* Email (optional) */}
          <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>EMAIL (OPTIONAL)</Text>
          <View style={[styles.inputRow, { backgroundColor: colors.surface, borderRadius: radius.lg, borderColor: colors.border }]}>
            <Mail size={18} color={colors.textMuted} strokeWidth={2} />
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="Email address"
              placeholderTextColor={colors.textMuted}
              keyboardType="email-address"
              autoCapitalize="none"
              style={[styles.inputText, { color: colors.text }]}
            />
          </View>

          {/* Primary toggle */}
          <Pressable
            onPress={() => setIsPrimary(!isPrimary)}
            style={[styles.toggleRow, { backgroundColor: colors.surface, borderRadius: radius.lg, borderColor: colors.border }]}
          >
            <Star
              size={18}
              color={isPrimary ? brand.accent : colors.textMuted}
              strokeWidth={2}
              fill={isPrimary ? brand.accent : 'transparent'}
            />
            <Text style={[styles.toggleLabel, { color: colors.text }]}>Primary contact</Text>
            <View
              style={[
                styles.toggleDot,
                {
                  backgroundColor: isPrimary ? colors.primary : colors.border,
                  borderRadius: radius.full,
                },
              ]}
            >
              {isPrimary && <View style={[styles.toggleDotInner, { backgroundColor: '#FFFFFF' }]} />}
            </View>
          </Pressable>

          {/* Notes (optional) */}
          <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>NOTES (OPTIONAL)</Text>
          <View style={[styles.inputRow, { backgroundColor: colors.surface, borderRadius: radius.lg, borderColor: colors.border, minHeight: 80, alignItems: 'flex-start', paddingTop: 14 }]}>
            <TextInput
              value={notes}
              onChangeText={setNotes}
              placeholder="Any notes..."
              placeholderTextColor={colors.textMuted}
              multiline
              style={[styles.inputText, { color: colors.text, textAlignVertical: 'top' }]}
            />
          </View>
        </ScrollView>

        {/* Save button */}
        <View style={[styles.modalBottom, { paddingBottom: insets.bottom + 16 }]}>
          <Pressable
            onPress={handleSave}
            disabled={saving}
            style={({ pressed }) => [
              styles.saveBtn,
              { backgroundColor: colors.primary, borderRadius: radius.lg },
              pressed && { transform: [{ scale: 0.98 }] },
              saving && { opacity: 0.6 },
            ]}
          >
            {saving ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.saveBtnText}>
                {isEdit ? 'Save Changes' : 'Add Contact'}
              </Text>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  )
}

// ─── Plan Form Modal ────────────────────────────────────────────────────────

function PlanFormModal({
  visible,
  plan,
  onClose,
  onSave,
}: {
  visible: boolean
  plan: InsurancePlan | null
  onClose: () => void
  onSave: (data: {
    id?: string
    planType: InsurancePlanType
    providerName: string
    planName?: string | null
    policyNumber?: string | null
    groupNumber?: string | null
    memberId?: string | null
    phone?: string | null
    notes?: string | null
  }) => Promise<void>
}) {
  const { colors, radius } = useTheme()
  const insets = useSafeAreaInsets()
  const isEdit = !!plan

  const [planType, setPlanType] = useState<InsurancePlanType>('health')
  const [providerName, setProviderName] = useState('')
  const [planName, setPlanName] = useState('')
  const [policyNumber, setPolicyNumber] = useState('')
  const [groupNumber, setGroupNumber] = useState('')
  const [memberId, setMemberId] = useState('')
  const [phone, setPhone] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [scanning, setScanning] = useState(false)

  const resetForm = useCallback(() => {
    setPlanType(plan?.planType ?? 'health')
    setProviderName(plan?.providerName ?? '')
    setPlanName(plan?.planName ?? '')
    setPolicyNumber(plan?.policyNumber ?? '')
    setGroupNumber(plan?.groupNumber ?? '')
    setMemberId(plan?.memberId ?? '')
    setPhone(plan?.phone ?? '')
    setNotes(plan?.notes ?? '')
    setSaving(false)
    setScanning(false)
  }, [plan])

  function applyScannedData(data: ScannedCardData) {
    if (data.providerName) setProviderName(data.providerName)
    if (data.planName) setPlanName(data.planName)
    if (data.planType) setPlanType(data.planType)
    if (data.policyNumber) setPolicyNumber(data.policyNumber)
    if (data.groupNumber) setGroupNumber(data.groupNumber)
    if (data.memberId) setMemberId(data.memberId)
    if (data.phone) setPhone(data.phone)
  }

  async function handleScanCard(useCamera: boolean) {
    setScanning(true)
    try {
      const data = await pickAndScanInsuranceCard(useCamera)
      if (data) {
        applyScannedData(data)
        Alert.alert('Card scanned', 'Fields have been filled in. Please review and adjust if needed.')
      }
    } catch (e: any) {
      Alert.alert('Scan failed', e.message)
    }
    setScanning(false)
  }

  async function handleSave() {
    if (!providerName.trim()) return Alert.alert('Provider required')
    setSaving(true)
    try {
      await onSave({
        ...(plan?.id ? { id: plan.id } : {}),
        planType,
        providerName: providerName.trim(),
        planName: planName.trim() || null,
        policyNumber: policyNumber.trim() || null,
        groupNumber: groupNumber.trim() || null,
        memberId: memberId.trim() || null,
        phone: phone.trim() || null,
        notes: notes.trim() || null,
      })
    } catch (e: any) {
      Alert.alert('Error', e.message)
    }
    setSaving(false)
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
      onShow={resetForm}
    >
      <KeyboardAvoidingView
        style={[styles.modalRoot, { backgroundColor: colors.bg }]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Modal header */}
        <View style={[styles.modalHeader, { paddingTop: insets.top + 8 }]}>
          <Pressable onPress={onClose} style={styles.headerBtn}>
            <X size={24} color={colors.textMuted} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            {isEdit ? 'Edit Plan' : 'Add Insurance Plan'}
          </Text>
          <View style={styles.headerBtn} />
        </View>

        <ScrollView
          contentContainerStyle={styles.modalScroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Scan card banner */}
          <View style={[styles.scanBanner, { backgroundColor: INSURANCE_ORANGE + '10', borderColor: INSURANCE_ORANGE + '30', borderRadius: radius.xl }]}>
            <View style={styles.scanBannerContent}>
              <CreditCard size={20} color={INSURANCE_ORANGE} strokeWidth={2} />
              <View style={styles.scanBannerText}>
                <Text style={[styles.scanBannerTitle, { color: colors.text }]}>
                  Scan your card
                </Text>
                <Text style={[styles.scanBannerSubtitle, { color: colors.textSecondary }]}>
                  Take a photo or upload and auto-fill all fields
                </Text>
              </View>
            </View>
            <View style={styles.scanBannerButtons}>
              <Pressable
                onPress={() => handleScanCard(true)}
                disabled={scanning}
                style={({ pressed }) => [
                  styles.scanBtn,
                  { backgroundColor: INSURANCE_ORANGE, borderRadius: radius.lg },
                  pressed && { opacity: 0.85 },
                  scanning && { opacity: 0.5 },
                ]}
              >
                <Camera size={16} color="#FFFFFF" strokeWidth={2.5} />
                <Text style={styles.scanBtnText}>Camera</Text>
              </Pressable>
              <Pressable
                onPress={() => handleScanCard(false)}
                disabled={scanning}
                style={({ pressed }) => [
                  styles.scanBtn,
                  { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: INSURANCE_ORANGE + '40' },
                  pressed && { opacity: 0.85 },
                  scanning && { opacity: 0.5 },
                ]}
              >
                <ImageIcon size={16} color={INSURANCE_ORANGE} strokeWidth={2.5} />
                <Text style={[styles.scanBtnText, { color: INSURANCE_ORANGE }]}>Gallery</Text>
              </Pressable>
            </View>
            {scanning && (
              <View style={styles.scanningRow}>
                <ActivityIndicator size="small" color={INSURANCE_ORANGE} />
                <Text style={[styles.scanningText, { color: colors.textSecondary }]}>
                  Reading your card...
                </Text>
              </View>
            )}
          </View>

          {/* Plan type chips */}
          <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>TYPE</Text>
          <View style={styles.chipRow}>
            {PLAN_TYPES.map((t) => {
              const active = planType === t.id
              return (
                <Pressable
                  key={t.id}
                  onPress={() => setPlanType(t.id)}
                  style={[
                    styles.typeChip,
                    {
                      backgroundColor: active ? INSURANCE_ORANGE + '20' : colors.surface,
                      borderColor: active ? INSURANCE_ORANGE : colors.border,
                      borderRadius: radius.full,
                    },
                  ]}
                >
                  <Text style={[styles.typeChipText, { color: active ? INSURANCE_ORANGE : colors.text }]}>
                    {t.label}
                  </Text>
                </Pressable>
              )
            })}
          </View>

          {/* Provider name */}
          <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>PROVIDER</Text>
          <View style={[styles.inputRow, { backgroundColor: colors.surface, borderRadius: radius.lg, borderColor: colors.border }]}>
            <Building2 size={18} color={colors.textMuted} strokeWidth={2} />
            <TextInput
              value={providerName}
              onChangeText={setProviderName}
              placeholder="e.g. Blue Cross Blue Shield"
              placeholderTextColor={colors.textMuted}
              style={[styles.inputText, { color: colors.text }]}
              autoCapitalize="words"
            />
          </View>

          {/* Plan name */}
          <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>PLAN NAME (OPTIONAL)</Text>
          <View style={[styles.inputRow, { backgroundColor: colors.surface, borderRadius: radius.lg, borderColor: colors.border }]}>
            <FileText size={18} color={colors.textMuted} strokeWidth={2} />
            <TextInput
              value={planName}
              onChangeText={setPlanName}
              placeholder="e.g. PPO Gold Family"
              placeholderTextColor={colors.textMuted}
              style={[styles.inputText, { color: colors.text }]}
            />
          </View>

          {/* Policy number */}
          <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>POLICY NUMBER</Text>
          <View style={[styles.inputRow, { backgroundColor: colors.surface, borderRadius: radius.lg, borderColor: colors.border }]}>
            <CreditCard size={18} color={colors.textMuted} strokeWidth={2} />
            <TextInput
              value={policyNumber}
              onChangeText={setPolicyNumber}
              placeholder="Policy number"
              placeholderTextColor={colors.textMuted}
              style={[styles.inputText, { color: colors.text }]}
            />
          </View>

          {/* Group number + Member ID in a row */}
          <View style={styles.twoCol}>
            <View style={styles.twoColItem}>
              <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>GROUP #</Text>
              <View style={[styles.inputRow, { backgroundColor: colors.surface, borderRadius: radius.lg, borderColor: colors.border }]}>
                <TextInput
                  value={groupNumber}
                  onChangeText={setGroupNumber}
                  placeholder="Group #"
                  placeholderTextColor={colors.textMuted}
                  style={[styles.inputText, { color: colors.text }]}
                />
              </View>
            </View>
            <View style={styles.twoColItem}>
              <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>MEMBER ID</Text>
              <View style={[styles.inputRow, { backgroundColor: colors.surface, borderRadius: radius.lg, borderColor: colors.border }]}>
                <TextInput
                  value={memberId}
                  onChangeText={setMemberId}
                  placeholder="Member ID"
                  placeholderTextColor={colors.textMuted}
                  style={[styles.inputText, { color: colors.text }]}
                />
              </View>
            </View>
          </View>

          {/* Insurance phone */}
          <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>INSURANCE PHONE</Text>
          <View style={[styles.inputRow, { backgroundColor: colors.surface, borderRadius: radius.lg, borderColor: colors.border }]}>
            <Phone size={18} color={colors.textMuted} strokeWidth={2} />
            <TextInput
              value={phone}
              onChangeText={setPhone}
              placeholder="Customer service number"
              placeholderTextColor={colors.textMuted}
              keyboardType="phone-pad"
              style={[styles.inputText, { color: colors.text }]}
            />
          </View>

          {/* Notes */}
          <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>NOTES (OPTIONAL)</Text>
          <View style={[styles.inputRow, { backgroundColor: colors.surface, borderRadius: radius.lg, borderColor: colors.border, minHeight: 80, alignItems: 'flex-start', paddingTop: 14 }]}>
            <TextInput
              value={notes}
              onChangeText={setNotes}
              placeholder="Coverage details, co-pays, etc."
              placeholderTextColor={colors.textMuted}
              multiline
              style={[styles.inputText, { color: colors.text, textAlignVertical: 'top' }]}
            />
          </View>
        </ScrollView>

        {/* Save button */}
        <View style={[styles.modalBottom, { paddingBottom: insets.bottom + 16 }]}>
          <Pressable
            onPress={handleSave}
            disabled={saving}
            style={({ pressed }) => [
              styles.saveBtn,
              { backgroundColor: INSURANCE_ORANGE, borderRadius: radius.lg },
              pressed && { transform: [{ scale: 0.98 }] },
              saving && { opacity: 0.6 },
            ]}
          >
            {saving ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.saveBtnText}>
                {isEdit ? 'Save Changes' : 'Add Plan'}
              </Text>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  )
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1 },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  headerBtn: { width: 40, alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700' },

  // Content
  scroll: { paddingHorizontal: 20 },
  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  // Section header
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 20,
    marginBottom: 10,
    paddingLeft: 4,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
  },
  addPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  addPillText: { fontSize: 13, fontWeight: '700' },

  // Empty state
  emptyCard: {
    alignItems: 'center',
    padding: 32,
    gap: 10,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyTitle: { fontSize: 16, fontWeight: '700' },
  emptySubtitle: { fontSize: 13, fontWeight: '500', textAlign: 'center', lineHeight: 18 },

  // Contact list
  cardGroup: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 12,
  },
  contactAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactInfo: { flex: 1, gap: 2 },
  contactNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  contactName: { fontSize: 15, fontWeight: '700' },
  primaryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingVertical: 2,
    paddingHorizontal: 8,
  },
  primaryText: { fontSize: 10, fontWeight: '700' },
  contactMeta: { fontSize: 13, fontWeight: '500' },
  contactPhone: { fontSize: 13, fontWeight: '600' },

  // Plan cards
  planCards: { gap: 12 },
  planCard: {
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  planHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  planTypeIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  planHeaderText: { flex: 1, gap: 4 },
  planProvider: { fontSize: 16, fontWeight: '700' },
  planTypeBadge: { alignSelf: 'flex-start', paddingVertical: 2, paddingHorizontal: 10 },
  planTypeText: { fontSize: 11, fontWeight: '700' },
  planDetails: { gap: 8 },
  planField: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  planFieldLabel: { fontSize: 13, fontWeight: '500' },
  planFieldValue: { fontSize: 13, fontWeight: '600' },

  // Modal
  modalRoot: { flex: 1 },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  modalScroll: { paddingHorizontal: 20, paddingBottom: 20 },
  modalBottom: { paddingHorizontal: 20 },

  // Form fields
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    marginTop: 16,
    marginBottom: 6,
    paddingLeft: 4,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
  },
  inputText: { flex: 1, fontSize: 15, fontWeight: '500' },

  // Relationship picker
  pickerList: { marginTop: 4, overflow: 'hidden' },
  pickerItem: { paddingVertical: 12, paddingHorizontal: 16 },
  pickerItemText: { fontSize: 15, fontWeight: '500' },

  // Toggle
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    marginTop: 16,
  },
  toggleLabel: { flex: 1, fontSize: 15, fontWeight: '600' },
  toggleDot: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleDotInner: { width: 10, height: 10, borderRadius: 5 },

  // Chips
  chipRow: { flexDirection: 'row', gap: 10 },
  typeChip: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
  },
  typeChipText: { fontSize: 14, fontWeight: '700' },

  // Scan banner
  scanBanner: {
    padding: 16,
    borderWidth: 1,
    marginBottom: 4,
    gap: 14,
  },
  scanBannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  scanBannerText: { flex: 1, gap: 2 },
  scanBannerTitle: { fontSize: 15, fontWeight: '700' },
  scanBannerSubtitle: { fontSize: 12, fontWeight: '500' },
  scanBannerButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  scanBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
  },
  scanBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  scanningRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  scanningText: { fontSize: 13, fontWeight: '500' },

  // Two columns
  twoCol: { flexDirection: 'row', gap: 12 },
  twoColItem: { flex: 1 },

  // Save button
  saveBtn: {
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
})
