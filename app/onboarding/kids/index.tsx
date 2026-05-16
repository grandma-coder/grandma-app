/**
 * B4 — Kids Onboarding Flow
 *
 * Dynamic stepper: child count → per-child loop → partner → caregiver → done.
 * Uses OnboardingStep wrapper for consistent UI.
 * Saves children to Supabase children table + care_circle entries.
 */

import { useState, useCallback } from 'react'
import {
  View,
  Text,
  TextInput,
  Pressable,
  Image,
  StyleSheet,
  Platform,
  ScrollView,
  KeyboardAvoidingView,
  Alert,
} from 'react-native'
import DatePickerField from '../../../components/ui/DatePickerField'
import * as ImagePicker from 'expo-image-picker'
import { router } from 'expo-router'
import { Star, Camera, User, Plus, Minus, Check } from 'lucide-react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { OnboardingStep, OnboardingNavProvider } from '../../../components/onboarding/OnboardingStep'
import { useTheme, brand } from '../../../constants/theme'
import { AvatarView, AvatarPickerModal, isIconAvatar } from '../../../components/ui/AvatarPicker'
import {
  useKidsOnboardingStore,
  type CaregiverRole,
} from '../../../store/useKidsOnboardingStore'
import { useChildStore } from '../../../store/useChildStore'
import { useJourneyStore } from '../../../store/useJourneyStore'
import { useBehaviorStore } from '../../../store/useBehaviorStore'
import { useOnboardingComplete } from '../../../hooks/useOnboardingComplete'
import { supabase } from '../../../lib/supabase'
import type { ChildWithRole } from '../../../types'

// ─── Step types ────────────────────────────────────────────────────────────

type StepId =
  | 'child_count'
  | 'child_name'
  | 'child_dob'
  | 'child_country'
  | 'child_photo'
  | 'child_allergies'
  | 'child_conditions'
  | 'partner'
  | 'caregiver'
  | 'complete'

function buildSteps(childCount: number): StepId[] {
  const steps: StepId[] = ['child_count']
  for (let i = 0; i < childCount; i++) {
    steps.push('child_name', 'child_dob', 'child_country', 'child_photo', 'child_allergies', 'child_conditions')
  }
  steps.push('partner', 'caregiver', 'complete')
  return steps
}

/** Given a flat step index, figure out which child index we're on (0-based) */
function childIndexForStep(stepIndex: number, childCount: number): number {
  // Steps per child = 6 (name, dob, country, photo, allergies, conditions), first step is child_count
  if (stepIndex <= 0) return 0
  return Math.floor((stepIndex - 1) / 6)
}

// ─── Common allergy options ────────────────────────────────────────────────

const ALLERGY_OPTIONS = [
  'Milk', 'Eggs', 'Peanuts', 'Tree nuts', 'Soy',
  'Wheat', 'Fish', 'Shellfish', 'Sesame', 'Other',
]

const CAREGIVER_ROLES: { id: CaregiverRole; label: string }[] = [
  { id: 'partner', label: 'Partner' },
  { id: 'nanny', label: 'Nanny' },
  { id: 'family', label: 'Family member' },
  { id: 'doctor', label: 'Doctor' },
]

// ─── Main Component ────────────────────────────────────────────────────────

