import { useState, useEffect } from 'react'
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
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useChildStore } from '../store/useChildStore'
import { useModeStore } from '../store/useModeStore'
import { usePregnancyStore } from '../store/usePregnancyStore'
import { weekForDate } from '../lib/pregnancyWeeks'
import { scanImage } from '../lib/scan'
import { supabase } from '../lib/supabase'
import { checkPremium } from '../lib/revenue'
import { CosmicBackground } from '../components/ui/CosmicBackground'
import ResultCard from '../components/ui/ResultCard'
import { BrandedLoader } from '../components/ui/BrandedLoader'
import { colors, spacing, borderRadius } from '../constants/theme'

const FREE_SCAN_LIMIT = 3

const SCAN_TYPES = [
  { id: 'medicine', icon: '💊', label: 'Medicine' },
  { id: 'food', icon: '🥦', label: 'Food' },
  { id: 'nutrition', icon: '📊', label: 'Nutrition' },
  { id: 'general', icon: '📷', label: 'General' },
]

export default function Scan() {
  const insets = useSafeAreaInsets()
  const child = useChildStore((s) => s.activeChild)
  const mode = useModeStore((s) => s.mode)
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

  async function pickImage(useCamera: boolean) {
    if (!isPremium && scanCount >= FREE_SCAN_LIMIT) {
      router.push('/paywall')
      return
    }
    const permissionFn = useCamera
      ? ImagePicker.requestCameraPermissionsAsync
      : ImagePicker.requestMediaLibraryPermissionsAsync

    const { granted } = await permissionFn()
    if (!granted) {
      Alert.alert('Permission needed', `Please allow ${useCamera ? 'camera' : 'photo library'} access.`)
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
        ? weekForDate(pregnancyDueDate, new Date().toISOString().slice(0, 10))
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
      Alert.alert('Scan failed', e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <CosmicBackground>
      <View style={[styles.container, { paddingTop: insets.top + 12 }]}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={22} color={colors.text} />
          </Pressable>
          <Text style={styles.title}>Scan</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Scan type selector */}
        <View style={styles.typesRow}>
          {SCAN_TYPES.map((type) => (
            <Pressable
              key={type.id}
              onPress={() => setScanType(type.id)}
              style={[
                styles.typeChip,
                scanType === type.id && styles.typeChipActive,
              ]}
            >
              <Text style={styles.typeIcon}>{type.icon}</Text>
              <Text
                style={[
                  styles.typeLabel,
                  scanType === type.id && styles.typeLabelActive,
                ]}
              >
                {type.label}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Image preview */}
        <View style={styles.previewContainer}>
          {imageUri ? (
            <Image source={{ uri: imageUri }} style={styles.preview} resizeMode="contain" />
          ) : (
            <View style={styles.placeholder}>
              <Ionicons name="scan-outline" size={64} color={colors.textTertiary} />
              <Text style={styles.placeholderText}>
                Take a photo or pick from library
              </Text>
            </View>
          )}
          {loading && (
            <View style={styles.loadingOverlay}>
              <BrandedLoader logoSize={72} sublabel="Grandma is looking..." />
            </View>
          )}
        </View>

        {/* Action buttons */}
        <View style={[styles.actions, { paddingBottom: insets.bottom + 16 }]}>
          <Pressable
            style={({ pressed }) => [styles.actionButton, pressed && { opacity: 0.85 }]}
            onPress={() => pickImage(true)}
            disabled={loading}
          >
            <Ionicons name="camera" size={22} color={colors.textOnAccent} />
            <Text style={styles.actionText}>Camera</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [
              styles.actionButton,
              styles.actionButtonSecondary,
              pressed && { opacity: 0.85 },
            ]}
            onPress={() => pickImage(false)}
            disabled={loading}
          >
            <Ionicons name="images" size={22} color={colors.text} />
            <Text style={styles.actionTextSecondary}>Library</Text>
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
    </CosmicBackground>
  )
}

const styles = StyleSheet.create({
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
    backgroundColor: colors.accentMuted,
  },
  typeIcon: {
    fontSize: 20,
    marginBottom: 4,
  },
  typeLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textTertiary,
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
    color: colors.textTertiary,
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
    color: colors.textOnAccent,
    fontSize: 15,
    fontWeight: '600',
  },
  actionTextSecondary: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '600',
  },
})
