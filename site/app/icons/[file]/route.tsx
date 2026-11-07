import { notFound } from 'next/navigation'
import { ICONS } from '@/lib/pwa/manifest'
import { eyeIcon } from '@/lib/pwa/icon-image'

export const dynamicParams = false
export const dynamic = 'force-static'

export function generateStaticParams() {
  return Object.keys(ICONS).map((file) => ({ file }))
}

/** PWA / apple-touch icons, drawn from the eye sticker at build time (no binaries in the repo). */
export async function GET(_req: Request, { params }: { params: Promise<{ file: string }> }) {
  const { file } = await params
  const spec = ICONS[file]
  if (!spec) notFound()
  return eyeIcon(spec.size, spec.pad)
}