export default function KidsOnboarding() {
  const store = useKidsOnboardingStore()
  const setChildrenStore = useChildStore((s) => s.setChildren)
  const { handleComplete: onboardingComplete } = useOnboardingComplete()

  const [currentIndex, setCurrentIndex] = useState(0)

  const steps = buildSteps(store.childCount)
  const currentStep = steps[currentIndex]
  const childIdx = childIndexForStep(currentIndex, store.childCount)

  // Total visible steps = child_count(1) + perChild(6)*N + partner(1) + caregiver(1)
  const totalSteps = 1 + store.childCount * 6 + 2

  const goNext = useCallback(() => {
    if (currentIndex < steps.length - 1) {
      setCurrentIndex((i) => i + 1)
    }
  }, [currentIndex, steps.length])

  const goSkip = useCallback(() => goNext(), [goNext])

  const goBack = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex((i) => i - 1)
    }
  }, [currentIndex])

  const handleClose = useCallback(() => {
    store.clearAll()
    router.back()
  }, [])

  // ─── Save to Supabase ──────────────────────────────────────────────────

  async function saveAndFinish(): Promise<void> {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return onboardingComplete('kids')

      const userId = session.user.id
      const parentName = useJourneyStore.getState().parentName ?? null

      // Profile: persist journey mode + parent name so cold restarts don't
      // reset the user to the default mode.
      const profilePayload: Record<string, unknown> = {
        id: userId,
        journey_mode: 'kids',
      }
      if (parentName) profilePayload.name = parentName
      const { error: profileErr } = await supabase
        .from('profiles')
        .upsert(profilePayload, { onConflict: 'id' })
      if (profileErr) console.warn('[onboarding] profile upsert failed:', profileErr.message)

      // Behavior row
      useBehaviorStore.getState().enroll('kids')
      const { error: behaviorErr } = await supabase.from('behaviors').upsert(
        {
          user_id: userId,
          type: 'kids',
          active: true,
        },
        { onConflict: 'user_id,type' }
      )
      if (behaviorErr) console.warn('[onboarding] behaviors upsert failed:', behaviorErr.message)

      // Insert children
      // Upload any local-file photo URIs to Storage so they survive a cold
      // relaunch. Icon-avatar values (key strings) pass through unchanged.
      async function resolvePhotoForUpload(photoUri: string | null | undefined): Promise<string | null> {
        if (!photoUri) return null
        if (isIconAvatar(photoUri)) return photoUri
        if (!photoUri.startsWith('file:') && !photoUri.startsWith('content:')) return photoUri
        try {
          const ext = (photoUri.split('.').pop()?.split('?')[0] ?? 'jpg').toLowerCase()
          const path = `child-photos/${userId}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`
          const res = await fetch(photoUri)
          const buf = await res.arrayBuffer()
          const { error: upErr } = await supabase.storage
            .from('garage-photos')
            .upload(path, buf, { contentType: `image/${ext === 'jpg' ? 'jpeg' : ext}`, upsert: true })
          if (upErr) {
            console.warn('[onboarding] child photo upload failed:', upErr.message)
            return null
          }
          const { data } = supabase.storage.from('garage-photos').getPublicUrl(path)
          return data.publicUrl
        } catch (e) {
          console.warn('[onboarding] child photo upload exception:', e)
          return null
        }
      }

      const resolvedPhotos = await Promise.all(
        store.children.map((c) => resolvePhotoForUpload(c.photoUri))
      )

      const childrenToInsert = store.children.map((c, i) => ({
        parent_id: userId,
        name: c.name,
        birth_date: c.birthDate || null,
        allergies: c.allergies,
        conditions: c.conditionsText ? [c.conditionsText] : [],
        country_code: c.countryCode || 'US',
        photo_url: resolvedPhotos[i],
      }))

      const { data: insertedChildren, error: insertError } = await supabase
        .from('children')
        .insert(childrenToInsert)
        .select('id, name, birth_date, parent_id, allergies, conditions, country_code, photo_url, sex, blood_type, medications, dietary_restrictions, preferred_foods, disliked_foods, pediatrician, notes')

      if (insertError) {
        Alert.alert(
          'Could not save your kids',
          insertError.message || 'Please check your connection and try again.',
        )
        // eslint-disable-next-line no-console
        console.error('children insert failed:', insertError.message)
        return
      }

      // Even on a successful insert, the .select() can come back empty
      // when the children RLS read policy requires a child_caregivers
      // join (chicken-and-egg: we haven't inserted those rows yet).
      // Refetch by parent_id as a backup if the initial select is empty.
      let resolvedChildren = insertedChildren as any[] | null
      if (!resolvedChildren || resolvedChildren.length === 0) {
        const { data: refetched } = await supabase
          .from('children')
          .select('id, name, birth_date, parent_id, allergies, conditions, country_code, photo_url, sex, blood_type, medications, dietary_restrictions, preferred_foods, disliked_foods, pediatrician, notes')
          .eq('parent_id', userId)
        resolvedChildren = refetched ?? []
      }

      if (resolvedChildren && resolvedChildren.length > 0) {
        const childIds = resolvedChildren.map((c: any) => c.id)
        const userEmail = session.user.email ?? ''

        // Create child_caregivers entries so root layout can load children
        const caregiverLinks = resolvedChildren.map((c: any) => ({
          child_id: c.id,
          user_id: userId,
          email: userEmail,
          role: 'parent' as const,
          status: 'accepted' as const,
          permissions: { view: true, log_activity: true, chat: true, edit_child: true, emergency: true },
          invited_by: userId,
          accepted_at: new Date().toISOString(),
        }))
        // Insert into child_caregivers so root layout can load children on next open.
        // This link is REQUIRED for the user to see their own kids after relaunch —
        // children RLS reads via the caregiver join. If the insert fails we surface
        // it instead of moving on silently with broken state, but we attempt one
        // immediate retry first (transient network failure is the common case).
        let ccError: { message: string } | null = null
        for (let attempt = 0; attempt < 2; attempt++) {
          const { error } = await supabase.from('child_caregivers').insert(caregiverLinks)
          if (!error) { ccError = null; break }
          ccError = error
        }
        if (ccError) {
          Alert.alert(
            'Setup didn\'t fully complete',
            'We saved your child profile but couldn\'t set up access. Please reopen the app, or contact support if your children don\'t appear on the home screen.',
          )
          // eslint-disable-next-line no-console
          console.error('child_caregivers insert failed after retry:', ccError.message)
        }

        // Create care_circle entry for the parent (self)
        const { error: circleError } = await supabase.from('care_circle').insert({
          owner_id: userId,
          member_user_id: userId,
          role: 'partner',
          permissions: ['view', 'log_activity', 'chat', 'edit_child', 'emergency'],
          children_access: childIds,
          status: 'accepted',
        })
        if (circleError) {
          // care_circle is less critical (caregiver invites use a different
          // path) but still worth surfacing if it fails.
          // eslint-disable-next-line no-console
          console.warn('care_circle insert:', circleError.message)
        }

        // Partner entry — pending invite slot, name only (no email yet).
        if (store.partnerName) {
          await supabase.from('care_circle').insert({
            owner_id: userId,
            role: 'partner',
            permissions: ['view', 'log_activity', 'chat', 'edit_child', 'emergency'],
            children_access: childIds,
            status: 'pending',
            invite_email: null,
            invite_name: store.partnerName,
          })
        }

        // Caregiver entry if provided.
        if (store.caregiverName && store.caregiverRole) {
          await supabase.from('care_circle').insert({
            owner_id: userId,
            role: store.caregiverRole,
            permissions: ['view', 'log_activity'],
            children_access: childIds,
            status: 'pending',
            invite_email: null,
            invite_name: store.caregiverName,
          })
        }

        // Set children in the app store for immediate use.
        // parent_id is the canonical column on the children table; the
        // ?? c.user_id fallback referenced a non-existent column and
        // would have resolved to undefined for rows without parent_id.
        // Falling back to userId (the current auth user) instead.
        const mapped: ChildWithRole[] = resolvedChildren.map((c: any) => ({
          id: c.id,
          parentId: c.parent_id ?? userId,
          name: c.name,
          birthDate: c.birth_date ?? c.dob ?? '',
          weightKg: 0,
          heightCm: 0,
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
          countryCode: c.country_code ?? 'US',
          photoUrl: c.photo_url ?? null,
          caregiverRole: 'parent' as const,
          permissions: { view: true, log_activity: true, chat: true },
        }))
        setChildrenStore(mapped)
      }
      // Reached only when all required writes succeeded.
      store.clearAll()
      onboardingComplete('kids')
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      console.warn('Failed to save kids onboarding:', msg)
      Alert.alert(
        "Couldn't finish setup",
        `${msg}\n\nPlease check your connection and try again. Your answers are still here.`
      )
      // Do NOT clear the draft or navigate — let the user retry.
    }
  }

  // ─── Render ──────────────────────────────────────────────────────────────

  if (currentStep === 'complete') {
    return <CompletionScreen children={store.children} onFinish={saveAndFinish} />
  }

  const stepNum = currentIndex + 1

  return (
    <OnboardingNavProvider onBack={currentIndex > 0 ? goBack : undefined} onClose={handleClose}>
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {currentStep === 'child_count' && (
        <StepChildCount step={stepNum} total={totalSteps} onContinue={goNext} />
      )}
      {currentStep === 'child_name' && (
        <StepChildName
          step={stepNum}
          total={totalSteps}
          childIdx={childIdx}
          childCount={store.childCount}
          onContinue={goNext}
        />
      )}
      {currentStep === 'child_dob' && (
        <StepChildDob
          step={stepNum}
          total={totalSteps}
          childIdx={childIdx}
          onContinue={goNext}
        />
      )}
      {currentStep === 'child_country' && (
        <StepChildCountry
          step={stepNum}
          total={totalSteps}
          childIdx={childIdx}
          onContinue={goNext}
        />
      )}
      {currentStep === 'child_photo' && (
        <StepChildPhoto
          step={stepNum}
          total={totalSteps}
          childIdx={childIdx}
          onContinue={goNext}
          onSkip={goSkip}
        />
      )}
      {currentStep === 'child_allergies' && (
        <StepChildAllergies
          step={stepNum}
          total={totalSteps}
          childIdx={childIdx}
          onContinue={goNext}
          onSkip={goSkip}
        />
      )}
      {currentStep === 'child_conditions' && (
        <StepChildConditions
          step={stepNum}
          total={totalSteps}
          childIdx={childIdx}
          onContinue={goNext}
          onSkip={goSkip}
        />
      )}
      {currentStep === 'partner' && (
        <StepPartner step={stepNum} total={totalSteps} onContinue={goNext} onSkip={goSkip} />
      )}
      {currentStep === 'caregiver' && (
        <StepCaregiver step={stepNum} total={totalSteps} onContinue={goNext} onSkip={goSkip} />
      )}
    </KeyboardAvoidingView>
    </OnboardingNavProvider>
  )
}

