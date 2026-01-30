import Link from "next/link"
import { CheckCircle, MessageSquare, Mail, Calendar } from "lucide-react"
import { Button } from "@/components/ui/button"

export const metadata = {
  title: "Thank You | HomeField Hub",
  description: "Your onboarding form has been submitted successfully",
}

export default function ThankYouPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400 flex items-center justify-center">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                className="w-6 h-6 text-white"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
            </div>
            <span className="text-gray-900 font-semibold text-lg">HomeField Hub</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-2xl mx-auto px-6 py-16">
        <div className="text-center">
          {/* Success Icon */}
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-100 mb-6">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>

          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Thank You!
          </h1>
          <p className="text-lg text-gray-600 mb-12">
            Your onboarding form has been submitted successfully. We&apos;re excited to work with you!
          </p>

          {/* What's Next Section */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-left">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">
              What&apos;s Next?
            </h2>

            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0">
                  <MessageSquare className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">Slack Channel</h3>
                  <p className="text-gray-600 text-sm">
                    We&apos;re creating your dedicated Slack channel where we&apos;ll communicate throughout our partnership.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <Mail className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">Welcome Email</h3>
                  <p className="text-gray-600 text-sm">
                    You&apos;ll receive a welcome email shortly with important details and next steps.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center flex-shrink-0">
                  <Calendar className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">Onboarding Call</h3>
                  <p className="text-gray-600 text-sm">
                    We&apos;ll reach out to schedule your onboarding call where we&apos;ll discuss your goals and get everything set up.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* CTA Button */}
          <div className="mt-8">
            <Link href="/">
              <Button className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white px-8 py-3 h-auto">
                Back to Home
              </Button>
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 py-6 mt-12 bg-white">
        <div className="max-w-4xl mx-auto px-6 text-center text-sm text-gray-500">
          &copy; {new Date().getFullYear()} HomeField Hub. All rights reserved.
        </div>
      </footer>
    </div>
  )
}
