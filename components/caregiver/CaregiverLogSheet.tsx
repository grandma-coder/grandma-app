/**
 * CaregiverLogSheet — the caregiver's "log the day" entry point. Presents only
 * the log types the caregiver's capabilities allow, then opens the existing
 * KidsLogForms component for the chosen type (those forms write via the shared
 * saveChildLog helper, which already sets user_id = parent_id and
 * logged_by = session and invalidates the kids-log queries so the parent sees
 * it live). RLS is the security boundary; this only decides what to render.
 *
 * Capability gating:
 *  - log_activity → meals, sleep, diaper, mood, memory, activity
 *  - emergency    → health/medical event (vaccine/medicine/temperature)
 *
 * If RLS rejects a write (e.g. a paused caregiver whose local permissions are
 * stale), the form surfaces the thrown error; we additionally guard entry: a
 * caregiver who somehow opens this without log_activity sees a PaperAlert
 * rather than empty affordances.
 */

import { useMemo, useState } from 'react'
import { Modal, View, Text, Pressable, ScrollView, StyleSheet } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme, useDiffuseTheme, diffuseFont, font, radius } from '../../constants/theme'
import { ChevronLeft } from 'lucide-react-native'
import { useIsDiffuse } from '../ui/diffuse/DiffuseKit'
import { DiffuseSheet } from '../ui/diffuse/DiffusePrimitives'
import { hasCapability, CAPABILITY } from '../../lib/caregiverPermissions'
import { PaperAlert } from '../ui/PaperAlert'
import {
  FeedingForm,
  SleepForm,
  KidsMoodForm,
  MemoryForm,
  DiaperForm,
  ActivityForm,
  HealthEventForm,
} from '../calendar/KidsLogForms'
import type { ChildWithRole } from '../../types'
import { useTranslation } from '../../lib/i18n'

type LogType =
  | 'feeding'
  | 'sleep'
  | 'diaper'
  | 'mood'
  | 'memory'
  | 'activity'
  | 'health'

interface LogTypeDef {
  key: LogType
  label: string
  emoji: string
  capability: typeof CAPABILITY[keyof typeof CAPABILITY]
}

const LOG_TYPES: LogTypeDef[] = [
  { key: 'feeding', label: 'Feeding', emoji: '🍼', capability: CAPABILITY.LOG_ACTIVITY },
  { key: 'sleep', label: 'Sleep', emoji: '😴', capability: CAPABILITY.LOG_ACTIVITY },
  { key: 'diaper', label: 'Diaper', emoji: '🧷', capability: CAPABILITY.LOG_ACTIVITY },
  { key: 'mood', label: 'Mood', emoji: '🙂', capability: CAPABILITY.LOG_ACTIVITY },
  { key: 'memory', label: 'Memory', emoji: '📸', capability: CAPABILITY.LOG_ACTIVITY },
  { key: 'activity', label: 'Activity', emoji: '🧩', capability: CAPABILITY.LOG_ACTIVITY },
  { key: 'health', label: 'Health', emoji: '🩺', capability: CAPABILITY.EMERGENCY },
]

interface Props {
  child: ChildWithRole
  onClose: () => void
}

