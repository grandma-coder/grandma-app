/**
 * Kids Profile — list all children, edit/remove each, add new.
 *
 * Expanded fields: sex, blood type, allergies (chips), medications (chips),
 * conditions, dietary restrictions, preferred foods, disliked foods, pediatrician, notes.
 */

import { dateLoc } from '../../lib/kpLocale'
import { useState } from 'react'
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  Alert,
  StyleSheet,
  Image,
} from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import * as ImageManipulator from 'expo-image-manipulator'
import { StickerDateModal } from '../../components/ui/StickerDateModal'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import {
  Pencil,
  Trash2,
  Search,
} from 'lucide-react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme, brand, useDiffuseTheme, diffuseFont, getModeColorSoft } from '../../constants/theme'
import { useIsDiffuse } from '../../components/ui/diffuse/DiffuseKit'
import { useTranslation, t as tNow } from '../../lib/i18n'
import { searchCountries, countryByCode } from '../../lib/countries'
import { useChildStore } from '../../store/useChildStore'
import { toDateStr } from '../../lib/cycleLogic'
import { supabase } from '../../lib/supabase'
import { LogSheet, SheetFooterAction } from '../../components/calendar/LogSheet'
import { SiteSticker } from '../../components/stickers/SiteSticker'
import { InkBackButton } from '../../components/ui/InkBackButton'
import { EyeAction, ACTION_TONES } from '../../components/ui/AuthDock'
import { SiteChoice } from '../../components/ui/SiteChoice'
import { ScreenHeader } from '../../components/ui/ScreenHeader'
import { PillButton } from '../../components/ui/PillButton'
import { Display, MonoCaps, Body } from '../../components/ui/Typography'
import {
  Heart as HeartSticker,
  Star as StarSticker,
  Cross as CrossSticker,
  Drop as DropSticker,
  Squishy,
} from '../../components/ui/Stickers'
import { Character } from '../../components/characters/Characters'
import { AvatarView, AvatarPickerModal, isIconAvatar } from '../../components/ui/AvatarPicker'
import { PHOTO_BUCKETS } from '../../lib/photoSigning'
import type { ChildWithRole } from '../../types'
import { parseLocalDate } from '../../lib/localDate'
import { AfterTransition } from '../../components/ui/AfterTransition'

// ─── Theme (Diffuse-aware) ──────────────────────────────────────────────────
// Under the Diffuse variant (now the default), source the surface palette + serif
// from the v3 tokens so this screen matches its already-Diffuse ScreenHeader /
// PillButton. Every component below reads `colors`/`font` from here, so the swap
// lives in one place. When !diffuse the values fall straight through to
// theme.colors / theme.font, leaving current-variant users unchanged.
function useKidsTheme() {
  const theme = useTheme()
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
  const colors = diffuse
    ? {
        ...theme.colors,
        bg: dt.colors.bg,
        bgWarm: dt.colors.bg,
        surface: dt.colors.surface,
        surfaceRaised: dt.colors.surfaceRaised,
        border: dt.colors.line,
        borderLight: dt.colors.line,
        text: dt.colors.ink,
        textSecondary: dt.colors.ink2,
        textMuted: dt.colors.ink3,
        textFaint: dt.colors.ink4,
      }
    : theme.colors
  const font = diffuse
    ? { ...theme.font, display: diffuseFont.display, body: diffuseFont.body, italic: diffuseFont.italic }
    : theme.font
  // Paper surface + hairline that previously hardcoded '#FFFEF8' /
  // 'rgba(20,19,19,0.08)'. Under Diffuse these follow the v3 palette; under the
  // current variant they resolve to the original cream values.
  // Site look (light): white paper + clean 1.5px ink outlines.
  const paper = diffuse ? colors.surface : (theme.isDark ? colors.surface : colors.surface)
  const hairline = diffuse ? colors.border : (theme.isDark ? colors.border : colors.text)
  const bw = diffuse ? 1 : 1.5
  // Readable dark ink for text sitting on a light-tinted chip. Diffuse routes it
  // to the v3 ink; current variant keeps the original warm '#3A3533'.
  const chipInk = colors.text
  return { ...theme, diffuse, colors, font, paper, hairline, chipInk, bw }
}

// ─── Constants ────────────────────────────────────────────────────────────

const SEX_OPTIONS = [
  { value: 'male', labelKey: 'kp_pk_boy' as const },
  { value: 'female', labelKey: 'kp_pk_girl' as const },
  { value: 'other', labelKey: 'kp_pk_other' as const },
]

const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']


const COMMON_CHILD_ALLERGIES = [
  'Milk', 'Eggs', 'Peanuts', 'Tree nuts', 'Wheat', 'Soy', 'Fish',
  'Shellfish', 'Sesame', 'Gluten', 'Lactose', 'Corn', 'Strawberry',
  'Banana', 'Kiwi', 'Citrus', 'Tomato', 'Chocolate', 'Honey',
  'Penicillin', 'Amoxicillin', 'Ibuprofen', 'Latex', 'Dust mites',
  'Pet dander', 'Pollen', 'Mold', 'Bee stings', 'Fragrance',
]

const COMMON_MEDICATIONS = [
  'Tylenol (Acetaminophen)', 'Ibuprofen (Advil)', 'Amoxicillin',
  'Cetirizine (Zyrtec)', 'Loratadine (Claritin)', 'Diphenhydramine (Benadryl)',
  'Albuterol inhaler', 'Prednisolone', 'Omeprazole', 'Montelukast (Singulair)',
  'Fluticasone nasal spray', 'Hydrocortisone cream', 'Vitamin D drops',
  'Iron supplement', 'Probiotics', 'Melatonin',
]

// ─── Helpers ──────────────────────────────────────────────────────────────

function formatAge(birthDate: string): string {
  if (!birthDate) return ''
  const born = new Date(birthDate)
  const now = new Date()
  const months = (now.getFullYear() - born.getFullYear()) * 12 + (now.getMonth() - born.getMonth())
  if (months < 1) return tNow('kids_home_age_newborn')
  if (months < 12) return tNow('kp_pk_ageMonths', { n: months })
  const y = Math.floor(months / 12)
  const m = months % 12
  return m > 0 ? tNow('kp_pk_ageYM', { y, m }) : tNow(y > 1 ? 'kp_pk_ageYears' : 'kp_pk_ageYear', { y })
}

function mapDbChild(c: any): ChildWithRole {
  return {
    id: c.id,
    parentId: c.parent_id,
    name: c.name,
    birthDate: c.birth_date ?? '',
    weightKg: c.weight_kg ?? 0,
    heightCm: c.height_cm ?? 0,
    sex: c.sex ?? '',
    bloodType: c.blood_type ?? '',
    allergies: c.allergies ?? [],
    medications: c.medications ?? [],
    conditions: c.conditions ?? [],
    dietaryRestrictions: c.dietary_restrictions ?? [],
    preferredFoods: c.preferred_foods ?? [],
    dislikedFoods: c.disliked_foods ?? [],
    pediatrician: c.pediatrician ?? null,
    notes: c.notes ?? '',
    photoUrl: c.photo_url ?? null,
    countryCode: c.country_code ?? 'US',
    caregiverRole: 'parent',
    permissions: { view: true, log_activity: true, chat: true },
  }
}

// ─── Photo helpers (mirror app/onboarding/kids) ─────────────────────────────

