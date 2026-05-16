'use client'

import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { GrandmaLogo } from './grandma-logo'
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

export function AnimatedHeroCard({ className }: { className?: string }) {
  const [isBlinking, setIsBlinking] = useState(false)

  // Random blinking
  useEffect(() => {
    const randomBlink = () => {
      setIsBlinking(true)
      setTimeout(() => setIsBlinking(false), 150)
    }

    // Initial blink after 2s
    const initialTimeout = setTimeout(randomBlink, 2000)

    // Then random blinks every 2.5-4.5s
    const interval = setInterval(() => {
      randomBlink()
    }, 2500 + Math.random() * 2000)

    return () => {
      clearTimeout(initialTimeout)
      clearInterval(interval)
    }
  }, [])

  return (
    <div className={cn('relative w-full max-w-[480px] mx-auto', className)}>
      {/* Floating animation keyframes */}
      <style jsx>{`
        @keyframes float-1 {
          0%, 100% { transform: translate(0, 0) rotate(var(--r, 0deg)); }
          50% { transform: translate(5px, -12px) rotate(calc(var(--r, 0deg) + 5deg)); }
        }
        @keyframes float-2 {
          0%, 100% { transform: translate(0, 0) rotate(var(--r, 0deg)); }
          50% { transform: translate(-8px, -10px) rotate(calc(var(--r, 0deg) - 4deg)); }
        }
        @keyframes float-3 {
          0%, 100% { transform: translate(0, 0) rotate(var(--r, 0deg)); }
          50% { transform: translate(6px, -8px) rotate(calc(var(--r, 0deg) + 3deg)); }
        }
        .float-1 { animation: float-1 4s ease-in-out infinite; }
        .float-2 { animation: float-2 5s ease-in-out infinite; }
        .float-3 { animation: float-3 3.5s ease-in-out infinite; }
      `}</style>

      {/* Main container */}
      <div className="relative" style={{ height: 380 }}>
        
        {/* Floating stickers around the eye */}
        
        {/* Top left - Heart */}
        <div 
          className="absolute float-1" 
          style={{ top: '5%', left: '5%', '--r': '-12deg' } as React.CSSProperties}
        >
          <HeartSticker size={52} />
        </div>

        {/* Top right - Flower */}
        <div 
          className="absolute float-2" 
          style={{ top: '8%', right: '8%', '--r': '8deg' } as React.CSSProperties}
        >
          <FlowerSticker size={48} />
        </div>

        {/* Right side - Sun */}
        <div 
          className="absolute float-3" 
          style={{ top: '40%', right: '0%', '--r': '5deg' } as React.CSSProperties}
        >
          <SunSticker size={56} />
        </div>

        {/* Bottom right - Sparkle */}
        <div 
          className="absolute float-1" 
          style={{ bottom: '15%', right: '10%', '--r': '-8deg' } as React.CSSProperties}
        >
          <SparkleSticker size={40} />
        </div>

        {/* Bottom - Cloud */}
        <div 
          className="absolute float-2" 
          style={{ bottom: '5%', left: '30%', '--r': '3deg' } as React.CSSProperties}
        >
          <CloudSticker size={50} />
        </div>

        {/* Bottom left - Footprint */}
        <div 
          className="absolute float-3" 
          style={{ bottom: '20%', left: '5%', '--r': '10deg' } as React.CSSProperties}
        >
          <FootprintSticker size={38} />
        </div>

        {/* Left side - Leaf */}
        <div 
          className="absolute float-1" 
          style={{ top: '45%', left: '0%', '--r': '-15deg' } as React.CSSProperties}
        >
          <LeafSticker size={44} />
        </div>

        {/* Top center-left - Moon */}
        <div 
          className="absolute float-2" 
          style={{ top: '0%', left: '25%', '--r': '6deg' } as React.CSSProperties}
        >
          <MoonSticker size={42} />
        </div>

        {/* Center - Big Grandma Eye */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div 
            className="transition-transform duration-150"
            style={{ 
              transform: isBlinking ? 'scaleY(0.1)' : 'scaleY(1)',
              transformOrigin: 'center',
            }}
          >
            <GrandmaLogo size={200} />
          </div>
        </div>
      </div>

      {/* Bottom tagline */}
      <div className="text-center mt-6">
        <div 
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full" 
          style={{ background: 'var(--surface)' }}
        >
          <GrandmaLogo size={20} />
          <span 
            className="text-[12px] font-medium uppercase tracking-[0.1em]" 
            style={{ color: 'var(--ink)' }}
          >
            Grandma is with you
          </span>
        </div>
      </div>
    </div>
  )
}
