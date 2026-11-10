/** Shown when someone adds or reconfigures a Grandma widget: pick the journey or child it shows. */
import React, { useEffect, useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import type { WidgetConfigurationScreenProps } from 'react-native-android-widget'
import { ANDROID_SNAPSHOT_KEY } from '../../lib/widgets/storage'
import type { WidgetEntry } from '../../lib/widgets/types'
import { configKey, renderGrandmaWidget } from './render'
import { parseSnapshot } from './resolve'

export function WidgetConfigScreen({ widgetInfo, renderWidget, setResult }: WidgetConfigurationScreenProps) {
  const [entries, setEntries] = useState<WidgetEntry[] | null>(null)
  const [title, setTitle] = useState('Grandma')

  useEffect(() => {
    AsyncStorage.getItem(ANDROID_SNAPSHOT_KEY).then((json) => {
      const s = parseSnapshot(json)
      if (s && s !== 'outdated' && s.signedIn) setEntries(s.entries)
      else {
        setEntries([])
        if (s && s !== 'outdated') setTitle(s.strings.signIn)
      }
    })
  }, [])

  const choose = async (key: string) => {
    await AsyncStorage.setItem(configKey(widgetInfo.widgetId), key)
    renderWidget(await renderGrandmaWidget(widgetInfo))
    setResult('ok')
  }

  return (
    <View style={styles.root}>
      <Text style={styles.title}>{title}</Text>
      <ScrollView contentContainerStyle={styles.list}>
        {(entries ?? []).map((e) => (
          <Pressable key={e.key} style={styles.row} onPress={() => choose(e.key)} accessibilityRole="button">
            <Text style={styles.rowText}>{e.name}</Text>
          </Pressable>
        ))}
      </ScrollView>
      <Pressable style={styles.cancel} onPress={() => setResult('cancel')} accessibilityRole="button">
        <Text style={styles.cancelText}>✕</Text>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FBF6EA', paddingTop: 56, paddingHorizontal: 20 },
  title: { fontSize: 22, fontWeight: '700', color: '#161513', marginBottom: 16 },
  list: { gap: 10 },
  row: { borderWidth: 1.5, borderColor: '#161513', borderRadius: 16, paddingVertical: 14, paddingHorizontal: 16, backgroundColor: '#FFFFFF' },
  rowText: { fontSize: 17, color: '#161513', fontWeight: '600' },
  cancel: { position: 'absolute', top: 48, right: 20, padding: 8 },
  cancelText: { fontSize: 20, color: '#161513' },
})
