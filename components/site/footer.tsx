import { getTranslations } from 'next-intl/server'
import { Link } from '@/i18n/navigation'
import { Mark } from '@/components/diffuse'
import { LocaleSwitcher } from './locale-switcher'

export async function Footer({ locale }: { locale: 'en' | 'pt' }) {
  const t = await getTranslations({ locale, namespace: 'footer' })
  return (
    <footer className="mt-[90px] pb-16">
      <div className="flex flex-wrap items-start justify-between gap-8 border-t border-hair pt-8">
        <div>
          <div className="flex items-center gap-2.5 font-display text-[28px]"><Mark size={36} still />grandma</div>
          <p className="mt-3.5 max-w-[300px] text-[14px] font-light text-ink-3">{t('tag')}</p>
        </div>
        <nav className="flex gap-8 text-[15px] font-light text-ink-2">
          <Link href="/privacy" className="hover:text-ink">{t('privacy')}</Link>
          <Link href="/terms" className="hover:text-ink">{t('terms')}</Link>
          <a href="mailto:support@grandma.app" className="hover:text-ink">support@grandma.app</a>
        </nav>
      </div>
      <div className="mt-14 flex flex-wrap items-center justify-between gap-4 border-t border-hair pt-6">
        <p className="m-0 font-display text-[22px] italic text-ink-2">{t('line')}</p>
        <div className="flex items-center gap-6"><LocaleSwitcher /><span className="font-mono text-[10.5px] uppercase tracking-[0.1em] text-ink-4">{t('rights')}</span></div>
      </div>
    </footer>
  )
}
