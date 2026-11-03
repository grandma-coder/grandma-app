"use client"
import { useMemo, useState } from "react"
import Link from "next/link"
import { trpc } from "@/lib/trpc"
import { PopulationGraph } from "./PopulationGraph"
import { PopulationGraph3D } from "./PopulationGraph3D"

type NodeKind = "user" | "child" | "caregiver" | "owner" | "behavior" | "subscription" | "community"

interface GNode {
  id: string
  kind: NodeKind
  label: string
  sublabel?: string | null
  href?: string | null
  meta?: Record<string, string | number | null>
}
interface GEdge { source: string; target: string; kind: string; label?: string | null }

// Node color by kind — reuses the console's chart/status palette via CSS vars.
const KIND_COLOR: Record<NodeKind, string> = {
  user: "var(--accent-500)",
  child: "var(--chart-2)",
  caregiver: "var(--chart-3)",
  owner: "var(--chart-4)",
  behavior: "var(--chart-1)",
  subscription: "var(--success-500)",
  community: "var(--chart-5)",
}

const KIND_LABEL: Record<NodeKind, string> = {
  user: "User",
  child: "Child",
  caregiver: "Caregiver",
  owner: "Circle owner",
  behavior: "Behavior",
  subscription: "Subscription",
  community: "Community",
}

// ── User picker ──────────────────────────────────────────────────────────────

