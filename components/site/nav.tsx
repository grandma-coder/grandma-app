'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import { Mark } from '@/components/diffuse'
import { LocaleSwitcher } from './locale-switcher'

export function Nav() {
  const t = useTranslations('nav')
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 30)
    on()
    window.addEventListener('scroll', on, { passive: true })
    return () => window.removeEventListener('scroll', on)
  }, [])
  return (
    <header className={`sticky top-0 z-50 border-b transition-colors ${scrolled ? 'border-line bg-[color-mix(in_oklab,var(--bg)_82%,transparent)] backdrop-blur-[18px]' : 'border-transparent'}`}>
      <div className="mx-auto flex h-[78px] max-w-[1280px] items-center justify-between px-[22px] md:px-14">
        <Link href="/" aria-label={t('home')} className="flex items-center gap-2.5 font-display text-[32px] leading-none tracking-[-0.01em]">
          <Mark size={42} />grandma
        </Link>
        <div className="flex items-center gap-6">
          <LocaleSwitcher />
          <a href="#join" className="hidden font-mono text-[12px] font-bold uppercase tracking-[0.2em] text-ink sm:inline">{t('join')} →</a>
        </div>
      </div>
    </header>
  )
}
