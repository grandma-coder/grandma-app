// @ts-nocheck — Deno Edge Function (URL imports, Deno globals; not type-checked by the app's tsconfig).
// Shared support-ticket writer for edge functions.
//
// Inserts one row into `support_tickets` (owned by the command center's
// migrations) so a user's in-app feedback / bug report / question / review
// lands in the Support inbox. Fire-and-forget on the logging side, but returns
// the inserted id so a "submit-feedback" function can confirm to the app.
//
// Usage inside an edge function (which has a service-role supabase client):
//
//   import { createSupportTicket } from '../_shared/supportTicket.ts'
//   const id = await createSupportTicket(supabase, {
//     userId,                       // authenticated caller (or null)
//     email,
//     kind: 'bug',                  // feedback | bug | question | review
//     subject,
//     message,                      // required
//     rating,                       // 1–5 for a review
//     appVersion, platform,         // 'ios' | 'android'
//   })

interface InsertableClient {
  from(table: string): {
    insert(rows: unknown): {
      select(cols?: string): { single(): Promise<{ data: { id: string } | null; error: unknown }> }
    }
  }
}

export interface SupportTicketInput {
  userId?: string | null
  email?: string | null
  kind?: "feedback" | "bug" | "question" | "review"
  subject?: string | null
  message: string
  priority?: "low" | "normal" | "high"
  rating?: number | null
  appVersion?: string | null
  platform?: string | null
}

export async function createSupportTicket(client: InsertableClient, input: SupportTicketInput): Promise<string | null> {
  try {
    const { data, error } = await client
      .from("support_tickets")
      .insert({
        user_id: input.userId ?? null,
        email: input.email ?? null,
        kind: input.kind ?? "feedback",
        subject: input.subject ?? null,
        message: input.message,
        priority: input.priority ?? "normal",
        source: "in_app",
        rating: input.rating ?? null,
        app_version: input.appVersion ?? null,
        platform: input.platform ?? null,
      })
      .select("id")
      .single()
    if (error) {
      console.error("[supportTicket] insert failed", error)
      return null
    }
    return data?.id ?? null
  } catch (err) {
    console.error("[supportTicket] error", err)
    return null
  }
}
