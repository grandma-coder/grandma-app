"use client"
import { useEffect, useState } from "react"
import { trpc } from "@/lib/trpc"
import type { WaitlistFilter } from "@/lib/waitlist"

const MODES = [["", "All modes"], ["pre", "Cycle"], ["preg", "Pregnancy"], ["kids", "Kids"], ["meno", "Menopause"]] as const
const LOCALES = [["", "All languages"], ["en", "English"], ["pt", "Português"]] as const
const INVITED = [["all", "Everyone"], ["pending", "Not invited"], ["invited", "Invited"]] as const
const fmt = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString() : "—")

export function WaitlistTable() {
  const utils = trpc.useUtils()
  const [filter, setFilter] = useState<WaitlistFilter>({ invited: "all" })
  const [page, setPage] = useState(0)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [notice, setNotice] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const stats = trpc.waitlist.stats.useQuery()
  const countries: (readonly [string, string])[] = [["", "All countries"], ...(stats.data?.byCountry ?? []).map((r) => [r.country, `${r.country} (${r.count})`] as const)]

  // Debounce search: every list call writes an audit row, so don't fire per keystroke.
  useEffect(() => {
    const t = setTimeout(() => {
      const q = search || undefined
      setFilter((f) => (f.q === q ? f : { ...f, q }))
      setPage(0)
      setSelected(new Set())
      setNotice(null)
    }, 300)
    return () => clearTimeout(t)
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
      setNotice(`Exported ${count} rows.`)
    },
    onError: (e) => setNotice(e.message),
  })
  const promote = trpc.waitlist.promoteToBeta.useMutation({
    onSuccess: ({ promoted, alreadyBeta }) => {
      setSelected(new Set())
      setNotice(`Promoted ${promoted} to beta${alreadyBeta ? ` · ${alreadyBeta} were already on the beta list` : ""}.`)
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

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <input className={`${ctl} min-w-[220px]`} aria-label="Search email or name" placeholder="Search email or name" value={search} onChange={(e) => setSearch(e.target.value)} />
        <select aria-label="Country" className={ctl} value={filter.country ?? ""} onChange={(e) => update({ country: e.target.value || undefined })}>{opt(countries)}</select>
        <select aria-label="Mode" className={ctl} value={filter.mode ?? ""} onChange={(e) => update({ mode: (e.target.value || undefined) as WaitlistFilter["mode"] })}>{opt(MODES)}</select>
        <select aria-label="Language" className={ctl} value={filter.locale ?? ""} onChange={(e) => update({ locale: (e.target.value || undefined) as WaitlistFilter["locale"] })}>{opt(LOCALES)}</select>
        <select aria-label="Invited" className={ctl} value={filter.invited} onChange={(e) => update({ invited: e.target.value as WaitlistFilter["invited"] })}>{opt(INVITED)}</select>
        <input type="date" aria-label="From" className={ctl} value={filter.from ?? ""} onChange={(e) => update({ from: e.target.value || undefined })} />
        <input type="date" aria-label="To" className={ctl} value={filter.to ?? ""} onChange={(e) => update({ to: e.target.value || undefined })} />
        <div className="ml-auto flex gap-2">
          <button className={ctl} disabled={exportCsv.isPending} onClick={() => exportCsv.mutate({ filter })}>{exportCsv.isPending ? "Exporting…" : "Export CSV"}</button>
          <button className={`${ctl} font-semibold`} disabled={selected.size === 0 || promote.isPending} onClick={() => promote.mutate({ ids: [...selected] })}>
            {promote.isPending ? "Promoting…" : `Promote to beta (${selected.size})`}
          </button>
        </div>
      </div>
      {notice && <p role="status" className="text-sm text-fg-secondary">{notice}</p>}
      {list.error && <p className="text-sm text-fg-secondary">Couldn&apos;t load the list: {list.error.message}</p>}
      <div className="overflow-x-auto rounded-xl border border-border-default bg-card shadow-[var(--shadow-sm)]">
        <table className="w-full text-left text-sm">
          <thead className="font-mono text-[11px] uppercase tracking-[0.12em] text-fg-muted">
            <tr className="border-b border-border-default">
              <th className="w-10 px-4 py-3"><input type="checkbox" aria-label="Select page" checked={rows.length > 0 && rows.every((r) => selected.has(r.id))} onChange={(e) => setSelected(e.target.checked ? new Set(rows.map((r) => r.id)) : new Set())} /></th>
              {["#", "Email", "Name", "Country", "Mode", "Lang", "Joined", "Invited", "In app"].map((h) => <th key={h} className="px-4 py-3">{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {list.isLoading && <tr><td colSpan={10} className="px-4 py-6 text-fg-tertiary">Loading…</td></tr>}
            {!list.isLoading && !list.error && rows.length === 0 && <tr><td colSpan={10} className="px-4 py-6 text-fg-tertiary">No one matches these filters.</td></tr>}
            {rows.map((r, i) => (
              <tr key={r.id} className="border-b border-border-default last:border-0">
                <td className="px-4 py-3"><input type="checkbox" aria-label={`Select ${r.email}`} checked={selected.has(r.id)} onChange={() => toggle(r.id)} /></td>
                <td className="px-4 py-3 tabular-nums text-fg-muted">{page * pageSize + i + 1}</td>
                <td className="px-4 py-3 text-fg-primary">{r.email}</td>
                <td className="px-4 py-3 text-fg-secondary">{r.name ?? "—"}</td>
                <td className="px-4 py-3">{r.country}</td>
                <td className="px-4 py-3">{r.mode}</td>
                <td className="px-4 py-3 uppercase">{r.locale}</td>
                <td className="px-4 py-3 tabular-nums">{fmt(r.createdAt)}</td>
                <td className="px-4 py-3 tabular-nums">{fmt(r.invitedAt)}</td>
                <td className="px-4 py-3">{r.signedUp ? "Yes" : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between text-sm text-fg-tertiary">
        <span>{total.toLocaleString()} people</span>
        <div className="flex items-center gap-2">
          <button className={ctl} disabled={page === 0} onClick={() => goto((p) => p - 1)}>Previous</button>
          <span className="tabular-nums">{page + 1} / {pages}</span>
          <button className={ctl} disabled={page + 1 >= pages} onClick={() => goto((p) => p + 1)}>Next</button>
        </div>
      </div>
    </section>
  )
}
