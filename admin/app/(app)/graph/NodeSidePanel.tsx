"use client"
import Link from "next/link"

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
const BEHAVIOR_LABEL: Record<string, string> = {
  pre_pregnancy: "Pre-pregnancy",
  pregnancy: "Pregnancy",
  kids: "Kids",
  none: "No behavior",
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
            <p className="text-xs text-fg-tertiary">{BEHAVIOR_LABEL[node.behavior] ?? node.behavior}</p>
          </div>
        </div>
        <button onClick={onClose} className="text-fg-muted hover:text-fg-primary" aria-label="Close">
          ✕
        </button>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto p-4 text-sm">
        <dl className="space-y-2">
          <div className="flex justify-between gap-3">
            <dt className="text-fg-muted">Connections</dt>
            <dd className="font-semibold tabular-nums text-fg-primary">{node.degree}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-fg-muted">Subscription</dt>
            <dd className="text-fg-secondary">{node.tier}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-fg-muted">Behavior</dt>
            <dd className="text-fg-secondary">{BEHAVIOR_LABEL[node.behavior] ?? node.behavior}</dd>
          </div>
        </dl>
      </div>

      <div className="space-y-2 border-t border-border-subtle p-4">
        <button
          onClick={() => onOpenGraph(node.id, node.label)}
          className="w-full rounded-lg bg-accent-500 px-3 py-2 text-sm font-medium text-white hover:bg-accent-600"
        >
          Open full graph →
        </button>
        <Link
          href={`/users/${node.id}`}
          className="block w-full rounded-lg border border-border-default px-3 py-2 text-center text-sm font-medium text-fg-secondary hover:bg-card-hover"
        >
          View user profile
        </Link>
      </div>
    </div>
  )
}
