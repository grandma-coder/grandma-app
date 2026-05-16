import { Navigation, ScrollProgress } from '@/components/navigation'
import { Footer } from '@/components/footer'
import { LilacHeartSticker } from '@/components/stickers'

export const metadata = {
  title: 'Privacy Policy | Grandma',
  description: 'How Grandma handles your data and protects your privacy.',
}

export default function PrivacyPage() {
  return (
    <>
      <ScrollProgress />
      <Navigation />
      <main className="pt-32 pb-20 px-6 lg:px-12">
        <article className="max-w-[720px] mx-auto">
          {/* Header */}
          <p
            className="text-[11px] font-semibold uppercase tracking-[0.12em] mb-8"
            style={{ color: 'var(--ink-muted)' }}
          >
            LAST UPDATED · MAY 15, 2026
          </p>

          <h1
            className="text-[36px] lg:text-[48px] font-semibold tracking-[-0.02em] leading-[1.1] mb-8"
            style={{ fontFamily: 'var(--font-fraunces), var(--font-display)' }}
          >
            Privacy Policy
          </h1>

          <p
            className="text-[19px] leading-[1.6] mb-12"
            style={{
              fontFamily: 'var(--font-instrument-serif), var(--font-italic)',
              fontStyle: 'italic',
              color: 'var(--ink-secondary)',
            }}
          >
            Your privacy matters to us. This policy explains what data we collect, how we use it, and how you can control it.
          </p>

          {/* Content sections */}
          <div className="space-y-12 text-[17px] leading-[1.7]" style={{ color: 'var(--ink)' }}>
            <Section number="01" title="What We Collect">
              <p>
                Grandma collects the information you provide directly: your email address, name, and any health data you choose to log (cycle information, pregnancy details, child growth data, symptoms, notes).
              </p>
              <p>
                We also collect basic usage data to improve the app experience, including which features you use and how often. We do not track your location or access your contacts.
              </p>
            </Section>

            <Section number="02" title="How We Store Your Data">
              <p>
                Your data lives in Supabase, a secure database infrastructure. All data is encrypted in transit (TLS 1.3) and at rest (AES-256). Your authentication credentials are hashed using bcrypt.
              </p>
              <p>
                We use industry-standard security practices and regularly audit our infrastructure. Data is stored in EU-based servers to comply with GDPR requirements.
              </p>
            </Section>

            <Section number="03" title="AI Processing">
              <p>
                Grandma is powered by Claude, Anthropic&apos;s AI assistant. When you chat with Guru Grandma, your messages are sent to Anthropic&apos;s API for processing. Anthropic does not use your conversations to train their models when accessed via API.
              </p>
              <p>
                Your health data may be included in chat context to provide personalized responses. You can disable this in Settings.
              </p>
            </Section>

            <Section number="04" title="Payment Processing">
              <p>
                Payments are processed through RevenueCat, which handles subscriptions across iOS and Android. We do not store your payment card details — all payment processing is handled by Apple Pay, Google Pay, or RevenueCat&apos;s secure payment infrastructure.
              </p>
            </Section>

            <Section number="05" title="Health Data">
              <p>
                We take health data seriously. Grandma is designed to be HIPAA-aware and GDPR-compliant:
              </p>
              <ul className="list-disc pl-6 mt-4 space-y-2">
                <li>We never sell your health data</li>
                <li>We never use your health data for advertising</li>
                <li>We never share your health data with third parties without your explicit consent</li>
                <li>Your health data is never used to train AI models</li>
              </ul>
            </Section>

            <Section number="06" title="Children&apos;s Data">
              <p>
                Grandma helps you track your children&apos;s development. We take special care with children&apos;s data:
              </p>
              <ul className="list-disc pl-6 mt-4 space-y-2">
                <li>No advertising IDs are associated with child profiles</li>
                <li>No behavioral profiling is performed on children&apos;s data</li>
                <li>Child data is only visible to parents and explicitly authorized caregivers</li>
                <li>All child data can be exported or deleted at any time</li>
              </ul>
            </Section>

            <Section number="07" title="Data Export & Deletion">
              <p>
                You have full control over your data:
              </p>
              <ul className="list-disc pl-6 mt-4 space-y-2">
                <li>Export all your data at <code className="text-[15px] px-1.5 py-0.5 rounded" style={{ background: 'var(--surface-raised)' }}>/account/export</code></li>
                <li>Delete your entire account at <code className="text-[15px] px-1.5 py-0.5 rounded" style={{ background: 'var(--surface-raised)' }}>/account/delete</code></li>
                <li>Deletion is permanent and completed within 30 days</li>
              </ul>
            </Section>

            <Section number="08" title="Care Circle Sharing">
              <p>
                When you invite caregivers to your care circle, you control exactly what they can see. Permissions are granular — a nanny can log naps without seeing medical records. All sharing is opt-in and can be revoked at any time.
              </p>
            </Section>

            <Section number="09" title="Contact">
              <p>
                For privacy questions or data requests, contact us at{' '}
                <a
                  href="mailto:privacy@grandma.app"
                  className="underline hover:opacity-70"
                  style={{ color: 'var(--primary)' }}
                >
                  privacy@grandma.app
                </a>
              </p>
            </Section>
          </div>

          {/* Footer decoration */}
          <div className="flex justify-center mt-16">
            <LilacHeartSticker size={32} />
          </div>
        </article>
      </main>
      <Footer />
    </>
  )
}

function Section({
  number,
  title,
  children,
}: {
  number: string
  title: string
  children: React.ReactNode
}) {
  return (
    <section className="relative">
      <div
        className="absolute -left-16 top-0 w-10 h-10 rounded-full flex items-center justify-center hidden lg:flex"
        style={{ background: 'var(--sticker-lilac-soft)' }}
      >
        <span
          className="text-[12px] font-semibold"
          style={{
            fontFamily: 'var(--font-fraunces), var(--font-display)',
            color: 'var(--ink)',
          }}
        >
          {number}
        </span>
      </div>
      <h2
        className="text-[24px] lg:text-[28px] font-semibold tracking-[-0.01em] mb-4"
        style={{ fontFamily: 'var(--font-fraunces), var(--font-display)' }}
      >
        {title}
      </h2>
      <div className="space-y-4" style={{ color: 'var(--ink-secondary)' }}>
        {children}
      </div>
    </section>
  )
}