/** A freshly-picked local image URI (not yet uploaded / signed). */
function isLocalPhotoUri(v: string | null | undefined): boolean {
  return !!v && (v.startsWith('file:') || v.startsWith('content:') || v.startsWith('ph://') || v.startsWith('assets-library:'))
}

/**
 * What to store in `photo_url` at INSERT time. Icon sentinels + remote URLs
 * pass through; a local file uploads AFTER insert (needs the child id), so
 * store null for now; null stays null.
 */
function photoToStoreAtInsert(uri: string | null | undefined): string | null {
  if (!uri) return null
  if (isIconAvatar(uri)) return uri
  if (isLocalPhotoUri(uri)) return null
  return uri
}

/** Upload a local child photo to child-photos/{childId}/… → storage path, or null. */
async function uploadChildPhoto(childId: string, photoUri: string): Promise<string | null> {
  try {
    // Compress before upload (the <1MB rule) — matches lib/vault.ts + onboarding.
    const compressed = await ImageManipulator.manipulateAsync(
      photoUri,
      [{ resize: { width: 1600 } }],
      { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG },
    )
    const path = `${childId}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.jpg`
    const res = await fetch(compressed.uri)
    const buf = await res.arrayBuffer()
    const { error } = await supabase.storage
      .from('child-photos')
      .upload(path, buf, { contentType: 'image/jpeg', upsert: true })
    if (error) { console.warn('[kids] child photo upload failed:', error.message); return null }
    return path
  } catch (e) {
    console.warn('[kids] child photo upload exception:', e)
    return null
  }
}

async function pickChildImage(): Promise<string | null> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.8,
  })
  if (!result.canceled && result.assets[0]) return result.assets[0].uri
  return null
}

// ─── Avatar Field (photo / sticker-icon picker) ─────────────────────────────

