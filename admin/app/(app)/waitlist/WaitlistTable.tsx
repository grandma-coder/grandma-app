"use client"
import { useEffect, useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import { trpc } from "@/lib/trpc"
import type { WaitlistFilter } from "@/lib/waitlist"
import { htmlLang, type Locale } from "@/i18n/config"

// [value sent to the server, message key for the label]
const MODES = [["", "filters.allModes"], ["pre", "labels.pre"], ["preg", "labels.preg"], ["kids", "labels.kids"], ["meno", "labels.meno"]] as const
const LOCALES = [["", "filters.allLanguages"], ["en", "labels.en"], ["pt", "labels.pt"]] as const
const INVITED = [["all", "filters.everyone"], ["pending", "filters.notInvited"], ["invited", "filters.invited"]] as const
const COLUMNS = ["number", "email", "name", "country", "mode", "lang", "joined", "invited", "inApp"] as const

export function WaitlistTable() {
  const t = useTranslations("waitlist")
  const lang = htmlLang(useLocale() as Locale)
  const fmt = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString(lang) : "—")
  const utils = trpc.useUtils()
  const [filter, setFilter] = useState<WaitlistFilter>({ invited: "all" })
  const [page, setPage] = useState(0)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [notice, setNotice] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const stats = trpc.waitlist.stats.useQuery()
  const countries: (readonly [string, string])[] = [["", t("filters.allCountries")], ...(stats.data?.byCountry ?? []).map((r) => [r.country, `${r.country} (${r.count})`] as const)]

  // Debounce search: every list call writes an audit row, so don't fire per keystroke.
  useEffect(() => {
    const timer = setTimeout(() => {
      const q = search || undefined
      setFilter((f) => (f.q === q ? f : { ...f, q }))
      setPage(0)
      setSelected(new Set())
      setNotice(null)
    }, 300)
    return () => clearTimeout(timer)
  }, [search])

  const list = trpc.waitlist.list.useQuery({ filter, page })
  const exportCsv = trpc.waitlist.exportCsv.useMutation({
    onSuccess: ({ csv, count }) => {
      const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }))
      const a = document.createElement("a")
      a.href = url
      a.download = `waitlist-${filter.country ?? "all"}-${new Date().toISOString().slice(0, 10)}.csv`
      a.click()
      URL.revokeObjectURL(url)
      setNotice(t("notice.exported", { count }))
    },
    onError: (e) => setNotice(e.message),
  })
  const promote = trpc.waitlist.promoteToBeta.useMutation({
    onSuccess: ({ promoted, alreadyBeta }) => {
      setSelected(new Set())
      setNotice(alreadyBeta ? t("notice.promotedWithExisting", { promoted, alreadyBeta }) : t("notice.promoted", { promoted }))
      utils.waitlist.invalidate()
      utils.beta.list.invalidate()
    },
    onError: (e) => setNotice(e.message),
  })

  const rows = list.data?.rows ?? []
  const total = list.data?.total ?? 0
  const pageSize = list.data?.pageSize ?? 50
  const pages = Math.max(1, Math.ceil(total / pageSize))
  const update = (p: Partial<WaitlistFilter>) => { setFilter((f) => ({ ...f, ...p })); setPage(0); setSelected(new Set()); setNotice(null) }
  const goto = (fn: (p: number) => number) => { setPage(fn); setSelected(new Set()); setNotice(null) }
  const toggle = (id: string) => setSelected((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n })
  const ctl = "rounded-lg border border-border-default bg-card px-3 py-2 text-sm text-fg-primary disabled:cursor-not-allowed disabled:opacity-40"
  const opt = <T extends readonly (readonly [string, string])[]>(o: T) => o.map(([v, l]) => <option key={v} value={v}>{l}</option>)
  const optT = <T extends readonly (readonly [string, string])[]>(o: T) => o.map(([v, k]) => <option key={v} value={v}>{t(k)}</option>)

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <input className={`${ctl} min-w-[220px]`} aria-label={t("filters.search")} placeholder={t("filters.search")} value={search} onChange={(e) => setSearch(e.target.value)} />
        <select aria-label={t("filters.country")} className={ctl} value={filter.country ?? ""} onChange={(e) => update({ country: e.target.value || undefined })}>{opt(countries)}</select>
        <select aria-label={t("filters.mode")} className={ctl} value={filter.mode ?? ""} onChange={(e) => update({ mode: (e.target.value || undefined) as WaitlistFilter["mode"] })}>{optT(MODES)}</select>
        <select aria-label={t("filters.language")} className={ctl} value={filter.locale ?? ""} onChange={(e) => update({ locale: (e.target.value || undefined) as WaitlistFilter["locale"] })}>{optT(LOCALES)}</select>
        <select aria-label={t("filters.invited")} className={ctl} value={filter.invited} onChange={(e) => update({ invited: e.target.value as WaitlistFilter["invited"] })}>{optT(INVITED)}</select>
        <input type="date" aria-label={t("filters.from")} className={ctl} value={filter.from ?? ""} onChange={(e) => update({ from: e.target.value || undefined })} />
        <input type="date" aria-label={t("filters.to")} className={ctl} value={filter.to ?? ""} onChange={(e) => update({ to: e.target.value || undefined })} />
        <div className="ml-auto flex gap-2">
          <button className={ctl} disabled={exportCsv.isPending} onClick={() => exportCsv.mutate({ filter })}>{exportCsv.isPending ? t("actions.exporting") : t("actions.export")}</button>
          <button className={`${ctl} font-semibold`} disabled={selected.size === 0 || promote.isPending} onClick={() => promote.mutate({ ids: [...selected] })}>
            {promote.isPending ? t("actions.promoting") : t("actions.promote", { n: selected.size })}
          </button>
        </div>
      </div>
      {notice && <p role="status" className="text-sm text-fg-secondary">{notice}</p>}
      {list.error && <p className="text-sm text-fg-secondary">{t("table.loadError", { error: list.error.message })}</p>}
      <div className="overflow-x-auto rounded-xl border border-border-default bg-card shadow-[var(--shadow-sm)]">
        <table className="w-full text-left text-sm">
          <thead className="font-mono text-[11px] uppercase tracking-[0.12em] text-fg-muted">
            <tr className="border-b border-border-default">
              <th className="w-10 px-4 py-3"><input type="checkbox" aria-label={t("table.selectPage")} checked={rows.length > 0 && rows.every((r) => selected.has(r.id))} onChange={(e) => setSelected(e.target.checked ? new Set(rows.map((r) => r.id)) : new Set())} /></th>
              {COLUMNS.map((h) => <th key={h} className="px-4 py-3">{t(`table.columns.${h}`)}</th>)}
            </tr>
          </thead>
          <tbody>
            {list.isLoading && <tr><td colSpan={10} className="px-4 py-6 text-fg-tertiary">{t("loading")}</td></tr>}
            {!list.isLoading && !list.error && rows.length === 0 && <tr><td colSpan={10} className="px-4 py-6 text-fg-tertiary">{t("table.empty")}</td></tr>}
            {rows.map((r, i) => (
              <tr key={r.id} className="border-b border-border-default last:border-0">
                <td className="px-4 py-3"><input type="checkbox" aria-label={t("table.selectRow", { email: r.email })} checked={selected.has(r.id)} onChange={() => toggle(r.id)} /></td>
                <td className="px-4 py-3 tabular-nums text-fg-muted">{page * pageSize + i + 1}</td>
                <td className="px-4 py-3 text-fg-primary">{r.email}</td>
                <td className="px-4 py-3 text-fg-secondary">{r.name ?? "—"}</td>
                <td className="px-4 py-3">{r.country}</td>
                <td className="px-4 py-3">{t.has(`labels.${r.mode}`) ? t(`labels.${r.mode}`) : r.mode}</td>
                <td className="px-4 py-3 uppercase">{r.locale}</td>
                <td className="px-4 py-3 tabular-nums">{fmt(r.createdAt)}</td>
                <td className="px-4 py-3 tabular-nums">{fmt(r.invitedAt)}</td>
                <td className="px-4 py-3">{r.signedUp ? t("table.yes") : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between text-sm text-fg-tertiary">
        <span>{t("table.people", { n: total.toLocaleString(lang) })}</span>
        <div className="flex items-center gap-2">
          <button className={ctl} disabled={page === 0} onClick={() => goto((p) => p - 1)}>{t("table.previous")}</button>
          <span className="tabular-nums">{page + 1} / {pages}</span>
          <button className={ctl} disabled={page + 1 >= pages} onClick={() => goto((p) => p + 1)}>{t("table.next")}</button>
        </div>
      </div>
    </section>
  )
}
