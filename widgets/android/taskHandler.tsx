import AsyncStorage from '@react-native-async-storage/async-storage'
import type { WidgetTaskHandlerProps } from 'react-native-android-widget'
import { configKey, renderGrandmaWidget } from './render'

/** Runs headless when Android adds, updates (every 30 min), resizes or removes a Grandma widget. */
export async function widgetTaskHandler({ widgetInfo, widgetAction, renderWidget }: WidgetTaskHandlerProps): Promise<void> {
  if (widgetAction === 'WIDGET_DELETED') {
    await AsyncStorage.removeItem(configKey(widgetInfo.widgetId))
    return
  }
  if (widgetAction === 'WIDGET_CLICK') return // every click is OPEN_URI / OPEN_APP, handled natively
  renderWidget(await renderGrandmaWidget(widgetInfo))
}
