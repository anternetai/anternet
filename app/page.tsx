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

const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "HomeField Hub",
  url: "https://homefieldhub.com",
  logo: "https://homefieldhub.com/favicon.svg",
  description:
    "Performance-based AI lead generation for roofing and remodeling contractors. Pay $200 per showed appointment. No retainer, no contracts, no risk.",
  email: "anthony@homefieldhub.com",
  areaServed: {
    "@type": "Country",
    name: "United States",
  },
  serviceType: [
    "Lead Generation",
    "AI Marketing",
    "Appointment Setting",
    "Home Service Contractor Marketing",
  ],
  knowsAbout: [
    "Roofing Lead Generation",
    "Home Remodeling Leads",
    "Pay Per Appointment",
    "AI Sales Automation",
    "Home Service Marketing",
  ],
  offers: {
    "@type": "Offer",
    name: "Performance-Based Lead Generation",
    description:
      "AI-powered appointment setting for home service contractors. Pay only $200 per showed appointment — no retainer, no contracts.",
    priceCurrency: "USD",
    price: "200",
    priceSpecification: {
      "@type": "UnitPriceSpecification",
      price: "200",
      priceCurrency: "USD",
      unitText: "per showed appointment",
    },
  },
};

export default function Home() {
  return (
    <SmoothScrollProvider>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
      />
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