function UserPicker({ onPick }: { onPick: (id: string, label: string) => void }) {
  const [q, setQ] = useState("")
  const list = trpc.users.list.useQuery({ search: q || undefined, limit: 8, offset: 0 }, { staleTime: 30_000 })

  return (
    <div className="rounded-xl border border-border-default bg-card p-4 shadow-[var(--shadow-sm)]">
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search a user by email or name…"
        className="w-full rounded-lg border border-border-default bg-deep px-3 py-2 text-sm text-fg-primary placeholder:text-fg-muted focus:border-accent-400 focus:outline-none"
      />
      {list.data && list.data.rows.length > 0 && (
        <div className="mt-2 divide-y divide-border-subtle">
          {list.data.rows.map((u) => (
            <button
              key={u.id}
              onClick={() => onPick(u.id, u.email ?? u.name ?? u.id.slice(0, 8))}
              className="flex w-full items-center justify-between gap-2 py-2 text-left text-sm hover:text-accent-500"
            >
              <span className="text-fg-primary">{u.email ?? u.name ?? u.id.slice(0, 8)}</span>
              <span className="flex gap-1">
                {u.behaviors.map((b) => (
                  <span key={b} className="pill pill-info text-[10px]">{b}</span>
                ))}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Radial layout ────────────────────────────────────────────────────────────
// Ego layout: center node in the middle, satellites grouped by kind into arcs
// on a ring. Deterministic (no physics sim, no deps) — stable + fast.

interface Placed extends GNode { x: number; y: number }

function layout(nodes: GNode[], centerId: string, w: number, h: number): Placed[] {
  const cx = w / 2
  const cy = h / 2
  const center = nodes.find((n) => n.id === centerId)
  const satellites = nodes.filter((n) => n.id !== centerId)

  // Group satellites by kind so like nodes cluster in the same arc.
  const order: NodeKind[] = ["child", "caregiver", "owner", "behavior", "subscription", "community"]
  const grouped = satellites.slice().sort((a, b) => order.indexOf(a.kind) - order.indexOf(b.kind))

  const radius = Math.min(w, h) / 2 - 70
  const placed: Placed[] = []
  if (center) placed.push({ ...center, x: cx, y: cy })

  const n = grouped.length || 1
  grouped.forEach((node, i) => {
    // Start at the top, sweep clockwise; jitter radius slightly by index parity
    // so labels are less likely to collide.
    const angle = (i / n) * Math.PI * 2 - Math.PI / 2
    const r = radius * (i % 2 === 0 ? 1 : 0.82)
    placed.push({ ...node, x: cx + Math.cos(angle) * r, y: cy + Math.sin(angle) * r })
  })
  return placed
}

// ── Graph SVG ────────────────────────────────────────────────────────────────

function GraphSvg({
  nodes,
  edges,
  centerId,
  onSelect,
  selectedId,
}: {
  nodes: GNode[]
  edges: GEdge[]
  centerId: string
  onSelect: (n: GNode) => void
  selectedId: string | null
}) {
  const W = 720
  const H = 520
  const placed = useMemo(() => layout(nodes, centerId, W, H), [nodes, centerId])
  const byId = useMemo(() => new Map(placed.map((p) => [p.id, p])), [placed])

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 560 }}>
      {/* edges */}
      {edges.map((e, i) => {
        const s = byId.get(e.source)
        const t = byId.get(e.target)
        if (!s || !t) return null
        const mx = (s.x + t.x) / 2
        const my = (s.y + t.y) / 2
        return (
          <g key={i}>
            <line x1={s.x} y1={s.y} x2={t.x} y2={t.y} stroke="var(--border-default)" strokeWidth={1.5} />
            {e.label && (
              <text x={mx} y={my - 3} textAnchor="middle" className="fill-fg-muted" style={{ fontSize: 9 }}>
                {e.label}
              </text>
            )}
          </g>
        )
      })}
      {/* nodes */}
      {placed.map((p) => {
        const isCenter = p.id === centerId
        const isSel = p.id === selectedId
        const r = isCenter ? 26 : 18
        return (
          <g key={p.id} onClick={() => onSelect(p)} style={{ cursor: "pointer" }}>
            <circle
              cx={p.x}
              cy={p.y}
              r={r}
              fill={KIND_COLOR[p.kind]}
              fillOpacity={isCenter ? 0.95 : 0.85}
              stroke={isSel ? "var(--fg-primary)" : "var(--bg-card)"}
              strokeWidth={isSel ? 3 : 2}
            />
            <text
              x={p.x}
              y={p.y + r + 12}
              textAnchor="middle"
              className="fill-fg-secondary"
              style={{ fontSize: isCenter ? 12 : 11, fontWeight: isCenter ? 600 : 500 }}
            >
              {p.label.length > 20 ? p.label.slice(0, 19) + "…" : p.label}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

// ── Detail panel ─────────────────────────────────────────────────────────────

function NodeDetail({ node }: { node: GNode }) {
  return (
    <div className="rounded-xl border border-border-default bg-card p-4 shadow-[var(--shadow-sm)]">
      <div className="mb-2 flex items-center gap-2">
        <span className="inline-block h-3 w-3 rounded-full" style={{ background: KIND_COLOR[node.kind] }} />
        <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-fg-muted">{KIND_LABEL[node.kind]}</span>
      </div>
      <p className="display text-lg font-semibold text-fg-primary">{node.label}</p>
      {node.sublabel && <p className="text-sm text-fg-tertiary">{node.sublabel}</p>}
      {node.meta && (
        <dl className="mt-3 space-y-1 text-sm">
          {Object.entries(node.meta).map(([k, v]) => (
            <div key={k} className="flex justify-between gap-3">
              <dt className="text-fg-muted capitalize">{k}</dt>
              <dd className="text-right text-fg-secondary">{String(v ?? "—")}</dd>
            </div>
          ))}
        </dl>
      )}
      {node.href && (
        <Link href={node.href} className="mt-3 inline-block text-xs font-medium text-accent-500 hover:text-accent-600">
          open in console →
        </Link>
      )}
    </div>
  )
}

// ── Main ─────────────────────────────────────────────────────────────────────

export function RelationshipExplorer() {
  const [mode, setMode] = useState<"ego" | "population">("population")
  const [viz, setViz] = useState<"2d" | "3d">("2d")
  const [picked, setPicked] = useState<{ id: string; label: string } | null>(null)
  const [selected, setSelected] = useState<GNode | null>(null)

  const graph = trpc.graph.ego.useQuery(picked ? { userId: picked.id } : { userId: "00000000-0000-0000-0000-000000000000" }, {
    enabled: !!picked && mode === "ego",
    staleTime: 30_000,
  })
  const population = trpc.graph.population.useQuery({ limit: 150 }, { enabled: mode === "population", staleTime: 60_000 })

  const goToUser = (id: string, label: string) => {
    setPicked({ id, label })
    setSelected(null)
    setMode("ego")
  }

  const kinds = useMemo(() => {
    const set = new Set<NodeKind>()
    graph.data?.nodes.forEach((n) => set.add(n.kind))
    return Array.from(set)
  }, [graph.data])

  return (
    <div className="space-y-4">
      {/* Ego | Population toggle */}
      <div className="flex gap-2">
        {(["ego", "population"] as const).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`rounded-full px-3.5 py-1.5 text-xs font-medium capitalize transition-colors ${
              mode === m ? "bg-accent-500 text-white" : "border border-border-default text-fg-tertiary hover:text-fg-primary"
            }`}
          >
            {m === "ego" ? "One user" : "All users"}
          </button>
        ))}
      </div>

      {mode === "population" && (
        <>
          <div className="flex gap-2">
            {(["2d", "3d"] as const).map((v) => (
              <button
                key={v}
                onClick={() => setViz(v)}
                className={`rounded-full px-3 py-1 text-xs font-medium uppercase transition-colors ${
                  viz === v ? "bg-accent-500 text-white" : "border border-border-default text-fg-tertiary hover:text-fg-primary"
                }`}
              >
                {v}
              </button>
            ))}
            {viz === "3d" && <span className="self-center text-xs text-fg-muted">drag to orbit · scroll to zoom · click a node to open it</span>}
          </div>
          {population.isLoading && <p className="text-sm text-fg-tertiary">Building the population graph…</p>}
          {population.data &&
            (viz === "3d" ? (
              <PopulationGraph3D key={"3d-" + population.data.shown} data={population.data} onPickUser={goToUser} />
            ) : (
              <PopulationGraph key={population.data.shown} data={population.data} onPickUser={goToUser} onExploreOne={() => setMode("ego")} />
            ))}
        </>
      )}

      {mode === "ego" && (
      <>
      <UserPicker onPick={goToUser} />

      {!picked && <p className="text-sm text-fg-muted">Search and pick a user above to render their relationship graph.</p>}

      {picked && graph.isLoading && <p className="text-sm text-fg-tertiary">Building graph for {picked.label}…</p>}

      {picked && graph.data && (
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="rounded-xl border border-border-default bg-card p-2 shadow-[var(--shadow-sm)] lg:col-span-2">
            {graph.data.nodes.length <= 1 ? (
              <p className="p-6 text-sm text-fg-tertiary">This user has no children, care-circle, behaviors, or community activity yet.</p>
            ) : (
              <GraphSvg
                nodes={graph.data.nodes}
                edges={graph.data.edges}
                centerId={graph.data.centerId}
                onSelect={setSelected}
                selectedId={selected?.id ?? null}
              />
            )}
          </div>

          <div className="space-y-3">
            {/* Legend */}
            <div className="rounded-xl border border-border-default bg-card p-4 shadow-[var(--shadow-sm)]">
              <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.1em] text-fg-muted">Legend</p>
              <div className="flex flex-wrap gap-x-3 gap-y-1.5">
                {kinds.map((k) => (
                  <span key={k} className="flex items-center gap-1.5 text-xs text-fg-secondary">
                    <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: KIND_COLOR[k] }} />
                    {KIND_LABEL[k]}
                  </span>
                ))}
              </div>
            </div>

            {selected ? (
              <NodeDetail node={selected} />
            ) : (
              <p className="px-1 text-sm text-fg-muted">Click a node to inspect it.</p>
            )}
          </div>
        </div>
      )}
      </>
      )}
    </div>
  )
}
