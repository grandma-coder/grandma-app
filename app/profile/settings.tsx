/**
 * Settings — units, display, language, account.
 *
 * Cream-paper sticker-on-paper redesign: ink borders, hard-offset shadows,
 * sticker-style unit toggles, no emoji-flag dependency for languages.
 */

import { useState } from 'react'
import {
  View, Text, Pressable, ScrollView, Switch, Alert, Modal, FlatList, StyleSheet,
} from 'react-native'
import { router } from 'expo-router'
import { Moon, Sun, Thermometer, Scale, Trash2, Globe, Check, ChevronRight, X, LogOut } from 'lucide-react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme } from '../../constants/theme'
import { useThemeStore } from '../../store/useThemeStore'
import { useLanguageStore, SUPPORTED_LANGUAGES, type LanguageOption } from '../../store/useLanguageStore'
import { useTranslation } from '../../lib/i18n'
import { ScreenHeader } from '../../components/ui/ScreenHeader'
import { Display, DisplayItalic, MonoCaps, Body } from '../../components/ui/Typography'
import { supabase } from '../../lib/supabase'

const INK = '#141313'
const CREAM = '#F5EDDC'

export default function SettingsScreen() {
  const { colors, font, stickers, brand, radius, isDark } = useTheme()
  const insets = useSafeAreaInsets()
  const setTheme = useThemeStore((s) => s.setTheme)
  const theme = useThemeStore((s) => s.theme)
  const { t, language } = useTranslation()
  const setLanguage = useLanguageStore((s) => s.setLanguage)

  const paper = colors.surface
  const paperBorder = isDark ? colors.border : INK
  const ink = isDark ? colors.text : INK
  const inkMuted = colors.textMuted
  const off = colors.borderStrong
  const shadowInk = isDark ? CREAM : INK

  const [tempUnit, setTempUnit] = useState<'celsius' | 'fahrenheit'>('celsius')
  const [weightUnit, setWeightUnit] = useState<'kg' | 'lbs'>('kg')
  const [langModalVisible, setLangModalVisible] = useState(false)
  const [signOutModalVisible, setSignOutModalVisible] = useState(false)
  const [signingOut, setSigningOut] = useState(false)

  async function handleSignOut(global: boolean) {
    setSigningOut(true)
    try {
      await supabase.auth.signOut(global ? { scope: 'global' } : undefined)
      setSignOutModalVisible(false)
      router.replace('/(auth)/welcome')
    } catch (e: any) {
      Alert.alert('Error', e.message)
    } finally {
      setSigningOut(false)
    }
  }

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
          {
            backgroundColor: isSelected ? '#F5D652' : paper,
            borderColor: isSelected ? INK : paperBorder,
            borderWidth: isSelected ? 1.5 : 1,
          },
          pressed && { opacity: 0.85 },
        ]}
      >
        <View
          style={[
            styles.langCodeChip,
            {
              backgroundColor: isSelected ? '#FFFEF8' : (isDark ? colors.surfaceRaised : '#F5EDDC'),
              borderColor: isDark ? 'rgba(255,255,255,0.18)' : INK,
            },
          ]}
        >
          <Text style={[styles.langCodeText, { color: ink, fontFamily: font.display }]}>
            {item.code.slice(0, 2).toUpperCase()}
          </Text>
        </View>
        <View style={styles.langTextWrap}>
          <Text style={[styles.langNative, { color: ink, fontFamily: font.bodySemiBold }]}>{item.nativeName}</Text>
          <Text style={[styles.langName, { color: inkMuted, fontFamily: font.body }]}>{item.name}</Text>
        </View>
        {isSelected && <Check size={20} color={INK} strokeWidth={2.6} />}
      </Pressable>
    )
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      <View style={[styles.headerWrap, { paddingTop: insets.top + 8 }]}>
        <ScreenHeader title={t('settings_title')} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* ── Display ── */}
        <SectionLabel ink={inkMuted}>{t('settings_display')}</SectionLabel>
        <View style={[styles.card, cardShadow(isDark), { backgroundColor: paper, borderColor: paperBorder }]}>
          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <StickerIcon
                fill={isDark ? '#C8B6E8' : '#F5D652'}
                isDark={isDark}
              >
                {isDark
                  ? <Moon size={16} color={INK} strokeWidth={2.2} />
                  : <Sun size={16} color={INK} strokeWidth={2.2} />}
              </StickerIcon>
              <Text style={[styles.rowLabel, { color: ink, fontFamily: font.bodyMedium }]}>{t('settings_darkMode')}</Text>
            </View>
            <Switch
              value={isDark}
              onValueChange={toggleDark}
              trackColor={{ false: off, true: '#141313' }}
              thumbColor="#FFFEF8"
              ios_backgroundColor={off}
            />
          </View>
        </View>

        {/* ── Language ── */}
        <SectionLabel ink={inkMuted}>{t('settings_language')}</SectionLabel>
        <Pressable
          onPress={() => setLangModalVisible(true)}
          style={({ pressed }) => [
            styles.card,
            cardShadow(isDark),
            { backgroundColor: paper, borderColor: paperBorder },
            pressed && { transform: [{ translateY: 2 }], shadowOffset: { width: 0, height: 1 } },
          ]}
        >
          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <StickerIcon fill="#9DC3E8" isDark={isDark}>
                <Globe size={16} color={INK} strokeWidth={2.2} />
              </StickerIcon>
              <Text style={[styles.rowLabel, { color: ink, fontFamily: font.bodyMedium }]}>{t('settings_selectLanguage')}</Text>
            </View>
            <View style={styles.langCurrentWrap}>
              <View
                style={[
                  styles.langCurrentChip,
                  {
                    backgroundColor: isDark ? colors.surfaceRaised : '#F5EDDC',
                    borderColor: isDark ? 'rgba(255,255,255,0.18)' : INK,
                  },
                ]}
              >
                <Text style={[styles.langCurrentCode, { color: ink, fontFamily: font.display }]}>
                  {currentLang?.code.slice(0, 2).toUpperCase()}
                </Text>
              </View>
              <Text style={[styles.langCurrentName, { color: ink, fontFamily: font.bodyMedium }]}>{currentLang?.nativeName}</Text>
              <ChevronRight size={16} color={inkMuted} strokeWidth={2.2} />
            </View>
          </View>
        </Pressable>

        {/* ── Units ── */}
        <SectionLabel ink={inkMuted}>{t('settings_units')}</SectionLabel>
        <View style={[styles.card, cardShadow(isDark), { backgroundColor: paper, borderColor: paperBorder }]}>
          <View style={[styles.row, { borderBottomWidth: 1, borderBottomColor: isDark ? colors.borderLight : 'rgba(20,19,19,0.10)' }]}>
            <View style={styles.rowLeft}>
              <StickerIcon fill="#F2B2C7" isDark={isDark}>
                <Thermometer size={16} color={INK} strokeWidth={2.2} />
              </StickerIcon>
              <Text style={[styles.rowLabel, { color: ink, fontFamily: font.bodyMedium }]}>{t('settings_temperature')}</Text>
            </View>
            <UnitSwitch options={['celsius', 'fahrenheit']} labels={['°C', '°F']} value={tempUnit} onChange={(v) => setTempUnit(v as any)} />
          </View>
          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <StickerIcon fill="#BDD48C" isDark={isDark}>
                <Scale size={16} color={INK} strokeWidth={2.2} />
              </StickerIcon>
              <Text style={[styles.rowLabel, { color: ink, fontFamily: font.bodyMedium }]}>{t('settings_weight')}</Text>
            </View>
            <UnitSwitch options={['kg', 'lbs']} labels={['kg', 'lbs']} value={weightUnit} onChange={(v) => setWeightUnit(v as any)} />
          </View>
        </View>

        {/* ── Account & Security ── */}
        <SectionLabel ink={inkMuted}>{t('settings_account')}</SectionLabel>

        {/* Sign Out — soft lavender pill */}
        <Pressable
          onPress={() => setSignOutModalVisible(true)}
          style={({ pressed }) => [
            styles.actionPill,
            {
              backgroundColor: brand.pregnancySoft,
              borderColor: paperBorder,
              shadowColor: shadowInk,
              shadowOffset: { width: 0, height: pressed ? 1 : 3 },
              shadowOpacity: 1,
              shadowRadius: 0,
              elevation: 4,
              transform: [{ translateY: pressed ? 2 : 0 }],
            },
          ]}
        >
          <LogOut size={16} color={ink} strokeWidth={2.2} />
          <Text style={[styles.actionPillText, { color: ink, fontFamily: font.bodySemiBold }]}>
            Sign Out
          </Text>
        </Pressable>

        {/* Delete Account — coral danger zone */}
        <Pressable
          onPress={handleDeleteAccount}
          style={({ pressed }) => [
            styles.dangerBtn,
            {
              backgroundColor: stickers.peachSoft,
              borderColor: stickers.coral,
              shadowColor: shadowInk,
              shadowOffset: { width: 0, height: pressed ? 1 : 3 },
              shadowOpacity: 1,
              shadowRadius: 0,
              elevation: 4,
              transform: [{ translateY: pressed ? 2 : 0 }],
              marginTop: 12,
            },
          ]}
        >
          <Trash2 size={16} color={stickers.coral} strokeWidth={2.2} />
          <Text style={[styles.dangerText, { color: ink, fontFamily: font.bodySemiBold }]}>
            {t('settings_deleteAccount')}
          </Text>
        </Pressable>
      </ScrollView>

      {/* ── Sign Out Confirmation Modal ── */}
      <Modal
        visible={signOutModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setSignOutModalVisible(false)}
      >
        <Pressable
          style={styles.signOutBackdrop}
          onPress={() => !signingOut && setSignOutModalVisible(false)}
        >
          <Pressable
            style={[
              styles.signOutSheet,
              {
                backgroundColor: paper,
                borderColor: paperBorder,
                borderRadius: radius.lg,
              },
            ]}
            onPress={(e) => e.stopPropagation()}
          >
            <Display size={28} color={ink} style={{ marginBottom: 6, textAlign: 'center' }}>
              Sign Out?
            </Display>
            <DisplayItalic size={16} color={stickers.coral} style={{ textAlign: 'center', marginBottom: 18 }}>
              this signs you out everywhere
            </DisplayItalic>

            <Pressable
              disabled={signingOut}
              onPress={() => handleSignOut(false)}
              style={({ pressed }) => [
                styles.modalBtn,
                {
                  backgroundColor: brand.pregnancySoft,
                  borderColor: paperBorder,
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
            >
              <Text style={[styles.modalBtnText, { color: ink, fontFamily: font.bodySemiBold }]}>
                Sign Out
              </Text>
            </Pressable>

            <Pressable
              disabled={signingOut}
              onPress={() => handleSignOut(true)}
              style={({ pressed }) => [
                styles.modalBtn,
                {
                  backgroundColor: stickers.peachSoft,
                  borderColor: stickers.coral,
                  marginTop: 8,
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
            >
              <Text style={[styles.modalBtnText, { color: stickers.coral, fontFamily: font.bodySemiBold }]}>
                Sign Out All Devices
              </Text>
            </Pressable>

            <Pressable
              disabled={signingOut}
              onPress={() => setSignOutModalVisible(false)}
              style={({ pressed }) => [
                styles.modalBtn,
                {
                  backgroundColor: 'transparent',
                  borderColor: 'transparent',
                  marginTop: 4,
                  opacity: pressed ? 0.6 : 1,
                },
              ]}
            >
              <Text style={[styles.modalBtnText, { color: inkMuted, fontFamily: font.bodyMedium }]}>
                Cancel
              </Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ── Language Picker Modal ── */}
      <Modal
        visible={langModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setLangModalVisible(false)}
      >
        <View style={[styles.modalRoot, { backgroundColor: colors.bg }]}>
          <View style={styles.modalHeader}>
            <View style={{ width: 38 }} />
            <Display size={20} color={ink}>{t('settings_selectLanguage')}</Display>
            <Pressable onPress={() => setLangModalVisible(false)} hitSlop={10}>
              <View
                style={[
                  styles.modalClose,
                  {
                    backgroundColor: paper,
                    borderColor: paperBorder,
                    shadowColor: shadowInk,
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 1,
                    shadowRadius: 0,
                    elevation: 3,
                  },
                ]}
              >
                <X size={16} color={ink} strokeWidth={2.4} />
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

// ─── Subcomponents ─────────────────────────────────────────────────────────

function SectionLabel({ children, ink }: { children: React.ReactNode; ink: string }) {
  return (
    <View style={{ marginTop: 22, marginBottom: 10 }}>
      <MonoCaps color={ink} style={{ letterSpacing: 1.6 }}>
        {children}
      </MonoCaps>
    </View>
  )
}

function StickerIcon({
  children, fill, isDark,
}: {
  children: React.ReactNode
  fill: string
  isDark: boolean
}) {
  return (
    <View
      style={{
        width: 32, height: 32, borderRadius: 999,
        backgroundColor: fill,
        borderWidth: 1.2,
        borderColor: isDark ? 'rgba(255,255,255,0.2)' : INK,
        alignItems: 'center', justifyContent: 'center',
      }}
    >
      {children}
    </View>
  )
}

function UnitSwitch({ options, labels, value, onChange }: {
  options: string[]; labels: string[]; value: string; onChange: (v: string) => void
}) {
  const { colors, font, isDark } = useTheme()
  const trackBg = isDark ? colors.surfaceRaised : '#F5EDDC'
  const trackBorder = isDark ? colors.border : INK
  return (
    <View
      style={[
        unitStyles.wrap,
        {
          backgroundColor: trackBg,
          borderColor: trackBorder,
          borderWidth: 1.2,
        },
      ]}
    >
      {options.map((opt, i) => {
        const active = value === opt
        return (
          <Pressable
            key={opt}
            onPress={() => onChange(opt)}
            style={({ pressed }) => [
              unitStyles.btn,
              active && {
                backgroundColor: '#F5D652',
                borderWidth: 1.2,
                borderColor: isDark ? 'rgba(255,255,255,0.18)' : INK,
                shadowColor: isDark ? CREAM : INK,
                shadowOffset: { width: 0, height: pressed ? 0 : 2 },
                shadowOpacity: 1,
                shadowRadius: 0,
                elevation: 2,
              },
            ]}
          >
            <Text
              style={[
                unitStyles.text,
                {
                  color: active ? INK : (isDark ? colors.textSecondary : 'rgba(20,19,19,0.55)'),
                  fontFamily: active ? font.bodySemiBold : font.bodySemiBold,
                },
              ]}
            >
              {labels[i]}
            </Text>
          </Pressable>
        )
      })}
    </View>
  )
}

function cardShadow(isDark: boolean) {
  return {
    shadowColor: isDark ? CREAM : INK,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
  }
}

const unitStyles = StyleSheet.create({
  wrap: { flexDirection: 'row', padding: 3, borderRadius: 999, gap: 2 },
  btn: { paddingVertical: 6, paddingHorizontal: 14, borderRadius: 999 },
  text: { fontSize: 13, letterSpacing: 0.2 },
})

const styles = StyleSheet.create({
  root: { flex: 1 },
  headerWrap: { paddingHorizontal: 16 },
  scroll: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 40 },
  card: {
    borderRadius: 22,
    borderWidth: 1.5,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flexShrink: 1 },
  rowLabel: { fontSize: 15, letterSpacing: -0.1 },

  dangerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    borderWidth: 1.5,
    borderRadius: 999,
  },
  dangerText: { fontSize: 14, letterSpacing: 0.1 },

  actionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    borderWidth: 1,
    borderRadius: 999,
  },
  actionPillText: { fontSize: 14, letterSpacing: 0.1 },

  signOutBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(20,19,19,0.45)',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  signOutSheet: {
    padding: 24,
    borderWidth: 1,
  },
  signOutDesc: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  modalBtn: {
    paddingVertical: 14,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBtnText: { fontSize: 15 },

  langCurrentWrap: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  langCurrentChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1.2,
    minWidth: 30,
    alignItems: 'center',
  },
  langCurrentCode: { fontSize: 11, letterSpacing: 0.4 },
  langCurrentName: { fontSize: 14 },

  modalRoot: { flex: 1 },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  modalClose: {
    width: 36,
    height: 36,
    borderRadius: 999,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  langList: { paddingHorizontal: 16, paddingBottom: 40, gap: 8 },
  langItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    gap: 14,
    borderRadius: 18,
  },
  langCodeChip: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1.2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  langCodeText: { fontSize: 13, letterSpacing: 0.4 },
  langTextWrap: { flex: 1, gap: 2 },
  langNative: { fontSize: 16 },
  langName: { fontSize: 13 },
})