// ─── STEP: Child Count ─────────────────────────────────────────────────────

function StepChildCount({
  step,
  total,
  onContinue,
}: {
  step: number
  total: number
  onContinue: () => void
}) {
  const { colors, radius, isDark } = useTheme()
  const count = useKidsOnboardingStore((s) => s.childCount)
  const setCount = useKidsOnboardingStore((s) => s.setChildCount)

  return (
    <OnboardingStep
      step={step}
      total={total}
      question="How many children are you tracking?"
      onContinue={onContinue}
    >
      <View style={stepStyles.counterRow}>
        <Pressable
          onPress={() => setCount(count - 1)}
          disabled={count <= 1}
          style={[
            stepStyles.counterButton,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              borderRadius: radius.lg,
              opacity: count <= 1 ? 0.3 : 1,
            },
          ]}
        >
          <Minus size={24} color={colors.text} strokeWidth={2.5} />
        </Pressable>

        <View style={[stepStyles.counterDisplay, { backgroundColor: colors.primaryTint, borderRadius: radius.xl }]}>
          <Text style={[stepStyles.counterNumber, { color: colors.primary }]}>{count}</Text>
        </View>

        <Pressable
          onPress={() => setCount(count + 1)}
          disabled={count >= 6}
          style={[
            stepStyles.counterButton,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              borderRadius: radius.lg,
              opacity: count >= 6 ? 0.3 : 1,
            },
          ]}
        >
          <Plus size={24} color={colors.text} strokeWidth={2.5} />
        </Pressable>
      </View>
    </OnboardingStep>
  )
}

