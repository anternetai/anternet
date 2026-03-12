import { SmoothScrollProvider } from "@/components/marketing/smooth-scroll-provider";
import { Nav } from "@/components/marketing/nav";
import { Hero } from "@/components/marketing/hero";
import { StatsBar } from "@/components/marketing/stats-bar";
import { ProblemSection } from "@/components/marketing/problem-section";
import { HowItWorks } from "@/components/marketing/how-it-works";
import { FeaturesGrid } from "@/components/marketing/features-grid";
import { OfferSection } from "@/components/marketing/offer-section";
import { SocialProof } from "@/components/marketing/social-proof";
import { FinalCta } from "@/components/marketing/final-cta";
import { FooterMarketing } from "@/components/marketing/footer-marketing";

export default function Home() {
  return (
    <SmoothScrollProvider>
      <div className="min-h-screen bg-[#050505]">
        <Nav />
        <Hero />
        <StatsBar />
        <ProblemSection />
        <HowItWorks />
        <FeaturesGrid />
        <OfferSection />
        <SocialProof />
        <FinalCta />
        <FooterMarketing />
      </div>
    </SmoothScrollProvider>
  );
}
