"use client"
import { useMemo, useRef, useState, type ComponentType, type Ref } from "react"
import dynamic from "next/dynamic"
import type { ForceGraphProps, NodeObject, ForceGraphMethods } from "react-force-graph-2d"
import { useContainerSize } from "./useContainerSize"

// react-force-graph-2d uses window/canvas → client-only (no SSR). next/dynamic
// drops the lib's generics, so we re-assert the prop type (keeps callbacks typed
// + carries the imperative ref for graph2ScreenCoords). Pattern borrowed from
// mother-internal-dashboard's brain-canvas.
const ForceGraph2D = dynamic(() => import("react-force-graph-2d"), { ssr: false }) as ComponentType<
  ForceGraphProps & { ref?: Ref<ForceGraphMethods | undefined> }
>

interface PopNode { id: string; label: string; behavior: string; tier: string; degree: number }
interface PopEdge { source: string; target: string; kind: "care_circle" | "shared_channel"; weight: number }

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

// Graph node shape we hand to the lib (carries the paint fields).
interface GNode {
  id: string
  label: string
  initial: string
  color: string
  behavior: string
  tier: string
  degree: number
  val: number
}

export function PopulationGraph({
  data,
  onPickUser,
}: {
  data: { nodes: PopNode[]; edges: PopEdge[]; totalUsers: number; shown: number; capped: boolean }
  onPickUser: (id: string, label: string) => void
}) {
  const fgRef = useRef<ForceGraphMethods | undefined>(undefined)
  const { ref: containerRef, w, h } = useContainerSize<HTMLDivElement>()
  const [focusId, setFocusId] = useState<string | null>(null)
  const [hoverId, setHoverId] = useState<string | null>(null)

  const maxDeg = Math.max(1, ...data.nodes.map((n) => n.degree))

  // Adjacency for spotlight/isolate.
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

  const graphData = useMemo(
    () => ({
      nodes: data.nodes.map(
        (n): GNode => ({
          id: n.id,
          label: n.label,
          initial: (n.label.trim()[0] ?? "?").toUpperCase(),
          color: BEHAVIOR_COLOR[n.behavior] ?? BEHAVIOR_COLOR.none,
          behavior: n.behavior,
          tier: n.tier,
          degree: n.degree,
          val: 1 + (n.degree / maxDeg) * 8,
        }),
      ),
      links: data.edges.map((e) => ({ source: e.source, target: e.target, kind: e.kind })),
    }),
    [data, maxDeg],
  )

  const active = hoverId ?? focusId
  const activeSet = useMemo(() => {
    if (!active) return null
    const s = new Set<string>([active])
    adj.get(active)?.forEach((n) => s.add(n))
    return s
  }, [active, adj])

  const behaviorsPresent = Array.from(new Set(data.nodes.map((n) => n.behavior)))
  const radiusOf = (deg: number) => 4 + (deg / maxDeg) * 12

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
          onClick={() => fgRef.current?.zoomToFit(400, 40)}
          className="rounded-full border border-border-default px-2.5 py-0.5 text-fg-tertiary hover:text-fg-primary"
        >
          fit view
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

      <div
        ref={containerRef}
        className="relative w-full overflow-hidden rounded-xl border border-border-default bg-card shadow-[var(--shadow-sm)]"
        style={{ height: "72vh", minHeight: 560 }}
      >
        {w > 0 && h > 0 && (
        <ForceGraph2D
          ref={fgRef}
          graphData={graphData}
          width={w}
          height={h}
          backgroundColor="#FBFAF5"
          nodeRelSize={5}
          cooldownTicks={90}
          onEngineStop={() => fgRef.current?.zoomToFit(400, 40)}
          d3VelocityDecay={0.3}
          linkColor={(l: NodeObject) => {
            const kind = (l as { kind?: string }).kind
            const s = typeof (l as { source?: { id?: string } }).source === "object" ? (l as { source?: { id?: string } }).source?.id : (l as { source?: string }).source
            const t = typeof (l as { target?: { id?: string } }).target === "object" ? (l as { target?: { id?: string } }).target?.id : (l as { target?: string }).target
            const lit = !activeSet || (activeSet.has(s as string) && activeSet.has(t as string))
            const base = kind === "care_circle" ? "112,72,184" : "150,150,150"
            return `rgba(${base},${lit ? 0.5 : 0.06})`
          }}
          linkWidth={(l: NodeObject) => ((l as { kind?: string }).kind === "care_circle" ? 1.6 : 0.8)}
          nodePointerAreaPaint={(n: NodeObject, color: string, ctx: CanvasRenderingContext2D) => {
            const r = radiusOf((n as unknown as GNode).degree)
            ctx.fillStyle = color
            ctx.beginPath()
            ctx.arc(n.x!, n.y!, r + 2, 0, 2 * Math.PI)
            ctx.fill()
          }}
          nodeCanvasObjectMode={() => "replace"}
          nodeCanvasObject={(n: NodeObject, ctx: CanvasRenderingContext2D, globalScale: number) => {
            const gn = n as unknown as GNode
            const r = radiusOf(gn.degree)
            const isActive = gn.id === active
            const dim = activeSet && !activeSet.has(gn.id) ? 0.12 : 1
            ctx.globalAlpha = dim
            // filled circle
            ctx.beginPath()
            ctx.arc(n.x!, n.y!, r, 0, 2 * Math.PI)
            ctx.fillStyle = gn.color
            ctx.fill()
            // ring (bold on active)
            ctx.lineWidth = (isActive ? 2.5 : 1.2) / globalScale
            ctx.strokeStyle = isActive ? "#1A1916" : "rgba(255,255,255,0.9)"
            ctx.stroke()
            // initial
            if (r * globalScale > 7) {
              ctx.font = `600 ${r}px 'Inter', sans-serif`
              ctx.textAlign = "center"
              ctx.textBaseline = "middle"
              ctx.fillStyle = "#fff"
              ctx.fillText(gn.initial, n.x!, n.y!)
            }
            // label when zoomed in or active
            if (isActive || globalScale > 1.6) {
              ctx.font = `${11 / globalScale}px 'Inter', sans-serif`
              ctx.fillStyle = "rgba(26,25,22,0.8)"
              ctx.textAlign = "center"
              ctx.fillText(gn.label, n.x!, n.y! + r + 8 / globalScale)
            }
            ctx.globalAlpha = 1
          }}
          onNodeHover={(n: NodeObject | null) => setHoverId(n ? ((n as unknown as GNode).id ?? null) : null)}
          onNodeClick={(n: NodeObject) => {
            const id = (n as unknown as GNode).id
            if (!id) return
            if (focusId === id) onPickUser(id, (n as unknown as GNode).label)
            else setFocusId(id)
          }}
          onBackgroundClick={() => setFocusId(null)}
        />
        )}

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
        <span className="font-medium text-fg-tertiary">scroll</span> to zoom · <span className="font-medium text-fg-tertiary">drag</span> to pan or move a node.
        Node size = connections; purple edges = care-circle, grey = shared channels.
      </p>
    </div>
  )
}