// ─── STEP: Child Name ──────────────────────────────────────────────────────

function StepChildName({
  step,
  total,
  childIdx,
  childCount,
  onContinue,
}: {
  step: number
  total: number
  childIdx: number
  childCount: number
  onContinue: () => void
}) {
  const { colors, radius, isDark } = useTheme()
  const child = useKidsOnboardingStore((s) => s.children[childIdx])
  const updateChild = useKidsOnboardingStore((s) => s.updateChild)

  const label = childCount > 1 ? `Child ${childIdx + 1} — ` : ''

  return (
    <OnboardingStep
      step={step}
      total={total}
      question={`${label}What is their name?`}
      onContinue={onContinue}
      continueDisabled={!child?.name.trim()}
    >
      <TextInput
        value={child?.name ?? ''}
        onChangeText={(name) => updateChild(childIdx, { name })}
        placeholder="First name"
        placeholderTextColor={colors.textMuted}
        autoCapitalize="words"
        autoFocus
        style={[
          stepStyles.textInput,
          {
            color: colors.text,
            backgroundColor: colors.surface,
            borderColor: colors.border,
            borderRadius: radius.lg,
          },
        ]}
      />
    </OnboardingStep>
  )
}

// ─── STEP: Child DOB ───────────────────────────────────────────────────────

function StepChildDob({
  step,
  total,
  childIdx,
  onContinue,
}: {
  step: number
  total: number
  childIdx: number
  onContinue: () => void
}) {
  const { colors, radius } = useTheme()
  const child = useKidsOnboardingStore((s) => s.children[childIdx])
  const updateChild = useKidsOnboardingStore((s) => s.updateChild)
  const childName = child?.name || `Child ${childIdx + 1}`

  // App targets ages 0–5; warn if older. Bound the picker minimum at 18y
  // to avoid the previous arbitrary 2005 cutoff that silently rejected
  // valid pre-2005 dates with no explanation.
  const minDate = new Date()
  minDate.setFullYear(minDate.getFullYear() - 18)
  const ageYears = child?.birthDate
    ? (Date.now() - new Date(child.birthDate + 'T00:00:00').getTime()) / (365.25 * 86_400_000)
    : null
  const tooOld = ageYears !== null && ageYears > 6

  return (
    <OnboardingStep
      step={step}
      total={total}
      question={`When was ${childName} born?`}
      onContinue={onContinue}
      continueDisabled={!child?.birthDate}
    >
      <View style={stepStyles.centered}>
        <DatePickerField
          label=""
          value={child?.birthDate || ''}
          onChange={(iso) => updateChild(childIdx, { birthDate: iso })}
          placeholder="Tap to select a date"
          modalTitle={`${childName}'s birth date`}
          maximumDate={new Date()}
          minimumDate={minDate}
        />

        {tooOld && (
          <View style={[stepStyles.ageBadge, { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, marginTop: 8 }]}>
            <Text style={[stepStyles.ageBadgeText, { color: colors.textMuted, fontWeight: '500' }]}>
              Grandma's tuned for ages 0–5, but you can still continue.
            </Text>
          </View>
        )}

        {child?.birthDate && (
          <View style={[stepStyles.ageBadge, { backgroundColor: colors.primaryTint, borderRadius: radius.lg }]}>
            <Text style={[stepStyles.ageBadgeText, { color: colors.primary }]}>
              {formatAge(child.birthDate)}
            </Text>
          </View>
        )}
      </View>
    </OnboardingStep>
  )
}

