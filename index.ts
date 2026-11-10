// App entry: expo-router, plus the Android home-screen widget's headless task and config screen.
import 'expo-router/entry'
import { Platform } from 'react-native'

if (Platform.OS === 'android') {
  const { registerWidgetTaskHandler, registerWidgetConfigurationScreen } = require('react-native-android-widget')
  const { widgetTaskHandler } = require('./widgets/android/taskHandler')
  const { WidgetConfigScreen } = require('./widgets/android/ConfigScreen')
  registerWidgetTaskHandler(widgetTaskHandler)
  registerWidgetConfigurationScreen(WidgetConfigScreen)
}
