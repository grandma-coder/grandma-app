// Expo Push API shared types. Terminal token errors mean the token is
// permanently dead and should be deactivated (mirrors Aura's push types).
//
// NOTE: InvalidCredentials is deliberately EXCLUDED. It signals a project-wide
// APNs/FCM credentials misconfig (the whole batch fails), NOT a dead device —
// deactivating on it would wrongly kill every token when creds are simply
// wrong. Fix the credentials and the same tokens work again. Only these three
// codes mean "this specific device is gone."
export const TERMINAL_TOKEN_ERRORS = [
  "DeviceNotRegistered",
  "InvalidPushToken",
  "MismatchSenderId",
] as const

export function isTerminalTokenError(code?: string | null): boolean {
  return !!code && (TERMINAL_TOKEN_ERRORS as readonly string[]).includes(code)
}

export interface ExpoMessage {
  to: string
  title: string
  body: string
  data?: Record<string, unknown>
}

export interface ExpoTicket {
  status: "ok" | "error"
  id?: string
  message?: string
  details?: { error?: string }
}

export interface SendResult {
  /** One ticket per message, in order. */
  tickets: ExpoTicket[]
  /** Tokens Expo reported as permanently dead — caller should deactivate. */
  terminalTokens: string[]
  okCount: number
  errorCount: number
}
