/**
 * E3 — Care Circle
 *
 * Two tabs: Members | Activity Feed
 * Members: list + add member 5-step bottom sheet
 * Activity: chronological log with filters
 */

import { useState, useEffect, useCallback } from 'react'
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  FlatList,
  Alert,
  StyleSheet,
  Share,
  Platform,
} from 'react-native'
import DateTimePicker from '@react-native-community/datetimepicker'
import { router } from 'expo-router'
import {
  ArrowLeft,
  UserPlus,
  Users,
  Shield,
  Clock,
  Check,
  X,
  Pause,
  Pencil,
  Trash2,
  Mail,
  MessageSquare,
  Link2,
  ChevronRight,
  User,
  Baby,
  Utensils,
  Moon as MoonIcon,
  Heart,
  Smile,
} from 'lucide-react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme, brand } from '../../constants/theme'
import { useChildStore } from '../../store/useChildStore'
import { supabase } from '../../lib/supabase'
import { LogSheet } from '../../components/calendar/LogSheet'

// ─── Types ─────────────────────────────────────────────────────────────────

interface CareCircleMember {
  id: string
  role: string
  status: string
  invite_email: string | null
  invite_token: string | null
  permissions: string[]
  children_access: string[]
  access_type: string
  access_end: string | null
}

interface ActivityEntry {
  id: string
  type: string
  child_name: string
  logged_by_name: string
  date: string
  value: string | null
}

// ─── Role config ───────────────────────────────────────────────────────────

const ROLES = [
  { id: 'partner', label: 'Partner' },
  { id: 'family', label: 'Grandparent' },
  { id: 'nanny', label: 'Nanny / Au Pair' },
  { id: 'family', label: 'Family Member' },
  { id: 'nanny', label: 'Babysitter' },
  { id: 'doctor', label: 'Doctor' },
]

const ROLE_COLORS: Record<string, string> = {
  partner: brand.prePregnancy,
  nanny: brand.pregnancy,
  family: brand.accent,
  doctor: brand.secondary,
}

const PERMISSION_LEVELS = [
  { id: 'view', label: 'View Only', perms: ['view'], desc: 'Can see logs but not add' },
  { id: 'contributor', label: 'Contributor', perms: ['view', 'log_activity', 'chat'], desc: 'Can view and log activities' },
  { id: 'full', label: 'Full Contributor', perms: ['view', 'log_activity', 'chat', 'edit_child', 'emergency'], desc: 'Full access including emergency' },
]

const EVENT_ICONS: Record<string, typeof Utensils> = {
  feeding: Utensils,
  sleep: MoonIcon,
  mood: Smile,
  food: Utensils,
  note: MessageSquare,
}

const EVENT_COLORS: Record<string, string> = {
  feeding: brand.kids,
  sleep: brand.pregnancy,
  mood: brand.accent,
  food: brand.phase.ovulation,
  note: brand.secondary,
}

// ─── Main Component ────────────────────────────────────────────────────────

