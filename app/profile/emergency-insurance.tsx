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
  Phone,
  Mail,
  User,
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
  Camera,
  ImageIcon,
} from 'lucide-react-native'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme, brand } from '../../constants/theme'
import { ScreenHeader } from '../../components/ui/ScreenHeader'
import { PillButton } from '../../components/ui/PillButton'
import { BrandedLoader } from '../../components/ui/BrandedLoader'
import { Display, MonoCaps, Body } from '../../components/ui/Typography'
import { useSavedToast } from '../../components/ui/SavedToast'
import {
  Cross as CrossSticker,
  Heart as HeartSticker,
  Squishy,
  Star as StarSticker,
  Sparkle as SparkleSticker,
  Drop as DropSticker,
  Burst as BurstSticker,
} from '../../components/ui/Stickers'

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
  const { colors, font, stickers, isDark, radius } = useTheme()
  const insets = useSafeAreaInsets()
  const toast = useSavedToast()
  const paper = colors.surface
  const paperBorder = colors.border
  const coralInk = isDark ? stickers.coral : '#B43E2E'
  const peachInk = isDark ? stickers.peach : '#A6532A'

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
      <View style={[styles.headerWrap, { paddingTop: insets.top + 8 }]}>
        <ScreenHeader />
        <View style={styles.titleBlock}>
          <Text style={[styles.bigTitle, { color: colors.text, fontFamily: font.display }]}>
            Emergency & Insurance
          </Text>
          <Text style={[styles.bigSubtitle, { color: coralInk, fontFamily: font.italic }]}>
            keep them close, dear
          </Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingWrap}>
          <BrandedLoader />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 40 }]}
          showsVerticalScrollIndicator={false}
        >
          {/* ── Emergency Contacts Section ───────────────────────────── */}
          <View style={styles.sectionHeader}>
            <View style={styles.sectionLabelRow}>
              <HeartSticker size={16} fill={stickers.coral} />
              <Text style={[styles.sectionLabel, { color: colors.textMuted, fontFamily: font.bodyMedium }]}>EMERGENCY CONTACTS</Text>
            </View>
            <Pressable onPress={openAddContact} hitSlop={8}>
              <View style={[styles.addPill, { backgroundColor: stickers.peachSoft }]}>
                <SparkleSticker size={14} fill={coralInk} stroke={coralInk} />
                <Plus size={14} color={coralInk} strokeWidth={3} />
                <Text style={[styles.addPillText, { color: coralInk, fontFamily: font.bodySemiBold }]}>Add</Text>
              </View>
            </Pressable>
          </View>

          {store.contacts.length === 0 ? (
            <Pressable
              onPress={openAddContact}
              style={[styles.emptyCard, { backgroundColor: paper, borderColor: paperBorder }]}
            >
              <View style={styles.emptyIllustration}>
                <CrossSticker size={140} fill={stickers.coral} />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.text, fontFamily: font.display }]}>
                No emergency contacts yet
              </Text>
              <Body size={14} align="center" color={colors.textMuted}>
                Add people to call in case of an emergency. Grandma wants you safe.
              </Body>
            </Pressable>
          ) : (
            <View style={[styles.cardGroup, { backgroundColor: paper, borderColor: paperBorder }]}>
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
                  <View style={[styles.contactAvatar, { backgroundColor: stickers.coral + (isDark ? '32' : '40') }]}>
                    <CrossSticker size={20} fill={stickers.coral} />
                  </View>
                  <View style={styles.contactInfo}>
                    <View style={styles.contactNameRow}>
                      <Text style={[styles.contactName, { color: colors.text, fontFamily: font.display }]}>
                        {contact.name}
                      </Text>
                      {contact.isPrimary && (
                        <View style={[styles.primaryBadge, { backgroundColor: stickers.yellow + (isDark ? '32' : '50') }]}>
                          <Star size={10} color={isDark ? '#F0CE4C' : '#7C5E0F'} strokeWidth={2.5} fill={isDark ? '#F0CE4C' : '#7C5E0F'} />
                          <Text style={[styles.primaryText, { color: isDark ? '#F0CE4C' : '#7C5E0F', fontFamily: font.bodySemiBold }]}>Primary</Text>
                        </View>
                      )}
                    </View>
                    <Text style={[styles.contactMeta, { color: colors.textSecondary, fontFamily: font.body }]}>
                      {relationshipLabel(contact.relationship)}
                    </Text>
                    <Text style={[styles.contactPhone, { color: colors.text, fontFamily: font.bodySemiBold }]}>
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
            <View style={styles.sectionLabelRow}>
              <StarSticker size={16} fill={stickers.peach} />
              <Text style={[styles.sectionLabel, { color: colors.textMuted, fontFamily: font.bodyMedium }]}>INSURANCE PLANS</Text>
            </View>
            <Pressable onPress={openAddPlan} hitSlop={8}>
              <View style={[styles.addPill, { backgroundColor: stickers.peachSoft }]}>
                <SparkleSticker size={14} fill={peachInk} stroke={peachInk} />
                <Plus size={14} color={peachInk} strokeWidth={3} />
                <Text style={[styles.addPillText, { color: peachInk, fontFamily: font.bodySemiBold }]}>Add</Text>
              </View>
            </Pressable>
          </View>

          {store.plans.length === 0 ? (
            <Pressable
              onPress={openAddPlan}
              style={[styles.emptyCard, { backgroundColor: paper, borderColor: paperBorder }]}
            >
              <View style={[styles.emptyIllustration, { transform: [{ rotate: '-6deg' }] }]}>
                <Squishy w={140} h={94} fill={stickers.peach} />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.text, fontFamily: font.display }]}>
                No insurance plans yet
              </Text>
              <Body size={14} align="center" color={colors.textMuted}>
                Keep your health, dental, and vision plans handy in one place.
              </Body>
            </Pressable>
          ) : (
            <View style={styles.planCards}>
              {store.plans.map((plan) => (
                <Pressable
                  key={plan.id}
                  onPress={() => openEditPlan(plan)}
                  style={[styles.planCard, { backgroundColor: paper, borderColor: paperBorder }]}
                >
                  <View style={styles.planHeader}>
                    <View style={[styles.planTypeIcon, { backgroundColor: stickers.peach + (isDark ? '32' : '40') }]}>
                      <Building2 size={18} color={isDark ? stickers.peach : '#A6532A'} strokeWidth={2} />
                    </View>
                    <View style={styles.planHeaderText}>
                      <Text style={[styles.planProvider, { color: colors.text, fontFamily: font.display }]}>
                        {plan.providerName}
                      </Text>
                      <View style={[styles.planTypeBadge, { backgroundColor: stickers.peach + (isDark ? '32' : '40') }]}>
                        <Text style={[styles.planTypeText, { color: isDark ? stickers.peach : '#A6532A', fontFamily: font.bodySemiBold }]}>
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
                      <PlanField label="Plan" value={plan.planName} />
                    )}
                    {plan.policyNumber && (
                      <PlanField label="Policy #" value={plan.policyNumber} />
                    )}
                    {plan.groupNumber && (
                      <PlanField label="Group #" value={plan.groupNumber} />
                    )}
                    {plan.memberId && (
                      <PlanField label="Member ID" value={plan.memberId} />
                    )}
                    {plan.phone && (
                      <PlanField label="Phone" value={plan.phone} />
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

function PlanField({ label, value }: { label: string; value: string }) {
  const { colors, font } = useTheme()
  return (
    <View style={styles.planField}>
      <MonoCaps color={colors.textMuted}>{label}</MonoCaps>
      <Text style={[styles.planFieldValue, { color: colors.text, fontFamily: font.bodyMedium }]}>{value}</Text>
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
  const { colors, font, stickers, isDark } = useTheme()
  const insets = useSafeAreaInsets()
  const paper = colors.surface
  const paperBorder = colors.border
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
          <Pressable onPress={onClose} hitSlop={10}>
            <View style={[styles.modalHeaderBtn, { backgroundColor: paper, borderColor: paperBorder }]}>
              <Ionicons name="close" size={20} color={colors.text} />
            </View>
          </Pressable>
          <View style={styles.modalTitleCenter}>
            <Text style={[styles.modalBigTitle, { color: colors.text, fontFamily: font.display }]}>
              {isEdit ? 'Edit Contact' : 'Add Contact'}
            </Text>
            <Text style={[styles.modalItalic, { color: isDark ? stickers.coral : '#B43E2E', fontFamily: font.italic }]}>
              someone to call
            </Text>
          </View>
          <View style={styles.modalHeaderBtn} />
        </View>

        <ScrollView
          contentContainerStyle={styles.modalScroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <MonoCaps color={colors.textMuted}>Name</MonoCaps>
          <View style={[styles.inputRow, { backgroundColor: paper, borderColor: paperBorder }]}>
            <User size={18} color={colors.textMuted} strokeWidth={2} />
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Contact name"
              placeholderTextColor={colors.textMuted}
              style={[styles.inputText, { color: colors.text, fontFamily: font.body }]}
              autoCapitalize="words"
            />
          </View>

          <MonoCaps color={colors.textMuted}>Relationship</MonoCaps>
          <Pressable
            onPress={() => setShowRelPicker(!showRelPicker)}
            style={[styles.inputRow, { backgroundColor: paper, borderColor: paperBorder }]}
          >
            <Ionicons name="people-outline" size={18} color={colors.textMuted} />
            <Text style={[styles.inputText, { color: colors.text, flex: 1, fontFamily: font.body }]}>
              {relationshipLabel(relationship)}
            </Text>
            <ChevronDown size={18} color={colors.textMuted} />
          </Pressable>
          {showRelPicker && (
            <View style={[styles.pickerList, { backgroundColor: paper, borderColor: paperBorder }]}>
              {RELATIONSHIPS.map((rel) => (
                <Pressable
                  key={rel.id}
                  onPress={() => { setRelationship(rel.id); setShowRelPicker(false) }}
                  style={[
                    styles.pickerItem,
                    relationship === rel.id && { backgroundColor: colors.surfaceRaised },
                  ]}
                >
                  <Text style={[styles.pickerItemText, { color: colors.text, fontFamily: relationship === rel.id ? font.bodySemiBold : font.body }]}>
                    {rel.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}

          <MonoCaps color={colors.textMuted}>Phone</MonoCaps>
          <View style={[styles.inputRow, { backgroundColor: paper, borderColor: paperBorder }]}>
            <Phone size={18} color={colors.textMuted} strokeWidth={2} />
            <TextInput
              value={phone}
              onChangeText={setPhone}
              placeholder="Phone number"
              placeholderTextColor={colors.textMuted}
              keyboardType="phone-pad"
              style={[styles.inputText, { color: colors.text, fontFamily: font.body }]}
            />
          </View>

          <MonoCaps color={colors.textMuted}>Email (optional)</MonoCaps>
          <View style={[styles.inputRow, { backgroundColor: paper, borderColor: paperBorder }]}>
            <Mail size={18} color={colors.textMuted} strokeWidth={2} />
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="Email address"
              placeholderTextColor={colors.textMuted}
              keyboardType="email-address"
              autoCapitalize="none"
              style={[styles.inputText, { color: colors.text, fontFamily: font.body }]}
            />
          </View>

          <Pressable
            onPress={() => setIsPrimary(!isPrimary)}
            style={[styles.toggleRow, { backgroundColor: paper, borderColor: paperBorder }]}
          >
            <Star
              size={18}
              color={isPrimary ? (isDark ? '#F0CE4C' : '#7C5E0F') : colors.textMuted}
              strokeWidth={2}
              fill={isPrimary ? (isDark ? '#F0CE4C' : '#7C5E0F') : 'transparent'}
            />
            <Text style={[styles.toggleLabel, { color: colors.text, fontFamily: font.bodyMedium }]}>Primary contact</Text>
            <View
              style={[
                styles.toggleDot,
                {
                  backgroundColor: isPrimary ? colors.text : colors.borderLight,
                },
              ]}
            >
              {isPrimary && <View style={[styles.toggleDotInner, { backgroundColor: colors.bg }]} />}
            </View>
          </Pressable>

          <MonoCaps color={colors.textMuted}>Notes (optional)</MonoCaps>
          <View style={[styles.inputRow, { backgroundColor: paper, borderColor: paperBorder, height: undefined, minHeight: 96, alignItems: 'flex-start', paddingTop: 16, paddingBottom: 16, borderRadius: 28 }]}>
            <TextInput
              value={notes}
              onChangeText={setNotes}
              placeholder="Any notes…"
              placeholderTextColor={colors.textMuted}
              multiline
              style={[styles.inputText, { color: colors.text, textAlignVertical: 'top', fontFamily: font.body }]}
            />
          </View>
        </ScrollView>

        <View style={[styles.modalBottom, { paddingBottom: insets.bottom + 16 }]}>
          <PillButton
            label={saving ? 'Saving…' : (isEdit ? 'Save Changes' : 'Add Contact')}
            variant="ink"
            onPress={handleSave}
            disabled={saving}
            leading={<Ionicons name={isEdit ? 'checkmark-circle' : 'add'} size={18} color={colors.bg} />}
          />
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
  const { colors, font, stickers, isDark } = useTheme()
  const insets = useSafeAreaInsets()
  const toast = useSavedToast()
  const paper = colors.surface
  const paperBorder = colors.border
  const accent = isDark ? stickers.peach : '#A6532A'
  const accentBg = stickers.peachSoft
  const coral = stickers.coral
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
        toast.show({ title: 'Card Scanned', message: 'Fields have been filled in. Please review and adjust if needed.' })
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
          <Pressable onPress={onClose} hitSlop={10}>
            <View style={[styles.modalHeaderBtn, { backgroundColor: paper, borderColor: paperBorder }]}>
              <Ionicons name="close" size={20} color={colors.text} />
            </View>
          </Pressable>
          <View style={styles.modalTitleCenter}>
            <Text style={[styles.modalBigTitle, { color: colors.text, fontFamily: font.display }]}>
              {isEdit ? 'Edit Plan' : 'Add Insurance Plan'}
            </Text>
            <Text style={[styles.modalItalic, { color: isDark ? stickers.coral : '#B43E2E', fontFamily: font.italic }]}>
              keep your card on hand
            </Text>
          </View>
          <View style={styles.modalHeaderBtn} />
        </View>

        <ScrollView
          contentContainerStyle={styles.modalScroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Scan card banner */}
          <View style={[styles.scanBanner, { backgroundColor: accentBg, borderColor: paperBorder, transform: [{ rotate: '-1deg' }] }]}>
            <View style={styles.scanBurstDecor} pointerEvents="none">
              <BurstSticker size={120} fill={stickers.peach} stroke={stickers.peach} />
            </View>
            <View style={styles.scanBannerContent}>
              <CreditCard size={20} color={coral} strokeWidth={2} />
              <View style={styles.scanBannerText}>
                <Text style={[styles.scanBannerTitle, { color: colors.text, fontFamily: font.display }]}>
                  Scan your card
                </Text>
                <Text style={[styles.scanBannerSubtitle, { color: colors.textSecondary, fontFamily: font.body }]}>
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
                  { backgroundColor: coral },
                  pressed && { opacity: 0.85 },
                  scanning && { opacity: 0.5 },
                ]}
              >
                <Camera size={16} color="#FFFEF8" strokeWidth={2.5} />
                <Text style={[styles.scanBtnText, { color: '#FFFEF8', fontFamily: font.bodySemiBold }]}>Camera</Text>
              </Pressable>
              <Pressable
                onPress={() => handleScanCard(false)}
                disabled={scanning}
                style={({ pressed }) => [
                  styles.scanBtn,
                  { backgroundColor: paper, borderWidth: 1, borderColor: paperBorder },
                  pressed && { opacity: 0.85 },
                  scanning && { opacity: 0.5 },
                ]}
              >
                <ImageIcon size={16} color={colors.text} strokeWidth={2.5} />
                <Text style={[styles.scanBtnText, { color: colors.text, fontFamily: font.bodySemiBold }]}>Gallery</Text>
              </Pressable>
            </View>
            {scanning && (
              <View style={styles.scanningRow}>
                <ActivityIndicator size="small" color={accent} />
                <Text style={[styles.scanningText, { color: colors.textSecondary, fontFamily: font.body }]}>
                  Reading your card…
                </Text>
              </View>
            )}
          </View>

          <MonoCaps color={colors.textMuted}>Type</MonoCaps>
          <View style={styles.chipRow}>
            {PLAN_TYPES.map((t) => {
              const active = planType === t.id
              const chipColor = active ? coral : colors.textMuted
              const chipFill = active ? coral : stickers.peach
              let icon = null
              if (t.id === 'health') icon = <CrossSticker size={18} fill={chipFill} stroke={chipColor} />
              else if (t.id === 'dental') icon = <SparkleSticker size={18} fill={chipFill} stroke={chipColor} />
              else if (t.id === 'vision') icon = <DropSticker size={18} fill={chipFill} stroke={chipColor} />
              return (
                <Pressable
                  key={t.id}
                  onPress={() => setPlanType(t.id)}
                  style={[
                    styles.typeChip,
                    {
                      backgroundColor: active ? stickers.peachSoft : paper,
                      borderColor: active ? coral : paperBorder,
                      borderWidth: active ? 2 : 1,
                    },
                  ]}
                >
                  {icon}
                  <Text style={[styles.typeChipText, { color: active ? coral : colors.text, fontFamily: active ? font.display : font.bodyMedium, fontSize: active ? 16 : 14 }]}>
                    {t.label}
                  </Text>
                </Pressable>
              )
            })}
          </View>

          <MonoCaps color={colors.textMuted}>Provider</MonoCaps>
          <View style={[styles.inputRow, { backgroundColor: paper, borderColor: paperBorder }]}>
            <Building2 size={18} color={colors.textMuted} strokeWidth={2} />
            <TextInput
              value={providerName}
              onChangeText={setProviderName}
              placeholder="e.g. Blue Cross Blue Shield"
              placeholderTextColor={colors.textMuted}
              style={[styles.inputText, { color: colors.text, fontFamily: font.body }]}
              autoCapitalize="words"
            />
          </View>

          <MonoCaps color={colors.textMuted}>Plan name (optional)</MonoCaps>
          <View style={[styles.inputRow, { backgroundColor: paper, borderColor: paperBorder }]}>
            <FileText size={18} color={colors.textMuted} strokeWidth={2} />
            <TextInput
              value={planName}
              onChangeText={setPlanName}
              placeholder="e.g. PPO Gold Family"
              placeholderTextColor={colors.textMuted}
              style={[styles.inputText, { color: colors.text, fontFamily: font.body }]}
            />
          </View>

          <MonoCaps color={colors.textMuted}>Policy number</MonoCaps>
          <View style={[styles.inputRow, { backgroundColor: paper, borderColor: paperBorder }]}>
            <CreditCard size={18} color={colors.textMuted} strokeWidth={2} />
            <TextInput
              value={policyNumber}
              onChangeText={setPolicyNumber}
              placeholder="Policy number"
              placeholderTextColor={colors.textMuted}
              style={[styles.inputText, { color: colors.text, fontFamily: font.body }]}
            />
          </View>

          <View style={styles.twoCol}>
            <View style={styles.twoColItem}>
              <MonoCaps color={colors.textMuted}>Group #</MonoCaps>
              <View style={[styles.inputRow, { backgroundColor: paper, borderColor: paperBorder }]}>
                <TextInput
                  value={groupNumber}
                  onChangeText={setGroupNumber}
                  placeholder="Group #"
                  placeholderTextColor={colors.textMuted}
                  style={[styles.inputText, { color: colors.text, fontFamily: font.body }]}
                />
              </View>
            </View>
            <View style={styles.twoColItem}>
              <MonoCaps color={colors.textMuted}>Member ID</MonoCaps>
              <View style={[styles.inputRow, { backgroundColor: paper, borderColor: paperBorder }]}>
                <TextInput
                  value={memberId}
                  onChangeText={setMemberId}
                  placeholder="Member ID"
                  placeholderTextColor={colors.textMuted}
                  style={[styles.inputText, { color: colors.text, fontFamily: font.body }]}
                />
              </View>
            </View>
          </View>

          <MonoCaps color={colors.textMuted}>Insurance phone</MonoCaps>
          <View style={[styles.inputRow, { backgroundColor: paper, borderColor: paperBorder }]}>
            <Phone size={18} color={colors.textMuted} strokeWidth={2} />
            <TextInput
              value={phone}
              onChangeText={setPhone}
              placeholder="Customer service number"
              placeholderTextColor={colors.textMuted}
              keyboardType="phone-pad"
              style={[styles.inputText, { color: colors.text, fontFamily: font.body }]}
            />
          </View>

          <MonoCaps color={colors.textMuted}>Notes (optional)</MonoCaps>
          <View style={[styles.inputRow, { backgroundColor: paper, borderColor: paperBorder, height: undefined, minHeight: 96, alignItems: 'flex-start', paddingTop: 16, paddingBottom: 16, borderRadius: 28 }]}>
            <TextInput
              value={notes}
              onChangeText={setNotes}
              placeholder="Coverage details, co-pays, etc."
              placeholderTextColor={colors.textMuted}
              multiline
              style={[styles.inputText, { color: colors.text, textAlignVertical: 'top', fontFamily: font.body }]}
            />
          </View>
        </ScrollView>

        <View style={[styles.modalBottom, { paddingBottom: insets.bottom + 16 }]}>
          <PillButton
            label={saving ? 'Saving…' : (isEdit ? 'Save Changes' : 'Add Plan')}
            variant="ink"
            onPress={handleSave}
            disabled={saving}
            leading={<Ionicons name={isEdit ? 'checkmark-circle' : 'add'} size={18} color={colors.bg} />}
          />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  )
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1 },

  headerWrap: { paddingHorizontal: 16, paddingBottom: 6 },
  titleBlock: {
    paddingHorizontal: 4,
    paddingTop: 14,
    paddingBottom: 6,
    alignItems: 'flex-start',
  },
  bigTitle: {
    fontSize: 34,
    lineHeight: 38,
    letterSpacing: -0.6,
    textAlign: 'left',
  },
  bigSubtitle: {
    fontSize: 18,
    marginTop: 4,
    textAlign: 'left',
  },
  sectionLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  emptyIllustration: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 22,
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  modalTitleCenter: {
    flex: 1,
    alignItems: 'center',
  },
  modalBigTitle: {
    fontSize: 26,
    letterSpacing: -0.3,
  },
  modalItalic: {
    fontSize: 14,
    marginTop: 2,
  },
  scanBurstDecor: {
    position: 'absolute',
    top: -22,
    right: -14,
    opacity: 0.35,
  },

  // Legacy header (unused — kept harmless)
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  modalHeaderBtn: {
    width: 38,
    height: 38,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
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
    marginBottom: 12,
    paddingLeft: 4,
  },
  sectionLabel: {
    fontSize: 11,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  addPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 999,
  },
  addPillText: { fontSize: 13 },

  // Empty state
  emptyCard: {
    alignItems: 'center',
    padding: 32,
    gap: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 28,
  },

  // Contact list
  cardGroup: {
    borderRadius: 28,
    borderWidth: 1,
    shadowColor: '#141313',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
    overflow: 'hidden',
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 18,
    gap: 12,
  },
  contactAvatar: {
    width: 44,
    height: 44,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactInfo: { flex: 1, gap: 3 },
  contactNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  contactName: { fontSize: 16, letterSpacing: -0.2 },
  primaryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 999,
  },
  primaryText: { fontSize: 10 },
  contactMeta: { fontSize: 13 },
  contactPhone: { fontSize: 13 },

  // Plan cards
  planCards: { gap: 12 },
  planCard: {
    padding: 18,
    borderRadius: 28,
    borderWidth: 1,
    shadowColor: '#141313',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
  },
  planHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  planTypeIcon: {
    width: 42,
    height: 42,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  planHeaderText: { flex: 1, gap: 4 },
  planProvider: { fontSize: 17 },
  planTypeBadge: { alignSelf: 'flex-start', paddingVertical: 3, paddingHorizontal: 10, borderRadius: 999 },
  planTypeText: { fontSize: 11 },
  planDetails: { gap: 8 },
  planField: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  planFieldValue: { fontSize: 13 },

  // Modal
  modalRoot: { flex: 1 },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  modalScroll: { paddingHorizontal: 20, paddingBottom: 20, gap: 8 },
  modalBottom: { paddingHorizontal: 20, paddingTop: 8 },

  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 22,
    height: 64,
    borderWidth: 1,
    borderRadius: 999,
    marginBottom: 4,
    marginTop: 6,
  },
  inputText: { flex: 1, fontSize: 15 },

  pickerList: { marginTop: 4, overflow: 'hidden', borderWidth: 1, borderRadius: 28 },
  pickerItem: { paddingVertical: 12, paddingHorizontal: 16 },
  pickerItemText: { fontSize: 15 },

  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 22,
    height: 64,
    borderWidth: 1,
    borderRadius: 999,
    marginTop: 16,
  },
  toggleLabel: { flex: 1, fontSize: 15 },
  toggleDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleDotInner: { width: 10, height: 10, borderRadius: 5 },

  chipRow: { flexDirection: 'row', gap: 10, marginBottom: 8 },
  typeChip: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: 999,
  },
  typeChipText: { fontSize: 14 },

  scanBanner: {
    padding: 16,
    borderWidth: 1,
    marginBottom: 8,
    gap: 14,
    borderRadius: 22,
    overflow: 'hidden',
  },
  scanBannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  scanBannerText: { flex: 1, gap: 2 },
  scanBannerTitle: { fontSize: 17 },
  scanBannerSubtitle: { fontSize: 12 },
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
    paddingVertical: 12,
    borderRadius: 999,
  },
  scanBtnText: { fontSize: 13 },
  scanningRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  scanningText: { fontSize: 13 },

  twoCol: { flexDirection: 'row', gap: 12 },
  twoColItem: { flex: 1 },
})
