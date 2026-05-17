'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ScrollReveal } from './scroll-animations'
import { PhoneMockup } from './phone-mockup'
import {
  RoseHeartSticker,
  FlowerSticker,
  SparkleSticker,
  SunSticker,
  MoonSticker,
  LeafSticker,
} from './stickers'

type ConnectionTab = 'garage' | 'channels' | 'caregivers'

/* ------------------------------------------------------------------ */
/*  Garage screen preview                                             */
/* ------------------------------------------------------------------ */

function GarageScreen() {
  return (
    <div className="flex flex-col h-full" style={{ background: 'var(--bg)' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-8 pb-2">
        <div className="w-6 h-6 rounded-full border flex items-center justify-center" style={{ borderColor: 'var(--border)' }}>
          <svg width="6" height="10" viewBox="0 0 6 10" fill="none"><path d="M5 1L1 5L5 9" stroke="var(--ink)" strokeWidth="1.5" strokeLinecap="round"/></svg>
        </div>
        <span className="text-[11px] font-semibold">Connections</span>
        <div className="w-6 h-6 relative">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M8 2v2M8 12v2M2 8h2M12 8h2" stroke="var(--ink)" strokeWidth="1.5" strokeLinecap="round"/></svg>
          <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full text-[5px] font-bold text-white flex items-center justify-center" style={{ background: 'var(--rose)' }}>9</span>
        </div>
      </div>

      {/* Toggle */}
      <div className="flex mx-4 mb-3 rounded-full border overflow-hidden" style={{ borderColor: 'var(--border)' }}>
        <div className="flex-1 py-1.5 text-center text-[8px] font-semibold text-white" style={{ background: 'var(--ink)' }}>Garage</div>
        <div className="flex-1 py-1.5 text-center text-[8px]" style={{ color: 'var(--ink-secondary)' }}>Channels</div>
      </div>

      {/* Garage header */}
      <div className="px-4 mb-2">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-[16px] font-bold" style={{ fontFamily: 'var(--font-fraunces)' }}>Garage.</h3>
            <p className="text-[8px]" style={{ color: 'var(--ink-secondary)' }}>Gift, trade, and pass on baby things.</p>
          </div>
          <div className="flex gap-2">
            <div className="w-6 h-6 rounded-full border flex items-center justify-center" style={{ borderColor: 'var(--border)' }}>
              <svg width="10" height="10" viewBox="0 0 12 12" fill="none"><circle cx="5" cy="5" r="3.5" stroke="var(--ink)" strokeWidth="1"/><path d="M8 8L10.5 10.5" stroke="var(--ink)" strokeWidth="1" strokeLinecap="round"/></svg>
            </div>
            <div className="w-6 h-6 rounded-full border flex items-center justify-center" style={{ borderColor: 'var(--border)' }}>
              <svg width="10" height="10" viewBox="0 0 12 12" fill="none"><path d="M6 3v6M3 6h6" stroke="var(--ink)" strokeWidth="1.5" strokeLinecap="round"/></svg>
            </div>
          </div>
        </div>
      </div>

      {/* Categories */}
      <div className="flex gap-1.5 px-4 mb-3 overflow-x-auto">
        {['For You', 'Clothing', 'Gear', 'Toys', 'Furniture'].map((cat, i) => (
          <div
            key={cat}
            className="px-2.5 py-1 rounded-full text-[7px] font-medium whitespace-nowrap"
            style={{
              background: i === 0 ? 'var(--ink)' : 'transparent',
              color: i === 0 ? 'white' : 'var(--ink-secondary)',
              border: `1px solid ${i === 0 ? 'var(--ink)' : 'var(--border)'}`,
            }}
          >
            {cat}
          </div>
        ))}
      </div>

      {/* Item card */}
      <div className="mx-4 rounded-[12px] border overflow-hidden flex-1" style={{ borderColor: 'var(--sticker-yellow)', background: 'var(--surface)' }}>
        <div className="flex items-center gap-2 p-2.5">
          <div className="w-6 h-6 rounded-full border flex items-center justify-center" style={{ borderColor: 'var(--border)' }}>
            <svg width="8" height="8" viewBox="0 0 10 10" fill="none"><circle cx="5" cy="4" r="2" stroke="var(--ink)" strokeWidth="0.8"/><path d="M1 9C1 7 3 5.5 5 5.5C7 5.5 9 7 9 9" stroke="var(--ink)" strokeWidth="0.8"/></svg>
          </div>
          <div>
            <p className="text-[9px] font-semibold">Sarah M.</p>
            <p className="text-[7px]" style={{ color: 'var(--ink-secondary)' }}>Toys</p>
          </div>
          <div className="ml-auto">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><circle cx="3" cy="6" r="0.8" fill="var(--ink)"/><circle cx="6" cy="6" r="0.8" fill="var(--ink)"/><circle cx="9" cy="6" r="0.8" fill="var(--ink)"/></svg>
          </div>
        </div>
        <div className="aspect-square flex items-center justify-center" style={{ background: 'var(--surface-raised)' }}>
          <div className="text-center">
            <SunSticker size={40} rotate={-5} />
            <p className="text-[9px] mt-2 font-medium">Wooden Puzzle Set</p>
            <p className="text-[7px]" style={{ color: 'var(--ink-secondary)' }}>Free - pickup only</p>
          </div>
        </div>
        <div className="flex items-center gap-3 p-2.5">
          <div className="flex items-center gap-1">
            <svg width="10" height="10" viewBox="0 0 12 12" fill="none"><path d="M6 3C5 2 3.5 2.5 3.5 4C3.5 5.5 6 7.5 6 7.5C6 7.5 8.5 5.5 8.5 4C8.5 2.5 7 2 6 3Z" fill="var(--rose)"/></svg>
            <span className="text-[7px]">3 likes</span>
          </div>
          <div className="flex items-center gap-1">
            <svg width="10" height="10" viewBox="0 0 12 12" fill="none"><path d="M2 3h8v5a1 1 0 01-1 1H3a1 1 0 01-1-1V3z" stroke="var(--ink)" strokeWidth="0.8"/><path d="M2 3L6 6L10 3" stroke="var(--ink)" strokeWidth="0.8"/></svg>
            <span className="text-[7px]">1 comment</span>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Channels screen preview                                           */
/* ------------------------------------------------------------------ */

function ChannelsScreen() {
  const channels = [
    { name: 'Speech & Language', members: 203, icon: <RoseHeartSticker size={14} />, joined: false },
    { name: 'Grandparent Boundaries', members: 346, icon: <MoonSticker size={14} />, joined: true },
    { name: 'Work-Life Balance', members: 345, icon: <SunSticker size={14} />, joined: false },
    { name: 'Childhood Illness', members: 312, icon: <MoonSticker size={14} />, joined: false },
    { name: 'Meal Prep Sunday', members: 289, icon: <LeafSticker size={14} />, joined: false },
  ]

  return (
    <div className="flex flex-col h-full" style={{ background: 'var(--bg)' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-8 pb-2">
        <div className="w-6 h-6 rounded-full border flex items-center justify-center" style={{ borderColor: 'var(--border)' }}>
          <svg width="6" height="10" viewBox="0 0 6 10" fill="none"><path d="M5 1L1 5L5 9" stroke="var(--ink)" strokeWidth="1.5" strokeLinecap="round"/></svg>
        </div>
        <span className="text-[11px] font-semibold">Connections</span>
        <div className="w-6 h-6" />
      </div>

      {/* Toggle */}
      <div className="flex mx-4 mb-3 rounded-full border overflow-hidden" style={{ borderColor: 'var(--border)' }}>
        <div className="flex-1 py-1.5 text-center text-[8px]" style={{ color: 'var(--ink-secondary)' }}>Garage</div>
        <div className="flex-1 py-1.5 text-center text-[8px] font-semibold text-white" style={{ background: 'var(--ink)' }}>Channels</div>
      </div>

      {/* Title */}
      <div className="px-4 mb-3">
        <h3 className="text-[14px] font-bold" style={{ fontFamily: 'var(--font-fraunces)' }}>Find your community</h3>
      </div>

      {/* Featured channel */}
      <div className="mx-4 mb-3 rounded-[12px] p-3" style={{ background: 'var(--rose-soft)' }}>
        <div className="flex items-center gap-2">
          <RoseHeartSticker size={20} />
          <div className="flex-1">
            <p className="text-[10px] font-semibold">Speech & Language</p>
            <p className="text-[7px]" style={{ color: 'var(--ink-secondary)' }}>First words, speech delays, therapy recs...</p>
            <p className="text-[7px]" style={{ color: 'var(--ink-secondary)' }}>203 members</p>
          </div>
          <div className="px-2.5 py-1 rounded-full border text-[7px] font-medium" style={{ borderColor: 'var(--ink)' }}>
            Join
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="mx-4 mb-3 flex items-center gap-2 px-3 py-2 rounded-full border" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
        <svg width="10" height="10" viewBox="0 0 12 12" fill="none"><circle cx="5" cy="5" r="3.5" stroke="var(--ink-secondary)" strokeWidth="1"/><path d="M8 8L10.5 10.5" stroke="var(--ink-secondary)" strokeWidth="1" strokeLinecap="round"/></svg>
        <span className="text-[8px]" style={{ color: 'var(--ink-secondary)' }}>Search channels...</span>
      </div>

      {/* Trending */}
      <div className="px-4">
        <div className="flex items-center gap-1 mb-2">
          <svg width="10" height="10" viewBox="0 0 12 12" fill="none"><path d="M2 9L5 4L7 7L10 2" stroke="var(--rose)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          <span className="text-[8px] uppercase tracking-[0.06em] font-semibold">Trending</span>
        </div>
        <div className="flex flex-col gap-2">
          {channels.map((ch) => (
            <div key={ch.name} className="flex items-center gap-2 p-2 rounded-[10px] border" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
              <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: 'var(--surface-raised)' }}>
                {ch.icon}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[9px] font-semibold truncate">{ch.name}</p>
                <p className="text-[7px]" style={{ color: 'var(--ink-secondary)' }}>{ch.members} members</p>
              </div>
              {ch.joined ? (
                <span className="px-2 py-0.5 rounded text-[6px] font-semibold" style={{ background: 'var(--sticker-green)', color: 'white' }}>Joined</span>
              ) : (
                <div className="flex items-center gap-1">
                  <svg width="10" height="10" viewBox="0 0 12 12" fill="none"><circle cx="4" cy="4" r="2" stroke="var(--ink-secondary)" strokeWidth="0.8"/><circle cx="8" cy="4" r="2" stroke="var(--ink-secondary)" strokeWidth="0.8"/></svg>
                  <span className="text-[7px]" style={{ color: 'var(--ink-secondary)' }}>{ch.members}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Caregivers screen preview                                         */
/* ------------------------------------------------------------------ */

function CaregiversScreen() {
  const professionals = [
    { name: 'Maria Santos', role: 'Certified Doula', rating: 4.9, reviews: 47, available: true, color: 'var(--lavender-soft)' },
    { name: 'Dr. Lisa Chen', role: 'Pediatrician', rating: 4.8, reviews: 123, available: true, color: 'var(--blue-powder-soft)' },
    { name: 'Ana Kowalski', role: 'Lactation Consultant', rating: 5.0, reviews: 31, available: false, color: 'var(--rose-soft)' },
    { name: 'James Obi', role: 'Night Nanny', rating: 4.7, reviews: 19, available: true, color: 'var(--sticker-yellow-soft)' },
  ]

  return (
    <div className="flex flex-col h-full" style={{ background: 'var(--bg)' }}>
      {/* Header */}
      <div className="px-4 pt-8 pb-2">
        <p className="text-[8px] uppercase tracking-[0.06em] font-semibold mb-1" style={{ color: 'var(--ink-secondary)' }}>Connections</p>
        <h3 className="text-[16px] font-bold" style={{ fontFamily: 'var(--font-fraunces)' }}>
          Find your{' '}
          <em style={{ fontFamily: 'var(--font-instrument-serif)', fontStyle: 'italic', fontWeight: 400 }}>people</em>.
        </h3>
        <p className="text-[8px] mt-1" style={{ color: 'var(--ink-secondary)' }}>
          Doulas, midwives, nannies, and more near you.
        </p>
      </div>

      {/* Filter tags */}
      <div className="flex gap-1.5 px-4 py-2 overflow-x-auto">
        {['All', 'Doulas', 'Midwives', 'Nannies', 'Pediatricians'].map((tag, i) => (
          <div
            key={tag}
            className="px-2.5 py-1 rounded-full text-[7px] font-medium whitespace-nowrap"
            style={{
              background: i === 0 ? 'var(--ink)' : 'transparent',
              color: i === 0 ? 'white' : 'var(--ink-secondary)',
              border: `1px solid ${i === 0 ? 'var(--ink)' : 'var(--border)'}`,
            }}
          >
            {tag}
          </div>
        ))}
      </div>

      {/* Professional cards */}
      <div className="flex flex-col gap-2 px-4 pt-2 flex-1">
        {professionals.map((pro) => (
          <div key={pro.name} className="flex items-center gap-2.5 p-2.5 rounded-[12px] border" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
            <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: pro.color }}>
              <span className="text-[11px] font-semibold" style={{ fontFamily: 'var(--font-fraunces)' }}>
                {pro.name.split(' ').map(n => n[0]).join('')}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[9px] font-semibold">{pro.name}</p>
              <p className="text-[7px]" style={{ color: 'var(--ink-secondary)' }}>{pro.role}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <div className="flex items-center gap-0.5">
                  <svg width="7" height="7" viewBox="0 0 10 10" fill="none"><path d="M5 1L6.2 3.7L9 4L6.8 6L7.5 9L5 7.5L2.5 9L3.2 6L1 4L3.8 3.7Z" fill="var(--sticker-yellow)" stroke="var(--ink)" strokeWidth="0.5"/></svg>
                  <span className="text-[7px] font-medium">{pro.rating}</span>
                </div>
                <span className="text-[6px]" style={{ color: 'var(--ink-secondary)' }}>({pro.reviews} reviews)</span>
              </div>
            </div>
            {pro.available ? (
              <span className="px-2 py-0.5 rounded-full text-[6px] font-semibold" style={{ background: 'var(--sticker-green)', color: 'white', opacity: 0.8 }}>Available</span>
            ) : (
              <span className="px-2 py-0.5 rounded-full text-[6px] font-semibold" style={{ background: 'var(--surface-raised)', color: 'var(--ink-secondary)' }}>Waitlist</span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Tab config                                                        */
/* ------------------------------------------------------------------ */

const connectionTabs: { id: ConnectionTab; label: string; tagline: string; description: string; screen: React.ReactNode }[] = [
  {
    id: 'garage',
    label: 'Garage',
    tagline: 'Gift, trade, and pass on baby things.',
    description: 'A marketplace built for parents. List outgrown gear, find deals on quality items, or give things away to families who need them. No fees, no strangers \u2014 just your community.',
    screen: <GarageScreen />,
  },
  {
    id: 'channels',
    label: 'Channels',
    tagline: 'Find your community.',
    description: 'Topic-based channels where parents connect over real experiences. From speech delays to grandparent boundaries, from meal prep to work-life balance. Join what matters to you.',
    screen: <ChannelsScreen />,
  },
  {
    id: 'caregivers',
    label: 'Caregivers',
    tagline: 'Find your people.',
    description: 'A central place to find doulas, midwives, lactation consultants, pediatricians, and nannies in your area. Read real reviews from other Grandma families. Book with confidence.',
    screen: <CaregiversScreen />,
  },
]

/* ------------------------------------------------------------------ */
/*  Main section                                                      */
/* ------------------------------------------------------------------ */

export function ConnectionsSection() {
  const [activeTab, setActiveTab] = useState<ConnectionTab>('garage')
  const activeConfig = connectionTabs.find((t) => t.id === activeTab)!

  return (
    <section
      id="connections"
      className="py-20 lg:py-32 px-6 lg:px-12"
      style={{ background: 'var(--surface-raised)' }}
      aria-label="Connections"
    >
      <div className="max-w-[1280px] mx-auto">
        {/* Header */}
        <ScrollReveal>
          <div className="text-center mb-12">
            <p className="eyebrow">Connect & Share</p>
            <h2
              className="text-[36px] lg:text-[56px] font-semibold tracking-[-0.015em] leading-[1.05] text-balance mb-6"
              style={{ fontFamily: 'var(--font-fraunces), var(--font-display)' }}
            >
              Your village,{' '}
              <em
                className="not-italic"
                style={{
                  fontFamily: 'var(--font-instrument-serif), var(--font-italic)',
                  fontStyle: 'italic',
                  fontWeight: 400,
                }}
              >
                built in
              </em>
              .
            </h2>
            <p
              className="text-[17px] lg:text-[19px] leading-[1.6] max-w-[640px] mx-auto"
              style={{ color: 'var(--ink-secondary)' }}
            >
              Trade baby gear, join parent communities, and find caregivers you can trust. All in one place.
            </p>
          </div>
        </ScrollReveal>

        {/* Tab bar */}
        <ScrollReveal delay={0.1}>
          <div className="flex justify-center mb-10">
            <div
              className="inline-flex rounded-full p-1 border"
              style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
            >
              {connectionTabs.map((tab) => {
                const isActive = activeTab === tab.id
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className="px-5 py-2.5 rounded-full text-[14px] font-medium transition-all duration-200"
                    style={{
                      color: isActive ? 'var(--ink)' : 'var(--ink-secondary)',
                      background: isActive ? 'var(--bg)' : 'transparent',
                      boxShadow: isActive ? 'var(--shadow-card)' : 'none',
                    }}
                  >
                    {tab.label}
                  </button>
                )
              })}
            </div>
          </div>
        </ScrollReveal>

        {/* Content area */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.35 }}
            className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center"
          >
            {/* Left: Phone mockup */}
            <div className="flex justify-center lg:justify-start order-2 lg:order-1">
              <PhoneMockup className="w-[260px]">
                {activeConfig.screen}
              </PhoneMockup>
            </div>

            {/* Right: Description */}
            <div className="order-1 lg:order-2">
              <p
                className="text-[24px] lg:text-[32px] font-semibold tracking-[-0.01em] leading-[1.15] mb-4"
                style={{ fontFamily: 'var(--font-fraunces), var(--font-display)' }}
              >
                {activeConfig.tagline}
              </p>
              <p
                className="text-[17px] leading-[1.65] mb-6"
                style={{ color: 'var(--ink-secondary)' }}
              >
                {activeConfig.description}
              </p>

              {/* Highlights per tab */}
              {activeTab === 'garage' && (
                <ul className="flex flex-col gap-3">
                  {['Browse by category: Clothing, Gear, Toys, Furniture', 'Like, comment, and message sellers directly', 'Free listings \u2014 donate to families in need', 'Photo posts with social feed experience'].map((item, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <span className="w-1.5 h-1.5 rounded-full mt-2 flex-shrink-0" style={{ background: 'var(--sticker-yellow)' }} />
                      <span className="text-[15px]" style={{ color: 'var(--ink-secondary)' }}>{item}</span>
                    </li>
                  ))}
                </ul>
              )}
              {activeTab === 'channels' && (
                <ul className="flex flex-col gap-3">
                  {['Join topic channels that match your stage', 'Trending topics surfaced by the community', 'Suggested channels based on your kids\' ages', 'Search and discover new communities anytime'].map((item, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <span className="w-1.5 h-1.5 rounded-full mt-2 flex-shrink-0" style={{ background: 'var(--lavender)' }} />
                      <span className="text-[15px]" style={{ color: 'var(--ink-secondary)' }}>{item}</span>
                    </li>
                  ))}
                </ul>
              )}
              {activeTab === 'caregivers' && (
                <ul className="flex flex-col gap-3">
                  {['Find doulas, midwives, nannies & pediatricians', 'Real reviews from Grandma families', 'Filter by specialty, availability, and location', 'Book consultations directly from the app'].map((item, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <span className="w-1.5 h-1.5 rounded-full mt-2 flex-shrink-0" style={{ background: 'var(--rose)' }} />
                      <span className="text-[15px]" style={{ color: 'var(--ink-secondary)' }}>{item}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  )
}