export function CaregiverLogSheet({ child, onClose }: Props) {
  const insets = useSafeAreaInsets()
  const { colors } = useTheme()
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
  const { t } = useTranslation()
  const styles = useMemo(() => makeStyles(colors), [colors])
  const [selected, setSelected] = useState<LogType | null>(null)

  // Only the types this caregiver may log. Withheld types are hidden.
  const allowed = LOG_TYPES.filter((lt) => hasCapability(child, lt.capability))

  // Defensive: opened without any logging capability at all.
  if (allowed.length === 0) {
    return (
      <PaperAlert
        visible
        title="No logging access"
        message="The parent hasn't granted you logging for this child. Ask them to update your access."
        buttons={[{ label: 'OK', variant: 'primary' }]}
        onRequestClose={onClose}
      />
    )
  }

  const handleSaved = () => {
    setSelected(null)
    onClose()
  }

  // The chosen form's body — identical across variants (KidsLogForms self-branch
  // on diffuse internally).
  const formBody = (
    <>
      {selected === 'feeding' && <FeedingForm onSaved={handleSaved} />}
      {selected === 'sleep' && <SleepForm onSaved={handleSaved} />}
      {selected === 'mood' && <KidsMoodForm onSaved={handleSaved} />}
      {selected === 'memory' && <MemoryForm onSaved={handleSaved} />}
      {selected === 'diaper' && <DiaperForm onSaved={handleSaved} />}
      {selected === 'activity' && <ActivityForm onSaved={handleSaved} />}
      {selected === 'health' && <HealthEventForm onSaved={handleSaved} />}
    </>
  )

  // ─── Diffuse: DiffuseSheet shell + hairline tiles + containerless back ──────
  if (diffuse) {
    // Title reflects state; the sheet's own X handles close. In form mode a
    // containerless mono "← BACK" row returns to the picker.
    return (
      <DiffuseSheet
        visible
        title={
          selected === null
            ? t('caregiverLogSheet_title', { name: child.name })
            : (allowed.find((lt) => lt.key === selected)?.label ?? t('common_back'))
        }
        onClose={onClose}
      >
        {selected === null ? (
          <View style={styles.grid}>
            {allowed.map((lt) => (
              <Pressable
                key={lt.key}
                onPress={() => setSelected(lt.key)}
                accessibilityRole="button"
                accessibilityLabel={`Log ${lt.label}`}
                style={({ pressed }) => [
                  styles.tile,
                  {
                    backgroundColor: dt.colors.surface,
                    borderColor: dt.colors.line,
                    borderWidth: StyleSheet.hairlineWidth,
                    opacity: pressed ? 0.7 : 1,
                  },
                ]}
              >
                <Text style={styles.tileEmoji}>{lt.emoji}</Text>
                <Text
                  style={[
                    styles.tileLabel,
                    { fontFamily: diffuseFont.mono, color: dt.colors.ink3, textTransform: 'uppercase', letterSpacing: 1.2, fontSize: 11 },
                  ]}
                >
                  {lt.label}
                </Text>
              </Pressable>
            ))}
          </View>
        ) : (
          <View style={styles.formWrap}>
            <Pressable
              onPress={() => setSelected(null)}
              style={({ pressed }) => [styles.diffuseBack, { opacity: pressed ? 0.6 : 1 }]}
              accessibilityRole="button"
            >
              <ChevronLeft size={16} color={dt.colors.ink3} strokeWidth={1.8} />
              <Text
                style={{ fontFamily: diffuseFont.mono, color: dt.colors.ink, textTransform: 'uppercase', letterSpacing: 1.6, fontSize: 12 }}
              >
                {t('common_back')}
              </Text>
            </Pressable>
            {formBody}
          </View>
        )}
      </DiffuseSheet>
    )
  }

  return (
    <Modal visible animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
          <View style={styles.handle} />

          {selected === null ? (
            <>
              <Text style={styles.title}>{t('caregiverLogSheet_title', { name: child.name })}</Text>
              <ScrollView contentContainerStyle={styles.grid}>
                {allowed.map((lt) => (
                  <Pressable
                    key={lt.key}
                    onPress={() => setSelected(lt.key)}
                    accessibilityRole="button"
                    accessibilityLabel={`Log ${lt.label}`}
                    style={styles.tile}
                  >
                    <Text style={styles.tileEmoji}>{lt.emoji}</Text>
                    <Text style={styles.tileLabel}>{lt.label}</Text>
                  </Pressable>
                ))}
              </ScrollView>
              <Pressable onPress={onClose} style={styles.cancel}>
                <Text style={styles.cancelText}>{t('common_close')}</Text>
              </Pressable>
            </>
          ) : (
            <ScrollView contentContainerStyle={styles.formWrap}>
              <Pressable onPress={() => setSelected(null)} style={styles.back}>
                <Text style={styles.backText}>{t('caregiverLogSheet_backChevron', { back: t('common_back') })}</Text>
              </Pressable>
              {formBody}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  )
}

const makeStyles = (colors: ReturnType<typeof useTheme>['colors']) =>
  StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(20,19,19,0.35)',
      justifyContent: 'flex-end',
    },
    sheet: {
      backgroundColor: colors.bg,
      borderTopLeftRadius: radius.lg,
      borderTopRightRadius: radius.lg,
      paddingHorizontal: 16,
      paddingTop: 10,
      maxHeight: '88%',
    },
    handle: {
      alignSelf: 'center',
      width: 40,
      height: 5,
      borderRadius: radius.full,
      backgroundColor: colors.border,
      marginBottom: 12,
    },
    title: {
      fontSize: 22,
      fontFamily: font.display,
      color: colors.text,
      marginBottom: 16,
    },
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
    },
    tile: {
      width: '30%',
      aspectRatio: 1,
      backgroundColor: colors.surface,
      borderRadius: radius.md,
      borderWidth: 1.5,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
    },
    tileEmoji: {
      fontSize: 28,
    },
    tileLabel: {
      fontSize: 13,
      fontFamily: font.bodyMedium,
      color: colors.text,
    },
    cancel: {
      alignItems: 'center',
      paddingVertical: 16,
      marginTop: 8,
    },
    cancelText: {
      fontSize: 15,
      fontFamily: font.bodyMedium,
      color: colors.textMuted,
    },
    formWrap: {
      paddingBottom: 24,
    },
    back: {
      paddingVertical: 8,
      marginBottom: 4,
    },
    backText: {
      fontSize: 16,
      fontFamily: font.bodyMedium,
      color: colors.textSecondary,
    },
    diffuseBack: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingVertical: 8,
      marginBottom: 8,
    },
  })
