/**
 * Keeps home-screen widgets and icon shortcuts current: publishes when the app starts, goes to
 * the background, switches journey/child/language, changes cycle or pregnancy settings, and
 * after any log is saved, edited or deleted (every save path refetches one of LOG_QUERY_ROOTS).
 */
import { useEffect } from 'react'
import { AppState } from 'react-native'
import { queryClient } from '../lib/queryClient'
import { publishNow, publishWidgets } from '../lib/widgets/publish'
import { useModeStore } from '../store/useModeStore'
import { useChildStore } from '../store/useChildStore'
import { useLanguageStore } from '../store/useLanguageStore'
import { usePregnancyStore } from '../store/usePregnancyStore'
import { useCycleSettingsStore } from '../store/useCycleSettingsStore'
import { useMenopauseStore } from '../store/useMenopauseStore'
import { useWidgetAssetStore } from '../store/useWidgetAssetStore'

const LOG_QUERY_ROOTS = new Set(['cycleLogs', 'kids-today-logs', 'menopause-logs', 'profile'])

export function isWidgetRelevantQuery(key: readonly unknown[]): boolean {
  const root = String(key[0] ?? '')
  return LOG_QUERY_ROOTS.has(root) || root.startsWith('pregnancy') || root.startsWith('kids') || root.startsWith('child')
}

export function useWidgetPublisher(enabled: boolean): void {
  useEffect(() => {
    if (!enabled) return
    publishWidgets('start')
    const subs = [
      useModeStore.subscribe((s, p) => { if (s.mode !== p.mode) publishWidgets('mode') }),
      useChildStore.subscribe((s, p) => { if (s.activeChild?.id !== p.activeChild?.id || s.children !== p.children) publishWidgets('child') }),
      useLanguageStore.subscribe((s, p) => { if (s.language !== p.language) publishWidgets('language') }),
      usePregnancyStore.subscribe((s, p) => { if (s.dueDate !== p.dueDate) publishWidgets('dueDate') }),
      useCycleSettingsStore.subscribe((s, p) => { if (s.cycleLength !== p.cycleLength || s.periodLength !== p.periodLength) publishWidgets('cycleSettings') }),
      useMenopauseStore.subscribe((s, p) => { if (s.stage !== p.stage || s.lastPeriodDate !== p.lastPeriodDate) publishWidgets('menopause') }),
      useWidgetAssetStore.subscribe((s, p) => { if (s.fruitPng !== p.fruitPng) publishWidgets('fruit') }),
      queryClient.getQueryCache().subscribe((ev) => {
        if (ev.type === 'updated' && ev.action.type === 'success' && isWidgetRelevantQuery(ev.query.queryKey)) publishWidgets('logs')
      }),
    ]
    const app = AppState.addEventListener('change', (state) => { if (state === 'background') void publishNow() /* timers may not fire once suspended */ })
    return () => {
      subs.forEach((unsub) => unsub())
      app.remove()
    }
  }, [enabled])
}