function formatAge(birthDate: string): string {
  const born = new Date(birthDate)
  const now = new Date()
  const months = (now.getFullYear() - born.getFullYear()) * 12 + (now.getMonth() - born.getMonth())
  if (months < 1) return 'Newborn'
  if (months < 12) return `${months} month${months === 1 ? '' : 's'} old`
  const years = Math.floor(months / 12)
  const rem = months % 12
  if (rem === 0) return `${years} year${years === 1 ? '' : 's'} old`
  return `${years}y ${rem}m old`
}

// ─── STEP: Child Country ──────────────────────────────────────────────────

const COUNTRY_OPTIONS: { code: string; flag: string; name: string }[] = [
  { code: 'US', flag: '🇺🇸', name: 'United States' },
  { code: 'BR', flag: '🇧🇷', name: 'Brazil' },
  { code: 'GB', flag: '🇬🇧', name: 'United Kingdom' },
  { code: 'AU', flag: '🇦🇺', name: 'Australia' },
  { code: 'CA', flag: '🇨🇦', name: 'Canada' },
  { code: 'PT', flag: '🇵🇹', name: 'Portugal' },
  { code: 'DE', flag: '🇩🇪', name: 'Germany' },
  { code: 'FR', flag: '🇫🇷', name: 'France' },
  { code: 'MX', flag: '🇲🇽', name: 'Mexico' },
  { code: 'AR', flag: '🇦🇷', name: 'Argentina' },
  { code: 'IN', flag: '🇮🇳', name: 'India' },
]

function StepChildCountry({
  step,
  total,
  childIdx,
  onContinue,
}: {
  step: number
  total: number
  childIdx: number
  onContinue: () => void
}) {
  const { colors, radius, isDark } = useTheme()
  const child = useKidsOnboardingStore((s) => s.children[childIdx])
  const updateChild = useKidsOnboardingStore((s) => s.updateChild)
  const childName = child?.name || `Child ${childIdx + 1}`
  const selected = child?.countryCode || 'US'

  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)

  const selectedCountry = COUNTRY_OPTIONS.find(c => c.code === selected)
  const filteredOptions = query.trim()
    ? COUNTRY_OPTIONS.filter(c => c.name.toLowerCase().includes(query.toLowerCase()) || c.code.toLowerCase().includes(query.toLowerCase()))
    : COUNTRY_OPTIONS

  return (
    <OnboardingStep
      step={step}
      total={total}
      question={`Where does ${childName} live?`}
      onContinue={onContinue}
    >
      <View>
        {/* Selected country display */}
        {selectedCountry && !open && (
          <Pressable
            onPress={() => { setOpen(true); setQuery('') }}
            style={[
              stepStyles.countryRow,
              { backgroundColor: colors.primaryTint, borderColor: colors.primary, borderRadius: radius.lg, marginBottom: 12 },
            ]}
          >
            <Text style={[stepStyles.countryName, { color: colors.primary, flex: 1 }]}>{selectedCountry.name}</Text>
            <Check size={16} color={colors.primary} strokeWidth={2.5} />
          </Pressable>
        )}

        {/* Search input */}
        <View style={[stepStyles.countrySearch, { backgroundColor: colors.surface, borderColor: open ? colors.primary : colors.border, borderRadius: radius.lg }]}>
          <TextInput
            value={query}
            onChangeText={(t) => { setQuery(t); setOpen(true) }}
            onFocus={() => setOpen(true)}
            placeholder="Search country..."
            placeholderTextColor={colors.textMuted ?? 'rgba(255,255,255,0.35)'}
            autoCapitalize="none"
            style={[stepStyles.countrySearchInput, { color: colors.text }]}
          />
        </View>

        {/* Dropdown list */}
        {open && (
          <View style={[stepStyles.countryDropdown, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg }]}>
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" style={{ maxHeight: 280 }}>
              {filteredOptions.map((c) => {
                const isSelected = selected === c.code
                return (
                  <Pressable
                    key={c.code}
                    onPress={() => {
                      updateChild(childIdx, { countryCode: c.code })
                      setQuery('')
                      setOpen(false)
                    }}
                    style={[
                      stepStyles.countryDropdownItem,
                      { backgroundColor: isSelected ? colors.primaryTint : 'transparent' },
                    ]}
                  >
                    <Text style={[stepStyles.countryName, { color: isSelected ? colors.primary : colors.text, flex: 1 }]}>
                      {c.name}
                    </Text>
                    {isSelected && <Check size={14} color={colors.primary} strokeWidth={2.5} />}
                  </Pressable>
                )
              })}
              {filteredOptions.length === 0 && (
                <Text style={[stepStyles.countryName, { color: colors.textMuted ?? 'rgba(255,255,255,0.35)', padding: 16 }]}>
                  No countries found
                </Text>
              )}
            </ScrollView>
          </View>
        )}
      </View>
    </OnboardingStep>
  )
}

