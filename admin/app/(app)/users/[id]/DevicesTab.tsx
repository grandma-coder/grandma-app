"use client"
import { useLocale, useTranslations } from "next-intl"
import { Bell, Smartphone } from "lucide-react"
import { trpc, type RouterOutputs } from "@/lib/trpc"
import { htmlLang, type Locale } from "@/i18n/config"
import { type Profile, num, fmtDate } from "./user360"
import { Card, Eyebrow, ErrorState, LoadingState, EmptyState } from "./parts"

type Push = NonNullable<RouterOutputs["users"]["devices"]["pushes"]>[number]

/** Most-advanced state a push reached for this recipient. */
function pushState(p: Push): { key: "opened" | "delivered" | "failed" | "sent"; cls: string } {
  if (p.openedAt) return { key: "opened", cls: "pill-success" }
  if (p.deliveredAt || p.receiptStatus === "ok") return { key: "delivered", cls: "pill-info" }
  if (p.status !== "ok" || (p.receiptStatus && p.receiptStatus !== "ok")) return { key: "failed", cls: "pill-danger" }
  return { key: "sent", cls: "" }
}

/**
 * Dispositivos & push — push_tokens (platform, name, active, last seen), the
 * last pushes received and the in-app notification prefs. The push history
 * can fail on its own (pushes: null) without hiding the device list.
 */
export function DevicesTab({ userId, profile, active }: { userId: string; profile: Profile; active: boolean }) {
  const t = useTranslations("users.detail.devices")
  const tAcc = useTranslations("users.detail.account")
  const lang = htmlLang(useLocale() as Locale)
  const q = trpc.users.devices.useQuery({ userId }, { enabled: active, staleTime: 60_000, retry: 1 })

  if (q.isError) return <ErrorState what="devices" onRetry={() => q.refetch()} />
  if (q.isLoading || !q.data) return <LoadingState rows={3} />

  const { devices, pushes } = q.data
  const prefs = profile.notification_prefs && typeof profile.notification_prefs === "object" ? Object.entries(profile.notification_prefs as Record<string, unknown>) : []
  const toggles = prefs.filter(([, v]) => typeof v === "boolean") as [string, boolean][]

  return (
    <div className="space-y-4">
      <Card title={t("heading")}>
        {devices.length === 0 ? (
          <EmptyState>{t("empty")}</EmptyState>
        ) : (
          <ul className="divide-y divide-border-subtle">
            {devices.map((d) => (
              <li key={d.id} className="flex flex-wrap items-center gap-3 py-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-deep text-fg-secondary">
                  <Smartphone className="size-4" aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-fg-primary">{d.deviceName || t("unknownDevice")}</p>
                  <p className="text-xs text-fg-tertiary">
                    {d.platform ?? "—"} · {t("registered", { date: fmtDate(d.createdAt, lang) })}
                  </p>
                </div>
                <span className="text-xs text-fg-tertiary">{d.lastSeenAt ? t("lastSeen", { date: fmtDate(d.lastSeenAt, lang) }) : "—"}</span>
                <span className={`pill ${d.isActive ? "pill-success" : "pill-danger"}`}>{d.isActive ? t("active") : t("inactive")}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title={t("pushes")}>
          {pushes == null ? (
            <ErrorState what="pushes" onRetry={() => q.refetch()} compact />
          ) : pushes.length === 0 ? (
            <EmptyState>{t("noPushes")}</EmptyState>
          ) : (
            <ul className="divide-y divide-border-subtle">
              {pushes.map((p) => {
                const s = pushState(p)
                return (
                  <li key={p.id} className="flex items-center gap-2 py-2 text-sm">
                    <Bell className="size-3.5 shrink-0 text-fg-muted" aria-hidden />
                    <span className="min-w-0 flex-1 truncate text-fg-primary" title={p.title}>{p.title}</span>
                    <span className="shrink-0 text-xs text-fg-muted">{fmtDate(p.sentAt, lang)}</span>
                    <span className={`pill shrink-0 ${s.cls}`}>{t(`status.${s.key}`)}</span>
                  </li>
                )
              })}
            </ul>
          )}
        </Card>

        <Card title={tAcc("notifications")}>
          <div className="mb-3 flex items-center justify-between rounded-lg bg-deep px-3 py-2 text-sm">
            <span className="text-fg-tertiary">{t("inbox")}</span>
            <span className="text-fg-primary">{tAcc("notificationsValue", { n: num(profile, "notifications_count"), unread: num(profile, "notifications_unread") })}</span>
          </div>
          {toggles.length === 0 ? (
            <p className="text-xs text-fg-muted">{t("noPrefs")}</p>
          ) : (
            <>
              <Eyebrow>{t("prefs")}</Eyebrow>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {toggles.map(([k, on]) => (
                  <span key={k} className={`pill ${on ? "pill-success" : ""}`} title={on ? t("on") : t("off")}>
                    {k}: {on ? t("on") : t("off")}
                  </span>
                ))}
              </div>
            </>
          )}
        </Card>
      </div>
    </div>
  )
}
