"use client"
import { useState } from "react"
import { trpc } from "@/lib/trpc"

const CATEGORIES = [
  { value: "broadcast", label: "Broadcast (marketing)" },
  { value: "insights", label: "Insights" },
  { value: "appointments", label: "Appointments" },
  { value: "cycle", label: "Cycle" },
  { value: "milestones", label: "Milestones" },
  { value: "care_circle", label: "Care circle" },
  { value: "reminder", label: "Reminder" },
] as const

function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    sent: "pill-success",
    sending: "pill-info",
    draft: "pill-info",
    failed: "pill-danger",
  }
  return <span className={`pill ${map[status] ?? "pill-info"}`}>{status}</span>
}

export function PushConsole({ isAdmin }: { isAdmin: boolean }) {
  const utils = trpc.useUtils()
  const campaigns = trpc.push.list.useQuery()

  const [title, setTitle] = useState("")
  const [body, setBody] = useState("")
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]["value"]>("broadcast")
  const [notice, setNotice] = useState<string | null>(null)

  const create = trpc.push.createCampaign.useMutation()
  const send = trpc.push.sendCampaign.useMutation()

  async function composeAndSend() {
    setNotice(null)
    try {
      const campaign = await create.mutateAsync({ title, body, category, targetType: "all", targetUserIds: [] })
      const res = await send.mutateAsync({ campaignId: campaign.id })
      setNotice(`Sent to ${res.sent} · ${res.skipped} opted out · ${res.failed} failed`)
      setTitle("")
      setBody("")
      await utils.push.list.invalidate()
    } catch (e) {
      setNotice(`Error: ${e instanceof Error ? e.message : "failed"}`)
    }
  }

  const busy = create.isPending || send.isPending

  return (
    <div className="space-y-8">
      {isAdmin && (
        <section className="rounded-xl border border-border-default bg-card p-5 shadow-[var(--shadow-sm)]">
          <h2 className="display mb-4 text-base font-semibold text-fg-primary">Compose</h2>
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-fg-tertiary">Title</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={120}
                placeholder="e.g. New this week ✨"
                className="w-full rounded-lg border border-border-default bg-card px-3 py-2 text-sm text-fg-primary placeholder:text-fg-muted focus:border-accent-400 focus:outline-none"
              />
              <p className="mt-0.5 text-right text-[10px] text-fg-muted">{title.length}/120</p>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-fg-tertiary">Body</label>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                maxLength={400}
                rows={3}
                placeholder="Message body…"
                className="w-full rounded-lg border border-border-default bg-card px-3 py-2 text-sm text-fg-primary placeholder:text-fg-muted focus:border-accent-400 focus:outline-none"
              />
              <p className="mt-0.5 text-right text-[10px] text-fg-muted">{body.length}/400</p>
            </div>
            <div className="flex items-end gap-3">
              <div className="flex-1">
                <label className="mb-1 block text-xs font-medium text-fg-tertiary">Category (consent gate)</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as typeof category)}
                  className="w-full rounded-lg border border-border-default bg-card px-3 py-2 text-sm text-fg-secondary focus:border-accent-400 focus:outline-none"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>
              <button
                onClick={composeAndSend}
                disabled={busy || !title.trim() || !body.trim()}
                className="rounded-full bg-accent-500 px-5 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-40"
              >
                {busy ? "Sending…" : "Send to all"}
              </button>
            </div>
            <p className="text-xs text-fg-muted">
              Audience = all active devices whose owner hasn&apos;t opted out of this category
              ({category === "broadcast" ? "privacy_settings.marketing" : `notification_prefs.${category}`}).
              Opt-outs are skipped and counted.
            </p>
            {notice && <p className="text-sm text-accent-500">{notice}</p>}
          </div>
        </section>
      )}

      <section>
        <h2 className="display mb-3 text-base font-semibold text-fg-primary">Campaigns</h2>
        {campaigns.isLoading ? (
          <p className="text-sm text-fg-tertiary">Loading…</p>
        ) : campaigns.data && campaigns.data.length > 0 ? (
          <div className="overflow-x-auto rounded-xl border border-border-default bg-card shadow-[var(--shadow-sm)]">
            <table className="w-full text-sm">
              <thead className="border-b border-border-subtle bg-deep text-left text-fg-tertiary">
                <tr>
                  <th className="px-4 py-2.5 font-medium">Title</th>
                  <th className="px-4 py-2.5 font-medium">Category</th>
                  <th className="px-4 py-2.5 font-medium">Status</th>
                  <th className="px-4 py-2.5 font-medium">Sent</th>
                  <th className="px-4 py-2.5 font-medium">Opt-out</th>
                  <th className="px-4 py-2.5 font-medium">Failed</th>
                  <th className="px-4 py-2.5 font-medium">When</th>
                </tr>
              </thead>
              <tbody>
                {campaigns.data.map((c) => (
                  <tr key={c.id} className="border-t border-border-subtle text-fg-secondary">
                    <td className="px-4 py-2.5 text-fg-primary">{c.title}</td>
                    <td className="px-4 py-2.5">{c.category}</td>
                    <td className="px-4 py-2.5"><StatusPill status={c.status} /></td>
                    <td className="px-4 py-2.5 tabular-nums">{c.sentCount}</td>
                    <td className="px-4 py-2.5 tabular-nums">{c.skippedOptoutCount}</td>
                    <td className="px-4 py-2.5 tabular-nums">{c.failedCount}</td>
                    <td className="px-4 py-2.5">{c.sentAt ? new Date(c.sentAt).toLocaleString() : new Date(c.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-fg-muted">No campaigns yet.</p>
        )}
      </section>
    </div>
  )
}
