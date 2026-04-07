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
} from 'react-native'
import DateTimePicker from '@react-native-community/datetimepicker'
import * as ImagePicker from 'expo-image-picker'
import { router } from 'expo-router'
import { Star, Camera, User, Plus, Minus, Check } from 'lucide-react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { OnboardingStep, OnboardingNavProvider } from '../../../components/onboarding/OnboardingStep'
import { useTheme, brand } from '../../../constants/theme'
import {
  useKidsOnboardingStore,
  type CaregiverRole,
} from '../../../store/useKidsOnboardingStore'
import { useChildStore } from '../../../store/useChildStore'
import { useOnboardingComplete } from '../../../hooks/useOnboardingComplete'
import { supabase } from '../../../lib/supabase'
import type { ChildWithRole } from '../../../types'

// ─── Step types ────────────────────────────────────────────────────────────

type StepId =
  | 'child_count'
  | 'child_name'
  | 'child_dob'
  | 'child_photo'
  | 'child_allergies'
  | 'child_conditions'
  | 'partner'
  | 'caregiver'
  | 'complete'

function buildSteps(childCount: number): StepId[] {
  const steps: StepId[] = ['child_count']
  for (let i = 0; i < childCount; i++) {
    steps.push('child_name', 'child_dob', 'child_photo', 'child_allergies', 'child_conditions')
  }
  steps.push('partner', 'caregiver', 'complete')
  return steps
}

