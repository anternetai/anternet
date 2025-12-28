import Image from "next/image"
import { LeadForm } from "@/components/LeadForm"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Shield, Clock, Star, Phone, Droplets, Sparkles } from "lucide-react"

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Top Bar */}
      <div className="bg-slate-900 text-white py-2 px-4">
        <div className="max-w-6xl mx-auto flex justify-between items-center text-sm">
          <div className="flex items-center gap-2">
            <Phone className="w-4 h-4" />
            <span>Call Now: (980) 242-8048</span>
          </div>
          <div className="hidden sm:block">
            Serving Charlotte &amp; Surrounding Areas
          </div>
        </div>
      </div>

      {/* Header with Logo */}
      <header className="bg-white border-b border-slate-200 py-4 px-4">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <Image
            src="/logo.png"
            alt="Dr. Squeegee House Washing"
            width={180}
            height={60}
            className="h-12 w-auto"
            priority
          />
          <a
            href="tel:9802428048"
            className="bg-orange-600 hover:bg-orange-700 text-white font-semibold px-4 py-2 rounded-lg text-sm transition-colors"
          >
            Get Free Quote
          </a>
        </div>
      </header>

      <main className="px-4 py-8 md:py-16">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-16 items-start">
            {/* Hero Content */}
            <div className="space-y-6">
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary" className="bg-orange-100 text-orange-800 hover:bg-orange-100">
                  Same Week Service
                </Badge>
                <Badge variant="secondary" className="bg-green-100 text-green-800 hover:bg-green-100">
                  Free Quotes
                </Badge>
              </div>

              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-slate-900 leading-tight">
                Professional House Washing
                <span className="block text-orange-600">
                  Services in Charlotte
                </span>
              </h1>

              <p className="text-lg md:text-xl text-slate-600 max-w-xl">
                Restore your home&apos;s curb appeal with professional soft washing.
                Safe for all siding types, removes algae, mold, and years of buildup
                in just a few hours.
              </p>

              {/* Trust Indicators */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 pt-4">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                    <Shield className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="text-sm">
                    <div className="font-semibold text-slate-900">Licensed</div>
                    <div className="text-slate-500">& Insured</div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                    <Clock className="w-5 h-5 text-green-600" />
                  </div>
                  <div className="text-sm">
                    <div className="font-semibold text-slate-900">Same Week</div>
                    <div className="text-slate-500">Appointments</div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center">
                    <Star className="w-5 h-5 text-yellow-600" />
                  </div>
                  <div className="text-sm">
                    <div className="font-semibold text-slate-900">150+</div>
                    <div className="text-slate-500">Happy Customers</div>
                  </div>
                </div>
              </div>

              {/* Social Proof */}
              <div className="bg-slate-100 rounded-lg p-4 mt-6">
                <div className="flex items-start gap-3">
                  <div className="flex -space-x-2">
                    <div className="w-8 h-8 rounded-full bg-slate-300 border-2 border-white" />
                    <div className="w-8 h-8 rounded-full bg-slate-400 border-2 border-white" />
                    <div className="w-8 h-8 rounded-full bg-slate-500 border-2 border-white" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-700">
                      Join <span className="font-semibold">150+ Charlotte homeowners</span> who
                      trust Dr. Squeegee for their exterior cleaning
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Lead Form Card */}
            <div className="lg:sticky lg:top-8">
              <Card className="shadow-xl border-0 bg-white">
                <CardContent className="p-6 md:p-8">
                  <div className="text-center mb-6">
                    <h2 className="text-2xl font-bold text-slate-900 mb-2">
                      Get Your Free Quote
                    </h2>
                    <p className="text-slate-600">
                      Takes less than 60 seconds
                    </p>
                  </div>
                  <LeadForm />
                </CardContent>
              </Card>

              {/* Urgency Banner */}
              <div className="mt-4 bg-orange-50 border border-orange-200 rounded-lg p-4 text-center">
                <p className="text-orange-800 text-sm font-medium">
                  Limited spots available this week - Book now!
                </p>
              </div>
            </div>
          </div>

          {/* Benefits Section */}
          <section className="mt-16 md:mt-24">
            <h2 className="text-2xl md:text-3xl font-bold text-center text-slate-900 mb-8">
              Why Charlotte Homeowners Choose Dr. Squeegee
            </h2>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="text-center p-6">
                <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-4">
                  <Shield className="w-8 h-8 text-blue-600" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">
                  Safe Soft Wash Process
                </h3>
                <p className="text-slate-600">
                  We use low-pressure techniques that are safe for vinyl, brick, stucco, and wood siding.
                </p>
              </div>

              <div className="text-center p-6">
                <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                  <Sparkles className="w-8 h-8 text-green-600" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">
                  Instant Curb Appeal
                </h3>
                <p className="text-slate-600">
                  See the difference immediately. Most homes take 1.5-2.5 hours and look brand new.
                </p>
              </div>

              <div className="text-center p-6">
                <div className="w-16 h-16 rounded-full bg-yellow-100 flex items-center justify-center mx-auto mb-4">
                  <Droplets className="w-8 h-8 text-yellow-600" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">
                  Bundle & Save
                </h3>
                <p className="text-slate-600">
                  Combine house wash with driveway, gutters, or windows and save 15-20%.
                </p>
              </div>
            </div>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-slate-900 text-white py-8 px-4 mt-16">
        <div className="max-w-6xl mx-auto text-center">
          <p className="text-slate-400 text-sm">
            &copy; {new Date().getFullYear()} Dr. Squeegee House Washing. All rights reserved.
          </p>
          <p className="text-slate-500 text-xs mt-2">
            Serving Charlotte, Huntersville, Cornelius, Matthews, and surrounding areas.
          </p>
        </div>
      </footer>
    </div>
  )
}
