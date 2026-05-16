'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  StarSticker,
  SparkleSticker,
  HeartSticker,
  SunSticker,
  MoonSticker,
  FlowerSticker,
  LeafSticker,
  CloudSticker,
} from './stickers'

type JourneyStage = 'trying' | 'expecting' | 'raising'

export function WaitlistSection() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [stage, setStage] = useState<JourneyStage>('expecting')
  const [notifyLaunch, setNotifyLaunch] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    console.log('Waitlist submission:', { name, email, stage, notifyLaunch })
  }

  const stageColors = {
    trying: 'var(--rose)',
    expecting: 'var(--lavender)',
    raising: 'var(--blue-powder)',
  }

  return (
    <section
      id="waitlist"
      className="py-20 lg:py-32 px-6 lg:px-12 relative"
      style={{ background: 'rgba(224, 213, 243, 0.4)' }}
      aria-label="Join the Waitlist"
    >
      {/* Background stickers */}
      <div className="absolute top-[10%] left-[5%] hidden lg:block">
        <StarSticker size={48} rotate={-15} />
      </div>
      <div className="absolute top-[20%] right-[8%] hidden lg:block">
        <SparkleSticker size={40} rotate={12} />
      </div>
      <div className="absolute bottom-[30%] left-[8%] hidden lg:block">
        <HeartSticker size={44} rotate={-8} />
      </div>
      <div className="absolute bottom-[15%] right-[5%] hidden lg:block">
        <SunSticker size={52} rotate={10} />
      </div>
      <div className="absolute top-[50%] left-[3%] hidden lg:block">
        <MoonSticker size={36} rotate={-12} />
      </div>
      <div className="absolute top-[40%] right-[4%] hidden lg:block">
        <FlowerSticker size={42} rotate={8} />
      </div>

      <div className="max-w-[880px] mx-auto relative">
        {/* Main card */}
        <div
          className="p-8 lg:p-16 rounded-[36px] border shadow-[var(--shadow-card)]"
          style={{
            background: 'var(--surface)',
            borderColor: 'var(--border)',
          }}
        >
          {/* Eyebrow */}
          <p className="eyebrow text-center">JOIN THE WAITLIST</p>

          {/* Headline */}
          <h2
            className="text-[32px] lg:text-[48px] font-semibold tracking-[-0.015em] leading-[1.05] text-center mb-6"
            style={{ fontFamily: 'var(--font-fraunces), var(--font-display)' }}
          >
            {"We'll send your invite the "}
            <em
              className="not-italic"
              style={{
                fontFamily: 'var(--font-instrument-serif), var(--font-italic)',
                fontStyle: 'italic',
                fontWeight: 400,
              }}
            >
              moment
            </em>
            {" it's your turn."}
          </h2>

          {/* Subhead */}
          <p
            className="text-[17px] leading-[1.6] text-center max-w-[540px] mx-auto mb-8"
            style={{ color: 'var(--ink-secondary)' }}
          >
            {"We're rolling out invites slowly — Grandma takes her time to make sure each family feels seen. Drop your email and we'll let you know when you're up."}
          </p>

          {/* Form */}
          <form onSubmit={handleSubmit} className="max-w-[480px] mx-auto space-y-4">
            {/* Name input */}
            <input
              type="text"
              placeholder="Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input-field"
            />

            {/* Email input */}
            <input
              type="email"
              placeholder="you@your-life.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="input-field"
            />

            {/* Stage selector */}
            <div className="pt-2">
              <p
                className="text-[13px] font-medium mb-3"
                style={{ color: 'var(--ink-muted)' }}
              >
                I am...
              </p>
              <div className="flex rounded-full p-1 border" style={{ borderColor: 'var(--border)' }}>
                {(['trying', 'expecting', 'raising'] as JourneyStage[]).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setStage(s)}
                    className="flex-1 py-3 px-4 rounded-full text-[14px] font-medium transition-all duration-[320ms]"
                    style={{
                      background: stage === s ? stageColors[s] : 'transparent',
                      color: stage === s ? 'var(--ink)' : 'var(--ink-muted)',
                      transitionTimingFunction: 'var(--ease-paper)',
                    }}
                  >
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Checkbox */}
            <label className="flex items-center gap-3 pt-2 cursor-pointer">
              <input
                type="checkbox"
                checked={notifyLaunch}
                onChange={(e) => setNotifyLaunch(e.target.checked)}
                className="sr-only"
              />
              <div
                className="w-5 h-5 rounded border-2 flex items-center justify-center transition-colors"
                style={{
                  borderColor: notifyLaunch ? 'var(--primary)' : 'var(--border-strong)',
                  background: notifyLaunch ? 'var(--primary)' : 'var(--surface)',
                }}
              >
                {notifyLaunch && (
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path
                      d="M2 6L5 9L10 3"
                      stroke="var(--surface)"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
              </div>
              <span className="text-[14px]" style={{ color: 'var(--ink-secondary)' }}>
                Also notify me about the iOS and Android launch.
              </span>
            </label>

            {/* Submit button */}
            <button
              type="submit"
              className="btn-primary w-full mt-4"
              style={{ height: '64px' }}
            >
              Save my seat
            </button>
          </form>

          {/* Privacy note */}
          <p
            className="text-center text-[16px] mt-6"
            style={{
              fontFamily: 'var(--font-instrument-serif), var(--font-italic)',
              fontStyle: 'italic',
              color: 'var(--ink-muted)',
            }}
          >
            Pinky promise: no marketing emails. Only your invite, and a single hello.
          </p>
        </div>
      </div>
    </section>
  )
}

