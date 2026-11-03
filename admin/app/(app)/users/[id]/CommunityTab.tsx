"use client"
import { useLocale, useTranslations } from "next-intl"
import { MessageSquare } from "lucide-react"
import { trpc } from "@/lib/trpc"
import { htmlLang, type Locale } from "@/i18n/config"
import { type Profile, num, fmtDate } from "./user360"
import { Card, Kpi, ErrorState, LoadingState, EmptyState } from "./parts"

/**
 * Comunidade — post totals, a 12-week cadence strip and the latest posts from
 * `users.community`. Comments/points come from the already-loaded profile.
 */
export function CommunityTab({ userId, profile, active }: { userId: string; profile: Profile; active: boolean }) {
  const t = useTranslations("users.detail.community")
  const lang = htmlLang(useLocale() as Locale)
  const q = trpc.users.community.useQuery({ userId }, { enabled: active, staleTime: 60_000, retry: 1 })

  if (q.isError) return <ErrorState what="community" onRetry={() => q.refetch()} />
  if (q.isLoading || !q.data) return <LoadingState rows={3} />

  const d = q.data
  const maxWeek = Math.max(1, ...d.weekly.map((w) => w.count))

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Kpi label={t("posts")} value={d.total} sub={d.lastAt ? `${t("lastPost")}: ${fmtDate(d.lastAt, lang)}` : undefined} />
        <Kpi label={t("last30")} value={d.last30} />
        <Kpi label={t("comments")} value={num(profile, "comments_count")} />
        <Kpi label={t("points")} value={num(profile, "total_points")} />
      </div>

      {d.total === 0 ? (
        <EmptyState>{t("empty")}</EmptyState>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card title={t("weekly")}>
            <div className="flex h-28 items-end gap-1.5">
              {d.weekly.map((w) => (
                <div key={w.week} className="flex flex-1 flex-col items-center gap-1" title={`${fmtDate(`${w.week}T12:00:00`, lang)} · ${w.count}`}>
                  <div className="w-full rounded-t bg-[var(--chart-2)]" style={{ height: `${Math.max((w.count / maxWeek) * 96, w.count ? 4 : 1)}px`, opacity: w.count ? 1 : 0.25 }} />
                </div>
              ))}
            </div>
            <p className="mt-2 text-xs text-fg-muted">
              {t("firstPost")}: {fmtDate(d.firstAt, lang)}
            </p>
          </Card>

          <Card title={t("recent")}>
            <ul className="divide-y divide-border-subtle">
              {d.recent.map((p) => (
                <li key={p.id} className="flex items-center gap-2 py-2 text-sm">
                  <MessageSquare className="size-3.5 text-fg-muted" aria-hidden />
                  <span className="text-fg-primary">{new Date(p.at).toLocaleString(lang, { dateStyle: "medium", timeStyle: "short" })}</span>
                  <span className="ml-auto font-mono text-[10px] text-fg-muted">{p.id.slice(0, 8)}</span>
                </li>
              ))}
            </ul>
            <p className="mt-2 text-[11px] text-fg-muted">{t("contentNote")}</p>
          </Card>
        </div>
      )}
    </div>
  )
}
