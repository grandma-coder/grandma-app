import type { ReactNode } from 'react'

export function Chip({ selected = false, onClick, dot, children, as = 'button', role, ...aria }: {
  selected?: boolean; onClick?: () => void; dot?: string; children: ReactNode; as?: 'button' | 'span'; role?: string; 'aria-checked'?: boolean
}) {
  const cls = `inline-flex items-center rounded-full border px-[18px] py-[11px] font-mono text-[12px] tracking-[0.04em] transition-all duration-200 ${
    selected
      ? 'border-hair bg-[color-mix(in_oklab,var(--paper)_80%,transparent)] font-bold text-ink shadow-[inset_0_1px_1px_rgba(255,255,255,.5)]'
      : 'border-line bg-[color-mix(in_oklab,var(--paper)_55%,transparent)] text-ink-3'
  } ${as === 'button' ? 'cursor-pointer focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-hair' : ''}`
  const inner = <>{dot && <span aria-hidden="true" className="mr-2 h-1.5 w-1.5 rounded-full" style={{ background: dot }} />}{children}</>
  if (as === 'span') return <span className={cls}>{inner}</span>
  return <button type="button" role={role} aria-checked={aria['aria-checked']} aria-pressed={role ? undefined : selected} onClick={onClick} className={cls}>{inner}</button>
}
