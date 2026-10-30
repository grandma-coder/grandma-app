import { getTranslations } from 'next-intl/server'
import { SectionHead } from '@/components/diffuse'

export async function Faq({ locale }: { locale: 'en' | 'pt' }) {
  const t = await getTranslations({ locale, namespace: 'faq' })
  const items = t.raw('items') as { q: string; a: string }[]
  return (
    <section className="pt-[110px]">
      <SectionHead n="03">{t.rich('title', { em: (c) => <em>{c}</em> })}</SectionHead>
      <div>
        {items.map((it, i) => (
          <details key={it.q} open={i === 0} className="group border-b border-line-2 py-[22px] first:border-t">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-5 font-display text-[clamp(20px,2vw,24px)] font-bold leading-[1.2] tracking-[-0.02em] [&::-webkit-details-marker]:hidden">
              {it.q}
              <span aria-hidden="true" className="flex h-[34px] w-[34px] flex-none items-center justify-center rounded-full border border-line-2 transition-transform duration-300 group-open:rotate-45">
                <svg width="14" height="14" viewBox="0 0 14 14"><path d="M7 2v10M2 7h10" stroke="#1A1916" strokeWidth="1.2" strokeLinecap="round" /></svg>
              </span>
            </summary>
            <p className="mb-0 mt-3 max-w-[720px] text-[16px] font-light leading-[1.7] text-ink-2">{it.a}</p>
          </details>
        ))}
      </div>
    </section>
  )
}
