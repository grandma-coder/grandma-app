/**
 * Photo Safety — content moderation for uploaded images.
 *
 * Currently implements:
 * 1. User agreement prompt before first upload (persisted)
 * 2. Photo guidelines reminder
 *
 * Future: integrate with Supabase Edge Function for server-side
 * face detection (Google Vision / AWS Rekognition) to auto-block
 * photos containing children's faces.
 */

import { Alert } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'

const SAFETY_AGREED_KEY = 'photo-safety-agreed'

/**
 * Shows safety guidelines alert before first photo upload.
 * Returns true if user agrees, false if they decline.
 */
export async function checkPhotoSafety(): Promise<boolean> {
  const agreed = await AsyncStorage.getItem(SAFETY_AGREED_KEY)
  if (agreed === 'true') return true

  return new Promise((resolve) => {
    Alert.alert(
      'Photo Safety Guidelines',
      'To protect children\'s privacy and safety:\n\n' +
      '• Do NOT share photos showing children\'s faces\n' +
      '• Blur or crop faces before sharing\n' +
      '• No identifying information (school names, addresses)\n' +
      '• Product and item photos are always welcome\n\n' +
      'Violations will result in content removal and possible account suspension.',
      [
        {
          text: 'I Decline',
          style: 'cancel',
          onPress: () => resolve(false),
        },
        {
          text: 'I Agree',
          onPress: async () => {
            await AsyncStorage.setItem(SAFETY_AGREED_KEY, 'true')
            resolve(true)
          },
        },
      ]
    )
  })
}

/**
 * Reminder shown when uploading photos in public channels.
 * Returns true to proceed, false to cancel.
 */
export async function remindPhotoGuidelines(): Promise<boolean> {
  return new Promise((resolve) => {
    Alert.alert(
      'Reminder',
      'Please make sure your photo does not show any child\'s face. This helps protect children\'s privacy.',
      [
        { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
        { text: 'My photo is safe', onPress: () => resolve(true) },
      ]
    )
  })
}
