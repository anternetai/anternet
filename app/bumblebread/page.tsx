import { Hero } from "@/components/bumblebread/hero"
import { BatchMenu } from "@/components/bumblebread/batch-menu"
import { InstagramFeed } from "@/components/bumblebread/instagram-feed"
import { HowItWorks } from "@/components/bumblebread/how-it-works"
import { FreshnessGuide } from "@/components/bumblebread/freshness-guide"
import { About } from "@/components/bumblebread/about"
import { JoinClub } from "@/components/bumblebread/join-club"
import { Footer } from "@/components/bumblebread/footer"

export default function BumblebreadPage() {
  return (
    <main>
      <Hero />
      <BatchMenu />
      <InstagramFeed />
      <HowItWorks />
      <FreshnessGuide />
      <About />
      <JoinClub />
      <Footer />
    </main>
  )
}
