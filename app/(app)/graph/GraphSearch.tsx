"use client"
import { useMemo, useState } from "react"

interface SearchNode { id: string; label: string; behavior: string; degree: number }

const BEHAVIOR_COLOR: Record<string, string> = {
  pre_pregnancy: "#E58BB4",
  pregnancy: "#B7A6E8",
  kids: "#8BB8E8",
  none: "#B3AC9C",
}

/**
 * Find-a-person search over the population graph's nodes. Filters client-side
 * (the node set is already capped/loaded) and calls onSelect with the picked
 * node's id so the graph can center + open its panel. Shared by 2D and 3D.
 */
export function GraphSearch({ nodes, onSelect }: { nodes: SearchNode[]; onSelect: (id: string) => void }) {
  const [q, setQ] = useState("")
  const results = useMemo(() => {
    const query = q.trim().toLowerCase()
    if (!query) return []
    return nodes
      .filter((n) => n.label.toLowerCase().includes(query))
      .sort((a, b) => b.degree - a.degree)
      .slice(0, 8)
  }, [q, nodes])

  return (
    <div className="relative w-full max-w-xs">
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Find a person in the graph…"
        className="w-full rounded-lg border border-border-default bg-card px-3 py-1.5 text-sm text-fg-primary placeholder:text-fg-muted focus:border-accent-400 focus:outline-none"
      />
      {results.length > 0 && (
        <div className="absolute z-30 mt-1 w-full overflow-hidden rounded-lg border border-border-default bg-card shadow-[var(--shadow-md)]">
          {results.map((n) => (
            <button
              key={n.id}
              onClick={() => {
                onSelect(n.id)
                setQ("")
              }}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-card-hover"
            >
              <span
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold text-white"
                style={{ background: BEHAVIOR_COLOR[n.behavior] ?? BEHAVIOR_COLOR.none }}
              >
                {(n.label.trim()[0] ?? "?").toUpperCase()}
              </span>
              <span className="flex-1 truncate text-fg-primary">{n.label}</span>
              <span className="text-xs text-fg-muted">{n.degree}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
