import "server-only"
import { isTerminalTokenError, type ExpoMessage, type ExpoTicket, type SendResult } from "./types"

const EXPO_ENDPOINT = "https://exp.host/--/api/v2/push/send"
const BATCH_SIZE = 100

/**
 * Send a batch of Expo push messages. Chunks into groups of 100 (Expo's cap),
 * parses tickets, and collects tokens Expo reports as permanently dead so the
 * caller can deactivate them. NEVER throws — safe to call from a job/route; a
 * failed chunk yields error tickets for its messages rather than aborting.
 */
export async function sendPushBatch(messages: ExpoMessage[]): Promise<SendResult> {
  const tickets: ExpoTicket[] = []
  const terminalTokens: string[] = []
  const token = process.env.EXPO_ACCESS_TOKEN

  for (let i = 0; i < messages.length; i += BATCH_SIZE) {
    const chunk = messages.slice(i, i + BATCH_SIZE)
    try {
      const res = await fetch(EXPO_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(chunk),
      })
      const json = (await res.json().catch(() => ({}))) as { data?: ExpoTicket[]; errors?: unknown }
      const chunkTickets: ExpoTicket[] = Array.isArray(json.data)
        ? json.data
        : chunk.map(() => ({ status: "error" as const, message: "no ticket returned" }))

      chunkTickets.forEach((tk, idx) => {
        tickets.push(tk)
        if (tk.status === "error" && isTerminalTokenError(tk.details?.error)) {
          terminalTokens.push(chunk[idx].to)
        }
      })
    } catch (err) {
      // Whole chunk failed to send — record error tickets, keep going.
      console.error("[push] chunk send failed", err)
      chunk.forEach(() => tickets.push({ status: "error", message: "network error" }))
    }
  }

  const okCount = tickets.filter((t) => t.status === "ok").length
  return { tickets, terminalTokens, okCount, errorCount: tickets.length - okCount }
}
