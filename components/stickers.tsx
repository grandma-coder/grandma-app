// Grandma.app Sticker Library
// All stickers use the defined color palette with charcoal outlines

import React from 'react'

interface StickerProps {
  size?: number
  className?: string
  rotate?: number
}

// Heart sticker
export function HeartSticker({ size = 64, className = '', rotate = 0 }: StickerProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      className={`sticker-shadow ${className}`}
      style={{ transform: `rotate(${rotate}deg)` }}
      aria-hidden="true"
    >
      <path
        d="M32,56 C13,40 5,30 5,19 C5,11 12,6 20,6 C26,6 30,9 32,14 C34,9 38,6 44,6 C52,6 59,11 59,19 C59,30 51,40 32,56 Z"
        fill="var(--sticker-pink)"
        stroke="var(--sticker-charcoal)"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
    </svg>
  )
}

// Rose heart (pre-pregnancy mode)
export function RoseHeartSticker({ size = 64, className = '', rotate = 0 }: StickerProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      className={`sticker-shadow ${className}`}
      style={{ transform: `rotate(${rotate}deg)` }}
      aria-hidden="true"
    >
      <path
        d="M32,56 C13,40 5,30 5,19 C5,11 12,6 20,6 C26,6 30,9 32,14 C34,9 38,6 44,6 C52,6 59,11 59,19 C59,30 51,40 32,56 Z"
        fill="var(--rose)"
        stroke="var(--sticker-charcoal)"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
    </svg>
  )
}

// Lavender heart
export function LavenderHeartSticker({ size = 64, className = '', rotate = 0 }: StickerProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      className={`sticker-shadow ${className}`}
      style={{ transform: `rotate(${rotate}deg)` }}
      aria-hidden="true"
    >
      <path
        d="M32,56 C13,40 5,30 5,19 C5,11 12,6 20,6 C26,6 30,9 32,14 C34,9 38,6 44,6 C52,6 59,11 59,19 C59,30 51,40 32,56 Z"
        fill="var(--lavender)"
        stroke="var(--sticker-charcoal)"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
    </svg>
  )
}

// Sun sticker
export function SunSticker({ size = 64, className = '', rotate = 0 }: StickerProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      className={`sticker-shadow ${className}`}
      style={{ transform: `rotate(${rotate}deg)` }}
      aria-hidden="true"
    >
      <circle cx="32" cy="32" r="14" fill="var(--sticker-yellow)" stroke="var(--sticker-charcoal)" strokeWidth="2.5" />
      {[...Array(8)].map((_, i) => {
        const angle = (i / 8) * Math.PI * 2
        const x1 = 32 + Math.cos(angle) * 19
        const y1 = 32 + Math.sin(angle) * 19
        const x2 = 32 + Math.cos(angle) * 28
        const y2 = 32 + Math.sin(angle) * 28
        return (
          <line
            key={i}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke="var(--sticker-charcoal)"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
        )
      })}
    </svg>
  )
}

// Moon sticker
export function MoonSticker({ size = 64, className = '', rotate = 0 }: StickerProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      className={`sticker-shadow ${className}`}
      style={{ transform: `rotate(${rotate}deg)` }}
      aria-hidden="true"
    >
      <path
        d="M44,9 C30,9 19,21 19,35 C19,48 30,57 43,57 C48,57 54,54 56,50 C46,50 37,42 34,31 C31,18 36,13 44,9 Z"
        fill="var(--sticker-blue)"
        stroke="var(--sticker-charcoal)"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
    </svg>
  )
}

// Lavender moon
export function LavenderMoonSticker({ size = 64, className = '', rotate = 0 }: StickerProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      className={`sticker-shadow ${className}`}
      style={{ transform: `rotate(${rotate}deg)` }}
      aria-hidden="true"
    >
      <path
        d="M44,9 C30,9 19,21 19,35 C19,48 30,57 43,57 C48,57 54,54 56,50 C46,50 37,42 34,31 C31,18 36,13 44,9 Z"
        fill="var(--lavender)"
        stroke="var(--sticker-charcoal)"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
    </svg>
  )
}

// Cloud sticker
export function CloudSticker({ size = 64, className = '', rotate = 0 }: StickerProps) {
  return (
    <svg
      width={size}
      height={size * 0.65}
      viewBox="0 0 80 52"
      className={`sticker-shadow ${className}`}
      style={{ transform: `rotate(${rotate}deg)` }}
      aria-hidden="true"
    >
      <path
        d="M13,40 C5,40 5,27 15,26 C15,14 32,11 34,24 C40,14 59,15 59,27 C69,27 70,40 61,41 Z"
        fill="var(--blue-powder)"
        stroke="var(--sticker-charcoal)"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
    </svg>
  )
}

