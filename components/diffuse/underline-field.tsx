import { useId, type InputHTMLAttributes, type Ref } from 'react'

export function UnderlineField({ label, error, id, className = '', ref, ...input }: { label: string; error?: string; ref?: Ref<HTMLInputElement> } & InputHTMLAttributes<HTMLInputElement>) {
  const auto = useId()
  const fid = id ?? auto
  return (
    <div className={className}>
      <label htmlFor={fid} className="mb-1 block font-mono text-[10px] uppercase tracking-[0.2em] text-ink-3">{label}</label>
      <input
        id={fid}
        ref={ref}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${fid}-err` : undefined}
        className="w-full rounded-none border-0 border-b-[1.5px] border-line-2 bg-transparent px-0.5 pb-3.5 pt-2.5 text-[18px] text-ink outline-none placeholder:text-ink-4 focus:border-hair aria-[invalid=true]:border-err"
        {...input}
      />
      {error && <p id={`${fid}-err`} className="mt-2 text-[14px] text-err">{error}</p>}
    </div>
  )
}
