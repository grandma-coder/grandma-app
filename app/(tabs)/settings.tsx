import { useEffect, useState, useRef } from 'react'
import { View, Text, ScrollView, Pressable, Alert, Switch, StyleSheet } from 'react-native'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { supabase } from '../../lib/supabase'
import { useChildStore } from '../../store/useChildStore'
import { useModeStore } from '../../store/useModeStore'
import { useJourneyStore } from '../../store/useJourneyStore'
import { useThemeStore } from '../../store/useThemeStore'
import { ModeSwitcher } from '../../components/home/ModeSwitcher'
import { CosmicBackground } from '../../components/ui/CosmicBackground'
import { useAppTheme } from '../../components/ui/ThemeProvider'
import { colors, THEME_COLORS, borderRadius, shadows, spacing, typography } from '../../constants/theme'

interface ScanEntry {
  id: string
  scan_type: string
  created_at: string
}

function getAge(birthDate: string): string {
  if (!birthDate) return ''
  const birth = new Date(birthDate)
  const now = new Date()
  const months = (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth())
  if (months < 1) return 'Newborn'
  const years = Math.floor(months / 12)
  const rem = months % 12
  if (years >= 1 && rem > 0) return `${years}Y ${rem}M OLD`
  if (years >= 1) return `${years}Y OLD`
  return `${months}M OLD`
}

const scanTypeLabel: Record<string, string> = {
  medicine: 'Medicine scan',
  food: 'Food scan',
  nutrition: 'Nutrition check',
  general: 'General scan',
}