// Leaf sticker
export function LeafSticker({ size = 64, className = '', rotate = 0 }: StickerProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      className={`sticker-shadow ${className}`}
      style={{ transform: `rotate(${rotate}deg)` }}
      aria-hidden="true"
    >
      <path
        d="M8,56 C8,32 27,8 56,8 C56,37 37,56 8,56 Z"
        fill="var(--sticker-green)"
        stroke="var(--sticker-charcoal)"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <path
        d="M13,52 Q32,35 54,12"
        stroke="var(--sticker-charcoal)"
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
      />
    </svg>
  )
}

// Sparkle sticker
export function SparkleSticker({ size = 64, className = '', rotate = 0 }: StickerProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      className={`sticker-shadow ${className}`}
      style={{ transform: `rotate(${rotate}deg)` }}
      aria-hidden="true"
    >
      <path
        d="M32,4 L36,24 L56,28 L36,32 L32,52 L28,32 L8,28 L28,24 Z"
        fill="var(--sticker-peach)"
        stroke="var(--sticker-charcoal)"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
    </svg>
  )
}

// Baby footprint sticker
export function FootprintSticker({ size = 64, className = '', rotate = 0 }: StickerProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      className={`sticker-shadow ${className}`}
      style={{ transform: `rotate(${rotate}deg)` }}
      aria-hidden="true"
    >
      <path
        d="M20,52 C13,45 13,30 22,25 C31,20 39,28 38,40 C37,51 29,58 20,52 Z"
        fill="var(--sticker-pink)"
        stroke="var(--sticker-charcoal)"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <circle cx="33" cy="18" r="4" fill="var(--sticker-pink)" stroke="var(--sticker-charcoal)" strokeWidth="2" />
      <circle cx="42" cy="15" r="3.5" fill="var(--sticker-pink)" stroke="var(--sticker-charcoal)" strokeWidth="2" />
      <circle cx="50" cy="19" r="3" fill="var(--sticker-pink)" stroke="var(--sticker-charcoal)" strokeWidth="2" />
      <circle cx="55" cy="27" r="2.5" fill="var(--sticker-pink)" stroke="var(--sticker-charcoal)" strokeWidth="2" />
    </svg>
  )
}

// Flower sticker
export function FlowerSticker({ size = 64, className = '', rotate = 0 }: StickerProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      className={`sticker-shadow ${className}`}
      style={{ transform: `rotate(${rotate}deg)` }}
      aria-hidden="true"
    >
      {[...Array(6)].map((_, i) => (
        <ellipse
          key={i}
          cx="32"
          cy="14"
          rx="8"
          ry="12"
          fill="var(--sticker-lilac)"
          stroke="var(--sticker-charcoal)"
          strokeWidth="2"
          transform={`rotate(${i * 60} 32 32)`}
        />
      ))}
      <circle cx="32" cy="32" r="7" fill="var(--sticker-yellow)" stroke="var(--sticker-charcoal)" strokeWidth="2" />
    </svg>
  )
}

// Star sticker
export function StarSticker({ size = 64, className = '', rotate = 0 }: StickerProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      className={`sticker-shadow ${className}`}
      style={{ transform: `rotate(${rotate}deg)` }}
      aria-hidden="true"
    >
      <path
        d="M32,5 L39,24 L60,26 L44,38 L50,59 L32,46 L14,59 L20,38 L4,26 L25,24 Z"
        fill="var(--sticker-yellow)"
        stroke="var(--sticker-charcoal)"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
    </svg>
  )
}

// Cross (medical) sticker
export function CrossSticker({ size = 64, className = '', rotate = 0 }: StickerProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      className={`sticker-shadow ${className}`}
      style={{ transform: `rotate(${rotate}deg)` }}
      aria-hidden="true"
    >
      <path
        d="M24,6 h16 a4,4 0 0 1 4,4 v14 h14 a4,4 0 0 1 4,4 v8 a4,4 0 0 1 -4,4 h-14 v14 a4,4 0 0 1 -4,4 h-16 a4,4 0 0 1 -4,-4 v-14 h-14 a4,4 0 0 1 -4,-4 v-8 a4,4 0 0 1 4,-4 h14 v-14 a4,4 0 0 1 4,-4 z"
        fill="var(--sticker-pink)"
        stroke="var(--sticker-charcoal)"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
    </svg>
  )
}