export default function CareCircleScreen() {
  const { colors, radius } = useTheme()
  const insets = useSafeAreaInsets()
  const children = useChildStore((s) => s.children)

  const [tab, setTab] = useState<'members' | 'activity'>('members')
  const [members, setMembers] = useState<CareCircleMember[]>([])
  const [activities, setActivities] = useState<ActivityEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddSheet, setShowAddSheet] = useState(false)

  // Activity filters
  const [filterMember, setFilterMember] = useState<string | null>(null)
  const [filterChild, setFilterChild] = useState<string | null>(null)

  useEffect(() => {
    loadMembers()
    loadActivities()
  }, [])

  async function loadMembers() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    const { data } = await supabase
      .from('care_circle')
      .select('*')
      .eq('owner_id', session.user.id)
      .neq('status', 'revoked')

    // Filter out self
    setMembers(
      ((data ?? []) as CareCircleMember[]).filter(
        (m: any) => m.member_user_id !== session.user.id
      )
    )
    setLoading(false)
  }

  async function loadActivities() {
    // Mock activities — in production, query child_logs joined with profiles
    setActivities([
      { id: '1', type: 'feeding', child_name: children[0]?.name ?? 'Child', logged_by_name: 'Nanny Maria', date: '2026-04-05 08:30', value: 'Breakfast — oatmeal' },
      { id: '2', type: 'sleep', child_name: children[0]?.name ?? 'Child', logged_by_name: 'Partner', date: '2026-04-05 10:00', value: 'Nap — 1.5 hours' },
      { id: '3', type: 'mood', child_name: children[0]?.name ?? 'Child', logged_by_name: 'Nanny Maria', date: '2026-04-05 12:15', value: 'Happy' },
    ])
  }

  async function pauseMember(id: string) {
    Alert.alert('Pause Access', 'Temporarily suspend access?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Pause',
        onPress: async () => {
          await supabase.from('care_circle').update({ status: 'expired' }).eq('id', id)
          loadMembers()
        },
      },
    ])
  }

  async function removeMember(id: string) {
    Alert.alert('Remove Member', 'This will revoke all access. Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          await supabase.from('care_circle').update({ status: 'revoked' }).eq('id', id)
          loadMembers()
        },
      },
    ])
  }

  function getChildNames(ids: string[]): string[] {
    return ids.map((id) => children.find((c) => c.id === id)?.name ?? 'Child').filter(Boolean)
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={() => router.back()} style={styles.headerBtn}>
          <ArrowLeft size={24} color={colors.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Care Circle</Text>
        <View style={styles.headerBtn} />
      </View>

      {/* Tab Toggle */}
      <View style={[styles.toggleRow, { backgroundColor: colors.surfaceRaised, borderRadius: radius.lg, marginHorizontal: 20 }]}>
        <Pressable
          onPress={() => setTab('members')}
          style={[styles.toggleBtn, { backgroundColor: tab === 'members' ? colors.primary : 'transparent', borderRadius: radius.md }]}
        >
          <Text style={[styles.toggleText, { color: tab === 'members' ? '#FFFFFF' : colors.textSecondary }]}>Members</Text>
        </Pressable>
        <Pressable
          onPress={() => setTab('activity')}
          style={[styles.toggleBtn, { backgroundColor: tab === 'activity' ? colors.primary : 'transparent', borderRadius: radius.md }]}
        >
          <Text style={[styles.toggleText, { color: tab === 'activity' ? '#FFFFFF' : colors.textSecondary }]}>Activity</Text>
        </Pressable>
      </View>

      {tab === 'members' ? (
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {/* Empty state */}
          {members.length === 0 && !loading && (
            <View style={[styles.emptyCard, { backgroundColor: colors.surface, borderRadius: radius.xl }]}>
              <Users size={32} color={colors.textMuted} strokeWidth={1.5} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>No caregivers yet</Text>
              <Text style={[styles.emptyBody, { color: colors.textSecondary }]}>
                Invite a partner, nanny, or family member to share access.
              </Text>
            </View>
          )}

          {/* Member cards */}
          {members.map((m) => {
            const roleColor = ROLE_COLORS[m.role] ?? colors.textSecondary
            const isPending = m.status === 'pending'
            const childNames = getChildNames(m.children_access ?? [])

            return (
              <View
                key={m.id}
                style={[styles.memberCard, { backgroundColor: colors.surface, borderRadius: radius.xl }]}
              >
                {/* Top row */}
                <View style={styles.memberTop}>
                  <View style={[styles.memberAvatar, { backgroundColor: roleColor + '20' }]}>
                    <User size={20} color={roleColor} strokeWidth={2} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.memberName, { color: colors.text }]}>
                      {m.invite_email ?? m.role.charAt(0).toUpperCase() + m.role.slice(1)}
                    </Text>
                    <View style={styles.memberBadges}>
                      <View style={[styles.badge, { backgroundColor: roleColor + '20', borderRadius: radius.full }]}>
                        <Text style={[styles.badgeText, { color: roleColor }]}>
                          {m.role.charAt(0).toUpperCase() + m.role.slice(1)}
                        </Text>
                      </View>
                      <View style={[styles.badge, { backgroundColor: isPending ? brand.accent + '20' : brand.success + '20', borderRadius: radius.full }]}>
                        {isPending ? <Clock size={10} color={brand.accent} /> : <Check size={10} color={brand.success} />}
                        <Text style={[styles.badgeText, { color: isPending ? brand.accent : brand.success }]}>
                          {m.status}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>

                {/* Children access */}
                {childNames.length > 0 && (
                  <View style={styles.childChipRow}>
                    {childNames.map((name, i) => (
                      <View key={i} style={[styles.childChip, { backgroundColor: brand.kids + '15', borderRadius: radius.full }]}>
                        <Baby size={12} color={brand.kids} strokeWidth={2} />
                        <Text style={[styles.childChipText, { color: brand.kids }]}>{name}</Text>
                      </View>
                    ))}
                  </View>
                )}

                {/* Permissions */}
                <View style={styles.permRow}>
                  {(m.permissions ?? []).map((p) => (
                    <View key={p} style={[styles.permChip, { backgroundColor: colors.surfaceRaised, borderRadius: radius.full }]}>
                      <Shield size={10} color={colors.textMuted} />
                      <Text style={[styles.permText, { color: colors.textMuted }]}>{p.replace('_', ' ')}</Text>
                    </View>
                  ))}
                </View>

                {/* Access duration */}
                {m.access_type === 'temporary' && m.access_end && (
                  <Text style={[styles.accessEnd, { color: colors.textMuted }]}>
                    Access until {new Date(m.access_end).toLocaleDateString()}
                  </Text>
                )}

                {/* Actions */}
                <View style={styles.actionRow}>
                  <Pressable style={[styles.actionBtn, { borderColor: colors.border }]} onPress={() => {}}>
                    <Pencil size={14} color={colors.textSecondary} />
                    <Text style={[styles.actionText, { color: colors.textSecondary }]}>Edit</Text>
                  </Pressable>
                  <Pressable style={[styles.actionBtn, { borderColor: colors.border }]} onPress={() => pauseMember(m.id)}>
                    <Pause size={14} color={brand.accent} />
                    <Text style={[styles.actionText, { color: brand.accent }]}>Pause</Text>
                  </Pressable>
                  <Pressable style={[styles.actionBtn, { borderColor: brand.error + '30' }]} onPress={() => removeMember(m.id)}>
                    <Trash2 size={14} color={brand.error} />
                    <Text style={[styles.actionText, { color: brand.error }]}>Remove</Text>
                  </Pressable>
                </View>
              </View>
            )
          })}

          {/* Add button */}
          <Pressable
            onPress={() => setShowAddSheet(true)}
            style={({ pressed }) => [
              styles.addBtn,
              { backgroundColor: colors.primary, borderRadius: radius.lg },
              pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] },
            ]}
          >
            <UserPlus size={20} color="#FFFFFF" strokeWidth={2} />
            <Text style={styles.addBtnText}>Add to Care Circle</Text>
          </Pressable>
        </ScrollView>
      ) : (
        /* Activity Feed */
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {/* Filter bar */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterBar}>
            <FilterChip label="All" active={!filterMember && !filterChild} onPress={() => { setFilterMember(null); setFilterChild(null) }} />
            {children.map((c) => (
              <FilterChip key={c.id} label={c.name} active={filterChild === c.id} onPress={() => setFilterChild(filterChild === c.id ? null : c.id)} />
            ))}
          </ScrollView>

          {/* Activity list */}
          {activities.map((a) => {
            const Icon = EVENT_ICONS[a.type] ?? Heart
            const color = EVENT_COLORS[a.type] ?? colors.textMuted
            return (
              <View key={a.id} style={[styles.activityItem, { backgroundColor: colors.surface, borderRadius: radius.xl }]}>
                <View style={[styles.activityIcon, { backgroundColor: color + '15' }]}>
                  <Icon size={18} color={color} strokeWidth={2} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.activityType, { color: colors.text }]}>
                    {a.type.charAt(0).toUpperCase() + a.type.slice(1)}
                  </Text>
                  <Text style={[styles.activityValue, { color: colors.textSecondary }]} numberOfLines={1}>
                    {a.value}
                  </Text>
                  <Text style={[styles.activityMeta, { color: colors.textMuted }]}>
                    {a.child_name} — {a.logged_by_name} — {a.date}
                  </Text>
                </View>
              </View>
            )
          })}
        </ScrollView>
      )}

      {/* ─── Add Member Bottom Sheet ────────────────────────────────── */}
      <AddMemberSheet
        visible={showAddSheet}
        onClose={() => setShowAddSheet(false)}
        onSaved={() => { setShowAddSheet(false); loadMembers() }}
      />
    </View>
  )
}