function AvatarField({ value, onChange, accent, initial }: {
  value: string | null
  onChange: (v: string | null) => void
  accent: string
  initial: string
}) {
  const { colors } = useKidsTheme()
  const [pickerOpen, setPickerOpen] = useState(false)
  const local = isLocalPhotoUri(value)
  return (
    <View style={{ alignItems: 'center', gap: 8, marginBottom: 4 }}>
      <Pressable onPress={() => setPickerOpen(true)} accessibilityRole="button" accessibilityLabel={tNow('kp_pk_changePhoto')}>
        {local ? (
          // AvatarView would try to sign a local file:// URI as a storage path
          // (and fail) — render the freshly-picked file directly for preview.
          <Image
            source={{ uri: value as string }}
            style={{ width: 88, height: 88, borderRadius: 999, borderWidth: 3, borderColor: colors.text }}
          />
        ) : (
          <AvatarView value={value} size={88} accent={accent} initial={initial} bucket={PHOTO_BUCKETS.child} />
        )}
      </Pressable>
      <Pressable onPress={() => setPickerOpen(true)} hitSlop={8}>
        <MonoCaps color={colors.textMuted}>{value ? tNow('kp_pk_changePhoto') : tNow('kp_pk_addPhoto')}</MonoCaps>
      </Pressable>
      <AvatarPickerModal
        visible={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onPickPhoto={async () => {
          setPickerOpen(false)
          const uri = await pickChildImage()
          if (uri) onChange(uri)
        }}
        onPickIcon={(v) => { onChange(v); setPickerOpen(false) }}
      />
    </View>
  )
}

// ─── Main Screen ──────────────────────────────────────────────────────────

export default function KidsProfileScreen() {
  const { colors, font, isDark, stickers, paper, hairline, diffuse, bw } = useKidsTheme()
  const { t } = useTranslation()
  const insets = useSafeAreaInsets()
  const children = useChildStore((s) => s.children)
  const setChildren = useChildStore((s) => s.setChildren)

  const [editingChild, setEditingChild] = useState<ChildWithRole | null>(null)
  const [showAddSheet, setShowAddSheet] = useState(false)

  async function handleDelete(child: ChildWithRole) {
    Alert.alert(
      t('kp_pk_removeTitle', { name: child.name }),
      t('kp_pk_removeBody'),
      [
        { text: t('common_cancel'), style: 'cancel' },
        {
          text: t('common_remove'),
          style: 'destructive',
          onPress: async () => {
            try {
              // Supabase returns errors in { error }, not as a throw — destructure
              // or a failed delete (e.g. RLS) silently "succeeds" and the child
              // reappears on next refetch.
              const { error } = await supabase.from('children').delete().eq('id', child.id)
              if (error) throw error
              setChildren(children.filter((c) => c.id !== child.id))
            } catch (e: any) {
              Alert.alert(t('common_error'), t('error_generic'))
            }
          },
        },
      ]
    )
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      <View style={[styles.headerWrap, { paddingTop: insets.top + 8 }]}>
        {!diffuse ? (
          <View style={styles.siteHeader}>
            <InkBackButton ink={colors.text} paper={colors.surface} style={{ marginBottom: 0 }} />
            <SiteSticker name="baby" size={30} cut />
            <Text style={[styles.siteTitle, { color: colors.text, fontFamily: font.display }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>{t('kp_pk_kidsProfile')}</Text>
            <Pressable onPress={() => setShowAddSheet(true)} hitSlop={10} accessibilityRole="button" accessibilityLabel={t('kp_pk_addChildA11y')}>
              <View style={[styles.headerAddBtn, { backgroundColor: paper, borderColor: colors.text, borderWidth: bw }]}>
                <Ionicons name="add" size={20} color={colors.text} />
              </View>
            </Pressable>
          </View>
        ) : (
        <ScreenHeader
          title={t('kp_pk_kidsProfile')}
          right={
            <Pressable onPress={() => setShowAddSheet(true)} hitSlop={10}>
              <View
                style={[
                  styles.headerAddBtn,
                  {
                    backgroundColor: paper,
                    borderColor: hairline,
                  },
                ]}
              >
                <Ionicons name="add" size={20} color={colors.text} />
              </View>
            </Pressable>
          }
        />
        )}
      </View>

      <AfterTransition>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {children.length === 0 && (
          <View style={[styles.emptyCard, !diffuse && styles.emptyCardSite, { backgroundColor: diffuse ? colors.surface : 'transparent' }]}>
            {diffuse ? <Character name="baby" size={64} /> : <SiteSticker name="baby" size={72} cut />}
            <Display size={20} align="center" color={colors.text}>
              {t('profKids_noChildren')}
            </Display>
            <Body size={14} align="center" color={colors.textSecondary}>
              {t('profKids_noChildrenSub')}
            </Body>
          </View>
        )}

        {children.map((child, i) => (
          <ChildCard
            key={child.id}
            child={child}
            index={i}
            // Only the parent can edit or remove a child (RLS is parent-only); a caregiver who also has
            // their own kids journey saw these controls, and the write silently matched no rows.
            onEdit={child.caregiverRole === 'parent' ? () => setEditingChild(child) : undefined}
            onDelete={child.caregiverRole === 'parent' ? () => handleDelete(child) : undefined}
          />
        ))}

        <PillButton
          label={t('kp_pk_addChild')}
          variant="paper"
          onPress={() => setShowAddSheet(true)}
          leading={<Ionicons name="add" size={18} color={colors.text} />}
          style={{ marginTop: 8 }}
        />
      </ScrollView>
      </AfterTransition>

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

// ─── Child Card (Compact) ─────────────────────────────────────────────────

const KID_COLORS = ['#9DC3E8', '#F2B2C7', '#BDD48C', '#C8B6E8', '#F5D652', '#F5B896']

function ChildCard({ child, index, onEdit, onDelete }: { child: ChildWithRole; index: number; onEdit?: () => void; onDelete?: () => void }) {
  const { colors, font, stickers, isDark, paper, hairline, chipInk, diffuse, bw } = useKidsTheme()
  const accent = KID_COLORS[index % KID_COLORS.length]
  const kidSoft = [stickers.blueSoft, stickers.pinkSoft, stickers.greenSoft, stickers.lilacSoft, stickers.yellowSoft, stickers.peachSoft][index % 6]
  const site = !diffuse && !isDark

  // Collect summary tags
  const tags: { label: string; color: string; soft: string }[] = []
  if (child.bloodType) tags.push({ label: child.bloodType, color: stickers.coral, soft: stickers.pinkSoft })
  child.allergies.forEach((a) => tags.push({ label: a, color: stickers.coral, soft: stickers.pinkSoft }))
  child.conditions.forEach((c) => tags.push({ label: c, color: '#E8A435', soft: stickers.yellowSoft }))
  child.medications.forEach((m) => tags.push({ label: m, color: stickers.blue, soft: stickers.blueSoft }))
  child.dietaryRestrictions.forEach((r) => tags.push({ label: r, color: '#E8A435', soft: stickers.yellowSoft }))
  const uniqueTags = tags.filter((t, i, arr) => arr.findIndex((x) => x.label === t.label) === i)
  const visibleTags = uniqueTags.slice(0, 5)
  const extraCount = uniqueTags.length - visibleTags.length

  // Food summary — dedupe first (legacy rows can hold e.g. ['beans','beans']).
  const foodParts: string[] = []
  const uniqPreferred = Array.from(new Set(child.preferredFoods))
  const uniqDisliked = Array.from(new Set(child.dislikedFoods))
  if (uniqPreferred.length > 0) foodParts.push(tNow('kp_pk_loves', { list: uniqPreferred.slice(0, 3).join(', ') }))
  if (uniqDisliked.length > 0) foodParts.push(tNow('kp_pk_avoids', { list: uniqDisliked.slice(0, 3).join(', ') }))
  const foodSummary = foodParts.join(' · ')

  const sexLabel = child.sex === 'male' ? tNow('kp_pk_boy') : child.sex === 'female' ? tNow('kp_pk_girl') : tNow('kp_pk_other')
  const sexColor = child.sex === 'male' ? stickers.blue : child.sex === 'female' ? stickers.pink : stickers.lilac

  return (
    <Pressable
      onPress={onEdit}
      onLongPress={onDelete}
      delayLongPress={600}
      style={({ pressed }) => [
        styles.childCard,
        {
          backgroundColor: site ? kidSoft : paper,
          borderColor: hairline,
        },
        !diffuse && { borderWidth: bw, borderRadius: 18, shadowColor: colors.text, shadowOffset: { width: 0, height: 2 }, shadowOpacity: isDark ? 0 : 0.1, shadowRadius: 0, elevation: 0 },
        pressed && { opacity: 0.9 },
      ]}
    >
      {/* Row 1: Sticker avatar + Name + Age + actions */}
      <View style={styles.childHeader}>
        {child.photoUrl ? (
          <AvatarView
            value={child.photoUrl}
            size={48}
            accent={accent}
            initial={(child.name?.[0] ?? '?').toUpperCase()}
            borderColor={colors.text}
            borderWidth={1.5}
            bucket={PHOTO_BUCKETS.child}
          />
        ) : site ? (
          <SiteSticker name="baby" size={48} cut />
        ) : (
          <View
            style={[
              styles.childAvatar,
              { backgroundColor: accent + '40', borderColor: colors.text },
            ]}
          >
            <Character name="baby" size={28} />
          </View>
        )}
        <View style={styles.childInfo}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text
              style={[
                styles.childName,
                { color: colors.text, fontFamily: font.display },
                site && { textTransform: 'uppercase', letterSpacing: 0.3 },
              ]}
            >
              {child.name}
            </Text>
            {child.sex ? (
              <View style={[styles.sexBadge, { backgroundColor: sexColor + '30' }, site && { backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.text }]}>
                <Text
                  style={[
                    styles.sexBadgeText,
                    { color: isDark ? sexColor : chipInk, fontFamily: font.bodySemiBold },
                  ]}
                >
                  {sexLabel}
                </Text>
              </View>
            ) : null}
          </View>
          <Text
            style={[
              styles.childAge,
              { color: colors.textSecondary, fontFamily: font.body },
            ]}
            numberOfLines={1}
          >
            {child.birthDate ? tNow('kp_pk_bornOn', { age: formatAge(child.birthDate), date: parseLocalDate(child.birthDate).toLocaleDateString(dateLoc(), { month: 'short', day: 'numeric', year: 'numeric' }) }) : tNow('kp_pk_noBirthDate')}
          </Text>
        </View>
        <View style={styles.cardActions}>
          {onEdit && (
            <Pressable onPress={onEdit} hitSlop={8}>
              {site ? <SiteSticker name="pencil" size={24} /> : <Pencil size={16} color={colors.text} strokeWidth={2} />}
            </Pressable>
          )}
          {onDelete && (
            <Pressable onPress={onDelete} hitSlop={8}>
              <Trash2 size={15} color={site ? colors.text : colors.textMuted} strokeWidth={2} />
            </Pressable>
          )}
        </View>
      </View>

      {visibleTags.length > 0 && (
        <View style={styles.tagRow}>
          {visibleTags.map((t, i) => (
            <View key={`${t.label}-${i}`} style={[styles.miniChip, { backgroundColor: t.color + (isDark ? '24' : '20') }, site && { backgroundColor: t.soft, borderWidth: 1.5, borderColor: colors.text }]}>
              <Text
                style={[
                  styles.miniChipText,
                  { color: isDark ? t.color : chipInk, fontFamily: font.bodySemiBold },
                ]}
              >
                {t.label}
              </Text>
            </View>
          ))}
          {extraCount > 0 && (
            <View style={[styles.miniChip, { backgroundColor: colors.surfaceRaised }, site && { backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.text }]}>
              <Text style={[styles.miniChipText, { color: site ? colors.text : colors.textSecondary, fontFamily: font.bodySemiBold }]}>
                +{extraCount}
              </Text>
            </View>
          )}
        </View>
      )}

      {foodSummary ? (
        <Text style={[styles.foodLine, { color: site ? colors.text : colors.textSecondary, fontFamily: font.body }]} numberOfLines={1}>
          {foodSummary}
        </Text>
      ) : null}

      {child.pediatrician?.name ? (
        <View style={styles.pedRow}>
          {site ? <SiteSticker name="phone" size={18} /> : <Character name="checkup" size={12} color={colors.textMuted} />}
          <Text style={[styles.pedText, { color: site ? colors.text : colors.textMuted, fontFamily: font.body }]} numberOfLines={1}>
            {child.pediatrician.name}{child.pediatrician.phone ? ` · ${child.pediatrician.phone}` : ''}
          </Text>
        </View>
      ) : null}
    </Pressable>
  )
}

// ─── Autocomplete Chip Input ──────────────────────────────────────────────

function ChipInput({ label, value, onChange, suggestions, chipColor, softColor, placeholder }: {
  label: string
  value: string[]
  onChange: (v: string[]) => void
  suggestions: string[]
  chipColor: string
  /** Site look: soft tone fill for the ink-outlined tags. */
  softColor?: string
  placeholder: string
}) {
  const { colors, font, isDark, paper, hairline, chipInk, diffuse, bw } = useKidsTheme()
  const site = !diffuse && !isDark
  const { t } = useTranslation()
  const border = hairline
  const chipFg = isDark ? chipColor : chipInk
  const [query, setQuery] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)

  const filtered = query.length >= 1
    ? suggestions.filter((s) => s.toLowerCase().includes(query.toLowerCase()) && !value.includes(s)).slice(0, 6)
    : []

  function add(item: string) {
    if (!value.includes(item)) onChange([...value, item])
    setQuery('')
    setShowSuggestions(false)
  }

  function remove(item: string) {
    onChange(value.filter((v) => v !== item))
  }

  function handleSubmit() {
    const trimmed = query.trim()
    if (trimmed && !value.includes(trimmed)) onChange([...value, trimmed])
    setQuery('')
    setShowSuggestions(false)
  }

  // Dedupe at render time — legacy data in Supabase can have duplicate
  // entries (e.g. ['beans', 'beans']) that would crash React's reconciler
  // when used as a key. Preserves first occurrence order.
  const uniqueValue = Array.from(new Set(value))

  return (
    <View style={formStyles.field}>
      <MonoCaps color={colors.textMuted}>{label}</MonoCaps>

      {uniqueValue.length > 0 && (
        <View style={formStyles.chipRow}>
          {uniqueValue.map((item) => (
            <View key={item} style={[formStyles.chipTag, { backgroundColor: chipColor + (isDark ? '28' : '24') }, site && { backgroundColor: softColor ?? colors.surface, borderWidth: 1.5, borderColor: colors.text }]}>
              <Text style={[formStyles.chipTagText, { color: chipFg, fontFamily: font.bodySemiBold }]}>{item}</Text>
              <Pressable onPress={() => remove(item)} hitSlop={6}>
                <Ionicons name="close" size={13} color={chipFg} />
              </Pressable>
            </View>
          ))}
        </View>
      )}

      <View style={[formStyles.inputRow, { backgroundColor: paper, borderColor: border, borderWidth: bw }, !diffuse && { borderRadius: 16 }]}>
        <Search size={16} color={colors.textMuted} strokeWidth={2} />
        <TextInput
          value={query}
          onChangeText={(t) => { setQuery(t); setShowSuggestions(t.length >= 1) }}
          placeholder={placeholder}
          placeholderTextColor={colors.textMuted}
          style={[formStyles.inputInner, { color: colors.text, fontFamily: font.body }, !diffuse && { fontSize: 16 }]}
          onSubmitEditing={handleSubmit}
          returnKeyType="done"
          onFocus={() => { if (query.length >= 1) setShowSuggestions(true) }}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
        />
      </View>

      {showSuggestions && query.trim().length > 0 && (
        <View style={[formStyles.dropdown, { backgroundColor: paper, borderColor: border, borderWidth: bw }, !diffuse && { borderRadius: 16 }]}>
          {filtered.map((s) => (
            <Pressable key={s} onPress={() => add(s)} style={({ pressed }) => [formStyles.dropdownItem, pressed && { backgroundColor: colors.surfaceRaised }]}>
              <Text style={[formStyles.dropdownText, { color: colors.text, fontFamily: font.body }]}>{s}</Text>
            </Pressable>
          ))}
          {!value.includes(query.trim()) && !suggestions.some((s) => s.toLowerCase() === query.trim().toLowerCase() && value.includes(s)) && (
            <Pressable
              onPress={handleSubmit}
              style={({ pressed }) => [formStyles.dropdownItem, filtered.length > 0 && { borderTopWidth: 1, borderTopColor: border }, pressed && { backgroundColor: colors.surfaceRaised }]}
            >
              <Text style={[formStyles.dropdownText, { color: colors.text, fontFamily: font.bodySemiBold }]}>
                {t('profKids_addCustomPrefix')}{'"'}{query.trim()}{'"'}
              </Text>
            </Pressable>
          )}
        </View>
      )}
    </View>
  )
}

// ─── Edit Child Sheet ─────────────────────────────────────────────────────

function EditChildSheet({
  child,
  onClose,
  onSaved,
}: {
  child: ChildWithRole
  onClose: () => void
  onSaved: (updated: ChildWithRole) => void
}) {
  const { colors, font, stickers, isDark, paper, hairline, diffuse, bw } = useKidsTheme()
  const { t } = useTranslation()
  const soft = getModeColorSoft('kids')

  const [photo, setPhoto] = useState<string | null>(child.photoUrl ?? null)
  const [name, setName] = useState(child.name)
  const [birthDate, setBirthDate] = useState(child.birthDate)
  const [sex, setSex] = useState(child.sex)
  const [bloodType, setBloodType] = useState(child.bloodType)
  const [allergies, setAllergies] = useState<string[]>(child.allergies)
  const [medications, setMedications] = useState<string[]>(child.medications)
  const [conditions, setConditions] = useState<string[]>(child.conditions)
  const [dietaryRestrictions, setDietaryRestrictions] = useState<string[]>(child.dietaryRestrictions)
  const [preferredFoods, setPreferredFoods] = useState<string[]>(child.preferredFoods)
  const [dislikedFoods, setDislikedFoods] = useState<string[]>(child.dislikedFoods)
  const [pedName, setPedName] = useState(child.pediatrician?.name ?? '')
  const [pedPhone, setPedPhone] = useState(child.pediatrician?.phone ?? '')
  const [pedClinic, setPedClinic] = useState(child.pediatrician?.clinic ?? '')
  const [countryCode, setCountryCode] = useState(child.countryCode ?? 'US')
  const [countryQuery, setCountryQuery] = useState(countryByCode(child.countryCode ?? 'US')?.name ?? 'United States')
  const [countryDropdownOpen, setCountryDropdownOpen] = useState(false)
  const [notes, setNotes] = useState(child.notes)
  const [dateModalOpen, setDateModalOpen] = useState(false)
  const [dateDraft, setDateDraft] = useState<Date>(child.birthDate ? new Date(child.birthDate) : new Date())
  const [saving, setSaving] = useState(false)

  function splitList(s: string): string[] {
    return [...new Set(s ? s.split(',').map((a) => a.trim()).filter(Boolean) : [])]
  }

  const canSave = name.trim().length > 0 && sex.length > 0 && !!birthDate

  async function handleSave() {
    if (!name.trim()) return Alert.alert(t('auth_missingInfo'), t('kp_pk_nameRequired'))
    if (!sex) return Alert.alert(t('auth_missingInfo'), t('kp_pk_selectSex'))
    if (!birthDate) return Alert.alert(t('auth_missingInfo'), t('kp_pk_setBirthDate'))
    setSaving(true)
    try {
      const pediatrician = pedName.trim() ? { name: pedName.trim(), phone: pedPhone.trim(), clinic: pedClinic.trim() } : null

      // Dedupe chip arrays before writing back — legacy rows can have
      // duplicates that React then chokes on when used as list keys.
      const uniq = (a: string[]) => Array.from(new Set(a))
      const cleanAllergies = uniq(allergies)
      const cleanMedications = uniq(medications)
      const cleanConditions = uniq(conditions)
      const cleanDietary = uniq(dietaryRestrictions)
      const cleanPreferred = uniq(preferredFoods)
      const cleanDisliked = uniq(dislikedFoods)

      // Resolve avatar: upload a freshly-picked local photo (the child id
      // exists here), else keep the icon sentinel / existing path / null.
      let photoUrl = photo
      if (isLocalPhotoUri(photo)) {
        photoUrl = (await uploadChildPhoto(child.id, photo as string)) ?? child.photoUrl ?? null
      }

      const { error } = await supabase.from('children').update({
        name: name.trim(),
        birth_date: birthDate || null,
        sex: sex || null,
        blood_type: bloodType || null,
        allergies: cleanAllergies,
        medications: cleanMedications,
        conditions: cleanConditions,
        dietary_restrictions: cleanDietary,
        preferred_foods: cleanPreferred,
        disliked_foods: cleanDisliked,
        pediatrician,
        notes: notes.trim() || null,
        photo_url: photoUrl,
        country_code: countryCode,
      }).eq('id', child.id)

      if (error) throw error

      onSaved({
        ...child,
        name: name.trim(),
        birthDate: birthDate ?? '',
        sex,
        bloodType,
        countryCode,
        photoUrl,
        allergies: cleanAllergies,
        medications: cleanMedications,
        conditions: cleanConditions,
        dietaryRestrictions: cleanDietary,
        preferredFoods: cleanPreferred,
        dislikedFoods: cleanDisliked,
        pediatrician,
        notes: notes.trim(),
      })
    } catch (e: any) {
      Alert.alert(t('common_error'), t('error_generic'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <LogSheet visible title={t('kp_pk_editChild', { name: child.name })} onClose={onClose} sticker="baby">
      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={formStyles.form}>
          <AvatarField
            value={photo}
            onChange={setPhoto}
            accent={stickers.blue}
            initial={(name.trim()[0] ?? '?').toUpperCase()}
          />
          <SectionHeader label={t('kp_pk_basicInfo')} />
          <FormField label={t('kp_pk_nameLabel')} value={name} onChangeText={setName} placeholder={t('kp_pk_childName')} />

          <View style={{ marginTop: 4 }}><MonoCaps color={colors.textMuted}>{t('profKids_labelSex')}</MonoCaps></View>
          <View style={formStyles.optionRow}>
            {!diffuse ? SEX_OPTIONS.map((opt) => (
              <SiteChoice key={opt.value} compact label={t(opt.labelKey)} selected={sex === opt.value} tone={soft}
                onPress={() => setSex(sex === opt.value ? '' : opt.value)} />
            )) : SEX_OPTIONS.map((opt) => (
              <Pressable
                key={opt.value}
                onPress={() => setSex(sex === opt.value ? '' : opt.value)}
                style={[
                  formStyles.optionBtn,
                  {
                    backgroundColor: sex === opt.value ? colors.text : paper,
                    borderColor: sex === opt.value ? colors.text : hairline,
                  },
                ]}
              >
                <Text style={[formStyles.optionText, { color: sex === opt.value ? colors.bg : colors.text, fontFamily: font.bodyMedium }]}>{t(opt.labelKey)}</Text>
              </Pressable>
            ))}
          </View>

          <View style={{ marginTop: 4 }}><MonoCaps color={colors.textMuted}>{t('profKids_labelBirthDate')}</MonoCaps></View>
          <Pressable
            onPress={() => {
              setDateDraft(birthDate ? new Date(birthDate) : new Date())
              setDateModalOpen(true)
            }}
            style={[
              formStyles.dateBtn,
              {
                backgroundColor: colors.surface,
                borderColor: diffuse ? colors.border : colors.text,
                borderWidth: bw,
              },
              !diffuse && { borderRadius: 16 },
            ]}
          >
            <Text style={[formStyles.dateText, { color: birthDate ? colors.text : colors.textMuted, fontFamily: font.body }, !diffuse && { fontSize: 16 }]}>
              {birthDate
                ? `${parseLocalDate(birthDate).toLocaleDateString(dateLoc(), { month: 'long', day: 'numeric', year: 'numeric' })}  ·  ${formatAge(birthDate)}`
                : t('kp_pk_selectDate')}
            </Text>
          </Pressable>
          <StickerDateModal
            visible={dateModalOpen}
            title={t('kp_pk_birthDateTitle')}
            value={dateDraft}
            onChange={setDateDraft}
            onClose={() => setDateModalOpen(false)}
            onSave={() => {
              setBirthDate(toDateStr(dateDraft))
              setDateModalOpen(false)
            }}
            maximumDate={new Date()}
            minimumDate={new Date(new Date().getFullYear() - 25, 0, 1)}
          />

          <View style={{ marginTop: 4 }}><MonoCaps color={colors.textMuted}>{t('children_bloodType')}</MonoCaps></View>
          <View style={formStyles.optionRow}>
            {!diffuse ? BLOOD_TYPES.map((bt) => (
              <SiteChoice key={bt} compact tick={false} label={bt} selected={bloodType === bt} tone={stickers.pinkSoft}
                onPress={() => setBloodType(bloodType === bt ? '' : bt)} />
            )) : BLOOD_TYPES.map((bt) => (
              <Pressable
                key={bt}
                onPress={() => setBloodType(bloodType === bt ? '' : bt)}
                style={[
                  formStyles.bloodBtn,
                  {
                    backgroundColor: bloodType === bt ? stickers.coral + (isDark ? '32' : '28') : paper,
                    borderColor: bloodType === bt ? stickers.coral : hairline,
                  },
                ]}
              >
                <Text style={[formStyles.bloodText, { color: bloodType === bt ? stickers.coral : colors.text, fontFamily: font.bodySemiBold }]}>{bt}</Text>
              </Pressable>
            ))}
          </View>

          <View style={{ marginTop: 8 }}><MonoCaps color={colors.textMuted}>{t('profKids_labelCountryVaccine')}</MonoCaps></View>
          <View>
            <View
              style={[
                formStyles.inputRow,
                {
                  backgroundColor: paper,
                  borderColor: countryDropdownOpen ? colors.text : hairline,
                  borderWidth: bw,
                },
                !diffuse && { borderRadius: 16 },
              ]}
            >
              <Search size={16} color={colors.textMuted} strokeWidth={2} />
              <TextInput
                value={countryQuery}
                onChangeText={(t) => { setCountryQuery(t); setCountryDropdownOpen(true) }}
                onFocus={() => setCountryDropdownOpen(true)}
                placeholder={t('kp_pk_searchCountry')}
                placeholderTextColor={colors.textMuted}
                style={[formStyles.inputInner, { color: colors.text, fontFamily: font.body }, !diffuse && { fontSize: 16 }]}
              />
              {countryCode && (
                <Text style={{ fontSize: 13, color: colors.text, fontFamily: font.bodySemiBold }}>
                  {countryByCode(countryCode)?.code}
                </Text>
              )}
            </View>
            {countryDropdownOpen && (() => {
              const matches = searchCountries(countryQuery)
              if (matches.length === 0) return null
              return (
                <ScrollView
                  keyboardShouldPersistTaps="handled"
                  nestedScrollEnabled
                  style={[
                    formStyles.dropdown,
                    {
                      backgroundColor: paper,
                      borderColor: hairline,
                      borderWidth: bw,
                    },
                    !diffuse && { borderRadius: 16 },
                  ]}
                >
                  {matches.map((c) => (
                    <Pressable
                      key={c.code}
                      onPress={() => {
                        setCountryCode(c.code)
                        setCountryQuery(c.name)
                        setCountryDropdownOpen(false)
                      }}
                      style={[formStyles.dropdownItem, { backgroundColor: c.code === countryCode ? (diffuse ? colors.surfaceRaised : soft) : 'transparent' }]}
                    >
                      <Text style={[formStyles.dropdownText, { color: colors.text, fontFamily: c.code === countryCode ? font.bodySemiBold : font.body }]}>
                        {c.name}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              )
            })()}
          </View>

          {/* Health — chips with autocomplete */}
          <SectionHeader label={t('kp_pk_healthMedical')} />
          <ChipInput label={t('children_allergies')} value={allergies} onChange={setAllergies} suggestions={COMMON_CHILD_ALLERGIES} chipColor={brand.error} softColor={stickers.pinkSoft} placeholder={t('kp_pk_searchAllergies')} />
          <ChipInput label={t('kids_home_health_medications')} value={medications} onChange={setMedications} suggestions={COMMON_MEDICATIONS} chipColor={brand.secondary} softColor={stickers.blueSoft} placeholder={t('kp_pk_searchMeds')} />
          <ChipInput label={t('kp_pk_conditions')} value={conditions} onChange={setConditions} suggestions={[]} chipColor={colors.textSecondary} softColor={stickers.peachSoft} placeholder={t('kp_pk_conditionsPh')} />

          {/* Food */}
          <SectionHeader label={t('kp_pk_foodPrefs')} />
          <ChipInput label={t('kp_pk_preferredFoods')} value={preferredFoods} onChange={setPreferredFoods} suggestions={[]} chipColor={brand.success} softColor={stickers.greenSoft} placeholder={t('kp_pk_preferredPh')} />
          <ChipInput label={t('kp_pk_dislikedFoods')} value={dislikedFoods} onChange={setDislikedFoods} suggestions={[]} chipColor={brand.warning} softColor={stickers.yellowSoft} placeholder={t('kp_pk_dislikedPh')} />
          <ChipInput label={t('kp_pk_dietary')} value={dietaryRestrictions} onChange={setDietaryRestrictions} suggestions={[]} chipColor={brand.accent} softColor={stickers.lilacSoft} placeholder={t('kp_pk_dietaryPh')} />

          {/* Pediatrician */}
          <SectionHeader label={t('children_pediatrician')} />
          <FormField label={t('kp_pk_doctorName')} value={pedName} onChangeText={setPedName} placeholder={t('kp_pk_pedNamePh')} />
          <FormField label={t('emergencyInsurance_fieldPhone')} value={pedPhone} onChangeText={setPedPhone} placeholder={t('kp_pk_phonePh')} keyboardType="phone-pad" />
          <FormField label={t('kp_pk_clinic')} value={pedClinic} onChangeText={setPedClinic} placeholder={t('kp_pk_clinicPh')} />

          {/* Notes */}
          <SectionHeader label={t('kp_pk_additionalNotes')} />
          <FormField label={t('reminders_notesLabel')} value={notes} onChangeText={setNotes} placeholder={t('kp_pk_notesPh')} multiline />

          {diffuse ? (
            <PillButton
              label={saving ? t('account_saving') : t('personal_saveChanges')}
              variant="ink"
              onPress={handleSave}
              disabled={saving || !canSave}
              leading={<Ionicons name="checkmark-circle" size={18} color={colors.bg} />}
              style={{ marginTop: 8 }}
            />
          ) : (
            <SheetFooterAction>
              <EyeAction label={saving ? t('account_saving') : t('personal_saveChanges')} onPress={handleSave} ink={colors.text} loading={saving} disabled={!canSave} sticker="pencil" fill={ACTION_TONES.yellow} size={64} />
            </SheetFooterAction>
          )}
        </View>
      </ScrollView>
    </LogSheet>
  )
}

// ─── Add Child Sheet ──────────────────────────────────────────────────────

function AddChildSheet({
  visible,
  onClose,
  onAdded,
}: {
  visible: boolean
  onClose: () => void
  onAdded: (child: ChildWithRole) => void
}) {
  const { colors, font, stickers, isDark, paper, hairline, diffuse, bw } = useKidsTheme()
  const { t } = useTranslation()
  const soft = getModeColorSoft('kids')

  const [photo, setPhoto] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [birthDate, setBirthDate] = useState<string | null>(null)
  const [sex, setSex] = useState('')
  const [bloodType, setBloodType] = useState('')
  const [countryCode, setCountryCode] = useState('US')
  const [countryQuery, setCountryQuery] = useState('United States')
  const [countryDropdownOpen, setCountryDropdownOpen] = useState(false)
  const [allergies, setAllergies] = useState<string[]>([])
  const [medications, setMedications] = useState<string[]>([])
  const [conditions, setConditions] = useState<string[]>([])
  const [dietaryRestrictions, setDietaryRestrictions] = useState<string[]>([])
  const [preferredFoods, setPreferredFoods] = useState<string[]>([])
  const [dislikedFoods, setDislikedFoods] = useState<string[]>([])

  const [pedName, setPedName] = useState('')
  const [pedPhone, setPedPhone] = useState('')
  const [pedClinic, setPedClinic] = useState('')
  const [notes, setNotes] = useState('')
  const [dateModalOpen, setDateModalOpen] = useState(false)
  const [dateDraft, setDateDraft] = useState<Date>(new Date())
  const [saving, setSaving] = useState(false)

  function splitList(s: string): string[] {
    return [...new Set(s ? s.split(',').map((a) => a.trim()).filter(Boolean) : [])]
  }

  function reset() {
    setPhoto(null)
    setName(''); setBirthDate(null); setSex(''); setBloodType('')
    setCountryCode('US'); setCountryQuery('United States'); setCountryDropdownOpen(false)
    setAllergies([]); setMedications([]); setConditions([])
    setDietaryRestrictions([]); setPreferredFoods([]); setDislikedFoods([])
    setPedName(''); setPedPhone(''); setPedClinic(''); setNotes('')
    setDateDraft(new Date())
  }

  const canSave = name.trim().length > 0 && sex.length > 0 && !!birthDate

  async function handleSave() {
    if (!name.trim()) return Alert.alert(t('auth_missingInfo'), t('kp_pk_nameRequired'))
    if (!sex) return Alert.alert(t('auth_missingInfo'), t('kp_pk_selectSex'))
    if (!birthDate) return Alert.alert(t('auth_missingInfo'), t('kp_pk_setBirthDate'))
    setSaving(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error(tNow('kp_pk_notAuth'))

      const pediatrician = pedName.trim() ? { name: pedName.trim(), phone: pedPhone.trim(), clinic: pedClinic.trim() } : null

      const { data, error } = await supabase.from('children').insert({
        parent_id: session.user.id,
        name: name.trim(),
        birth_date: birthDate,
        sex: sex || null,
        blood_type: bloodType || null,
        allergies,
        medications,
        conditions,
        dietary_restrictions: dietaryRestrictions,
        preferred_foods: preferredFoods,
        disliked_foods: dislikedFoods,
        pediatrician,
        notes: notes.trim() || null,
        country_code: countryCode,
        photo_url: photoToStoreAtInsert(photo),
      }).select().single()

      if (error) throw error

      // The parent's own child_caregivers link is what loads this child on the next launch (the
      // parent_id fallback only runs when the user has no links at all). Onboarding writes it;
      // this sheet didn't, so a second child vanished after a restart. No link → roll back.
      const { error: linkError } = await supabase.from('child_caregivers').insert({
        child_id: data.id,
        user_id: session.user.id,
        email: session.user.email,
        role: 'parent',
        status: 'accepted',
        permissions: { view: true, log_activity: true, chat: true, edit_child: true, emergency: true },
        invited_by: session.user.id,
        accepted_at: new Date().toISOString(),
      })
      if (linkError) {
        await supabase.from('children').delete().eq('id', data.id)
        throw linkError
      }

      let newChild = mapDbChild(data)
      // A freshly-picked local photo uploads now that we have the child id,
      // then we persist the returned storage path.
      if (isLocalPhotoUri(photo)) {
        const path = await uploadChildPhoto(newChild.id, photo as string)
        if (path) {
          await supabase.from('children').update({ photo_url: path }).eq('id', newChild.id)
          newChild = { ...newChild, photoUrl: path }
        }
      }
      reset()
      onAdded(newChild)
    } catch (e: any) {
      Alert.alert(t('common_error'), t('error_generic'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <LogSheet visible={visible} title={t('kp_pk_addChild')} onClose={() => { reset(); onClose() }} sticker="baby">
      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={formStyles.form}>
          <AvatarField
            value={photo}
            onChange={setPhoto}
            accent={stickers.blue}
            initial={(name.trim()[0] ?? '?').toUpperCase()}
          />
          <SectionHeader label={t('kp_pk_basicInfo')} />
          <FormField label={t('kp_pk_nameLabel')} value={name} onChangeText={setName} placeholder={t('kp_pk_childName')} />

          <View style={{ marginTop: 4 }}><MonoCaps color={colors.textMuted}>{t('profKids_labelSex')}</MonoCaps></View>
          <View style={formStyles.optionRow}>
            {!diffuse ? SEX_OPTIONS.map((opt) => (
              <SiteChoice key={opt.value} compact label={t(opt.labelKey)} selected={sex === opt.value} tone={soft}
                onPress={() => setSex(sex === opt.value ? '' : opt.value)} />
            )) : SEX_OPTIONS.map((opt) => (
              <Pressable
                key={opt.value}
                onPress={() => setSex(sex === opt.value ? '' : opt.value)}
                style={[
                  formStyles.optionBtn,
                  {
                    backgroundColor: sex === opt.value ? colors.text : paper,
                    borderColor: sex === opt.value ? colors.text : hairline,
                  },
                ]}
              >
                <Text style={[formStyles.optionText, { color: sex === opt.value ? colors.bg : colors.text, fontFamily: font.bodyMedium }]}>{t(opt.labelKey)}</Text>
              </Pressable>
            ))}
          </View>

          <View style={{ marginTop: 4 }}><MonoCaps color={colors.textMuted}>{t('profKids_labelBirthDate')}</MonoCaps></View>
          <Pressable
            onPress={() => {
              setDateDraft(birthDate ? new Date(birthDate) : new Date())
              setDateModalOpen(true)
            }}
            style={[
              formStyles.dateBtn,
              {
                backgroundColor: colors.surface,
                borderColor: diffuse ? colors.border : colors.text,
                borderWidth: bw,
              },
              !diffuse && { borderRadius: 16 },
            ]}
          >
            <Text style={[formStyles.dateText, { color: birthDate ? colors.text : colors.textMuted, fontFamily: font.body }, !diffuse && { fontSize: 16 }]}>
              {birthDate
                ? `${parseLocalDate(birthDate).toLocaleDateString(dateLoc(), { month: 'long', day: 'numeric', year: 'numeric' })}  ·  ${formatAge(birthDate)}`
                : t('kp_pk_selectDate')}
            </Text>
          </Pressable>
          <StickerDateModal
            visible={dateModalOpen}
            title={t('kp_pk_birthDateTitle')}
            value={dateDraft}
            onChange={setDateDraft}
            onClose={() => setDateModalOpen(false)}
            onSave={() => {
              setBirthDate(toDateStr(dateDraft))
              setDateModalOpen(false)
            }}
            maximumDate={new Date()}
            minimumDate={new Date(new Date().getFullYear() - 25, 0, 1)}
          />

          <View style={{ marginTop: 4 }}><MonoCaps color={colors.textMuted}>{t('children_bloodType')}</MonoCaps></View>
          <View style={formStyles.optionRow}>
            {!diffuse ? BLOOD_TYPES.map((bt) => (
              <SiteChoice key={bt} compact tick={false} label={bt} selected={bloodType === bt} tone={stickers.pinkSoft}
                onPress={() => setBloodType(bloodType === bt ? '' : bt)} />
            )) : BLOOD_TYPES.map((bt) => (
              <Pressable
                key={bt}
                onPress={() => setBloodType(bloodType === bt ? '' : bt)}
                style={[
                  formStyles.bloodBtn,
                  {
                    backgroundColor: bloodType === bt ? stickers.coral + (isDark ? '32' : '28') : paper,
                    borderColor: bloodType === bt ? stickers.coral : hairline,
                  },
                ]}
              >
                <Text style={[formStyles.bloodText, { color: bloodType === bt ? stickers.coral : colors.text, fontFamily: font.bodySemiBold }]}>{bt}</Text>
              </Pressable>
            ))}
          </View>

          <View style={{ marginTop: 8 }}><MonoCaps color={colors.textMuted}>{t('profKids_labelCountryVaccine')}</MonoCaps></View>
          <View>
            <View
              style={[
                formStyles.inputRow,
                {
                  backgroundColor: paper,
                  borderColor: countryDropdownOpen ? colors.text : hairline,
                  borderWidth: bw,
                },
                !diffuse && { borderRadius: 16 },
              ]}
            >
              <Search size={16} color={colors.textMuted} strokeWidth={2} />
              <TextInput
                value={countryQuery}
                onChangeText={(txt) => { setCountryQuery(txt); setCountryDropdownOpen(true) }}
                onFocus={() => setCountryDropdownOpen(true)}
                placeholder={t('kp_pk_searchCountry')}
                placeholderTextColor={colors.textMuted}
                style={[formStyles.inputInner, { color: colors.text, fontFamily: font.body }, !diffuse && { fontSize: 16 }]}
              />
              {countryCode && (
                <Text style={{ fontSize: 13, color: colors.text, fontFamily: font.bodySemiBold }}>
                  {countryByCode(countryCode)?.code}
                </Text>
              )}
            </View>
            {countryDropdownOpen && (() => {
              const matches = searchCountries(countryQuery)
              if (matches.length === 0) return null
              return (
                <ScrollView
                  keyboardShouldPersistTaps="handled"
                  nestedScrollEnabled
                  style={[
                    formStyles.dropdown,
                    {
                      backgroundColor: paper,
                      borderColor: hairline,
                      borderWidth: bw,
                    },
                    !diffuse && { borderRadius: 16 },
                  ]}
                >
                  {matches.map((c) => (
                    <Pressable
                      key={c.code}
                      onPress={() => {
                        setCountryCode(c.code)
                        setCountryQuery(c.name)
                        setCountryDropdownOpen(false)
                      }}
                      style={[formStyles.dropdownItem, { backgroundColor: c.code === countryCode ? (diffuse ? colors.surfaceRaised : soft) : 'transparent' }]}
                    >
                      <Text style={[formStyles.dropdownText, { color: colors.text, fontFamily: c.code === countryCode ? font.bodySemiBold : font.body }]}>
                        {c.name}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              )
            })()}
          </View>

          <SectionHeader label={t('kp_pk_healthMedical')} />
          <ChipInput label={t('children_allergies')} value={allergies} onChange={setAllergies} suggestions={COMMON_CHILD_ALLERGIES} chipColor={brand.error} softColor={stickers.pinkSoft} placeholder={t('kp_pk_searchAllergies')} />
          <ChipInput label={t('kids_home_health_medications')} value={medications} onChange={setMedications} suggestions={COMMON_MEDICATIONS} chipColor={brand.secondary} softColor={stickers.blueSoft} placeholder={t('kp_pk_searchMeds')} />
          <ChipInput label={t('kp_pk_conditions')} value={conditions} onChange={setConditions} suggestions={[]} chipColor={colors.textSecondary} softColor={stickers.peachSoft} placeholder={t('kp_pk_conditionsPh')} />

          <SectionHeader label={t('kp_pk_foodPrefs')} />
          <ChipInput label={t('kp_pk_preferredFoods')} value={preferredFoods} onChange={setPreferredFoods} suggestions={[]} chipColor={brand.success} softColor={stickers.greenSoft} placeholder={t('kp_pk_preferredPh')} />
          <ChipInput label={t('kp_pk_dislikedFoods')} value={dislikedFoods} onChange={setDislikedFoods} suggestions={[]} chipColor={brand.warning} softColor={stickers.yellowSoft} placeholder={t('kp_pk_dislikedPh')} />
          <ChipInput label={t('kp_pk_dietary')} value={dietaryRestrictions} onChange={setDietaryRestrictions} suggestions={[]} chipColor={brand.accent} softColor={stickers.lilacSoft} placeholder={t('kp_pk_dietaryPh')} />

          <SectionHeader label={t('children_pediatrician')} />
          <FormField label={t('kp_pk_doctorName')} value={pedName} onChangeText={setPedName} placeholder={t('kp_pk_pedNamePh')} />
          <FormField label={t('emergencyInsurance_fieldPhone')} value={pedPhone} onChangeText={setPedPhone} placeholder={t('kp_pk_phonePh')} keyboardType="phone-pad" />
          <FormField label={t('kp_pk_clinic')} value={pedClinic} onChangeText={setPedClinic} placeholder={t('kp_pk_clinicPh')} />

          <SectionHeader label={t('kp_pk_additionalNotes')} />
          <FormField label={t('reminders_notesLabel')} value={notes} onChangeText={setNotes} placeholder={t('kp_pk_notesPh')} multiline />

          {diffuse ? (
            <PillButton
              label={saving ? t('kp_pk_adding') : t('children_addChild')}
              variant="ink"
              onPress={handleSave}
              disabled={saving || !canSave}
              leading={<Ionicons name="add" size={18} color={colors.bg} />}
              style={{ marginTop: 8 }}
            />
          ) : (
            <SheetFooterAction>
              <EyeAction label={saving ? t('kp_pk_adding') : t('children_addChild')} onPress={handleSave} ink={colors.text} loading={saving} disabled={!canSave} sticker="baby" fill={ACTION_TONES.yellow} size={64} />
            </SheetFooterAction>
          )}
        </View>
      </ScrollView>
    </LogSheet>
  )
}

// ─── Section Header ───────────────────────────────────────────────────────

function SectionHeader({ label }: { label: string }) {
  const { colors } = useKidsTheme()
  return (
    <View style={formStyles.sectionHeader}>
      <View style={[formStyles.sectionLine, { backgroundColor: colors.borderLight }]} />
      <MonoCaps color={colors.textMuted}>{label}</MonoCaps>
      <View style={[formStyles.sectionLine, { backgroundColor: colors.borderLight }]} />
    </View>
  )
}

// ─── Form Field ───────────────────────────────────────────────────────────

function FormField({ label, value, onChangeText, placeholder, multiline, hint, keyboardType }: {
  label: string; value: string; onChangeText: (t: string) => void; placeholder: string; multiline?: boolean; hint?: string; keyboardType?: any
}) {
  const { colors, font, paper, hairline, diffuse, bw } = useKidsTheme()
  const border = hairline
  return (
    <View style={formStyles.field}>
      <MonoCaps color={colors.textMuted}>{label}</MonoCaps>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        multiline={multiline}
        keyboardType={keyboardType}
        style={[
          formStyles.input,
          { color: colors.text, backgroundColor: paper, borderColor: border, fontFamily: font.body, borderWidth: bw },
          !diffuse && { borderRadius: 16, fontSize: 16 },
          multiline && { height: 96, textAlignVertical: 'top', paddingTop: 14 },
        ]}
      />
      {hint && <Text style={[formStyles.hint, { color: colors.textMuted, fontFamily: font.body }]}>{hint}</Text>}
    </View>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1 },
  headerWrap: { paddingHorizontal: 16, paddingBottom: 6 },
  siteHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingBottom: 8 },
  siteTitle: { flex: 1, fontSize: 26, textTransform: 'uppercase', letterSpacing: 0.3 },
  headerAddBtn: {
    width: 38,
    height: 38,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: { paddingHorizontal: 20, paddingBottom: 40, gap: 14 },

  emptyCard: {
    alignItems: 'center',
    padding: 32,
    gap: 14,
    borderRadius: 28,
    shadowColor: '#141313',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 2,
  },

  emptyCardSite: { shadowOpacity: 0, elevation: 0, padding: 24 },

  childCard: {
    padding: 16,
    gap: 10,
    borderRadius: 28,
    borderWidth: 1,
    shadowColor: '#141313',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
  },
  childHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  childAvatar: {
    width: 48,
    height: 48,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  childInfo: { flex: 1, gap: 2 },
  childName: { fontSize: 18, letterSpacing: -0.2 },
  childAge: { fontSize: 13 },
  sexBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 },
  sexBadgeText: { fontSize: 10 },
  cardActions: { flexDirection: 'row', alignItems: 'center', gap: 14 },

  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  miniChip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  miniChipText: { fontSize: 11 },

  foodLine: { fontSize: 13 },
  pedRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  pedText: { fontSize: 12, flex: 1 },
})

const formStyles = StyleSheet.create({
  form: { gap: 12, paddingBottom: 12 },
  field: { gap: 6 },
  hint: { fontSize: 11, marginTop: 2 },
  input: { borderWidth: 1, borderRadius: 18, paddingHorizontal: 16, height: 52, fontSize: 15 },
  dateBtn: { paddingVertical: 14, paddingHorizontal: 16, borderWidth: 1, borderRadius: 18 },
  dateText: { fontSize: 15 },

  optionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  optionBtn: { paddingVertical: 10, paddingHorizontal: 18, borderWidth: 1, borderRadius: 999 },
  optionText: { fontSize: 14 },
  bloodBtn: { paddingVertical: 8, paddingHorizontal: 14, borderWidth: 1, borderRadius: 999 },
  bloodText: { fontSize: 13 },

  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 2 },
  chipTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 5,
    paddingLeft: 12,
    paddingRight: 8,
    borderRadius: 999,
  },
  chipTagText: { fontSize: 12 },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 14,
    height: 48,
    gap: 8,
  },
  inputInner: { flex: 1, fontSize: 14, paddingVertical: 0 },
  dropdown: { borderWidth: 1, borderRadius: 18, marginTop: 4, overflow: 'hidden', maxHeight: 220 },
  dropdownItem: { paddingVertical: 12, paddingHorizontal: 14 },
  dropdownText: { fontSize: 14 },

  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 12 },
  sectionLine: { flex: 1, height: 1 },
})
