"use client"
import { useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import { Baby, Droplet, HeartPulse, MessageSquare, UserPlus, Sprout, Smartphone, Sparkles, type LucideIcon } from "lucide-react"
import { trpc, type RouterOutputs } from "@/lib/trpc"
import { htmlLang, type Locale } from "@/i18n/config"
import { groupByDay, dayKey, relativeDay } from "./user360"
import { Card, ErrorState, LoadingState, EmptyState } from "./parts"

type TimelineEvent = RouterOutputs["users"]["timeline"]["events"][number]

const PAGE = 50

const KIND_ICON: Record<TimelineEvent["kind"], LucideIcon> = {
  child_log: Baby,
  cycle_log: Droplet,
  pregnancy_log: HeartPulse,
  post: MessageSquare,
  child_added: UserPlus,
  phase_started: Sprout,
  device_registered: Smartphone,
  joined: Sparkles,
}

/**
 * Atividade — the merged `users.timeline`, grouped by local day. The first page
 * is a regular query (cached, retryable); "carregar mais" pages are fetched
 * imperatively off the `nextBefore` cursor and appended, each with its own
 * loading/error so a failed page never hides what's already on screen.
 */
export function ActivityTab({ userId, active }: { userId: string; active: boolean }) {
  const t = useTranslations("users")
  const lang = htmlLang(useLocale() as Locale)
  const label = (ns: string, v: string) => (t.has(`${ns}.${v}`) ? t(`${ns}.${v}`) : v)
  const utils = trpc.useUtils()
  const first = trpc.users.timeline.useQuery({ userId, limit: PAGE }, { enabled: active, staleTime: 60_000, refetchOnWindowFocus: false, retry: 1 })

  const [more, setMore] = useState<{ events: TimelineEvent[]; next: string | null } | null>(null)
  const [moreState, setMoreState] = useState<"idle" | "loading" | "error">("idle")

  if (first.isError) return <ErrorState what="timeline" onRetry={() => first.refetch()} />
  if (first.isLoading || !first.data) return <LoadingState rows={5} />

  const events = [...first.data.events, ...(more?.events ?? [])]
  const next = more ? more.next : first.data.nextBefore

  async function loadMore() {
    if (!next) return
    setMoreState("loading")
    try {
      const page = await utils.users.timeline.fetch({ userId, limit: PAGE, before: next })
      setMore((m) => ({ events: [...(m?.events ?? []), ...page.events], next: page.nextBefore }))
      setMoreState("idle")
    } catch {
      setMoreState("error")
    }
  }

  if (events.length === 0) return <EmptyState>{t("detail.timeline.empty")}</EmptyState>

  const today = dayKey(new Date().toISOString())
  const groups = groupByDay(events)
  const dayTitle = (day: string) => {
    const rel = relativeDay(day, today)
    if (rel) return t(`detail.timeline.${rel}`)
    return new Date(`${day}T12:00:00`).toLocaleDateString(lang, { weekday: "short", day: "numeric", month: "long", year: "numeric" })
  }

  return (
    <Card title={t("detail.timeline.heading")} aside={<span className="text-xs text-fg-muted">{t("detail.timeline.count", { n: events.length })}{next ? "+" : ""}</span>}>
      <p className="-mt-2 mb-5 text-xs text-fg-muted">{t("detail.timeline.sub")}</p>
      <ol className="space-y-6">
        {groups.map((g) => (
          <li key={g.day}>
            <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.1em] text-fg-muted">{dayTitle(g.day)}</p>
            <ul className="relative space-y-1 border-l border-border-subtle pl-5">
              {g.events.map((e, i) => {
                const Icon = KIND_ICON[e.kind] ?? Sparkles
                const detail = e.detail ? (e.kind === "phase_started" ? label("journeyMode", e.detail) : e.detail) : null
                return (
                  <li key={`${e.at}-${e.kind}-${i}`} className="relative flex items-center gap-3 py-1.5 text-sm">
                    <span className="absolute -left-[31px] flex size-5 items-center justify-center rounded-full border border-border-default bg-card text-fg-secondary">
                      <Icon className="size-3" aria-hidden />
                    </span>
                    <span className="w-12 shrink-0 font-mono text-xs tabular-nums text-fg-muted">
                      {new Date(e.at).toLocaleTimeString(lang, { hour: "2-digit", minute: "2-digit" })}
                    </span>
                    <span className="text-fg-primary">{t(`detail.timeline.kind.${e.kind}`)}</span>
                    {detail && <span className="truncate text-fg-tertiary">· {detail}</span>}
                  </li>
                )
              })}
            </ul>
          </li>
        ))}
      </ol>

      <div className="mt-5 border-t border-border-subtle pt-4">
        {moreState === "error" ? (
          <ErrorState what="more" onRetry={loadMore} compact />
        ) : next ? (
          <button
            onClick={loadMore}
            disabled={moreState === "loading"}
            className="w-full rounded-lg border border-border-default bg-card px-3 py-2 text-xs font-medium text-fg-secondary hover:text-fg-primary disabled:opacity-50"
          >
            {moreState === "loading" ? t("detail.timeline.loadingMore") : t("detail.timeline.loadMore")}
          </button>
        ) : (
          <p className="text-center font-mono text-[10px] uppercase tracking-[0.1em] text-fg-muted">{t("detail.timeline.end")}</p>
        )}
      </div>
    </Card>
  )
}
