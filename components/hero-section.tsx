'use client'

import { useState } from 'react'
import { AnimatedHeroCard } from './animated-hero-card'

export function HeroSection() {
  const [email, setEmail] = useState('')

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
              Wisdom for every{' '}
              <em
                className="not-italic"
                style={{
                  fontFamily: 'var(--font-instrument-serif), var(--font-italic)',
                  fontStyle: 'italic',
                  fontWeight: 400,
                  color: 'var(--lavender)',
                }}
              >
                stage
              </em>{' '}
              of becoming a parent.
            </h1>

            {/* Subhead */}
            <p
              className="text-[17px] lg:text-[19px] leading-[1.6] max-w-[540px] mb-8"
              style={{ color: 'var(--ink-secondary)' }}
            >
              From trying-to-conceive, through every week of pregnancy, into the wild years
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
          Built by parents. Powered by Claude. Trusted by{' '}
          <span
            className="font-semibold"
            style={{ fontFamily: 'var(--font-fraunces), var(--font-display)' }}
          >
            3,200+
          </span>{' '}
          families on the waitlist.
        </p>
      </div>
    </section>
  )
}
