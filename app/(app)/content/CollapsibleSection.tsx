"use client"
import { useState, type ReactNode } from "react"

/**
 * Reusable expand/collapse section header for the content editors — mirrors the
 * App Templates tab behavior. Header is a click-to-toggle with a rotating
 * chevron + a mode-color dot; children render only when expanded.
 */
export function CollapsibleSection({
  dot,
  title,
  meta,
  defaultOpen = true,
  action,
  collapsedSummary,
  children,
}: {
  dot: string
  title: string
  meta?: string
  defaultOpen?: boolean
  action?: ReactNode
  collapsedSummary?: string
  children: ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <section>
      <div className="mb-2 flex items-center gap-2">
        <button onClick={() => setOpen((v) => !v)} aria-expanded={open} className="group flex flex-1 items-center gap-2 text-left">
          <svg
            viewBox="0 0 16 16"
            className={`size-3.5 shrink-0 text-fg-muted transition-transform ${open ? "" : "-rotate-90"}`}
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M4 6l4 4 4-4" />
          </svg>
          <span className="inline-block size-2.5 rounded-full" style={{ background: dot }} />
          <h2 className="display text-base font-semibold text-fg-primary group-hover:text-accent-500">{title}</h2>
          {meta && <span className="text-xs text-fg-muted">{meta}</span>}
          {!open && collapsedSummary && <span className="ml-auto text-xs text-fg-muted">{collapsedSummary}</span>}
        </button>
        {open && action}
      </div>
      {open && children}
    </section>
  )
}
