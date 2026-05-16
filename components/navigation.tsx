'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { InlineHeartSticker } from './stickers'

export function Navigation() {
  const [scrolled, setScrolled] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 80)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const navLinks = [
    { href: '#features', label: 'Features' },
    { href: '#stages', label: 'The Three Stages' },
    { href: '#grandma', label: 'Meet Grandma' },
    { href: '/pricing', label: 'Pricing' },
  ]

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-[380ms]`}
      style={{
        transitionTimingFunction: 'var(--ease-paper)',
      }}
    >
      <nav
        className={`mx-auto transition-all duration-[380ms] ${
          scrolled
            ? 'max-w-[1100px] mt-4 mx-4 lg:mx-auto px-6 py-3 rounded-full border border-[var(--border)] shadow-[var(--shadow-card)]'
            : 'w-full px-12 py-6'
        }`}
        style={{
          background: scrolled ? 'var(--bg)' : 'transparent',
          transitionTimingFunction: 'var(--ease-paper)',
        }}
      >
        <div className="flex items-center justify-between">
          {/* Wordmark */}
          <Link
            href="/"
            className={`transition-all duration-[380ms] flex items-center`}
            style={{
              fontFamily: 'var(--font-fraunces), var(--font-display)',
              fontWeight: 600,
              fontSize: scrolled ? '22px' : '28px',
              letterSpacing: '-0.02em',
              color: 'var(--ink)',
              transitionTimingFunction: 'var(--ease-paper)',
            }}
          >
            Grandma
            <InlineHeartSticker size={scrolled ? 14 : 16} fill="var(--lavender)" />
          </Link>

          {/* Desktop Nav Links */}
          <div className="hidden lg:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-[15px] font-medium transition-colors hover:opacity-70"
                style={{
                  fontFamily: 'var(--font-dm-sans), var(--font-body)',
                  color: 'var(--ink)',
                }}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Right side */}
          <div className="flex items-center gap-4">
            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden w-11 h-11 flex items-center justify-center rounded-full border"
              style={{
                background: 'var(--surface)',
                borderColor: 'var(--border)',
              }}
              aria-label="Toggle menu"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 20 20"
                fill="none"
                style={{ stroke: 'var(--ink)' }}
              >
                {mobileMenuOpen ? (
                  <path d="M5 5L15 15M15 5L5 15" strokeWidth="2" strokeLinecap="round" />
                ) : (
                  <>
                    <path d="M3 6H17" strokeWidth="2" strokeLinecap="round" />
                    <path d="M3 10H17" strokeWidth="2" strokeLinecap="round" />
                    <path d="M3 14H17" strokeWidth="2" strokeLinecap="round" />
                  </>
                )}
              </svg>
            </button>

            {/* CTA Button */}
            <Link
              href="#waitlist"
              className="btn-primary hidden sm:inline-flex"
              style={{
                padding: scrolled ? '12px 20px' : '16px 28px',
                minHeight: scrolled ? '48px' : '56px',
              }}
            >
              Join the waitlist
            </Link>
          </div>
        </div>
      </nav>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div
          className="lg:hidden absolute top-full left-4 right-4 mt-2 p-6 rounded-[28px] border shadow-[var(--shadow-card)]"
          style={{
            background: 'var(--surface)',
            borderColor: 'var(--border)',
          }}
        >
          <div className="flex flex-col gap-4">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className="text-[17px] font-medium py-2"
                style={{
                  fontFamily: 'var(--font-dm-sans), var(--font-body)',
                  color: 'var(--ink)',
                }}
              >
                {link.label}
              </Link>
            ))}
            <Link
              href="#waitlist"
              onClick={() => setMobileMenuOpen(false)}
              className="btn-primary text-center mt-2"
            >
              Join the waitlist
            </Link>
          </div>
        </div>
      )}
    </header>
  )
}

// Scroll progress indicator
export function ScrollProgress() {
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const handleScroll = () => {
      const scrollHeight = document.documentElement.scrollHeight - window.innerHeight
      const currentProgress = (window.scrollY / scrollHeight) * 100
      setProgress(currentProgress)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <div
      className="scroll-progress"
      style={{ width: `${progress}%` }}
      aria-hidden="true"
    />
  )
}
