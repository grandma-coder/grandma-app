import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import s from './site.module.css'

/** © line, then privacy, terms and support; both halves wrap on small screens. */
export function Footer() {
  const t = useTranslations('footer')
  return (
    <footer className={s.footer}>
      <div className={s.wrap}>
        <span>{t('rights')}</span>
        <nav aria-label={t('navLabel')}>
          <Link href="/privacy">{t('privacy')}</Link>
          <Link href="/terms">{t('terms')}</Link>
          <a href="mailto:support@grandma.app">support@grandma.app</a>
        </nav>
      </div>
    </footer>
  )
}