// ─── STEP: Child Photo ─────────────────────────────────────────────────────

function StepChildPhoto({
  step,
  total,
  childIdx,
  onContinue,
  onSkip,
}: {
  step: number
  total: number
  childIdx: number
  onContinue: () => void
  onSkip: () => void
}) {
  const { colors, radius, isDark } = useTheme()
  const child = useKidsOnboardingStore((s) => s.children[childIdx])
  const updateChild = useKidsOnboardingStore((s) => s.updateChild)
  const childName = child?.name || `Child ${childIdx + 1}`
  const [pickerOpen, setPickerOpen] = useState(false)
  const childInitial = (childName[0] ?? 'K').toUpperCase()
  const childAccent = colors.primary

  async function pickImage() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    })
    if (!result.canceled && result.assets[0]) {
      updateChild(childIdx, { photoUri: result.assets[0].uri })
    }
  }

  return (
    <OnboardingStep
      step={step}
      total={total}
      question={`Pick a photo or icon for ${childName}`}
      onContinue={onContinue}
      onSkip={onSkip}
    >
      <View style={stepStyles.centered}>
        <Pressable onPress={() => setPickerOpen(true)}>
          {child?.photoUri ? (
            <AvatarView
              value={child.photoUri}
              size={160}
              accent={childAccent}
              initial={childInitial}
              borderColor={colors.text}
              borderWidth={3}
            />
          ) : (
            <View
              style={[
                stepStyles.photoPlaceholder,
                {
                  backgroundColor: colors.surfaceRaised,
                  borderColor: colors.border,
                  borderRadius: radius.xl,
                },
              ]}
            >
              <Camera size={36} color={colors.textMuted} strokeWidth={1.5} />
              <Text style={[stepStyles.photoHint, { color: colors.textMuted }]}>
                Tap to choose photo or icon
              </Text>
            </View>
          )}
        </Pressable>
        <AvatarPickerModal
          visible={pickerOpen}
          onClose={() => setPickerOpen(false)}
          onPickPhoto={pickImage}
          onPickIcon={(iconValue) => updateChild(childIdx, { photoUri: iconValue })}
          onRemove={child?.photoUri ? () => updateChild(childIdx, { photoUri: null as any }) : undefined}
        />
      </View>
    </OnboardingStep>
  )
}

// ─── STEP: Child Allergies ─────────────────────────────────────────────────

function StepChildAllergies({
  step,
  total,
  childIdx,
  onContinue,
  onSkip,
}: {
  step: number
  total: number
  childIdx: number
  onContinue: () => void
  onSkip: () => void
}) {
  const { colors, radius, isDark } = useTheme()
  const child = useKidsOnboardingStore((s) => s.children[childIdx])
  const toggleAllergy = useKidsOnboardingStore((s) => s.toggleAllergy)
  const childName = child?.name || `Child ${childIdx + 1}`

  return (
    <OnboardingStep
      step={step}
      total={total}
      question={`Any allergies for ${childName}?`}
      onContinue={onContinue}
      onSkip={onSkip}
    >
      <View style={stepStyles.chipGrid}>
        {ALLERGY_OPTIONS.map((allergy) => {
          const selected = child?.allergies.includes(allergy) ?? false
          return (
            <Pressable
              key={allergy}
              onPress={() => toggleAllergy(childIdx, allergy)}
              style={[
                stepStyles.allergyChip,
                {
                  backgroundColor: selected ? colors.primaryTint : colors.surface,
                  borderColor: selected ? colors.primary : colors.border,
                  borderRadius: radius.full,
                },
              ]}
            >
              {selected && <Check size={14} color={colors.primary} strokeWidth={3} />}
              <Text
                style={[
                  stepStyles.allergyChipText,
                  { color: selected ? colors.primary : colors.text },
                ]}
              >
                {allergy}
              </Text>
            </Pressable>
          )
        })}
      </View>
    </OnboardingStep>
  )
}

// ─── STEP: Child Conditions ────────────────────────────────────────────────

