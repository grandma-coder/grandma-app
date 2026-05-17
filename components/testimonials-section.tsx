'use client'

import {
  LockSticker,
  ShieldSticker,
  RoseHeartSticker,
  StarSticker,
  SparkleSticker,
  HeartSticker,
} from './stickers'
import { ScrollReveal, StaggerContainer, StaggerItem } from './scroll-animations'

export function TrustStripSection() {
  const trustItems = [
    {
      icon: <LockSticker size={32} />,
      label: 'PRIVACY',
      text: 'Your data lives in Supabase. End-to-end encrypted. Yours to export anytime.',
    },
    {
      icon: <ShieldSticker size={32} />,
      label: 'COMPLIANCE',
      text: 'HIPAA-aware. GDPR-friendly. Built by parents, not surveillance capitalists.',
    },
    {
      icon: <RoseHeartSticker size={32} />,
      label: 'TRUST',
      text: "Not a substitute for your doctor. A second opinion who's always awake.",
    },
  ]

  return (
    <section
      className="py-16 px-6 lg:px-12"
      style={{ background: 'var(--bg-warm)' }}
      aria-label="Trust"
    >
      <div className="max-w-[1280px] mx-auto">
        <StaggerContainer className="flex flex-col lg:flex-row lg:items-center lg:justify-center gap-8 lg:gap-16" staggerDelay={0.15}>
          {trustItems.map((item, index) => (
            <StaggerItem key={index} className="flex items-start gap-4">
              {/* Icon */}
              <div className="flex-shrink-0">{item.icon}</div>

              {/* Text */}
              <div>
                <p
                  className="text-[11px] font-semibold uppercase tracking-[0.12em] mb-1"
                  style={{ color: 'var(--ink-muted)' }}
                >
                  {item.label}
                </p>
                <p
                  className="text-[15px] leading-[1.5] max-w-[280px]"
                  style={{ color: 'var(--ink)' }}
                >
                  {item.text}
                </p>
              </div>

              {/* Divider (hidden on last item and mobile) */}
              {index < trustItems.length - 1 && (
                <div
                  className="hidden lg:block w-px h-8 ml-8"
                  style={{ background: 'var(--ink-faint)' }}
                />
              )}
            </StaggerItem>
          ))}
        </StaggerContainer>
      </div>
    </section>
  )
}

interface TestimonialCardProps {
  quote: string
  name: string
  role: string
  initials: string
  initialsColor: string
  stickerIcon: React.ReactNode
  rotation: string
}

function TestimonialCard({
  quote,
  name,
  role,
  initials,
  initialsColor,
  stickerIcon,
  rotation,
}: TestimonialCardProps) {
  return (
    <div
      className="relative p-8 rounded-[28px] border shadow-[var(--shadow-card)] transition-all duration-[280ms] hover:rotate-0 hover:translate-y-[-6px]"
      style={{
        background: 'var(--surface)',
        borderColor: 'var(--border)',
        transform: `rotate(${rotation})`,
        transitionTimingFunction: 'var(--ease-paper)',
      }}
    >
      {/* Decorative sticker */}
      <div
        className="absolute -top-2 -right-2"
        style={{ transform: 'rotate(12deg)' }}
      >
        {stickerIcon}
      </div>

      {/* Quote */}
      <p
        className="text-[20px] leading-[1.5] mb-6"
        style={{
          fontFamily: 'var(--font-instrument-serif), var(--font-italic)',
          fontStyle: 'italic',
          color: 'var(--ink)',
        }}
      >
        {quote}
      </p>

      {/* Author */}
      <div className="flex items-center gap-3">
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center"
          style={{ background: initialsColor }}
        >
          <span
            className="text-[14px] font-semibold"
            style={{
              fontFamily: 'var(--font-fraunces), var(--font-display)',
              color: 'var(--ink)',
            }}
          >
            {initials}
          </span>
        </div>
        <div>
          <p
            className="text-[13px] font-semibold uppercase tracking-[0.1em]"
            style={{ color: 'var(--ink-muted)' }}
          >
            {name}
          </p>
          <p
            className="text-[12px]"
            style={{ color: 'var(--ink-faint)' }}
          >
            {role}
          </p>
        </div>
      </div>
    </div>
  )
}

export function TestimonialsSection() {
  const testimonials: TestimonialCardProps[] = [
    {
      quote: 'I used to have eight apps for this. Now I have Grandma. My phone is calmer. So am I.',
      name: 'MAYA',
      role: 'expecting baby #2',
      initials: 'M',
      initialsColor: 'var(--sticker-yellow-soft)',
      stickerIcon: <StarSticker size={36} rotate={12} />,
      rotation: '-1deg',
    },
    {
      quote: "The 3am question machine. She doesn't make me feel stupid for asking the same thing twice.",
      name: 'LÉA',
      role: 'first-time mom, Paris',
      initials: 'L',
      initialsColor: 'var(--sticker-green-soft)',
      stickerIcon: <SparkleSticker size={36} rotate={-8} />,
      rotation: '2deg',
    },
    {
      quote: "As a dad who joined the care circle, I finally know what's going on without nagging.",
      name: 'SAM',
      role: 'partner, Lisbon',
      initials: 'S',
      initialsColor: 'var(--sticker-pink-soft)',
      stickerIcon: <HeartSticker size={36} rotate={15} />,
      rotation: '-2deg',
    },
  ]

  return (
    <section
      className="py-20 lg:py-32 px-6 lg:px-12"
      style={{ background: 'var(--bg)' }}
      aria-label="Testimonials"
    >
      <div className="max-w-[1280px] mx-auto">
        {/* Header */}
        <ScrollReveal>
        <div className="text-center mb-12 lg:mb-16">
          <p className="eyebrow">BETA TESTERS · NAMES CHANGED</p>
          <h2
            className="text-[36px] lg:text-[56px] font-semibold tracking-[-0.015em] leading-[1.05]"
            style={{ fontFamily: 'var(--font-fraunces), var(--font-display)' }}
          >
            What early families{' '}
            <em
              className="not-italic"
              style={{
                fontFamily: 'var(--font-instrument-serif), var(--font-italic)',
                fontStyle: 'italic',
                fontWeight: 400,
              }}
            >
              actually
            </em>{' '}
            say.
          </h2>
        </div>
        </ScrollReveal>

        {/* Cards grid */}
        <StaggerContainer className="grid md:grid-cols-2 lg:grid-cols-3 gap-6" staggerDelay={0.15}>
          {testimonials.map((testimonial, index) => (
            <StaggerItem key={index}>
              <TestimonialCard {...testimonial} />
            </StaggerItem>
          ))}
        </StaggerContainer>
      </div>
    </section>
  )
}
