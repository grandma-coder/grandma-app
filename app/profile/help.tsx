/**
 * Help & FAQ hub (Phase 1 / trust). Searchable accordion grouped by category,
 * with a "still need help?" contact escalation — Flo-parity, tuned to our
 * feature set (journey modes, care circle, Grandma AI, subscriptions, privacy).
 *
 * Content is static + localized. Search filters questions across all categories.
 */

import { useMemo, useState } from 'react'
import { View, Text, ScrollView, Pressable, TextInput, StyleSheet, Linking, LayoutAnimation, Platform, UIManager } from 'react-native'
import { Search, ChevronDown, Mail } from 'lucide-react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme, useDiffuseTheme, diffuseFont } from '../../constants/theme'
import { useTranslation } from '../../lib/i18n'
import { ScreenHeader } from '../../components/ui/ScreenHeader'
import { Display, DisplayItalic, MonoCaps } from '../../components/ui/Typography'
import { useIsDiffuse } from '../../components/ui/diffuse/DiffuseKit'

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true)
}

interface Faq { qKey: string; aKey: string }
interface FaqCategory { key: string; labelKey: string; items: Faq[] }

// Categories mirror our surfaces, not Flo's. Q/A keys resolve via i18n.
const CATEGORIES: FaqCategory[] = [
  {
    key: 'start', labelKey: 'help_catStart',
    items: [
      { qKey: 'help_q_modes', aKey: 'help_a_modes' },
      { qKey: 'help_q_switchMode', aKey: 'help_a_switchMode' },
      { qKey: 'help_q_logging', aKey: 'help_a_logging' },
    ],
  },
  {
    key: 'account', labelKey: 'help_catAccount',
    items: [
      { qKey: 'help_q_export', aKey: 'help_a_export' },
      { qKey: 'help_q_delete', aKey: 'help_a_delete' },
      { qKey: 'help_q_password', aKey: 'help_a_password' },
    ],
  },
  {
    key: 'care', labelKey: 'help_catCare',
    items: [
      { qKey: 'help_q_invite', aKey: 'help_a_invite' },
      { qKey: 'help_q_permissions', aKey: 'help_a_permissions' },
    ],
  },
  {
    key: 'ai', labelKey: 'help_catAi',
    items: [
      { qKey: 'help_q_grandma', aKey: 'help_a_grandma' },
      { qKey: 'help_q_medical', aKey: 'help_a_medical' },
    ],
  },
  {
    key: 'billing', labelKey: 'help_catBilling',
    items: [
      { qKey: 'help_q_premium', aKey: 'help_a_premium' },
      { qKey: 'help_q_cancel', aKey: 'help_a_cancel' },
    ],
  },
  {
    key: 'privacy', labelKey: 'help_catPrivacy',
    items: [
      { qKey: 'help_q_dataSafe', aKey: 'help_a_dataSafe' },
      { qKey: 'help_q_sell', aKey: 'help_a_sell' },
    ],
  },
]

