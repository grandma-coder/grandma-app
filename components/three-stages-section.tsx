import {
  RoseHeartSticker,
  LavenderMoonSticker,
  CloudSticker,
} from './stickers'

interface StageFeature {
  text: string
}

interface StageCardProps {
  sticker: React.ReactNode
  label: string
  labelColor: string
  bgColor: string
  title: React.ReactNode
  description: string
  features: StageFeature[]
  modeColor: string
}

function StageCard({
  sticker,
  label,
  labelColor,
  bgColor,
  title,
  description,
  features,
  modeColor,
}: StageCardProps) {
  return (
    <div
      className="p-8 rounded-[28px] border shadow-[var(--shadow-card)] h-full flex flex-col transition-all duration-[280ms] hover:translate-y-[-4px] hover:shadow-[var(--shadow-card-hover)]"
      style={{
        background: bgColor,
        borderColor: 'var(--border)',
        transitionTimingFunction: 'var(--ease-paper)',
      }}
    >
      {/* Sticker */}
      <div className="mb-4">{sticker}</div>

      {/* Label chip */}
      <div
        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-semibold uppercase tracking-[0.08em] mb-4 w-fit"
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          color: labelColor,
        }}
      >
        <span
          className="w-2 h-2 rounded-full"
          style={{ background: labelColor }}
        />
        {label}
      </div>

      {/* Title */}
      <h3
        className="text-[24px] lg:text-[28px] font-semibold tracking-[-0.01em] leading-[1.15] mb-4"
        style={{ fontFamily: 'var(--font-fraunces), var(--font-display)' }}
      >
        {title}
      </h3>

      {/* Description */}
      <p
        className="text-[16px] leading-[1.6] mb-6"
        style={{ color: 'var(--ink-secondary)' }}
      >
        {description}
      </p>

      {/* Divider */}
      <div
        className="h-px w-full my-6"
        style={{ background: 'var(--border)' }}
      />

      {/* Features */}
      <ul className="flex flex-col gap-3 mt-auto">
        {features.map((feature, index) => (
          <li key={index} className="flex items-start gap-3">
            <span
              className="w-1.5 h-1.5 rounded-full mt-2 flex-shrink-0"
              style={{ background: modeColor }}
            />
            <span className="text-[15px]" style={{ color: 'var(--ink-secondary)' }}>
              {feature.text}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function ThreeStagesSection() {
  const stages = [
    {
      sticker: <RoseHeartSticker size={48} rotate={-5} />,
      label: 'PRE-PREGNANCY',
      labelColor: 'var(--rose)',
      bgColor: 'var(--rose-soft)',
      title: (
        <>
          Trying{' '}
          <em
            className="not-italic"
            style={{
              fontFamily: 'var(--font-instrument-serif), var(--font-italic)',
              fontStyle: 'italic',
              fontWeight: 400,
            }}
          >
            for one
          </em>
          .
        </>
      ),
      description:
        'Cycle tracking with hormone curves, fertile windows that actually make sense, and 6 fertility pillars to help you arrive at pregnancy prepared and informed.',
      features: [
        { text: 'Cycle ring + phase predictions' },
        { text: 'Hormone & fertility insights' },
        { text: 'Preconception checklist' },
      ],
      modeColor: 'var(--rose)',
    },
    {
      sticker: <LavenderMoonSticker size={48} rotate={6} />,
      label: 'PREGNANCY',
      labelColor: 'var(--lavender)',
      bgColor: 'var(--lavender-soft)',
      title: (
        <>
          Expecting{' '}
          <em
            className="not-italic"
            style={{
              fontFamily: 'var(--font-instrument-serif), var(--font-italic)',
              fontStyle: 'italic',
              fontWeight: 400,
            }}
          >
            for two
          </em>
          .
        </>
      ),
      description:
        "Week-by-week journey ring, baby size in fruit (and feelings), affirmations that don't make you cringe, and a birth plan that actually fits in your bag.",
      features: [
        { text: '40-week journey ring' },
        { text: 'Today summary + affirmations' },
        { text: 'Birth guide & appointments' },
      ],
      modeColor: 'var(--lavender)',
    },
    {
      sticker: <CloudSticker size={48} rotate={-3} />,
      label: 'KIDS 0–5y',
      labelColor: 'var(--blue-powder)',
      bgColor: 'var(--blue-powder-soft)',
      title: (
        <>
          Raising{' '}
          <em
            className="not-italic"
            style={{
              fontFamily: 'var(--font-instrument-serif), var(--font-italic)',
              fontStyle: 'italic',
              fontWeight: 400,
            }}
          >
            little ones
          </em>
          .
        </>
      ),
      description:
        'Sleep, mood, calories, growth leaps, vaccines — all tracked with one tap and a sticker, never a spreadsheet. From newborn to 5 years old.',
      features: [
        { text: 'Sleep + mood circles' },
        { text: 'Vaccine schedule tree' },
        { text: 'Nanny notes & care circle' },
      ],
      modeColor: 'var(--blue-powder)',
    },
  ]

  return (
    <section
      id="stages"
      className="py-20 lg:py-32 px-6 lg:px-12"
      style={{ background: 'var(--bg)' }}
      aria-label="The Three Stages"
    >
      <div className="max-w-[1280px] mx-auto">
        {/* Header */}
        <div className="text-center mb-12 lg:mb-16">
          <p className="eyebrow">THE THREE STAGES</p>
          <h2
            className="text-[36px] lg:text-[56px] font-semibold tracking-[-0.015em] leading-[1.05] mb-6"
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

        {/* Cards grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {stages.map((stage, index) => (
            <StageCard key={index} {...stage} />
          ))}
        </div>

        {/* Bottom tagline */}
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
      </div>
    </section>
  )
}