/** Given a flat step index, figure out which child index we're on (0-based) */
function childIndexForStep(stepIndex: number, childCount: number): number {
  // Steps per child = 5, first step is child_count
  if (stepIndex <= 0) return 0
  return Math.floor((stepIndex - 1) / 5)
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
  const [showDatePicker, setShowDatePicker] = useState(Platform.OS === 'ios')

  const steps = buildSteps(store.childCount)
  const currentStep = steps[currentIndex]
  const childIdx = childIndexForStep(currentIndex, store.childCount)

  // Total visible steps = child_count(1) + perChild(5)*N + partner(1) + caregiver(1)
  const totalSteps = 1 + store.childCount * 5 + 2

  const goNext = useCallback(() => {
    if (currentIndex < steps.length - 1) {
      setCurrentIndex((i) => i + 1)
      // Reset date picker for Android on child switch
      if (Platform.OS === 'android') setShowDatePicker(false)
    }
  }, [currentIndex, steps.length])

  const goSkip = useCallback(() => goNext(), [goNext])

  const goBack = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex((i) => i - 1)
      if (Platform.OS === 'android') setShowDatePicker(false)
    }
  }, [currentIndex])

  const handleClose = useCallback(() => {
    store.clearAll()
    router.back()
  }, [])

  // ─── Save to Supabase ──────────────────────────────────────────────────

  async function saveAndFinish() {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return onboardingComplete()

      const userId = session.user.id

      // Create behavior
      await supabase.from('behaviors').insert({
        user_id: userId,
        type: 'kids',
        active: true,
      })

      // Insert children
      const childrenToInsert = store.children.map((c) => ({
        parent_id: userId,
        name: c.name,
        birth_date: c.birthDate || null,
        allergies: c.allergies,
        conditions: c.conditionsText ? [c.conditionsText] : [],
      }))

      const { data: insertedChildren } = await supabase
        .from('children')
        .insert(childrenToInsert)
        .select()

      if (insertedChildren && insertedChildren.length > 0) {
        const childIds = insertedChildren.map((c: any) => c.id)

        // Create care_circle entry for the parent (self)
        await supabase.from('care_circle').insert({
          owner_id: userId,
          member_user_id: userId,
          role: 'partner',
          permissions: ['view', 'log_activity', 'chat', 'edit_child', 'emergency'],
          children_access: childIds,
          status: 'accepted',
        })

        // Create caregiver entry if provided
        if (store.caregiverName && store.caregiverRole) {
          await supabase.from('care_circle').insert({
            owner_id: userId,
            role: store.caregiverRole,
            permissions: ['view', 'log_activity'],
            children_access: childIds,
            status: 'pending',
            invite_email: null,
          })
        }

        // Set children in the app store for immediate use
        const mapped: ChildWithRole[] = insertedChildren.map((c: any) => ({
          id: c.id,
          parentId: c.parent_id ?? c.user_id,
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
          caregiverRole: 'parent' as const,
          permissions: { view: true, log_activity: true, chat: true },
        }))
        setChildrenStore(mapped)
      }
    } catch (e) {
      console.warn('Failed to save kids onboarding:', e)
    }

    store.clearAll()
    onboardingComplete()
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
          showPicker={showDatePicker}
          setShowPicker={setShowDatePicker}
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
  const { colors, radius } = useTheme()
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
  const { colors, radius } = useTheme()
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
  showPicker,
  setShowPicker,
  onContinue,
}: {
  step: number
  total: number
  childIdx: number
  showPicker: boolean
  setShowPicker: (v: boolean) => void
  onContinue: () => void
}) {
  const { colors, radius } = useTheme()
  const child = useKidsOnboardingStore((s) => s.children[childIdx])
  const updateChild = useKidsOnboardingStore((s) => s.updateChild)
  const childName = child?.name || `Child ${childIdx + 1}`

  const dateValue = child?.birthDate ? new Date(child.birthDate) : new Date()

  return (
    <OnboardingStep
      step={step}
      total={total}
      question={`When was ${childName} born?`}
      onContinue={onContinue}
      continueDisabled={!child?.birthDate}
    >
      <View style={stepStyles.centered}>
        {Platform.OS === 'android' && !showPicker && (
          <Pressable
            onPress={() => setShowPicker(true)}
            style={[
              stepStyles.dateButton,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                borderRadius: radius.lg,
              },
            ]}
          >
            <Text
              style={[
                stepStyles.dateButtonText,
                { color: child?.birthDate ? colors.text : colors.textMuted },
              ]}
            >
              {child?.birthDate
                ? new Date(child.birthDate).toLocaleDateString('en-US', {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                  })
                : 'Tap to select a date'}
            </Text>
          </Pressable>
        )}
        {showPicker && (
          <DateTimePicker
            value={dateValue}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            maximumDate={new Date()}
            minimumDate={new Date(2005, 0, 1)}
            onChange={(_, selected) => {
              if (Platform.OS === 'android') setShowPicker(false)
              if (selected) {
                updateChild(childIdx, { birthDate: selected.toISOString().split('T')[0] })
              }
            }}
            themeVariant="light"
          />
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
  const { colors, radius } = useTheme()
  const child = useKidsOnboardingStore((s) => s.children[childIdx])
  const updateChild = useKidsOnboardingStore((s) => s.updateChild)
  const childName = child?.name || `Child ${childIdx + 1}`

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
      question={`Upload a photo of ${childName}`}
      onContinue={onContinue}
      onSkip={onSkip}
    >
      <View style={stepStyles.centered}>
        <Pressable onPress={pickImage}>
          {child?.photoUri ? (
            <Image
              source={{ uri: child.photoUri }}
              style={[stepStyles.photoPreview, { borderRadius: radius.xl }]}
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
                Tap to choose a photo
              </Text>
            </View>
          )}
        </Pressable>
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
  const { colors, radius } = useTheme()
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
  const { colors, radius } = useTheme()
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
  const { colors, radius } = useTheme()
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
  const { colors, radius } = useTheme()
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
  const { colors, radius } = useTheme()

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
              backgroundColor: colors.primary,
              borderRadius: radius.lg,
            },
            pressed && { transform: [{ scale: 0.98 }], opacity: 0.9 },
          ]}
        >
          <Text style={completeStyles.buttonText}>Let's Go</Text>
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
    fontWeight: '900',
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
    marginBottom: 12,
  },
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
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
})