function StepChildConditions({
  step,
  total,
  childIdx,
  onContinue,
  onSkip,
}: {
  step: number
  total: number
  childIdx: number
  onContinue: () => void
  onSkip: () => void
}) {
  const { colors, radius, isDark } = useTheme()
  const child = useKidsOnboardingStore((s) => s.children[childIdx])
  const updateChild = useKidsOnboardingStore((s) => s.updateChild)
  const childName = child?.name || `Child ${childIdx + 1}`

  return (
    <OnboardingStep
      step={step}
      total={total}
      question={`Any conditions or medications for ${childName}?`}
      onContinue={onContinue}
      onSkip={onSkip}
    >
      <TextInput
        value={child?.conditionsText ?? ''}
        onChangeText={(text) => updateChild(childIdx, { conditionsText: text })}
        placeholder="e.g. Asthma, daily inhaler..."
        placeholderTextColor={colors.textMuted}
        multiline
        style={[
          stepStyles.textArea,
          {
            color: colors.text,
            backgroundColor: colors.surface,
            borderColor: colors.border,
            borderRadius: radius.lg,
          },
        ]}
      />
    </OnboardingStep>
  )
}

// ─── STEP: Partner ─────────────────────────────────────────────────────────

function StepPartner({
  step,
  total,
  onContinue,
  onSkip,
}: {
  step: number
  total: number
  onContinue: () => void
  onSkip: () => void
}) {
  const { colors, radius, isDark } = useTheme()
  const partner = useKidsOnboardingStore((s) => s.partnerName)
  const setPartner = useKidsOnboardingStore((s) => s.setPartnerName)

  return (
    <OnboardingStep
      step={step}
      total={total}
      question="Want to add your partner?"
      onContinue={onContinue}
      onSkip={onSkip}
    >
      <TextInput
        value={partner ?? ''}
        onChangeText={setPartner}
        placeholder="Partner's name"
        placeholderTextColor={colors.textMuted}
        autoCapitalize="words"
        style={[
          stepStyles.textInput,
          {
            color: colors.text,
            backgroundColor: colors.surface,
            borderColor: colors.border,
            borderRadius: radius.lg,
          },
        ]}
      />
      <Text style={[stepStyles.hint, { color: colors.textMuted }]}>
        They'll be able to log activities and see updates too.
      </Text>
    </OnboardingStep>
  )
}

// ─── STEP: Caregiver ───────────────────────────────────────────────────────

function StepCaregiver({
  step,
  total,
  onContinue,
  onSkip,
}: {
  step: number
  total: number
  onContinue: () => void
  onSkip: () => void
}) {
  const { colors, radius, isDark } = useTheme()
  const role = useKidsOnboardingStore((s) => s.caregiverRole)
  const name = useKidsOnboardingStore((s) => s.caregiverName)
  const setRole = useKidsOnboardingStore((s) => s.setCaregiverRole)
  const setName = useKidsOnboardingStore((s) => s.setCaregiverName)

  return (
    <OnboardingStep
      step={step}
      total={total}
      question="Want to add a caregiver?"
      onContinue={onContinue}
      onSkip={onSkip}
    >
      {/* Role selector */}
      <View style={stepStyles.chipGrid}>
        {CAREGIVER_ROLES.map((opt) => {
          const selected = role === opt.id
          return (
            <Pressable
              key={opt.id}
              onPress={() => setRole(opt.id)}
              style={[
                stepStyles.roleChip,
                {
                  backgroundColor: selected ? colors.primaryTint : colors.surface,
                  borderColor: selected ? colors.primary : colors.border,
                  borderRadius: radius.full,
                },
              ]}
            >
              <Text
                style={[
                  stepStyles.roleChipText,
                  { color: selected ? colors.primary : colors.text },
                ]}
              >
                {opt.label}
              </Text>
            </Pressable>
          )
        })}
      </View>

      {/* Name input (shown after role selected) */}
      {role && (
        <TextInput
          value={name ?? ''}
          onChangeText={setName}
          placeholder={`${CAREGIVER_ROLES.find((r) => r.id === role)?.label}'s name`}
          placeholderTextColor={colors.textMuted}
          autoCapitalize="words"
          style={[
            stepStyles.textInput,
            {
              color: colors.text,
              backgroundColor: colors.surface,
              borderColor: colors.border,
              borderRadius: radius.lg,
              marginTop: 16,
            },
          ]}
        />
      )}
    </OnboardingStep>
  )
}

// ─── Completion Screen ─────────────────────────────────────────────────────

