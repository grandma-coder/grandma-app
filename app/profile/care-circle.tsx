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
  Linking,
  Image,
} from 'react-native'
import DateTimePicker from '@react-native-community/datetimepicker'
import * as ImagePicker from 'expo-image-picker'
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
  Camera,
  Dumbbell,
  Thermometer,
} from 'lucide-react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme, brand } from '../../constants/theme'
import { useChildStore } from '../../store/useChildStore'
import { supabase } from '../../lib/supabase'
import { LogSheet } from '../../components/calendar/LogSheet'

// ─── Types ─────────────────────────────────────────────────────────────────

interface CareCircleMember {
  email: string
  displayName: string
  photoUrl: string
  role: string
  status: string
  invite_token: string | null
  permissions: Record<string, any>
  childIds: string[]
  rowIds: string[]
}

interface ActivityEntry {
  id: string
  type: string
  childId: string
  childName: string
  loggedBy: string
  loggedByName: string
  date: string
  value: string | null
  notes: string | null
}

// ─── Role config ───────────────────────────────────────────────────────────

const ROLES = [
  { id: 'partner', label: 'Partner' },
  { id: 'family', label: 'Grandparent', dbRole: 'family' },
  { id: 'nanny', label: 'Nanny / Au Pair', dbRole: 'nanny' },
  { id: 'family_member', label: 'Family Member', dbRole: 'family' },
  { id: 'babysitter', label: 'Babysitter', dbRole: 'nanny' },
  { id: 'doctor', label: 'Doctor' },
]

const COUNTRY_CODES = [
  { code: '+1', flag: '🇺🇸', label: 'US' },
  { code: '+1', flag: '🇨🇦', label: 'CA' },
  { code: '+55', flag: '🇧🇷', label: 'BR' },
  { code: '+44', flag: '🇬🇧', label: 'UK' },
  { code: '+33', flag: '🇫🇷', label: 'FR' },
  { code: '+49', flag: '🇩🇪', label: 'DE' },
  { code: '+34', flag: '🇪🇸', label: 'ES' },
  { code: '+39', flag: '🇮🇹', label: 'IT' },
  { code: '+351', flag: '🇵🇹', label: 'PT' },
  { code: '+81', flag: '🇯🇵', label: 'JP' },
  { code: '+82', flag: '🇰🇷', label: 'KR' },
  { code: '+86', flag: '🇨🇳', label: 'CN' },
  { code: '+91', flag: '🇮🇳', label: 'IN' },
  { code: '+61', flag: '🇦🇺', label: 'AU' },
  { code: '+52', flag: '🇲🇽', label: 'MX' },
  { code: '+54', flag: '🇦🇷', label: 'AR' },
  { code: '+56', flag: '🇨🇱', label: 'CL' },
  { code: '+57', flag: '🇨🇴', label: 'CO' },
  { code: '+7', flag: '🇷🇺', label: 'RU' },
  { code: '+90', flag: '🇹🇷', label: 'TR' },
  { code: '+971', flag: '🇦🇪', label: 'AE' },
  { code: '+972', flag: '🇮🇱', label: 'IL' },
  { code: '+27', flag: '🇿🇦', label: 'ZA' },
  { code: '+234', flag: '🇳🇬', label: 'NG' },
  { code: '+62', flag: '🇮🇩', label: 'ID' },
  { code: '+66', flag: '🇹🇭', label: 'TH' },
  { code: '+84', flag: '🇻🇳', label: 'VN' },
  { code: '+48', flag: '🇵🇱', label: 'PL' },
  { code: '+31', flag: '🇳🇱', label: 'NL' },
  { code: '+46', flag: '🇸🇪', label: 'SE' },
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
  food: Utensils,
  sleep: MoonIcon,
  mood: Smile,
  diaper: Baby,
  health: Heart,
  temperature: Thermometer,
  vaccine: Shield,
  medicine: Heart,
  activity: Dumbbell,
  memory: Camera,
  photo: Camera,
  growth: Heart,
  milestone: Heart,
  note: MessageSquare,
}

const EVENT_COLORS: Record<string, string> = {
  feeding: brand.kids,
  food: brand.phase.ovulation,
  sleep: brand.pregnancy,
  mood: brand.accent,
  diaper: brand.secondary,
  health: brand.error,
  temperature: brand.error,
  vaccine: brand.error,
  medicine: brand.error,
  activity: brand.phase.ovulation,
  memory: brand.phase.ovulation,
  photo: brand.phase.ovulation,
  growth: brand.success,
  milestone: brand.accent,
  note: brand.secondary,
}

