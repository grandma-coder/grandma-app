'use client'

import { useState } from 'react'
import {
  RoseHeartSticker,
  SunSticker,
  MoonSticker,
  LeafSticker,
  SparkleSticker,
  FootprintSticker,
  FlowerSticker,
} from './stickers'

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

          {/* Right column - Sticker collage */}
          <div className="relative min-h-[400px] lg:min-h-[520px]">
            {/* Main card */}
            <div
              className="relative mx-auto max-w-[380px] p-8 rounded-[28px] border shadow-[var(--shadow-card)]"
              style={{
                background: 'var(--surface)',
                borderColor: 'var(--border)',
              }}
            >
              {/* Week ring */}
              <div className="flex flex-col items-center mb-6">
                <div className="relative w-[200px] h-[200px]">
                  {/* Ring background */}
                  <svg
                    className="w-full h-full"
                    viewBox="0 0 200 200"
                    aria-hidden="true"
                  >
                    {/* Background ring */}
                    <circle
                      cx="100"
                      cy="100"
                      r="80"
                      fill="none"
                      stroke="var(--lavender-soft)"
                      strokeWidth="14"
                    />
                    {/* Progress ring */}
                    <circle
                      cx="100"
                      cy="100"
                      r="80"
                      fill="none"
                      stroke="var(--lavender)"
                      strokeWidth="14"
                      strokeDasharray="302 503"
                      strokeLinecap="round"
                      transform="rotate(-90 100 100)"
                    />
                  </svg>
                  {/* Center text */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span
                      className="text-[36px] font-semibold tracking-[-0.02em]"
                      style={{ fontFamily: 'var(--font-fraunces), var(--font-display)' }}
                    >
                      WEEK 24
                    </span>
                    <span
                      className="text-[16px] mt-1"
                      style={{
                        fontFamily: 'var(--font-instrument-serif), var(--font-italic)',
                        fontStyle: 'italic',
                        color: 'var(--ink-secondary)',
                      }}
                    >
                      lemon size
                    </span>
                  </div>
                </div>
              </div>

              {/* Chat bubble */}
              <div
                className="p-4 rounded-[20px]"
                style={{ background: 'var(--lavender-soft)' }}
              >
                <p
                  className="text-[15px] text-center"
                  style={{ color: 'var(--ink)' }}
                >
                  {"you're doing beautifully today"}
                </p>
              </div>
            </div>

            {/* Floating stickers */}
            <div className="absolute top-[-20px] left-[10%] lg:left-[-10%]">
              <RoseHeartSticker size={56} rotate={-12} />
            </div>
            <div className="absolute top-[10%] right-[-5%] lg:right-[-15%]">
              <SunSticker size={64} rotate={8} />
            </div>
            <div className="absolute top-[45%] right-[-10%] lg:right-[-20%]">
              <MoonSticker size={52} rotate={-6} />
            </div>
            <div className="absolute bottom-[20%] left-[-5%] lg:left-[-15%]">
              <LeafSticker size={48} rotate={16} />
            </div>
            <div className="absolute bottom-[5%] right-[10%]">
              <SparkleSticker size={44} rotate={-18} />
            </div>
            <div className="absolute top-[60%] left-[-8%] lg:left-[-18%]">
              <FootprintSticker size={40} rotate={10} />
            </div>
            <div className="absolute top-[25%] right-[5%] lg:right-[-5%]">
              <FlowerSticker size={50} rotate={-14} />
            </div>
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
