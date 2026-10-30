import type { ReactNode } from 'react'

export function SectionHead({ n, children, sub, id }: { n: string; children: ReactNode; sub?: ReactNode; id?: string }) {
  return (
    <header id={id} className="mb-10">
      <div className="flex items-baseline gap-[18px] border-t border-hair pt-[18px]">
        <span className="font-mono text-[12px] tracking-[0.14em] text-ink-3">{n}</span>
        <h2 className="m-0 font-display text-[clamp(34px,4.2vw,52px)] font-normal leading-none tracking-[-0.01em] [&_em]:italic [&_em]:text-ink-2">{children}</h2>
      </div>
      {sub && <p className="mt-4 max-w-[640px] text-[15.5px] font-light leading-[1.6] text-ink-3">{sub}</p>}
    </header>
  )
}
