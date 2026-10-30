'use client'

import type { ReactNode } from 'react'
import type { Mode } from '@/lib/modes'

const POS: Record<Mode, [number, number]> = { pre: [20, 36], preg: [68, 26], kids: [36, 76], meno: [82, 72] }

export function BloomPicker<T extends string>({ name, legend, value, onChange, options, error }: {
  name: string; legend: ReactNode; value: T | ''; onChange: (v: T) => void
  options: { value: T; kicker: string; label: string; mode: Mode }[]; error?: string
}) {
  return (
    <fieldset className="m-0 border-0 p-0">
      <legend className="font-display text-[26px] leading-[1.1] [&_em]:italic [&_em]:text-ink-2">{legend}</legend>
      <input type="hidden" name={name} value={value} />
      <div role="radiogroup" className="relative mt-1.5 h-[250px]">
        {options.map((o) => {
          const on = o.value === value
          const [x, y] = POS[o.mode]
          return (
            <button
              key={o.value}
              type="button"
              role="radio"
              aria-checked={on}
              data-mode={o.mode}
              onClick={() => onChange(o.value)}
              style={{ left: `${x}%`, top: `${y}%` }}
              className={`absolute flex h-[132px] w-[132px] -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center gap-0.5 rounded-full transition-transform duration-300 [transition-timing-function:cubic-bezier(.32,.72,0,1)] focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-[6px] focus-visible:outline-hair ${on ? 'scale-[1.08]' : ''}`}
            >
              <span aria-hidden="true" className="absolute inset-0 -z-10 rounded-full transition-all duration-300"
                style={{ background: 'radial-gradient(circle, var(--g2) 0%, var(--g1) 38%, color-mix(in oklab, var(--g3) 70%, transparent) 58%, transparent 72%)', filter: on ? 'blur(7px) saturate(1.15)' : 'blur(10px) saturate(.9)', opacity: on ? 1 : 0.75 }} />
              {on && <span aria-hidden="true" className="absolute -inset-1.5 rounded-full border border-hair" />}
              <small className="font-mono text-[8.5px] uppercase tracking-[0.16em] text-[rgba(26,25,22,.62)]">{o.kicker}</small>
              <span className="font-display text-[23px] italic leading-none text-ink">{o.label}</span>
            </button>
          )
        })}
      </div>
      {error && <p className="mt-2 text-center text-[14px] text-err" role="alert">{error}</p>}
    </fieldset>
  )
}