/** Convert raw log type + JSON value into a friendly, human-readable summary */
function formatActivitySummary(type: string, value: string | null, notes: string | null): string {
  if (!value) return notes ?? ''
  try {
    const v = JSON.parse(value)
    if (typeof v !== 'object' || v === null) return typeof v === 'string' ? v : (notes ?? '')

    switch (type) {
      case 'feeding': {
        const parts: string[] = []
        if (v.feedType === 'breast') {
          parts.push('Breastfed')
          if (v.side) parts.push(v.side === 'left' ? 'Left side' : v.side === 'right' ? 'Right side' : 'Both sides')
          if (v.duration) parts.push(`${v.duration} min`)
        } else if (v.feedType === 'bottle') {
          parts.push('Bottle')
          if (v.amount) parts.push(`${v.amount} ml`)
        }
        if (v.time) parts.push(fmtTime12(v.time))
        return parts.join(' · ') || notes || ''
      }
      case 'food': {
        const parts: string[] = []
        const meals: Record<string, string> = { breakfast: 'Breakfast', morning_snack: 'AM Snack', lunch: 'Lunch', afternoon_snack: 'PM Snack', dinner: 'Dinner', night_snack: 'Night Snack' }
        if (v.meal) parts.push(meals[v.meal] ?? v.meal)
        const quality: Record<string, string> = { ate_well: 'Ate well', ate_little: 'Ate a little', did_not_eat: 'Did not eat' }
        if (v.quality) parts.push(quality[v.quality] ?? v.quality)
        if (v.estimatedCals) parts.push(`~${v.estimatedCals} kcal`)
        if (v.time) parts.push(fmtTime12(v.time))
        return parts.join(' · ') || notes || ''
      }
      case 'sleep': {
        const parts: string[] = []
        if (v.startTime && v.endTime) parts.push(`${fmtTime12(v.startTime)} – ${fmtTime12(v.endTime)}`)
        else if (v.startTime) parts.push(`Started ${fmtTime12(v.startTime)}`)
        if (v.duration) parts.push(`${v.duration} hrs`)
        if (v.quality) parts.push(v.quality.charAt(0).toUpperCase() + v.quality.slice(1))
        return parts.join(' · ') || notes || ''
      }
      case 'diaper': {
        const parts: string[] = []
        const types: Record<string, string> = { pee: 'Wet 💧', poop: 'Dirty 💩', mixed: 'Both 🔄' }
        if (v.diaperType) parts.push(types[v.diaperType] ?? v.diaperType)
        if (v.color) parts.push(v.color.charAt(0).toUpperCase() + v.color.slice(1))
        if (v.consistency) parts.push(v.consistency)
        if (v.time) parts.push(fmtTime12(v.time))
        return parts.join(' · ') || notes || ''
      }
      case 'activity': {
        const parts: string[] = []
        if (v.name) parts.push(v.name)
        else if (v.activityType) parts.push(v.activityType.charAt(0).toUpperCase() + v.activityType.slice(1))
        if (v.startTime && v.endTime) parts.push(`${fmtTime12(v.startTime)} – ${fmtTime12(v.endTime)}`)
        if (v.duration) parts.push(v.duration)
        return parts.join(' · ') || notes || ''
      }
      case 'temperature':
        return v ? `${v}°C` : (notes ?? '')
      case 'mood':
        return ''  // mood value is a raw string, handled by the title
      default: {
        // For unknown types, try to extract meaningful fields
        if (v.name) return v.name
        if (v.value) return String(v.value)
        return notes ?? ''
      }
    }
  } catch {
    // Not JSON — mood values are just the mood string
    if (type === 'mood') return ''
    return value
  }
}

/** Format "HH:MM" to "H:MM AM/PM" */
function fmtTime12(t: string): string {
  const [hStr, mStr] = t.split(':')
  const h = parseInt(hStr, 10)
  const m = mStr ?? '00'
  if (isNaN(h)) return t
  const ampm = h >= 12 ? 'PM' : 'AM'
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h
  return `${h12}:${m} ${ampm}`
}

/** Friendly label for log type */
function friendlyTypeLabel(type: string, value: string | null): string {
  try {
    const v = value ? JSON.parse(value) : null
    if (type === 'feeding' && v?.feedType === 'breast') return 'Breastfeed'
    if (type === 'feeding' && v?.feedType === 'bottle') return 'Bottle Feed'
    if (type === 'mood' && typeof v === 'string') return `Mood: ${v.charAt(0).toUpperCase() + v.slice(1)}`
  } catch {
    if (type === 'mood' && value) return `Mood: ${value.charAt(0).toUpperCase() + value.slice(1)}`
  }
  const labels: Record<string, string> = {
    feeding: 'Feeding',
    food: 'Meal',
    sleep: 'Sleep',
    diaper: 'Diaper Change',
    mood: 'Mood',
    activity: 'Activity',
    temperature: 'Temperature',
    vaccine: 'Vaccine',
    medicine: 'Medicine',
    health: 'Health',
    photo: 'Memory',
    memory: 'Memory',
    growth: 'Growth',
    milestone: 'Milestone',
    note: 'Note',
  }
  return labels[type] ?? type.charAt(0).toUpperCase() + type.slice(1)
}

// ─── Photo Picker ─────────────────────────────────────────────────────────

function PhotoPickerAvatar({ uri, onPick, size = 80 }: { uri: string; onPick: (newUri: string) => void; size?: number }) {
  const { colors, radius } = useTheme()

  async function pickPhoto() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (status !== 'granted') {
      return Alert.alert('Permission needed', 'Please allow access to your photo library.')
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    })
    if (!result.canceled && result.assets[0]) {
      onPick(result.assets[0].uri)
    }
  }

  return (
    <Pressable onPress={pickPhoto} style={[photoStyles.wrap, { width: size, height: size, borderRadius: size / 2, backgroundColor: colors.surfaceRaised }]}>
      {uri ? (
        <Image source={{ uri }} style={{ width: size, height: size, borderRadius: size / 2 }} />
      ) : (
        <User size={size * 0.4} color={colors.textMuted} strokeWidth={1.5} />
      )}
      <View style={[photoStyles.badge, { backgroundColor: colors.primary, borderRadius: 12 }]}>
        <Camera size={12} color="#FFF" strokeWidth={2.5} />
      </View>
    </Pressable>
  )
}

async function uploadCaregiverPhoto(localUri: string, userId: string): Promise<string> {
  const ext = localUri.split('.').pop()?.split('?')[0] ?? 'jpg'
  const path = `caregivers/${userId}/${Date.now()}.${ext}`

  const response = await fetch(localUri)
  const blob = await response.blob()

  // Try garage-photos bucket first, fallback to creating it
  const { error } = await supabase.storage
    .from('garage-photos')
    .upload(path, blob, { contentType: `image/${ext}`, upsert: true })

  if (error) throw error

  const { data } = supabase.storage.from('garage-photos').getPublicUrl(path)
  return data.publicUrl
}

