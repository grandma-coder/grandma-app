'use client'

import { motion } from 'framer-motion'
import { ScrollReveal } from './scroll-animations'
import {
  RoseHeartSticker,
  SparkleSticker,
  SunSticker,
  CloudSticker,
  LavenderMoonSticker,
} from './stickers'

/* ------------------------------------------------------------------ */
/*  Minimal memory dot with hover                                     */
/* ------------------------------------------------------------------ */

function MemoryDot({
  label,
  date,
  color,
  sticker,
  delay,
}: {
  label: string
  date: string
  color: string
  sticker: React.ReactNode
  delay: number
}) {
  return (
    <motion.div
      className="group relative flex flex-col items-center"
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay, duration: 0.4 }}
    >
      {/* Dot with sticker */}
      <motion.div
        className="w-[64px] h-[64px] lg:w-[80px] lg:h-[80px] rounded-full flex items-center justify-center cursor-pointer"
        style={{ background: color }}
        whileHover={{ scale: 1.15, boxShadow: '0 8px 32px rgba(0,0,0,0.1)' }}
        transition={{ type: 'spring', stiffness: 300 }}
      >
        {sticker}
      </motion.div>

      {/* Label */}
      <p 
        className="mt-3 text-[13px] lg:text-[14px] font-semibold text-center"
        style={{ color: 'var(--ink)' }}
      >
        {label}
      </p>
      <p 
        className="text-[11px] lg:text-[12px] text-center"
        style={{ 
          fontFamily: 'var(--font-instrument-serif)',
          fontStyle: 'italic',
          color: 'var(--ink-secondary)' 
        }}
      >
        {date}
      </p>
    </motion.div>
  )
}

/* ------------------------------------------------------------------ */
/*  Main section                                                      */
/* ------------------------------------------------------------------ */

export function MemoriesSection() {
  const memories = [
    {
      label: 'First heartbeat',
      date: 'Week 8',
      color: 'var(--lavender-soft)',
      sticker: <LavenderMoonSticker size={36} rotate={-8} />,
    },
    {
      label: 'First kick',
      date: 'Week 20',
      color: 'var(--rose-soft)',
      sticker: <RoseHeartSticker size={36} rotate={5} />,
    },
    {
      label: 'Born!',
      date: 'September',
      color: 'var(--sticker-yellow-soft)',
      sticker: <SunSticker size={36} rotate={-5} />,
    },
    {
      label: 'First word',
      date: '11 months',
      color: 'var(--blue-powder-soft)',
      sticker: <CloudSticker size={36} rotate={8} />,
    },
    {
      label: 'First steps',
      date: '13 months',
      color: 'var(--sticker-green-soft)',
      sticker: <SparkleSticker size={36} rotate={-3} />,
    },
  ]

  return (
    <section
      id="memories"
      className="py-20 lg:py-32 px-6 lg:px-12"
      style={{ background: 'var(--bg)' }}
      aria-label="Memories"
    >
      <div className="max-w-[960px] mx-auto">
        {/* Header - Minimal */}
        <ScrollReveal>
          <div className="text-center mb-12 lg:mb-16">
            <h2
              className="text-[32px] lg:text-[48px] font-semibold tracking-[-0.015em] leading-[1.1] mb-4"
              style={{ fontFamily: 'var(--font-fraunces), var(--font-display)' }}
            >
              Every{' '}
              <em
                className="not-italic"
                style={{
                  fontFamily: 'var(--font-instrument-serif), var(--font-italic)',
                  fontStyle: 'italic',
                  fontWeight: 400,
                  color: 'var(--rose)',
                }}
              >
                moment
              </em>
              , remembered.
            </h2>
            <p
              className="text-[16px] lg:text-[18px] leading-[1.6] max-w-[480px] mx-auto"
              style={{ color: 'var(--ink-secondary)' }}
            >
              Grandma captures milestones across your journey and turns them into a timeline of love.
            </p>
          </div>
        </ScrollReveal>

        {/* Memory dots - horizontal layout */}
        <div className="flex justify-center items-start gap-6 lg:gap-10 flex-wrap">
          {memories.map((memory, i) => (
            <MemoryDot
              key={i}
              {...memory}
              delay={i * 0.1}
            />
          ))}
        </div>

        {/* Connecting line (desktop only) */}
        <div className="hidden lg:block mt-8">
          <div className="h-px w-full max-w-[600px] mx-auto" style={{ background: 'var(--border)' }} />
        </div>

        {/* Simple feature tags */}
        <ScrollReveal delay={0.2}>
          <div className="flex flex-wrap justify-center gap-3 mt-10">
            {['Auto-captured', 'Photo memories', 'Share with family'].map((tag) => (
              <span
                key={tag}
                className="px-4 py-2 rounded-full text-[13px] font-medium"
                style={{ 
                  background: 'var(--surface)',
                  color: 'var(--ink-secondary)',
                  border: '1px solid var(--border)',
                }}
              >
                {tag}
              </span>
            ))}
          </div>
        </ScrollReveal>
      </div>
    </section>
  )
}
