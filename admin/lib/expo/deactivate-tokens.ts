import "server-only"
import { inArray } from "drizzle-orm"
import { db } from "@/db"
import { pushTokens } from "@/db/schema"

/**
 * Flip dead tokens to is_active=false, in chunks of 100 (keeps the IN() list
 * small). Called after a send with the terminalTokens Expo reported. Best-effort
 * — a pruning failure must not fail the send it followed.
 */
export async function deactivateTokens(tokens: string[]): Promise<number> {
  if (tokens.length === 0) return 0
  let flipped = 0
  for (let i = 0; i < tokens.length; i += 100) {
    const chunk = tokens.slice(i, i + 100)
    try {
      await db.update(pushTokens).set({ isActive: false }).where(inArray(pushTokens.token, chunk))
      flipped += chunk.length
    } catch (err) {
      console.error("[push] deactivate chunk failed", err)
    }
  }
  return flipped
}
