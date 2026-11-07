"use client"
import { useMemo, useRef, useState, type ComponentType, type Ref } from "react"
import dynamic from "next/dynamic"
import { useTranslations } from "next-intl"
import type { ForceGraphProps, ForceGraphMethods } from "react-force-graph-3d"
import { useContainerSize } from "./useContainerSize"
import { GraphSearch } from "./GraphSearch"
import { NodeSidePanel } from "./NodeSidePanel"

// react-force-graph-3d touches window/WebGL → client-only (no SSR). Lazy so
// three.js only downloads when the 3D view opens. Re-assert the prop type (next/
// dynamic drops the lib generics) + carry the imperative ref for cameraPosition.
const ForceGraph3D = dynamic(() => import("react-force-graph-3d"), { ssr: false }) as ComponentType<
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

export function PopulationGraph3D({
  data,
  onPickUser,
}: {
  data: { nodes: PopNode[]; edges: PopEdge[]; totalUsers: number; shown: number; capped: boolean }
  onPickUser: (id: string, label: string) => void
}) {
  const t = useTranslations("graph")
  const { ref: containerRef, w, h } = useContainerSize<HTMLDivElement>()
  const fgRef = useRef<ForceGraphMethods | undefined>(undefined)
  const [panelId, setPanelId] = useState<string | null>(null)
  const maxDeg = Math.max(1, ...data.nodes.map((n) => n.degree))

  const nodeById = useMemo(() => new Map(data.nodes.map((n) => [n.id, n])), [data.nodes])

  const graphData = useMemo(
    () => ({
      nodes: data.nodes.map((n) => ({
        id: n.id,
        name: t("population.nodeName3d", { label: n.label, degree: n.degree, tier: n.tier }),
        label: n.label,
        color: BEHAVIOR_COLOR[n.behavior] ?? BEHAVIOR_COLOR.none,
        val: 1 + (n.degree / maxDeg) * 8,
      })),
      links: data.edges.map((e) => ({
        source: e.source,
        target: e.target,
        // Dark, low-alpha links so they read on the white canvas.
        color: e.kind === "care_circle" ? "rgba(112,72,184,0.45)" : "rgba(80,80,80,0.22)",
      })),
    }),
    [data, maxDeg, t],
  )

  // Open a node's panel + fly the camera to it (used by click AND search).
  const selectNode = (id: string) => {
    setPanelId(id)
    const node = graphData.nodes.find((n) => n.id === id) as
      | { x?: number; y?: number; z?: number }
      | undefined
    if (node && typeof node.x === "number" && typeof node.y === "number" && typeof node.z === "number") {
      const dist = 120
      const ratio = 1 + dist / Math.hypot(node.x, node.y, node.z || 1)
      fgRef.current?.cameraPosition({ x: node.x * ratio, y: node.y * ratio, z: node.z * ratio }, { x: node.x, y: node.y, z: node.z }, 800)
    }
  }

  if (data.nodes.length === 0) {
    return (
      <div className="rounded-xl border border-border-default bg-card p-6 text-sm text-fg-secondary shadow-[var(--shadow-sm)]">
        <p className="mb-1 font-medium text-fg-primary">{t("population.emptyTitle")}</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <GraphSearch nodes={data.nodes} onSelect={selectNode} />
        <span className="text-xs text-fg-tertiary">
          {t.rich("population.showing", {
            shown: data.shown,
            total: data.totalUsers,
            b: (c) => <span className="font-semibold text-fg-primary">{c}</span>,
          })}
        </span>
      </div>

      <div
        ref={containerRef}
        className="relative w-full overflow-hidden rounded-xl border border-border-default bg-[#FBFAF5] shadow-[var(--shadow-sm)]"
        style={{ height: "72vh", minHeight: 560 }}
      >
        {w > 0 && h > 0 && (
          <ForceGraph3D
            ref={fgRef}
            graphData={graphData}
            width={w}
            height={h}
            backgroundColor="#FBFAF5"
            nodeColor="color"
            nodeVal="val"
            nodeLabel="name"
            nodeOpacity={0.95}
            linkColor="color"
            linkWidth={0.5}
            linkOpacity={0.6}
            enableNodeDrag={false}
            showNavInfo={false}
            onNodeClick={(n: object) => {
              const node = n as { id?: string }
              if (node.id) selectNode(node.id)
            }}
          />
        )}

        {panelId && nodeById.get(panelId) && (
          <NodeSidePanel node={nodeById.get(panelId)!} onClose={() => setPanelId(null)} onOpenGraph={onPickUser} />
        )}
      </div>

      <p className="text-xs text-fg-muted">
        {t.rich("population.help3d", { b: (c) => <span className="font-medium text-fg-tertiary">{c}</span> })}
      </p>
    </div>
  )
}
