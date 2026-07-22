"use client"
import { useMemo, useState } from "react"

interface PopNode { id: string; label: string; behavior: string; tier: string; degree: number }
interface PopEdge { source: string; target: string; kind: "care_circle" | "shared_channel"; weight: number }

// Behavior → color (matches the app's mode palette; 'none' = neutral).
const BEHAVIOR_COLOR: Record<string, string> = {
  pre_pregnancy: "#E58BB4",
  pregnancy: "#B7A6E8",
  kids: "#8BB8E8",
  none: "var(--fg-muted)",
}
const BEHAVIOR_LABEL: Record<string, string> = {
  pre_pregnancy: "Pre-pregnancy",
  pregnancy: "Pregnancy",
  kids: "Kids",
  none: "No behavior",
}

interface Sim extends PopNode { x: number; y: number }

/**
 * Tiny deterministic force layout — no dependency, computed once via useMemo.
 * Repulsion between all nodes + spring along edges + gentle centering, run for a
 * fixed number of iterations. Seeded initial positions (index-based) so the
 * layout is stable across renders without Math.random.
 */
function forceLayout(nodes: PopNode[], edges: PopEdge[], w: number, h: number): Sim[] {
  const cx = w / 2
  const cy = h / 2
  const N = nodes.length
  const idx = new Map(nodes.map((n, i) => [n.id, i]))
  // Seed on a circle (deterministic) so the sim converges consistently.
  const sim: Sim[] = nodes.map((n, i) => {
    const a = (i / N) * Math.PI * 2
    const r = Math.min(w, h) / 3
    return { ...n, x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r }
  })

  const edgePairs = edges
    .map((e) => [idx.get(e.source), idx.get(e.target)] as [number | undefined, number | undefined])
    .filter((p): p is [number, number] => p[0] !== undefined && p[1] !== undefined)

  const ITER = 90
  const REPULSE = 5200
  const SPRING = 0.02
  const SPRING_LEN = 70
  const CENTER = 0.012

  for (let it = 0; it < ITER; it++) {
    const fx = new Array(N).fill(0)
    const fy = new Array(N).fill(0)
    // Repulsion (O(n²) — fine for ≤400 nodes).
    for (let i = 0; i < N; i++) {
      for (let j = i + 1; j < N; j++) {
        const dx = sim[i].x - sim[j].x
        const dy = sim[i].y - sim[j].y
        const d2 = dx * dx + dy * dy || 0.01
        const f = REPULSE / d2
        const d = Math.sqrt(d2)
        const ux = dx / d
        const uy = dy / d
        fx[i] += ux * f; fy[i] += uy * f
        fx[j] -= ux * f; fy[j] -= uy * f
      }
    }
    // Springs.
    for (const [a, b] of edgePairs) {
      const dx = sim[b].x - sim[a].x
      const dy = sim[b].y - sim[a].y
      const d = Math.sqrt(dx * dx + dy * dy) || 0.01
      const f = (d - SPRING_LEN) * SPRING
      const ux = dx / d
      const uy = dy / d
      fx[a] += ux * f; fy[a] += uy * f
      fx[b] -= ux * f; fy[b] -= uy * f
    }
    // Apply + centering, with cooling.
    const cool = 1 - it / ITER
    for (let i = 0; i < N; i++) {
      fx[i] += (cx - sim[i].x) * CENTER
      fy[i] += (cy - sim[i].y) * CENTER
      sim[i].x += Math.max(-12, Math.min(12, fx[i])) * cool
      sim[i].y += Math.max(-12, Math.min(12, fy[i])) * cool
      // Keep inside bounds.
      sim[i].x = Math.max(20, Math.min(w - 20, sim[i].x))
      sim[i].y = Math.max(20, Math.min(h - 20, sim[i].y))
    }
  }
  return sim
}