export default function Settings() {
  const insets = useSafeAreaInsets()
  const child = useChildStore((s) => s.activeChild)
  const clearChildren = useChildStore((s) => s.clearChildren)
  const mode = useModeStore((s) => s.mode)
  const parentName = useJourneyStore((s) => s.parentName)
  const dueDate = useJourneyStore((s) => s.dueDate)
  const weekNumber = useJourneyStore((s) => s.weekNumber)
  const theme = useThemeStore((s) => s.theme)
  const toggleTheme = useThemeStore((s) => s.toggleTheme)
  const { colors } = useAppTheme()
  const [scans, setScans] = useState<ScanEntry[]>([])
  const [adminMode, setAdminMode] = useState(false)
  const tapCountRef = useRef(0)
  const tapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  function handleHeadingPress() {
    tapCountRef.current += 1
    if (tapTimerRef.current) clearTimeout(tapTimerRef.current)
    if (tapCountRef.current >= 5) {
      tapCountRef.current = 0
      setAdminMode((prev) => !prev)
    } else {
      tapTimerRef.current = setTimeout(() => { tapCountRef.current = 0 }, 1500)
    }
  }

  useEffect(() => {
    if (!child?.id) return
    supabase
      .from('scan_history')
      .select('id, scan_type, created_at')
      .eq('child_id', child.id)
      .order('created_at', { ascending: false })
      .limit(10)
      .then(({ data }) => {
        if (data) setScans(data)
      })
  }, [child?.id])

  async function signOut() {
    await supabase.auth.signOut()
    clearChildren()
  }

  return (
    <CosmicBackground>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 40 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.label}>ACCOUNT</Text>
        <Pressable onPress={handleHeadingPress}>
          <Text style={styles.heading}>Settings</Text>
        </Pressable>

        {/* Super Admin Mode Switcher — hidden, tap heading 5x to toggle */}
        {adminMode && (
          <View style={{ marginBottom: 24 }}>
            <Text style={[styles.sectionLabel, { color: THEME_COLORS.orange }]}>ADMIN MODE</Text>
            <ModeSwitcher />
          </View>
        )}

        {/* Profile Card — adapts per mode */}
        {mode === 'pre-pregnancy' && (
          <View style={[styles.profileCard, { backgroundColor: THEME_COLORS.pink }]}>
            <View style={styles.profileTop}>
              <View style={styles.avatar}>
                <Text style={styles.avatarEmoji}>✨</Text>
              </View>
              <Text style={styles.childName}>{parentName ?? 'Your Journey'}</Text>
              <Text style={styles.childAge}>TRYING TO CONCEIVE</Text>
            </View>
          </View>
        )}

        {mode === 'pregnancy' && (
          <View style={[styles.profileCard, { backgroundColor: THEME_COLORS.purple }]}>
            <View style={styles.profileTop}>
              <View style={styles.avatar}>
                <Text style={styles.avatarEmoji}>🤰</Text>
              </View>
              <Text style={styles.childName}>{parentName ?? 'Your Pregnancy'}</Text>
              {weekNumber ? (
                <Text style={styles.childAge}>WEEK {weekNumber}</Text>
              ) : null}
            </View>
            {dueDate && (
              <View style={styles.infoRow}>
                <View style={styles.infoItem}>
                  <Ionicons name="calendar-outline" size={14} color="rgba(255,255,255,0.7)" />
                  <Text style={styles.infoText}>Due: {dueDate}</Text>
                </View>
              </View>
            )}
          </View>
        )}

        {mode === 'kids' && (
          child ? (
            <View style={styles.profileCard}>
              <View style={styles.profileTop}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarEmoji}>👶</Text>
                </View>
                <Text style={styles.childName}>{child.name}</Text>
                {child.birthDate ? (
                  <Text style={styles.childAge}>{getAge(child.birthDate)}</Text>
                ) : null}
              </View>
              <View style={styles.infoRow}>
                {child.birthDate ? (
                  <View style={styles.infoItem}>
                    <Ionicons name="calendar-outline" size={14} color="rgba(255,255,255,0.7)" />
                    <Text style={styles.infoText}>{child.birthDate}</Text>
                  </View>
                ) : null}
                {child.weightKg > 0 ? (
                  <View style={styles.infoItem}>
                    <Ionicons name="scale-outline" size={14} color="rgba(255,255,255,0.7)" />
                    <Text style={styles.infoText}>{child.weightKg} kg</Text>
                  </View>
                ) : null}
              </View>
              {child.allergies.length > 0 && (
                <View style={styles.allergyRow}>
                  <Ionicons name="warning-outline" size={16} color={THEME_COLORS.yellow} />
                  <Text style={styles.allergyText}>
                    Allergies: {child.allergies.join(', ')}
                  </Text>
                </View>
              )}
            </View>
          ) : (
            <Pressable
              onPress={() => router.push('/onboarding/journey')}
              style={styles.addChildButton}
            >
              <Text style={styles.addChildText}>Add your child's profile</Text>
            </Pressable>
          )
        )}

        {/* Manage Caregivers — Kids mode only */}
        {mode === 'kids' && child && child.caregiverRole === 'parent' && (
          <Pressable
            onPress={() => router.push('/manage-caregivers')}
            style={styles.caregiversCard}
          >
            <View style={styles.caregiversIconWrap}>
              <Ionicons name="people" size={20} color={THEME_COLORS.pink} />
            </View>
            <Text style={styles.caregiversText}>Manage Caregivers</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
          </Pressable>
        )}

        {mode === 'kids' && child && child.caregiverRole !== 'parent' && (
          <View style={styles.roleBadge}>
            <Ionicons name="shield-checkmark-outline" size={16} color={THEME_COLORS.green} />
            <Text style={styles.roleBadgeText}>
              You're a {child.caregiverRole} for {child.name}
            </Text>
          </View>
        )}

        {/* Scan History */}
        <Text style={styles.sectionLabel}>SCAN HISTORY</Text>
        {scans.length > 0 ? (
          scans.map((scan) => (
            <View key={scan.id} style={styles.scanItem}>
              <Ionicons name="scan-outline" size={18} color={THEME_COLORS.yellow} />
              <View style={{ flex: 1 }}>
                <Text style={styles.scanLabel}>
                  {scanTypeLabel[scan.scan_type] ?? scan.scan_type}
                </Text>
                <Text style={styles.scanDate}>
                  {new Date(scan.created_at).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Text>
              </View>
            </View>
          ))
        ) : (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconWrap}>
              <Ionicons name="camera-outline" size={40} color={colors.textTertiary} />
            </View>
            <Text style={styles.emptyTitle}>No scans yet</Text>
            <Text style={styles.emptySubtext}>
              Scan a medicine or food label to see history here.
            </Text>
          </View>
        )}

        {/* Appearance */}
        <Text style={[styles.sectionLabel, { color: colors.textTertiary }]}>APPEARANCE</Text>
        <View style={[styles.themeRow, { backgroundColor: colors.surfaceGlass, borderColor: colors.border }]}>
          <View style={styles.themeLeft}>
            <Ionicons
              name={theme === 'dark' ? 'moon' : 'sunny'}
              size={20}
              color={theme === 'dark' ? THEME_COLORS.purple : THEME_COLORS.yellow}
            />
            <View>
              <Text style={[styles.themeLabel, { color: colors.text }]}>
                {theme === 'dark' ? 'Dark Mode' : 'Light Mode'}
              </Text>
              <Text style={[styles.themeDesc, { color: colors.textTertiary }]}>
                {theme === 'dark' ? 'Easy on the eyes' : 'Bright and clean'}
              </Text>
            </View>
          </View>
          <Switch
            value={theme === 'light'}
            onValueChange={toggleTheme}
            trackColor={{ false: 'rgba(255,255,255,0.15)', true: THEME_COLORS.yellow }}
            thumbColor="#FFFFFF"
          />
        </View>

        {/* Sign Out */}
        <Pressable
          onPress={() =>
            Alert.alert('Sign out', 'Are you sure?', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Sign out', onPress: signOut, style: 'destructive' },
            ])
          }
          style={styles.signOutButton}
        >
          <Ionicons name="log-out-outline" size={18} color={THEME_COLORS.orange} />
          <Text style={styles.signOutText}>Sign Out Account</Text>
        </Pressable>
      </ScrollView>
    </CosmicBackground>
  )
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: spacing['2xl'],
  },
  label: {
    ...typography.label,
    marginBottom: 4,
  },
  heading: {
    ...typography.heading,
    marginBottom: 24,
  },

  // Profile Card — Blue solid
  profileCard: {
    backgroundColor: THEME_COLORS.blue,
    borderRadius: borderRadius['2xl'],
    padding: 28,
    marginBottom: 16,
    ...shadows.glowBlue,
  },
  profileTop: {
    alignItems: 'center',
    marginBottom: 20,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(0,0,0,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  avatarEmoji: {
    fontSize: 32,
  },
  childName: {
    fontSize: 36,
    fontWeight: '900',
    color: '#FFFFFF',
    textTransform: 'uppercase',
    letterSpacing: -0.5,
  },
  childAge: {
    fontSize: 14,
    fontWeight: '900',
    color: 'rgba(255,255,255,0.7)',
    letterSpacing: 3,
    textTransform: 'uppercase',
    marginTop: 4,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    marginBottom: 16,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  infoText: {
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.8)',
  },
  allergyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: borderRadius.full,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  allergyText: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME_COLORS.yellow,
    flex: 1,
  },
  addChildButton: {
    backgroundColor: THEME_COLORS.yellow,
    borderRadius: borderRadius.lg,
    padding: 20,
    alignItems: 'center',
    marginBottom: 16,
    ...shadows.glow,
  },
  addChildText: {
    color: '#0A0A0A',
    fontSize: 16,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },

  // Caregivers Card
  caregiversCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surfaceGlass,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 18,
    marginBottom: 24,
  },
  caregiversIconWrap: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.sm,
    backgroundColor: 'rgba(255, 138, 216, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  caregiversText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(162, 255, 134, 0.1)',
    borderRadius: borderRadius.lg,
    padding: 14,
    marginBottom: 24,
  },
  roleBadgeText: {
    fontSize: 14,
    fontWeight: '600',
    color: THEME_COLORS.green,
  },

  // Scan History
  sectionLabel: {
    ...typography.label,
    marginBottom: 16,
    marginTop: 8,
  },
  scanItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surfaceGlass,
    borderRadius: borderRadius.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 8,
  },
  scanLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  scanDate: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.textTertiary,
    marginTop: 2,
  },

  // Empty state
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 24,
  },
  emptyIconWrap: {
    width: 80,
    height: 80,
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    borderColor: colors.border,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: colors.text,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  emptySubtext: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },

  // Theme toggle
  themeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    padding: 18,
    marginBottom: 24,
  },
  themeLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  themeLabel: {
    fontSize: 16,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  themeDesc: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },

  // Sign Out
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderWidth: 2,
    borderColor: THEME_COLORS.orange,
    borderRadius: borderRadius.full,
    paddingVertical: 18,
    marginTop: 32,
  },
  signOutText: {
    fontSize: 15,
    fontWeight: '900',
    color: THEME_COLORS.orange,
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
})
