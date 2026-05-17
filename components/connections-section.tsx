'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ScrollReveal } from './scroll-animations'
import {
  RoseHeartSticker,
  FlowerSticker,
  SparkleSticker,
  SunSticker,
  MoonSticker,
  LeafSticker,
  StarSticker,
  CloudSticker,
} from './stickers'

type ConnectionTab = 'garage' | 'channels' | 'caregivers'

/* ------------------------------------------------------------------ */
/*  Garage illustration - floating items                              */
/* ------------------------------------------------------------------ */

function GarageIllustration() {
  const items = [
    { icon: <SunSticker size={56} rotate={-8} />, label: 'Toys', x: '15%', y: '20%', delay: 0 },
    { icon: <CloudSticker size={48} rotate={5} />, label: 'Clothing', x: '75%', y: '15%', delay: 0.1 },
    { icon: <FlowerSticker size={52} rotate={-5} />, label: 'Gear', x: '25%', y: '60%', delay: 0.2 },
    { icon: <StarSticker size={44} rotate={12} />, label: 'Furniture', x: '70%', y: '55%', delay: 0.15 },
    { icon: <LeafSticker size={40} rotate={-10} />, label: 'Books', x: '50%', y: '35%', delay: 0.05 },
  ]

  return (
    <div className="relative w-full h-[320px] lg:h-[400px]">
      {/* Background circles */}
      <div 
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[280px] h-[280px] lg:w-[340px] lg:h-[340px] rounded-full opacity-30"
        style={{ background: 'linear-gradient(135deg, var(--sticker-yellow-soft), var(--rose-soft))' }}
      />
      <div 
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200px] h-[200px] lg:w-[240px] lg:h-[240px] rounded-full"
        style={{ background: 'var(--surface)' }}
      />
      
      {/* Center text */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center z-10">
        <p className="text-[48px] lg:text-[64px] font-bold" style={{ fontFamily: 'var(--font-fraunces)', color: 'var(--ink)' }}>
          Free
        </p>
        <p className="text-[14px] lg:text-[16px] -mt-1" style={{ color: 'var(--ink-secondary)' }}>to share</p>
      </div>

      {/* Floating items */}
      {items.map((item, i) => (
        <motion.div
          key={i}
          className="absolute flex flex-col items-center gap-1"
          style={{ left: item.x, top: item.y }}
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: item.delay, type: 'spring', stiffness: 200 }}
        >
          <motion.div
            animate={{ y: [0, -8, 0] }}
            transition={{ duration: 3 + i * 0.5, repeat: Infinity, ease: 'easeInOut' }}
          >
            {item.icon}
          </motion.div>
          <span className="text-[11px] font-medium" style={{ color: 'var(--ink-secondary)' }}>{item.label}</span>
        </motion.div>
      ))}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Channels illustration - community circles                         */
/* ------------------------------------------------------------------ */