export function PopulationGraph({
  data,
  onPickUser,
}: {
  data: { nodes: PopNode[]; edges: PopEdge[]; totalUsers: number; shown: number; capped: boolean }
  onPickUser: (id: string, label: string) => void
}) {
  const W = 720
  const H = 540
  const placed = useMemo(() => forceLayout(data.nodes, data.edges, W, H), [data.nodes, data.edges])
  const byId = useMemo(() => new Map(placed.map((p) => [p.id, p])), [placed])
  const [hover, setHover] = useState<Sim | null>(null)

  const maxDeg = Math.max(1, ...data.nodes.map((n) => n.degree))
  const radius = (deg: number) => 5 + (deg / maxDeg) * 15
  const behaviorsPresent = Array.from(new Set(data.nodes.map((n) => n.behavior)))

  if (data.nodes.length === 0) {
    return (
      <div className="rounded-xl border border-border-default bg-card p-6 text-sm text-fg-secondary shadow-[var(--shadow-sm)]">
        <p className="mb-1 font-medium text-fg-primary">No connections yet</p>
        <p className="text-fg-tertiary">
          The population graph shows users linked by care-circle or shared channels. Once users start connecting, the network appears here.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3 text-xs text-fg-tertiary">
        <span>
          Showing <span className="font-semibold text-fg-primary">{data.shown}</span> most-connected of{" "}
          <span className="font-semibold text-fg-primary">{data.totalUsers}</span> users
        </span>
        {data.capped && <span className="pill pill-warning">capped — more connected users exist</span>}
        <span className="ml-auto flex flex-wrap gap-x-3 gap-y-1">
          {behaviorsPresent.map((b) => (
            <span key={b} className="flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: BEHAVIOR_COLOR[b] }} />
              {BEHAVIOR_LABEL[b] ?? b}
            </span>
          ))}
        </span>
      </div>

      <div className="rounded-xl border border-border-default bg-card p-2 shadow-[var(--shadow-sm)]">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 580 }}>
          {data.edges.map((e, i) => {
            const s = byId.get(e.source)
            const t = byId.get(e.target)
            if (!s || !t) return null
            return (
              <line
                key={i}
                x1={s.x} y1={s.y} x2={t.x} y2={t.y}
                stroke={e.kind === "care_circle" ? "var(--accent-500)" : "var(--border-default)"}
                strokeOpacity={e.kind === "care_circle" ? 0.4 : 0.5}
                strokeWidth={e.kind === "care_circle" ? 1.5 : 1}
              />
            )
          })}
          {placed.map((p) => (
            <g
              key={p.id}
              onClick={() => onPickUser(p.id, p.label)}
              onMouseEnter={() => setHover(p)}
              onMouseLeave={() => setHover(null)}
              style={{ cursor: "pointer" }}
            >
              <circle
                cx={p.x} cy={p.y} r={radius(p.degree)}
                fill={BEHAVIOR_COLOR[p.behavior] ?? BEHAVIOR_COLOR.none}
                fillOpacity={0.85}
                stroke={hover?.id === p.id ? "var(--fg-primary)" : "var(--bg-card)"}
                strokeWidth={hover?.id === p.id ? 2.5 : 1.5}
              />
            </g>
          ))}
          {/* Hover label on top so it isn't occluded. */}
          {hover && (
            <g pointerEvents="none">
              <text x={hover.x} y={hover.y - radius(hover.degree) - 6} textAnchor="middle" className="fill-fg-primary" style={{ fontSize: 12, fontWeight: 600 }}>
                {hover.label}
              </text>
              <text x={hover.x} y={hover.y - radius(hover.degree) + 7} textAnchor="middle" className="fill-fg-muted" style={{ fontSize: 10 }}>
                {hover.degree} connection{hover.degree === 1 ? "" : "s"} · {hover.tier}
              </text>
            </g>
          )}
        </svg>
      </div>
      <p className="text-xs text-fg-muted">
        Node size = number of connections (bigger = more central). Purple edges are care-circle links; grey edges are shared channels. Click a node to open that user&apos;s graph.
      </p>
    </div>
  )
}
