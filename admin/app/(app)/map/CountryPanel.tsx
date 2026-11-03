"use client"
import { useState } from "react"
import Link from "next/link"
import { useLocale, useTranslations } from "next-intl"
import { X } from "lucide-react"
import { trpc } from "@/lib/trpc"
import { htmlLang, type Locale } from "@/i18n/config"
import { Choropleth } from "@/components/geo/Choropleth"
import { flag, type PlaceCount } from "@/lib/geo"
import br from "@/lib/geo/br-paths.json"

type Set = (patch: Record<string, string | null>) => void

function Bars({ rows, label, lang }: { rows: { key: string; n: number }[]; label: (k: string) => string; lang: string }) {
  const total = rows.reduce((a, r) => a + r.n, 0)
  if (total === 0) return <p className="text-sm text-fg-muted">—</p>
  return (
    <div className="space-y-2">
      {rows.map((r) => (
        <div key={r.key}>
          <div className="flex justify-between text-xs"><span className="text-fg-secondary">{label(r.key)}</span><span className="tabular-nums text-fg-primary">{r.n.toLocaleString(lang)}</span></div>
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-deep"><div className="h-full rounded-full bg-accent-500" style={{ width: `${(r.n / total) * 100}%` }} /></div>
        </div>
      ))}
    </div>
  )
}

const Eyebrow = ({ children }: { children: React.ReactNode }) => (
  <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.1em] text-fg-muted">{children}</p>
)

