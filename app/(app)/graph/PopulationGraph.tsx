"use client"
import { useMemo, useRef, useState, useCallback } from "react"

interface PopNode { id: string; label: string; behavior: string; tier: string; degree: number }
interface PopEdge { source: string; target: string; kind: "care_circle" | "shared_channel"; weight: number }

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
 * Deterministic force layout (no dep). Spread out (strong repulsion, longer
 * springs) so a dense graph is legible rather than a tight hairball.
 */
function forceLayout(nodes: PopNode[], edges: PopEdge[], w: number, h: number): Sim[] {
  const cx = w / 2
  const cy = h / 2
  const N = nodes.length
  const idx = new Map(nodes.map((n, i) => [n.id, i]))
  const sim: Sim[] = nodes.map((n, i) => {
    const a = (i / N) * Math.PI * 2
    const r = Math.min(w, h) / 2.6
    return { ...n, x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r }
  })

  const edgePairs = edges
    .map((e) => [idx.get(e.source), idx.get(e.target)] as [number | undefined, number | undefined])
    .filter((p): p is [number, number] => p[0] !== undefined && p[1] !== undefined)

  const ITER = 130
  const REPULSE = 22000 // much stronger → nodes breathe
  const SPRING = 0.015
  const SPRING_LEN = 120
  const CENTER = 0.006

  for (let it = 0; it < ITER; it++) {
    const fx = new Array(N).fill(0)
    const fy = new Array(N).fill(0)
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
    const cool = 1 - it / ITER
    for (let i = 0; i < N; i++) {
      fx[i] += (cx - sim[i].x) * CENTER
      fy[i] += (cy - sim[i].y) * CENTER
      sim[i].x += Math.max(-18, Math.min(18, fx[i])) * cool
      sim[i].y += Math.max(-18, Math.min(18, fy[i])) * cool
    }
  }
  return sim
}

// World coords are generous so the spread layout has room; the viewBox pans/zooms over it.
const W = 1400
const H = 1000

