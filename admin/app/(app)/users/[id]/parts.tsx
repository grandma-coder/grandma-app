"use client"
import { Component, type ReactNode } from "react"
import { useTranslations } from "next-intl"
import { RotateCw } from "lucide-react"

/**
 * Shared building blocks for the user-detail tabs: card shell, KPI tile and the
 * three per-tab states (loading / error + retry / empty). Every tab renders
 * through these so the states look the same everywhere.
 */

export function Card({ title, aside, children, className }: { title?: string; aside?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl border border-border-default bg-card p-5 shadow-[var(--shadow-sm)] ${className ?? ""}`}>
      {(title || aside) && (
        <div className="mb-3 flex items-center justify-between gap-2">
          {title && <h2 className="display text-base font-semibold text-fg-primary">{title}</h2>}
          {aside}
        </div>
      )}
      {children}
    </div>
  )
}

export function Kpi({ label, value, sub, tone }: { label: string; value: string | number; sub?: string; tone?: string }) {
  return (
    <div className="rounded-xl border border-border-default bg-card p-4 shadow-[var(--shadow-sm)]">
      <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-fg-muted">{label}</p>
      <p className={`display mt-1 text-2xl font-bold tabular-nums ${tone ?? "text-fg-primary"}`}>{value}</p>
      {sub && <p className="mt-0.5 text-xs text-fg-tertiary">{sub}</p>}
    </div>
  )
}

export function Eyebrow({ children }: { children: ReactNode }) {
  return <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-fg-muted">{children}</p>
}

/** Skeleton rows — shape-only placeholder while a tab's query is in flight. */
export function LoadingState({ rows = 3 }: { rows?: number }) {
  const t = useTranslations("users")
  return (
    <div role="status" aria-live="polite" className="space-y-2">
      <span className="sr-only">{t("loading")}</span>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="h-10 animate-pulse rounded-lg bg-deep" style={{ opacity: 1 - i * 0.2 }} />
      ))}
    </div>
  )
}

/** "Não deu para carregar {what}." + retry. `what` is a key under detail.state.what. */
export function ErrorState({ what, onRetry, compact }: { what: string; onRetry?: () => void; compact?: boolean }) {
  const t = useTranslations("users.detail.state")
  return (
    <div role="alert" className={`flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border-subtle bg-deep ${compact ? "p-2.5 text-xs" : "p-4 text-sm"}`}>
      <span className="text-[var(--pill-danger-fg)]">{t("error", { what: t(`what.${what}`) })}</span>
      {onRetry && (
        <button onClick={onRetry} className="inline-flex items-center gap-1.5 rounded-lg border border-border-default bg-card px-2.5 py-1 text-xs font-medium text-fg-secondary hover:text-fg-primary">
          <RotateCw className="size-3.5" aria-hidden />
          {t("retry")}
        </button>
      )}
    </div>
  )
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <p className="rounded-lg border border-dashed border-border-default p-6 text-center text-sm text-fg-tertiary">{children}</p>
}

/**
 * Render-error fence around one tab: if a tab throws while rendering, only that
 * panel shows the crash message — the header strip and the other tabs live on.
 * (Query errors don't land here; each tab handles those with ErrorState.)
 */
export class PanelBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { crashed: boolean }> {
  state = { crashed: false }
  static getDerivedStateFromError() {
    return { crashed: true }
  }
  componentDidCatch(err: unknown) {
    console.error("[user-detail] tab crashed", err)
  }
  render() {
    return this.state.crashed ? this.props.fallback : this.props.children
  }
}