function ChannelsIllustration() {
  const channels = [
    { name: 'Speech', color: 'var(--rose-soft)', icon: <RoseHeartSticker size={32} />, members: '203' },
    { name: 'Boundaries', color: 'var(--lavender-soft)', icon: <MoonSticker size={32} />, members: '346' },
    { name: 'Work-Life', color: 'var(--sticker-yellow-soft)', icon: <SunSticker size={32} />, members: '345' },
    { name: 'Meals', color: 'var(--sticker-green-soft)', icon: <LeafSticker size={32} />, members: '289' },
  ]

  return (
    <div className="relative w-full h-[320px] lg:h-[400px] flex items-center justify-center">
      {/* Orbiting circles */}
      <div className="relative w-[280px] h-[280px] lg:w-[340px] lg:h-[340px]">
        {/* Center */}
        <div 
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[100px] h-[100px] lg:w-[120px] lg:h-[120px] rounded-full flex items-center justify-center z-10"
          style={{ background: 'var(--surface)', boxShadow: '0 8px 32px rgba(0,0,0,0.08)' }}
        >
          <div className="text-center">
            <p className="text-[28px] lg:text-[36px] font-bold" style={{ fontFamily: 'var(--font-fraunces)', color: 'var(--ink)' }}>
              4+
            </p>
            <p className="text-[10px] lg:text-[12px] -mt-1" style={{ color: 'var(--ink-secondary)' }}>channels</p>
          </div>
        </div>

        {/* Orbiting channels */}
        {channels.map((ch, i) => {
          const angle = (i * 90) - 45 // Spread around
          const radius = 110
          const x = Math.cos((angle * Math.PI) / 180) * radius
          const y = Math.sin((angle * Math.PI) / 180) * radius

          return (
            <motion.div
              key={i}
              className="absolute top-1/2 left-1/2 flex flex-col items-center gap-1"
              style={{ 
                transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`,
              }}
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.1, type: 'spring' }}
            >
              <motion.div
                className="w-[64px] h-[64px] lg:w-[80px] lg:h-[80px] rounded-full flex items-center justify-center"
                style={{ background: ch.color, boxShadow: '0 4px 16px rgba(0,0,0,0.06)' }}
                whileHover={{ scale: 1.1 }}
              >
                {ch.icon}
              </motion.div>
              <span className="text-[10px] font-semibold" style={{ color: 'var(--ink)' }}>{ch.name}</span>
              <span className="text-[9px]" style={{ color: 'var(--ink-secondary)' }}>{ch.members}</span>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Caregivers illustration - profile cards                           */
/* ------------------------------------------------------------------ */

function CaregiversIllustration() {
  const caregivers = [
    { name: 'Maria', role: 'Doula', rating: '4.9', color: 'var(--lavender-soft)', initials: 'MS' },
    { name: 'Lisa', role: 'Pediatrician', rating: '4.8', color: 'var(--blue-powder-soft)', initials: 'LC' },
    { name: 'Ana', role: 'Lactation', rating: '5.0', color: 'var(--rose-soft)', initials: 'AK' },
  ]

  return (
    <div className="relative w-full h-[320px] lg:h-[400px] flex items-center justify-center">
      <div className="flex gap-4 lg:gap-6">
        {caregivers.map((cg, i) => (
          <motion.div
            key={i}
            className="relative"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.15, type: 'spring', stiffness: 200 }}
            style={{ 
              transform: `translateY(${i === 1 ? '-20px' : '0'})`,
            }}
          >
            <motion.div
              className="w-[100px] lg:w-[120px] rounded-[20px] p-4 lg:p-5"
              style={{ 
                background: 'var(--surface)', 
                boxShadow: '0 8px 32px rgba(0,0,0,0.08)',
              }}
              whileHover={{ y: -8, boxShadow: '0 16px 48px rgba(0,0,0,0.12)' }}
            >
              {/* Avatar */}
              <div 
                className="w-[56px] h-[56px] lg:w-[64px] lg:h-[64px] rounded-full mx-auto mb-3 flex items-center justify-center"
                style={{ background: cg.color }}
              >
                <span 
                  className="text-[18px] lg:text-[20px] font-semibold"
                  style={{ fontFamily: 'var(--font-fraunces)', color: 'var(--ink)' }}
                >
                  {cg.initials}
                </span>
              </div>

              {/* Info */}
              <p className="text-[13px] lg:text-[14px] font-semibold text-center" style={{ color: 'var(--ink)' }}>
                {cg.name}
              </p>
              <p className="text-[10px] lg:text-[11px] text-center mb-2" style={{ color: 'var(--ink-secondary)' }}>
                {cg.role}
              </p>

              {/* Rating */}
              <div className="flex items-center justify-center gap-1">
                <StarSticker size={14} />
                <span className="text-[12px] font-semibold" style={{ color: 'var(--ink)' }}>{cg.rating}</span>
              </div>
            </motion.div>

            {/* Available badge */}
            <motion.div
              className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-[9px] font-semibold"
              style={{ 
                background: 'var(--sticker-green)', 
                color: 'white',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              }}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.5 + i * 0.1, type: 'spring' }}
            >
              Available
            </motion.div>
          </motion.div>
        ))}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Tab config                                                        */
/* ------------------------------------------------------------------ */

const connectionTabs: { 
  id: ConnectionTab
  label: string
  tagline: string
  description: string
  features: string[]
  illustration: React.ReactNode 
}[] = [
  {
    id: 'garage',
    label: 'Garage',
    tagline: 'Gift, trade, and pass on.',
    description: 'A marketplace built for parents. List outgrown gear, find deals, or give things away to families who need them.',
    features: ['Free listings', 'Local community', 'No fees'],
    illustration: <GarageIllustration />,
  },
  {
    id: 'channels',
    label: 'Channels',
    tagline: 'Find your people.',
    description: 'Topic-based channels where parents connect over real experiences. From speech delays to grandparent boundaries.',
    features: ['Real conversations', 'Moderated spaces', 'Private groups'],
    illustration: <ChannelsIllustration />,
  },
  {
    id: 'caregivers',
    label: 'Caregivers',
    tagline: 'Trusted help nearby.',
    description: 'Find doulas, midwives, lactation consultants, pediatricians, and nannies. Read real reviews from Grandma families.',
    features: ['Verified reviews', 'Book directly', 'Background checks'],
    illustration: <CaregiversIllustration />,
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
            {/* Left: Illustration */}
            <div className="order-2 lg:order-1">
              {activeConfig.illustration}
            </div>

            {/* Right: Text content */}
            <div className="order-1 lg:order-2">
              <h3
                className="text-[28px] lg:text-[40px] font-semibold tracking-[-0.01em] leading-[1.1] mb-4"
                style={{ fontFamily: 'var(--font-fraunces), var(--font-display)' }}
              >
                {activeConfig.tagline}
              </h3>
              <p
                className="text-[17px] lg:text-[19px] leading-[1.6] mb-8"
                style={{ color: 'var(--ink-secondary)' }}
              >
                {activeConfig.description}
              </p>

              {/* Feature pills */}
              <div className="flex flex-wrap gap-3">
                {activeConfig.features.map((feature) => (
                  <div
                    key={feature}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-full border"
                    style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
                  >
                    <SparkleSticker size={14} />
                    <span className="text-[14px] font-medium" style={{ color: 'var(--ink)' }}>
                      {feature}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  )
}