const photoStyles = StyleSheet.create({
  wrap: { alignSelf: 'center', alignItems: 'center', justifyContent: 'center', marginBottom: 12, overflow: 'hidden' },
  badge: { position: 'absolute', bottom: 0, right: 0, width: 24, height: 24, alignItems: 'center', justifyContent: 'center' },
})

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
  const [editingMember, setEditingMember] = useState<CareCircleMember | null>(null)

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
      .from('child_caregivers')
      .select('*')
      .eq('invited_by', session.user.id)
      .neq('status', 'revoked')

    // Group by email — one member may have access to multiple children
    const rows = (data ?? []) as any[]
    const selfEmail = session.user.email
    const grouped = new Map<string, CareCircleMember>()

    for (const row of rows) {
      // Skip self (parent entries)
      if (row.email === selfEmail || row.user_id === session.user.id) continue

      const existing = grouped.get(row.email)
      if (existing) {
        existing.childIds.push(row.child_id)
        existing.rowIds.push(row.id)
      } else {
        const perms = row.permissions ?? { view: true }
        const savedName = perms._display_name ?? ''
        const savedPhoto = perms._photo_url ?? ''
        const isPlaceholderEmail = row.email?.includes('@invite.local') || row.email?.includes('@pending')
        grouped.set(row.email, {
          email: isPlaceholderEmail ? '' : row.email,
          displayName: savedName || (isPlaceholderEmail ? '' : row.email),
          photoUrl: savedPhoto,
          role: row.role,
          status: row.status,
          invite_token: row.invite_token,
          permissions: perms,
          childIds: [row.child_id],
          rowIds: [row.id],
        })
      }
    }

    setMembers(Array.from(grouped.values()))
    setLoading(false)
  }

  async function loadActivities() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    const childIds = children.map((c) => c.id)
    if (childIds.length === 0) { setActivities([]); return }

    // Fetch recent child_logs for all children (last 30 days)
    const since = new Date()
    since.setDate(since.getDate() - 30)

    const { data: logs } = await supabase
      .from('child_logs')
      .select('id, child_id, user_id, date, type, value, notes, logged_by, created_at')
      .in('child_id', childIds)
      .gte('date', since.toISOString().split('T')[0])
      .order('created_at', { ascending: false })
      .limit(100)

    if (!logs || logs.length === 0) { setActivities([]); return }

    // Get unique logged_by user IDs to fetch names
    const loggerIds = [...new Set((logs as any[]).map((l) => l.logged_by ?? l.user_id).filter(Boolean))]

    // Fetch caregiver names from child_caregivers permissions
    const nameMap = new Map<string, string>()
    nameMap.set(session.user.id, 'You')

    if (loggerIds.length > 0) {
      const { data: caregivers } = await supabase
        .from('child_caregivers')
        .select('user_id, permissions')
        .in('user_id', loggerIds)

      for (const cg of (caregivers ?? []) as any[]) {
        if (cg.user_id && cg.permissions?._display_name) {
          nameMap.set(cg.user_id, cg.permissions._display_name)
        }
      }
    }

    const mapped: ActivityEntry[] = (logs as any[]).map((l) => {
      const loggerId = l.logged_by ?? l.user_id
      const childMatch = children.find((c) => c.id === l.child_id)
      return {
        id: l.id,
        type: l.type,
        childId: l.child_id,
        childName: childMatch?.name ?? 'Child',
        loggedBy: loggerId,
        loggedByName: nameMap.get(loggerId) ?? 'Caregiver',
        date: l.created_at ? new Date(l.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : l.date,
        value: l.value,
        notes: l.notes,
      }
    })

    setActivities(mapped)
  }

  async function pauseMember(member: CareCircleMember) {
    const isPaused = member.permissions._paused === true
    const action = isPaused ? 'Activate' : 'Pause'
    const msg = isPaused
      ? `Reactivate access for ${member.displayName || 'this member'}?`
      : `Temporarily suspend ${member.displayName || 'this member'}?`

    Alert.alert(`${action} Access`, msg, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: action,
        onPress: async () => {
          for (const id of member.rowIds) {
            const newPerms = { ...member.permissions, _paused: !isPaused }
            await supabase.from('child_caregivers').update({ permissions: newPerms }).eq('id', id)
          }
          loadMembers()
        },
      },
    ])
  }

  async function removeMember(member: CareCircleMember) {
    Alert.alert('Remove Member', `Remove ${member.displayName || 'this member'} and revoke all access? This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          for (const id of member.rowIds) {
            await supabase.from('child_caregivers').update({ status: 'revoked' }).eq('id', id)
          }
          loadMembers()
        },
      },
    ])
  }

  async function updateMember(member: CareCircleMember, updates: { displayName?: string; photoUrl?: string; role?: string; permLevel?: string; childIds?: string[] }) {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const perms = updates.permLevel
        ? PERMISSION_LEVELS.find((p) => p.id === updates.permLevel)?.perms ?? ['view']
        : Object.keys(member.permissions).filter((k) => !k.startsWith('_') && member.permissions[k])

      const permObj: Record<string, any> = {}
      for (const p of perms) permObj[p] = true
      permObj._display_name = updates.displayName ?? member.displayName

      // Upload new photo if it's a local file
      if (updates.photoUrl && !updates.photoUrl.startsWith('http') && session) {
        try {
          const url = await uploadCaregiverPhoto(updates.photoUrl, session.user.id)
          permObj._photo_url = url
        } catch (e) {
          console.warn('Photo upload failed:', e)
          permObj._photo_url = updates.photoUrl // fallback to local URI
        }
      } else if (updates.photoUrl) {
        permObj._photo_url = updates.photoUrl
      } else if (member.photoUrl) {
        permObj._photo_url = member.photoUrl
      }
      if (member.permissions._paused) permObj._paused = true

      const selectedRole = ROLES.find((r) => r.id === updates.role)
      const dbRole = updates.role ? ((selectedRole as any)?.dbRole ?? selectedRole?.id ?? member.role) : member.role
      const safeRole = ['parent', 'nanny', 'family'].includes(dbRole) ? dbRole : member.role

      for (const id of member.rowIds) {
        await supabase.from('child_caregivers').update({
          role: safeRole,
          permissions: permObj,
        }).eq('id', id)
      }

      loadMembers()
    } catch (e: any) {
      Alert.alert('Error', e.message)
    }
  }

  function resendInvite(member: CareCircleMember) {
    const token = member.invite_token ?? ''
    const inviteLink = `grandma-app://accept-invite?token=${token}`
    const msg = `Hey ${member.displayName || 'there'}! You're invited to join my Care Circle on grandma.app.\n\nTap to accept: ${inviteLink}`

    Alert.alert('Resend Invite', `How would you like to reach ${member.displayName || 'them'}?`, [
      {
        text: 'Email',
        onPress: () => {
          const to = member.email || ''
          const subject = encodeURIComponent('Join my Care Circle on grandma.app')
          const body = encodeURIComponent(msg)
          Linking.openURL(`mailto:${to}?subject=${subject}&body=${body}`).catch(() => {})
        },
      },
      {
        text: 'SMS',
        onPress: () => {
          const body = encodeURIComponent(msg)
          const smsUrl = Platform.OS === 'ios' ? `sms:&body=${body}` : `sms:?body=${body}`
          Linking.openURL(smsUrl).catch(() => {})
        },
      },
      {
        text: 'Share Link',
        onPress: () => { Share.share({ message: msg }).catch(() => {}) },
      },
      { text: 'Cancel', style: 'cancel' },
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
            const childNames = getChildNames(m.childIds)
            const permKeys = Object.entries(m.permissions).filter(([k, v]) => v === true && !k.startsWith('_')).map(([k]) => k)
            const title = m.displayName || m.role.charAt(0).toUpperCase() + m.role.slice(1)
            const isPaused = m.permissions._paused === true

            return (
              <View
                key={m.email || m.rowIds[0]}
                style={[styles.memberCard, { backgroundColor: colors.surface, borderRadius: radius.xl, opacity: isPaused ? 0.65 : 1 }]}
              >
                {/* Status dot — top right */}
                <View style={[styles.statusDot, { backgroundColor: isPaused ? brand.error : brand.success }]}>
                  <View style={[styles.statusDotInner, { backgroundColor: isPaused ? brand.error : brand.success }]} />
                </View>

                {/* Top row */}
                <View style={styles.memberTop}>
                  <View style={[styles.memberAvatar, { backgroundColor: roleColor + '20' }]}>
                    {m.photoUrl ? (
                      <Image source={{ uri: m.photoUrl }} style={styles.memberPhoto} />
                    ) : (
                      <User size={20} color={roleColor} strokeWidth={2} />
                    )}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.memberName, { color: colors.text }]}>
                      {title}
                    </Text>
                    {m.email ? (
                      <Text style={[styles.memberEmail, { color: colors.textMuted }]} numberOfLines={1}>{m.email}</Text>
                    ) : null}
                    <View style={styles.memberBadges}>
                      <View style={[styles.badge, { backgroundColor: roleColor + '20', borderRadius: radius.full }]}>
                        <Text style={[styles.badgeText, { color: roleColor }]}>
                          {m.role.charAt(0).toUpperCase() + m.role.slice(1)}
                        </Text>
                      </View>
                      <View style={[styles.badge, {
                        backgroundColor: isPaused ? brand.error + '20' : isPending ? brand.accent + '20' : brand.success + '20',
                        borderRadius: radius.full,
                      }]}>
                        {isPaused ? <Pause size={10} color={brand.error} /> : isPending ? <Clock size={10} color={brand.accent} /> : <Check size={10} color={brand.success} />}
                        <Text style={[styles.badgeText, { color: isPaused ? brand.error : isPending ? brand.accent : brand.success }]}>
                          {isPaused ? 'Paused' : m.status}
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
                  {permKeys.map((p) => (
                    <View key={p} style={[styles.permChip, { backgroundColor: colors.surfaceRaised, borderRadius: radius.full }]}>
                      <Shield size={10} color={colors.textMuted} />
                      <Text style={[styles.permText, { color: colors.textMuted }]}>{p.replace('_', ' ')}</Text>
                    </View>
                  ))}
                </View>

                {/* Actions row 1: Resend (for pending) */}
                {isPending && (
                  <Pressable
                    onPress={() => resendInvite(m)}
                    style={[styles.resendBtn, { backgroundColor: colors.primaryTint, borderRadius: radius.lg }]}
                  >
                    <Mail size={14} color={colors.primary} strokeWidth={2} />
                    <Text style={[styles.resendText, { color: colors.primary }]}>Resend Invite</Text>
                  </Pressable>
                )}

                {/* Actions row 2 */}
                <View style={styles.actionRow}>
                  <Pressable style={[styles.actionBtn, { borderColor: colors.primary + '30' }]} onPress={() => setEditingMember(m)}>
                    <Pencil size={14} color={colors.primary} />
                    <Text style={[styles.actionText, { color: colors.primary }]}>Edit</Text>
                  </Pressable>
                  <Pressable style={[styles.actionBtn, { borderColor: isPaused ? brand.success + '30' : colors.border }]} onPress={() => pauseMember(m)}>
                    {isPaused ? <Check size={14} color={brand.success} /> : <Pause size={14} color={brand.accent} />}
                    <Text style={[styles.actionText, { color: isPaused ? brand.success : brand.accent }]}>{isPaused ? 'Activate' : 'Pause'}</Text>
                  </Pressable>
                  <Pressable style={[styles.actionBtn, { borderColor: brand.error + '30' }]} onPress={() => removeMember(m)}>
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
          {/* Filter: By child */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterBar}>
            <FilterChip label="All Kids" active={!filterChild} onPress={() => setFilterChild(null)} />
            {children.map((c) => (
              <FilterChip key={c.id} label={c.name} active={filterChild === c.id} onPress={() => setFilterChild(filterChild === c.id ? null : c.id)} />
            ))}
          </ScrollView>

          {/* Filter: By caregiver */}
          {members.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterBar}>
              <FilterChip label="All People" active={!filterMember} onPress={() => setFilterMember(null)} />
              <FilterChip label="You" active={filterMember === 'self'} onPress={() => setFilterMember(filterMember === 'self' ? null : 'self')} />
              {members.map((m) => (
                <FilterChip key={m.rowIds[0]} label={m.displayName || m.role} active={filterMember === m.rowIds[0]} onPress={() => setFilterMember(filterMember === m.rowIds[0] ? null : m.rowIds[0])} />
              ))}
            </ScrollView>
          )}

          {/* Filtered activities */}
          {(() => {
            let filtered = activities

            // Filter by child
            if (filterChild) {
              filtered = filtered.filter((a) => a.childId === filterChild)
            }

            // Filter by caregiver
            if (filterMember === 'self') {
              filtered = filtered.filter((a) => a.loggedByName === 'You')
            } else if (filterMember) {
              const selectedMember = members.find((m) => m.rowIds[0] === filterMember)
              if (selectedMember) {
                // Match by the caregiver's user_id via their display name
                filtered = filtered.filter((a) => a.loggedByName === selectedMember.displayName)
              }
            }

            if (filtered.length === 0) {
              return (
                <View style={[styles.emptyCard, { backgroundColor: colors.surface, borderRadius: radius.xl }]}>
                  <Clock size={28} color={colors.textMuted} strokeWidth={1.5} />
                  <Text style={[styles.emptyTitle, { color: colors.text }]}>No activity yet</Text>
                  <Text style={[styles.emptyBody, { color: colors.textSecondary }]}>
                    Activities logged by caregivers will appear here.
                  </Text>
                </View>
              )
            }

            // Group by date
            const grouped = new Map<string, ActivityEntry[]>()
            for (const a of filtered) {
              const dateKey = a.date.split(',')[0] || a.date
              const arr = grouped.get(dateKey) ?? []
              arr.push(a)
              grouped.set(dateKey, arr)
            }

            return Array.from(grouped.entries()).map(([dateLabel, items]) => (
              <View key={dateLabel}>
                <Text style={[styles.dateHeader, { color: colors.textMuted }]}>{dateLabel}</Text>
                {items.map((a) => {
                  const Icon = EVENT_ICONS[a.type] ?? Heart
                  const color = EVENT_COLORS[a.type] ?? colors.textMuted
                  const summary = formatActivitySummary(a.type, a.value, a.notes)
                  const typeLabel = friendlyTypeLabel(a.type, a.value)
                  return (
                    <View key={a.id} style={[styles.activityItem, { backgroundColor: colors.surface, borderRadius: radius.xl }]}>
                      <View style={[styles.activityIcon, { backgroundColor: color + '15' }]}>
                        <Icon size={18} color={color} strokeWidth={2} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <View style={styles.activityTopRow}>
                          <Text style={[styles.activityType, { color: colors.text }]}>
                            {typeLabel}
                          </Text>
                          <View style={[styles.loggerBadge, { backgroundColor: colors.surfaceRaised, borderRadius: radius.full }]}>
                            <Text style={[styles.loggerText, { color: colors.textSecondary }]}>{a.loggedByName}</Text>
                          </View>
                        </View>
                        {summary !== '' && (
                          <Text style={[styles.activityValue, { color: colors.textSecondary }]} numberOfLines={2}>
                            {summary}
                          </Text>
                        )}
                        {a.notes && summary !== a.notes && (
                          <Text style={[styles.activityNotes, { color: colors.textMuted }]} numberOfLines={1}>
                            {a.notes}
                          </Text>
                        )}
                        <View style={styles.activityFooter}>
                          <View style={[styles.childTag, { backgroundColor: brand.kids + '12', borderRadius: radius.full }]}>
                            <Baby size={10} color={brand.kids} strokeWidth={2} />
                            <Text style={[styles.childTagText, { color: brand.kids }]}>{a.childName}</Text>
                          </View>
                          <Text style={[styles.activityTime, { color: colors.textMuted }]}>{a.date}</Text>
                        </View>
                      </View>
                    </View>
                  )
                })}
              </View>
            ))
          })()}
        </ScrollView>
      )}

      {/* ─── Add Member Bottom Sheet ────────────────────────────────── */}
      <AddMemberSheet
        visible={showAddSheet}
        onClose={() => setShowAddSheet(false)}
        onSaved={() => { setShowAddSheet(false); loadMembers() }}
      />

      {/* ─── Edit Member Sheet ─────────────────────────────────────── */}
      {editingMember && (
        <EditMemberSheet
          member={editingMember}
          onClose={() => setEditingMember(null)}
          onSaved={async (updates) => {
            await updateMember(editingMember, updates)
            setEditingMember(null)
          }}
        />
      )}
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

