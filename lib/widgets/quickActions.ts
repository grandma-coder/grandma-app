/** App-icon shortcuts (long-press): the active journey's four logs plus the calendar. */
import { Platform } from 'react-native'
import { t } from '../i18n'
import type { WidgetSnapshot } from './types'

export interface QuickAction { id: string; title: string; params: { href: string } }

const SCHEME = 'grandma-app:/'

export function buildQuickActions(s: WidgetSnapshot, calendarLabel: string): QuickAction[] {
  if (!s.signedIn) return []
  const entry = s.entries.find((e) => e.key === s.activeKey)
  if (!entry) return []
  const logs = entry.buttons.map((b, i) => ({
    id: `log-${i}`,
    title: b.label,
    params: { href: b.url.startsWith(SCHEME) ? b.url.slice(SCHEME.length) : b.url },
  }))
  return [...logs, { id: 'calendar', title: calendarLabel, params: { href: '/(tabs)/agenda' } }]
}

export function setQuickActionsFor(snapshot: WidgetSnapshot): void {
  if (Platform.OS !== 'ios' && Platform.OS !== 'android') return
  try {
    const QuickActions = require('expo-quick-actions') as typeof import('expo-quick-actions')
    void QuickActions.setItems(buildQuickActions(snapshot, t('tab_calendar'))).catch(() => {})
  } catch {
    // Native module missing (older dev client) — shortcuts appear after the next native build.
  }
}
