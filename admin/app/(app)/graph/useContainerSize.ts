"use client"
import { useEffect, useRef, useState } from "react"

/**
 * Measure a wrapper element via ResizeObserver and return live { w, h }.
 * react-force-graph defaults to window.innerWidth when no width is passed — which
 * overflows a constrained container and lays the graph out off-center. Passing
 * the measured size fixes that. (Same approach as mother-dashboard's brain-canvas.)
 */
export function useContainerSize<T extends HTMLElement = HTMLDivElement>() {
  const ref = useRef<T>(null)
  const [size, setSize] = useState({ w: 0, h: 0 })

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const measure = () => setSize({ w: el.clientWidth, h: el.clientHeight })
    measure() // initial
    const ro = new ResizeObserver((entries) => {
      const cr = entries[0]?.contentRect
      if (cr) setSize({ w: Math.round(cr.width), h: Math.round(cr.height) })
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  return { ref, ...size }
}
