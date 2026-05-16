'use client'

import { useEffect, useState } from 'react'
import {
  LockSticker,
  PageSticker,
  GlobeSticker,
  CrownSticker,
  LavenderHeartSticker,
} from './stickers'

function TypingIndicator() {
  return (
    <div
      className="flex gap-1.5 px-4 py-3 rounded-[20px] w-fit"
      style={{ background: 'var(--lavender-soft)' }}
    >
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="w-2 h-2 rounded-full"
          style={{
            background: 'var(--lavender)',
            animation: `bounce 1.4s infinite ease-in-out`,
            animationDelay: `${i * 160}ms`,
          }}
        />
      ))}
      <style jsx>{`
        @keyframes bounce {
          0%, 80%, 100% {
            transform: translateY(0);
          }
          40% {
            transform: translateY(-6px);
          }
        }
      `}</style>
    </div>
  )
}

function ChatBubble({
  message,
  isUser,
  showHeart = false,
}: {
  message: string
  isUser: boolean
  showHeart?: boolean
}) {
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} relative`}>
      <div
        className={`px-4 py-3 max-w-[280px] lg:max-w-[320px] text-[15px] leading-[1.5] ${
          isUser
            ? 'rounded-[20px_20px_4px_20px]'
            : 'rounded-[20px_20px_20px_4px]'
        }`}
        style={{
          background: isUser ? 'var(--ink)' : 'var(--lavender-soft)',
          color: isUser ? 'var(--surface)' : 'var(--ink)',
        }}
      >
        {message}
      </div>
      {showHeart && (
        <div className="absolute -bottom-2 -right-2">
          <LavenderHeartSticker size={24} rotate={12} />
        </div>
      )}
    </div>
  )
}

export function MeetGrandmaSection() {
  const [showTyping, setShowTyping] = useState(true)

  useEffect(() => {
    // Show typing indicator animation
    const timer = setTimeout(() => {
      setShowTyping(true)
    }, 2000)
    return () => clearTimeout(timer)
  }, [])

  const reassurancePills = [
    { icon: <LockSticker size={20} />, text: 'Private by default' },
    { icon: <PageSticker size={20} />, text: 'Cites her sources' },
    { icon: <GlobeSticker size={20} />, text: 'Speaks 12 languages' },
  ]

  return (
    <section
      id="grandma"
      className="py-20 lg:py-32 px-6 lg:px-12"
      style={{ background: 'var(--bg-warm)' }}
      aria-label="Meet Guru Grandma"
    >
      <div className="max-w-[1280px] mx-auto">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left column - Text */}
          <div className="order-2 lg:order-1">
            <p className="eyebrow">POWERED BY CLAUDE</p>
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
                Guru Grandma
              </em>
              .
            </h2>

            <div className="space-y-4 mb-8 max-w-[520px]">
              <p
                className="text-[17px] leading-[1.6]"
                style={{ color: 'var(--ink-secondary)' }}
              >
                {"Grandma is built on top of Claude, Anthropic's AI assistant — but she's been retrained on the questions parents actually ask at 2am. She knows the difference between colostrum and transitional milk, between Braxton-Hicks and the real thing, between a tantrum and a sensory meltdown."}
              </p>
              <p
                className="text-[17px] leading-[1.6]"
                style={{ color: 'var(--ink-secondary)' }}
              >
                {"She'll never tell you what to do. She'll tell you what your options are, what the science says, what your grandmother would have done, and let you decide."}
              </p>
            </div>

            {/* Reassurance pills */}
            <div className="flex flex-wrap gap-3">
              {reassurancePills.map((pill, index) => (
                <div
                  key={index}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full border"
                  style={{
                    background: 'var(--surface)',
                    borderColor: 'var(--border)',
                  }}
                >
                  {pill.icon}
                  <span className="text-[13px] font-medium" style={{ color: 'var(--ink)' }}>
                    {pill.text}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Right column - Chat preview */}
          <div className="order-1 lg:order-2 flex justify-center lg:justify-end">
            <div
              className="w-full max-w-[440px] rounded-[28px] border shadow-[var(--shadow-card)] overflow-hidden"
              style={{
                background: 'var(--surface)',
                borderColor: 'var(--border)',
                transform: 'rotate(-2deg)',
              }}
            >
              {/* Chat header */}
              <div
                className="flex items-center gap-3 px-5 py-4 border-b"
                style={{ borderColor: 'var(--border)' }}
              >
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center relative"
                  style={{ background: 'var(--lavender-soft)' }}
                >
                  <CrownSticker size={16} />
                </div>
                <span
                  className="text-[16px] font-semibold"
                  style={{ fontFamily: 'var(--font-fraunces), var(--font-display)' }}
                >
                  Guru Grandma
                </span>
                <span
                  className="w-2 h-2 rounded-full ml-1"
                  style={{ background: 'var(--sticker-green)' }}
                />
              </div>

              {/* Chat body */}
              <div className="flex flex-col gap-3 p-5">
                <ChatBubble
                  message="Is it normal for a 14-month-old to wake up 4 times a night again?"
                  isUser={true}
                />
                <ChatBubble
                  message="Oh love, yes — this is almost certainly the 14-month sleep regression. It's tied to a developmental leap. Usually 2–6 weeks. Want the 3 things that actually help, or the 3 things every blog tells you that don't?"
                  isUser={false}
                  showHeart={true}
                />
                <ChatBubble
                  message="Both, please."
                  isUser={true}
                />
                {showTyping && <TypingIndicator />}
              </div>

              {/* Chat footer */}
              <div
                className="px-5 py-3 border-t"
                style={{ borderColor: 'var(--border)' }}
              >
                <p
                  className="text-[12px]"
                  style={{ color: 'var(--ink-muted)' }}
                >
                  Powered by Claude · Sonnet 4
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
