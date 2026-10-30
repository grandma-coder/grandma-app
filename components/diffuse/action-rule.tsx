import type { ReactNode } from 'react'
import { Link } from '@/i18n/navigation'

const BASE =
  'group flex w-full items-center justify-between border-t border-line-2 px-0.5 pb-0.5 pt-[18px] font-mono text-[13px] font-bold uppercase tracking-[0.2em] text-ink transition-colors hover:border-hair focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-4 focus-visible:outline-hair disabled:cursor-default disabled:border-line disabled:text-ink-4'

function Arrow() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true" className="opacity-85 transition-transform duration-[250ms] group-hover:translate-x-1.5">
      <path d="M5 12h13M13 6l6 6-6 6" />
    </svg>
  )
}

export function ActionRule({ href, type = 'button', pending, disabled, onClick, className = '', children }: {
  href?: string; type?: 'submit' | 'button'; pending?: boolean; disabled?: boolean; onClick?: () => void; className?: string; children: ReactNode
}) {
  if (href) return <Link href={href} className={`${BASE} ${className}`}><span>{children}</span><Arrow /></Link>
  return (
    <button type={type} onClick={onClick} disabled={disabled || pending} aria-busy={pending || undefined} className={`${BASE} ${className}`}>
      <span>{children}</span><Arrow />
    </button>
  )
}
