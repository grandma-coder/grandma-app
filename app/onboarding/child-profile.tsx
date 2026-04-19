/**
 * Child Profile (Apr 2026 redesign) — "About your little one."
 *
 * Cream canvas, Fraunces display + italic, paper card rows with
 * sticker icon + label + value, ink pill CTA, terms microcopy footer.
 */

import { useState } from 'react'
import {
  View,
  TextInput,
  Alert,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Pressable,
} from 'react-native'
import { router } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { supabase } from '../../lib/supabase'
import { useChildStore } from '../../store/useChildStore'
import { useJourneyStore } from '../../store/useJourneyStore'
import { useModeStore } from '../../store/useModeStore'
import { useTheme, stickers } from '../../constants/theme'
import DatePickerField from '../../components/ui/DatePickerField'
import { Display, DisplayItalic, MonoCaps, Body } from '../../components/ui/Typography'
import { PillButton } from '../../components/ui/PillButton'
import { ScreenHeader } from '../../components/ui/ScreenHeader'
import { Star, Heart, Drop, Leaf } from '../../components/ui/Stickers'

export default function ChildProfile() {
  const insets = useSafeAreaInsets()
  const { colors, font, isDark } = useTheme()
  const setChildren = useChildStore((s) => s.setChildren)
  const mode = useModeStore((s) => s.mode)
  const { babyName } = useJourneyStore()

  const [name, setName] = useState(babyName || '')
  const [birthDate, setBirthDate] = useState('')
  const [bloodType, setBloodType] = useState('')
  const [allergies, setAllergies] = useState('')
  const [loading, setLoading] = useState(false)

  const isPregnancy = mode === 'pregnancy' || mode === 'pre-pregnancy'

  const bg = isDark ? colors.bg : '#F3ECD9'
  const paper = isDark ? colors.surface : '#FFFEF8'
  const paperBorder = isDark ? colors.border : 'rgba(20,19,19,0.08)'
  const ink = isDark ? colors.text : '#141313'
  const ink3 = isDark ? colors.textMuted : '#6E6763'
  const ink4 = isDark ? colors.textFaint : '#A69E93'

  async function save() {
    if (!isPregnancy && !name.trim()) {
      Alert.alert('Required', "What's your little one's name?")
      return
    }

    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not signed in')

      await supabase
        .from('profiles')
        .upsert({ id: user.id, email: user.email }, { onConflict: 'id' })

      const childName = name.trim() || babyName || (isPregnancy ? 'Baby' : 'My child')

      const { data, error } = await supabase
        .from('children')
        .insert({
          parent_id: user.id,
          name: childName,
          birth_date: birthDate || null,
          blood_type: bloodType || null,
          allergies: allergies
            ? allergies.split(',').map((a) => a.trim()).filter(Boolean)
            : [],
        })
        .select()
        .single()

      if (error) throw error

      await supabase.from('child_caregivers').insert({
        child_id: data.id,
        user_id: user.id,
        email: user.email,
        role: 'parent',
        status: 'accepted',
        invited_by: user.id,
        accepted_at: new Date().toISOString(),
      })

      setChildren([{
        id: data.id,
        parentId: data.parent_id,
        name: data.name,
        birthDate: data.birth_date ?? '',
        weightKg: data.weight_kg ?? 0,
        heightCm: data.height_cm ?? 0,
        sex: data.sex ?? '',
        bloodType: data.blood_type ?? '',
        allergies: data.allergies ?? [],
        medications: data.medications ?? [],
        conditions: data.conditions ?? [],
        dietaryRestrictions: data.dietary_restrictions ?? [],
        preferredFoods: data.preferred_foods ?? [],
        dislikedFoods: data.disliked_foods ?? [],
        pediatrician: data.pediatrician ?? null,
        notes: data.notes ?? '',
        countryCode: data.country_code ?? 'US',
        caregiverRole: 'parent',
        permissions: { view: true, log_activity: true, chat: true },
      }])

      router.replace('/(tabs)')
    } catch (e: any) {
      Alert.alert('Error', e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <View style={[styles.root, { backgroundColor: bg }]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scroll,
            { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 120 },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <ScreenHeader
            title="4 / 10"
            right={
              <Pressable onPress={save} hitSlop={8}>
                <Body color={ink3} size={13}>Skip</Body>
              </Pressable>
            }
          />

          <View style={{ marginTop: 24 }}>
            <Display size={34} color={ink}>About</Display>
            <DisplayItalic size={34} color={ink}>
              {isPregnancy ? 'you both.' : 'your little one.'}
            </DisplayItalic>
          </View>

          <Body color={ink3} style={styles.subtitle}>
            {isPregnancy
              ? 'Just a few more details to personalize your experience.'
              : 'This helps Grandma give personalized advice.'}
          </Body>

          {!isPregnancy && (
            <Card
              sticker={<Star size={28} fill={isDark ? stickers.yellow : '#F5D652'} />}
              paper={paper}
              paperBorder={paperBorder}
              ink={ink}
              ink4={ink4}
              font={font}
              label="CHILD'S NAME"
              placeholder="Juno"
              value={name}
              onChangeText={setName}
            />
          )}

          {!isPregnancy && (
            <View style={[styles.dateCard, { backgroundColor: paper, borderColor: paperBorder }]}>
              <View style={styles.dateRow}>
                <View style={[styles.stickerCircle, { backgroundColor: isDark ? stickers.pinkSoft : '#F9D8E2' }]}>
                  <Heart size={26} fill={isDark ? stickers.pink : '#F2B2C7'} />
                </View>
                <View style={{ flex: 1 }}>
                  <MonoCaps color={ink4} style={{ marginBottom: 2 }}>DATE OF BIRTH</MonoCaps>
                  <DatePickerField
                    label=""
                    value={birthDate}
                    onChange={setBirthDate}
                    placeholder="Tap to select"
                    maximumDate={new Date()}
                  />
                </View>
              </View>
            </View>
          )}

          <Card
            sticker={<Drop size={26} fill={isDark ? stickers.pink : '#F2B2C7'} />}
            stickerBg={isDark ? stickers.pinkSoft : '#F9D8E2'}
            paper={paper}
            paperBorder={paperBorder}
            ink={ink}
            ink4={ink4}
            font={font}
            label="BLOOD TYPE"
            placeholder="O+"
            value={bloodType}
            onChangeText={setBloodType}
          />

          <Card
            sticker={<Leaf size={26} fill={isDark ? stickers.green : '#BDD48C'} />}
            stickerBg={isDark ? stickers.greenSoft : '#DDE7BB'}
            paper={paper}
            paperBorder={paperBorder}
            ink={ink}
            ink4={ink4}
            font={font}
            label="ALLERGIES"
            placeholder="None known"
            value={allergies}
            onChangeText={setAllergies}
          />

          <Body size={12} color={ink4} align="center" style={styles.terms}>
            By continuing, you agree to Grandma's{' '}
            <Body size={12} color={ink3} style={{ textDecorationLine: 'underline' }}>Terms of Serenity</Body>
            {' '}and{' '}
            <Body size={12} color={ink3} style={{ textDecorationLine: 'underline' }}>Privacy Policy</Body>.
          </Body>
        </ScrollView>

        <View style={[styles.bottom, { paddingBottom: insets.bottom + 16, backgroundColor: bg }]}>
          <PillButton
            label="Begin my journey →"
            onPress={save}
            variant="ink"
            loading={loading}
          />
        </View>
      </KeyboardAvoidingView>
    </View>
  )
}

function Card({
  sticker,
  stickerBg,
  paper,
  paperBorder,
  ink,
  ink4,
  font,
  label,
  placeholder,
  value,
  onChangeText,
}: {
  sticker: React.ReactNode
  stickerBg?: string
  paper: string
  paperBorder: string
  ink: string
  ink4: string
  font: any
  label: string
  placeholder: string
  value: string
  onChangeText: (t: string) => void
}) {
  return (
    <View style={[styles.card, { backgroundColor: paper, borderColor: paperBorder }]}>
      <View style={[styles.stickerCircle, { backgroundColor: stickerBg ?? '#FBEA9E' }]}>
        {sticker}
      </View>
      <View style={{ flex: 1 }}>
        <MonoCaps color={ink4} style={{ marginBottom: 2 }}>{label}</MonoCaps>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={ink4}
          selectionColor={ink}
          style={[styles.cardInput, { fontFamily: font.display, color: ink }]}
        />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingHorizontal: 24 },

  subtitle: {
    marginTop: 10,
    marginBottom: 22,
    maxWidth: 320,
    lineHeight: 22,
  },

  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 20,
    borderWidth: 1,
    padding: 12,
    marginBottom: 10,
  },
  dateCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 12,
    marginBottom: 10,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  stickerCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardInput: {
    fontSize: 18,
    letterSpacing: -0.2,
    paddingVertical: 0,
  },

  terms: {
    marginTop: 20,
    lineHeight: 18,
    paddingHorizontal: 16,
  },

  bottom: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 24,
    paddingTop: 12,
  },
})
