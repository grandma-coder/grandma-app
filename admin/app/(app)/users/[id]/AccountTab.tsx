"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { useLocale, useTranslations } from "next-intl"
import { trpc } from "@/lib/trpc"
import { htmlLang, type Locale } from "@/i18n/config"
import { type Profile, str, num, fmtDate, flagEmoji, countryName } from "./user360"
import { Card, ErrorState } from "./parts"

/**
 * Real RevenueCat subscription state for this user — what Apple/Google actually
 * charged, distinct from the in-app tier grant above. Renders nothing when
 * RevenueCat is dormant so the Account card stays clean until it's wired.
 * The query is admin-gated + audit-logged at the router.
 */
function RevenueCatPanel({ userId }: { userId: string }) {
  const t = useTranslations("users.detail.revenueCat")
  const lang = htmlLang(useLocale() as Locale)
  const { data, isLoading, isError, refetch } = trpc.revenue.customer.useQuery({ appUserId: userId }, { staleTime: 60_000, retry: false })

  if (isLoading) return <div className="mb-4 h-12 animate-pulse rounded-lg bg-deep" />
  if (isError) return <div className="mb-4"><ErrorState what="revenueCat" onRetry={() => refetch()} compact /></div>
  if (!data || !data.configured) return null

  if (!data.found) {
    return (
      <div className="mb-4 rounded-lg border border-border-subtle bg-deep p-3 text-xs text-fg-tertiary">
        <span className="font-medium text-fg-secondary">{t("label")}</span> {t("noRecord")}
      </div>
    )
  }

  return (
    <div className="mb-4 rounded-lg border border-border-subtle bg-deep p-3">
      <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.1em] text-fg-muted">{t("heading")}</p>
      {data.entitlements.length === 0 ? (
        <p className="text-xs text-fg-tertiary">{t("noActive")}</p>
      ) : (
        <div className="space-y-1.5">
          {data.entitlements.map((e) => (
            <div key={e.identifier} className="flex items-center justify-between gap-2 text-xs">
              <div className="min-w-0">
                <span className="font-medium text-fg-primary">{e.productId ?? e.identifier}</span>
                {e.store && <span className="ml-1.5 text-fg-muted">{e.store}</span>}
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {e.isTrial && <span className="pill pill-info">{t("trial")}</span>}
                <span className={`pill ${e.isActive ? "pill-success" : "pill-danger"}`}>{e.isActive ? t("active") : t("expired")}</span>
                <span className="text-fg-tertiary">{t(e.willRenew ? "renews" : "ends", { date: fmtDate(e.expiresAt, lang) })}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/**
 * Conta — tier grant (setTier), RevenueCat billing, account fields and the raw
 * prefs JSON. Mounted only once the tab is opened, so the RevenueCat call is
 * lazy too.
 */
export function AccountTab({ userId, profile }: { userId: string; profile: Profile }) {
  const t = useTranslations("users")
  const lang = htmlLang(useLocale() as Locale)
  const router = useRouter()
  const label = (ns: string, v: string) => (t.has(`${ns}.${v}`) ? t(`${ns}.${v}`) : v)
  const setTier = trpc.users.setTier.useMutation({
    onSuccess: () => {
      setNotice(t("detail.account.updated"))
      // The profile is server-rendered — refresh so the header + fields show the new tier.
      router.refresh()
    },
    onError: (e) => setNotice(e.message),
  })

  const tier = (profile.subscription_tier as string) ?? "free"
  const [promoteOpen, setPromoteOpen] = useState(false)
  const [nextTier, setNextTier] = useState<string>(tier)
  const [reason, setReason] = useState("")
  const [notice, setNotice] = useState<string | null>(null)

  const cc = (profile.country_code as string | null) ?? null
  const country = countryName(cc, lang)

  function submitTier() {
    setNotice(null)
    setTier.mutate({ userId, tier: nextTier as "free" | "premium_solo" | "premium_family", reason: reason.trim() || undefined })
    setPromoteOpen(false)
  }

  return (
    <div className="space-y-4">
      <Card
        title={t("detail.account.heading")}
        aside={
          <button
            onClick={() => setPromoteOpen((v) => !v)}
            className="rounded-lg bg-accent-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-accent-600"
          >
            {t("detail.account.changeSubscription")}
          </button>
        }
      >
        {promoteOpen && (
          <div className="mb-4 rounded-lg border border-border-subtle bg-deep p-3">
            <label className="mb-1 block text-xs font-medium text-fg-tertiary">{t("detail.account.newTier")}</label>
            <select
              value={nextTier}
              onChange={(e) => setNextTier(e.target.value)}
              className="w-full rounded-lg border border-border-default bg-card px-2.5 py-1.5 text-sm text-fg-primary focus:border-accent-400 focus:outline-none"
            >
              <option value="free">{t("tierLabel.free")}</option>
              <option value="premium_solo">{t("tierLabel.premium_solo")}</option>
              <option value="premium_family">{t("tierLabel.premium_family")}</option>
            </select>
            <input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={t("detail.account.reasonPlaceholder")}
              className="mt-2 w-full rounded-lg border border-border-default bg-card px-2.5 py-1.5 text-sm text-fg-primary placeholder:text-fg-muted focus:border-accent-400 focus:outline-none"
            />
            <div className="mt-2 flex items-center gap-2">
              <button
                onClick={submitTier}
                disabled={setTier.isPending || nextTier === tier}
                className="rounded-lg bg-accent-500 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-40"
              >
                {setTier.isPending ? t("detail.account.saving") : t("detail.account.apply")}
              </button>
              <button onClick={() => setPromoteOpen(false)} className="text-xs font-medium text-fg-tertiary hover:text-fg-primary">
                {t("cancel")}
              </button>
            </div>
            <p className="mt-2 text-[11px] text-fg-muted">{t("detail.account.grantNote")}</p>
          </div>
        )}
        <RevenueCatPanel userId={userId} />
        {notice && <p className="mb-3 text-sm text-accent-500">{notice}</p>}

        <dl className="divide-y divide-border-subtle text-sm">
          {[
            ["subscription", `${label("tierLabel", tier)} · ${str(profile, "subscription_status")}`],
            ["joined", fmtDate(profile.created_at, lang)],
            ["consent", profile.consented_at ? fmtDate(profile.consented_at, lang) : t("detail.account.notGiven")],
            ["language", str(profile, "language")],
            ["country", country ? `${flagEmoji(cc)} ${country}`.trim() : "—"],
            ["dueDate", fmtDate(profile.due_date, lang)],
            ["caregivers", t("detail.account.caregiversValue", { n: num(profile, "caregivers_count") })],
            ["caregiverFor", t("detail.account.caregiverForValue", { n: num(profile, "caregiver_for_count") })],
            ["notifications", t("detail.account.notificationsValue", { n: num(profile, "notifications_count"), unread: num(profile, "notifications_unread") })],
            ["verifiedExpert", profile.is_verified_expert ? str(profile, "expert_title") || t("detail.account.yes") : t("detail.account.no")],
          ].map(([k, v]) => (
            <div key={k} className="flex justify-between py-2">
              <dt className="text-fg-tertiary">{t(`detail.account.${k}`)}</dt>
              <dd className="text-fg-primary">{v}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-3 text-xs text-fg-muted">{t("detail.auditNote", { id: userId })}</p>
      </Card>

      <details className="rounded-xl border border-border-default bg-card p-4 text-sm">
        <summary className="cursor-pointer font-medium text-fg-secondary">{t("detail.prefs")}</summary>
        <pre className="mt-2 overflow-x-auto text-xs text-fg-tertiary">
{JSON.stringify({ notification_prefs: profile.notification_prefs, privacy_settings: profile.privacy_settings }, null, 2)}
        </pre>
      </details>
    </div>
  )
}
