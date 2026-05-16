import { Navigation, ScrollProgress } from '@/components/navigation'
import { Footer } from '@/components/footer'
import { LilacHeartSticker } from '@/components/stickers'

export const metadata = {
  title: 'Terms of Service | Grandma',
  description: 'Terms and conditions for using Grandma.',
}

export default function TermsPage() {
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
            Terms of Service
          </h1>

          <p
            className="text-[19px] leading-[1.6] mb-12"
            style={{
              fontFamily: 'var(--font-instrument-serif), var(--font-italic)',
              fontStyle: 'italic',
              color: 'var(--ink-secondary)',
            }}
          >
            By using Grandma, you agree to these terms. Please read them carefully.
          </p>

          {/* Medical disclaimer - prominent */}
          <div
            className="p-8 rounded-[28px] border-2 mb-12"
            style={{
              background: 'var(--sticker-coral)',
              borderColor: 'var(--ink)',
              color: 'var(--surface)',
            }}
          >
            <h2
              className="text-[24px] font-semibold mb-4"
              style={{ fontFamily: 'var(--font-fraunces), var(--font-display)' }}
            >
              Medical Disclaimer
            </h2>
            <p className="text-[17px] leading-[1.6]">
              Grandma is NOT a substitute for professional medical advice, diagnosis, or treatment. Always seek the advice of your physician, midwife, or other qualified health provider with any questions you may have regarding a medical condition. Never disregard professional medical advice or delay in seeking it because of something you read or hear in Grandma.
            </p>
          </div>

          {/* Content sections */}
          <div className="space-y-12 text-[17px] leading-[1.7]" style={{ color: 'var(--ink)' }}>
            <Section number="01" title="Age Requirement">
              <p>
                You must be at least 13 years old to use Grandma. If you are under 18, you may only use Grandma with the involvement of a parent or guardian. Parents and guardians are responsible for child data entered into the app.
              </p>
            </Section>

            <Section number="02" title="Account Responsibilities">
              <p>
                You are responsible for maintaining the confidentiality of your account credentials. You agree to notify us immediately of any unauthorized use of your account. We are not liable for any loss or damage arising from your failure to protect your account.
              </p>
            </Section>

            <Section number="03" title="Acceptable Use">
              <p>
                You agree not to:
              </p>
              <ul className="list-disc pl-6 mt-4 space-y-2">
                <li>Use Grandma for any unlawful purpose</li>
                <li>Attempt to gain unauthorized access to our systems</li>
                <li>Interfere with or disrupt the service</li>
                <li>Upload malicious content or code</li>
                <li>Impersonate others or misrepresent your identity</li>
                <li>Use the service to harass, abuse, or harm others</li>
              </ul>
            </Section>

            <Section number="04" title="Subscriptions & Payments">
              <p>
                Grandma offers free and premium subscription tiers. Premium subscriptions are billed monthly or annually through Apple App Store or Google Play Store.
              </p>
              <ul className="list-disc pl-6 mt-4 space-y-2">
                <li>Subscriptions automatically renew unless cancelled at least 24 hours before the end of the current period</li>
                <li>You can manage and cancel subscriptions through your device&apos;s app store settings</li>
                <li>Refunds are handled according to Apple/Google policies, or directly by us within 14 days of purchase</li>
                <li>Price changes will be communicated 30 days in advance</li>
              </ul>
            </Section>

            <Section number="05" title="AI-Generated Content">
              <p>
                Grandma uses AI (powered by Claude from Anthropic) to provide information and support. AI responses:
              </p>
              <ul className="list-disc pl-6 mt-4 space-y-2">
                <li>Are not medical advice and should not be treated as such</li>
                <li>May contain inaccuracies or errors</li>
                <li>Should be verified with qualified professionals for important decisions</li>
                <li>Are provided &quot;as is&quot; without warranties of accuracy or completeness</li>
              </ul>
            </Section>

            <Section number="06" title="Your Content">
              <p>
                You retain ownership of all content you create in Grandma (logs, notes, photos, etc.). By using the service, you grant us a limited license to store, process, and display your content as necessary to provide the service.
              </p>
              <p>
                You can export or delete your content at any time. Upon account deletion, your content will be permanently removed within 30 days.
              </p>
            </Section>

            <Section number="07" title="Intellectual Property">
              <p>
                Grandma, including its design, features, and content (excluding your personal content), is owned by us and protected by intellectual property laws. You may not copy, modify, distribute, or create derivative works from our service without permission.
              </p>
            </Section>

            <Section number="08" title="Limitation of Liability">
              <p>
                To the maximum extent permitted by law, Grandma and its operators shall not be liable for any indirect, incidental, special, consequential, or punitive damages, or any loss of profits or revenues, whether incurred directly or indirectly, or any loss of data, use, goodwill, or other intangible losses.
              </p>
            </Section>

            <Section number="09" title="Service Modifications">
              <p>
                We reserve the right to modify, suspend, or discontinue the service at any time. We will provide reasonable notice of significant changes. Continued use of the service after changes constitutes acceptance of those changes.
              </p>
            </Section>

            <Section number="10" title="Governing Law">
              <p>
                These terms are governed by the laws of Portugal. Any disputes shall be resolved in the courts of Lisbon, Portugal.
              </p>
            </Section>

            <Section number="11" title="Contact">
              <p>
                For questions about these terms, contact us at{' '}
                <a
                  href="mailto:terms@grandma.app"
                  className="underline hover:opacity-70"
                  style={{ color: 'var(--primary)' }}
                >
                  terms@grandma.app
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
