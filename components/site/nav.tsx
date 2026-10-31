import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import { Sticker } from '@/components/stickers/sticker'
import { LocaleSwitcher } from './locale-switcher'
import s from './site.module.css'

/** Sticky top bar: mark + "grandma", PT / EN. No email field here (one per screen). */
export function Nav() {
  const t = useTranslations('nav')
  return (
    <header className={s.bar}>
      <div className={s.wrap}>
        <Link href="/" aria-label={t('home')} className={s.brand}>
          <Sticker name="eye" className={s.ico} />grandma
        </Link>
        <div className={s.barR}><LocaleSwitcher /></div>
      </div>
    </header>
  )
}
