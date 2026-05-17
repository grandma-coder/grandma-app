'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { AnimatedHeroCard } from './animated-hero-card'

export function HeroSection() {
  const [email, setEmail] = useState('')
  const [waitlistCount, setWaitlistCount] = useState(3200)

  // Animated counter - grows slowly to simulate real signups
  useEffect(() => {
    const interval = setInterval(() => {
      setWaitlistCount((prev) => prev + Math.floor(Math.random() * 3) + 1)
    }, 8000) // Every 8 seconds add 1-3

    return () => clearInterval(interval)
  }, [])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // Handle form submission
    console.log('Email submitted:', email)
  }

  return (
    <section
      id="hero"
      className="min-h-screen pt-32 pb-20 px-6 lg:px-12"
      style={{ background: 'var(--bg)' }}
      aria-label="Hero"
    >
      <div className="max-w-[1280px] mx-auto">
        <div className="grid lg:grid-cols-[1.2fr_1fr] gap-12 lg:gap-16 items-center">
          {/* Left column - Text */}
          <div className="max-w-[640px]">
            {/* Eyebrow */}
            <p className="eyebrow">EARLY ACCESS · INVITES ROLLING OUT WEEKLY</p>

            {/* Headline */}
            <h1
              className="text-[44px] lg:text-[88px] leading-[1.02] font-semibold tracking-[-0.02em] mb-6"
              style={{ fontFamily: 'var(--font-fraunces), var(--font-display)' }}
            >
              With you through every{' '}
              <em
                className="not-italic"
                style={{
                  fontFamily: 'var(--font-instrument-serif), var(--font-italic)',
                  fontStyle: 'italic',
                  fontWeight: 400,
                  color: 'var(--lavender)',
                }}
              >
                chapter
              </em>{' '}
              of your journey.
            </h1>

            {/* Subhead */}
            <p
              className="text-[17px] lg:text-[19px] leading-[1.6] max-w-[540px] mb-8"
              style={{ color: 'var(--ink-secondary)' }}
            >
              From cycle tracking, through every week of pregnancy, into the beautiful chaos
              of raising little ones — Grandma is the calm, knowing companion who remembers
              everything, judges nothing, and answers at 3am.
            </p>

            {/* Waitlist form */}
            <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 mb-4">
              <input
                type="email"
                placeholder="you@your-life.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="input-field flex-1 sm:max-w-[320px]"
              />
              <button type="submit" className="btn-primary whitespace-nowrap">
                Join the waitlist
              </button>
            </form>

            {/* Form note */}
            <p
              className="text-[14px] leading-[1.5]"
              style={{ color: 'var(--ink-muted)' }}
            >
              {"We'll send one email when your invite is ready. No spam, on Grandma's honor."}
            </p>
          </div>

          {/* Right column - Animated Hero Card */}
          <div className="relative flex items-center justify-center min-h-[400px] lg:min-h-[520px]">
            <AnimatedHeroCard />
          </div>
        </div>
      </div>

      {/* Trust strip */}
      <div
        className="mt-16 lg:mt-24 -mx-6 lg:-mx-12 py-5"
        style={{ background: 'var(--bg-warm)' }}
      >
        <p
          className="text-center text-[15px]"
          style={{ color: 'var(--ink-secondary)' }}
        >
          Built by parents, for parents. Trusted by{' '}
          <motion.span
            key={waitlistCount}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="font-semibold inline-block"
            style={{ fontFamily: 'var(--font-fraunces), var(--font-display)' }}
          >
            {waitlistCount.toLocaleString()}+
          </motion.span>{' '}
          families on the waitlist.
        </p>
      </div>
    </section>
  )
}
