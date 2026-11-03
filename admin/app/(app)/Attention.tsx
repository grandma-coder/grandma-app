"use client"
import Link from "next/link"
import { useLocale, useTranslations } from "next-intl"
import { ArrowUpRight, LifeBuoy, Flag, ListPlus, UserPlus, Map as MapIcon } from "lucide-react"
import { trpc } from "@/lib/trpc"
import { htmlLang, type Locale } from "@/i18n/config"
import { Choropleth } from "@/components/geo/Choropleth"
import { countOf, countryName, flag } from "@/lib/geo"
import world from "@/lib/geo/world-paths.json"

type Tone = "alert" | "news" | "calm"

function Tile({ href, icon, label, value, sub, tone }: { href: string; icon: React.ReactNode; label: string; value: number | null; sub?: string; tone: Tone }) {
  const ring = tone === "alert" ? "border-[var(--pill-danger-fg)] bg-[var(--pill-danger-bg)]" : "border-border-default bg-card"
  return (
    <Link href={href} className={`group rounded-xl border p-4 shadow-[var(--shadow-sm)] transition-colors hover:bg-card-hover ${ring}`}>
      <div className="flex items-center gap-2 text-fg-tertiary">
        {icon}
        <p className="flex-1 font-mono text-[10px] uppercase tracking-[0.1em] text-fg-muted">{label}</p>
        <ArrowUpRight size={14} className="opacity-0 transition-opacity group-hover:opacity-100" />
      </div>
      <p className={`display mt-1 text-2xl font-bold tabular-nums ${tone === "alert" ? "text-[var(--pill-danger-fg)]" : "text-fg-primary"}`}>{value ?? "—"}</p>
      {sub && <p className="mt-0.5 text-xs text-fg-tertiary">{sub}</p>}
    </Link>
  )
}

/**
 * Home "Precisa de você": what is waiting on a person, from ops.attention (the same counts as
 * the sidebar badges), plus where people are. Each block loads and fails on its own.
 */
export function Attention() {
  const t = useTranslations("home.attention")
  const lang = htmlLang(useLocale() as Locale)
  const a = trpc.ops.attention.useQuery(undefined, { refetchInterval: 60_000, staleTime: 30_000 })
  const geo = trpc.geo.overview.useQuery(undefined, { staleTime: 60_000 })
  const d = a.data

  const waiting = (d?.support ?? 0) + (d?.reports ?? 0)
  const tone = (n: number | null | undefined): Tone => (n ? "alert" : "calm")

  const countries = (geo.data?.countries ?? []).filter((c) => c.key !== "OTHER")
  const max = Math.max(0, ...countries.map((c) => countOf(c, "all")))
  const byKey = new Map(countries.map((c) => [c.key, c]))

  return (
    <section className="mt-8 space-y-3">
      <div className="flex items-baseline justify-between">
        <h2 className="display text-base font-semibold text-fg-primary">{t("title")}</h2>
        {d && <p className="text-xs text-fg-muted">{waiting === 0 ? t("allClear") : t("waiting", { n: waiting })}</p>}
      </div>
      {a.error && <p className="text-sm text-fg-secondary">{t("loadError")} <button className="underline" onClick={() => a.refetch()}>{t("retry")}</button></p>}
      <div className="grid gap-3 lg:grid-cols-[1fr_1fr_320px]">
        <div className="grid grid-cols-2 gap-3 lg:col-span-2">
          <Tile href="/support" icon={<LifeBuoy size={14} />} label={t("support")} value={d?.support ?? null} sub={t("supportSub")} tone={tone(d?.support)} />
          <Tile href="/community?tab=moderation" icon={<Flag size={14} />} label={t("reports")} value={d?.reports ?? null} sub={t("reportsSub")} tone={tone(d?.reports)} />
          <Tile href="/waitlist" icon={<ListPlus size={14} />} label={t("waitlistToday")} value={d?.waitlistToday ?? null}
            sub={d ? t("waitlistSub", { week: d.newWaitlist7d ?? 0, pending: d.waitlistPending ?? 0 }) : undefined} tone={d?.waitlistToday ? "news" : "calm"} />
          <Tile href="/users" icon={<UserPlus size={14} />} label={t("newUsers")} value={d?.newUsers7d ?? null} sub={t("newUsersSub")} tone="calm" />
        </div>
        <Link href="/map" className="group rounded-xl border border-border-default bg-card p-4 shadow-[var(--shadow-sm)] transition-colors hover:bg-card-hover">
          <div className="mb-2 flex items-center gap-2 text-fg-tertiary">
            <MapIcon size={14} />
            <p className="flex-1 font-mono text-[10px] uppercase tracking-[0.1em] text-fg-muted">{t("where")}</p>
            <ArrowUpRight size={14} className="opacity-0 transition-opacity group-hover:opacity-100" />
          </div>
          {geo.error ? <p className="text-xs text-fg-muted">{t("whereError")}</p> : (
            <>
              <Choropleth viewBox={world.viewBox} paths={world.paths} value={(k) => (byKey.get(k) ? countOf(byKey.get(k)!, "all") : 0)} max={max}
                label={(k) => countryName(k, lang, k)} className="pointer-events-none h-auto w-full" />
              <p className="mt-2 truncate text-xs text-fg-secondary">
                {countries.slice(0, 4).map((c) => `${flag(c.key)} ${countOf(c, "all").toLocaleString(lang)}`).join("  ·  ") || "—"}
              </p>
            </>
          )}
        </Link>
      </div>
    </section>
  )
}
