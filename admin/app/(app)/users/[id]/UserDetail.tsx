"use client"
import { useRef, useState, type KeyboardEvent, type ReactNode } from "react"
import { useTranslations } from "next-intl"
import { type Profile, type TabKey, TABS } from "./user360"
import { HeaderStrip } from "./HeaderStrip"
import { OverviewTab } from "./OverviewTab"
import { ActivityTab } from "./ActivityTab"
import { FamilyTab } from "./FamilyTab"
import { CommunityTab } from "./CommunityTab"
import { DevicesTab } from "./DevicesTab"
import { AccountTab } from "./AccountTab"
import { PanelBoundary } from "./parts"

/**
 * Usuário 360 — sticky identity strip + tab bar, one panel per tab.
 *
 * The active tab lives in `?tab=` (linkable). We update the URL with
 * history.replaceState, which Next syncs without a server round-trip — a
 * router.replace would re-render the page and write another detail-view audit
 * row on every tab click. A panel mounts the first time its tab is opened and
 * stays mounted (hidden) after, so its queries are lazy but its state (e.g.
 * loaded timeline pages) survives switching back. Each panel sits in its own
 * error boundary.
 */
export function UserDetail({ userId, profile, initialTab }: { userId: string; profile: Profile; initialTab: TabKey }) {
  const t = useTranslations("users.detail")
  const [tab, setTab] = useState<TabKey>(initialTab)
  const [visited, setVisited] = useState<ReadonlySet<TabKey>>(() => new Set([initialTab]))
  const buttons = useRef<(HTMLButtonElement | null)[]>([])

  function select(next: TabKey) {
    setTab(next)
    setVisited((v) => (v.has(next) ? v : new Set([...v, next])))
    const url = new URL(window.location.href)
    if (next === "overview") url.searchParams.delete("tab")
    else url.searchParams.set("tab", next)
    window.history.replaceState(null, "", url)
  }

  /** ←/→ cycle, Home/End jump — standard tablist keyboard model. */
  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    const i = TABS.indexOf(tab)
    let n = i
    if (e.key === "ArrowLeft") n = (i - 1 + TABS.length) % TABS.length
    else if (e.key === "ArrowRight") n = (i + 1) % TABS.length
    else if (e.key === "Home") n = 0
    else if (e.key === "End") n = TABS.length - 1
    else return
    e.preventDefault()
    select(TABS[n])
    buttons.current[n]?.focus()
  }

  const panels: Record<TabKey, ReactNode> = {
    overview: <OverviewTab userId={userId} profile={profile} active={tab === "overview"} />,
    activity: <ActivityTab userId={userId} active={tab === "activity"} />,
    family: <FamilyTab userId={userId} active={tab === "family"} />,
    community: <CommunityTab userId={userId} profile={profile} active={tab === "community"} />,
    devices: <DevicesTab userId={userId} profile={profile} active={tab === "devices"} />,
    account: <AccountTab userId={userId} profile={profile} />,
  }

  return (
    <div className="mt-3">
      <div className="sticky top-0 z-10 -mx-8 border-b border-border-default bg-root/95 px-8 backdrop-blur">
        <HeaderStrip userId={userId} profile={profile} />
        <div role="tablist" aria-label={t("tabs.label")} onKeyDown={onKeyDown} className="-mb-px flex gap-1 overflow-x-auto">
          {TABS.map((k, i) => {
            const on = tab === k
            return (
              <button
                key={k}
                ref={(el) => {
                  buttons.current[i] = el
                }}
                role="tab"
                type="button"
                id={`user-tab-${k}`}
                aria-selected={on}
                aria-controls={`user-panel-${k}`}
                tabIndex={on ? 0 : -1}
                onClick={() => select(k)}
                className={`whitespace-nowrap border-b-2 px-3 py-2 text-sm transition ${
                  on ? "border-accent-500 font-medium text-fg-primary" : "border-transparent text-fg-tertiary hover:text-fg-primary"
                }`}
              >
                {t(`tabs.${k}`)}
              </button>
            )
          })}
        </div>
      </div>

      <div className="pt-6">
        {TABS.filter((k) => visited.has(k)).map((k) => (
          <div key={k} role="tabpanel" id={`user-panel-${k}`} aria-labelledby={`user-tab-${k}`} hidden={tab !== k}>
            <PanelBoundary fallback={<p className="rounded-lg border border-border-subtle bg-deep p-4 text-sm text-[var(--pill-danger-fg)]">{t("state.crashed")}</p>}>
              {panels[k]}
            </PanelBoundary>
          </div>
        ))}
      </div>
    </div>
  )
}
