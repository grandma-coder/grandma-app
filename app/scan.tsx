import { useState, useEffect } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
  StyleSheet,
} from 'react-native'
import { router } from 'expo-router'
import * as ImagePicker from 'expo-image-picker'
import * as ImageManipulator from 'expo-image-manipulator'
import { Ionicons } from '@expo/vector-icons'
import { useChildStore } from '../store/useChildStore'
import { scanImage } from '../lib/scan'
import { supabase } from '../lib/supabase'
import { checkPremium } from '../lib/revenue'
import ResultCard from '../components/ui/ResultCard'

const FREE_SCAN_LIMIT = 3

const SCAN_TYPES = [
  { id: 'medicine', icon: '💊', label: 'Medicine' },
  { id: 'food', icon: '🥦', label: 'Food' },
  { id: 'nutrition', icon: '📊', label: 'Nutrition' },
  { id: 'general', icon: '📷', label: 'General' },
]

export default function Scan() {
  const child = useChildStore((s) => s.activeChild)
  const [scanType, setScanType] = useState('medicine')
  const [loading, setLoading] = useState(false)
  const [isPremium, setIsPremium] = useState(false)
  const [scanCount, setScanCount] = useState(0)

  useEffect(() => {
    checkPremium().then(setIsPremium).catch(() => {})
    if (child?.id) {
      supabase
        .from('scan_history')
        .select('id', { count: 'exact', head: true })
        .eq('child_id', child.id)
        .then(({ count }) => setScanCount(count ?? 0))
    }
  }, [child?.id])
  const [imageUri, setImageUri] = useState<string | null>(null)
  const [result, setResult] = useState<string | null>(null)

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

    const result = await launchFn({
      mediaTypes: ['images'],
      quality: 0.8,
      base64: false,
    })

    if (result.canceled || !result.assets[0]) return

    const uri = result.assets[0].uri
    setImageUri(uri)
    await analyzeImage(uri)
  }

  async function analyzeImage(uri: string) {
    setLoading(true)
    setResult(null)

    try {
      // Compress image to under 1MB
      const manipulated = await ImageManipulator.manipulateAsync(
        uri,
        [{ resize: { width: 1024 } }],
        { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG, base64: true }
      )

      if (!manipulated.base64) throw new Error('Failed to encode image')

      const reply = await scanImage({
        imageBase64: manipulated.base64,
        mediaType: 'image/jpeg',
        scanType,
        child,
      })

      setResult(reply)

      // Save to scan_history
      if (child?.id) {
        await supabase.from('scan_history').insert({
          child_id: child.id,
          scan_type: scanType,
          image_url: uri,
          result_json: { reply },
        })
        setScanCount(prev => prev + 1)
      }
    } catch (e: any) {
      Alert.alert('Scan failed', e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#1A1A2E" />
        </TouchableOpacity>
        <Text style={styles.title}>Scan</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Scan type selector */}
      <View style={styles.typesRow}>
        {SCAN_TYPES.map(type => (
          <TouchableOpacity
            key={type.id}
            onPress={() => setScanType(type.id)}
            style={[
              styles.typeChip,
              scanType === type.id && styles.typeChipActive,
            ]}
          >
            <Text style={styles.typeIcon}>{type.icon}</Text>
            <Text style={[
              styles.typeLabel,
              scanType === type.id && styles.typeLabelActive,
            ]}>{type.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Image preview or placeholder */}
      <View style={styles.previewContainer}>
        {imageUri ? (
          <Image source={{ uri: imageUri }} style={styles.preview} resizeMode="contain" />
        ) : (
          <View style={styles.placeholder}>
            <Ionicons name="scan-outline" size={64} color="#ccc" />
            <Text style={styles.placeholderText}>
              Take a photo or pick from library
            </Text>
          </View>
        )}
        {loading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#7BAE8E" />
            <Text style={styles.loadingText}>Grandma is looking...</Text>
          </View>
        )}
      </View>

      {/* Action buttons */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => pickImage(true)}
          disabled={loading}
        >
          <Ionicons name="camera" size={24} color="#fff" />
          <Text style={styles.actionText}>Camera</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.actionButtonSecondary]}
          onPress={() => pickImage(false)}
          disabled={loading}
        >
          <Ionicons name="images" size={24} color="#1A1A2E" />
          <Text style={[styles.actionText, styles.actionTextSecondary]}>Library</Text>
        </TouchableOpacity>
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
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF8F4',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A2E',
  },
  typesRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 16,
  },
  typeChip: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#E8E4DC',
  },
  typeChipActive: {
    borderColor: '#7BAE8E',
    backgroundColor: '#F0F8F3',
  },
  typeIcon: {
    fontSize: 20,
    marginBottom: 4,
  },
  typeLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#888',
  },
  typeLabelActive: {
    color: '#7BAE8E',
  },
  previewContainer: {
    flex: 1,
    marginHorizontal: 16,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E8E4DC',
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
    color: '#aaa',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(250,248,244,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 15,
    color: '#1A1A2E',
    fontWeight: '600',
  },
  actions: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#1A1A2E',
    borderRadius: 14,
    paddingVertical: 14,
  },
  actionButtonSecondary: {
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#E8E4DC',
  },
  actionText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  actionTextSecondary: {
    color: '#1A1A2E',
  },
})
