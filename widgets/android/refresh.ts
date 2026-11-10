import { requestWidgetUpdate } from 'react-native-android-widget'
import { renderGrandmaWidget } from './render'

/** Re-render every Grandma widget on the home screen from a new snapshot. */
export async function refreshAndroidWidgets(json: string): Promise<void> {
  await requestWidgetUpdate({ widgetName: 'Grandma', renderWidget: (info) => renderGrandmaWidget(info, json) })
}
