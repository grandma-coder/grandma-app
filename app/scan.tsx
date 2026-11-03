import { useState, useEffect, useMemo } from 'react'
import {
  View,
  Text,
  Pressable,
  Alert,
  Image,
  StyleSheet,
} from 'react-native'
import { router } from 'expo-router'
import * as ImagePicker from 'expo-image-picker'
import * as ImageManipulator from 'expo-image-manipulator'
import { Ionicons } from '@expo/vector-icons'
import { ArrowLeft, Camera, Images, ScanLine } from 'lucide-react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useChildStore } from '../store/useChildStore'
import { useModeStore } from '../store/useModeStore'
import { usePregnancyStore } from '../store/usePregnancyStore'
import { weekForDate } from '../lib/pregnancyWeeks'
import { toDateStr } from '../lib/cycleLogic'
import { scanImage, ScanLimitReachedError } from '../lib/scan'
import { supabase } from '../lib/supabase'
import { checkPremium } from '../lib/revenue'
import ResultCard from '../components/ui/ResultCard'
import { BrandedLoader } from '../components/ui/BrandedLoader'
import { spacing, borderRadius, useTheme, useDiffuseTheme, diffuseFont, getDiffuseAccent } from '../constants/theme'
import { useIsDiffuse, DiffuseArrow } from '../components/ui/diffuse/DiffuseKit'
import { DiffuseBloomIcon } from '../components/ui/diffuse/DiffusePrimitives'
import { PartialStickers } from '../components/stickers/PartialStickers'
import { useTranslation } from '../lib/i18n'
import { InkBackButton } from '../components/ui/InkBackButton'
import { SiteSticker } from '../components/stickers/SiteSticker'
import { getModeColorSoft } from '../constants/theme'
import { usePaywallEnabled } from '../store/useFeatureFlags'

const FREE_SCAN_LIMIT = 3

function getScanTypes(t: (key: any) => string) {
  return [
    { id: 'medicine', Sticker: PartialStickers.ScanTypeMedicine, label: t('scan_typeMedicine') },
    { id: 'food',     Sticker: PartialStickers.ScanTypeFood,     label: t('scan_typeFood') },
    { id: 'nutrition',Sticker: PartialStickers.ScanTypeNutrition,label: t('scan_typeNutrition') },
    { id: 'general',  Sticker: PartialStickers.ScanTypeGeneral,  label: t('scan_typeGeneral') },
  ]
}

