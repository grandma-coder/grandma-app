'use client'

import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import {
  HeartSticker,
  FlowerSticker,
  LeafSticker,
  SparkleSticker,
  SunSticker,
  MoonSticker,
  FootprintSticker,
  CloudSticker,
} from './stickers'

type Stage = 'pre' | 'pregnancy' | 'kids'

interface StageConfig {
  id: Stage
  label: string
  title: string
  value: string
  subtitle: string
  message: string
  color: string
  colorSoft: string
}

const stages: StageConfig[] = [
  {
    id: 'pre',
    label: 'Pre-Pregnancy',
    title: 'Cycle Day',
    value: '14',
    subtitle: 'fertile window',
    message: 'your body is preparing',
    color: '#F5C754',
    colorSoft: 'rgba(245, 199, 84, 0.3)',
  },
  {
    id: 'pregnancy',
    label: 'Pregnancy',
    title: 'Week',
    value: '24',
    subtitle: 'lemon size',
    message: "you're doing beautifully",
    color: '#C8B6E2',
    colorSoft: 'rgba(200, 182, 226, 0.3)',
  },
  {
    id: 'kids',
    label: 'Kids',
    title: 'Month',
    value: '14',
    subtitle: 'first steps soon',
    message: 'every milestone matters',
    color: '#A8D8EA',
    colorSoft: 'rgba(168, 216, 234, 0.3)',
  },
]

// Large blinking Grandma Eye
function GrandmaEyeLarge({
  color = '#C8B6E2',
  isBlinking = false,
  size = 180,
}: {
  color?: string
  isBlinking?: boolean
  size?: number
}) {
  const scale = size / 180

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 180 180"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="transition-all duration-500"
    >
      {/* Outer glow pulse */}
      <ellipse
        cx="90"
        cy="90"
        rx="80"
        ry="55"
        fill={color}
        fillOpacity="0.12"
        className="animate-pulse"
        style={{ animationDuration: '2.5s' }}
      />

      {/* Top lashes - hide when blinking */}
      <g
        className="transition-all duration-150 origin-center"
        style={{
          transformOrigin: '90px 90px',
          opacity: isBlinking ? 0 : 1,
          transform: isBlinking ? 'scaleY(0)' : 'scaleY(1)',
        }}
      >
        <path d="M35 78 L22 55" stroke="var(--ink)" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M50 62 L35 38" stroke="var(--ink)" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M70 50 L58 25" stroke="var(--ink)" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M90 45 L90 18" stroke="var(--ink)" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M110 50 L122 25" stroke="var(--ink)" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M130 62 L145 38" stroke="var(--ink)" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M145 78 L158 55" stroke="var(--ink)" strokeWidth="2.5" strokeLinecap="round" />
      </g>

      {/* Eye almond shape */}
      <ellipse
        cx="90"
        cy="90"
        rx="65"
        ry={isBlinking ? 4 : 42}
        fill="white"
        stroke="var(--ink)"
        strokeWidth="2.5"
        className="transition-all duration-150"
      />

      {/* Iris */}
      <circle
        cx="90"
        cy="90"
        r="28"
        fill={color}
        className="transition-all duration-500"
        style={{ opacity: isBlinking ? 0 : 1 }}
      />

      {/* Heart pupil */}
      <path
        d="M90 78 C83 71 72 75 72 84 C72 95 90 106 90 106 C90 106 108 95 108 84 C108 75 97 71 90 78Z"
        fill="var(--ink)"
        className="transition-all duration-150"
        style={{ opacity: isBlinking ? 0 : 1 }}
      />

      {/* Highlight */}
      <circle
        cx="80"
        cy="82"
        r="5"
        fill="white"
        className="transition-all duration-150"
        style={{ opacity: isBlinking ? 0 : 1 }}
      />
    </svg>
  )
}

