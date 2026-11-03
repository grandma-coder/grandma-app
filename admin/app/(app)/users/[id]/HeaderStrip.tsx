"use client"
import { useState, type ReactNode } from "react"
import { useLocale, useTranslations } from "next-intl"
import { Check, Copy } from "lucide-react"
import { htmlLang, type Locale } from "@/i18n/config"
import { type Profile, str, fmtDate, daysSince, lifecycle, initials, flagEmoji, countryName } from "./user360"

// Journey colors — shared with the overview's behavior bars.
export const MODE_DOT: Record<string, string> = {
  "pre-pregnancy": "#E58BB4",
  pre_pregnancy: "#E58BB4",
  cycle: "#E58BB4",
  pregnancy: "#B7A6E8",
  kids: "#8BB8E8",
}

function Slot({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-fg-muted">{label}</p>
      <div className="mt-0.5 truncate text-sm text-fg-primary">{children}</div>
    </div>
  )
}

/**
 * Sticky identity strip — always visible above the tabs:
 *
 *   [photo] name / email · phases · plan · lifecycle · country · member since · last active   [Copy ID]
 *
 * Everything here comes from the server-rendered `users.detail` profile, so it
 * has no loading/error state of its own.
 */
export function HeaderStrip({ userId, profile }: { userId: string; profile: Profile }) {
  const t = useTranslations("users")
  const lang = htmlLang(useLocale() as Locale)
  const label = (ns: string, v: string) => (t.has(`${ns}.${v}`) ? t(`${ns}.${v}`) : v)
  const [copied, setCopied] = useState(false)
  const [photoBroken, setPhotoBroken] = useState(false)

  const rawName = (profile.name as string | null) ?? null
  const email = (profile.email as string | null) ?? null
  const name = rawName || email || userId
  const photo = typeof profile.photo_url === "string" && /^https?:\/\//.test(profile.photo_url) && !photoBroken ? profile.photo_url : null

  const tier = (profile.subscription_tier as string) ?? "free"
  const status = str(profile, "subscription_status")
  const lastActiveDays = daysSince(profile.last_active)
  const life = lifecycle(lastActiveDays)
  const behaviors = (profile.behaviors as string[] | null) ?? []
  const journey = profile.journey_mode as string | null
  const phases = behaviors.length ? behaviors : journey ? [journey] : []
  const cc = (profile.country_code as string | null) ?? null
  const country = countryName(cc, lang)

  async function copyId() {
    try {
      await navigator.clipboard.writeText(userId)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // clipboard blocked (insecure context) — the id is still visible in the account tab
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-3 py-4">
      <div className="flex min-w-0 items-center gap-3">
        {photo ? (
          // Remote user photo on arbitrary storage hosts — next/image would need every host allowlisted.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photo} alt={t("detail.header.photoAlt", { name })} onError={() => setPhotoBroken(true)} className="size-11 shrink-0 rounded-full border border-border-default object-cover" />
        ) : (
          <div aria-hidden className="display flex size-11 shrink-0 items-center justify-center rounded-full bg-deep text-sm font-semibold text-fg-secondary">
            {initials(rawName, email)}
          </div>
        )}
        <div className="min-w-0">
          <h1 className="display truncate text-xl font-bold text-fg-primary">{name}</h1>
          <p className="truncate text-sm text-fg-tertiary">{email ?? "—"}</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className={`pill ${life.cls}`}>{t(`detail.lifecycle.${life.key}`)}</span>
        {Boolean(profile.deletion_requested) && <span className="pill pill-danger">{t("detail.deletionRequested")}</span>}
      </div>

      <div className="grid flex-1 grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-3 xl:grid-cols-5">
        <Slot label={t("detail.header.phases")}>
          {phases.length ? (
            <span className="flex flex-wrap items-center gap-x-2.5">
              {phases.map((p) => (
                <span key={p} className="inline-flex items-center gap-1">
                  <span className="inline-block size-2 rounded-full" style={{ background: MODE_DOT[p] ?? "#BDD48C" }} />
                  {label("journeyMode", p)}
                </span>
              ))}
            </span>
          ) : (
            <span className="text-fg-muted">{t("detail.header.noPhases")}</span>
          )}
        </Slot>
        <Slot label={t("detail.header.plan")}>
          {label("tierLabel", tier)}
          {status !== "—" && <span className="text-fg-muted"> · {status}</span>}
        </Slot>
        <Slot label={t("detail.header.country")}>
          {country ? (
            <span title={cc ?? undefined}>
              {flagEmoji(cc)} {country}
            </span>
          ) : (
            <span className="text-fg-muted">{t("detail.header.noCountry")}</span>
          )}
        </Slot>
        <Slot label={t("detail.header.memberSince")}>{fmtDate(profile.created_at, lang)}</Slot>
        <Slot label={t("detail.header.lastActive")}>
          {lastActiveDays == null ? t("detail.header.never") : lastActiveDays === 0 ? t("detail.header.today") : t("detail.header.daysAgo", { n: lastActiveDays })}
        </Slot>
      </div>

      <button
        onClick={copyId}
        title={userId}
        className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-border-default bg-card px-2.5 py-1.5 text-xs font-medium text-fg-secondary hover:text-fg-primary"
      >
        {copied ? <Check className="size-3.5" aria-hidden /> : <Copy className="size-3.5" aria-hidden />}
        {copied ? t("detail.header.copied") : t("detail.header.copyId")}
      </button>
    </div>
  )
}
