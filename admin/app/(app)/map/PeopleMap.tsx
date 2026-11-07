"use client"
import { useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useLocale, useTranslations } from "next-intl"
import { trpc } from "@/lib/trpc"
import { htmlLang, type Locale } from "@/i18n/config"
import { Choropleth } from "@/components/geo/Choropleth"
import { countOf, countryName, flag, type MapSource, type PlaceCount } from "@/lib/geo"
import world from "@/lib/geo/world-paths.json"
import { CountryPanel } from "./CountryPanel"

const SOURCES: MapSource[] = ["all", "waitlist", "app"]
const RANKING_HEAD = 12

function Tile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-border-default bg-card p-4 shadow-[var(--shadow-sm)]">
      <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-fg-muted">{label}</p>
      <p className="display mt-1 text-2xl font-bold tabular-nums text-fg-primary">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-fg-tertiary">{sub}</p>}
    </div>
  )
}

/** Every view is a link: ?src= (who), ?c= (country), ?r= (region), ?city=. */
export function usePlaceParams() {
  const params = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const raw = params.get("src")
  const src: MapSource = SOURCES.includes(raw as MapSource) ? (raw as MapSource) : "all"
  const set = (patch: Record<string, string | null>) => {
    const q = new URLSearchParams(params.toString())
    for (const [k, v] of Object.entries(patch)) {
      if (v === null) q.delete(k)
      else q.set(k, v)
    }
    const s = q.toString()
    router.replace(s ? `${pathname}?${s}` : pathname, { scroll: false })
  }
  return { src, country: params.get("c"), region: params.get("r"), city: params.get("city"), set }
}

