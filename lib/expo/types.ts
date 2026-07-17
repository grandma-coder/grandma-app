// Expo Push API shared types. Terminal token errors mean the token is
// permanently dead and should be deactivated (mirrors Aura's push types).

export const TERMINAL_TOKEN_ERRORS = [
  "DeviceNotRegistered",
  "InvalidCredentials",
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
