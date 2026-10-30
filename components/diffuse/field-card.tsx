import type { ReactNode } from 'react'
import type { Mode } from '@/lib/modes'

export function FieldCard({ mode, label, title, children, className = '' }: { mode: Mode; label: string; title: string; children?: ReactNode; className?: string }) {
  return (
    <article data-mode={mode} className={`gfield flex min-h-[360px] flex-col rounded-d-lg p-7 shadow-card ${className}`}>
      <div className="flex items-start justify-between gap-4">
        <span className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-[rgba(26,25,22,.62)]">{label}</span>
        <span className="flex gap-1.5" aria-hidden="true">
          {(['--g1', '--g2', '--g3', '--g4'] as const).map((v) => (
            <i key={v} className="h-[18px] w-[18px] rounded-full shadow-[inset_0_0_0_1px_rgba(0,0,0,.06)]" style={{ background: `var(${v})` }} />
          ))}
        </span>
      </div>
      <h3 className="mt-2 font-display text-[clamp(44px,5vw,58px)] font-normal leading-[0.9] text-ink [font-variant-numeric:lining-nums]">{title}</h3>
      {children}
    </article>
  )
}
