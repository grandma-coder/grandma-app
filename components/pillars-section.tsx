'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ScrollReveal, StaggerContainer, StaggerItem } from './scroll-animations'
import {
  RoseHeartSticker,
  WeekRingSticker,
  MoonSticker,
  LeafSticker,
  CrossSticker,
  SparkleSticker,
  SunSticker,
  TwoHeartsSticker,
  PageSticker,
} from './stickers'

type StageTab = 'cycle' | 'pregnancy' | 'kids'

interface PillarItem {
  icon: React.ReactNode
  stickerBg: string
  title: string
  description: string
}

interface StageConfig {
  id: StageTab
  label: string
  color: string
  dotColor: string
  tagline: string
  pillars: PillarItem[]
}

function PillarCard({ icon, stickerBg, title, description }: PillarItem) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.35, ease: [0.25, 0.4, 0.25, 1] }}
      className="p-6 rounded-[24px] border flex flex-col transition-all duration-[280ms] hover:translate-y-[-3px]"
      style={{
        background: 'var(--surface)',
        borderColor: 'var(--border)',
        boxShadow: 'var(--shadow-card)',
        transitionTimingFunction: 'var(--ease-paper)',
      }}
    >
      <div
        className="w-11 h-11 rounded-[20px] flex items-center justify-center mb-4"
        style={{ background: stickerBg }}
      >
        {icon}
      </div>
      <h3
        className="text-[18px] font-semibold tracking-[-0.01em] leading-[1.2] mb-2"
        style={{ fontFamily: 'var(--font-fraunces), var(--font-display)' }}
      >
        {title}
      </h3>
      <p className="text-[14px] leading-[1.5]" style={{ color: 'var(--ink-muted)' }}>
        {description}
      </p>
    </motion.div>
  )
}

