'use client'

import { motion } from 'framer-motion'
import { ScrollReveal, StaggerContainer, StaggerItem, ParallaxLayer } from './scroll-animations'
import {
  RoseHeartSticker,
  SparkleSticker,
  SunSticker,
  FlowerSticker,
  CloudSticker,
  LavenderMoonSticker,
} from './stickers'

/* ------------------------------------------------------------------ */
/*  Memory cards (polaroid-style)                                     */
/* ------------------------------------------------------------------ */

function MemoryCard({
  title,
  date,
  stage,
  color,
  rotate,
  sticker,
}: {
  title: string
  date: string
  stage: string
  color: string
  rotate: number
  sticker: React.ReactNode
}) {
  return (
    <motion.div
      className="rounded-[20px] p-5 pb-6 relative overflow-hidden"
      style={{
        background: color,
        rotate: `${rotate}deg`,
        boxShadow: '0 8px 24px rgba(0,0,0,0.06)',
      }}
      whileHover={{ scale: 1.04, rotate: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
    >
      {/* Photo area */}
      <div
        className="aspect-[4/3] rounded-[12px] mb-4 flex items-center justify-center relative overflow-hidden"
        style={{ background: 'rgba(255,255,255,0.5)' }}
      >
        <div className="absolute inset-0 flex items-center justify-center">
          {sticker}
        </div>
        {/* Film grain effect */}
        <div className="absolute inset-0 opacity-[0.03]" style={{ background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.1) 2px, rgba(0,0,0,0.1) 4px)' }} />
      </div>

      {/* Caption */}
      <p
        className="text-[16px] font-semibold leading-[1.3] mb-1"
        style={{ fontFamily: 'var(--font-fraunces), var(--font-display)' }}
      >
        {title}
      </p>
      <div className="flex items-center justify-between">
        <p
          className="text-[12px]"
          style={{
            fontFamily: 'var(--font-instrument-serif)',
            fontStyle: 'italic',
            color: 'var(--ink-secondary)',
          }}
        >
          {date}
        </p>
        <span
          className="px-2 py-0.5 rounded-full text-[9px] font-semibold uppercase tracking-[0.06em]"
          style={{ background: 'rgba(255,255,255,0.6)', color: 'var(--ink-secondary)' }}
        >
          {stage}
        </span>
      </div>
    </motion.div>
  )
}

/* ------------------------------------------------------------------ */
/*  Timeline milestones                                               */
/* ------------------------------------------------------------------ */

const milestones = [
  { month: 'Jan', title: 'Positive test', color: 'var(--rose)' },
  { month: 'Apr', title: 'First kick', color: 'var(--lavender)' },
  { month: 'Jul', title: 'Baby shower', color: 'var(--sticker-yellow)' },
  { month: 'Sep', title: 'Born!', color: 'var(--sticker-coral)' },
  { month: 'Dec', title: 'First smile', color: 'var(--blue-powder)' },
  { month: 'Mar', title: 'First word', color: 'var(--sticker-green)' },
  { month: 'Jun', title: 'First steps', color: 'var(--rose)' },
]

/* ------------------------------------------------------------------ */
/*  Main section                                                      */
/* ------------------------------------------------------------------ */

export function MemoriesSection() {
  const memories = [
    {
      title: 'First heartbeat',
      date: 'Week 8 \u00B7 March 2025',
      stage: 'Pregnancy',
      color: 'var(--lavender-soft)',
      rotate: -3,
      sticker: <LavenderMoonSticker size={48} rotate={-8} />,
    },
    {
      title: 'Rio said "mama"',
      date: '11 months \u00B7 January 2024',
      stage: 'Kids',
      color: 'var(--blue-powder-soft)',
      rotate: 2,
      sticker: <CloudSticker size={48} rotate={5} />,
    },
    {
      title: 'Positive test day',
      date: 'Cycle Day 28 \u00B7 February 2025',
      stage: 'Cycle',
      color: 'var(--rose-soft)',
      rotate: -1.5,
      sticker: <RoseHeartSticker size={48} rotate={-3} />,
    },
    {
      title: 'First steps!',
      date: '13 months \u00B7 March 2024',
      stage: 'Kids',
      color: 'var(--sticker-yellow-soft)',
      rotate: 3,
      sticker: <SunSticker size={48} rotate={10} />,
    },
    {
      title: 'Baby shower',
      date: 'Week 32 \u00B7 July 2025',
      stage: 'Pregnancy',
      color: 'var(--sticker-peach-soft)',
      rotate: -2,
      sticker: <FlowerSticker size={48} rotate={-6} />,
    },
    {
      title: 'First day of school',
      date: '3 years \u00B7 September 2026',
      stage: 'Kids',
      color: 'var(--sticker-green-soft)',
      rotate: 1.5,
      sticker: <SparkleSticker size={48} rotate={8} />,
    },
  ]

  return (
    <section
      id="memories"
      className="py-20 lg:py-32 px-6 lg:px-12 relative overflow-hidden"
      style={{ background: 'var(--bg)' }}
      aria-label="Memories"
    >
      <div className="max-w-[1280px] mx-auto">
        {/* Header */}
        <ScrollReveal>
          <div className="text-center mb-12 lg:mb-16">
            <p className="eyebrow">Collect Every Moment</p>
            <h2
              className="text-[36px] lg:text-[56px] font-semibold tracking-[-0.015em] leading-[1.05] text-balance mb-6"
              style={{ fontFamily: 'var(--font-fraunces), var(--font-display)' }}
            >
              Memories that{' '}
              <em
                className="not-italic"
                style={{
                  fontFamily: 'var(--font-instrument-serif), var(--font-italic)',
                  fontStyle: 'italic',
                  fontWeight: 400,
                }}
              >
                grow with you
              </em>
              .
            </h2>
            <p
              className="text-[17px] lg:text-[19px] leading-[1.6] max-w-[640px] mx-auto"
              style={{ color: 'var(--ink-secondary)' }}
            >
              First heartbeat, first word, first steps. Grandma remembers every milestone across every stage and turns them into a timeline of love.
            </p>
          </div>
        </ScrollReveal>

        {/* Timeline bar */}
        <ScrollReveal delay={0.1}>
          <div className="relative mb-12 lg:mb-16 px-4">
            <div className="h-px w-full" style={{ background: 'var(--border)' }} />
            <div className="flex justify-between relative -mt-2">
              {milestones.map((m, i) => (
                <motion.div
                  key={i}
                  className="flex flex-col items-center"
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.08, duration: 0.3 }}
                >
                  <div
                    className="w-3 h-3 rounded-full border-2 mb-2"
                    style={{ background: m.color, borderColor: 'var(--surface)' }}
                  />
                  <span className="text-[10px] font-semibold" style={{ color: 'var(--ink)' }}>{m.month}</span>
                  <span className="text-[9px] hidden sm:block" style={{ color: 'var(--ink-secondary)' }}>{m.title}</span>
                </motion.div>
              ))}
            </div>
          </div>
        </ScrollReveal>

        {/* Memory cards grid */}
        <StaggerContainer className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 lg:gap-6" staggerDelay={0.1}>
          {memories.map((memory, i) => (
            <StaggerItem key={i}>
              <MemoryCard {...memory} />
            </StaggerItem>
          ))}
        </StaggerContainer>

        {/* Features list */}
        <ScrollReveal delay={0.2}>
          <div className="flex flex-wrap justify-center gap-4 mt-12 lg:mt-16">
            {[
              'Auto-captured milestones',
              'Photo memories with stickers',
              'Timeline across all stages',
              'Export as memory books',
              'Share with family',
            ].map((feature) => (
              <div
                key={feature}
                className="flex items-center gap-2 px-4 py-2.5 rounded-full border"
                style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
              >
                <SparkleSticker size={14} />
                <span className="text-[14px] font-medium" style={{ color: 'var(--ink)' }}>
                  {feature}
                </span>
              </div>
            ))}
          </div>
        </ScrollReveal>
      </div>
    </section>
  )
}
