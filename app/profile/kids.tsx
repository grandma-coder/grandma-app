/**
 * Kids Profile — list all children, edit/remove each, add new.
 */

import { useState, useEffect } from 'react'
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  Image,
  Alert,
  Platform,
  StyleSheet,
  ActivityIndicator,
} from 'react-native'
import DateTimePicker from '@react-native-community/datetimepicker'
import * as ImagePicker from 'expo-image-picker'
import { router } from 'expo-router'
import {
  ArrowLeft,
  User,
  Plus,
  Camera,
  Pencil,
  Trash2,
  Save,
  X,
  Check,
  AlertTriangle,
} from 'lucide-react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme, brand } from '../../constants/theme'
import { useChildStore } from '../../store/useChildStore'
import { supabase } from '../../lib/supabase'
import { LogSheet } from '../../components/calendar/LogSheet'
import type { ChildWithRole } from '../../types'

// ─── Helpers ───────────────────────────────────────────────────────────────

function formatAge(birthDate: string): string {
  if (!birthDate) return ''
  const born = new Date(birthDate)
  const now = new Date()
  const months = (now.getFullYear() - born.getFullYear()) * 12 + (now.getMonth() - born.getMonth())
  if (months < 1) return 'Newborn'
  if (months < 12) return `${months} months`
  const y = Math.floor(months / 12)
  const m = months % 12
  return m > 0 ? `${y}y ${m}m` : `${y} year${y > 1 ? 's' : ''}`
}

// ─── Main Screen ───────────────────────────────────────────────────────────

