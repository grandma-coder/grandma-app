import { Navigation, ScrollProgress } from '@/components/navigation'
import { HeroSection } from '@/components/hero-section'
import { ThreeStagesSection } from '@/components/three-stages-section'
import { MeetGrandmaSection } from '@/components/meet-grandma-section'
import { PillarsSection } from '@/components/pillars-section'
import { ConnectionsSection } from '@/components/connections-section'
import { MemoriesSection } from '@/components/memories-section'
import { TrustStripSection, TestimonialsSection } from '@/components/testimonials-section'
import { WaitlistSection, FAQSection, FinalHeroStrip } from '@/components/waitlist-faq-section'
import { Footer } from '@/components/footer'

export default function HomePage() {
  return (
    <>
      <ScrollProgress />
      <Navigation />
      <main>
        <HeroSection />
        <ThreeStagesSection />
        <MeetGrandmaSection />
        <PillarsSection />
        <ConnectionsSection />
        <MemoriesSection />
        <TrustStripSection />
        <TestimonialsSection />
        <WaitlistSection />
        <FAQSection />
        <FinalHeroStrip />
      </main>
      <Footer />
    </>
  )
}