export function PillarsSection() {
  const [activeTab, setActiveTab] = useState<StageTab>('cycle')

  const stageConfigs: StageConfig[] = [
    {
      id: 'cycle',
      label: 'Cycle Tracking',
      color: 'var(--rose)',
      dotColor: 'var(--rose)',
      tagline: 'Understand your body on every level. Whether you are trying to conceive or just tracking your cycle.',
      pillars: [
        {
          icon: <RoseHeartSticker size={24} />,
          stickerBg: 'var(--rose-soft)',
          title: 'Cycle Ring & Phases',
          description: 'Visual cycle ring showing exactly where you are: menstruation, follicular, ovulation, and luteal. Know your body at a glance.',
        },
        {
          icon: <SparkleSticker size={24} />,
          stickerBg: 'var(--sticker-peach-soft)',
          title: 'Hormone Tracking',
          description: 'Track LH, Estrogen, and Progesterone curves. Understand hormone patterns and what they mean for your cycle and fertility.',
        },
        {
          icon: <SunSticker size={24} />,
          stickerBg: 'var(--sticker-yellow-soft)',
          title: 'Fertile Window',
          description: 'Accurate ovulation predictions with a visual calendar. See your fertile days highlighted with confidence scores.',
        },
        {
          icon: <PageSticker size={24} />,
          stickerBg: 'var(--sticker-blue-soft)',
          title: 'Preconception Checklist',
          description: 'Step-by-step preparation guide: folic acid, screenings, lifestyle changes. Everything checked off before you even start trying.',
        },
        {
          icon: <TwoHeartsSticker size={24} />,
          stickerBg: 'var(--sticker-lilac-soft)',
          title: 'Daily Wisdom',
          description: 'Phase-specific tips from Grandma. What to eat during luteal, when to exercise during follicular, and rest advice during menstruation.',
        },
        {
          icon: <LeafSticker size={24} />,
          stickerBg: 'var(--sticker-green-soft)',
          title: 'Supplements & Nutrition',
          description: 'Track prenatal vitamins, supplements, and nutrition. Personalized reminders tied to your cycle phase.',
        },
        {
          icon: <MoonSticker size={24} />,
          stickerBg: 'var(--blue-powder-soft)',
          title: 'Mood & Symptom Logging',
          description: 'Log mood, energy, cramps, spotting, and 40+ symptoms. Patterns emerge over time so you can predict how you will feel.',
        },
        {
          icon: <CrossSticker size={24} />,
          stickerBg: 'var(--sticker-pink-soft)',
          title: 'Period Predictions',
          description: 'Accurate period start date predictions that improve with every cycle logged. Never be caught off guard.',
        },
      ],
    },
    {
      id: 'pregnancy',
      label: 'Pregnancy',
      color: 'var(--lavender)',
      dotColor: 'var(--lavender)',
      tagline: 'Every week, every feeling, every craving. From the first positive test to the delivery room.',
      pillars: [
        {
          icon: <WeekRingSticker size={24} />,
          stickerBg: 'var(--lavender-soft)',
          title: '40-Week Journey Ring',
          description: 'Visual progress ring with trimester awareness. Baby size compared to real fruit, weight, and length updated weekly.',
        },
        {
          icon: <SparkleSticker size={24} />,
          stickerBg: 'var(--sticker-peach-soft)',
          title: 'Baby Growth Tracking',
          description: 'Track length, weight, and development milestones week by week. Visual progress bars and cute fruit comparisons.',
        },
        {
          icon: <SunSticker size={24} />,
          stickerBg: 'var(--sticker-yellow-soft)',
          title: 'Daily Affirmations',
          description: 'Trimester-aware affirmations that actually resonate. Save your favorites. New one every morning, written by parents.',
        },
        {
          icon: <RoseHeartSticker size={24} />,
          stickerBg: 'var(--rose-soft)',
          title: 'Kick Counter',
          description: 'Simple one-tap kick tracking with time stamps. Set daily targets and get gentle reminders when movement slows.',
        },
        {
          icon: <CrossSticker size={24} />,
          stickerBg: 'var(--sticker-pink-soft)',
          title: 'Contraction Timer',
          description: 'One-tap start/stop timer that tracks duration and intervals. Knows when to tell you it might be time to go.',
        },
        {
          icon: <PageSticker size={24} />,
          stickerBg: 'var(--sticker-blue-soft)',
          title: 'Birth Plan Builder',
          description: 'Interactive birth plan that your partner and doula can access. Covers pain management, positions, and postpartum wishes.',
        },
        {
          icon: <TwoHeartsSticker size={24} />,
          stickerBg: 'var(--sticker-lilac-soft)',
          title: 'Appointments & Reminders',
          description: 'Never miss an OB visit, glucose test, or ultrasound. Syncs with your calendar and sends gentle reminders.',
        },
        {
          icon: <LeafSticker size={24} />,
          stickerBg: 'var(--sticker-green-soft)',
          title: 'Hospital Bag Checklist',
          description: 'The most comprehensive, parent-tested packing list. Organized by for-you, for-baby, for-partner. Check items off as you pack.',
        },
        {
          icon: <MoonSticker size={24} />,
          stickerBg: 'var(--blue-powder-soft)',
          title: 'Trimester Guides',
          description: 'Detailed weekly content about what is happening with your body and baby. Written by OBs and reviewed by parents.',
        },
        {
          icon: <SunSticker size={24} />,
          stickerBg: 'var(--sticker-yellow-soft)',
          title: 'Mood & Wellbeing',
          description: 'Track emotional health through pregnancy. Identify patterns, flag concerns, and share with your provider if needed.',
        },
      ],
    },
    {
      id: 'kids',
      label: 'Kids 0-5y',
      color: 'var(--blue-powder)',
      dotColor: 'var(--blue-powder)',
      tagline: 'From the first diaper change to the first day of school. Every milestone, every sleepless night, every first word.',
      pillars: [
        {
          icon: <MoonSticker size={24} />,
          stickerBg: 'var(--blue-powder-soft)',
          title: 'Sleep Tracking',
          description: 'Log naps, night wakes, and total sleep with one tap. Visual sleep circles, regression alerts, and sleep score trends.',
        },
        {
          icon: <SunSticker size={24} />,
          stickerBg: 'var(--sticker-yellow-soft)',
          title: 'Mood & Emotions',
          description: 'Track daily mood with simple stickers. See patterns over 7, 30, or 90 days. Spot triggers before meltdowns happen.',
        },
        {
          icon: <LeafSticker size={24} />,
          stickerBg: 'var(--sticker-green-soft)',
          title: 'Calories & Feeding',
          description: 'Breast, bottle, solids, snacks. Track calories against age-appropriate targets. Photo logging for meals and allergen tracking.',
        },
        {
          icon: <SparkleSticker size={24} />,
          stickerBg: 'var(--sticker-peach-soft)',
          title: 'Activities & Routines',
          description: 'Log tummy time, walks, playdates, and learning activities. Build routines and see what makes good days good.',
        },
        {
          icon: <CrossSticker size={24} />,
          stickerBg: 'var(--sticker-pink-soft)',
          title: 'Vaccine Schedule',
          description: 'Complete vaccine tree with due dates, overdue alerts, and dose tracking. Visual schedule that is not a spreadsheet from 1998.',
        },
        {
          icon: <RoseHeartSticker size={24} />,
          stickerBg: 'var(--rose-soft)',
          title: 'Growth & Milestones',
          description: 'Track height, weight, and head circumference. Percentile charts, developmental milestones, and wonder week awareness.',
        },
        {
          icon: <WeekRingSticker size={24} />,
          stickerBg: 'var(--lavender-soft)',
          title: 'Developmental Leaps',
          description: 'Know when leaps are coming and what behaviors to expect. Understand the "why" behind the chaos with age-specific guides.',
        },
        {
          icon: <PageSticker size={24} />,
          stickerBg: 'var(--sticker-blue-soft)',
          title: 'Medical Vault',
          description: 'Store vaccine records, doctor notes, test results, and prescriptions. One secure place, shared with your care circle.',
        },
        {
          icon: <TwoHeartsSticker size={24} />,
          stickerBg: 'var(--sticker-lilac-soft)',
          title: 'Care Circle & Nanny Notes',
          description: 'Share access with nannies, grandparents, and partners. Permission-based viewing so everyone is on the same page.',
        },
        {
          icon: <SunSticker size={24} />,
          stickerBg: 'var(--sticker-yellow-soft)',
          title: 'Daily Goals & Targets',
          description: 'Set custom targets for sleep, calories, activities, and more. Visual progress rings that fill up throughout the day.',
        },
      ],
    },
  ]

  const activeConfig = stageConfigs.find((s) => s.id === activeTab)!

  return (
    <section
      id="features"
      className="py-20 lg:py-32 px-6 lg:px-12"
      style={{ background: 'var(--bg)' }}
      aria-label="Features by Stage"
    >
      <div className="max-w-[1280px] mx-auto">
        {/* Header */}
        <ScrollReveal>
          <div className="text-center mb-10 lg:mb-14">
            <p className="eyebrow">End-to-End for Everything</p>
            <h2
              className="text-[36px] lg:text-[56px] font-semibold tracking-[-0.015em] leading-[1.05] text-balance mb-6"
              style={{ fontFamily: 'var(--font-fraunces), var(--font-display)' }}
            >
              Everything you need to{' '}
              <em
                className="not-italic"
                style={{
                  fontFamily: 'var(--font-instrument-serif), var(--font-italic)',
                  fontStyle: 'italic',
                  fontWeight: 400,
                }}
              >
                track
              </em>
              .
            </h2>
            <p
              className="text-[17px] lg:text-[19px] leading-[1.6] max-w-[680px] mx-auto"
              style={{ color: 'var(--ink-secondary)' }}
            >
              Every pillar is built on real medical guidance, real lived experience, and real bedtime fatigue. Pick your stage.
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
              {stageConfigs.map((stage) => {
                const isActive = activeTab === stage.id
                return (
                  <button
                    key={stage.id}
                    onClick={() => setActiveTab(stage.id)}
                    className="relative px-5 py-2.5 rounded-full text-[14px] font-medium transition-all duration-200"
                    style={{
                      color: isActive ? 'var(--ink)' : 'var(--ink-secondary)',
                      background: isActive ? 'var(--surface-raised)' : 'transparent',
                      boxShadow: isActive ? 'var(--shadow-card)' : 'none',
                    }}
                  >
                    <span className="flex items-center gap-2">
                      <span
                        className="w-2 h-2 rounded-full transition-all duration-200"
                        style={{
                          background: stage.dotColor,
                          opacity: isActive ? 1 : 0.4,
                        }}
                      />
                      {stage.label}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        </ScrollReveal>

        {/* Stage tagline */}
        <AnimatePresence mode="wait">
          <motion.p
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.25 }}
            className="text-center text-[16px] lg:text-[18px] leading-[1.6] max-w-[600px] mx-auto mb-10"
            style={{
              fontFamily: 'var(--font-instrument-serif), var(--font-italic)',
              fontStyle: 'italic',
              color: 'var(--ink-secondary)',
            }}
          >
            {activeConfig.tagline}
          </motion.p>
        </AnimatePresence>

        {/* Pillar cards grid */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
          >
            {activeConfig.pillars.map((pillar, i) => (
              <motion.div
                key={pillar.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05, duration: 0.35 }}
              >
                <PillarCard {...pillar} />
              </motion.div>
            ))}
          </motion.div>
        </AnimatePresence>

        {/* Count badge */}
        <ScrollReveal delay={0.2}>
          <div className="flex justify-center mt-10">
            <div
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border"
              style={{
                borderColor: 'var(--border)',
                background: 'var(--surface)',
              }}
            >
              <span
                className="text-[20px] font-bold"
                style={{ fontFamily: 'var(--font-fraunces)', color: activeConfig.color }}
              >
                {activeConfig.pillars.length}
              </span>
              <span className="text-[14px]" style={{ color: 'var(--ink-secondary)' }}>
                pillars for {activeConfig.label}
              </span>
            </div>
          </div>
        </ScrollReveal>
      </div>
    </section>
  )
}