export default function Scan() {
  const insets = useSafeAreaInsets()
  const { colors, font, isDark } = useTheme()
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
  const mode = useModeStore((s) => s.mode)
  const accent = getDiffuseAccent(mode, dt.isDark)
  const styles = useMemo(() => StyleSheet.create({
    container: {
      flex: 1,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing['2xl'],
      paddingBottom: 16,
    },
    backButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.surfaceGlass,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.border,
    },
    title: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.text,
    },
    typesRow: {
      flexDirection: 'row',
      paddingHorizontal: spacing.lg,
      gap: 8,
      marginBottom: 16,
    },
    typeChip: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: 10,
      borderRadius: borderRadius.md,
      backgroundColor: colors.surfaceGlass,
      borderWidth: 1.5,
      borderColor: colors.border,
    },
    typeChipActive: {
      borderColor: colors.accent,
      backgroundColor: colors.primaryTint,
    },
    typeIcon: {
      fontSize: 20,
      marginBottom: 4,
    },
    typeLabel: {
      fontSize: 11,
      fontWeight: '600',
      color: colors.textMuted,
    },
    typeLabelActive: {
      color: colors.accent,
    },
    previewContainer: {
      flex: 1,
      marginHorizontal: spacing.lg,
      borderRadius: borderRadius.lg,
      overflow: 'hidden',
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    preview: {
      flex: 1,
    },
    placeholder: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      gap: 12,
    },
    placeholderText: {
      fontSize: 15,
      color: colors.textMuted,
    },
    loadingOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(10, 14, 26, 0.9)',
      justifyContent: 'center',
      alignItems: 'center',
      gap: 12,
    },
    loadingText: {
      fontSize: 15,
      color: colors.text,
      fontWeight: '600',
    },
    actions: {
      flexDirection: 'row',
      paddingHorizontal: spacing.lg,
      paddingTop: 12,
      gap: 12,
    },
    actionButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      backgroundColor: colors.accent,
      borderRadius: borderRadius.md,
      paddingVertical: 14,
    },
    actionButtonSecondary: {
      backgroundColor: colors.surfaceGlass,
      borderWidth: 1,
      borderColor: colors.border,
    },
    actionText: {
      color: colors.textInverse,
      fontSize: 15,
      fontWeight: '600',
    },
    actionTextSecondary: {
      color: colors.text,
      fontSize: 15,
      fontWeight: '600',
    },
  }), [colors])
  const { t } = useTranslation()
  const paywallOn = usePaywallEnabled()
  const scanTypes = getScanTypes(t)
  const child = useChildStore((s) => s.activeChild)
  const pregnancyDueDate = usePregnancyStore((s) => s.dueDate)
  const pregnancyStoredWeek = usePregnancyStore((s) => s.weekNumber)
  const [scanType, setScanType] = useState('medicine')
  const [loading, setLoading] = useState(false)
  const [isPremium, setIsPremium] = useState(false)
  const [scanCount, setScanCount] = useState(0)
  const [imageUri, setImageUri] = useState<string | null>(null)
  const [result, setResult] = useState<string | null>(null)

  // FREE_SCAN_LIMIT applies per-account, not per-child. Count scans by
  // user_id so pregnancy / pre-pregnancy users (with no child) are also
  // gated correctly. Legacy rows tied only to child_id were backfilled with
  // user_id in migration 20260512150000.
  useEffect(() => {
    let alive = true
    checkPremium().then((p) => alive && setIsPremium(p)).catch(() => {})
    ;(async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session || !alive) return
      const { count } = await supabase
        .from('scan_history')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', session.user.id)
      if (alive) setScanCount(count ?? 0)
    })()
    return () => {
      alive = false
    }
  }, [])

  // With the paywall flag off, /paywall closes itself immediately — the old push just flashed a
  // modal. Say what happened instead. (The free quota stays: scans cost API calls.)
  function showLimitReached() {
    if (paywallOn) router.push('/paywall')
    else Alert.alert(t('scan_limitReachedTitle'), t('scan_limitReachedBody'))
  }

  async function pickImage(useCamera: boolean) {
    if (!isPremium && scanCount >= FREE_SCAN_LIMIT) {
      showLimitReached()
      return
    }
    const permissionFn = useCamera
      ? ImagePicker.requestCameraPermissionsAsync
      : ImagePicker.requestMediaLibraryPermissionsAsync

    const { granted } = await permissionFn()
    if (!granted) {
      Alert.alert(t('scan_permissionNeeded'), t('scan_permissionMsg', { type: useCamera ? t('scan_permissionType_camera') : t('scan_permissionType_library') }))
      return
    }

    const launchFn = useCamera
      ? ImagePicker.launchCameraAsync
      : ImagePicker.launchImageLibraryAsync

    const pickerResult = await launchFn({
      mediaTypes: ['images'],
      quality: 0.8,
      base64: false,
    })

    if (pickerResult.canceled || !pickerResult.assets[0]) return

    const uri = pickerResult.assets[0].uri
    setImageUri(uri)
    await analyzeImage(uri)
  }

  async function analyzeImage(uri: string) {
    setLoading(true)
    setResult(null)

    try {
      const manipulated = await ImageManipulator.manipulateAsync(
        uri,
        [{ resize: { width: 1024 } }],
        { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG, base64: true }
      )

      if (!manipulated.base64) throw new Error('Failed to encode image')

      // For pregnancy users (no child), pass week + due date so the edge
      // function builds a pregnancy-aware prompt instead of falling back
      // to the generic kids persona.
      const liveWeek = pregnancyDueDate
        ? weekForDate(pregnancyDueDate, toDateStr(new Date()))
        : pregnancyStoredWeek ?? null
      const pregnancy =
        mode === 'pregnancy' && !child
          ? { weekNumber: liveWeek, dueDate: pregnancyDueDate ?? null }
          : null

      const reply = await scanImage({
        imageBase64: manipulated.base64,
        mediaType: 'image/jpeg',
        scanType,
        child,
        pregnancy,
        mode,
      })

      setResult(reply)

      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        // Truncate the reply before persisting. Claude scan replies can run
        // 2–5KB; storing the full text in jsonb across many scans bloats
        // the row and the storage bill. The displayed reply still uses the
        // in-memory full version (set above); this is purely for history.
        const REPLY_PERSIST_MAX = 1800
        const persistedReply = reply.length > REPLY_PERSIST_MAX
          ? reply.slice(0, REPLY_PERSIST_MAX) + '…'
          : reply
        const { error: insErr } = await supabase.from('scan_history').insert({
          user_id: session.user.id,
          child_id: child?.id ?? null,
          scan_type: scanType,
          image_url: uri,
          result_json: { reply: persistedReply, truncated: reply.length > REPLY_PERSIST_MAX },
        })
        if (insErr) {
          console.warn('[scan] failed to record scan_history:', insErr.message)
        } else {
          setScanCount((prev) => prev + 1)
        }
      }
    } catch (e: any) {
      // Server enforces the free-tier quota and may 402 even if the local
      // count looked under-limit (e.g. scans recorded on another device).
      if (e instanceof ScanLimitReachedError) {
        showLimitReached()
        return
      }
      Alert.alert(t('scan_failed'), e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: diffuse ? dt.colors.bg : colors.bg }}>
      <View style={[styles.container, { paddingTop: insets.top + 12 }]}>
        {/* Header */}
        <View style={styles.header}>
          {diffuse ? (
            <Pressable
              onPress={() => router.back()}
              style={[styles.backButton, { backgroundColor: 'transparent', borderColor: dt.colors.line2 }]}
            >
              <ArrowLeft size={22} color={dt.colors.ink} strokeWidth={1.8} />
            </Pressable>
          ) : (
            <InkBackButton ink={colors.text} paper={colors.surface} style={{ marginBottom: 0 }} />
          )}
          {diffuse ? (
            <Text style={[styles.title, { color: dt.colors.ink, fontFamily: diffuseFont.display, fontWeight: '400' }]}>
              {t('scan_screenTitle')}
            </Text>
          ) : (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <SiteSticker name="camera" size={30} cut />
              <Text style={{ fontFamily: font.display, fontSize: 22, letterSpacing: 0.3, textTransform: 'uppercase', color: colors.text }}>
                {t('scan_screenTitle')}
              </Text>
            </View>
          )}
          <View style={{ width: 44 }} />
        </View>

        {/* Scan type selector */}
        <View style={styles.typesRow}>
          {scanTypes.map((type) => {
            const active = scanType === type.id
            return (
              <Pressable
                key={type.id}
                onPress={() => setScanType(type.id)}
                style={[
                  styles.typeChip,
                  diffuse
                    ? active && styles.typeChipActive
                    : {
                        backgroundColor: active ? getModeColorSoft(mode, isDark) : 'transparent',
                        borderColor: active ? colors.text : 'transparent',
                      },
                  diffuse && {
                    backgroundColor: 'transparent',
                    borderColor: active ? accent : dt.colors.line,
                  },
                ]}
              >
                <type.Sticker size={36} />
                <Text
                  style={[
                    styles.typeLabel,
                    diffuse ? (active && styles.typeLabelActive) : { color: colors.text, fontFamily: font.bodyBold, fontWeight: undefined },
                    diffuse && {
                      fontFamily: active ? diffuseFont.monoBold : diffuseFont.mono,
                      textTransform: 'uppercase',
                      letterSpacing: 1,
                      color: active ? dt.colors.ink : dt.colors.ink3,
                    },
                  ]}
                >
                  {type.label}
                </Text>
              </Pressable>
            )
          })}
        </View>

        {/* Image preview */}
        <View
          style={[
            styles.previewContainer,
            diffuse
              ? { backgroundColor: dt.colors.surface, borderColor: dt.colors.line }
              : { backgroundColor: colors.surface, borderColor: colors.text, borderWidth: 1.5, borderRadius: 18, shadowColor: colors.text, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 0 },
          ]}
        >
          {imageUri ? (
            <Image source={{ uri: imageUri }} style={styles.preview} resizeMode="contain" />
          ) : (
            <View style={styles.placeholder}>
              {diffuse ? (
                <DiffuseBloomIcon color={accent} size={64} intensity={0.5}>
                  <ScanLine size={40} color={dt.colors.ink3} strokeWidth={1.6} />
                </DiffuseBloomIcon>
              ) : (
                <SiteSticker name="camera" size={72} cut />
              )}
              <Text
                style={[
                  styles.placeholderText,
                  diffuse ? { color: dt.colors.ink3, fontFamily: diffuseFont.body } : { color: colors.textSecondary, fontFamily: font.body, textAlign: 'center', paddingHorizontal: 24 },
                ]}
              >
                {t('scan_placeholderText')}
              </Text>
            </View>
          )}
          {loading && (
            <View
              style={[
                styles.loadingOverlay,
                { backgroundColor: diffuse ? (dt.isDark ? 'rgba(20,19,19,0.9)' : 'rgba(243,236,217,0.92)') : (isDark ? 'rgba(20,19,19,0.9)' : 'rgba(251,246,234,0.94)') },
              ]}
            >
              <BrandedLoader logoSize={72} sublabel={t('scan_grandmaLooking')} />
            </View>
          )}
        </View>

        {/* Action buttons */}
        <View style={[styles.actions, { paddingBottom: insets.bottom + 16 }]}>
          <Pressable
            style={({ pressed }) => [
              styles.actionButton,
              diffuse
                ? { backgroundColor: 'transparent', borderWidth: 1, borderColor: accent }
                : { backgroundColor: colors.text, borderRadius: 999, paddingVertical: 16 },
              pressed && { opacity: 0.85 },
            ]}
            onPress={() => pickImage(true)}
            disabled={loading}
          >
            {diffuse ? (
              <Camera size={20} color={accent} strokeWidth={1.8} />
            ) : (
              <Ionicons name="camera" size={22} color={colors.surface} />
            )}
            <Text
              style={[
                styles.actionText,
                !diffuse && { color: colors.surface, fontFamily: font.bodyBold, fontWeight: undefined, fontSize: 16 },
                diffuse && {
                  color: accent,
                  fontFamily: diffuseFont.monoBold,
                  textTransform: 'uppercase',
                  letterSpacing: 1.4,
                  fontSize: 13,
                },
              ]}
            >
              {t('scan_cameraBtn')}
            </Text>
            {diffuse && <DiffuseArrow color={accent} size={16} />}
          </Pressable>
          <Pressable
            style={({ pressed }) => [
              styles.actionButton,
              styles.actionButtonSecondary,
              diffuse
                ? { backgroundColor: 'transparent', borderColor: dt.colors.line2 }
                : { backgroundColor: colors.surface, borderColor: colors.text, borderWidth: 1.5, borderRadius: 999, paddingVertical: 16 },
              pressed && { opacity: 0.85 },
            ]}
            onPress={() => pickImage(false)}
            disabled={loading}
          >
            {diffuse ? (
              <Images size={20} color={dt.colors.ink} strokeWidth={1.8} />
            ) : (
              <Ionicons name="images" size={22} color={colors.text} />
            )}
            <Text
              style={[
                styles.actionTextSecondary,
                !diffuse && { fontFamily: font.bodyBold, fontWeight: undefined, fontSize: 16 },
                diffuse && {
                  color: dt.colors.ink,
                  fontFamily: diffuseFont.mono,
                  textTransform: 'uppercase',
                  letterSpacing: 1.4,
                  fontSize: 13,
                },
              ]}
            >
              {t('scan_libraryBtn')}
            </Text>
          </Pressable>
        </View>

        {/* Result overlay */}
        {result && (
          <ResultCard
            result={result}
            scanType={scanType}
            onClose={() => {
              setResult(null)
              setImageUri(null)
            }}
          />
        )}
      </View>
    </View>
  )
}
