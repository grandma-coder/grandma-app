"use client"
import { useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import { Search, User } from "lucide-react"
import { trpc } from "@/lib/trpc"
import { navFor } from "./nav"
import { matchScore } from "@/lib/palette"

type Entry = { key: string; label: string; hint: string | null; href: string; icon: React.ReactNode }

/**
 * ⌘K — jump to any page or person. Pages come from the sidebar config (filtered by role);
 * typing two or more characters also searches app accounts by name or email.
 */
export function CommandPalette({ isAdmin, onClose }: { isAdmin: boolean; onClose: () => void }) {
  const t = useTranslations("nav")
  const router = useRouter()
  const [q, setQ] = useState("")
  const [active, setActive] = useState(0)
  const input = useRef<HTMLInputElement>(null)
  useEffect(() => input.current?.focus(), [])

  const term = q.trim()
  const people = trpc.users.list.useQuery({ search: term, limit: 6, offset: 0 }, { enabled: term.length >= 2, staleTime: 30_000 })

  const entries = useMemo<Entry[]>(() => {
    const pages = navFor(isAdmin)
      .map((i) => {
        const label = t(`items.${i.label}`)
        const hint = i.section ? t(`sections.${i.section}`) : null
        return { i, label, hint, score: matchScore(term, `${label} ${hint ?? ""} ${i.href}`) }
      })
      .filter((p) => p.score > 0)
      .sort((a, b) => b.score - a.score)
      .map(({ i, label, hint }) => {
        const Icon = i.icon
        return { key: i.href, label, hint, href: i.href, icon: <Icon size={15} /> }
      })
    const users = term.length >= 2 ? (people.data?.rows ?? []).map((u) => ({
      key: `u-${u.id}`, label: u.name || u.email || u.id, hint: u.name ? u.email : null, href: `/users/${u.id}`, icon: <User size={15} />,
    })) : []
    return [...pages, ...users]
  }, [isAdmin, people.data, t, term])

  const go = (e: Entry | undefined) => { if (!e) return; router.push(e.href); onClose() }
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") onClose()
    else if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(entries.length - 1, a + 1)) }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(0, a - 1)) }
    else if (e.key === "Enter") { e.preventDefault(); go(entries[active]) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/30 p-4 pt-[12vh]" onClick={onClose}>
      <div role="dialog" aria-label={t("search")} className="w-full max-w-lg overflow-hidden rounded-2xl border border-border-default bg-card shadow-[var(--shadow-xl)]" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2 border-b border-border-subtle px-4">
          <Search size={16} className="text-fg-muted" />
          <input ref={input} value={q} onChange={(e) => { setQ(e.target.value); setActive(0) }} onKeyDown={onKey} placeholder={t("palette.placeholder")}
            className="h-12 flex-1 bg-transparent text-sm text-fg-primary outline-none placeholder:text-fg-muted" />
          <kbd className="rounded border border-border-default px-1.5 font-mono text-[10px] text-fg-muted">esc</kbd>
        </div>
        <ul className="max-h-[50vh] overflow-y-auto p-2" role="listbox">
          {entries.length === 0 && (
            <li className="px-3 py-6 text-center text-sm text-fg-muted">{people.isFetching ? t("palette.searching") : t("palette.empty")}</li>
          )}
          {entries.map((e, i) => (
            <li key={e.key} role="option" aria-selected={i === active}>
              <button onMouseEnter={() => setActive(i)} onClick={() => go(e)}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm ${i === active ? "bg-deep text-fg-primary" : "text-fg-secondary"}`}>
                <span className="text-fg-tertiary">{e.icon}</span>
                <span className="flex-1 truncate">{e.label}</span>
                {e.hint && <span className="truncate text-xs text-fg-muted">{e.hint}</span>}
              </button>
            </li>
          ))}
        </ul>
        {term.length >= 2 && people.error && <p className="border-t border-border-subtle px-4 py-2 text-xs text-fg-muted">{t("palette.peopleError")}</p>}
      </div>
    </div>
  )
}
