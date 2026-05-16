'use client'

import { useState } from 'react'
import { Navigation, ScrollProgress } from '@/components/navigation'
import { Footer } from '@/components/footer'
import {
  PaperPlaneSticker,
  LavenderHeartSticker,
  CheckSticker,
} from '@/components/stickers'

interface FAQItemProps {
  question: string
  answer: string
  isOpen: boolean
  onToggle: () => void
}

function FAQItem({ question, answer, isOpen, onToggle }: FAQItemProps) {
  return (
    <div
      className="py-6 border-b"
      style={{ borderColor: 'var(--border)' }}
    >
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between gap-4 text-left"
      >
        <h3
          className="text-[18px] lg:text-[20px] font-semibold"
          style={{ fontFamily: 'var(--font-fraunces), var(--font-display)' }}
        >
          {question}
        </h3>
        <div
          className="w-8 h-8 rounded-full border flex items-center justify-center flex-shrink-0 transition-transform duration-[280ms]"
          style={{
            borderColor: 'var(--border)',
            background: 'var(--surface)',
            transform: isOpen ? 'rotate(45deg)' : 'rotate(0deg)',
            transitionTimingFunction: 'var(--ease-paper)',
          }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path
              d="M7 2V12M2 7H12"
              stroke="var(--ink)"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </div>
      </button>
      <div
        className="grid transition-all duration-[280ms]"
        style={{
          gridTemplateRows: isOpen ? '1fr' : '0fr',
          transitionTimingFunction: 'var(--ease-paper)',
        }}
      >
        <div className="overflow-hidden">
          <div
            className="pt-4 text-[16px] leading-[1.7]"
            style={{ color: 'var(--ink-secondary)' }}
          >
            {answer}
          </div>
        </div>
      </div>
    </div>
  )
}

function FeatureItem({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3 py-2">
      <CheckSticker size={20} />
      <span className="text-[15px]" style={{ color: 'var(--ink-secondary)' }}>
        {children}
      </span>
    </li>
  )
}

export default function PricingPage() {
  const [openFAQ, setOpenFAQ] = useState<number | null>(null)

  const pricingFAQs = [
    {
      question: 'Can I switch plans?',
      answer: 'Anytime, from inside the app. We prorate the difference.',
    },
    {
      question: 'What about refunds?',
      answer:
        "If you're not feeling it in the first 14 days of a paid plan, write to us and we'll refund the full amount, no questions.",
    },
    {
      question: 'Do you offer family or gift plans?',
      answer: 'Gift cards are coming. Family plans are on the roadmap for late 2026.',
    },
  ]

  return (
    <>
      <ScrollProgress />
      <Navigation />
      <main className="pt-32 pb-20">
        {/* Page header */}
        <section className="px-6 lg:px-12 text-center mb-16">
          <p className="eyebrow">SIMPLE PRICING</p>
          <h1
            className="text-[44px] lg:text-[72px] font-semibold tracking-[-0.02em] leading-[1.02] mb-6"
            style={{ fontFamily: 'var(--font-fraunces), var(--font-display)' }}
          >
            Choose the{' '}
            <em
              className="not-italic"
              style={{
                fontFamily: 'var(--font-instrument-serif), var(--font-italic)',
                fontStyle: 'italic',
                fontWeight: 400,
              }}
            >
              care
            </em>{' '}
            that fits.
          </h1>
          <p
            className="text-[17px] lg:text-[19px] leading-[1.6] max-w-[540px] mx-auto"
            style={{ color: 'var(--ink-secondary)' }}
          >
            Start free. Upgrade only when Grandma earns it. Cancel any time, no hard feelings.
          </p>
        </section>

        {/* Pricing cards */}
        <section className="px-6 lg:px-12 mb-24">
          <div className="max-w-[880px] mx-auto grid md:grid-cols-2 gap-6">
            {/* Free plan */}
            <div
              className="p-10 rounded-[28px] border shadow-[var(--shadow-card)] flex flex-col"
              style={{
                background: 'var(--surface)',
                borderColor: 'var(--border)',
              }}
            >
              <PaperPlaneSticker size={48} />
              <h2
                className="text-[24px] font-semibold mt-4 mb-2"
                style={{ fontFamily: 'var(--font-fraunces), var(--font-display)' }}
              >
                Free
              </h2>
              <div className="flex items-baseline gap-2 mb-2">
                <span
                  className="text-[72px] font-bold leading-none"
                  style={{ fontFamily: 'var(--font-fraunces), var(--font-display)' }}
                >
                  $0
                </span>
                <span className="text-[16px]" style={{ color: 'var(--ink-muted)' }}>
                  / forever
                </span>
              </div>
              <p
                className="text-[16px] mb-6"
                style={{
                  fontFamily: 'var(--font-instrument-serif), var(--font-italic)',
                  fontStyle: 'italic',
                  color: 'var(--ink-secondary)',
                }}
              >
                For dipping a toe in.
              </p>
              <div className="h-px w-full mb-6" style={{ background: 'var(--border)' }} />
              <ul className="flex-1 space-y-1 mb-8">
                <FeatureItem>Unlimited Guru Grandma chat (with context limits)</FeatureItem>
                <FeatureItem>Browse all 24 pillars</FeatureItem>
                <FeatureItem>3 photo scans per month</FeatureItem>
                <FeatureItem>Cycle, pregnancy, or kids tracking — full features</FeatureItem>
                <FeatureItem>1 child profile</FeatureItem>
                <FeatureItem>Light + dark mode, 12 languages</FeatureItem>
              </ul>
              <button className="btn-secondary w-full">Start free</button>
            </div>

            {/* Premium plan */}
            <div
              className="relative p-10 rounded-[28px] border shadow-[var(--shadow-card)] flex flex-col"
              style={{
                background: 'var(--lavender-soft)',
                borderColor: 'var(--border)',
              }}
            >
              {/* Badge */}
              <div
                className="absolute -top-3 right-6 px-4 py-1.5 rounded-full text-[11px] font-semibold uppercase tracking-[0.08em]"
                style={{
                  background: 'var(--sticker-coral)',
                  color: 'var(--surface)',
                  transform: 'rotate(-8deg)',
                }}
              >
                MOST CHOSEN
              </div>
              <LavenderHeartSticker size={48} />
              <h2
                className="text-[24px] font-semibold mt-4 mb-2"
                style={{ fontFamily: 'var(--font-fraunces), var(--font-display)' }}
              >
                Premium
              </h2>
              <div className="flex items-baseline gap-2 mb-1">
                <span
                  className="text-[72px] font-bold leading-none"
                  style={{ fontFamily: 'var(--font-fraunces), var(--font-display)' }}
                >
                  $9.99
                </span>
                <span className="text-[16px]" style={{ color: 'var(--ink-muted)' }}>
                  / month
                </span>
              </div>
              <p className="text-[14px] mb-2" style={{ color: 'var(--ink-secondary)' }}>
                or $69.99 / year — saves you 41%
              </p>
              <p
                className="text-[16px] mb-6"
                style={{
                  fontFamily: 'var(--font-instrument-serif), var(--font-italic)',
                  fontStyle: 'italic',
                  color: 'var(--ink-secondary)',
                }}
              >
                For the long haul.
              </p>
              <div className="h-px w-full mb-6" style={{ background: 'var(--border)' }} />
              <ul className="flex-1 space-y-1 mb-8">
                <FeatureItem>Everything in Free</FeatureItem>
                <FeatureItem>Unlimited photo scans (food, ultrasound, rashes, labels)</FeatureItem>
                <FeatureItem>Personalized insights generated weekly</FeatureItem>
                <FeatureItem>Vaccine, milestone, and appointment reminders</FeatureItem>
                <FeatureItem>Care circle (up to 5 caregivers)</FeatureItem>
                <FeatureItem>Up to 5 child profiles</FeatureItem>
                <FeatureItem>Priority support from a real human</FeatureItem>
              </ul>
              <button className="btn-primary w-full">Start 7-day free trial</button>
            </div>
          </div>

          {/* Comparison note */}
          <p
            className="text-center text-[15px] mt-12"
            style={{ color: 'var(--ink-muted)' }}
          >
            Both plans include light + dark mode, 12 languages, and offline mode.
          </p>
        </section>

        {/* Pricing FAQ */}
        <section className="px-6 lg:px-12">
          <div className="max-w-[680px] mx-auto border-t" style={{ borderColor: 'var(--border)' }}>
            {pricingFAQs.map((faq, index) => (
              <FAQItem
                key={index}
                question={faq.question}
                answer={faq.answer}
                isOpen={openFAQ === index}
                onToggle={() => setOpenFAQ(openFAQ === index ? null : index)}
              />
            ))}
          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}
