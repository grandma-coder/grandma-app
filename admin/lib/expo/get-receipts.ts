import "server-only"
import { isTerminalTokenError } from "./types"

const RECEIPTS_ENDPOINT = "https://exp.host/--/api/v2/push/getReceipts"
const CHUNK = 300 // Expo accepts up to 1000 receipt ids per request; 300 is safe.

/** One Expo delivery receipt, normalized. */
export interface ExpoReceipt {
  ticketId: string
  status: "ok" | "error"
  error: string | null // e.g. DeviceNotRegistered, MessageTooBig
  /** True when the error means the token is permanently dead (deactivate it). */
  terminal: boolean
}

interface RawReceipt {
  status?: string
  message?: string
  details?: { error?: string }
}

/**
 * Fetch Expo push RECEIPTS for a set of ticket ids. Receipts confirm actual
 * delivery to APNs/FCM (a send ticket only says Expo accepted the message).
 * Available a few minutes after send; ids not yet ready simply aren't returned.
 * NEVER throws — a failed chunk yields no receipts for its ids (they stay
 * pending and get retried next poll).
 */
export async function getPushReceipts(ticketIds: string[]): Promise<ExpoReceipt[]> {
  const token = process.env.EXPO_ACCESS_TOKEN
  const out: ExpoReceipt[] = []

  for (let i = 0; i < ticketIds.length; i += CHUNK) {
    const ids = ticketIds.slice(i, i + CHUNK)
    try {
      const res = await fetch(RECEIPTS_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ ids }),
      })
      const json = (await res.json().catch(() => ({}))) as { data?: Record<string, RawReceipt> }
      const data = json.data ?? {}
      for (const [ticketId, r] of Object.entries(data)) {
        const status = r.status === "ok" ? "ok" : "error"
        const error = status === "error" ? r.details?.error ?? r.message ?? "error" : null
        out.push({ ticketId, status, error, terminal: status === "error" && isTerminalTokenError(r.details?.error) })
      }
    } catch (err) {
      console.error("[push] receipt fetch failed", err)
      // Leave this chunk's ids unprocessed — retried on the next poll.
    }
  }
  return out
}
