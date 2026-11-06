/**
 * Settings — units, display, language, account.
 *
 * Cream-paper sticker-on-paper redesign: ink borders, hard-offset shadows,
 * sticker-style unit toggles, no emoji-flag dependency for languages.
 */

import { alertAfterSheets } from '../../lib/afterSheets'
import { useState } from 'react'
import {
  View, Text, Pressable, ScrollView, Switch, Alert, Modal, FlatList, StyleSheet,
} from 'react-native'
import { router } from 'expo-router'
import { Moon, Sun, Thermometer, Scale, Trash2, Globe, Check, ChevronRight, X, LogOut } from 'lucide-react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme, useDiffuseTheme, diffuseFont } from '../../constants/theme'
import { Character } from '../../components/characters/Characters'
import { useThemeStore } from '../../store/useThemeStore'
import { useUnitsStore } from '../../store/useUnitsStore'
import { useLanguageStore, SUPPORTED_LANGUAGES, type LanguageOption } from '../../store/useLanguageStore'
import { useTranslation } from '../../lib/i18n'
import { ScreenHeader } from '../../components/ui/ScreenHeader'
import { Display, DisplayItalic, MonoCaps, Body } from '../../components/ui/Typography'
import { useIsDiffuse, DiffuseArrow } from '../../components/ui/diffuse/DiffuseKit'
import { DiffuseBloomIcon } from '../../components/ui/diffuse/DiffusePrimitives'
import { supabase } from '../../lib/supabase'
import { signOut } from '../../lib/signOut'
import { getNotificationPrefs, syncLocalSchedules } from '../../lib/pushNotifications'
import { SiteHeader, SiteEyebrow, SiteRow, SiteToggle, QuietPill } from '../../components/profile/SiteSettingsKit'
import { InkBackButton } from '../../components/ui/InkBackButton'
import { useModeStore } from '../../store/useModeStore'
import { getModeColorSoft } from '../../constants/theme'
import { CenterModal } from '../../components/ui/CenterModal'

const INK = '#141313'
const CREAM = '#F5EDDC'

