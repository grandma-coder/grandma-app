import { ImageResponse } from 'next/og'
import { getTranslations } from 'next-intl/server'
import { FIELDS } from '@/lib/modes'

export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function OG({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'meta' })
  const h = await getTranslations({ locale, namespace: 'hero' })
  const f = FIELDS.pre
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: 72, color: '#1A1916',
        background: `radial-gradient(circle at 18% 22%, ${f.g1}, transparent 55%), radial-gradient(circle at 84% 18%, ${f.g2}, transparent 55%), radial-gradient(circle at 74% 86%, ${f.g3}, transparent 55%), radial-gradient(circle at 20% 82%, ${f.g4}, transparent 55%), #F4F1E8` }}>
        <div style={{ fontSize: 26, letterSpacing: 6, textTransform: 'uppercase' }}>{`${h('status')} · ${h('first')} · ${h('then')}`}</div>
        <div style={{ fontSize: 84, lineHeight: 1, maxWidth: 1000 }}>{t('ogTitle')}</div>
      </div>
    ),
    size,
  )
}
