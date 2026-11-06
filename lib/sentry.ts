/**
 * Crash reporting. Imported first thing by app/_layout.tsx — the app's real entry is
 * expo-router/entry, so the old Sentry.init in App.tsx (an unused Expo template) never ran and
 * production crashes went unreported.
 *
 * Health app: no default PII, no session replay (screens show health data). Off in dev.
 */
import * as Sentry from '@sentry/react-native'

const DSN = 'https://d6bd4c3ae2c4ae8e8b39838901b7115e@o4511431517667328.ingest.us.sentry.io/4511431527104512'

Sentry.init({
  dsn: DSN,
  enabled: !__DEV__,
  sendDefaultPii: false,
  tracesSampleRate: 0,
})

export function reportError(error: unknown, context?: Record<string, unknown>) {
  if (__DEV__) return
  Sentry.captureException(error, context ? { extra: context } : undefined)
}

export { Sentry }
