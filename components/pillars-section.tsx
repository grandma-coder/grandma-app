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

interface PillarCardProps {
  icon: React.ReactNode
  stickerBg: string
  title: string
  description: string
  stages: ('PRE' | 'PREG' | 'KIDS')[]
}

function PillarCard({ icon, stickerBg, title, description, stages }: PillarCardProps) {
  const stageColors = {
    PRE: 'var(--rose)',
    PREG: 'var(--lavender)',
    KIDS: 'var(--blue-powder)',
  }

  return (
    <div
      className="p-7 rounded-[28px] border shadow-[var(--shadow-card)] min-h-[220px] flex flex-col transition-all duration-[280ms] hover:translate-y-[-4px] hover:shadow-[var(--shadow-card-hover)]"
      style={{
        background: 'var(--surface)',
        borderColor: 'var(--border)',
        transitionTimingFunction: 'var(--ease-paper)',
      }}
    >
      {/* Sticker socket */}
      <div
        className="w-12 h-12 rounded-[24px] flex items-center justify-center mb-5"
        style={{ background: stickerBg }}
      >
        {icon}
      </div>

      {/* Title */}
      <h3
        className="text-[22px] font-semibold tracking-[-0.01em] leading-[1.15] mb-2"
        style={{ fontFamily: 'var(--font-fraunces), var(--font-display)' }}
      >
        {title}
      </h3>

      {/* Description */}
      <p
        className="text-[15px] leading-[1.5] flex-1"
        style={{ color: 'var(--ink-muted)' }}
      >
        {description}
      </p>

      {/* Stage chips */}
      <div className="flex gap-2 mt-4 pt-4 border-t" style={{ borderColor: 'var(--border)' }}>
        {stages.map((stage) => (
          <span
            key={stage}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-[0.08em]"
            style={{
              background: 'var(--surface-raised)',
              color: 'var(--ink-muted)',
            }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: stageColors[stage] }}
            />
            {stage}
          </span>
        ))}
      </div>
    </div>
  )
}

export function PillarsSection() {
  const pillars: PillarCardProps[] = [
    {
      icon: <RoseHeartSticker size={28} />,
      stickerBg: 'var(--rose-soft)',
      title: 'Cycle & Fertility',
      description: 'Hormone curves, fertile windows, ovulation insights.',
      stages: ['PRE'],
    },
    {
      icon: <WeekRingSticker size={28} />,
      stickerBg: 'var(--lavender-soft)',
      title: 'Pregnancy Journey',
      description: 'Week-by-week, baby size in fruit, affirmations, birth plan.',
      stages: ['PREG'],
    },
    {
      icon: <MoonSticker size={28} />,
      stickerBg: 'var(--blue-powder-soft)',
      title: 'Sleep',
      description: 'Naps, night wakes, regressions. Tracked with one tap.',
      stages: ['KIDS'],
    },
    {
      icon: <LeafSticker size={28} />,
      stickerBg: 'var(--sticker-green-soft)',
      title: 'Feeding & Food',
      description: 'Breast, bottle, solids. Calories, allergens, photo logging.',
      stages: ['PREG', 'KIDS'],
    },
    {
      icon: <CrossSticker size={28} />,
      stickerBg: 'var(--sticker-pink-soft)',
      title: 'Vaccines',
      description: "A schedule tree that doesn't feel like a calendar from 1998.",
      stages: ['KIDS'],
    },
    {
      icon: <SparkleSticker size={28} />,
      stickerBg: 'var(--sticker-peach-soft)',
      title: 'Growth & Leaps',
      description: 'Wonder weeks, milestones, gentle percentile nudges.',
      stages: ['KIDS'],
    },
    {
      icon: <SunSticker size={28} />,
      stickerBg: 'var(--sticker-yellow-soft)',
      title: 'Mood & Wellbeing',
      description: 'Yours and theirs. Bubble charts that actually mean something.',
      stages: ['PRE', 'PREG', 'KIDS'],
    },
    {
      icon: <TwoHeartsSticker size={28} />,
      stickerBg: 'var(--sticker-lilac-soft)',
      title: 'Care Circle',
      description: 'Nannies, grandparents, partners. Permissions you control.',
      stages: ['PREG', 'KIDS'],
    },
    {
      icon: <PageSticker size={28} />,
      stickerBg: 'var(--sticker-blue-soft)',
      title: 'Medical Vault',
      description: 'Ultrasounds, exams, vaccine records. One tap, one tag.',
      stages: ['PREG', 'KIDS'],
    },
  ]

  return (
    <section
      id="features"
      className="py-20 lg:py-32 px-6 lg:px-12"
      style={{ background: 'var(--bg)' }}
      aria-label="The 9 Pillars"
    >
      <div className="max-w-[1280px] mx-auto">
        {/* Header */}
        <div className="text-center mb-12 lg:mb-16">
          <p className="eyebrow">{"WHAT'S INSIDE"}</p>
          <h2
            className="text-[36px] lg:text-[56px] font-semibold tracking-[-0.015em] leading-[1.05] mb-6"
            style={{ fontFamily: 'var(--font-fraunces), var(--font-display)' }}
          >
            Twenty-four pillars of parenting.{' '}
            <em
              className="not-italic"
              style={{
                fontFamily: 'var(--font-instrument-serif), var(--font-italic)',
                fontStyle: 'italic',
                fontWeight: 400,
              }}
            >
              Quietly
            </em>{' '}
            organized.
          </h2>
          <p
            className="text-[17px] lg:text-[19px] leading-[1.6] max-w-[680px] mx-auto"
            style={{ color: 'var(--ink-secondary)' }}
          >
            Every pillar is built on real medical guidance, real lived experience, and real bedtime fatigue. Pick a stage and Grandma will only show you what matters now.
          </p>
        </div>

        {/* Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {pillars.map((pillar, index) => (
            <PillarCard key={index} {...pillar} />
          ))}
        </div>
      </div>
    </section>
  )
}
