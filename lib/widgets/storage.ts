/**
 * Where the widget snapshot lives so the widgets can read it without the app running:
 * iOS — App Group UserDefaults (read by targets/widget); Android — AsyncStorage (read by the
 * react-native-android-widget task handler in widgets/android/).
 */
import { Platform } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'

export const WIDGET_APP_GROUP = 'group.co.sauceroom.grandma'
export const WIDGET_SNAPSHOT_KEY = 'widgetSnapshot'
export const ANDROID_SNAPSHOT_KEY = 'grandma-widget-snapshot'

export async function writeSnapshot(json: string): Promise<void> {
  if (Platform.OS === 'ios') {
    // No-ops when the native module is missing (Expo Go / an older dev client).
    const { ExtensionStorage } = require('@bacons/apple-targets') as typeof import('@bacons/apple-targets')
    new ExtensionStorage(WIDGET_APP_GROUP).set(WIDGET_SNAPSHOT_KEY, json)
    ExtensionStorage.reloadWidget()
    return
  }
  if (Platform.OS === 'android') {
    await AsyncStorage.setItem(ANDROID_SNAPSHOT_KEY, json)
    const { refreshAndroidWidgets } = require('../../widgets/android/refresh') as typeof import('../../widgets/android/refresh')
    await refreshAndroidWidgets(json)
  }
}
