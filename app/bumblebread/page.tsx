import { Hero } from "@/components/bumblebread/hero"
import { BatchMenu } from "@/components/bumblebread/batch-menu"
import { MascotDivider } from "@/components/bumblebread/mascot-divider"
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

      {/* Mascot peeking in after the menu */}
      <MascotDivider
        src="/bumblebread/mascot-peeking.webp"
        alt="Bumblebread mascot peeking in"
        width={512}
        height={512}
        position="right"
        className="-mt-6 -mb-6"
      />

      <InstagramFeed />

      {/* Mascot walking between Instagram and How It Works */}
      <MascotDivider
        src="/bumblebread/mascot-walking-right.webp"
        alt="Bumblebread mascot walking with bread"
        width={424}
        height={632}
        position="left"
        className="-mt-4 -mb-4"
      />

      <HowItWorks />

      <FreshnessGuide />

      {/* Mascot smelling bread before the About section */}
      <MascotDivider
        src="/bumblebread/mascot-smelling.webp"
        alt="Bumblebread mascot enjoying the aroma of fresh bread"
        width={424}
        height={632}
        position="center"
        className="-mb-8 mt-2"
      />

      <About />

      {/* Mascot sitting near the signup / end of page */}
      <MascotDivider
        src="/bumblebread/mascot-breaking-bread.webp"
        alt="Bumblebread mascot breaking bread"
        width={600}
        height={448}
        position="right"
        className="-mt-4 -mb-4"
      />

      <JoinClub />
      <Footer />
    </main>
  )
}