export default function SettingsScreen() {
  const { colors, font, stickers, brand, radius, isDark } = useTheme()
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
  const insets = useSafeAreaInsets()
  const setTheme = useThemeStore((s) => s.setTheme)
  const theme = useThemeStore((s) => s.theme)
  const { t, language } = useTranslation()
  const mode = useModeStore((s) => s.mode)
  const toneSoft = getModeColorSoft(mode, isDark)
  const setLanguage = useLanguageStore((s) => s.setLanguage)

  const paper = diffuse ? dt.colors.surface : colors.surface
  const paperBorder = diffuse ? dt.colors.line : (isDark ? colors.border : INK)
  const ink = diffuse ? dt.colors.ink : (isDark ? colors.text : INK)
  const inkMuted = diffuse ? dt.colors.ink3 : colors.textMuted
  const off = diffuse ? dt.colors.line2 : colors.borderStrong
  const shadowInk = isDark ? CREAM : INK

  // Persisted unit preferences (B4). Store uses 'c'/'f' and 'kg'/'lb'; the
  // UnitSwitch UI uses 'celsius'/'fahrenheit' and 'kg'/'lbs', mapped inline.
  const tempUnitStore = useUnitsStore((s) => s.tempUnit)
  const setTempUnitStore = useUnitsStore((s) => s.setTempUnit)
  const weightUnitStore = useUnitsStore((s) => s.weightUnit)
  const setWeightUnitStore = useUnitsStore((s) => s.setWeightUnit)
  const tempUnit = tempUnitStore === 'f' ? 'fahrenheit' : 'celsius'
  const weightUnit = weightUnitStore === 'lb' ? 'lbs' : 'kg'
  const [langModalVisible, setLangModalVisible] = useState(false)
  const [signOutModalVisible, setSignOutModalVisible] = useState(false)
  const [signingOut, setSigningOut] = useState(false)
  const [deleting, setDeleting] = useState(false)

  async function handleSignOut(global: boolean) {
    setSigningOut(true)
    try {
      setSignOutModalVisible(false)
      await signOut(global ? 'global' : 'local')
    } catch {
      alertAfterSheets(t('common_error'), t('common_checkConnection'))
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
    // Scheduled local reminders carry their text from when they were scheduled —
    // re-schedule them so the next one arrives in the new language.
    void getNotificationPrefs().then(syncLocalSchedules).catch(() => {})
  }

  async function handleDeleteAccount() {
    if (deleting) return
    Alert.alert(
      t('settings_deleteAccount'),
      t('settings_deleteConfirm'),
      [
        { text: t('common_cancel'), style: 'cancel' },
        {
          text: t('common_delete'),
          style: 'destructive',
          onPress: async () => {
            setDeleting(true)
            try {
              const { error } = await supabase.functions.invoke('delete-account')
              if (error) throw error
              // Account is gone — clear the local session and return to auth.
              await signOut('global')
            } catch {
              setDeleting(false)
              // Server/edge errors come back in English — always show the warm, localized message.
              Alert.alert(t('common_error'), t('settings_deleteFailedMsg'))
            }
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
          diffuse
            ? {
                backgroundColor: 'transparent',
                borderColor: isSelected ? dt.colors.hairline : dt.colors.line,
                borderWidth: 1,
              }
            : {
                backgroundColor: isSelected ? toneSoft : paper,
                borderColor: isSelected ? colors.text : colors.border,
                borderWidth: 1.5,
              },
          pressed && { opacity: 0.85 },
        ]}
      >
        <View
          style={[
            styles.langCodeChip,
            diffuse
              ? {
                  backgroundColor: 'transparent',
                  borderColor: dt.colors.line2,
                }
              : {
                  backgroundColor: colors.surface,
                  borderColor: colors.text,
                  borderWidth: 1.5,
                },
          ]}
        >
          <Text style={[styles.langCodeText, { color: ink, fontFamily: diffuse ? diffuseFont.monoBold : font.display }]}>
            {item.code.slice(0, 2).toUpperCase()}
          </Text>
        </View>
        <View style={styles.langTextWrap}>
          <Text style={[styles.langNative, { color: ink, fontFamily: diffuse ? (isSelected ? diffuseFont.bodySemiBold : diffuseFont.body) : font.bodySemiBold }]}>{item.nativeName}</Text>
          <Text style={[styles.langName, { color: inkMuted, fontFamily: diffuse ? diffuseFont.mono : font.body, letterSpacing: diffuse ? 0.8 : undefined }]}>{item.name}</Text>
        </View>
        {isSelected && <Check size={20} color={diffuse ? dt.colors.ink : colors.text} strokeWidth={diffuse ? 1.8 : 2.6} />}
      </Pressable>
    )
  }

  return (
    <View style={[styles.root, { backgroundColor: diffuse ? dt.colors.bg : colors.bg }]}>
      {diffuse ? (
        <View style={[styles.headerWrap, { paddingTop: insets.top + 8 }]}>
          <ScreenHeader title={t('settings_title')} />
        </View>
      ) : (
        <SiteHeader title={t('settings_title')} sticker="me" />
      )}

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {!diffuse && (
          <View>
            <SiteEyebrow>{t('settings_display')}</SiteEyebrow>
            <SiteRow
              sticker="moon"
              label={t('settings_darkMode')}
              right={<SiteToggle value={isDark} onValueChange={toggleDark} label={t('settings_darkMode')} />}
              last
            />

            <SiteEyebrow>{t('settings_language')}</SiteEyebrow>
            <SiteRow
              sticker="globe"
              label={t('settings_selectLanguage')}
              value={currentLang?.nativeName}
              onPress={() => setLangModalVisible(true)}
              last
            />

            <SiteEyebrow>{t('settings_units')}</SiteEyebrow>
            <SiteRow
              sticker="thermo"
              label={t('settings_temperature')}
              right={<UnitSwitch options={['celsius', 'fahrenheit']} labels={['°C', '°F']} value={tempUnit} onChange={(v) => setTempUnitStore(v === 'fahrenheit' ? 'f' : 'c')} />}
            />
            <SiteRow
              sticker="scale"
              label={t('settings_weight')}
              right={<UnitSwitch options={['kg', 'lbs']} labels={['kg', 'lbs']} value={weightUnit} onChange={(v) => setWeightUnitStore(v === 'lbs' ? 'lb' : 'kg')} />}
              last
            />

            <SiteEyebrow>{t('settings_account')}</SiteEyebrow>
            <View style={{ gap: 12, marginTop: 12 }}>
              <QuietPill label={t('profile_signOut')} onPress={() => setSignOutModalVisible(true)} />
              <Pressable onPress={handleDeleteAccount} disabled={deleting} accessibilityRole="button" accessibilityState={{ disabled: deleting, busy: deleting }} hitSlop={8} style={{ alignSelf: 'center', paddingVertical: 8, opacity: deleting ? 0.5 : 1 }}>
                <Text style={{ fontFamily: font.bodyMedium, fontSize: 14, color: colors.textMuted, textDecorationLine: 'underline' }}>{deleting ? t('common_loading') : t('settings_deleteAccount')}</Text>
              </Pressable>
            </View>
          </View>
        )}

        {diffuse && (<>
        {/* ── Display ── */}
        <SectionLabel ink={inkMuted}>{t('settings_display')}</SectionLabel>
        <View style={[styles.card, diffuse ? styles.cardDiffuse : cardShadow(isDark), { backgroundColor: paper, borderColor: paperBorder }]}>
          <View style={styles.row}>
            <View style={styles.rowLeft}>
              {diffuse ? (
                <DiffuseBloomIcon color={dt.colors.ink} size={32} intensity={0.4}>
                  {isDark
                    ? <Moon size={16} color={dt.colors.ink3} strokeWidth={1.6} />
                    : <Sun size={16} color={dt.colors.ink3} strokeWidth={1.6} />}
                </DiffuseBloomIcon>
              ) : (
                <StickerIcon
                  fill={isDark ? '#C8B6E8' : '#F5D652'}
                  isDark={isDark}
                >
                  {isDark
                    ? <Moon size={16} color={INK} strokeWidth={2.2} />
                    : <Sun size={16} color={INK} strokeWidth={2.2} />}
                </StickerIcon>
              )}
              <Text style={[styles.rowLabel, { color: ink, fontFamily: diffuse ? diffuseFont.body : font.bodyMedium }]}>{t('settings_darkMode')}</Text>
            </View>
            <Switch
              value={isDark}
              onValueChange={toggleDark}
              trackColor={{ false: off, true: diffuse ? dt.colors.ink : '#141313' }}
              thumbColor={diffuse ? dt.colors.surface : '#FFFEF8'}
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
            diffuse ? styles.cardDiffuse : cardShadow(isDark),
            { backgroundColor: paper, borderColor: paperBorder },
            pressed && (diffuse ? { opacity: 0.7 } : { transform: [{ translateY: 2 }], shadowOffset: { width: 0, height: 1 } }),
          ]}
        >
          <View style={styles.row}>
            <View style={styles.rowLeft}>
              {diffuse ? (
                <DiffuseBloomIcon color={dt.colors.ink} size={32} intensity={0.4}>
                  <Globe size={16} color={dt.colors.ink3} strokeWidth={1.6} />
                </DiffuseBloomIcon>
              ) : (
                <StickerIcon fill="#9DC3E8" isDark={isDark}>
                  <Globe size={16} color={INK} strokeWidth={2.2} />
                </StickerIcon>
              )}
              <Text style={[styles.rowLabel, { color: ink, fontFamily: diffuse ? diffuseFont.body : font.bodyMedium }]}>{t('settings_selectLanguage')}</Text>
            </View>
            <View style={styles.langCurrentWrap}>
              <View
                style={[
                  styles.langCurrentChip,
                  diffuse
                    ? { backgroundColor: 'transparent', borderColor: dt.colors.line2 }
                    : {
                        backgroundColor: isDark ? colors.surfaceRaised : '#F5EDDC',
                        borderColor: isDark ? 'rgba(255,255,255,0.18)' : INK,
                      },
                ]}
              >
                <Text style={[styles.langCurrentCode, { color: ink, fontFamily: diffuse ? diffuseFont.monoBold : font.display }]}>
                  {currentLang?.code.slice(0, 2).toUpperCase()}
                </Text>
              </View>
              <Text style={[styles.langCurrentName, { color: ink, fontFamily: diffuse ? diffuseFont.body : font.bodyMedium }]}>{currentLang?.nativeName}</Text>
              {diffuse ? <DiffuseArrow color={inkMuted} size={16} /> : <ChevronRight size={16} color={inkMuted} strokeWidth={2.2} />}
            </View>
          </View>
        </Pressable>

        {/* ── Units ── */}
        <SectionLabel ink={inkMuted}>{t('settings_units')}</SectionLabel>
        <View style={[styles.card, diffuse ? styles.cardDiffuse : cardShadow(isDark), { backgroundColor: paper, borderColor: paperBorder }]}>
          <View style={[styles.row, { borderBottomWidth: diffuse ? StyleSheet.hairlineWidth : 1, borderBottomColor: diffuse ? dt.colors.line : (isDark ? colors.borderLight : 'rgba(20,19,19,0.10)') }]}>
            <View style={styles.rowLeft}>
              {diffuse ? (
                <DiffuseBloomIcon color={dt.colors.ink} size={32} intensity={0.4}>
                  <Character name="temperature" size={20} />
                </DiffuseBloomIcon>
              ) : (
                <StickerIcon fill="#F2B2C7" isDark={isDark}>
                  <Thermometer size={16} color={INK} strokeWidth={2.2} />
                </StickerIcon>
              )}
              <Text style={[styles.rowLabel, { color: ink, fontFamily: diffuse ? diffuseFont.body : font.bodyMedium }]}>{t('settings_temperature')}</Text>
            </View>
            <UnitSwitch options={['celsius', 'fahrenheit']} labels={['°C', '°F']} value={tempUnit} onChange={(v) => setTempUnitStore(v === 'fahrenheit' ? 'f' : 'c')} />
          </View>
          <View style={styles.row}>
            <View style={styles.rowLeft}>
              {diffuse ? (
                <DiffuseBloomIcon color={dt.colors.ink} size={32} intensity={0.4}>
                  <Character name="growth" size={20} />
                </DiffuseBloomIcon>
              ) : (
                <StickerIcon fill="#BDD48C" isDark={isDark}>
                  <Scale size={16} color={INK} strokeWidth={2.2} />
                </StickerIcon>
              )}
              <Text style={[styles.rowLabel, { color: ink, fontFamily: diffuse ? diffuseFont.body : font.bodyMedium }]}>{t('settings_weight')}</Text>
            </View>
            <UnitSwitch options={['kg', 'lbs']} labels={['kg', 'lbs']} value={weightUnit} onChange={(v) => setWeightUnitStore(v === 'lbs' ? 'lb' : 'kg')} />
          </View>
        </View>

        {/* ── Account & Security ── */}
        <SectionLabel ink={inkMuted}>{t('settings_account')}</SectionLabel>

        {/* Sign Out — soft lavender pill */}
        <Pressable
          onPress={() => setSignOutModalVisible(true)}
          style={({ pressed }) => [
            styles.actionPill,
            diffuse
              ? {
                  backgroundColor: 'transparent',
                  borderColor: dt.colors.hairline,
                }
              : {
                  backgroundColor: brand.pregnancySoft,
                  borderColor: paperBorder,
                  shadowColor: shadowInk,
                  shadowOffset: { width: 0, height: pressed ? 1 : 4 },
                  shadowOpacity: 0.18,
                  shadowRadius: pressed ? 4 : 10,
                  elevation: 3,
                  transform: [{ translateY: pressed ? 1 : 0 }],
                },
            diffuse && pressed && { opacity: 0.7 },
          ]}
        >
          <LogOut size={16} color={ink} strokeWidth={diffuse ? 1.6 : 2.2} />
          <Text style={[styles.actionPillText, { color: ink, fontFamily: diffuse ? diffuseFont.mono : font.bodySemiBold, letterSpacing: diffuse ? 1.6 : 0.1 }, diffuse && { textTransform: 'uppercase' }]}>
            {t('profile_signOut')}
          </Text>
        </Pressable>

        {/* Delete Account — coral danger zone */}
        <Pressable
          onPress={handleDeleteAccount}
          style={({ pressed }) => [
            styles.dangerBtn,
            diffuse
              ? {
                  backgroundColor: 'transparent',
                  borderColor: dt.colors.error,
                  borderWidth: 1,
                  marginTop: 12,
                }
              : {
                  backgroundColor: stickers.peachSoft,
                  borderColor: stickers.coral,
                  shadowColor: shadowInk,
                  shadowOffset: { width: 0, height: pressed ? 1 : 4 },
                  shadowOpacity: 0.18,
                  shadowRadius: pressed ? 4 : 10,
                  elevation: 3,
                  transform: [{ translateY: pressed ? 1 : 0 }],
                  marginTop: 12,
                },
            diffuse && pressed && { opacity: 0.7 },
          ]}
        >
          <Trash2 size={16} color={diffuse ? dt.colors.error : stickers.coral} strokeWidth={diffuse ? 1.6 : 2.2} />
          <Text style={[styles.dangerText, { color: diffuse ? dt.colors.error : ink, fontFamily: diffuse ? diffuseFont.mono : font.bodySemiBold, letterSpacing: diffuse ? 1.6 : 0.1 }, diffuse && { textTransform: 'uppercase' }]}>
            {t('settings_deleteAccount')}
          </Text>
        </Pressable>
        </>)}
      </ScrollView>

      {/* ── Sign Out Confirmation Modal ── */}
      <CenterModal
        visible={signOutModalVisible}
        onClose={() => setSignOutModalVisible(false)}
        dismissOnBackdrop={!signingOut}
        backdropColor="rgba(20,19,19,0.45)"
        avoidKeyboard={false}
        containerStyle={{ alignItems: 'stretch' }}
      >
          <Pressable
            style={[
              styles.signOutSheet,
              {
                backgroundColor: diffuse ? dt.colors.bg : colors.bg,
                borderColor: diffuse ? dt.colors.line : colors.text,
                borderRadius: diffuse ? radius.lg : 26,
                borderWidth: diffuse ? 1 : 1.5,
              },
            ]}
            onPress={(e) => e.stopPropagation()}
          >
            <Display size={28} color={ink} style={{ marginBottom: 6, textAlign: 'center' }}>
              {t('settings_signOutTitle')}
            </Display>
            <DisplayItalic size={16} color={diffuse ? dt.colors.ink3 : colors.textSecondary} style={{ textAlign: 'center', marginBottom: 18, fontFamily: diffuse ? undefined : font.body, fontSize: diffuse ? undefined : 14, lineHeight: diffuse ? undefined : 20 }}>
              {t('settings_signOutEverywhereHint')}
            </DisplayItalic>

            <Pressable
              disabled={signingOut}
              onPress={() => handleSignOut(false)}
              style={({ pressed }) => [
                styles.modalBtn,
                diffuse
                  ? { backgroundColor: 'transparent', borderColor: dt.colors.hairline }
                  : { backgroundColor: stickers.peachSoft, borderColor: colors.text, borderWidth: 1.5 },
                { opacity: pressed ? (diffuse ? 0.7 : 0.85) : 1 },
              ]}
            >
              <Text style={[styles.modalBtnText, { color: ink, fontFamily: diffuse ? diffuseFont.mono : font.bodySemiBold }, diffuse && { letterSpacing: 1.6, textTransform: 'uppercase' }]}>
                {t('profile_signOut')}
              </Text>
            </Pressable>

            <Pressable
              disabled={signingOut}
              onPress={() => handleSignOut(true)}
              style={({ pressed }) => [
                styles.modalBtn,
                diffuse
                  ? { backgroundColor: 'transparent', borderColor: dt.colors.error, marginTop: 8 }
                  : { backgroundColor: stickers.peachSoft, borderColor: colors.text, borderWidth: 1.5, marginTop: 8 },
                { opacity: pressed ? (diffuse ? 0.7 : 0.85) : 1 },
              ]}
            >
              <Text style={[styles.modalBtnText, { color: diffuse ? dt.colors.error : colors.text, fontFamily: diffuse ? diffuseFont.mono : font.bodySemiBold }, diffuse && { letterSpacing: 1.6, textTransform: 'uppercase' }]}>
                {t('account_signOutAllDevices')}
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
              <Text style={[styles.modalBtnText, { color: inkMuted, fontFamily: diffuse ? diffuseFont.mono : font.bodyMedium }, diffuse && { letterSpacing: 1.6, textTransform: 'uppercase' }]}>
                {t('common_cancel')}
              </Text>
            </Pressable>
          </Pressable>
      </CenterModal>

      {/* ── Language Picker Modal ── */}
      <Modal
        visible={langModalVisible}
        animationType={diffuse ? 'slide' : 'fade'}
        presentationStyle="pageSheet"
        onRequestClose={() => setLangModalVisible(false)}
      >
        <View style={[styles.modalRoot, { backgroundColor: diffuse ? dt.colors.bg : colors.bg }]}>
          <View style={styles.modalHeader}>
            <View style={{ width: 38 }} />
            <Display size={20} color={ink}>{t('settings_selectLanguage')}</Display>
            {!diffuse ? (
              <InkBackButton icon="close" ink={colors.text} paper={colors.surface} label={t("common_close")} onPress={() => setLangModalVisible(false)} style={{ marginBottom: 0 }} />
            ) : (
            <Pressable onPress={() => setLangModalVisible(false)} hitSlop={10}>
              <View
                style={[
                  styles.modalClose,
                  diffuse
                    ? { backgroundColor: 'transparent', borderColor: dt.colors.hairline }
                    : {
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
                <X size={16} color={ink} strokeWidth={diffuse ? 1.8 : 2.4} />
              </View>
            </Pressable>
            )}
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
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
  const trackBg = diffuse ? 'transparent' : colors.surface
  const trackBorder = diffuse ? dt.colors.line : colors.text
  return (
    <View
      style={[
        unitStyles.wrap,
        {
          backgroundColor: trackBg,
          borderColor: trackBorder,
          borderWidth: diffuse ? 1 : 1.5,
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
              active && (diffuse
                ? {
                    backgroundColor: dt.colors.surface,
                    borderWidth: 1,
                    borderColor: dt.colors.hairline,
                  }
                : { backgroundColor: colors.text }),
            ]}
          >
            <Text
              style={[
                unitStyles.text,
                diffuse
                  ? {
                      color: active ? dt.colors.ink : dt.colors.ink3,
                      fontFamily: active ? diffuseFont.monoBold : diffuseFont.mono,
                      letterSpacing: 1,
                      textTransform: 'uppercase',
                    }
                  : {
                      color: active ? colors.bg : colors.textSecondary,
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
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: isDark ? 0.25 : 0.12,
    shadowRadius: 12,
    elevation: 3,
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
  cardDiffuse: {
    borderRadius: 20,
    borderWidth: 1,
    shadowOpacity: 0,
    elevation: 0,
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