export function CountryPanel({ country, name, counts, placeReady, isAdmin, region, city, set }: {
  country: string; name: string; counts?: PlaceCount; placeReady: boolean; isAdmin: boolean
  region: string | null; city: string | null; set: Set
}) {
  const t = useTranslations("map")
  const lang = htmlLang(useLocale() as Locale)
  const [showPeople, setShowPeople] = useState(Boolean(region || city))
  const q = trpc.geo.country.useQuery({ country }, { staleTime: 60_000 })
  const mode = (k: string) => (t.has(`modes.${k}`) ? t(`modes.${k}`) : k)
  const regionName = (k: string) => (k === "?" ? t("country.unknownRegion") : k)
  const regionCount = new Map((q.data?.regions ?? []).map((r) => [r.key, r.n]))
  const maxRegion = Math.max(0, ...(q.data?.regions ?? []).filter((r) => r.key !== "?").map((r) => r.n))

  return (
    <section className="rounded-xl border border-border-default bg-card p-5 shadow-[var(--shadow-sm)]">
      <header className="mb-4 flex items-start gap-3">
        <span className="text-3xl leading-none" aria-hidden>{flag(country)}</span>
        <div className="flex-1">
          <h2 className="display text-xl font-bold text-fg-primary">{name}</h2>
          <p className="text-xs text-fg-tertiary">
            {t("tiles.waitlist")}: {t("country.people", { n: counts?.waitlist ?? 0 })} · {t("tiles.app")}: {t("country.people", { n: counts?.app ?? 0 })}
          </p>
        </div>
        <button onClick={() => set({ c: null, r: null, city: null })} className="rounded-full p-1.5 text-fg-tertiary hover:bg-card-hover" aria-label={t("country.close")}>
          <X size={16} />
        </button>
      </header>

      {q.isLoading && <p className="text-sm text-fg-tertiary">{t("loading")}</p>}
      {q.error && (
        <p className="text-sm text-fg-secondary">{t("loadError", { error: q.error.message })} <button className="underline" onClick={() => q.refetch()}>{t("retry")}</button></p>
      )}

      {q.data && (
        <div className="grid gap-5 lg:grid-cols-3">
          <div className="space-y-5">
            <div><Eyebrow>{t("country.phases")}</Eyebrow><Bars rows={q.data.modes} label={mode} lang={lang} /></div>
            <div><Eyebrow>{t("country.appPhases")}</Eyebrow><Bars rows={q.data.appModes} label={mode} lang={lang} /></div>
          </div>

          {!placeReady ? (
            <p className="rounded-lg border border-dashed border-border-default p-4 text-sm text-fg-tertiary lg:col-span-2">{t("country.placeLater")}</p>
          ) : (
            <>
              <div>
                <Eyebrow>{t("country.regions")}</Eyebrow>
                {country === "BR" && (
                  <Choropleth viewBox={br.viewBox} paths={br.paths} value={(k) => regionCount.get(k) ?? 0} max={maxRegion}
                    selected={region} onSelect={(k) => { set({ r: k === region ? null : k, city: null }); setShowPeople(true) }}
                    label={(k) => `${k}: ${t("country.people", { n: regionCount.get(k) ?? 0 })}`} className="mb-3 h-auto w-full max-w-[340px]" />
                )}
                <ul className="space-y-0.5 text-sm">
                  {q.data.regions.map((r) => (
                    <li key={r.key}>
                      <button onClick={() => { set({ r: r.key === region ? null : r.key, city: null }); setShowPeople(true) }}
                        className={`flex w-full justify-between rounded-md px-2 py-1 text-left hover:bg-card-hover ${r.key === region ? "bg-deep font-medium" : ""}`}>
                        <span className="text-fg-secondary">{regionName(r.key)}</span><span className="tabular-nums text-fg-primary">{r.n.toLocaleString(lang)}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <Eyebrow>{t("country.cities")}</Eyebrow>
                {q.data.cities.length === 0 ? <p className="text-sm text-fg-muted">{t("country.noCities")}</p> : (
                  <ul className="max-h-80 space-y-0.5 overflow-y-auto text-sm">
                    {q.data.cities.map((c) => c.city === null ? (
                      <li key="others" className="flex justify-between px-2 py-1 text-fg-tertiary" title={t("country.othersHint")}>
                        <span>{t("country.others", { places: c.places })}</span><span className="tabular-nums">{c.n.toLocaleString(lang)}</span>
                      </li>
                    ) : (
                      <li key={`${c.region}-${c.city}`}>
                        <button onClick={() => { set({ city: c.city === city ? null : c.city, r: c.region }); setShowPeople(true) }}
                          className={`flex w-full justify-between rounded-md px-2 py-1 text-left hover:bg-card-hover ${c.city === city ? "bg-deep font-medium" : ""}`}>
                          <span className="truncate text-fg-secondary">{c.city}{c.region ? <span className="text-fg-muted"> · {c.region}</span> : null}</span>
                          <span className="tabular-nums text-fg-primary">{c.n.toLocaleString(lang)}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </>
          )}
        </div>
      )}

      <div className="mt-5 border-t border-border-subtle pt-4">
        {!isAdmin ? <p className="text-xs text-fg-muted">{t("people.adminsOnly")}</p> : (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <button onClick={() => setShowPeople((v) => !v)} className="rounded-full border border-border-default px-3 py-1 text-xs font-medium text-fg-primary hover:bg-card-hover">
                {showPeople ? t("country.hidePeople") : t("country.showPeople")}
              </button>
              {region && <span className="pill pill-info rounded-full px-2 py-0.5 text-xs">{t("country.filterRegion", { region: regionName(region) })}</span>}
              {city && <span className="pill pill-info rounded-full px-2 py-0.5 text-xs">{t("country.filterCity", { city })}</span>}
              {(region || city) && <button className="text-xs text-fg-tertiary underline" onClick={() => set({ r: null, city: null })}>{t("country.clearFilter")}</button>}
            </div>
            {showPeople && <PeopleList country={country} region={region} city={city} />}
          </>
        )}
      </div>
    </section>
  )
}

function PeopleList({ country, region, city }: { country: string; region: string | null; city: string | null }) {
  const t = useTranslations("map")
  const lang = htmlLang(useLocale() as Locale)
  const q = trpc.geo.people.useQuery({ country, region: region ?? undefined, city: city ?? undefined }, { staleTime: 30_000 })
  const mode = (k: string | null) => (k && t.has(`modes.${k}`) ? t(`modes.${k}`) : k ?? "—")
  const day = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString(lang) : "—")
  const th = "px-3 py-2 text-left font-mono text-[10px] uppercase tracking-[0.08em] text-fg-muted"

  if (q.isLoading) return <p className="mt-3 text-sm text-fg-tertiary">{t("loading")}</p>
  if (q.error || !q.data) return <p className="mt-3 text-sm text-fg-secondary">{t("people.loadError", { error: q.error?.message ?? "" })}</p>
  const { waitlist, app, narrowed, limit } = q.data

  return (
    <div className="mt-4 grid gap-5 xl:grid-cols-2">
      <div className="min-w-0">
        <p className="mb-2 text-sm font-semibold text-fg-primary">{t("people.waitlist")} <span className="font-normal text-fg-muted">· {waitlist.length}</span></p>
        {waitlist.length === 0 ? <p className="text-sm text-fg-muted">{t("people.empty")}</p> : (
          <div className="overflow-x-auto rounded-lg border border-border-subtle">
            <table className="w-full text-sm">
              <thead className="bg-deep"><tr><th className={th}>{t("people.name")}</th><th className={th}>{t("people.email")}</th><th className={th}>{t("people.phase")}</th><th className={th}>{t("people.place")}</th><th className={th}>{t("people.joined")}</th><th className={th}>{t("people.inApp")}</th></tr></thead>
              <tbody>
                {waitlist.map((p) => (
                  <tr key={p.id} className="border-t border-border-subtle">
                    <td className="px-3 py-2 text-fg-primary">{p.name ?? "—"}</td>
                    <td className="px-3 py-2 text-fg-secondary">{p.email}</td>
                    <td className="px-3 py-2">{mode(p.mode)}</td>
                    <td className="px-3 py-2 text-fg-tertiary">{[p.city, p.region].filter(Boolean).join(" · ") || "—"}</td>
                    <td className="px-3 py-2 tabular-nums text-fg-tertiary">{day(p.createdAt)}</td>
                    <td className="px-3 py-2">{p.signedUp ? <span className="pill pill-success rounded-full px-2 py-0.5 text-xs">{t("people.yes")}</span> : t("people.no")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {waitlist.length >= limit && <p className="mt-1 text-xs text-fg-muted">{t("people.limit", { n: limit })}</p>}
      </div>

      <div className="min-w-0">
        <p className="mb-2 text-sm font-semibold text-fg-primary">{t("people.app")} <span className="font-normal text-fg-muted">· {app.length}</span></p>
        {narrowed ? <p className="text-sm text-fg-muted">{t("people.appNarrowed")}</p> : app.length === 0 ? <p className="text-sm text-fg-muted">{t("people.empty")}</p> : (
          <div className="overflow-x-auto rounded-lg border border-border-subtle">
            <table className="w-full text-sm">
              <thead className="bg-deep"><tr><th className={th}>{t("people.name")}</th><th className={th}>{t("people.email")}</th><th className={th}>{t("people.phase")}</th><th className={th}>{t("people.joined")}</th></tr></thead>
              <tbody>
                {app.map((p) => (
                  <tr key={p.id} className="border-t border-border-subtle hover:bg-card-hover">
                    <td className="px-3 py-2"><Link href={`/users/${p.id}`} className="text-fg-primary underline-offset-2 hover:underline">{p.name ?? "—"}</Link></td>
                    <td className="px-3 py-2 text-fg-secondary">{p.email ?? "—"}</td>
                    <td className="px-3 py-2">{mode(p.journeyMode)}</td>
                    <td className="px-3 py-2 tabular-nums text-fg-tertiary">{day(p.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {app.length >= limit && <p className="mt-1 text-xs text-fg-muted">{t("people.limit", { n: limit })}</p>}
      </div>
    </div>
  )
}
