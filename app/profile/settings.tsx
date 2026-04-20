/**
 * Settings — units, display, language, account.
 * Cream-paper redesign with ScreenHeader, MonoCaps, ink toggles.
 */

import { useState } from 'react'
import {
  View, Text, Pressable, ScrollView, Switch, Alert, Modal, FlatList, StyleSheet,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Moon, Sun, Thermometer, Scale, Trash2, Globe, Check, ChevronRight } from 'lucide-react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme } from '../../constants/theme'
import { useThemeStore } from '../../store/useThemeStore'
import { useLanguageStore, SUPPORTED_LANGUAGES, type LanguageOption } from '../../store/useLanguageStore'
import { useTranslation } from '../../lib/i18n'
import { ScreenHeader } from '../../components/ui/ScreenHeader'
import { Display, MonoCaps, Body } from '../../components/ui/Typography'

export default function SettingsScreen() {
  const { colors, font, stickers, isDark } = useTheme()
  const insets = useSafeAreaInsets()
  const setTheme = useThemeStore((s) => s.setTheme)
  const theme = useThemeStore((s) => s.theme)
  const { t, language } = useTranslation()
  const setLanguage = useLanguageStore((s) => s.setLanguage)

  const paper = isDark ? colors.surface : '#FFFEF8'
  const paperBorder = isDark ? colors.border : 'rgba(20,19,19,0.08)'
  const ink = isDark ? colors.text : '#141313'
  const off = isDark ? colors.borderLight : 'rgba(20,19,19,0.14)'
  const danger = stickers.coral
  const dangerText = isDark ? stickers.coral : '#B43E2E'

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
          isSelected && { backgroundColor: colors.surfaceRaised },
          pressed && { opacity: 0.7 },
        ]}
      >
        <Text style={styles.langFlag}>{item.flag}</Text>
        <View style={styles.langTextWrap}>
          <Text style={[styles.langNative, { color: colors.text, fontFamily: font.bodySemiBold }]}>{item.nativeName}</Text>
          <Text style={[styles.langName, { color: colors.textSecondary, fontFamily: font.body }]}>{item.name}</Text>
        </View>
        {isSelected && <Check size={20} color={colors.text} strokeWidth={2.5} />}
      </Pressable>
    )
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      <View style={[styles.headerWrap, { paddingTop: insets.top + 8 }]}>
        <ScreenHeader title={t('settings_title')} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Display */}
        <View style={{ marginTop: 8 }}><MonoCaps color={colors.textMuted}>{t('settings_display')}</MonoCaps></View>
        <View style={[styles.card, { backgroundColor: paper, borderColor: paperBorder }]}>
          <View style={styles.row}>
            <View style={styles.rowLeft}>
              {isDark ? <Moon size={18} color={stickers.lilac} strokeWidth={2} /> : <Sun size={18} color={stickers.yellow} strokeWidth={2} />}
              <Text style={[styles.rowLabel, { color: colors.text, fontFamily: font.bodyMedium }]}>{t('settings_darkMode')}</Text>
            </View>
            <Switch
              value={isDark}
              onValueChange={toggleDark}
              trackColor={{ false: off, true: ink }}
              thumbColor={'#FFFEF8'}
              ios_backgroundColor={off}
            />
          </View>
        </View>

        {/* Language */}
        <View style={{ marginTop: 18 }}><MonoCaps color={colors.textMuted}>{t('settings_language')}</MonoCaps></View>
        <Pressable
          onPress={() => setLangModalVisible(true)}
          style={({ pressed }) => [
            styles.card,
            { backgroundColor: paper, borderColor: paperBorder },
            pressed && { opacity: 0.7 },
          ]}
        >
          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <Globe size={18} color={isDark ? stickers.blue : '#1F4A7A'} strokeWidth={2} />
              <Text style={[styles.rowLabel, { color: colors.text, fontFamily: font.bodyMedium }]}>{t('settings_selectLanguage')}</Text>
            </View>
            <View style={styles.langCurrentWrap}>
              <Text style={styles.langCurrentFlag}>{currentLang?.flag}</Text>
              <Text style={[styles.langCurrentName, { color: colors.textSecondary, fontFamily: font.bodyMedium }]}>{currentLang?.nativeName}</Text>
              <ChevronRight size={16} color={colors.textMuted} />
            </View>
          </View>
        </Pressable>

        {/* Units */}
        <View style={{ marginTop: 18 }}><MonoCaps color={colors.textMuted}>{t('settings_units')}</MonoCaps></View>
        <View style={[styles.card, { backgroundColor: paper, borderColor: paperBorder }]}>
          <View style={[styles.row, { borderBottomWidth: 1, borderBottomColor: colors.borderLight }]}>
            <View style={styles.rowLeft}>
              <Thermometer size={18} color={stickers.coral} strokeWidth={2} />
              <Text style={[styles.rowLabel, { color: colors.text, fontFamily: font.bodyMedium }]}>{t('settings_temperature')}</Text>
            </View>
            <UnitSwitch options={['celsius', 'fahrenheit']} labels={['°C', '°F']} value={tempUnit} onChange={(v) => setTempUnit(v as any)} />
          </View>
          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <Scale size={18} color={stickers.green} strokeWidth={2} />
              <Text style={[styles.rowLabel, { color: colors.text, fontFamily: font.bodyMedium }]}>{t('settings_weight')}</Text>
            </View>
            <UnitSwitch options={['kg', 'lbs']} labels={['kg', 'lbs']} value={weightUnit} onChange={(v) => setWeightUnit(v as any)} />
          </View>
        </View>

        {/* Danger */}
        <View style={{ marginTop: 22 }}><MonoCaps color={colors.textMuted}>{t('settings_account')}</MonoCaps></View>
        <Pressable
          onPress={handleDeleteAccount}
          style={({ pressed }) => [
            styles.dangerBtn,
            { backgroundColor: danger + (isDark ? '18' : '14'), borderColor: danger + '50' },
            pressed && { opacity: 0.7 },
          ]}
        >
          <Trash2 size={18} color={dangerText} strokeWidth={2} />
          <Text style={[styles.dangerText, { color: dangerText, fontFamily: font.bodySemiBold }]}>{t('settings_deleteAccount')}</Text>
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
          <View style={[styles.modalHeader, { borderBottomColor: colors.borderLight, paddingTop: 16 }]}>
            <View style={{ width: 38 }} />
            <Display size={20} color={colors.text}>{t('settings_selectLanguage')}</Display>
            <Pressable onPress={() => setLangModalVisible(false)} hitSlop={10}>
              <View style={[styles.modalClose, { backgroundColor: paper, borderColor: paperBorder }]}>
                <Ionicons name="close" size={20} color={colors.text} />
              </View>
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

