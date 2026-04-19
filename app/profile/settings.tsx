/**
 * Settings — units, display, language, account, privacy.
 */

import { useState } from 'react'
import {
  View,
  Text,
  Pressable,
  ScrollView,
  Switch,
  Alert,
  Modal,
  FlatList,
  StyleSheet,
} from 'react-native'
import { router } from 'expo-router'
import { ArrowLeft, Moon, Sun, Thermometer, Scale, Trash2, Globe, Check, ChevronRight } from 'lucide-react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme, brand } from '../../constants/theme'
import { useThemeStore } from '../../store/useThemeStore'
import { useLanguageStore, SUPPORTED_LANGUAGES, type LanguageOption } from '../../store/useLanguageStore'
import { useTranslation } from '../../lib/i18n'
import { supabase } from '../../lib/supabase'

export default function SettingsScreen() {
  const { colors, radius, isDark } = useTheme()
  const insets = useSafeAreaInsets()
  const setTheme = useThemeStore((s) => s.setTheme)
  const theme = useThemeStore((s) => s.theme)
  const { t, language } = useTranslation()
  const setLanguage = useLanguageStore((s) => s.setLanguage)

  const [tempUnit, setTempUnit] = useState<'celsius' | 'fahrenheit'>('celsius')
  const [weightUnit, setWeightUnit] = useState<'kg' | 'lbs'>('kg')
  const [langModalVisible, setLangModalVisible] = useState(false)

  const currentLang = SUPPORTED_LANGUAGES.find((l) => l.code === language)

  function toggleDark() {
    setTheme(theme === 'dark' ? 'light' : 'dark')
  }

  function handleSelectLanguage(lang: LanguageOption) {
    setLanguage(lang.code)
    setLangModalVisible(false)
  }

  async function handleDeleteAccount() {
    Alert.alert(
      t('settings_deleteAccount'),
      t('settings_deleteConfirm'),
      [
        { text: t('common_cancel'), style: 'cancel' },
        {
          text: t('common_delete'),
          style: 'destructive',
          onPress: async () => {
            Alert.alert(t('settings_deleteAccount'), t('settings_deleteContact'))
          },
        },
      ]
    )
  }

  function renderLanguageItem({ item }: { item: LanguageOption }) {
    const isSelected = item.code === language
    return (
      <Pressable
        onPress={() => handleSelectLanguage(item)}
        style={({ pressed }) => [
          styles.langItem,
          { borderBottomColor: colors.borderLight },
          pressed && { opacity: 0.7 },
        ]}
      >
        <Text style={styles.langFlag}>{item.flag}</Text>
        <View style={styles.langTextWrap}>
          <Text style={[styles.langNative, { color: colors.text }]}>{item.nativeName}</Text>
          <Text style={[styles.langName, { color: colors.textSecondary }]}>{item.name}</Text>
        </View>
        {isSelected && <Check size={20} color={colors.primary} strokeWidth={2.5} />}
      </Pressable>
    )
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={24} color={colors.text} />
        </Pressable>
        <Text style={[styles.title, { color: colors.text }]}>{t('settings_title')}</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Display */}
        <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>{t('settings_display')}</Text>
        <View style={[styles.card, { backgroundColor: colors.surface, borderRadius: radius.xl }]}>
          <View style={styles.row}>
            <View style={styles.rowLeft}>
              {isDark ? <Moon size={18} color={colors.primary} strokeWidth={2} /> : <Sun size={18} color={brand.accent} strokeWidth={2} />}
              <Text style={[styles.rowLabel, { color: colors.text }]}>{t('settings_darkMode')}</Text>
            </View>
            <Switch
              value={isDark}
              onValueChange={toggleDark}
              trackColor={{ false: colors.surfaceRaised, true: colors.primary + '60' }}
              thumbColor={isDark ? colors.primary : colors.textMuted}
            />
          </View>
        </View>

        {/* Language */}
        <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>{t('settings_language')}</Text>
        <Pressable
          onPress={() => setLangModalVisible(true)}
          style={({ pressed }) => [
            styles.card,
            { backgroundColor: colors.surface, borderRadius: radius.xl },
            pressed && { opacity: 0.7 },
          ]}
        >
          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <Globe size={18} color={brand.secondary} strokeWidth={2} />
              <Text style={[styles.rowLabel, { color: colors.text }]}>{t('settings_selectLanguage')}</Text>
            </View>
            <View style={styles.langCurrentWrap}>
              <Text style={styles.langCurrentFlag}>{currentLang?.flag}</Text>
              <Text style={[styles.langCurrentName, { color: colors.textSecondary }]}>{currentLang?.nativeName}</Text>
              <ChevronRight size={16} color={colors.textMuted} />
            </View>
          </View>
        </Pressable>

        {/* Units */}
        <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>{t('settings_units')}</Text>
        <View style={[styles.card, { backgroundColor: colors.surface, borderRadius: radius.xl }]}>
          <View style={[styles.row, { borderBottomWidth: 1, borderBottomColor: colors.borderLight }]}>
            <View style={styles.rowLeft}>
              <Thermometer size={18} color={brand.accent} strokeWidth={2} />
              <Text style={[styles.rowLabel, { color: colors.text }]}>{t('settings_temperature')}</Text>
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
              <Text style={[styles.rowLabel, { color: colors.text }]}>{t('settings_weight')}</Text>
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
        <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>{t('settings_account')}</Text>
        <Pressable
          onPress={handleDeleteAccount}
          style={({ pressed }) => [
            styles.dangerBtn,
            { backgroundColor: brand.error + '10', borderRadius: radius.xl, borderColor: brand.error + '20' },
            pressed && { opacity: 0.7 },
          ]}
        >
          <Trash2 size={18} color={brand.error} strokeWidth={2} />
          <Text style={[styles.dangerText, { color: brand.error }]}>{t('settings_deleteAccount')}</Text>
        </Pressable>
      </ScrollView>

      {/* Language Picker Modal */}
      <Modal
        visible={langModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setLangModalVisible(false)}
      >
        <View style={[styles.modalRoot, { backgroundColor: colors.bg }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.borderLight }]}>
            <View style={styles.backBtn} />
            <Text style={[styles.modalTitle, { color: colors.text }]}>{t('settings_selectLanguage')}</Text>
            <Pressable onPress={() => setLangModalVisible(false)} style={styles.backBtn}>
              <Text style={[styles.modalDone, { color: colors.primary }]}>{t('common_done')}</Text>
            </Pressable>
          </View>
          <FlatList
            data={SUPPORTED_LANGUAGES}
            keyExtractor={(item) => item.code}
            renderItem={renderLanguageItem}
            contentContainerStyle={styles.langList}
            showsVerticalScrollIndicator={false}
          />
        </View>
      </Modal>
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

  // Language current value
  langCurrentWrap: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  langCurrentFlag: { fontSize: 18 },
  langCurrentName: { fontSize: 14, fontWeight: '600' },

  // Language modal
  modalRoot: { flex: 1 },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  modalTitle: { fontSize: 18, fontWeight: '700' },
  modalDone: { fontSize: 16, fontWeight: '700' },
  langList: { paddingHorizontal: 16, paddingBottom: 40 },
  langItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    gap: 14,
  },
  langFlag: { fontSize: 28, fontFamily: 'Fraunces_600SemiBold' },
  langTextWrap: { flex: 1, gap: 2 },
  langNative: { fontSize: 16, fontWeight: '700' },
  langName: { fontSize: 13, fontWeight: '500' },
})