export function AnimatedHeroCard({ className }: { className?: string }) {
  const [currentStage, setCurrentStage] = useState(0)
  const [isBlinking, setIsBlinking] = useState(false)
  const [isTransitioning, setIsTransitioning] = useState(false)

  // Auto-cycle stages with blink
  useEffect(() => {
    const interval = setInterval(() => {
      setIsBlinking(true)
      setIsTransitioning(true)

      setTimeout(() => {
        setCurrentStage((prev) => (prev + 1) % stages.length)
      }, 120)

      setTimeout(() => {
        setIsBlinking(false)
        setIsTransitioning(false)
      }, 240)
    }, 4000)

    return () => clearInterval(interval)
  }, [])

  // Random blinks
  useEffect(() => {
    const randomBlink = () => {
      if (!isTransitioning) {
        setIsBlinking(true)
        setTimeout(() => setIsBlinking(false), 120)
      }
    }

    const interval = setInterval(randomBlink, 2500 + Math.random() * 2000)
    return () => clearInterval(interval)
  }, [isTransitioning])

  const stage = stages[currentStage]

  return (
    <div className={cn('relative w-full max-w-[520px] mx-auto', className)}>
      {/* Keyframes for orbiting */}
      <style jsx>{`
        @keyframes orbit {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes orbit-reverse {
          from { transform: rotate(360deg); }
          to { transform: rotate(0deg); }
        }
        @keyframes float-y {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        .orbit-container {
          position: absolute;
          left: 50%;
          top: 50%;
          transform-origin: center;
        }
        .orbit-item {
          position: absolute;
          top: 0;
          left: 50%;
          transform: translateX(-50%);
        }
      `}</style>

      {/* Stage selector pills */}
      <div className="flex justify-center gap-2 mb-8">
        {stages.map((s, i) => (
          <button
            key={s.id}
            onClick={() => {
              setIsBlinking(true)
              setIsTransitioning(true)
              setTimeout(() => {
                setCurrentStage(i)
              }, 120)
              setTimeout(() => {
                setIsBlinking(false)
                setIsTransitioning(false)
              }, 240)
            }}
            className="px-4 py-2 rounded-full text-[13px] font-medium transition-all duration-300 border-2"
            style={{
              background: currentStage === i ? s.color : 'transparent',
              borderColor: s.color,
              color: 'var(--ink)',
              opacity: currentStage === i ? 1 : 0.7,
            }}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Main eye area with orbiting stickers */}
      <div className="relative" style={{ height: 420 }}>
        {/* Orbiting stickers - outer ring */}
        <div
          className="orbit-container"
          style={{
            width: 380,
            height: 380,
            marginLeft: -190,
            marginTop: -190,
            animation: 'orbit 25s linear infinite',
          }}
        >
          <div className="orbit-item" style={{ top: 0 }}>
            <HeartSticker className="w-12 h-12 text-sticker-coral" />
          </div>
        </div>

        <div
          className="orbit-container"
          style={{
            width: 380,
            height: 380,
            marginLeft: -190,
            marginTop: -190,
            animation: 'orbit 25s linear infinite',
            animationDelay: '-3.125s',
          }}
        >
          <div className="orbit-item" style={{ top: 0 }}>
            <SunSticker className="w-14 h-14 text-sticker-yellow" />
          </div>
        </div>

        <div
          className="orbit-container"
          style={{
            width: 380,
            height: 380,
            marginLeft: -190,
            marginTop: -190,
            animation: 'orbit 25s linear infinite',
            animationDelay: '-6.25s',
          }}
        >
          <div className="orbit-item" style={{ top: 0 }}>
            <FlowerSticker className="w-11 h-11 text-mode-lavender" />
          </div>
        </div>

        <div
          className="orbit-container"
          style={{
            width: 380,
            height: 380,
            marginLeft: -190,
            marginTop: -190,
            animation: 'orbit 25s linear infinite',
            animationDelay: '-9.375s',
          }}
        >
          <div className="orbit-item" style={{ top: 0 }}>
            <MoonSticker className="w-10 h-10 text-mode-lavender" />
          </div>
        </div>

        <div
          className="orbit-container"
          style={{
            width: 380,
            height: 380,
            marginLeft: -190,
            marginTop: -190,
            animation: 'orbit 25s linear infinite',
            animationDelay: '-12.5s',
          }}
        >
          <div className="orbit-item" style={{ top: 0 }}>
            <LeafSticker className="w-10 h-10 text-sticker-leaf" />
          </div>
        </div>

        <div
          className="orbit-container"
          style={{
            width: 380,
            height: 380,
            marginLeft: -190,
            marginTop: -190,
            animation: 'orbit 25s linear infinite',
            animationDelay: '-15.625s',
          }}
        >
          <div className="orbit-item" style={{ top: 0 }}>
            <SparkleSticker className="w-9 h-9 text-sticker-coral" />
          </div>
        </div>

        <div
          className="orbit-container"
          style={{
            width: 380,
            height: 380,
            marginLeft: -190,
            marginTop: -190,
            animation: 'orbit 25s linear infinite',
            animationDelay: '-18.75s',
          }}
        >
          <div className="orbit-item" style={{ top: 0 }}>
            <CloudSticker className="w-12 h-12 text-mode-blue" />
          </div>
        </div>

        <div
          className="orbit-container"
          style={{
            width: 380,
            height: 380,
            marginLeft: -190,
            marginTop: -190,
            animation: 'orbit 25s linear infinite',
            animationDelay: '-21.875s',
          }}
        >
          <div className="orbit-item" style={{ top: 0 }}>
            <FootprintSticker className="w-9 h-9 text-mode-rose" />
          </div>
        </div>

        {/* Center card with eye */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div
            className="relative bg-[var(--surface)] rounded-[32px] p-6 transition-all duration-500"
            style={{
              boxShadow: `0 12px 40px ${stage.colorSoft}, 0 4px 12px rgba(0,0,0,0.06)`,
              border: '1px solid var(--border)',
            }}
          >
            {/* The big Grandma Eye */}
            <div className="flex justify-center">
              <GrandmaEyeLarge color={stage.color} isBlinking={isBlinking} size={180} />
            </div>

            {/* Stage info below eye */}
            <div className="text-center mt-4">
              <div
                className="text-[12px] uppercase tracking-[0.12em] mb-1 font-medium transition-colors duration-500"
                style={{ color: stage.color }}
              >
                {stage.title}
              </div>
              <div
                className="text-[52px] font-semibold leading-none transition-opacity duration-200"
                style={{
                  fontFamily: 'var(--font-fraunces), var(--font-display)',
                  color: 'var(--ink)',
                  opacity: isTransitioning ? 0.3 : 1,
                }}
              >
                {stage.value}
              </div>
              <div
                className="text-[15px] mt-1 transition-opacity duration-200"
                style={{
                  fontFamily: 'var(--font-instrument-serif), var(--font-italic)',
                  fontStyle: 'italic',
                  color: 'var(--ink-secondary)',
                  opacity: isTransitioning ? 0.3 : 1,
                }}
              >
                {stage.subtitle}
              </div>

              {/* Message bubble */}
              <div
                className="mt-5 px-5 py-3 rounded-full transition-all duration-500 inline-block"
                style={{ background: stage.colorSoft }}
              >
                <p className="text-[14px]" style={{ color: 'var(--ink)' }}>
                  {stage.message}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom tagline */}
      <div className="text-center mt-4">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full" style={{ background: 'var(--surface-raised)' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <ellipse cx="12" cy="12" rx="9" ry="6" fill={stage.color} stroke="var(--ink)" strokeWidth="1.5" />
            <path d="M12 9 C10 7 7 8 7 11 C7 14 12 17 12 17 C12 17 17 14 17 11 C17 8 14 7 12 9Z" fill="var(--ink)" />
          </svg>
          <span className="text-[12px] font-medium uppercase tracking-[0.08em]" style={{ color: 'var(--ink)' }}>
            Grandma is with you
          </span>
        </div>
      </div>
    </div>
  )
}
