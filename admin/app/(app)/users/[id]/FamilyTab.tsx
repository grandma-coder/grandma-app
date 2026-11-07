"use client"
import { useLocale, useTranslations } from "next-intl"
import { Baby, HeartPulse } from "lucide-react"
import { trpc } from "@/lib/trpc"
import { htmlLang, type Locale } from "@/i18n/config"
import { fmtDate, childAge, pregnancyProgress } from "./user360"
import { MODE_DOT } from "./HeaderStrip"
import { Card, ErrorState, LoadingState, EmptyState } from "./parts"

/** Família — children (age, log count, last log) and the pregnancy due date, from `users.family`. */
export function FamilyTab({ userId, active }: { userId: string; active: boolean }) {
  const t = useTranslations("users.detail.family")
  const lang = htmlLang(useLocale() as Locale)
  const q = trpc.users.family.useQuery({ userId }, { enabled: active, staleTime: 60_000, retry: 1 })

  if (q.isError) return <ErrorState what="family" onRetry={() => q.refetch()} />
  if (q.isLoading || !q.data) return <LoadingState rows={3} />

  const { children, dueDate } = q.data
  const preg = pregnancyProgress(dueDate)

  const ageText = (birth: string | null) => {
    const a = childAge(birth)
    if (!a) return t("noBirthDate")
    if (a.years === 0 && a.months === 0) return t("newborn")
    return [a.years ? t("ageYears", { n: a.years }) : null, a.months ? t("ageMonths", { n: a.months }) : null].filter(Boolean).join(" · ")
  }

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card title={t("children")} className="lg:col-span-2">
        {children.length === 0 ? (
          <EmptyState>{t("noChildren")}</EmptyState>
        ) : (
          <ul className="divide-y divide-border-subtle">
            {children.map((c) => (
              <li key={c.id} className="flex items-center gap-3 py-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-deep text-fg-secondary">
                  <Baby className="size-4" aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-fg-primary">{c.name || t("unnamed")}</p>
                  <p className="text-xs text-fg-tertiary">
                    {ageText(c.birthDate)}
                    {c.birthDate && <span className="text-fg-muted"> · {t("born", { date: fmtDate(`${c.birthDate}T12:00:00`, lang) })}</span>}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-xs tabular-nums text-fg-secondary">{c.logsCount ? t("logs", { n: c.logsCount }) : t("noLogs")}</p>
                  {c.lastLogAt && <p className="text-[11px] text-fg-muted">{t("lastLog", { date: fmtDate(c.lastLogAt, lang) })}</p>}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card title={t("pregnancy")}>
        {!dueDate ? (
          <EmptyState>{t("noPregnancy")}</EmptyState>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <HeartPulse className="size-4 text-fg-secondary" aria-hidden />
              <span className="text-sm text-fg-tertiary">{t("dueDate")}</span>
              <span className="ml-auto text-sm font-medium text-fg-primary">{fmtDate(`${dueDate}T12:00:00`, lang)}</span>
            </div>
            {preg ? (
              <>
                <p className="display text-2xl font-bold text-fg-primary">{t("week", { n: preg.week })}</p>
                <div className="h-2 overflow-hidden rounded-full bg-deep">
                  <div className="h-full rounded-full" style={{ width: `${Math.min(100, (preg.week / 40) * 100)}%`, background: MODE_DOT.pregnancy }} />
                </div>
                <p className="text-xs text-fg-tertiary">{preg.daysLeft >= 0 ? t("daysLeft", { n: preg.daysLeft }) : t("overdue", { n: -preg.daysLeft })}</p>
              </>
            ) : (
              <p className="text-xs text-fg-muted">{t("pastDue")}</p>
            )}
          </div>
        )}
      </Card>
    </div>
  )
}