interface FAQItemProps {
  question: string
  answer: React.ReactNode
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
          className="text-[20px] lg:text-[22px] font-semibold"
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
            className="pt-4 text-[16px] leading-[1.7] max-w-[680px]"
            style={{ color: 'var(--ink-secondary)' }}
          >
            {answer}
          </div>
        </div>
      </div>
    </div>
  )
}

export function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  const faqs = [
    {
      question: 'When does the app launch?',
      answer:
        "We're rolling out invites weekly through summer 2026, with the iOS App Store launch later this year. Android follows shortly after. Your spot on the waitlist holds your invite — we go in the order people signed up, and we never skip ahead.",
    },
    {
      question: 'Is it really powered by AI? Can I trust it?',
      answer:
        "Grandma is built on Claude, Anthropic's AI assistant. We've designed her to never diagnose, never prescribe, and to always tell you when she's uncertain. She cites medical sources when she gives clinical answers, and she defers to your doctor or midwife on anything that matters. Think of her as the well-read friend who's awake at 3am.",
    },
    {
      question: 'Is my health data private?',
      answer:
        'Yes. Your data lives in Supabase, encrypted in transit and at rest. We never sell it, never use it to train models, and never share it with third parties. You can export everything or delete your account at any time, with one tap.',
    },
    {
      question: 'What does it cost?',
      answer: (
        <>
          Free forever for tracking, the chat (with limits), and browsing all pillars. Premium
          is $9.99/month or $69.99/year and unlocks unlimited scans, personalized insights,
          vaccine reminders, and the care circle. See the{' '}
          <Link href="/pricing" className="underline hover:opacity-70">
            pricing page
          </Link>{' '}
          for the full breakdown.
        </>
      ),
    },
    {
      question: 'Does my partner or nanny get access too?',
      answer:
        "Yes — the care circle lets you invite up to 5 caregivers per child with granular permissions. Your nanny can log naps without seeing your medical records. Your partner can see everything. Your mother-in-law sees only what you let her see.",
    },
    {
      question: "What if I'm not pregnant yet — or no longer have a baby — is it still for me?",
      answer:
        "Pre-pregnancy mode is built for the trying-to-conceive journey, with cycle and fertility tracking. Pregnancy mode walks you through 40 weeks. Kids mode goes from newborn to 5 years. You can switch between modes at any time, and Grandma keeps your history. After 5y, we'll let you know what comes next.",
    },
  ]

  return (
    <section
      className="py-20 lg:py-32 px-6 lg:px-12"
      style={{ background: 'var(--bg)' }}
      aria-label="FAQ"
    >
      <div className="max-w-[760px] mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <p className="eyebrow">THE OBVIOUS QUESTIONS</p>
          <h2
            className="text-[36px] lg:text-[56px] font-semibold tracking-[-0.015em] leading-[1.05]"
            style={{ fontFamily: 'var(--font-fraunces), var(--font-display)' }}
          >
            Things you&apos;re{' '}
            <em
              className="not-italic"
              style={{
                fontFamily: 'var(--font-instrument-serif), var(--font-italic)',
                fontStyle: 'italic',
                fontWeight: 400,
              }}
            >
              probably
            </em>{' '}
            wondering.
          </h2>
        </div>

        {/* FAQ items */}
        <div className="border-t" style={{ borderColor: 'var(--border)' }}>
          {faqs.map((faq, index) => (
            <FAQItem
              key={index}
              question={faq.question}
              answer={faq.answer}
              isOpen={openIndex === index}
              onToggle={() => setOpenIndex(openIndex === index ? null : index)}
            />
          ))}
        </div>
      </div>
    </section>
  )
}

export function FinalHeroStrip() {
  return (
    <section
      className="py-24 px-6 lg:px-12 text-center"
      style={{ background: 'var(--bg-warm)' }}
      aria-label="Ready when you are"
    >
      <p className="eyebrow">READY WHEN YOU ARE</p>
      <h2
        className="text-[40px] lg:text-[56px] leading-[1.1] mb-8"
        style={{
          fontFamily: 'var(--font-instrument-serif), var(--font-italic)',
          fontStyle: 'italic',
          color: 'var(--ink)',
        }}
      >
        {"Take your time. We'll be here."}
      </h2>
      <div className="flex justify-center">
        <LeafSticker size={32} />
      </div>
    </section>
  )
}
