import React from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import type { WidgetInfo } from 'react-native-android-widget'
import { toDateStr } from '../../lib/cycleLogic'
import { ANDROID_SNAPSHOT_KEY } from '../../lib/widgets/storage'
import { GrandmaWidget, sizeFor } from './GrandmaWidget'
import { resolveEntry } from './resolve'

export const configKey = (widgetId: number) => `grandma-widget-config:${widgetId}`

export async function renderGrandmaWidget(info: WidgetInfo, json?: string | null) {
  const [snapshot, chosen] = await Promise.all([
    json !== undefined ? Promise.resolve(json) : AsyncStorage.getItem(ANDROID_SNAPSHOT_KEY),
    AsyncStorage.getItem(configKey(info.widgetId)),
  ])
  const resolved = resolveEntry(snapshot, chosen, toDateStr(new Date()))
  return <GrandmaWidget resolved={resolved} size={sizeFor(info.width, info.height)} />
}
