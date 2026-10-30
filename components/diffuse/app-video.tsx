'use client'

import { useEffect, useRef, useState } from 'react'

/** Real app clip in a phone frame. Lazy-loads when near the viewport; poster only under reduced motion. */
export function AppVideo({ shot, lang, alt, priority = false, size = 'md' }: { shot: string; lang: 'en' | 'pt'; alt: string; priority?: boolean; size?: 'md' | 'sm' }) {
  const ref = useRef<HTMLDivElement>(null)
  const [load, setLoad] = useState(priority)
  const [reduce, setReduce] = useState(false)
  const base = `/media/app/${lang}/${shot}`

  useEffect(() => {
    setReduce(window.matchMedia('(prefers-reduced-motion: reduce)').matches)
    if (priority || !ref.current) return
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setLoad(true); io.disconnect() } }, { rootMargin: '300px' })
    io.observe(ref.current)
    return () => io.disconnect()
  }, [priority])

  const frame = size === 'md' ? 'w-[300px] rounded-[48px] border-[11px]' : 'w-[240px] rounded-[40px] border-[9px]'
  return (
    <div ref={ref} className={`relative mx-auto aspect-[9/19.5] overflow-hidden border-[#121110] bg-bg shadow-[0_30px_60px_-30px_rgba(26,25,22,.45)] ${frame}`}>
      {load && !reduce ? (
        <video className="absolute inset-0 h-full w-full object-cover" autoPlay muted loop playsInline preload={priority ? 'auto' : 'metadata'} poster={`${base}.jpg`} aria-label={alt}>
          <source src={`${base}.webm`} type="video/webm" />
          <source src={`${base}.mp4`} type="video/mp4" />
        </video>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img className="absolute inset-0 h-full w-full object-cover" src={`${base}.jpg`} alt={alt} loading={priority ? 'eager' : 'lazy'} />
      )}
    </div>
  )
}
