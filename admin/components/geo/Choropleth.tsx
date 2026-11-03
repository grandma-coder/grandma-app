"use client"
import { intensity } from "@/lib/geo"

/**
 * Plain-SVG choropleth (no map library): one path per place, filled by a token-tinted
 * square-root scale. Places are keyboard-focusable buttons. `dots` marks places too small to
 * see at this scale (Singapore, Luxembourg…) with a circle when someone is there.
 */
export function Choropleth({
  viewBox, paths, dots, value, max, selected, onSelect, label, className,
}: {
  viewBox: string
  paths: Record<string, string>
  dots?: Record<string, number[]>
  value: (key: string) => number
  max: number
  selected?: string | null
  onSelect?: (key: string) => void
  label: (key: string) => string
  className?: string
}) {
  const fill = (key: string) => {
    const k = intensity(value(key), max)
    return k === 0 ? "var(--map-empty)" : `color-mix(in oklab, var(--map-ink) ${Math.round(k * 100)}%, var(--map-low))`
  }
  const act = (key: string) => (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSelect?.(key) }
  }
  const keys = Object.keys(paths)
  return (
    <svg viewBox={viewBox} className={className} role="group">
      {keys.map((key) => {
        const on = selected === key
        const n = value(key)
        return (
          <path
            key={key}
            d={paths[key]}
            fill={fill(key)}
            stroke={on ? "var(--map-ink)" : "var(--map-line)"}
            strokeWidth={on ? 1.6 : 0.4}
            vectorEffect="non-scaling-stroke"
            className={onSelect && n > 0 ? "cursor-pointer outline-none transition-opacity hover:opacity-80 focus-visible:opacity-70" : undefined}
            role={onSelect && n > 0 ? "button" : undefined}
            tabIndex={onSelect && n > 0 ? 0 : undefined}
            aria-pressed={onSelect && n > 0 ? on : undefined}
            aria-label={label(key)}
            onClick={n > 0 ? () => onSelect?.(key) : undefined}
            onKeyDown={n > 0 ? act(key) : undefined}
          >
            <title>{label(key)}</title>
          </path>
        )
      })}
      {dots && Object.entries(dots).map(([key, [x, y]]) => (value(key) > 0 ? (
        <circle key={`dot-${key}`} cx={x} cy={y} r={selected === key ? 4.5 : 3.2} fill={fill(key)} stroke="var(--map-ink)" strokeWidth={0.8}
          className="cursor-pointer" onClick={() => onSelect?.(key)}>
          <title>{label(key)}</title>
        </circle>
      ) : null))}
    </svg>
  )
}
