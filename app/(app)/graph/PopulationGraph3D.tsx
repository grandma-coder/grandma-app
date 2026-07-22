"use client"
import { useMemo, useRef } from "react"
import dynamic from "next/dynamic"
import { useContainerSize } from "./useContainerSize"

// react-force-graph-3d touches window/WebGL → must be client-only (no SSR).
// Lazy-loaded so three.js only downloads when the 3D view is actually opened.
const ForceGraph3D = dynamic(() => import("react-force-graph-3d"), { ssr: false })

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
  const { ref: containerRef, w, h } = useContainerSize<HTMLDivElement>()
  const maxDeg = Math.max(1, ...data.nodes.map((n) => n.degree))
  // Map to the library's { nodes, links } shape.
  const graphData = useMemo(
    () => ({
      nodes: data.nodes.map((n) => ({
        id: n.id,
        name: `${n.label} · ${n.degree} connections · ${n.tier}`,
        label: n.label,
        color: BEHAVIOR_COLOR[n.behavior] ?? BEHAVIOR_COLOR.none,
        val: 1 + (n.degree / maxDeg) * 8, // node size
      })),
      links: data.edges.map((e) => ({
        source: e.source,
        target: e.target,
        color: e.kind === "care_circle" ? "rgba(112,72,184,0.55)" : "rgba(150,150,150,0.35)",
      })),
    }),
    [data, maxDeg],
  )

  // Guard the last click so a drag-orbit doesn't count as a node click.
  const lastClick = useRef(0)

  if (data.nodes.length === 0) {
    return (
      <div className="rounded-xl border border-border-default bg-card p-6 text-sm text-fg-secondary shadow-[var(--shadow-sm)]">
        <p className="mb-1 font-medium text-fg-primary">No connections yet</p>
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className="w-full overflow-hidden rounded-xl border border-border-default bg-[#0b0b10] shadow-[var(--shadow-sm)]"
      style={{ height: "72vh", minHeight: 560 }}
    >
      {w > 0 && h > 0 && (
      <ForceGraph3D
        graphData={graphData}
        width={w}
        height={h}
        backgroundColor="#0b0b10"
        nodeColor="color"
        nodeVal="val"
        nodeLabel="name"
        nodeOpacity={0.92}
        linkColor="color"
        linkWidth={0.6}
        linkOpacity={0.5}
        enableNodeDrag={false}
        onNodeClick={(n: object) => {
          lastClick.current = Date.now()
          const node = n as { id?: string; label?: string }
          if (node.id) onPickUser(node.id, node.label ?? node.id.slice(0, 8))
        }}
      />
      )}
    </div>
  )
}
