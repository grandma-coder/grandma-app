import { getTranslations } from 'next-intl/server'
import { AppVideo, FieldCard, SectionHead } from '@/components/diffuse'
import { MODES } from '@/lib/modes'

const SHOT = { pre: 'home-pre', preg: 'home-preg', kids: 'home-kids', meno: 'home-meno' } as const
type Item = { label: string; title: string; body: string; alt: string }

export async function Chapters({ locale }: { locale: 'en' | 'pt' }) {
  const t = await getTranslations({ locale, namespace: 'chapters' })
  return (
    <section className="pt-[110px]">
      <SectionHead n="02" sub={t('sub')}>{t.rich('title', { em: (c) => <em>{c}</em> })}</SectionHead>
      <div className="grid gap-[22px] md:grid-cols-2">
        {MODES.map((m) => {
          const it = t.raw(`items.${m}`) as Item
          return (
            <FieldCard key={m} mode={m} label={it.label} title={it.title}>
              <p className="mb-6 mt-3.5 max-w-[380px] text-[15px] font-light text-[rgba(26,25,22,.72)]">{it.body}</p>
              <div className="mt-auto flex justify-center pt-2"><AppVideo shot={SHOT[m]} lang={locale} alt={it.alt} size="sm" /></div>
            </FieldCard>
          )
        })}
      </div>
    </section>
  )
}