// Lock sticker
export function LockSticker({ size = 64, className = '', rotate = 0 }: StickerProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      className={`sticker-shadow ${className}`}
      style={{ transform: `rotate(${rotate}deg)` }}
      aria-hidden="true"
    >
      <rect x="14" y="28" width="36" height="28" rx="6" fill="var(--sticker-lilac)" stroke="var(--sticker-charcoal)" strokeWidth="2.5" />
      <path
        d="M20,28 v-8 a12,12 0 0 1 24,0 v8"
        fill="none"
        stroke="var(--sticker-charcoal)"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <circle cx="32" cy="42" r="4" fill="var(--sticker-charcoal)" />
    </svg>
  )
}

// Shield sticker
export function ShieldSticker({ size = 64, className = '', rotate = 0 }: StickerProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      className={`sticker-shadow ${className}`}
      style={{ transform: `rotate(${rotate}deg)` }}
      aria-hidden="true"
    >
      <path
        d="M32,6 L54,14 V32 C54,46 42,56 32,60 C22,56 10,46 10,32 V14 Z"
        fill="var(--sticker-green)"
        stroke="var(--sticker-charcoal)"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <path
        d="M24,32 L30,38 L42,26"
        fill="none"
        stroke="var(--sticker-charcoal)"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

// Page sticker
export function PageSticker({ size = 64, className = '', rotate = 0 }: StickerProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      className={`sticker-shadow ${className}`}
      style={{ transform: `rotate(${rotate}deg)` }}
      aria-hidden="true"
    >
      <path
        d="M14,8 H42 L50,16 V56 H14 Z"
        fill="var(--sticker-yellow)"
        stroke="var(--sticker-charcoal)"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <path d="M42,8 V16 H50" fill="none" stroke="var(--sticker-charcoal)" strokeWidth="2.5" strokeLinejoin="round" />
      <line x1="20" y1="26" x2="44" y2="26" stroke="var(--sticker-charcoal)" strokeWidth="2" strokeLinecap="round" />
      <line x1="20" y1="34" x2="44" y2="34" stroke="var(--sticker-charcoal)" strokeWidth="2" strokeLinecap="round" />
      <line x1="20" y1="42" x2="36" y2="42" stroke="var(--sticker-charcoal)" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

// Globe sticker
export function GlobeSticker({ size = 64, className = '', rotate = 0 }: StickerProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      className={`sticker-shadow ${className}`}
      style={{ transform: `rotate(${rotate}deg)` }}
      aria-hidden="true"
    >
      <circle cx="32" cy="32" r="24" fill="var(--sticker-green)" stroke="var(--sticker-charcoal)" strokeWidth="2.5" />
      <ellipse cx="32" cy="32" rx="10" ry="24" fill="none" stroke="var(--sticker-charcoal)" strokeWidth="2" />
      <line x1="8" y1="32" x2="56" y2="32" stroke="var(--sticker-charcoal)" strokeWidth="2" />
      <path d="M12,20 Q32,16 52,20" fill="none" stroke="var(--sticker-charcoal)" strokeWidth="2" />
      <path d="M12,44 Q32,48 52,44" fill="none" stroke="var(--sticker-charcoal)" strokeWidth="2" />
    </svg>
  )
}

// Two hearts sticker
export function TwoHeartsSticker({ size = 64, className = '', rotate = 0 }: StickerProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      className={`sticker-shadow ${className}`}
      style={{ transform: `rotate(${rotate}deg)` }}
      aria-hidden="true"
    >
      <path
        d="M20,42 C8,32 4,26 4,18 C4,12 9,8 14,8 C18,8 20,10 22,13 C24,10 26,8 30,8 C35,8 40,12 40,18 C40,26 36,32 20,42 Z"
        fill="var(--sticker-lilac)"
        stroke="var(--sticker-charcoal)"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M42,54 C28,42 24,35 24,26 C24,19 30,14 36,14 C41,14 44,17 46,21 C48,17 51,14 56,14 C62,14 68,19 68,26 C68,35 64,42 42,54 Z"
        fill="var(--sticker-pink)"
        stroke="var(--sticker-charcoal)"
        strokeWidth="2.5"
        strokeLinejoin="round"
        transform="translate(-8, 2)"
      />
    </svg>
  )
}

