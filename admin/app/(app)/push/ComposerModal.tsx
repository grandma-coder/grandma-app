"use client"
import { useState } from "react"
import { trpc, type RouterOutputs } from "@/lib/trpc"

type CampaignRow = RouterOutputs["push"]["list"][number]

const CATEGORIES = [
  { value: "broadcast", label: "Broadcast (marketing)" },
  { value: "insights", label: "Insights" },
  { value: "appointments", label: "Appointments" },
  { value: "cycle", label: "Cycle" },
  { value: "milestones", label: "Milestones" },
  { value: "care_circle", label: "Care circle" },
  { value: "reminder", label: "Reminder" },
] as const

type Category = (typeof CATEGORIES)[number]["value"]

/** Local datetime <input> value → ISO string (or null). */
function toIso(local: string): string | null {
  if (!local) return null
  const d = new Date(local)
  return Number.isNaN(d.getTime()) ? null : d.toISOString()
}
/** ISO / Date → value for <input type="datetime-local"> (local tz). */
function toLocalInput(iso: string | Date | null): string {
  if (!iso) return ""
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ""
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function ComposerModal({
  editRow,
  onClose,
  onSaved,
}: {
  editRow: CampaignRow | null
  onClose: () => void
  onSaved: () => void
}) {
  const [title, setTitle] = useState(editRow?.title ?? "")
  const [body, setBody] = useState(editRow?.body ?? "")
  const [category, setCategory] = useState<Category>((editRow?.category as Category) ?? "broadcast")
  const [deepLink, setDeepLink] = useState(editRow?.deepLink ?? "")
  const [scheduleOn, setScheduleOn] = useState(Boolean(editRow?.scheduledAt))
  const [scheduledLocal, setScheduledLocal] = useState(toLocalInput(editRow?.scheduledAt ?? null))
  const [error, setError] = useState<string | null>(null)

  // AI suggest
  const [showSuggest, setShowSuggest] = useState(false)
  const [brief, setBrief] = useState("")
  const [lastTitles, setLastTitles] = useState<string[]>([])

  const deepLinks = trpc.push.deepLinks.useQuery()
  const settings = trpc.notificationCopy.getSettings.useQuery()
  const suggestAvailable = settings.data?.suggestAvailable ?? false

  const create = trpc.push.createCampaign.useMutation()
  const update = trpc.push.updateCampaign.useMutation()
  const createAndSend = trpc.push.createAndSend.useMutation()
  const send = trpc.push.sendCampaign.useMutation()
  const suggest = trpc.notificationCopy.suggest.useMutation()

  const busy = create.isPending || update.isPending || createAndSend.isPending || send.isPending
  const canSubmit = title.trim().length > 0 && body.trim().length > 0 && !busy
  const isEdit = Boolean(editRow)

  async function runSuggest() {
    setError(null)
    try {
      const res = await suggest.mutateAsync({
        brief: brief.trim() || title.trim() || "A gentle notification for Grandma users",
        excludeTitles: lastTitles.slice(-5),
      })
      if (!res.available) {
        setError("AI copy isn't configured — set ANTHROPIC_API_KEY to enable Suggest.")
        return
      }
      setTitle(res.title)
      setBody(res.body)
      setLastTitles((prev) => [...prev, res.title])
    } catch (e) {
      setError(e instanceof Error ? e.message : "Suggest failed")
    }
  }

  async function saveDraftOrSchedule() {
    setError(null)
    const scheduledAt = scheduleOn ? toIso(scheduledLocal) : null
    if (scheduleOn && !scheduledAt) {
      setError("Pick a valid date & time to schedule.")
      return
    }
    const payload = {
      title: title.trim(),
      body: body.trim(),
      category,
      deepLink: deepLink || undefined,
      targetType: "all" as const,
      targetUserIds: [],
      scheduledAt,
    }
    try {
      if (isEdit && editRow) {
        await update.mutateAsync({ campaignId: editRow.id, ...payload })
      } else {
        await create.mutateAsync(payload)
      }
      onSaved()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed")
    }
  }

  async function saveAndSend() {
    setError(null)
    const payload = {
      title: title.trim(),
      body: body.trim(),
      category,
      deepLink: deepLink || undefined,
      targetType: "all" as const,
      targetUserIds: [],
    }
    try {
      if (isEdit && editRow) {
        // Revert schedule and send the existing row now.
        await update.mutateAsync({ campaignId: editRow.id, ...payload, scheduledAt: null })
        await send.mutateAsync({ campaignId: editRow.id })
      } else {
        await createAndSend.mutateAsync(payload)
      }
      onSaved()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Send failed")
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-border-default bg-card p-6 shadow-[var(--shadow-xl)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-1 flex items-start justify-between">
          <h2 className="display text-lg font-semibold text-fg-primary">
            {isEdit ? "Edit notification" : "New push notification"}
          </h2>
          <button onClick={onClose} className="text-fg-muted hover:text-fg-primary" aria-label="Close">
            ✕
          </button>
        </div>
        <p className="mb-4 text-sm text-fg-tertiary">Create a push notification to send to app users.</p>

        {/* Title */}
        <div className="mb-3">
          <div className="mb-1 flex items-center justify-between">
            <label className="text-xs font-medium text-fg-tertiary">Title ({title.length}/120)</label>
            {suggestAvailable && (
              <button
                onClick={() => setShowSuggest((v) => !v)}
                className="text-xs font-medium text-accent-500 hover:underline"
              >
                ✨ Suggest with AI
              </button>
            )}
          </div>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={120}
            placeholder="e.g. New this week ✨"
            className="w-full rounded-lg border border-border-default bg-deep px-3 py-2 text-sm text-fg-primary placeholder:text-fg-muted focus:border-accent-400 focus:outline-none"
          />
        </div>

        {/* AI suggest panel */}
        {showSuggest && suggestAvailable && (
          <div className="mb-3 rounded-lg border border-border-subtle bg-deep p-3">
            <label className="mb-1 block text-xs font-medium text-fg-tertiary">What&apos;s this about?</label>
            <textarea
              value={brief}
              onChange={(e) => setBrief(e.target.value)}
              rows={2}
              placeholder="e.g. Remind pregnant users to log this week's weight"
              className="w-full rounded-lg border border-border-default bg-card px-3 py-2 text-sm text-fg-primary placeholder:text-fg-muted focus:border-accent-400 focus:outline-none"
            />
            <button
              onClick={runSuggest}
              disabled={suggest.isPending}
              className="mt-2 rounded-full bg-accent-500 px-4 py-1.5 text-xs font-medium text-white disabled:opacity-50"
            >
              {suggest.isPending ? "Drafting…" : lastTitles.length ? "Try another" : "Draft copy"}
            </button>
          </div>
        )}

        {/* Body */}
        <div className="mb-3">
          <label className="mb-1 block text-xs font-medium text-fg-tertiary">Body ({body.length}/400)</label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            maxLength={400}
            rows={3}
            placeholder="The notification message users will see…"
            className="w-full rounded-lg border border-border-default bg-deep px-3 py-2 text-sm text-fg-primary placeholder:text-fg-muted focus:border-accent-400 focus:outline-none"
          />
        </div>

        {/* Category (consent gate) */}
        <div className="mb-3">
          <label className="mb-1 block text-xs font-medium text-fg-tertiary">Category (consent gate)</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as Category)}
            className="w-full rounded-lg border border-border-default bg-deep px-3 py-2 text-sm text-fg-secondary focus:border-accent-400 focus:outline-none"
          >
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>

        {/* Deep link */}
        <div className="mb-3">
          <label className="mb-1 block text-xs font-medium text-fg-tertiary">
            Deep link <span className="font-normal text-fg-muted">(optional — where to navigate on tap)</span>
          </label>
          <select
            value={deepLink}
            onChange={(e) => setDeepLink(e.target.value)}
            className="w-full rounded-lg border border-border-default bg-deep px-3 py-2 text-sm text-fg-secondary focus:border-accent-400 focus:outline-none"
          >
            {(deepLinks.data ?? [{ value: "", label: "None" }]).map((d) => (
              <option key={d.value} value={d.value}>
                {d.label}
              </option>
            ))}
          </select>
        </div>

        {/* Schedule */}
        <div className="mb-4">
          <label className="flex items-center gap-2 text-sm text-fg-secondary">
            <input type="checkbox" checked={scheduleOn} onChange={(e) => setScheduleOn(e.target.checked)} />
            Schedule for later
          </label>
          {scheduleOn && (
            <input
              type="datetime-local"
              value={scheduledLocal}
              onChange={(e) => setScheduledLocal(e.target.value)}
              className="mt-2 w-full rounded-lg border border-border-default bg-deep px-3 py-2 text-sm text-fg-primary focus:border-accent-400 focus:outline-none"
            />
          )}
        </div>

        {error && <p className="mb-3 text-sm text-[var(--pill-danger-fg)]">{error}</p>}

        {/* Footer */}
        <div className="flex items-center justify-end gap-2">
          <button onClick={onClose} className="rounded-lg px-4 py-2 text-sm font-medium text-fg-tertiary hover:text-fg-primary">
            Cancel
          </button>
          {!scheduleOn && (
            <button
              onClick={saveAndSend}
              disabled={!canSubmit}
              className="rounded-lg border border-border-default px-4 py-2 text-sm font-medium text-fg-primary hover:border-accent-400 disabled:opacity-40"
            >
              {busy ? "Sending…" : "Save & send now"}
            </button>
          )}
          <button
            onClick={saveDraftOrSchedule}
            disabled={!canSubmit}
            className="rounded-lg bg-accent-500 px-4 py-2 text-sm font-medium text-white hover:bg-accent-600 disabled:opacity-40"
          >
            {scheduleOn ? "Schedule" : "Save draft"}
          </button>
        </div>
      </div>
    </div>
  )
}