// ─── Filter Chip ───────────────────────────────────────────────────────────

function FilterChip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  const { colors, radius } = useTheme()
  return (
    <Pressable
      onPress={onPress}
      style={[styles.filterChip, {
        backgroundColor: active ? colors.primaryTint : colors.surface,
        borderColor: active ? colors.primary : colors.border,
        borderRadius: radius.full,
      }]}
    >
      <Text style={[styles.filterChipText, { color: active ? colors.primary : colors.text }]}>{label}</Text>
    </Pressable>
  )
}

// ─── Add Member Sheet (5-step) ─────────────────────────────────────────────

function AddMemberSheet({ visible, onClose, onSaved }: { visible: boolean; onClose: () => void; onSaved: () => void }) {
  const { colors, radius } = useTheme()
  const allChildren = useChildStore((s) => s.children)

  const [step, setStep] = useState(1)
  const [name, setName] = useState('')
  const [role, setRole] = useState<string | null>(null)
  const [selectedChildren, setSelectedChildren] = useState<string[]>([])
  const [permLevel, setPermLevel] = useState<string>('contributor')
  const [accessType, setAccessType] = useState<'permanent' | 'temporary'>('permanent')
  const [accessEnd, setAccessEnd] = useState<Date | null>(null)
  const [inviteEmail, setInviteEmail] = useState('')
  const [saving, setSaving] = useState(false)

  function reset() {
    setStep(1); setName(''); setRole(null); setSelectedChildren([])
    setPermLevel('contributor'); setAccessType('permanent'); setAccessEnd(null); setInviteEmail('')
  }

  function handleClose() { reset(); onClose() }

  function toggleChild(id: string) {
    setSelectedChildren((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    )
  }

  async function handleSend(method: 'email' | 'sms' | 'link') {
    setSaving(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Not authenticated')

      const perms = PERMISSION_LEVELS.find((p) => p.id === permLevel)?.perms ?? ['view']
      const token = `cc_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`

      await supabase.from('care_circle').insert({
        owner_id: session.user.id,
        role: role ?? 'family',
        permissions: perms,
        children_access: selectedChildren,
        access_type: accessType,
        access_end: accessType === 'temporary' && accessEnd ? accessEnd.toISOString() : null,
        status: 'pending',
        invite_email: inviteEmail || null,
        invite_token: token,
      })

      if (method === 'link') {
        await Share.share({ message: `Join my Care Circle on grandma.app: grandma-app://accept-invite?token=${token}` })
      }

      reset()
      onSaved()
    } catch (e: any) {
      Alert.alert('Error', e.message)
    } finally {
      setSaving(false)
    }
  }

  const totalSteps = 5

  return (
    <LogSheet visible={visible} title={`Add Member (${step}/${totalSteps})`} onClose={handleClose}>
      <View style={sheetStyles.form}>
        {/* Step 1: Name + Role */}
        {step === 1 && (
          <>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Name (optional)"
              placeholderTextColor={colors.textMuted}
              style={[sheetStyles.input, { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg }]}
            />
            <Text style={[sheetStyles.label, { color: colors.textSecondary }]}>ROLE</Text>
            <View style={sheetStyles.chipGrid}>
              {ROLES.map((r, i) => {
                const active = role === r.id + i
                return (
                  <Pressable
                    key={r.label}
                    onPress={() => setRole(r.id + i)}
                    style={[sheetStyles.chip, {
                      backgroundColor: active ? colors.primaryTint : colors.surface,
                      borderColor: active ? colors.primary : colors.border,
                      borderRadius: radius.full,
                    }]}
                  >
                    <Text style={[sheetStyles.chipText, { color: active ? colors.primary : colors.text }]}>{r.label}</Text>
                  </Pressable>
                )
              })}
            </View>
            <SheetButton label="Next" onPress={() => setStep(2)} disabled={!role} />
          </>
        )}

        {/* Step 2: Children */}
        {step === 2 && (
          <>
            <Text style={[sheetStyles.label, { color: colors.textSecondary }]}>SELECT CHILDREN</Text>
            <View style={sheetStyles.chipGrid}>
              {allChildren.map((c) => {
                const active = selectedChildren.includes(c.id)
                return (
                  <Pressable
                    key={c.id}
                    onPress={() => toggleChild(c.id)}
                    style={[sheetStyles.chip, {
                      backgroundColor: active ? brand.kids + '15' : colors.surface,
                      borderColor: active ? brand.kids : colors.border,
                      borderRadius: radius.full,
                    }]}
                  >
                    {active && <Check size={12} color={brand.kids} strokeWidth={3} />}
                    <Text style={[sheetStyles.chipText, { color: active ? brand.kids : colors.text }]}>{c.name}</Text>
                  </Pressable>
                )
              })}
            </View>
            <SheetButton label="Next" onPress={() => setStep(3)} disabled={selectedChildren.length === 0} />
          </>
        )}

        {/* Step 3: Permission level */}
        {step === 3 && (
          <>
            <Text style={[sheetStyles.label, { color: colors.textSecondary }]}>PERMISSION LEVEL</Text>
            {PERMISSION_LEVELS.map((p) => {
              const active = permLevel === p.id
              return (
                <Pressable
                  key={p.id}
                  onPress={() => setPermLevel(p.id)}
                  style={[sheetStyles.permCard, {
                    backgroundColor: active ? colors.primaryTint : colors.surface,
                    borderColor: active ? colors.primary : colors.border,
                    borderRadius: radius.xl,
                  }]}
                >
                  <Text style={[sheetStyles.permLabel, { color: active ? colors.primary : colors.text }]}>{p.label}</Text>
                  <Text style={[sheetStyles.permDesc, { color: colors.textMuted }]}>{p.desc}</Text>
                </Pressable>
              )
            })}
            <SheetButton label="Next" onPress={() => setStep(4)} />
          </>
        )}

        {/* Step 4: Access duration */}
        {step === 4 && (
          <>
            <Text style={[sheetStyles.label, { color: colors.textSecondary }]}>ACCESS DURATION</Text>
            <View style={sheetStyles.chipGrid}>
              <Pressable
                onPress={() => setAccessType('permanent')}
                style={[sheetStyles.chip, {
                  backgroundColor: accessType === 'permanent' ? colors.primaryTint : colors.surface,
                  borderColor: accessType === 'permanent' ? colors.primary : colors.border,
                  borderRadius: radius.full,
                }]}
              >
                <Text style={[sheetStyles.chipText, { color: accessType === 'permanent' ? colors.primary : colors.text }]}>Permanent</Text>
              </Pressable>
              <Pressable
                onPress={() => setAccessType('temporary')}
                style={[sheetStyles.chip, {
                  backgroundColor: accessType === 'temporary' ? colors.primaryTint : colors.surface,
                  borderColor: accessType === 'temporary' ? colors.primary : colors.border,
                  borderRadius: radius.full,
                }]}
              >
                <Text style={[sheetStyles.chipText, { color: accessType === 'temporary' ? colors.primary : colors.text }]}>Temporary</Text>
              </Pressable>
            </View>
            {accessType === 'temporary' && (
              <DateTimePicker
                value={accessEnd ?? new Date()}
                mode="date"
                minimumDate={new Date()}
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={(_, d) => d && setAccessEnd(d)}
                themeVariant="light"
              />
            )}
            <SheetButton label="Next" onPress={() => setStep(5)} />
          </>
        )}

        {/* Step 5: Send invite */}
        {step === 5 && (
          <>
            <TextInput
              value={inviteEmail}
              onChangeText={setInviteEmail}
              placeholder="Email address"
              placeholderTextColor={colors.textMuted}
              keyboardType="email-address"
              autoCapitalize="none"
              style={[sheetStyles.input, { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg }]}
            />
            <View style={sheetStyles.inviteRow}>
              <InviteButton icon={Mail} label="Email" color={brand.secondary} onPress={() => handleSend('email')} saving={saving} />
              <InviteButton icon={MessageSquare} label="SMS" color={brand.phase.ovulation} onPress={() => handleSend('sms')} saving={saving} />
              <InviteButton icon={Link2} label="Copy Link" color={colors.primary} onPress={() => handleSend('link')} saving={saving} />
            </View>
          </>
        )}
      </View>
    </LogSheet>
  )
}

function SheetButton({ label, onPress, disabled }: { label: string; onPress: () => void; disabled?: boolean }) {
  const { colors, radius } = useTheme()
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        sheetStyles.sheetBtn,
        { backgroundColor: colors.primary, borderRadius: radius.lg, opacity: disabled ? 0.4 : 1 },
        pressed && !disabled && { transform: [{ scale: 0.98 }] },
      ]}
    >
      <Text style={sheetStyles.sheetBtnText}>{label}</Text>
    </Pressable>
  )
}