// Week ring sticker (pregnancy journey)
export function WeekRingSticker({ size = 64, className = '', rotate = 0 }: StickerProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      className={`sticker-shadow ${className}`}
      style={{ transform: `rotate(${rotate}deg)` }}
      aria-hidden="true"
    >
      <circle
        cx="32"
        cy="32"
        r="26"
        fill="none"
        stroke="var(--lavender)"
        strokeWidth="8"
        strokeDasharray="120 164"
        transform="rotate(-90 32 32)"
      />
      <circle cx="32" cy="32" r="18" fill="var(--lavender-soft)" stroke="var(--sticker-charcoal)" strokeWidth="2" />
    </svg>
  )
}

// Crown sticker
export function CrownSticker({ size = 64, className = '', rotate = 0 }: StickerProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      className={`sticker-shadow ${className}`}
      style={{ transform: `rotate(${rotate}deg)` }}
      aria-hidden="true"
    >
      <path
        d="M8,44 L12,20 L22,32 L32,16 L42,32 L52,20 L56,44 Z"
        fill="var(--sticker-yellow)"
        stroke="var(--sticker-charcoal)"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <rect x="8" y="44" width="48" height="8" rx="2" fill="var(--sticker-yellow)" stroke="var(--sticker-charcoal)" strokeWidth="2.5" />
    </svg>
  )
}

// Paper plane sticker
export function PaperPlaneSticker({ size = 64, className = '', rotate = 0 }: StickerProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      className={`sticker-shadow ${className}`}
      style={{ transform: `rotate(${rotate}deg)` }}
      aria-hidden="true"
    >
      <path
        d="M6,32 L58,8 L42,56 L32,38 Z"
        fill="var(--sticker-blue)"
        stroke="var(--sticker-charcoal)"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <path
        d="M32,38 L58,8"
        fill="none"
        stroke="var(--sticker-charcoal)"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  )
}

// Droplet sticker
export function DropletSticker({ size = 64, className = '', rotate = 0 }: StickerProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      className={`sticker-shadow ${className}`}
      style={{ transform: `rotate(${rotate}deg)` }}
      aria-hidden="true"
    >
      <path
        d="M32,6 C32,6 14,28 14,40 C14,52 22,58 32,58 C42,58 50,52 50,40 C50,28 32,6 32,6 Z"
        fill="var(--sticker-blue)"
        stroke="var(--sticker-charcoal)"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
    </svg>
  )
}

// Green check sticker
export function CheckSticker({ size = 64, className = '', rotate = 0 }: StickerProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      className={`sticker-shadow ${className}`}
      style={{ transform: `rotate(${rotate}deg)` }}
      aria-hidden="true"
    >
      <circle cx="32" cy="32" r="26" fill="var(--sticker-green)" stroke="var(--sticker-charcoal)" strokeWidth="2.5" />
      <path
        d="M20,32 L28,40 L44,24"
        fill="none"
        stroke="var(--sticker-charcoal)"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

// Small inline heart (16px) for wordmark
export function InlineHeartSticker({ size = 16, fill = 'var(--lavender)', className = '' }: { size?: number; fill?: string; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      className={className}
      aria-hidden="true"
      style={{ display: 'inline-block', verticalAlign: 'middle', marginLeft: '2px' }}
    >
      <path
        d="M8,14 C3.25,10 1.25,7.5 1.25,4.75 C1.25,2.75 3,1.5 5,1.5 C6.5,1.5 7.5,2.25 8,3.5 C8.5,2.25 9.5,1.5 11,1.5 C13,1.5 14.75,2.75 14.75,4.75 C14.75,7.5 12.75,10 8,14 Z"
        fill={fill}
        stroke="var(--sticker-charcoal)"
        strokeWidth="0.8"
        strokeLinejoin="round"
      />
    </svg>
  )
}

// Lilac heart (for footer)
export function LilacHeartSticker({ size = 64, className = '', rotate = 0 }: StickerProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      className={`sticker-shadow ${className}`}
      style={{ transform: `rotate(${rotate}deg)` }}
      aria-hidden="true"
    >
      <path
        d="M32,56 C13,40 5,30 5,19 C5,11 12,6 20,6 C26,6 30,9 32,14 C34,9 38,6 44,6 C52,6 59,11 59,19 C59,30 51,40 32,56 Z"
        fill="var(--sticker-lilac)"
        stroke="var(--sticker-charcoal)"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
    </svg>
  )
}