export function PeopleMap({ isAdmin }: { isAdmin: boolean }) {
  const t = useTranslations("map")
  const lang = htmlLang(useLocale() as Locale)
  const { src, country, region, city, set } = usePlaceParams()
  const [allRanking, setAllRanking] = useState(false)
  const q = trpc.geo.overview.useQuery(undefined, { staleTime: 60_000 })

  if (q.isLoading) return <p className="text-sm text-fg-tertiary">{t("loading")}</p>
  if (q.error || !q.data) {
    return (
      <div className="rounded-xl border border-border-default bg-card p-5 text-sm text-fg-secondary">
        {t("loadError", { error: q.error?.message ?? "" })}{" "}
        <button className="underline" onClick={() => q.refetch()}>{t("retry")}</button>
      </div>
    )
  }

  const { countries, totals, placeReady } = q.data
  const known = countries.filter((c) => c.key !== "OTHER")
  const unknownWaitlist = countries.find((c) => c.key === "OTHER")?.waitlist ?? 0
  const byKey = new Map(countries.map((c) => [c.key, c]))
  const n = (key: string) => { const r = byKey.get(key); return r ? countOf(r, src) : 0 }
  const shown = known.filter((c) => countOf(c, src) > 0).sort((a, b) => countOf(b, src) - countOf(a, src))
  const max = Math.max(0, ...shown.map((c) => countOf(c, src)))
  const name = (key: string) => countryName(key, lang, t("unknownCountry"))
  const label = (key: string) => {
    const r = byKey.get(key)
    return t("tooltip", { name: name(key), waitlist: (r?.waitlist ?? 0).toLocaleString(lang), app: (r?.app ?? 0).toLocaleString(lang) })
  }
  const select = (key: string) => set({ c: key === country ? null : key, r: null, city: null })
  const ranking = allRanking ? shown : shown.slice(0, RANKING_HEAD)

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Tile label={t("tiles.waitlist")} value={totals.waitlist.toLocaleString(lang)} sub={t("tiles.last7", { n: totals.waitlist7d })} />
        <Tile label={t("tiles.app")} value={totals.app.toLocaleString(lang)} sub={t("tiles.last7", { n: totals.app7d })} />
        <Tile label={t("tiles.countries")} value={shown.length.toLocaleString(lang)} />
        <Tile label={t("tiles.unknown")} value={(unknownWaitlist + totals.appUnknown).toLocaleString(lang)} sub={t("tiles.unknownSub", { waitlist: unknownWaitlist, app: totals.appUnknown })} />
      </div>

      <section className="grid gap-5 lg:grid-cols-[1fr_300px]">
        <div className="rounded-xl border border-border-default bg-card p-4 shadow-[var(--shadow-sm)]">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-fg-muted">{t("source.label")}</span>
            {SOURCES.map((s) => (
              <button key={s} onClick={() => set({ src: s === "all" ? null : s })} aria-pressed={src === s}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${src === s ? "border-accent-500 bg-accent-500 text-white" : "border-border-default text-fg-secondary hover:bg-card-hover"}`}>
                {t(`source.${s}`)}
              </button>
            ))}
          </div>
          <Choropleth viewBox={world.viewBox} paths={world.paths} dots={world.dots} value={n} max={max}
            selected={country} onSelect={select} label={label} className="h-auto w-full" />
          <div className="mt-2 flex items-center gap-2 text-[11px] text-fg-muted">
            <span className="inline-block h-2.5 w-4 rounded-sm" style={{ background: "var(--map-empty)" }} /> {t("legend.none")}
            <span className="ml-3 inline-block h-2.5 w-16 rounded-sm" style={{ background: "linear-gradient(90deg, var(--map-low), var(--map-ink))" }} />
            {t("legend.few")} → {t("legend.many")}
          </div>
        </div>

        <div className="rounded-xl border border-border-default bg-card p-4 shadow-[var(--shadow-sm)]">
          <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.1em] text-fg-muted">{t("ranking.title")}</p>
          {shown.length === 0 ? <p className="text-sm text-fg-tertiary">{t("ranking.empty")}</p> : (
            <ol className="space-y-1">
              {ranking.map((c) => <RankRow key={c.key} c={c} src={src} max={max} on={c.key === country} name={name(c.key)} lang={lang} onClick={() => select(c.key)} />)}
            </ol>
          )}
          {shown.length > RANKING_HEAD && (
            <button className="mt-2 text-xs text-fg-tertiary underline" onClick={() => setAllRanking((v) => !v)}>
              {allRanking ? "−" : `+${shown.length - RANKING_HEAD}`}
            </button>
          )}
        </div>
      </section>

      {country && (
        <CountryPanel key={country} country={country} name={name(country)} counts={byKey.get(country)} placeReady={placeReady}
          isAdmin={isAdmin} region={region} city={city} set={set} />
      )}
    </div>
  )
}

function RankRow({ c, src, max, on, name, lang, onClick }: { c: PlaceCount; src: MapSource; max: number; on: boolean; name: string; lang: string; onClick: () => void }) {
  const t = useTranslations("map")
  const n = countOf(c, src)
  return (
    <li>
      <button onClick={onClick} aria-pressed={on}
        className={`w-full rounded-lg px-2 py-1.5 text-left transition-colors ${on ? "bg-deep ring-1 ring-accent-500" : "hover:bg-card-hover"}`}>
        <div className="flex items-baseline gap-2 text-sm">
          <span aria-hidden>{flag(c.key)}</span>
          <span className="flex-1 truncate text-fg-primary">{name}</span>
          <span className="tabular-nums font-semibold text-fg-primary">{n.toLocaleString(lang)}</span>
        </div>
        <div className="mt-1 h-1 overflow-hidden rounded-full bg-deep">
          <div className="h-full rounded-full bg-accent-500" style={{ width: `${max ? (n / max) * 100 : 0}%` }} />
        </div>
        {src === "all" && (
          <p className="mt-0.5 text-[11px] text-fg-muted">{c.waitlist.toLocaleString(lang)} {t("ranking.waitlist")} · {c.app.toLocaleString(lang)} {t("ranking.app")}</p>
        )}
      </button>
    </li>
  )
}
