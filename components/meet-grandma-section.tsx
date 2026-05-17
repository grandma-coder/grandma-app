'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { GrandmaLogo } from './grandma-logo'
import { ScrollReveal } from './scroll-animations'
import { PhoneMockup } from './phone-mockup'
import {
  SunSticker,
  RoseHeartSticker,
  FlowerSticker,
} from './stickers'

/* ------------------------------------------------------------------ */
/*  Grandma Talk screen preview (from actual app)                     */
/* ------------------------------------------------------------------ */

function GrandmaTalkScreen() {
  const [showMessage, setShowMessage] = useState(false)
  const [showTopics, setShowTopics] = useState(false)

  useEffect(() => {
    const t1 = setTimeout(() => setShowMessage(true), 800)
    const t2 = setTimeout(() => setShowTopics(true), 1600)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [])

  return (
    <div className="flex flex-col h-full" style={{ background: 'var(--bg)' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-8 pb-3">
        <div className="w-6 h-6 rounded-full border flex items-center justify-center" style={{ borderColor: 'var(--border)' }}>
          <svg width="8" height="8" viewBox="0 0 8 8" fill="none"><path d="M6 2L2 6M2 2L6 6" stroke="var(--ink)" strokeWidth="1.5" strokeLinecap="round"/></svg>
        </div>
        <p className="text-[13px] font-semibold" style={{ fontFamily: 'var(--font-fraunces)' }}>
          grandma{' '}
          <em style={{ fontFamily: 'var(--font-instrument-serif)', fontStyle: 'italic', fontWeight: 400 }}>talk</em>
        </p>
        <div className="w-6 h-6 rounded-full border flex items-center justify-center" style={{ borderColor: 'var(--border)' }}>
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><rect x="1" y="1" width="3.5" height="3.5" rx="1" stroke="var(--ink)" strokeWidth="0.8"/><rect x="5.5" y="5.5" width="3.5" height="3.5" rx="1" stroke="var(--ink)" strokeWidth="0.8"/></svg>
        </div>
      </div>

      {/* Child pills */}
      <div className="flex gap-2 px-4 pb-3">
        {[
          { name: 'Rio', age: '2yr', active: true, color: 'var(--blue-powder)' },
          { name: 'Bahia', age: '7yr 1mo', active: false },
          { name: 'Bob', age: '4mo', active: false },
        ].map((kid) => (
          <div
            key={kid.name}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[8px]"
            style={{
              background: kid.active ? kid.color : 'transparent',
              border: `1px solid ${kid.active ? kid.color : 'var(--border)'}`,
              fontWeight: kid.active ? 600 : 400,
            }}
          >
            {kid.active && <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--ink)' }} />}
            <span>{kid.name}</span>
            <span style={{ color: 'var(--ink-secondary)' }}>{kid.age}</span>
          </div>
        ))}
      </div>

      {/* Orb / eye area */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 relative">
        <div className="absolute top-2 left-6"><SunSticker size={28} rotate={-8} /></div>
        <div className="absolute top-6 right-6"><RoseHeartSticker size={22} rotate={10} /></div>

        {/* Dark orb with moon */}
        <div className="relative">
          <div
            className="w-28 h-28 rounded-full flex items-center justify-center"
            style={{
              background: 'radial-gradient(circle, var(--ink) 40%, var(--lavender-soft) 100%)',
              boxShadow: '0 0 60px rgba(200, 182, 226, 0.3)',
            }}
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M10 2C6 2 2 6 2 10C2 14 6 18 10 18C14 18 18 14 18 10" stroke="var(--sticker-yellow)" strokeWidth="1.5" strokeLinecap="round"/>
              <path d="M18 2C14 2 10 6 10 10" stroke="var(--sticker-yellow)" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </div>
          <p
            className="text-center mt-2 text-[10px]"
            style={{
              fontFamily: 'var(--font-instrument-serif)',
              fontStyle: 'italic',
              color: 'var(--ink-secondary)',
            }}
          >
            got a question?
          </p>
        </div>
      </div>

      {/* Grandma message */}
      <div className="px-4 pb-2">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={showMessage ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.4 }}
          className="rounded-[16px] p-3 relative"
          style={{ background: 'var(--ink)', color: 'white' }}
        >
          <p className="text-[7px] uppercase tracking-[0.08em] font-semibold mb-1" style={{ color: 'rgba(255,255,255,0.5)' }}>
            Grandma
          </p>
          <p className="text-[10px] leading-[1.5]">
            {"Well hello, mama! Rio, Bahia, and Bob \u2014 you're busy! Tap a pill above to switch kids. Right now we're talking about Rio."}
          </p>
          <div className="absolute -bottom-1 -right-1">
            <FlowerSticker size={18} rotate={12} />
          </div>
        </motion.div>
      </div>

      {/* Suggested topics */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={showTopics ? { opacity: 1 } : {}}
        transition={{ duration: 0.3 }}
        className="flex gap-1.5 px-4 pb-2 overflow-x-auto"
      >
        {['Sleep routine', 'Vaccine schedule', 'Growth & milestones'].map((topic) => (
          <div
            key={topic}
            className="px-2.5 py-1.5 rounded-full text-[8px] whitespace-nowrap border"
            style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
          >
            {topic}
          </div>
        ))}
      </motion.div>

      {/* Input */}
      <div className="flex items-center gap-2 px-4 pb-4 pt-1">
        <div
          className="flex-1 rounded-full px-3 py-2 text-[9px] border"
          style={{ borderColor: 'var(--border)', background: 'var(--surface)', color: 'var(--ink-secondary)' }}
        >
          Tap to talk to grandma...
        </div>
        <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: 'var(--ink)' }}>
          <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
            <path d="M6 2v8" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
            <circle cx="6" cy="4" r="2" stroke="white" strokeWidth="1"/>
          </svg>
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Main section                                                      */
/* ------------------------------------------------------------------ */

export function MeetGrandmaSection() {
  return (
    <section
      id="grandma"
      className="py-20 lg:py-32 px-6 lg:px-12 relative overflow-hidden"
      style={{ background: 'var(--surface-raised)' }}
      aria-label="Meet Grandma"
    >
      <div className="max-w-[1280px] mx-auto">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left: Copy */}
          <div>
            <ScrollReveal>
              <p className="eyebrow">Your 3AM Companion</p>
            </ScrollReveal>

            <ScrollReveal delay={0.1}>
              <h2
                className="text-[36px] lg:text-[56px] font-semibold tracking-[-0.015em] leading-[1.05] mb-6"
                style={{ fontFamily: 'var(--font-fraunces), var(--font-display)' }}
              >
                Meet{' '}
                <em
                  className="not-italic"
                  style={{
                    fontFamily: 'var(--font-instrument-serif), var(--font-italic)',
                    fontStyle: 'italic',
                    fontWeight: 400,
                  }}
                >
                  Grandma
                </em>
                .
              </h2>
            </ScrollReveal>

            <ScrollReveal delay={0.2}>
              <div
                className="text-[17px] lg:text-[19px] leading-[1.65] flex flex-col gap-5"
                style={{ color: 'var(--ink-secondary)' }}
              >
                <p>
                  {"Grandma is the AI companion you wish you had at 2am when your baby won't stop crying and Google is making everything worse."}
                </p>
                <p>
                  {"She's been trained on the questions parents actually ask \u2014 the difference between colostrum and transitional milk, between Braxton-Hicks and the real thing, between a tantrum and a sensory meltdown."}
                </p>
                <p style={{ color: 'var(--ink)', fontWeight: 500 }}>
                  {"She'll never say \"you should.\" She'll say \"here's what I know, dear.\""}
                </p>
                <p>
                  {"She knows your kids by name, remembers their ages, their allergies, their sleep patterns. She'll tell you what the science says, what your grandmother would have done, and let you decide."}
                </p>
              </div>
            </ScrollReveal>

            {/* Feature pills */}
            <ScrollReveal delay={0.3}>
              <div className="flex flex-wrap gap-3 mt-8">
                {[
                  { icon: '\u2605', text: 'Always available' },
                  { icon: '\u2661', text: 'Knows your kids by name' },
                  { icon: '\u2727', text: 'Never judges' },
                  { icon: '\u25CE', text: 'Cites real sources' },
                  { icon: '\u266B', text: 'Speaks 12 languages' },
                ].map((pill) => (
                  <div
                    key={pill.text}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-full border"
                    style={{
                      borderColor: 'var(--border)',
                      background: 'var(--surface)',
                    }}
                  >
                    <span className="text-[14px]">{pill.icon}</span>
                    <span className="text-[14px] font-medium" style={{ color: 'var(--ink)' }}>
                      {pill.text}
                    </span>
                  </div>
                ))}
              </div>
            </ScrollReveal>
          </div>

          {/* Right: Phone mockup with Grandma Talk */}
          <ScrollReveal direction="right" distance={60}>
            <div className="flex justify-center lg:justify-end">
              <PhoneMockup className="w-[280px]">
                <GrandmaTalkScreen />
              </PhoneMockup>
            </div>
          </ScrollReveal>
        </div>
      </div>
    </section>
  )
}
