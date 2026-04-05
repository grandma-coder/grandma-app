/**
 * Settings — units, display, account, privacy.
 */

import { useState } from 'react'
import {
  View,
  Text,
  Pressable,
  ScrollView,
  Switch,
  Alert,
  StyleSheet,
} from 'react-native'
import { router } from 'expo-router'
import { ArrowLeft, Moon, Sun, Thermometer, Scale, Trash2 } from 'lucide-react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme, brand } from '../../constants/theme'
import { useThemeStore } from '../../store/useThemeStore'
import { supabase } from '../../lib/supabase'

export default function SettingsScreen() {
  const { colors, radius, isDark } = useTheme()
  const insets = useSafeAreaInsets()
  const setTheme = useThemeStore((s) => s.setTheme)
  const theme = useThemeStore((s) => s.theme)

  const [tempUnit, setTempUnit] = useState<'celsius' | 'fahrenheit'>('celsius')
  const [weightUnit, setWeightUnit] = useState<'kg' | 'lbs'>('kg')

  function toggleDark() {
    setTheme(theme === 'dark' ? 'light' : 'dark')
  }

  async function handleDeleteAccount() {
    Alert.alert(
      'Delete Account',
      'This will permanently delete your account and all data. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            // In production, this would call a server-side function
            Alert.alert('Contact Support', 'Please contact support@grandma.app to delete your account.')
          },
        },
      ]
    )
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={24} color={colors.text} />
        </Pressable>
        <Text style={[styles.title, { color: colors.text }]}>Settings</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Display */}
        <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>DISPLAY</Text>
        <View style={[styles.card, { backgroundColor: colors.surface, borderRadius: radius.xl }]}>
          <View style={[styles.row, { borderBottomWidth: 1, borderBottomColor: colors.borderLight }]}>
            <View style={styles.rowLeft}>
              {isDark ? <Moon size={18} color={colors.primary} strokeWidth={2} /> : <Sun size={18} color={brand.accent} strokeWidth={2} />}
              <Text style={[styles.rowLabel, { color: colors.text }]}>Dark Mode</Text>
            </View>
            <Switch
              value={isDark}
              onValueChange={toggleDark}
              trackColor={{ false: colors.surfaceRaised, true: colors.primary + '60' }}
              thumbColor={isDark ? colors.primary : colors.textMuted}
            />
          </View>
        </View>

        {/* Units */}
        <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>UNITS</Text>
        <View style={[styles.card, { backgroundColor: colors.surface, borderRadius: radius.xl }]}>
          <View style={[styles.row, { borderBottomWidth: 1, borderBottomColor: colors.borderLight }]}>
            <View style={styles.rowLeft}>
              <Thermometer size={18} color={brand.accent} strokeWidth={2} />
              <Text style={[styles.rowLabel, { color: colors.text }]}>Temperature</Text>
            </View>
            <View style={[styles.toggleRow, { backgroundColor: colors.surfaceRaised, borderRadius: radius.md }]}>
              <Pressable
                onPress={() => setTempUnit('celsius')}
                style={[styles.toggleBtn, tempUnit === 'celsius' && { backgroundColor: colors.primary, borderRadius: radius.sm }]}
              >
                <Text style={[styles.toggleText, { color: tempUnit === 'celsius' ? '#FFFFFF' : colors.textSecondary }]}>°C</Text>
              </Pressable>
              <Pressable
                onPress={() => setTempUnit('fahrenheit')}
                style={[styles.toggleBtn, tempUnit === 'fahrenheit' && { backgroundColor: colors.primary, borderRadius: radius.sm }]}
              >
                <Text style={[styles.toggleText, { color: tempUnit === 'fahrenheit' ? '#FFFFFF' : colors.textSecondary }]}>°F</Text>
              </Pressable>
            </View>
          </View>
          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <Scale size={18} color={brand.secondary} strokeWidth={2} />
              <Text style={[styles.rowLabel, { color: colors.text }]}>Weight</Text>
            </View>
            <View style={[styles.toggleRow, { backgroundColor: colors.surfaceRaised, borderRadius: radius.md }]}>
              <Pressable
                onPress={() => setWeightUnit('kg')}
                style={[styles.toggleBtn, weightUnit === 'kg' && { backgroundColor: colors.primary, borderRadius: radius.sm }]}
              >
                <Text style={[styles.toggleText, { color: weightUnit === 'kg' ? '#FFFFFF' : colors.textSecondary }]}>kg</Text>
              </Pressable>
              <Pressable
                onPress={() => setWeightUnit('lbs')}
                style={[styles.toggleBtn, weightUnit === 'lbs' && { backgroundColor: colors.primary, borderRadius: radius.sm }]}
              >
                <Text style={[styles.toggleText, { color: weightUnit === 'lbs' ? '#FFFFFF' : colors.textSecondary }]}>lbs</Text>
              </Pressable>
            </View>
          </View>
        </View>

        {/* Danger */}
        <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>ACCOUNT</Text>
        <Pressable
          onPress={handleDeleteAccount}
          style={({ pressed }) => [
            styles.dangerBtn,
            { backgroundColor: brand.error + '10', borderRadius: radius.xl, borderColor: brand.error + '20' },
            pressed && { opacity: 0.7 },
          ]}
        >
          <Trash2 size={18} color={brand.error} strokeWidth={2} />
          <Text style={[styles.dangerText, { color: brand.error }]}>Delete Account</Text>
        </Pressable>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 12 },
  backBtn: { width: 40, alignItems: 'center' },
  title: { fontSize: 18, fontWeight: '700' },
  scroll: { paddingHorizontal: 20, paddingBottom: 40 },
  sectionLabel: { fontSize: 12, fontWeight: '700', letterSpacing: 1, marginTop: 20, marginBottom: 8, paddingLeft: 4 },
  card: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, paddingHorizontal: 16 },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  rowLabel: { fontSize: 15, fontWeight: '600' },
  toggleRow: { flexDirection: 'row', padding: 2 },
  toggleBtn: { paddingVertical: 6, paddingHorizontal: 14 },
  toggleText: { fontSize: 14, fontWeight: '700' },
  dangerBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16, borderWidth: 1, marginTop: 8 },
  dangerText: { fontSize: 15, fontWeight: '700' },
})