function CompletionScreen({
  children,
  onFinish,
}: {
  children: { name: string; birthDate: string | null; photoUri: string | null }[]
  onFinish: () => void
}) {
  const insets = useSafeAreaInsets()
  const { colors, radius, isDark } = useTheme()

  return (
    <View style={[completeStyles.root, { backgroundColor: colors.bg }]}>
      <ScrollView
        contentContainerStyle={[
          completeStyles.scroll,
          { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 100 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[completeStyles.iconCircle, { backgroundColor: brand.kids + '20' }]}>
          <Star size={40} color={brand.kids} strokeWidth={2} fill={brand.kids} />
        </View>

        <Text style={[completeStyles.title, { color: colors.text }]}>
          Welcome to the family!
        </Text>

        <Text style={[completeStyles.message, { color: colors.textSecondary }]}>
          Grandma can't wait to help you track every beautiful moment.
          Here's who we'll be watching over:
        </Text>

        {/* Child cards */}
        <View style={completeStyles.cards}>
          {children.map((child, i) => (
            <View
              key={i}
              style={[
                completeStyles.childCard,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  borderRadius: radius.xl,
                },
              ]}
            >
              {child.photoUri ? (
                <Image
                  source={{ uri: child.photoUri }}
                  style={completeStyles.childPhoto}
                />
              ) : (
                <View
                  style={[
                    completeStyles.childPhotoPlaceholder,
                    { backgroundColor: colors.surfaceRaised },
                  ]}
                >
                  <User size={24} color={colors.textMuted} strokeWidth={1.5} />
                </View>
              )}
              <View style={completeStyles.childInfo}>
                <Text style={[completeStyles.childName, { color: colors.text }]}>
                  {child.name}
                </Text>
                {child.birthDate && (
                  <Text style={[completeStyles.childAge, { color: colors.textSecondary }]}>
                    {formatAge(child.birthDate)}
                  </Text>
                )}
              </View>
            </View>
          ))}
        </View>
      </ScrollView>

      <View style={[completeStyles.bottom, { paddingBottom: insets.bottom + 16, backgroundColor: colors.bg }]}>
        <Pressable
          onPress={onFinish}
          style={({ pressed }) => [
            completeStyles.button,
            {
              backgroundColor: brand.kids,
              borderRadius: radius.full,
            },
            pressed && { transform: [{ scale: 0.98 }], opacity: 0.9 },
          ]}
        >
          <Text style={[completeStyles.buttonText, { color: colors.bg }]}>Let's Go</Text>
        </Pressable>
      </View>
    </View>
  )
}

// ─── Styles ────────────────────────────────────────────────────────────────

const stepStyles = StyleSheet.create({
  centered: {
    alignItems: 'center',
    gap: 16,
  },
  textInput: {
    borderWidth: 1,
    paddingHorizontal: 20,
    height: 56,
    fontSize: 16,
    fontWeight: '500',
  },
  textArea: {
    borderWidth: 1,
    padding: 16,
    fontSize: 16,
    fontWeight: '500',
    minHeight: 120,
    textAlignVertical: 'top',
  },
  hint: {
    fontSize: 13,
    fontWeight: '500',
    marginTop: 12,
    lineHeight: 18,
  },
  dateButton: {
    paddingVertical: 18,
    paddingHorizontal: 24,
    borderWidth: 1,
    width: '100%',
  },
  dateButtonText: {
    fontSize: 17,
    fontWeight: '600',
    textAlign: 'center',
  },
  ageBadge: {
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  ageBadgeText: {
    fontSize: 14,
    fontWeight: '600',
  },
  counterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
  },
  counterButton: {
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  counterDisplay: {
    width: 88,
    height: 88,
    alignItems: 'center',
    justifyContent: 'center',
  },
  counterNumber: {
    fontSize: 40,
    fontWeight: '900', fontFamily: 'Fraunces_600SemiBold' },
  countryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 1,
  },
  countryName: {
    fontSize: 15,
    fontWeight: '600',
  },
  countrySearch: {
    borderWidth: 1,
    paddingHorizontal: 16,
    height: 52,
    justifyContent: 'center',
  },
  countrySearchInput: {
    fontSize: 16,
    fontWeight: '500',
  },
  countryDropdown: {
    borderWidth: 1,
    marginTop: 6,
    overflow: 'hidden',
  },
  countryDropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 10,
  },
  photoPreview: {
    width: 160,
    height: 160,
  },
  photoPlaceholder: {
    width: 160,
    height: 160,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderStyle: 'dashed',
    gap: 8,
  },
  photoHint: {
    fontSize: 13,
    fontWeight: '500',
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  allergyChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderWidth: 1,
  },
  allergyChipText: {
    fontSize: 14,
    fontWeight: '600',
  },
  roleChip: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderWidth: 1,
  },
  roleChipText: {
    fontSize: 15,
    fontWeight: '600',
  },
})

const completeStyles = StyleSheet.create({
  root: {
    flex: 1,
  },
  scroll: {
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  iconCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: -0.5,
    marginBottom: 12, fontFamily: 'Fraunces_600SemiBold' },
  message: {
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  cards: {
    width: '100%',
    gap: 12,
  },
  childCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 16,
    borderWidth: 1,
  },
  childPhoto: {
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  childPhotoPlaceholder: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  childInfo: {
    flex: 1,
    gap: 2,
  },
  childName: {
    fontSize: 17,
    fontWeight: '700',
  },
  childAge: {
    fontSize: 14,
    fontWeight: '500',
  },
  bottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  button: {
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
})
