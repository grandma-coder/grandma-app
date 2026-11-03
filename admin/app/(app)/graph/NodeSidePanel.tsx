"use client"
import Link from "next/link"
import { useTranslations } from "next-intl"

export interface PanelNode {
  id: string
  label: string
  behavior: string
  tier: string
  degree: number
}

const BEHAVIOR_COLOR: Record<string, string> = {
  pre_pregnancy: "#E58BB4",
  pregnancy: "#B7A6E8",
  kids: "#8BB8E8",
  none: "#B3AC9C",
}

/**
 * Slide-in detail panel for a clicked population-graph node. Shows the person's
 * headline facts + an "Open full graph" action that switches to their One-User
 * ego view. Shared by the 2D and 3D graphs.
 */
export function NodeSidePanel({
  node,
  onClose,
  onOpenGraph,
}: {
  node: PanelNode
  onClose: () => void
  onOpenGraph: (id: string, label: string) => void
}) {
  const t = useTranslations("graph")
  const behaviorLabel = t.has(`behavior.${node.behavior}`) ? t(`behavior.${node.behavior}`) : node.behavior
  return (
    <div className="absolute right-0 top-0 z-20 flex h-full w-72 flex-col border-l border-border-default bg-card/97 backdrop-blur-sm shadow-[var(--shadow-md)]">
      <div className="flex items-start justify-between gap-2 border-b border-border-subtle p-4">
        <div className="flex items-center gap-2">
          <span
            className="flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold text-white"
            style={{ background: BEHAVIOR_COLOR[node.behavior] ?? BEHAVIOR_COLOR.none }}
          >
            {(node.label.trim()[0] ?? "?").toUpperCase()}
          </span>
          <div className="min-w-0">
            <p className="truncate font-semibold text-fg-primary">{node.label}</p>
            <p className="text-xs text-fg-tertiary">{behaviorLabel}</p>
          </div>
        </div>
        <button onClick={onClose} className="text-fg-muted hover:text-fg-primary" aria-label={t("panel.close")}>
          ✕
        </button>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto p-4 text-sm">
        <dl className="space-y-2">
          <div className="flex justify-between gap-3">
            <dt className="text-fg-muted">{t("panel.connections")}</dt>
            <dd className="font-semibold tabular-nums text-fg-primary">{node.degree}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-fg-muted">{t("panel.subscription")}</dt>
            <dd className="text-fg-secondary">{node.tier}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-fg-muted">{t("panel.behavior")}</dt>
            <dd className="text-fg-secondary">{behaviorLabel}</dd>
          </div>
        </dl>
      </div>

      <div className="space-y-2 border-t border-border-subtle p-4">
        <button
          onClick={() => onOpenGraph(node.id, node.label)}
          className="w-full rounded-lg bg-accent-500 px-3 py-2 text-sm font-medium text-white hover:bg-accent-600"
        >
          {t("panel.openGraph")}
        </button>
        <Link
          href={`/users/${node.id}`}
          className="block w-full rounded-lg border border-border-default px-3 py-2 text-center text-sm font-medium text-fg-secondary hover:bg-card-hover"
        >
          {t("panel.viewProfile")}
        </Link>
      </div>
    </div>
  )
}