export default function KidsProfileScreen() {
  const { colors, radius } = useTheme()
  const insets = useSafeAreaInsets()
  const children = useChildStore((s) => s.children)
  const setChildren = useChildStore((s) => s.setChildren)

  const [editingChild, setEditingChild] = useState<ChildWithRole | null>(null)
  const [showAddSheet, setShowAddSheet] = useState(false)

  async function handleDelete(child: ChildWithRole) {
    Alert.alert(
      `Remove ${child.name}?`,
      'This will remove this child profile and all associated logs. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await supabase.from('children').delete().eq('id', child.id)
              setChildren(children.filter((c) => c.id !== child.id))
            } catch (e: any) {
              Alert.alert('Error', e.message)
            }
          },
        },
      ]
    )
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={() => router.back()} style={styles.headerBtn}>
          <ArrowLeft size={24} color={colors.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Kids Profile</Text>
        <Pressable onPress={() => setShowAddSheet(true)} style={styles.headerBtn}>
          <Plus size={22} color={colors.primary} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {children.length === 0 && (
          <View style={[styles.emptyCard, { backgroundColor: colors.surface, borderRadius: radius.xl }]}>
            <User size={36} color={colors.textMuted} strokeWidth={1.5} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No children added</Text>
            <Text style={[styles.emptyBody, { color: colors.textSecondary }]}>
              Add your children to start tracking their health and growth.
            </Text>
          </View>
        )}

        {children.map((child) => (
          <View
            key={child.id}
            style={[styles.childCard, { backgroundColor: colors.surface, borderRadius: radius.xl }]}
          >
            {/* Photo + Name */}
            <View style={styles.childHeader}>
              <View style={[styles.childAvatar, { backgroundColor: colors.surfaceRaised }]}>
                <User size={28} color={colors.textMuted} strokeWidth={1.5} />
              </View>
              <View style={styles.childInfo}>
                <Text style={[styles.childName, { color: colors.text }]}>{child.name}</Text>
                {child.birthDate ? (
                  <Text style={[styles.childAge, { color: colors.textSecondary }]}>
                    {formatAge(child.birthDate)} — Born {new Date(child.birthDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </Text>
                ) : (
                  <Text style={[styles.childAge, { color: colors.textMuted }]}>No birth date set</Text>
                )}
              </View>
            </View>

            {/* Details */}
            {child.allergies.length > 0 && (
              <View style={styles.detailRow}>
                <AlertTriangle size={14} color={brand.error} strokeWidth={2} />
                <Text style={[styles.detailLabel, { color: brand.error }]}>Allergies:</Text>
                <Text style={[styles.detailValue, { color: colors.textSecondary }]}>
                  {child.allergies.join(', ')}
                </Text>
              </View>
            )}
            {child.medications.length > 0 && (
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Medications:</Text>
                <Text style={[styles.detailValue, { color: colors.textSecondary }]}>
                  {child.medications.join(', ')}
                </Text>
              </View>
            )}

            {/* Actions */}
            <View style={styles.actionRow}>
              <Pressable
                onPress={() => setEditingChild(child)}
                style={[styles.actionBtn, { backgroundColor: colors.primaryTint, borderRadius: radius.lg }]}
              >
                <Pencil size={16} color={colors.primary} strokeWidth={2} />
                <Text style={[styles.actionText, { color: colors.primary }]}>Edit</Text>
              </Pressable>
              <Pressable
                onPress={() => handleDelete(child)}
                style={[styles.actionBtn, { backgroundColor: brand.error + '10', borderRadius: radius.lg }]}
              >
                <Trash2 size={16} color={brand.error} strokeWidth={2} />
                <Text style={[styles.actionText, { color: brand.error }]}>Remove</Text>
              </Pressable>
            </View>
          </View>
        ))}

        {/* Add child button */}
        <Pressable
          onPress={() => setShowAddSheet(true)}
          style={({ pressed }) => [
            styles.addBtn,
            { backgroundColor: colors.primary, borderRadius: radius.lg },
            pressed && { opacity: 0.9 },
          ]}
        >
          <Plus size={20} color="#FFFFFF" strokeWidth={2} />
          <Text style={styles.addBtnText}>Add a Child</Text>
        </Pressable>
      </ScrollView>

      {/* Edit sheet */}
      {editingChild && (
        <EditChildSheet
          child={editingChild}
          onClose={() => setEditingChild(null)}
          onSaved={(updated) => {
            setChildren(children.map((c) => (c.id === updated.id ? updated : c)))
            setEditingChild(null)
          }}
        />
      )}

      {/* Add sheet */}
      <AddChildSheet
        visible={showAddSheet}
        onClose={() => setShowAddSheet(false)}
        onAdded={(newChild) => {
          setChildren([...children, newChild])
          setShowAddSheet(false)
        }}
      />
    </View>
  )
}

// ─── Edit Child Sheet ──────────────────────────────────────────────────────

function EditChildSheet({
  child,
  onClose,
  onSaved,
}: {
  child: ChildWithRole
  onClose: () => void
  onSaved: (updated: ChildWithRole) => void
}) {
  const { colors, radius } = useTheme()

  const [name, setName] = useState(child.name)
  const [birthDate, setBirthDate] = useState(child.birthDate)
  const [allergies, setAllergies] = useState(child.allergies.join(', '))
  const [medications, setMedications] = useState(child.medications.join(', '))
  const [showDatePicker, setShowDatePicker] = useState(Platform.OS === 'ios')
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    if (!name.trim()) return Alert.alert('Name required')
    setSaving(true)
    try {
      const allergyList = allergies ? allergies.split(',').map((a) => a.trim()).filter(Boolean) : []
      const medList = medications ? medications.split(',').map((m) => m.trim()).filter(Boolean) : []

      const { error } = await supabase.from('children').update({
        name: name.trim(),
        dob: birthDate || null,
        allergies: allergyList,
        medications: medList,
      }).eq('id', child.id)

      if (error) throw error

      onSaved({
        ...child,
        name: name.trim(),
        birthDate: birthDate ?? '',
        allergies: allergyList,
        medications: medList,
      })
    } catch (e: any) {
      Alert.alert('Error', e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <LogSheet visible title={`Edit ${child.name}`} onClose={onClose}>
      <ScrollView style={{ maxHeight: 450 }} showsVerticalScrollIndicator={false}>
        <View style={formStyles.form}>
          <FormField label="Name" value={name} onChangeText={setName} placeholder="Child name" />

          <Text style={[formStyles.label, { color: colors.textSecondary }]}>BIRTH DATE</Text>
          {Platform.OS === 'android' && !showDatePicker && (
            <Pressable
              onPress={() => setShowDatePicker(true)}
              style={[formStyles.dateBtn, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg }]}
            >
              <Text style={[formStyles.dateText, { color: birthDate ? colors.text : colors.textMuted }]}>
                {birthDate ? new Date(birthDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : 'Select date'}
              </Text>
            </Pressable>
          )}
          {showDatePicker && (
            <DateTimePicker
              value={birthDate ? new Date(birthDate) : new Date()}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              maximumDate={new Date()}
              minimumDate={new Date(2005, 0, 1)}
              themeVariant="light"
              onChange={(_, d) => {
                if (Platform.OS === 'android') setShowDatePicker(false)
                if (d) setBirthDate(d.toISOString().split('T')[0])
              }}
            />
          )}

          <FormField label="Allergies" value={allergies} onChangeText={setAllergies} placeholder="Comma-separated (e.g. Milk, Eggs)" />
          <FormField label="Medications" value={medications} onChangeText={setMedications} placeholder="Comma-separated" />

          <Pressable
            onPress={handleSave}
            disabled={saving}
            style={({ pressed }) => [
              formStyles.saveBtn,
              { backgroundColor: colors.primary, borderRadius: radius.lg, opacity: saving ? 0.6 : 1 },
              pressed && { transform: [{ scale: 0.98 }] },
            ]}
          >
            <Save size={18} color="#FFFFFF" strokeWidth={2} />
            <Text style={formStyles.saveBtnText}>{saving ? 'Saving...' : 'Save Changes'}</Text>
          </Pressable>
        </View>
      </ScrollView>
    </LogSheet>
  )
}

// ─── Add Child Sheet ───────────────────────────────────────────────────────

function AddChildSheet({
  visible,
  onClose,
  onAdded,
}: {
  visible: boolean
  onClose: () => void
  onAdded: (child: ChildWithRole) => void
}) {
  const { colors, radius } = useTheme()

  const [name, setName] = useState('')
  const [birthDate, setBirthDate] = useState<string | null>(null)
  const [allergies, setAllergies] = useState('')
  const [showDatePicker, setShowDatePicker] = useState(Platform.OS === 'ios')
  const [saving, setSaving] = useState(false)

  function reset() {
    setName('')
    setBirthDate(null)
    setAllergies('')
  }

  async function handleSave() {
    if (!name.trim()) return Alert.alert('Name required')
    setSaving(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Not authenticated')

      const allergyList = allergies ? allergies.split(',').map((a) => a.trim()).filter(Boolean) : []

      const { data, error } = await supabase.from('children').insert({
        user_id: session.user.id,
        name: name.trim(),
        dob: birthDate,
        allergies: allergyList,
      }).select().single()

      if (error) throw error

      // Create care_circle self entry
      await supabase.from('care_circle').insert({
        owner_id: session.user.id,
        member_user_id: session.user.id,
        role: 'partner',
        permissions: ['view', 'log_activity', 'chat', 'edit_child', 'emergency'],
        children_access: [data.id],
        status: 'accepted',
      })

      const newChild: ChildWithRole = {
        id: data.id,
        parentId: data.user_id,
        name: data.name,
        birthDate: data.dob ?? '',
        weightKg: 0,
        heightCm: 0,
        allergies: data.allergies ?? [],
        medications: [],
        countryCode: 'US',
        caregiverRole: 'parent',
        permissions: { view: true, log_activity: true, chat: true },
      }

      reset()
      onAdded(newChild)
    } catch (e: any) {
      Alert.alert('Error', e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <LogSheet visible={visible} title="Add a Child" onClose={() => { reset(); onClose() }}>
      <ScrollView style={{ maxHeight: 450 }} showsVerticalScrollIndicator={false}>
        <View style={formStyles.form}>
          <FormField label="Name" value={name} onChangeText={setName} placeholder="Child's name" />

          <Text style={[formStyles.label, { color: colors.textSecondary }]}>BIRTH DATE</Text>
          {Platform.OS === 'android' && !showDatePicker && (
            <Pressable
              onPress={() => setShowDatePicker(true)}
              style={[formStyles.dateBtn, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg }]}
            >
              <Text style={[formStyles.dateText, { color: birthDate ? colors.text : colors.textMuted }]}>
                {birthDate ? new Date(birthDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : 'Select date'}
              </Text>
            </Pressable>
          )}
          {showDatePicker && (
            <DateTimePicker
              value={birthDate ? new Date(birthDate) : new Date()}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              maximumDate={new Date()}
              minimumDate={new Date(2005, 0, 1)}
              themeVariant="light"
              onChange={(_, d) => {
                if (Platform.OS === 'android') setShowDatePicker(false)
                if (d) setBirthDate(d.toISOString().split('T')[0])
              }}
            />
          )}

          <FormField label="Allergies" value={allergies} onChangeText={setAllergies} placeholder="Comma-separated (optional)" />

          <Pressable
            onPress={handleSave}
            disabled={saving || !name.trim()}
            style={({ pressed }) => [
              formStyles.saveBtn,
              { backgroundColor: colors.primary, borderRadius: radius.lg, opacity: saving || !name.trim() ? 0.4 : 1 },
              pressed && { transform: [{ scale: 0.98 }] },
            ]}
          >
            <Plus size={18} color="#FFFFFF" strokeWidth={2} />
            <Text style={formStyles.saveBtnText}>{saving ? 'Adding...' : 'Add Child'}</Text>
          </Pressable>
        </View>
      </ScrollView>
    </LogSheet>
  )
}

// ─── Form Field ────────────────────────────────────────────────────────────

function FormField({ label, value, onChangeText, placeholder, multiline }: {
  label: string; value: string; onChangeText: (t: string) => void; placeholder: string; multiline?: boolean
}) {
  const { colors, radius } = useTheme()
  return (
    <View style={formStyles.field}>
      <Text style={[formStyles.label, { color: colors.textSecondary }]}>{label.toUpperCase()}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        multiline={multiline}
        style={[
          formStyles.input,
          { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg },
          multiline && { height: 80, textAlignVertical: 'top', paddingTop: 12 },
        ]}
      />
    </View>
  )
}

// ─── Styles ────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 12 },
  headerBtn: { width: 40, alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  scroll: { paddingHorizontal: 20, paddingBottom: 40, gap: 16 },

  // Empty
  emptyCard: { alignItems: 'center', padding: 32, gap: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  emptyTitle: { fontSize: 18, fontWeight: '700' },
  emptyBody: { fontSize: 14, fontWeight: '500', textAlign: 'center', lineHeight: 20 },

  // Child card
  childCard: { padding: 16, gap: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  childHeader: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  childAvatar: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  childInfo: { flex: 1, gap: 2 },
  childName: { fontSize: 18, fontWeight: '700' },
  childAge: { fontSize: 14, fontWeight: '500' },

  // Details
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  detailLabel: { fontSize: 13, fontWeight: '600' },
  detailValue: { fontSize: 13, fontWeight: '400', flex: 1 },

  // Actions
  actionRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10 },
  actionText: { fontSize: 14, fontWeight: '600' },

  // Add
  addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 52, marginTop: 4 },
  addBtnText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
})

const formStyles = StyleSheet.create({
  form: { gap: 14, paddingBottom: 8 },
  field: { gap: 6 },
  label: { fontSize: 12, fontWeight: '700', letterSpacing: 0.5 },
  input: { borderWidth: 1, paddingHorizontal: 16, height: 48, fontSize: 15, fontWeight: '500' },
  dateBtn: { paddingVertical: 14, paddingHorizontal: 16, borderWidth: 1 },
  dateText: { fontSize: 15, fontWeight: '500' },
  saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 52, marginTop: 4 },
  saveBtnText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
})