export function PopulationGraph({
  data,
  onPickUser,
}: {
  data: { nodes: PopNode[]; edges: PopEdge[]; totalUsers: number; shown: number; capped: boolean }
  onPickUser: (id: string, label: string) => void
}) {
  const base = useMemo(() => forceLayout(data.nodes, data.edges, W, H), [data.nodes, data.edges])
  const basePos = useMemo(() => new Map(base.map((n) => [n.id, { x: n.x, y: n.y }])), [base])

  // Only DRAG OVERRIDES live in state; base positions come from the layout.
  // Merged into the rendered `pos`. State is reset across data changes via a
  // `key` on this component (the parent keys it by node count), so there's no
  // effect / render-phase setState here.
  const [overrides, setOverrides] = useState<Map<string, { x: number; y: number }>>(() => new Map())
  const pos = useMemo(() => {
    if (overrides.size === 0) return basePos
    const m = new Map(basePos)
    overrides.forEach((v, k) => m.set(k, v))
    return m
  }, [basePos, overrides])
  const setPos = setOverrides

  // Adjacency for focus (who is a direct neighbor of whom).
  const adj = useMemo(() => {
    const m = new Map<string, Set<string>>()
    for (const n of data.nodes) m.set(n.id, new Set())
    for (const e of data.edges) {
      m.get(e.source)?.add(e.target)
      m.get(e.target)?.add(e.source)
    }
    return m
  }, [data.nodes, data.edges])

  const nodeById = useMemo(() => new Map(data.nodes.map((n) => [n.id, n])), [data.nodes])

  const [hover, setHover] = useState<string | null>(null)
  const [focusId, setFocusId] = useState<string | null>(null) // click-isolated node
  const [view, setView] = useState({ x: 0, y: 0, scale: 1 }) // pan/zoom over the world

  // The "active" node whose neighborhood we highlight (hover takes priority, else click-focus).
  const active = hover ?? focusId
  const activeSet = useMemo(() => {
    if (!active) return null
    const s = new Set<string>([active])
    adj.get(active)?.forEach((n) => s.add(n))
    return s
  }, [active, adj])

  const maxDeg = Math.max(1, ...data.nodes.map((n) => n.degree))
  const radius = (deg: number) => 8 + (deg / maxDeg) * 26
  const behaviorsPresent = Array.from(new Set(data.nodes.map((n) => n.behavior)))

  // ── Pan / zoom / drag plumbing ─────────────────────────────────────────────
  const svgRef = useRef<SVGSVGElement | null>(null)
  const drag = useRef<{ mode: "pan" | "node"; id?: string; startX: number; startY: number; origX: number; origY: number } | null>(null)
  const [isPanning, setIsPanning] = useState(false) // for the cursor (state, not a ref-read during render)

  // Convert a screen point to world coords given current view.
  const toWorld = useCallback(
    (clientX: number, clientY: number) => {
      const rect = svgRef.current?.getBoundingClientRect()
      if (!rect) return { x: 0, y: 0 }
      const px = ((clientX - rect.left) / rect.width) * W
      const py = ((clientY - rect.top) / rect.height) * H
      return { x: (px - view.x) / view.scale, y: (py - view.y) / view.scale }
    },
    [view],
  )

  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault()
    const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12
    setView((v) => {
      const ns = Math.max(0.4, Math.min(4, v.scale * factor))
      // zoom toward the cursor
      const rect = svgRef.current?.getBoundingClientRect()
      if (!rect) return { ...v, scale: ns }
      const px = ((e.clientX - rect.left) / rect.width) * W
      const py = ((e.clientY - rect.top) / rect.height) * H
      const wx = (px - v.x) / v.scale
      const wy = (py - v.y) / v.scale
      return { scale: ns, x: px - wx * ns, y: py - wy * ns }
    })
  }

  const onPointerDownBg = (e: React.PointerEvent) => {
    ;(e.target as Element).setPointerCapture?.(e.pointerId)
    drag.current = { mode: "pan", startX: e.clientX, startY: e.clientY, origX: view.x, origY: view.y }
    setIsPanning(true)
  }
  const onPointerDownNode = (e: React.PointerEvent, id: string) => {
    e.stopPropagation()
    ;(e.target as Element).setPointerCapture?.(e.pointerId)
    const p = pos.get(id)!
    drag.current = { mode: "node", id, startX: e.clientX, startY: e.clientY, origX: p.x, origY: p.y }
  }
  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current
    if (!d) return
    const rect = svgRef.current?.getBoundingClientRect()
    if (!rect) return
    const dxScreen = ((e.clientX - d.startX) / rect.width) * W
    const dyScreen = ((e.clientY - d.startY) / rect.height) * H
    if (d.mode === "pan") {
      setView((v) => ({ ...v, x: d.origX + dxScreen, y: d.origY + dyScreen }))
    } else if (d.mode === "node" && d.id) {
      setPos((prev) => {
        const next = new Map(prev)
        next.set(d.id!, { x: d.origX + dxScreen / view.scale, y: d.origY + dyScreen / view.scale })
        return next
      })
    }
  }
  const dragMoved = useRef(false)
  const onPointerMoveFlag = (e: React.PointerEvent) => {
    if (drag.current) dragMoved.current = true
    onPointerMove(e)
  }
  const onPointerUp = () => {
    drag.current = null
    setIsPanning(false)
    // reset the "moved" flag on the next tick so click handlers can read it
    setTimeout(() => (dragMoved.current = false), 0)
  }

  const dim = (id: string) => (activeSet ? (activeSet.has(id) ? 1 : 0.12) : 1)
  const edgeVisible = (e: PopEdge) => (!activeSet ? 1 : activeSet.has(e.source) && activeSet.has(e.target) ? 1 : 0.05)

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

  const activeNode = active ? nodeById.get(active) : null

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3 text-xs text-fg-tertiary">
        <span>
          Showing <span className="font-semibold text-fg-primary">{data.shown}</span> most-connected of{" "}
          <span className="font-semibold text-fg-primary">{data.totalUsers}</span> users
        </span>
        {data.capped && <span className="pill pill-warning">capped</span>}
        {focusId && (
          <button onClick={() => setFocusId(null)} className="pill pill-info hover:opacity-80">
            focused: {nodeById.get(focusId)?.label} · clear ✕
          </button>
        )}
        <button
          onClick={() => setView({ x: 0, y: 0, scale: 1 })}
          className="rounded-full border border-border-default px-2.5 py-0.5 text-fg-tertiary hover:text-fg-primary"
        >
          reset view
        </button>
        <span className="ml-auto flex flex-wrap gap-x-3 gap-y-1">
          {behaviorsPresent.map((b) => (
            <span key={b} className="flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: BEHAVIOR_COLOR[b] }} />
              {BEHAVIOR_LABEL[b] ?? b}
            </span>
          ))}
        </span>
      </div>

      <div className="relative rounded-xl border border-border-default bg-card shadow-[var(--shadow-sm)]">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${W} ${H}`}
          className="w-full touch-none select-none"
          style={{ maxHeight: 620, cursor: isPanning ? "grabbing" : "grab" }}
          onWheel={onWheel}
          onPointerDown={onPointerDownBg}
          onPointerMove={onPointerMoveFlag}
          onPointerUp={onPointerUp}
          onPointerLeave={onPointerUp}
          onClick={() => {
            if (!dragMoved.current) setFocusId(null)
          }}
        >
          <g transform={`translate(${view.x} ${view.y}) scale(${view.scale})`}>
            {/* edges */}
            {data.edges.map((e, i) => {
              const s = pos.get(e.source)
              const t = pos.get(e.target)
              if (!s || !t) return null
              const op = edgeVisible(e)
              return (
                <line
                  key={i}
                  x1={s.x} y1={s.y} x2={t.x} y2={t.y}
                  stroke={e.kind === "care_circle" ? "var(--accent-500)" : "var(--fg-muted)"}
                  strokeOpacity={(e.kind === "care_circle" ? 0.5 : 0.4) * op}
                  strokeWidth={e.kind === "care_circle" ? 2 : 1.2}
                />
              )
            })}
            {/* nodes */}
            {data.nodes.map((n) => {
              const p = pos.get(n.id)
              if (!p) return null
              const r = radius(n.degree)
              const o = dim(n.id)
              const isActive = n.id === active
              return (
                <g
                  key={n.id}
                  transform={`translate(${p.x} ${p.y})`}
                  style={{ cursor: "pointer", opacity: o, transition: "opacity 120ms" }}
                  onMouseEnter={() => setHover(n.id)}
                  onMouseLeave={() => setHover(null)}
                  onPointerDown={(e) => onPointerDownNode(e, n.id)}
                  onClick={(e) => {
                    e.stopPropagation()
                    if (dragMoved.current) return
                    // first click focuses; clicking the already-focused node opens its ego graph
                    if (focusId === n.id) onPickUser(n.id, n.label)
                    else setFocusId(n.id)
                  }}
                >
                  <circle
                    r={r}
                    fill={BEHAVIOR_COLOR[n.behavior] ?? BEHAVIOR_COLOR.none}
                    fillOpacity={0.9}
                    stroke={isActive ? "var(--fg-primary)" : "var(--bg-card)"}
                    strokeWidth={isActive ? 3 : 1.5}
                  />
                  {(isActive || view.scale > 1.6) && (
                    <text y={-r - 6} textAnchor="middle" className="fill-fg-primary" style={{ fontSize: 13, fontWeight: 600 }}>
                      {n.label}
                    </text>
                  )}
                </g>
              )
            })}
          </g>
        </svg>

        {/* Active-node info chip */}
        {activeNode && (
          <div className="pointer-events-none absolute left-3 top-3 rounded-lg border border-border-default bg-card/95 px-3 py-2 text-xs shadow-[var(--shadow-sm)]">
            <p className="font-semibold text-fg-primary">{activeNode.label}</p>
            <p className="text-fg-tertiary">
              {activeNode.degree} connection{activeNode.degree === 1 ? "" : "s"} · {activeNode.tier} · {BEHAVIOR_LABEL[activeNode.behavior] ?? activeNode.behavior}
            </p>
            {focusId === activeNode.id && <p className="mt-0.5 text-accent-500">click again → open full graph</p>}
          </div>
        )}
      </div>

      <p className="text-xs text-fg-muted">
        <span className="font-medium text-fg-tertiary">Hover</span> a node to spotlight its connections ·{" "}
        <span className="font-medium text-fg-tertiary">click</span> to isolate its network (click again to open that user) ·{" "}
        <span className="font-medium text-fg-tertiary">scroll</span> to zoom · <span className="font-medium text-fg-tertiary">drag</span> the background to pan, a node to move it.
        Node size = connections; purple edges = care-circle, grey = shared channels.
      </p>
    </div>
  )
}
