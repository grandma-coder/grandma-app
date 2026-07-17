import "server-only"
import { db } from "@/db"
import { adminAuditLog } from "@/db/schema"

export interface AuditEntry {
  actorEmail: string
  action: string
  target?: string | null
  meta?: Record<string, unknown> | null
}

/**
 * Append one row to admin_audit_log. Called on every PII view and every push
 * send. Best-effort: a logging failure must never break the operation it's
 * recording (nor mask its result), so this swallows errors after logging them.
 *
 * Returns true if the row was written, false if the write failed.
 */
export async function writeAudit(entry: AuditEntry): Promise<boolean> {
  try {
    await db.insert(adminAuditLog).values({
      actorEmail: entry.actorEmail,
      action: entry.action,
      target: entry.target ?? null,
      meta: entry.meta ?? null,
    })
    return true
  } catch (err) {
    console.error("[audit] failed to write audit row", { action: entry.action, err })
    return false
  }
}