// ─── Add Member Sheet (4-step) ─────────────────────────────────────────────

function AddMemberSheet({ visible, onClose, onSaved }: { visible: boolean; onClose: () => void; onSaved: () => void }) {
  const { colors, radius } = useTheme()
  const allChildren = useChildStore((s) => s.children)

  const [step, setStep] = useState(1)
  const [name, setName] = useState('')
  const [photoUri, setPhotoUri] = useState('')
  const [role, setRole] = useState<string | null>(null)
  const [selectedChildren, setSelectedChildren] = useState<string[]>([])
  const [permLevel, setPermLevel] = useState<string>('contributor')
  const [inviteEmail, setInviteEmail] = useState('')
  const [invitePhone, setInvitePhone] = useState('')
  const [countryCode, setCountryCode] = useState('+1')
  const [showCountryPicker, setShowCountryPicker] = useState(false)
  const [sendMethod, setSendMethod] = useState<'email' | 'sms' | 'link'>('email')
  const [saving, setSaving] = useState(false)

  function reset() {
    setStep(1); setName(''); setPhotoUri(''); setRole(null); setSelectedChildren([])
    setPermLevel('contributor'); setInviteEmail(''); setInvitePhone('')
    setCountryCode('+1'); setShowCountryPicker(false); setSendMethod('email')
  }

  function handleClose() { reset(); onClose() }

  function toggleChild(id: string) {
    setSelectedChildren((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    )
  }

  async function handleSendInvite() {
    if (sendMethod === 'email' && !inviteEmail.trim()) {
      return Alert.alert('Email required', 'Enter an email address or switch to SMS / Share Link.')
    }
    if (sendMethod === 'sms' && !invitePhone.trim()) {
      return Alert.alert('Phone required', 'Enter a phone number or switch to Email / Share Link.')
    }

    setSaving(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Not authenticated')

      const perms = PERMISSION_LEVELS.find((p) => p.id === permLevel)?.perms ?? ['view']
      const selectedRole = ROLES.find((r) => r.id === role)
      const dbRole = (selectedRole as any)?.dbRole ?? selectedRole?.id ?? 'family'
      const safeRole = ['parent', 'nanny', 'family'].includes(dbRole) ? dbRole : 'family'

      const permObj: Record<string, any> = {}
      for (const p of perms) permObj[p] = true
      if (name.trim()) permObj._display_name = name.trim()

      if (photoUri) {
        if (photoUri.startsWith('http')) {
          permObj._photo_url = photoUri
        } else {
          try {
            const url = await uploadCaregiverPhoto(photoUri, session.user.id)
            permObj._photo_url = url
          } catch (uploadErr) {
            console.warn('Photo upload failed:', uploadErr)
            // Store local URI as fallback so at least something shows
            permObj._photo_url = photoUri
          }
        }
      }

      const email = inviteEmail.trim() || `pending_${Date.now()}@invite.local`

      // Use upsert to handle duplicate child+email combos
      for (const childId of selectedChildren) {
        const { data: existing } = await supabase
          .from('child_caregivers')
          .select('id')
          .eq('child_id', childId)
          .eq('email', email)
          .single()

        if (existing) {
          await supabase.from('child_caregivers').update({
            role: safeRole, status: 'pending', permissions: permObj,
          }).eq('id', existing.id)
        } else {
          await supabase.from('child_caregivers').insert({
            child_id: childId, email, role: safeRole,
            status: 'pending', permissions: permObj, invited_by: session.user.id,
          })
        }
      }

      // Get token for invite link
      const { data: tokenRow } = await supabase
        .from('child_caregivers')
        .select('invite_token')
        .eq('email', email)
        .eq('invited_by', session.user.id)
        .limit(1)
        .single()

      const token = tokenRow?.invite_token ?? ''
      const inviteLink = `grandma-app://accept-invite?token=${token}`
      const msg = `Hey ${name.trim() || 'there'}! You're invited to join my Care Circle on grandma.app.\n\nTap to accept: ${inviteLink}`

      if (sendMethod === 'email') {
        const subject = encodeURIComponent('Join my Care Circle on grandma.app')
        const body = encodeURIComponent(msg)
        Linking.openURL(`mailto:${inviteEmail.trim()}?subject=${subject}&body=${body}`).catch(() => {})
      } else if (sendMethod === 'sms') {
        const rawPhone = invitePhone.trim().replace(/[\s\-()]/g, '')
        const fullPhone = rawPhone.startsWith('+') ? rawPhone : `${countryCode}${rawPhone}`
        const body = encodeURIComponent(msg)
        const smsUrl = Platform.OS === 'ios' ? `sms:${fullPhone}&body=${body}` : `sms:${fullPhone}?body=${body}`
        Linking.openURL(smsUrl).catch(() => {})
      } else {
        await Share.share({ message: msg }).catch(() => {})
      }

      Alert.alert('Invite Sent!', `${name.trim() || 'Caregiver'} will appear as "Pending" until they accept.`)
      reset()
      onSaved()
    } catch (e: any) {
      Alert.alert('Error', e.message)
    } finally {
      setSaving(false)
    }
  }

  const STEP_TITLES = ['Who', 'Children', 'Permissions', 'Send Invite']

  return (
    <LogSheet visible={visible} title={STEP_TITLES[step - 1] ?? 'Add Member'} onClose={handleClose}>
      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={sheetStyles.form}>
          {/* Progress dots */}
          <View style={sheetStyles.progressRow}>
            {[1, 2, 3, 4].map((s) => (
              <View key={s} style={[sheetStyles.progressDot, { backgroundColor: s <= step ? colors.primary : colors.border }]} />
            ))}
          </View>

          {/* Step 1: Photo + Name + Role */}
          {step === 1 && (
            <>
              <PhotoPickerAvatar uri={photoUri} onPick={setPhotoUri} />
              <Text style={[sheetStyles.label, { color: colors.textSecondary }]}>NAME</Text>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="Caregiver's name"
                placeholderTextColor={colors.textMuted}
                style={[sheetStyles.input, { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg }]}
              />
              <Text style={[sheetStyles.label, { color: colors.textSecondary }]}>ROLE</Text>
              <View style={sheetStyles.chipGrid}>
                {ROLES.map((r) => {
                  const active = role === r.id
                  return (
                    <Pressable
                      key={r.id}
                      onPress={() => setRole(r.id)}
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
              <SheetButton label="Next — Select Children" onPress={() => setStep(2)} disabled={!role || !name.trim()} />
            </>
          )}

          {/* Step 2: Children */}
          {step === 2 && (
            <>
              <Text style={[sheetStyles.stepDesc, { color: colors.textSecondary }]}>
                Which children can {name || 'this person'} access?
              </Text>
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
              <View style={sheetStyles.btnRow}>
                <Pressable onPress={() => setStep(1)} style={[sheetStyles.backBtn, { borderColor: colors.border, borderRadius: radius.lg }]}>
                  <Text style={[sheetStyles.backBtnText, { color: colors.textSecondary }]}>Back</Text>
                </Pressable>
                <View style={{ flex: 1 }}>
                  <SheetButton label="Next — Permissions" onPress={() => setStep(3)} disabled={selectedChildren.length === 0} />
                </View>
              </View>
            </>
          )}

          {/* Step 3: Permissions */}
          {step === 3 && (
            <>
              <Text style={[sheetStyles.stepDesc, { color: colors.textSecondary }]}>
                What can {name || 'this person'} do?
              </Text>
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
              <View style={sheetStyles.btnRow}>
                <Pressable onPress={() => setStep(2)} style={[sheetStyles.backBtn, { borderColor: colors.border, borderRadius: radius.lg }]}>
                  <Text style={[sheetStyles.backBtnText, { color: colors.textSecondary }]}>Back</Text>
                </Pressable>
                <View style={{ flex: 1 }}>
                  <SheetButton label="Next — Send Invite" onPress={() => setStep(4)} />
                </View>
              </View>
            </>
          )}

          {/* Step 4: Contact + Send */}
          {step === 4 && (
            <>
              <Text style={[sheetStyles.stepDesc, { color: colors.textSecondary }]}>
                How do you want to invite {name || 'them'}? Pick one method below.
              </Text>

              {/* Method selector */}
              <View style={sheetStyles.chipGrid}>
                {(['email', 'sms', 'link'] as const).map((m) => {
                  const active = sendMethod === m
                  const labels = { email: 'Via Email', sms: 'Via SMS', link: 'Share Link' }
                  return (
                    <Pressable
                      key={m}
                      onPress={() => setSendMethod(m)}
                      style={[sheetStyles.chip, {
                        backgroundColor: active ? colors.primaryTint : colors.surface,
                        borderColor: active ? colors.primary : colors.border,
                        borderRadius: radius.full,
                      }]}
                    >
                      <Text style={[sheetStyles.chipText, { color: active ? colors.primary : colors.text }]}>{labels[m]}</Text>
                    </Pressable>
                  )
                })}
              </View>

              {/* Email field */}
              {sendMethod === 'email' && (
                <>
                  <Text style={[sheetStyles.label, { color: colors.textSecondary }]}>EMAIL ADDRESS</Text>
                  <TextInput
                    value={inviteEmail}
                    onChangeText={setInviteEmail}
                    placeholder="caregiver@email.com"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    style={[sheetStyles.input, { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg }]}
                  />
                </>
              )}

              {/* SMS fields */}
              {sendMethod === 'sms' && (
                <>
                  <Text style={[sheetStyles.label, { color: colors.textSecondary }]}>PHONE NUMBER</Text>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <Pressable
                      onPress={() => setShowCountryPicker(!showCountryPicker)}
                      style={[sheetStyles.countryBtn, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg }]}
                    >
                      <Text style={{ fontSize: 16 }}>{COUNTRY_CODES.find((c) => c.code === countryCode)?.flag ?? '🌍'}</Text>
                      <Text style={[sheetStyles.countryCode, { color: colors.text }]}>{countryCode}</Text>
                      <ChevronRight size={14} color={colors.textMuted} style={{ transform: [{ rotate: showCountryPicker ? '90deg' : '0deg' }] }} />
                    </Pressable>
                    <TextInput
                      value={invitePhone}
                      onChangeText={setInvitePhone}
                      placeholder="Phone number"
                      placeholderTextColor={colors.textMuted}
                      keyboardType="phone-pad"
                      style={[sheetStyles.input, { flex: 1, color: colors.text, backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg }]}
                    />
                  </View>
                  {showCountryPicker && (
                    <ScrollView style={[sheetStyles.countryList, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg }]} nestedScrollEnabled>
                      {COUNTRY_CODES.map((c) => (
                        <Pressable
                          key={`${c.flag}${c.code}`}
                          onPress={() => { setCountryCode(c.code); setShowCountryPicker(false) }}
                          style={({ pressed }) => [sheetStyles.countryRow, pressed && { backgroundColor: colors.surfaceRaised }]}
                        >
                          <Text style={{ fontSize: 18 }}>{c.flag}</Text>
                          <Text style={[sheetStyles.countryLabel, { color: colors.text }]}>{c.label}</Text>
                          <Text style={[sheetStyles.countryCodeText, { color: colors.textMuted }]}>{c.code}</Text>
                        </Pressable>
                      ))}
                    </ScrollView>
                  )}
                </>
              )}

              {/* Share link — no extra fields */}
              {sendMethod === 'link' && (
                <Text style={[sheetStyles.stepDesc, { color: colors.textMuted }]}>
                  A share sheet will open so you can send the invite link via any app.
                </Text>
              )}

              <View style={sheetStyles.btnRow}>
                <Pressable onPress={() => setStep(3)} style={[sheetStyles.backBtn, { borderColor: colors.border, borderRadius: radius.lg }]}>
                  <Text style={[sheetStyles.backBtnText, { color: colors.textSecondary }]}>Back</Text>
                </Pressable>
                <View style={{ flex: 1 }}>
                  <SheetButton label={saving ? 'Sending...' : `Send Invite ${sendMethod === 'email' ? '📧' : sendMethod === 'sms' ? '💬' : '🔗'}`} onPress={handleSendInvite} disabled={saving} />
                </View>
              </View>
            </>
          )}
        </View>
      </ScrollView>
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

// ─── Edit Member Sheet ────────────────────────────────────────────────────

function EditMemberSheet({ member, onClose, onSaved }: {
  member: CareCircleMember
  onClose: () => void
  onSaved: (updates: { displayName?: string; photoUrl?: string; role?: string; permLevel?: string }) => void
}) {
  const { colors, radius } = useTheme()

  const [editName, setEditName] = useState(member.displayName)
  const [editPhotoUri, setEditPhotoUri] = useState(member.photoUrl)
  const [editRole, setEditRole] = useState(member.role)
  const [editPermLevel, setEditPermLevel] = useState(() => {
    const perms = Object.keys(member.permissions).filter((k) => !k.startsWith('_') && member.permissions[k])
    if (perms.length >= 5) return 'full'
    if (perms.length >= 3) return 'contributor'
    return 'view'
  })

  return (
    <LogSheet visible title={`Edit ${member.displayName || 'Member'}`} onClose={onClose}>
      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={sheetStyles.form}>
          <PhotoPickerAvatar uri={editPhotoUri} onPick={setEditPhotoUri} />

          <Text style={[sheetStyles.label, { color: colors.textSecondary }]}>NAME</Text>
          <TextInput
            value={editName}
            onChangeText={setEditName}
            placeholder="Caregiver name"
            placeholderTextColor={colors.textMuted}
            style={[sheetStyles.input, { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg }]}
          />

          {member.email ? (
            <>
              <Text style={[sheetStyles.label, { color: colors.textSecondary }]}>EMAIL</Text>
              <Text style={[sheetStyles.readOnly, { color: colors.textMuted }]}>{member.email}</Text>
            </>
          ) : null}

          <Text style={[sheetStyles.label, { color: colors.textSecondary }]}>ROLE</Text>
          <View style={sheetStyles.chipGrid}>
            {ROLES.map((r) => {
              const active = editRole === r.id || editRole === ((r as any).dbRole ?? r.id)
              return (
                <Pressable
                  key={r.id}
                  onPress={() => setEditRole(r.id)}
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

          <Text style={[sheetStyles.label, { color: colors.textSecondary }]}>PERMISSION LEVEL</Text>
          {PERMISSION_LEVELS.map((p) => {
            const active = editPermLevel === p.id
            return (
              <Pressable
                key={p.id}
                onPress={() => setEditPermLevel(p.id)}
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

          <Pressable
            onPress={() => onSaved({ displayName: editName.trim(), photoUrl: editPhotoUri, role: editRole, permLevel: editPermLevel })}
            style={({ pressed }) => [
              sheetStyles.sheetBtn,
              { backgroundColor: colors.primary, borderRadius: radius.lg },
              pressed && { transform: [{ scale: 0.98 }] },
            ]}
          >
            <Text style={sheetStyles.sheetBtnText}>Save Changes</Text>
          </Pressable>
        </View>
      </ScrollView>
    </LogSheet>
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
  memberCard: { padding: 16, gap: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2, position: 'relative' as const, overflow: 'hidden' as const },
  statusDot: { position: 'absolute' as const, top: 14, right: 14, width: 10, height: 10, borderRadius: 5, zIndex: 1 },
  statusDotInner: { width: 10, height: 10, borderRadius: 5, opacity: 0.5 },
  memberTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  memberAvatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' as const },
  memberPhoto: { width: 44, height: 44, borderRadius: 22 },
  memberName: { fontSize: 16, fontWeight: '700' },
  memberEmail: { fontSize: 13, fontWeight: '500', marginTop: 1 },
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

  // Resend
  resendBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, marginTop: 2 },
  resendText: { fontSize: 13, fontWeight: '700' },

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
  dateHeader: { fontSize: 12, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase', marginTop: 8, marginBottom: 4 },
  activityItem: { flexDirection: 'row', alignItems: 'flex-start', padding: 14, gap: 12, marginBottom: 10 },
  activityIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  activityTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  activityType: { fontSize: 15, fontWeight: '700' },
  loggerBadge: { paddingHorizontal: 8, paddingVertical: 3 },
  loggerText: { fontSize: 10, fontWeight: '600' },
  activityValue: { fontSize: 13, fontWeight: '500', marginTop: 4, lineHeight: 18 },
  activityNotes: { fontSize: 12, fontWeight: '400', fontStyle: 'italic', marginTop: 3, lineHeight: 17 },
  activityFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
  childTag: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3 },
  childTagText: { fontSize: 10, fontWeight: '700' },
  activityTime: { fontSize: 10, fontWeight: '500' },
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
  progressRow: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginBottom: 4 },
  progressDot: { width: 8, height: 8, borderRadius: 4 },
  stepDesc: { fontSize: 14, fontWeight: '500', lineHeight: 20, marginBottom: 4 },
  btnRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
  backBtn: { paddingHorizontal: 20, height: 48, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  backBtnText: { fontSize: 14, fontWeight: '600' },
  sheetBtn: { height: 48, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  sheetBtnText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
  inviteRow: { flexDirection: 'row', gap: 10 },
  readOnly: { fontSize: 15, fontWeight: '500', paddingVertical: 4 },
  inviteBtn: { flex: 1, alignItems: 'center', paddingVertical: 20, gap: 8, borderWidth: 1 },
  inviteBtnText: { fontSize: 13, fontWeight: '700' },

  // Country code picker
  countryBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, height: 48, borderWidth: 1 },
  countryCode: { fontSize: 14, fontWeight: '600' },
  countryList: { maxHeight: 180, borderWidth: 1, marginTop: -4 },
  countryRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, paddingHorizontal: 14 },
  countryLabel: { fontSize: 14, fontWeight: '600', flex: 1 },
  countryCodeText: { fontSize: 13, fontWeight: '500' },
})