function InviteButton({ icon: Icon, label, color, onPress, saving }: { icon: typeof Mail; label: string; color: string; onPress: () => void; saving: boolean }) {
  const { colors, radius } = useTheme()
  return (
    <Pressable
      onPress={onPress}
      disabled={saving}
      style={[sheetStyles.inviteBtn, { backgroundColor: color + '12', borderColor: color + '25', borderRadius: radius.xl }]}
    >
      <Icon size={22} color={color} strokeWidth={2} />
      <Text style={[sheetStyles.inviteBtnText, { color }]}>{label}</Text>
    </Pressable>
  )
}

// ─── Styles ────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 12 },
  headerBtn: { width: 40, alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  toggleRow: { flexDirection: 'row', padding: 4, marginBottom: 16 },
  toggleBtn: { flex: 1, alignItems: 'center', paddingVertical: 10 },
  toggleText: { fontSize: 14, fontWeight: '700' },
  scroll: { paddingHorizontal: 20, paddingBottom: 40, gap: 12 },

  // Empty
  emptyCard: { alignItems: 'center', padding: 32, gap: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  emptyTitle: { fontSize: 18, fontWeight: '700' },
  emptyBody: { fontSize: 14, fontWeight: '500', textAlign: 'center', lineHeight: 20 },

  // Member card
  memberCard: { padding: 16, gap: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  memberTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  memberAvatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  memberName: { fontSize: 16, fontWeight: '700' },
  memberBadges: { flexDirection: 'row', gap: 6, marginTop: 4 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 2, paddingHorizontal: 8 },
  badgeText: { fontSize: 11, fontWeight: '700', textTransform: 'capitalize' },

  // Children chips
  childChipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  childChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 4, paddingHorizontal: 10 },
  childChipText: { fontSize: 12, fontWeight: '600' },

  // Permissions
  permRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  permChip: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingVertical: 2, paddingHorizontal: 8 },
  permText: { fontSize: 10, fontWeight: '600', textTransform: 'capitalize' },
  accessEnd: { fontSize: 12, fontWeight: '500' },

  // Actions
  actionRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 8, borderWidth: 1, borderRadius: 10 },
  actionText: { fontSize: 12, fontWeight: '600' },

  // Add button
  addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 52, marginTop: 8 },
  addBtnText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },

  // Filter
  filterBar: { gap: 8, paddingBottom: 12 },
  filterChip: { paddingVertical: 6, paddingHorizontal: 14, borderWidth: 1 },
  filterChipText: { fontSize: 13, fontWeight: '600' },

  // Activity
  activityItem: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  activityIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  activityType: { fontSize: 14, fontWeight: '700' },
  activityValue: { fontSize: 13, fontWeight: '400', marginTop: 1 },
  activityMeta: { fontSize: 11, fontWeight: '500', marginTop: 2 },
})

const sheetStyles = StyleSheet.create({
  form: { gap: 16, paddingBottom: 8 },
  label: { fontSize: 12, fontWeight: '700', letterSpacing: 1 },
  input: { borderWidth: 1, paddingHorizontal: 16, height: 48, fontSize: 15, fontWeight: '500' },
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 8, paddingHorizontal: 14, borderWidth: 1 },
  chipText: { fontSize: 13, fontWeight: '600' },
  permCard: { padding: 14, borderWidth: 1, gap: 4 },
  permLabel: { fontSize: 15, fontWeight: '700' },
  permDesc: { fontSize: 12, fontWeight: '400' },
  sheetBtn: { height: 48, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  sheetBtnText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
  inviteRow: { flexDirection: 'row', gap: 10 },
  inviteBtn: { flex: 1, alignItems: 'center', paddingVertical: 20, gap: 8, borderWidth: 1 },
  inviteBtnText: { fontSize: 13, fontWeight: '700' },
})
