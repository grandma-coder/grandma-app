import Link from 'next/link'
import { LilacHeartSticker } from './stickers'
import { GrandmaLogo } from './grandma-logo'

export function Footer() {
  return (
    <footer
      className="pt-16 pb-8 px-6 lg:px-12 border-t"
      style={{
        background: 'var(--bg-warm)',
        borderColor: 'var(--border)',
      }}
    >
      <div className="max-w-[1280px] mx-auto">
        {/* Main grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-12 lg:gap-8 mb-12">
          {/* Brand column */}
          <div>
            <Link
              href="/"
              className="inline-flex items-center gap-2 mb-4"
            >
              <GrandmaLogo size={36} animation="heartbeat" />
              <span
                style={{
                  fontFamily: 'var(--font-fraunces), var(--font-display)',
                  fontWeight: 600,
                  fontSize: '24px',
                  letterSpacing: '-0.02em',
                  color: 'var(--ink)',
                }}
              >
                grandma
              </span>
            </Link>
            <p
              className="text-[14px] leading-[1.5] mb-6"
              style={{ color: 'var(--ink-muted)' }}
            >
              Made with care for new and growing families.
            </p>
            {/* Social buttons */}
            <div className="flex gap-3">
              {['instagram', 'tiktok', 'x', 'linkedin'].map((social) => (
                <a
                  key={social}
                  href={`https://${social}.com`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 rounded-full border flex items-center justify-center transition-colors hover:bg-[var(--surface-raised)]"
                  style={{
                    background: 'var(--surface)',
                    borderColor: 'var(--border)',
                  }}
                  aria-label={social}
                >
                  <SocialIcon name={social} />
                </a>
              ))}
            </div>
          </div>

          {/* Product column */}
          <div>
            <p
              className="text-[11px] font-semibold uppercase tracking-[0.12em] mb-4"
              style={{ color: 'var(--ink-muted)' }}
            >
              PRODUCT
            </p>
            <nav className="flex flex-col gap-3">
              <FooterLink href="#features">Features</FooterLink>
              <FooterLink href="/pricing">Pricing</FooterLink>
              <FooterLink href="#waitlist">Waitlist</FooterLink>
              <FooterLink href="#">Roadmap</FooterLink>
            </nav>
          </div>

          {/* Stages column */}
          <div>
            <p
              className="text-[11px] font-semibold uppercase tracking-[0.12em] mb-4"
              style={{ color: 'var(--ink-muted)' }}
            >
              STAGES
            </p>
            <nav className="flex flex-col gap-3">
              <FooterLink href="#stages">Pre-Pregnancy</FooterLink>
              <FooterLink href="#stages">Pregnancy</FooterLink>
              <FooterLink href="#stages">Kids 0–5y</FooterLink>
            </nav>
          </div>

          {/* Company column */}
          <div>
            <p
              className="text-[11px] font-semibold uppercase tracking-[0.12em] mb-4"
              style={{ color: 'var(--ink-muted)' }}
            >
              COMPANY
            </p>
            <nav className="flex flex-col gap-3">
              <FooterLink href="#">About</FooterLink>
              <FooterLink href="/privacy">Privacy</FooterLink>
              <FooterLink href="/terms">Terms</FooterLink>
              <FooterLink href="#">Contact</FooterLink>
            </nav>
          </div>
        </div>

        {/* Bottom strip */}
        <div
          className="pt-8 border-t flex flex-col md:flex-row md:items-center md:justify-between gap-4"
          style={{ borderColor: 'var(--border)' }}
        >
          <p
            className="text-[13px] flex items-center gap-1"
            style={{ color: 'var(--ink-faint)' }}
          >
            <LilacHeartSticker size={14} />
            © 2026 grandma.app. Not a substitute for medical advice.
          </p>
          <p
            className="text-[13px]"
            style={{ color: 'var(--ink-faint)' }}
          >
            Made with love in Lisbon · Berlin · Tokyo
          </p>
        </div>
      </div>
    </footer>
  )
}

function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="text-[15px] transition-opacity hover:opacity-70"
      style={{ color: 'var(--ink-secondary)' }}
    >
      {children}
    </Link>
  )
}

function SocialIcon({ name }: { name: string }) {
  switch (name) {
    case 'instagram':
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <rect x="2" y="2" width="20" height="20" rx="5" stroke="var(--ink)" strokeWidth="2" />
          <circle cx="12" cy="12" r="4" stroke="var(--ink)" strokeWidth="2" />
          <circle cx="18" cy="6" r="1.5" fill="var(--ink)" />
        </svg>
      )
    case 'tiktok':
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <path
            d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5"
            stroke="var(--ink)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )
    case 'x':
      return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
          <path
            d="M4 4L10.5 12L4 20H6L12 13.5L17 20H20L13.5 12L20 4H18L12.5 10.5L8 4H4Z"
            fill="var(--ink)"
          />
        </svg>
      )
    case 'linkedin':
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <path
            d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"
            stroke="var(--ink)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <rect x="2" y="9" width="4" height="12" stroke="var(--ink)" strokeWidth="2" />
          <circle cx="4" cy="4" r="2" stroke="var(--ink)" strokeWidth="2" />
        </svg>
      )
    default:
      return null
  }
}
