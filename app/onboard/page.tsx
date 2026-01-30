import { OnboardingForm } from "@/components/OnboardingForm"

export const metadata = {
  title: "Client Onboarding | HomeField Hub",
  description: "Complete your onboarding form to get started with HomeField Hub",
}

export default function OnboardPage() {
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
      <main className="max-w-4xl mx-auto px-6 py-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-8">
            HomeField Hub Onboarding Form
          </h1>

          <OnboardingForm />
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