export default function HelpScreen() {
  const { colors, font, stickers, radius } = useTheme()
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
  const insets = useSafeAreaInsets()
  const { t } = useTranslation()

  const [query, setQuery] = useState('')
  const [open, setOpen] = useState<string | null>(null)

  const ink = diffuse ? dt.colors.ink : colors.text
  const inkMuted = diffuse ? dt.colors.ink3 : colors.textMuted
  const line = diffuse ? dt.colors.line : colors.borderLight
  const accent = diffuse ? dt.stickers.lilac : stickers.coral
  const cardBg = diffuse ? dt.colors.surface : colors.surface
  const cardBorder = diffuse ? dt.colors.line : colors.border

  // Filter Q/A by query across all categories (matches question OR answer).
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return CATEGORIES
    return CATEGORIES
      .map((cat) => ({
        ...cat,
        items: cat.items.filter((it) => {
          const question = t(it.qKey as any).toLowerCase()
          const answer = t(it.aKey as any).toLowerCase()
          return question.includes(q) || answer.includes(q)
        }),
      }))
      .filter((cat) => cat.items.length > 0)
  }, [query, t])

  function toggle(id: string) {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
    setOpen((cur) => (cur === id ? null : id))
  }

  return (
    <View style={[styles.root, { backgroundColor: diffuse ? dt.colors.bg : colors.bg }]}>
      <View style={[styles.headerWrap, { paddingTop: insets.top + 8 }]}>
        <ScreenHeader title="" />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={styles.titleBlock}>
          <Display size={34} color={ink}>{t('help_title')}</Display>
          <DisplayItalic size={18} color={diffuse ? dt.colors.ink : stickers.coral} style={{ marginTop: 6 }}>
            {t('help_subtitle')}
          </DisplayItalic>
        </View>

        {/* Search */}
        <View style={[styles.search, { backgroundColor: cardBg, borderColor: cardBorder, borderRadius: radius.md }]}>
          <Search size={17} color={inkMuted} strokeWidth={1.8} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={t('help_searchPlaceholder')}
            placeholderTextColor={inkMuted}
            style={[styles.searchInput, { color: ink, fontFamily: diffuse ? diffuseFont.body : font.body }]}
            returnKeyType="search"
          />
        </View>

        {filtered.length === 0 && (
          <Text style={[styles.empty, { color: inkMuted, fontFamily: diffuse ? diffuseFont.body : font.body }]}>
            {t('help_noResults')}
          </Text>
        )}

        {filtered.map((cat) => (
          <View key={cat.key} style={{ marginTop: 18 }}>
            <MonoCaps color={inkMuted} style={{ letterSpacing: 1.5 }}>{t(cat.labelKey as any)}</MonoCaps>
            <View style={[styles.card, diffuse && styles.cardFlat, { backgroundColor: cardBg, borderColor: cardBorder, borderRadius: radius.lg }]}>
              {cat.items.map((it, i) => {
                const id = `${cat.key}-${it.qKey}`
                const isOpen = open === id
                return (
                  <View key={it.qKey}>
                    {i > 0 && <View style={[styles.divider, { backgroundColor: line }]} />}
                    <Pressable onPress={() => toggle(id)} style={styles.qRow}>
                      <Text style={[styles.question, { color: ink, fontFamily: diffuse ? diffuseFont.bodySemiBold : font.bodySemiBold }]}>
                        {t(it.qKey as any)}
                      </Text>
                      <ChevronDown
                        size={17}
                        color={inkMuted}
                        strokeWidth={1.8}
                        style={{ transform: [{ rotate: isOpen ? '180deg' : '0deg' }] }}
                      />
                    </Pressable>
                    {isOpen && (
                      <Text style={[styles.answer, { color: inkMuted, fontFamily: diffuse ? diffuseFont.body : font.body }]}>
                        {t(it.aKey as any)}
                      </Text>
                    )}
                  </View>
                )
              })}
            </View>
          </View>
        ))}

        {/* Contact escalation */}
        <View style={[styles.contactCard, { backgroundColor: diffuse ? dt.stickers.lilacSoft : stickers.lilacSoft, borderRadius: radius.lg }]}>
          <Text style={[styles.contactTitle, { color: ink, fontFamily: diffuse ? diffuseFont.display : font.display }]}>
            {t('help_stillStuck')}
          </Text>
          <Text style={[styles.contactBody, { color: inkMuted, fontFamily: diffuse ? diffuseFont.body : font.body }]}>
            {t('help_stillStuckBody')}
          </Text>
          <Pressable
            onPress={() => Linking.openURL('mailto:support@grandma.app')}
            style={[styles.contactBtn, { backgroundColor: accent, borderRadius: radius.full }]}
          >
            <Mail size={16} color={diffuse ? dt.colors.bg : colors.textInverse} strokeWidth={2} />
            <Text style={[styles.contactBtnText, { color: diffuse ? dt.colors.bg : colors.textInverse, fontFamily: diffuse ? diffuseFont.bodySemiBold : font.bodySemiBold }]}>
              {t('help_contactUs')}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  headerWrap: { paddingHorizontal: 16 },
  scroll: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 48 },
  titleBlock: { marginTop: 4, marginBottom: 14, paddingHorizontal: 4 },
  search: { flexDirection: 'row', alignItems: 'center', gap: 10, height: 50, paddingHorizontal: 16, borderWidth: 1 },
  searchInput: { flex: 1, fontSize: 15, padding: 0 },
  empty: { fontSize: 14, textAlign: 'center', marginTop: 28, lineHeight: 20 },
  card: {
    padding: 4,
    marginTop: 8,
    borderWidth: 1,
    shadowColor: '#141313',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
  },
  cardFlat: { shadowOpacity: 0, elevation: 0 },
  divider: { height: 1, marginHorizontal: 18 },
  qRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingVertical: 15, paddingHorizontal: 18 },
  question: { fontSize: 14, flex: 1, lineHeight: 19 },
  answer: { fontSize: 13, lineHeight: 20, paddingHorizontal: 18, paddingBottom: 16, paddingTop: 0 },
  contactCard: { padding: 20, marginTop: 26, alignItems: 'flex-start' },
  contactTitle: { fontSize: 19 },
  contactBody: { fontSize: 13, lineHeight: 19, marginTop: 6, marginBottom: 16 },
  contactBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, height: 46, paddingHorizontal: 20 },
  contactBtnText: { fontSize: 14 },
})