function UnitSwitch({ options, labels, value, onChange }: {
  options: string[]; labels: string[]; value: string; onChange: (v: string) => void
}) {
  const { colors, font, isDark } = useTheme()
  const inkBg = isDark ? colors.text : '#141313'
  const inkText = isDark ? colors.bg : '#F3ECD9'
  const off = isDark ? colors.surfaceRaised : '#F7F0DF'
  return (
    <View style={[unitStyles.wrap, { backgroundColor: off }]}>
      {options.map((opt, i) => {
        const active = value === opt
        return (
          <Pressable
            key={opt}
            onPress={() => onChange(opt)}
            style={[unitStyles.btn, active && { backgroundColor: inkBg }]}
          >
            <Text style={[unitStyles.text, { color: active ? inkText : colors.textSecondary, fontFamily: font.bodySemiBold }]}>
              {labels[i]}
            </Text>
          </Pressable>
        )
      })}
    </View>
  )
}

const unitStyles = StyleSheet.create({
  wrap: { flexDirection: 'row', padding: 3, borderRadius: 999 },
  btn: { paddingVertical: 6, paddingHorizontal: 14, borderRadius: 999 },
  text: { fontSize: 13 },
})

const styles = StyleSheet.create({
  root: { flex: 1 },
  headerWrap: { paddingHorizontal: 16 },
  scroll: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 40 },
  card: {
    marginTop: 8,
    borderRadius: 28,
    borderWidth: 1,
    shadowColor: '#141313',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
  },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, paddingHorizontal: 16 },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  rowLabel: { fontSize: 15 },
  dangerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderWidth: 1,
    borderRadius: 22,
    marginTop: 8,
  },
  dangerText: { fontSize: 15 },

  langCurrentWrap: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  langCurrentFlag: { fontSize: 18 },
  langCurrentName: { fontSize: 14 },

  modalRoot: { flex: 1 },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  modalClose: {
    width: 38,
    height: 38,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  langList: { paddingHorizontal: 16, paddingBottom: 40 },
  langItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    gap: 14,
    borderRadius: 12,
  },
  langFlag: { fontSize: 28 },
  langTextWrap: { flex: 1, gap: 2 },
  langNative: { fontSize: 16 },
  langName: { fontSize: 13 },
})
