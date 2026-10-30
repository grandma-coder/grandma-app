import { getTranslations } from 'next-intl/server'
import { SectionHead } from '@/components/diffuse'
import type { Country } from '@/lib/countries'

type Step = { k: string; title: string; body: string }

export async function Launch({ locale, country }: { locale: 'en' | 'pt'; country: Country }) {
  const t = await getTranslations({ locale, namespace: 'launch' })
  const steps = t.raw('steps') as Step[]
  const here = country === 'BR' ? 1 : country === 'US' ? 2 : 0
  return (
    <section className="pt-[110px]">
      <SectionHead n="01" sub={t('sub')}>{t.rich('title', { em: (c) => <em>{c}</em> })}</SectionHead>
      <ol className="relative grid list-none gap-8 p-0 md:grid-cols-3 md:gap-6">
        <span aria-hidden="true" className="absolute left-[6px] top-0 h-full w-px bg-hair md:left-0 md:right-0 md:top-[6px] md:h-px md:w-auto" />
        {steps.map((s, i) => (
          <li key={s.k} className="relative pl-8 md:pl-0 md:pt-8">
            <span aria-hidden="true" className={`absolute left-0 top-1 h-[13px] w-[13px] rounded-full border-[1.5px] md:top-0 ${i === here ? 'border-accent bg-accent shadow-[inset_0_0_0_2.5px_var(--bg),0_0_0_6px_color-mix(in_oklab,var(--accent)_18%,transparent)]' : 'border-hair bg-bg'}`} />
            <p className="font-mono text-[11px] tracking-[0.14em] text-ink-3">{s.k}{i === here && <span className="ml-3 text-ink">· {t('you')}</span>}</p>
            <h3 className="mt-2 font-display text-[26px] font-bold leading-[1.1] tracking-[-0.025em]">{s.title}</h3>
            <p className="mt-2 max-w-[320px] text-[15px] font-light text-ink-2">{s.body}</p>
          </li>
        ))}
      </ol>
    </section>
  )
}
