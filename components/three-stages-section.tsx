'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  RoseHeartSticker,
  LavenderMoonSticker,
  CloudSticker,
} from './stickers'
import { ScrollReveal, StaggerContainer, StaggerItem } from './scroll-animations'
import { PhoneMockup } from './phone-mockup'

type StageId = 'cycle' | 'pregnancy' | 'kids'

/* ------------------------------------------------------------------ */
/*  App screen previews (seed data from real app screenshots)         */
/* ------------------------------------------------------------------ */

function CycleTrackingScreen() {
  return (
    <div className="p-4 flex flex-col gap-3" style={{ background: 'var(--bg)', minHeight: '100%' }}>
      {/* Header */}
      <div className="flex items-center gap-3 pt-4">
        <div className="w-8 h-8 flex items-center justify-center">
          <svg viewBox="0 0 32 32" width="24" height="24" fill="none">
            <ellipse cx="16" cy="16" rx="14" ry="9" fill="white" stroke="var(--ink)" strokeWidth="1.5"/>
            <circle cx="16" cy="16" r="5.5" fill="var(--sticker-yellow)"/>
            <path d="M16 13C14 11 11 12 11 15C11 18 16 21 16 21C16 21 21 18 21 15C21 12 18 11 16 13Z" fill="var(--rose)"/>
          </svg>
        </div>
        <div>
          <p className="text-[14px] font-semibold" style={{ fontFamily: 'var(--font-fraunces)' }}>
            {"Hi, "}<em style={{ fontFamily: 'var(--font-instrument-serif)', fontStyle: 'italic' }}>Sarah</em>
          </p>
          <p className="text-[10px] uppercase tracking-[0.06em]" style={{ color: 'var(--ink-secondary)' }}>
            Saturday &middot; May 16 &middot; Cycle
          </p>
        </div>
      </div>

      {/* Cycle ring card */}
      <div className="rounded-[16px] p-4 relative overflow-hidden" style={{ background: '#3D2640' }}>
        <div className="absolute top-2 right-2 w-16 h-16 rounded-full" style={{ background: 'var(--rose-soft)', opacity: 0.4 }} />
        <div className="flex items-center gap-4">
          <div className="relative">
            <svg width="56" height="56" viewBox="0 0 56 56">
              <circle cx="28" cy="28" r="22" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="4"/>
              <circle cx="28" cy="28" r="22" fill="none" stroke="var(--rose)" strokeWidth="4" strokeDasharray="8 130" strokeLinecap="round" transform="rotate(-90 28 28)"/>
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-[8px] text-white/60 uppercase">Day</span>
              <span className="text-[16px] font-bold text-white" style={{ fontFamily: 'var(--font-fraunces)' }}>1</span>
              <span className="text-[7px] text-white/50">of 21</span>
            </div>
          </div>
          <div>
            <p className="text-[9px] text-white/60 uppercase tracking-wide">{"You're in"}</p>
            <p className="text-[16px] font-bold text-white" style={{ fontFamily: 'var(--font-fraunces)' }}>Menstruation</p>
            <p className="text-[9px] text-white/70">Day 1 of your period.</p>
          </div>
        </div>
      </div>

      {/* Hormones + Wisdom row */}
      <div className="grid grid-cols-2 gap-2.5">
        <div className="rounded-[12px] p-3 border" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
          <p className="text-[8px] uppercase tracking-[0.06em] font-semibold mb-2" style={{ color: 'var(--ink-secondary)' }}>Hormones</p>
          <svg viewBox="0 0 100 40" className="w-full h-8">
            <path d="M5 35 Q20 30 30 25 Q40 18 50 15 Q55 30 60 32 Q70 35 80 33 Q90 30 95 28" fill="none" stroke="var(--rose)" strokeWidth="1.5"/>
            <path d="M5 30 Q20 28 35 20 Q45 10 55 5 Q65 15 70 22 Q80 30 95 32" fill="none" stroke="var(--lavender)" strokeWidth="1.5"/>
            <path d="M5 32 Q25 32 40 30 Q55 25 65 20 Q75 18 85 22 Q90 25 95 30" fill="none" stroke="var(--sticker-green)" strokeWidth="1.5"/>
          </svg>
          <div className="flex gap-3 mt-1">
            <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full" style={{background:'var(--rose)'}}/><span className="text-[7px]">LH</span></span>
            <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full" style={{background:'var(--lavender)'}}/><span className="text-[7px]">E</span></span>
            <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full" style={{background:'var(--sticker-green)'}}/><span className="text-[7px]">P</span></span>
          </div>
        </div>
        <div className="rounded-[12px] p-3" style={{ background: 'var(--sticker-yellow)' }}>
          <div className="flex items-center gap-1 mb-1">
            <svg width="14" height="14" viewBox="0 0 20 20" fill="none">
              <ellipse cx="10" cy="10" rx="8" ry="5" fill="white" stroke="var(--ink)" strokeWidth="1"/>
              <path d="M10 8C9 7 7.5 7.5 7.5 9C7.5 10.5 10 12 10 12C10 12 12.5 10.5 12.5 9C12.5 7.5 11 7 10 8Z" fill="var(--rose)" />
            </svg>
          </div>
          <p className="text-[9px] font-bold" style={{ fontFamily: 'var(--font-fraunces)' }}>{"Today's "}<em style={{ fontFamily: 'var(--font-instrument-serif)', fontStyle: 'italic' }}>wisdom</em></p>
          <p className="text-[8px] mt-1 leading-[1.4]" style={{ color: 'var(--ink-secondary)' }}>
            {"\"Rest well today — your body is working hard, dear.\""}
          </p>
        </div>
      </div>

      {/* Fertile window */}
      <div className="rounded-[12px] p-3 border" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <svg width="10" height="10" viewBox="0 0 16 16" fill="none"><path d="M8 2L9.5 6L14 6.5L10.5 9.5L11.5 14L8 11.5L4.5 14L5.5 9.5L2 6.5L6.5 6Z" fill="var(--sticker-yellow)" stroke="var(--ink)" strokeWidth="0.8"/></svg>
            <span className="text-[8px] uppercase tracking-[0.06em] font-semibold">Fertile Window</span>
          </div>
          <span className="text-[8px]" style={{ color: 'var(--ink-secondary)' }}>this week</span>
        </div>
        <div className="flex gap-1">
          {['11','12','13','14','15','16','17'].map((d, i) => (
            <div key={d} className="flex-1 flex flex-col items-center gap-0.5">
              <div
                className="w-full aspect-square rounded-[6px] flex items-center justify-center text-[9px] font-medium"
                style={{
                  background: d === '16' ? 'transparent' : d === '17' ? 'var(--rose-soft)' : 'var(--surface-raised)',
                  border: d === '16' ? '1.5px solid var(--ink)' : 'none',
                  color: d === '17' ? 'var(--rose)' : 'var(--ink)',
                }}
              >
                {d}
              </div>
              <span className="text-[6px]" style={{ color: 'var(--ink-secondary)' }}>
                {['M','T','W','T','F','S','S'][i]}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Pillars peek */}
      <div className="flex items-center justify-between">
        <p className="text-[12px] font-bold" style={{ fontFamily: 'var(--font-fraunces)' }}>Pillars</p>
        <span className="text-[9px]" style={{ color: 'var(--ink-secondary)' }}>{"See all >"}</span>
      </div>

      {/* Bottom nav */}
      <div className="flex items-center justify-around py-2 mt-auto border-t" style={{ borderColor: 'var(--border)' }}>
        {[
          { icon: 'Home', active: true, color: 'var(--sticker-yellow)' },
          { icon: 'Planner', active: false },
          { icon: '+', active: false, special: true },
          { icon: 'Analytics', active: false },
          { icon: 'Settings', active: false },
        ].map((item, i) => (
          <div key={i} className="flex flex-col items-center gap-0.5">
            {item.special ? (
              <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'var(--sticker-coral)' }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12h14" stroke="white" strokeWidth="2.5" strokeLinecap="round"/></svg>
              </div>
            ) : (
              <>
                <div
                  className="w-6 h-6 rounded-full border flex items-center justify-center"
                  style={{
                    background: item.active ? item.color : 'transparent',
                    borderColor: item.active ? item.color : 'var(--border)',
                  }}
                >
                  <div className="w-2 h-2 rounded-sm" style={{ background: item.active ? 'var(--ink)' : 'var(--ink-secondary)' }} />
                </div>
                <span className="text-[6px]" style={{ color: item.active ? 'var(--ink)' : 'var(--ink-secondary)' }}>{item.icon}</span>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function PregnancyScreen() {
  return (
    <div className="p-4 flex flex-col gap-3" style={{ background: 'var(--bg)', minHeight: '100%' }}>
      {/* Header */}
      <div className="flex items-center gap-3 pt-4">
        <div className="w-8 h-8 flex items-center justify-center">
          <svg viewBox="0 0 32 32" width="24" height="24" fill="none">
            <ellipse cx="16" cy="16" rx="14" ry="9" fill="white" stroke="var(--ink)" strokeWidth="1.5"/>
            <circle cx="16" cy="16" r="5.5" fill="var(--lavender)"/>
            <path d="M16 13C14 11 11 12 11 15C11 18 16 21 16 21C16 21 21 18 21 15C21 12 18 11 16 13Z" fill="var(--rose)"/>
          </svg>
        </div>
        <div>
          <p className="text-[14px] font-semibold" style={{ fontFamily: 'var(--font-fraunces)' }}>
            {"Hi, "}<em style={{ fontFamily: 'var(--font-instrument-serif)', fontStyle: 'italic' }}>Sarah</em>
          </p>
          <p className="text-[10px] uppercase tracking-[0.06em]" style={{ color: 'var(--ink-secondary)' }}>
            Week 40 &middot; Saturday
          </p>
        </div>
      </div>

      {/* Week card */}
      <div className="rounded-[16px] p-4 relative overflow-hidden" style={{ background: '#C3D9A0' }}>
        <div className="flex items-center justify-between mb-1">
          <p className="text-[8px] uppercase tracking-[0.06em] font-semibold" style={{ color: 'var(--ink-secondary)' }}>
            Week &middot; Third Trimester
          </p>
          <p className="text-[10px]" style={{ fontFamily: 'var(--font-instrument-serif)', fontStyle: 'italic' }}>
            a <strong>pumpkin</strong>
          </p>
        </div>
        <div className="flex items-end gap-3">
          <div>
            <p className="text-[48px] font-bold leading-none" style={{ fontFamily: 'var(--font-fraunces)' }}>40</p>
            {/* Pumpkin illustration area */}
            <div className="w-14 h-14 mt-1 rounded-full flex items-center justify-center" style={{ background: 'var(--sticker-coral)', opacity: 0.7 }}>
              <span className="text-[24px]" role="img" aria-label="pumpkin">
                <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
                  <ellipse cx="16" cy="18" rx="12" ry="10" fill="#E8812B" stroke="var(--ink)" strokeWidth="1"/>
                  <path d="M16 8C16 8 14 4 16 3" stroke="var(--sticker-green)" strokeWidth="1.5" strokeLinecap="round"/>
                  <ellipse cx="11" cy="18" rx="5" ry="9" fill="none" stroke="var(--ink)" strokeWidth="0.5" opacity="0.3"/>
                  <ellipse cx="21" cy="18" rx="5" ry="9" fill="none" stroke="var(--ink)" strokeWidth="0.5" opacity="0.3"/>
                </svg>
              </span>
            </div>
          </div>
          <div className="flex-1 flex flex-col gap-2">
            <div>
              <div className="h-px mb-1" style={{ background: 'var(--ink)', opacity: 0.2 }} />
              <p className="text-[7px] uppercase tracking-[0.06em]">Length</p>
              <p className="text-[18px] font-bold" style={{ fontFamily: 'var(--font-fraunces)' }}>51.2<span className="text-[10px] font-normal">cm</span></p>
            </div>
            <div>
              <div className="h-px mb-1" style={{ background: 'var(--ink)', opacity: 0.2 }} />
              <p className="text-[7px] uppercase tracking-[0.06em]">Weight</p>
              <p className="text-[18px] font-bold" style={{ fontFamily: 'var(--font-fraunces)' }}>3.46<span className="text-[10px] font-normal">kg</span></p>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-between mt-3">
          <span className="text-[8px] uppercase tracking-[0.06em] font-medium">0 Days to Go</span>
          <span className="text-[8px] uppercase tracking-[0.06em]" style={{ color: 'var(--ink-secondary)' }}>{"Tap for details >"}</span>
        </div>
      </div>

      {/* Affirmation card */}
      <div className="rounded-[16px] p-4" style={{ background: 'var(--rose-soft)' }}>
        <div className="flex items-center justify-between mb-2">
          <p className="text-[8px] uppercase tracking-[0.06em] font-semibold" style={{ color: 'var(--rose)' }}>Daily Affirmation</p>
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M8 2L9.5 6L14 6.5L10.5 9.5L11.5 14L8 11.5L4.5 14L5.5 9.5L2 6.5L6.5 6Z" fill="var(--sticker-yellow)" stroke="var(--ink)" strokeWidth="0.8"/></svg>
        </div>
        <p className="text-[13px] font-semibold leading-[1.35]" style={{ fontFamily: 'var(--font-fraunces)' }}>
          You are creating the conditions for a whole lifetime of love.
        </p>
        <p className="text-[8px] mt-2" style={{ color: 'var(--ink-secondary)' }}>
          Come back tomorrow for a new affirmation
        </p>
      </div>

      {/* Bottom nav */}
      <div className="flex items-center justify-around py-2 mt-auto border-t" style={{ borderColor: 'var(--border)' }}>
        {[
          { icon: 'Home', active: true, color: 'var(--sticker-yellow)' },
          { icon: 'Calendar', active: false },
          { icon: '+', active: false, special: true },
          { icon: 'Documents', active: false },
          { icon: 'Settings', active: false },
        ].map((item, i) => (
          <div key={i} className="flex flex-col items-center gap-0.5">
            {item.special ? (
              <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'var(--sticker-coral)' }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12h14" stroke="white" strokeWidth="2.5" strokeLinecap="round"/></svg>
              </div>
            ) : (
              <>
                <div
                  className="w-6 h-6 rounded-full border flex items-center justify-center"
                  style={{
                    background: item.active ? item.color : 'transparent',
                    borderColor: item.active ? item.color : 'var(--border)',
                  }}
                >
                  <div className="w-2 h-2 rounded-sm" style={{ background: item.active ? 'var(--ink)' : 'var(--ink-secondary)' }} />
                </div>
                <span className="text-[6px]" style={{ color: item.active ? 'var(--ink)' : 'var(--ink-secondary)' }}>{item.icon}</span>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function KidsScreen() {
  return (
    <div className="p-4 flex flex-col gap-3" style={{ background: 'var(--bg)', minHeight: '100%' }}>
      {/* Header */}
      <div className="flex items-center gap-3 pt-4">
        <div className="w-8 h-8 flex items-center justify-center">
          <svg viewBox="0 0 32 32" width="24" height="24" fill="none">
            <ellipse cx="16" cy="16" rx="14" ry="9" fill="white" stroke="var(--ink)" strokeWidth="1.5"/>
            <circle cx="16" cy="16" r="5.5" fill="var(--blue-powder)"/>
            <path d="M16 13C14 11 11 12 11 15C11 18 16 21 16 21C16 21 21 18 21 15C21 12 18 11 16 13Z" fill="var(--rose)"/>
          </svg>
        </div>
        <div>
          <p className="text-[14px] font-semibold" style={{ fontFamily: 'var(--font-fraunces)' }}>
            {"Hi, "}<em style={{ fontFamily: 'var(--font-instrument-serif)', fontStyle: 'italic' }}>Sarah</em>
          </p>
          <p className="text-[10px] uppercase tracking-[0.06em]" style={{ color: 'var(--ink-secondary)' }}>
            {"Rio's Week"}
          </p>
        </div>
      </div>

      {/* Kid pills */}
      <div className="flex gap-2">
        {[
          { name: 'Rio', age: '2y', active: true, color: 'var(--blue-powder)' },
          { name: 'Bahia', age: '7y 1mo', active: false, color: 'var(--rose-soft)' },
          { name: 'Bob', age: '4mo', active: false, color: 'var(--rose-soft)' },
        ].map((kid) => (
          <div
            key={kid.name}
            className="px-3 py-1.5 rounded-full text-[9px] font-medium"
            style={{
              background: kid.active ? kid.color : 'transparent',
              border: `1px solid ${kid.active ? kid.color : 'var(--border)'}`,
              color: kid.active ? 'var(--ink)' : 'var(--ink-secondary)',
            }}
          >
            <strong>{kid.name}</strong> {kid.age}
          </div>
        ))}
      </div>

      {/* Time selector */}
      <div className="flex gap-1.5">
        {['Today', 'Yesterday', '7 Days', '30 Days', 'Custom'].map((t) => (
          <div
            key={t}
            className="px-2 py-1 rounded-full text-[7px] font-medium"
            style={{
              background: t === '7 Days' ? 'var(--ink)' : 'transparent',
              color: t === '7 Days' ? 'white' : 'var(--ink-secondary)',
              border: `1px solid ${t === '7 Days' ? 'var(--ink)' : 'var(--border)'}`,
            }}
          >
            {t}
          </div>
        ))}
      </div>

      {/* Tracking cards grid */}
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-[12px] p-3" style={{ background: 'var(--blue-powder-soft)' }}>
          <p className="text-[7px] uppercase tracking-[0.06em] font-semibold mb-1" style={{ color: 'var(--ink-secondary)' }}>Last Sleep</p>
          <div className="flex items-center gap-2">
            <svg width="16" height="16" viewBox="0 0 20 20" fill="none"><path d="M10 2C6 2 2 6 2 10C2 14 6 18 10 18C14 18 18 14 18 10" stroke="var(--blue-powder)" strokeWidth="2"/><path d="M18 2C14 2 10 6 10 10" stroke="var(--blue-powder)" strokeWidth="2"/></svg>
            <div>
              <p className="text-[10px] font-medium" style={{ fontFamily: 'var(--font-instrument-serif)', fontStyle: 'italic' }}>Tap to log</p>
              <p className="text-[7px]" style={{ color: 'var(--ink-secondary)' }}>of 84h target</p>
            </div>
          </div>
        </div>
        <div className="rounded-[12px] p-3" style={{ background: 'var(--sticker-yellow)' }}>
          <p className="text-[7px] uppercase tracking-[0.06em] font-semibold mb-1" style={{ color: 'var(--ink-secondary)' }}>Mood</p>
          <p className="text-[14px] font-bold" style={{ fontFamily: 'var(--font-fraunces)' }}>Happy</p>
          <p className="text-[7px] mt-1" style={{ color: 'var(--ink-secondary)' }}>3 logs</p>
        </div>
        <div className="rounded-[12px] p-3" style={{ background: 'var(--rose-soft)' }}>
          <p className="text-[7px] uppercase tracking-[0.06em] font-semibold mb-1" style={{ color: 'var(--ink-secondary)' }}>Calories</p>
          <p className="text-[10px] font-medium" style={{ fontFamily: 'var(--font-instrument-serif)', fontStyle: 'italic' }}>Tap to log</p>
          <p className="text-[7px] mt-1" style={{ color: 'var(--ink-secondary)' }}>of 7,350 target</p>
        </div>
        <div className="rounded-[12px] p-3" style={{ background: 'var(--sticker-green)', opacity: 0.3 }}>
          <p className="text-[7px] uppercase tracking-[0.06em] font-semibold mb-1" style={{ color: 'var(--ink-secondary)' }}>Activities</p>
          <p className="text-[10px] font-medium" style={{ fontFamily: 'var(--font-instrument-serif)', fontStyle: 'italic' }}>Tap to log</p>
          <p className="text-[7px] mt-1" style={{ color: 'var(--ink-secondary)' }}>Log an activity</p>
        </div>
      </div>

      {/* Health & Care */}
      <div className="rounded-[12px] p-3 border" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
        <div className="flex items-center gap-2 mb-2">
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M8 3C6 1 3 2.5 3 5.5C3 9 8 13 8 13C8 13 13 9 13 5.5C13 2.5 10 1 8 3Z" fill="var(--rose)"/></svg>
          <span className="text-[11px] font-bold" style={{ fontFamily: 'var(--font-fraunces)' }}>{"Health & Care"}</span>
        </div>
        <div className="flex items-center justify-between rounded-[8px] p-2" style={{ background: 'var(--surface-raised)' }}>
          <div>
            <p className="text-[7px] uppercase tracking-[0.06em] font-semibold" style={{ color: 'var(--rose)' }}>Overdue Vaccine</p>
            <p className="text-[9px] font-semibold">MMR &middot; dose 1</p>
            <p className="text-[7px]" style={{ color: 'var(--rose)' }}>Overdue &middot; 12-15 months</p>
          </div>
          <span className="px-1.5 py-0.5 rounded text-[7px] font-semibold" style={{ background: 'var(--rose-soft)', color: 'var(--rose)' }}>3 overdue</span>
        </div>
      </div>

      {/* Bottom nav */}
      <div className="flex items-center justify-around py-2 mt-auto border-t" style={{ borderColor: 'var(--border)' }}>
        {[
          { icon: 'Home', active: true, color: 'var(--sticker-yellow)' },
          { icon: 'Agenda', active: false },
          { icon: '+', active: false, special: true },
          { icon: 'Vault', active: false },
          { icon: 'Settings', active: false },
        ].map((item, i) => (
          <div key={i} className="flex flex-col items-center gap-0.5">
            {item.special ? (
              <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'var(--sticker-coral)' }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12h14" stroke="white" strokeWidth="2.5" strokeLinecap="round"/></svg>
              </div>
            ) : (
              <>
                <div
                  className="w-6 h-6 rounded-full border flex items-center justify-center"
                  style={{
                    background: item.active ? item.color : 'transparent',
                    borderColor: item.active ? item.color : 'var(--border)',
                  }}
                >
                  <div className="w-2 h-2 rounded-sm" style={{ background: item.active ? 'var(--ink)' : 'var(--ink-secondary)' }} />
                </div>
                <span className="text-[6px]" style={{ color: item.active ? 'var(--ink)' : 'var(--ink-secondary)' }}>{item.icon}</span>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Stage data                                                        */
/* ------------------------------------------------------------------ */

const stages = [
  {
    id: 'cycle' as StageId,
    sticker: <RoseHeartSticker size={44} rotate={-5} />,
    label: 'Cycle Tracking',
    labelColor: 'var(--rose)',
    bgColor: 'var(--rose-soft)',
    title: 'Track your',
    titleItalic: 'cycle',
    titleEnd: '.',
    description:
      'Cycle ring with hormone curves, fertile windows that actually make sense, daily wisdom, and 6 fertility pillars to help you understand your body on every level.',
    features: [
      'Cycle ring + phase predictions',
      'Hormone tracking (LH, Estrogen, Progesterone)',
      'Fertile window & ovulation forecasting',
      'Daily wisdom & affirmations',
      'Preconception checklist & supplements',
      'Mood, energy & symptom logging',
    ],
    screen: <CycleTrackingScreen />,
  },
  {
    id: 'pregnancy' as StageId,
    sticker: <LavenderMoonSticker size={44} rotate={6} />,
    label: 'Pregnancy',
    labelColor: 'var(--lavender)',
    bgColor: 'var(--lavender-soft)',
    title: 'Expecting',
    titleItalic: 'for two',
    titleEnd: '.',
    description:
      "40-week journey ring, baby size in real fruit (and feelings), trimester-aware content, daily affirmations, and a birth plan that actually fits in your bag.",
    features: [
      '40-week journey ring with fruit size',
      'Baby growth tracking (length + weight)',
      'Trimester-aware daily content',
      'Daily affirmations & kick counter',
      'Birth plan & hospital bag checklist',
      'Appointment tracker & contraction timer',
    ],
    screen: <PregnancyScreen />,
  },
  {
    id: 'kids' as StageId,
    sticker: <CloudSticker size={44} rotate={-3} />,
    label: 'Kids 0-5y',
    labelColor: 'var(--blue-powder)',
    bgColor: 'var(--blue-powder-soft)',
    title: 'Raising',
    titleItalic: 'little ones',
    titleEnd: '.',
    description:
      'Multi-child support, sleep, mood, calories, activities, vaccines, milestones - all tracked with one tap. From newborn to 5 years old.',
    features: [
      'Multi-child profiles with age tracking',
      'Sleep, mood, calories & activity logging',
      'Vaccine schedule with overdue alerts',
      'Growth milestones & developmental leaps',
      'Set daily goals & customize targets',
      'Nanny notes & care circle sharing',
    ],
    screen: <KidsScreen />,
  },
]

/* ------------------------------------------------------------------ */
/*  Main section                                                      */
/* ------------------------------------------------------------------ */

export function ThreeStagesSection() {
  const [activeStage, setActiveStage] = useState<StageId | null>(null)

  return (
    <section
      id="stages"
      className="py-20 lg:py-32 px-6 lg:px-12"
      style={{ background: 'var(--bg)' }}
      aria-label="The Three Stages"
    >
      <div className="max-w-[1280px] mx-auto">
        {/* Header */}
        <ScrollReveal>
          <div className="text-center mb-12 lg:mb-16">
            <p className="eyebrow">THE THREE STAGES</p>
            <h2
              className="text-[36px] lg:text-[56px] font-semibold tracking-[-0.015em] leading-[1.05] text-balance mb-6"
              style={{ fontFamily: 'var(--font-fraunces), var(--font-display)' }}
            >
              One companion. Three versions of{' '}
              <em
                className="not-italic"
                style={{
                  fontFamily: 'var(--font-instrument-serif), var(--font-italic)',
                  fontStyle: 'italic',
                  fontWeight: 400,
                }}
              >
                you
              </em>
              .
            </h2>
            <p
              className="text-[17px] lg:text-[19px] leading-[1.6] max-w-[640px] mx-auto"
              style={{ color: 'var(--ink-secondary)' }}
            >
              {"Grandma's entire app reshapes itself to where you are in your journey. Same wisdom, different chapter."}
            </p>
          </div>
        </ScrollReveal>

        {/* Cards */}
        <StaggerContainer className="grid md:grid-cols-3 gap-6" staggerDelay={0.15}>
          {stages.map((stage) => {
            const isExpanded = activeStage === stage.id
            return (
              <StaggerItem key={stage.id}>
                <motion.div
                  layout
                  className="rounded-[28px] border overflow-hidden cursor-pointer"
                  style={{
                    background: stage.bgColor,
                    borderColor: 'var(--border)',
                    boxShadow: isExpanded
                      ? '0 24px 48px rgba(0,0,0,0.1)'
                      : 'var(--shadow-card)',
                  }}
                  onClick={() => setActiveStage(isExpanded ? null : stage.id)}
                  whileHover={{ y: -4, boxShadow: '0 12px 24px rgba(0,0,0,0.08)' }}
                  transition={{ duration: 0.35, ease: [0.25, 0.4, 0.25, 1] }}
                >
                  {/* Card header */}
                  <div className="p-6 lg:p-8">
                    <div className="mb-3">{stage.sticker}</div>

                    <div
                      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-semibold uppercase tracking-[0.08em] mb-4"
                      style={{
                        background: 'var(--surface)',
                        border: '1px solid var(--border)',
                        color: stage.labelColor,
                      }}
                    >
                      <span className="w-2 h-2 rounded-full" style={{ background: stage.labelColor }} />
                      {stage.label}
                    </div>

                    <h3
                      className="text-[22px] lg:text-[26px] font-semibold tracking-[-0.01em] leading-[1.15] mb-3"
                      style={{ fontFamily: 'var(--font-fraunces), var(--font-display)' }}
                    >
                      {stage.title}{' '}
                      <em
                        className="not-italic"
                        style={{
                          fontFamily: 'var(--font-instrument-serif), var(--font-italic)',
                          fontStyle: 'italic',
                          fontWeight: 400,
                        }}
                      >
                        {stage.titleItalic}
                      </em>
                      {stage.titleEnd}
                    </h3>

                    <p className="text-[14px] leading-[1.6]" style={{ color: 'var(--ink-secondary)' }}>
                      {stage.description}
                    </p>

                    {/* Expand indicator */}
                    <div className="flex items-center gap-2 mt-4">
                      <motion.div
                        animate={{ rotate: isExpanded ? 45 : 0 }}
                        transition={{ duration: 0.2 }}
                        className="w-6 h-6 rounded-full border flex items-center justify-center"
                        style={{ borderColor: stage.labelColor }}
                      >
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                          <path d="M6 2.5V9.5M2.5 6H9.5" stroke={`var(--ink)`} strokeWidth="1.5" strokeLinecap="round" />
                        </svg>
                      </motion.div>
                      <span className="text-[12px] font-medium" style={{ color: 'var(--ink-secondary)' }}>
                        {isExpanded ? 'Close preview' : 'See the app in action'}
                      </span>
                    </div>
                  </div>

                  {/* Expanded: Phone preview + features */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.4, ease: [0.25, 0.4, 0.25, 1] }}
                        className="overflow-hidden"
                      >
                        <div className="px-6 lg:px-8 pb-6 lg:pb-8">
                          {/* Divider */}
                          <div className="h-px w-full mb-6" style={{ background: 'var(--border)' }} />

                          {/* Phone mockup */}
                          <div className="flex justify-center mb-6">
                            <PhoneMockup className="w-[220px]">
                              {stage.screen}
                            </PhoneMockup>
                          </div>

                          {/* Features list */}
                          <ul className="flex flex-col gap-2">
                            {stage.features.map((feature, i) => (
                              <motion.li
                                key={i}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.1 + i * 0.05 }}
                                className="flex items-start gap-2"
                              >
                                <span
                                  className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0"
                                  style={{ background: stage.labelColor }}
                                />
                                <span className="text-[13px]" style={{ color: 'var(--ink-secondary)' }}>
                                  {feature}
                                </span>
                              </motion.li>
                            ))}
                          </ul>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              </StaggerItem>
            )
          })}
        </StaggerContainer>

        {/* Bottom tagline */}
        <ScrollReveal delay={0.3}>
          <p
            className="text-center text-[20px] lg:text-[24px] max-w-[720px] mx-auto pt-12 lg:pt-16"
            style={{
              fontFamily: 'var(--font-instrument-serif), var(--font-italic)',
              fontStyle: 'italic',
              color: 'var(--ink-secondary)',
            }}
          >
            You switch stages with one tap. Grandma remembers where you&apos;ve been.
          </p>
        </ScrollReveal>
      </div>
    </section>
  )
}
