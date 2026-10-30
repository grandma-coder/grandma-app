'use client'

import { useId, type ReactNode } from 'react'
import type { Mode } from '@/lib/modes'

const POS: Record<Mode, [number, number]> = { pre: [20, 36], preg: [68, 26], kids: [36, 76], meno: [82, 72] }

export function BloomPicker<T extends string>({ name, legend, value, onChange, options, error }: {
  name: string; legend: ReactNode; value: T | ''; onChange: (v: T) => void
  options: { value: T; kicker: string; label: string; mode: Mode }[]; error?: string
}) {
  const errId = useId()
  return (
    <fieldset className="m-0 border-0 p-0">
      <legend className="font-display text-[26px] leading-[1.1] [&_em]:italic [&_em]:text-ink-2">{legend}</legend>
      <div className="relative mt-1.5 h-[250px]">
        {options.map((o) => {
          const on = o.value === value
          const [x, y] = POS[o.mode]
          return (
            <label
              key={o.value}
              data-mode={o.mode}
              style={{ left: `${x}%`, top: `${y}%` }}
              className="group absolute flex h-[132px] w-[132px] -translate-x-1/2 -translate-y-1/2 cursor-pointer flex-col items-center justify-center gap-0.5 rounded-full transition-transform duration-300 [transition-timing-function:cubic-bezier(.32,.72,0,1)] has-[:checked]:scale-[1.08] has-[:focus-visible]:outline has-[:focus-visible]:outline-1 has-[:focus-visible]:outline-offset-[6px] has-[:focus-visible]:outline-hair"
            >
              <input
                type="radio"
                name={name}
                value={o.value}
                checked={on}
                onChange={() => onChange(o.value)}
                aria-describedby={error ? errId : undefined}
                className="peer sr-only"
              />
              <span aria-hidden="true" className="absolute inset-0 -z-10 rounded-full opacity-75 blur-[10px] saturate-[.9] transition-all duration-300 group-has-[:checked]:opacity-100 group-has-[:checked]:blur-[7px] group-has-[:checked]:saturate-[1.15]"
                style={{ background: 'radial-gradient(circle, var(--g2) 0%, var(--g1) 38%, color-mix(in oklab, var(--g3) 70%, transparent) 58%, transparent 72%)' }} />
              <span aria-hidden="true" className="absolute -inset-1.5 hidden rounded-full border border-hair group-has-[:checked]:block" />
              <small className="font-mono text-[8.5px] uppercase tracking-[0.16em] text-[rgba(26,25,22,.62)]">{o.kicker}</small>
              <span className="font-display text-[23px] italic leading-none text-ink">{o.label}</span>
            </label>
          )
        })}
      </div>
      {error && <p id={errId} className="mt-2 text-center text-[14px] text-err" role="alert">{error}</p>}
    </fieldset>
  )
}
