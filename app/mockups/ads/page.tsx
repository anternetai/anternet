"use client"

import { useState } from "react"
import { Play, Pause, Heart, MessageCircle, Share, Bookmark, MoreHorizontal, Eye, MousePointer, Users, DollarSign, TrendingUp, Calendar, ChevronLeft, ChevronRight } from "lucide-react"

// Fake ad data
const ADS = [
  {
    id: 1,
    platform: "facebook",
    title: "Kitchen Transformation",
    thumbnail: "/kitchen-ad.jpg",
    duration: "0:45",
    status: "active",
    metrics: {
      impressions: 12847,
      clicks: 892,
      ctr: "6.94%",
      leads: 34,
      spent: 456.78,
      cpl: 13.43,
    },
    copy: "Tired of your outdated kitchen? Watch how we transformed this 1990s kitchen into a modern masterpiece in just 3 weeks. Free consultation - link in bio!",
  },
  {
    id: 2,
    platform: "instagram",
    title: "Before & After Bathroom",
    thumbnail: "/bathroom-ad.jpg",
    duration: "0:30",
    status: "active",
    metrics: {
      impressions: 8934,
      clicks: 567,
      ctr: "6.35%",
      leads: 21,
      spent: 312.45,
      cpl: 14.88,
    },
    copy: "This bathroom went from drab to fab! Swipe to see the full transformation. Ready to upgrade your space? DM us!",
  },
  {
    id: 3,
    platform: "facebook",
    title: "Customer Testimonial - The Johnsons",
    thumbnail: "/testimonial-ad.jpg",
    duration: "1:15",
    status: "active",
    metrics: {
      impressions: 15623,
      clicks: 1234,
      ctr: "7.90%",
      leads: 52,
      spent: 523.00,
      cpl: 10.06,
    },
    copy: "\"They completely transformed our home!\" - Hear from the Johnson family about their whole-home remodel experience. Book your free consultation today!",
  },
]

const SCAMMY_ADS = [
  {
    title: "Stock Photo House",
    image: "Generic stock photo of a house",
    text: "CHEAP REMODELING!!! CALL NOW!!!",
    issue: "Stock photos, all caps, no personality",
  },
  {
    title: "Clip Art Disaster",
    image: "Low quality clipart bathroom",
    text: "Best prices in town! Free estimate!",
    issue: "Cheap graphics, vague claims",
  },
]

export default function AdsMockup() {
  const [selectedAd, setSelectedAd] = useState(ADS[0])
  const [isPlaying, setIsPlaying] = useState(false)

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Top Nav */}
      <nav className="bg-gray-900 border-b border-white/5 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center font-bold text-lg">
                H
              </div>
              <span className="font-semibold text-lg">HomeField Hub</span>
            </div>
            <div className="flex items-center gap-6 text-sm">
              <button className="text-gray-400 hover:text-white">Dashboard</button>
              <button className="text-gray-400 hover:text-white">Map View</button>
              <button className="text-gray-400 hover:text-white">Conversations</button>
              <button className="text-orange-400 font-medium">Ads</button>
              <button className="text-gray-400 hover:text-white">Reports</button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold mb-1">Your Video Ads</h1>
            <p className="text-gray-400">Professional video content running on Facebook & Instagram</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-2xl font-bold text-green-400">107</p>
              <p className="text-sm text-gray-400">Leads This Month</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold">$12.12</p>
              <p className="text-sm text-gray-400">Avg Cost Per Lead</p>
            </div>
          </div>
        </div>

        {/* Stats Bar */}
        <div className="grid grid-cols-5 gap-4 mb-8">
          <div className="bg-gray-900 border border-white/5 rounded-xl p-4">
            <div className="flex items-center gap-2 text-gray-400 mb-2">
              <Eye className="w-4 h-4" />
              <span className="text-sm">Impressions</span>
            </div>
            <p className="text-2xl font-bold">37.4K</p>
            <p className="text-sm text-green-400">+12.3% vs last week</p>
          </div>
          <div className="bg-gray-900 border border-white/5 rounded-xl p-4">
            <div className="flex items-center gap-2 text-gray-400 mb-2">
              <MousePointer className="w-4 h-4" />
              <span className="text-sm">Clicks</span>
            </div>
            <p className="text-2xl font-bold">2,693</p>
            <p className="text-sm text-green-400">+8.7% vs last week</p>
          </div>
          <div className="bg-gray-900 border border-white/5 rounded-xl p-4">
            <div className="flex items-center gap-2 text-gray-400 mb-2">
              <TrendingUp className="w-4 h-4" />
              <span className="text-sm">CTR</span>
            </div>
            <p className="text-2xl font-bold">7.20%</p>
            <p className="text-sm text-gray-400">Industry avg: 0.90%</p>
          </div>
          <div className="bg-gray-900 border border-white/5 rounded-xl p-4">
            <div className="flex items-center gap-2 text-gray-400 mb-2">
              <Users className="w-4 h-4" />
              <span className="text-sm">Leads</span>
            </div>
            <p className="text-2xl font-bold">107</p>
            <p className="text-sm text-green-400">+23.5% vs last week</p>
          </div>
          <div className="bg-gray-900 border border-white/5 rounded-xl p-4">
            <div className="flex items-center gap-2 text-gray-400 mb-2">
              <DollarSign className="w-4 h-4" />
              <span className="text-sm">Total Spend</span>
            </div>
            <p className="text-2xl font-bold">$1,292</p>
            <p className="text-sm text-gray-400">$12.07 per lead</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-8">
          {/* Ad List */}
          <div className="col-span-2 space-y-6">
            <h2 className="text-lg font-semibold">Active Campaigns</h2>

            {/* Ad Cards */}
            <div className="space-y-4">
              {ADS.map((ad) => (
                <div
                  key={ad.id}
                  onClick={() => setSelectedAd(ad)}
                  className={`bg-gray-900 border rounded-xl overflow-hidden cursor-pointer transition-all ${
                    selectedAd.id === ad.id
                      ? 'border-orange-500 shadow-lg shadow-orange-500/10'
                      : 'border-white/5 hover:border-white/10'
                  }`}
                >
                  <div className="flex">
                    {/* Video Thumbnail */}
                    <div className="w-48 h-32 bg-gradient-to-br from-gray-800 to-gray-700 relative flex-shrink-0">
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-12 h-12 rounded-full bg-white/10 backdrop-blur flex items-center justify-center">
                          <Play className="w-5 h-5 text-white ml-0.5" />
                        </div>
                      </div>
                      <div className="absolute bottom-2 right-2 px-2 py-0.5 bg-black/70 rounded text-xs">
                        {ad.duration}
                      </div>
                      <div className="absolute top-2 left-2 px-2 py-0.5 bg-green-500/20 text-green-400 rounded text-xs font-medium">
                        Active
                      </div>
                    </div>

                    {/* Ad Details */}
                    <div className="flex-1 p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3 className="font-semibold">{ad.title}</h3>
                          <p className="text-sm text-gray-400 capitalize">{ad.platform}</p>
                        </div>
                        <button className="p-1 hover:bg-gray-800 rounded">
                          <MoreHorizontal className="w-4 h-4 text-gray-400" />
                        </button>
                      </div>
                      <p className="text-sm text-gray-400 line-clamp-2 mb-3">{ad.copy}</p>
                      <div className="flex items-center gap-6 text-sm">
                        <div>
                          <span className="text-gray-500">Leads</span>
                          <span className="ml-2 font-medium text-green-400">{ad.metrics.leads}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">CTR</span>
                          <span className="ml-2 font-medium">{ad.metrics.ctr}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">CPL</span>
                          <span className="ml-2 font-medium">${ad.metrics.cpl}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* The Difference Section */}
            <div className="mt-12">
              <h2 className="text-lg font-semibold mb-4">The HomeField Difference</h2>

              <div className="grid grid-cols-2 gap-6">
                {/* Your Ads */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-3 h-3 rounded-full bg-green-500" />
                    <span className="text-sm font-medium text-green-400">Your Ads (Professional Video)</span>
                  </div>

                  <div className="bg-gray-900 border border-green-500/20 rounded-xl overflow-hidden">
                    <div className="aspect-video bg-gradient-to-br from-gray-800 to-gray-700 relative">
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-center">
                          <Play className="w-12 h-12 text-white mx-auto mb-2" />
                          <p className="text-sm text-gray-300">Professional Video Content</p>
                          <p className="text-xs text-gray-500">Real projects, real customers</p>
                        </div>
                      </div>
                    </div>
                    <div className="p-4">
                      <p className="text-sm text-gray-300">High-quality video showcasing your actual work, with customer testimonials and professional editing.</p>
                      <div className="mt-3 flex items-center gap-4 text-sm text-green-400">
                        <span>7%+ CTR</span>
                        <span>$10-15 CPL</span>
                        <span>High Trust</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Competitor Ads */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-3 h-3 rounded-full bg-red-500" />
                    <span className="text-sm font-medium text-red-400">Typical Contractor Ads</span>
                  </div>

                  <div className="bg-gray-900 border border-red-500/20 rounded-xl overflow-hidden">
                    <div className="aspect-video bg-gradient-to-br from-gray-800 to-gray-700 relative">
                      <div className="absolute inset-0 flex items-center justify-center p-4">
                        <div className="text-center">
                          <div className="w-16 h-16 bg-gray-700 rounded-lg mx-auto mb-2 flex items-center justify-center">
                            <span className="text-2xl">🏠</span>
                          </div>
                          <p className="text-lg font-bold text-gray-400">CHEAP REMODELING!!!</p>
                          <p className="text-xs text-gray-500">CALL NOW FOR FREE QUOTE</p>
                        </div>
                      </div>
                    </div>
                    <div className="p-4">
                      <p className="text-sm text-gray-400">Stock photos, clip art, all-caps text, and pushy sales language that screams "scam".</p>
                      <div className="mt-3 flex items-center gap-4 text-sm text-red-400">
                        <span>&lt;1% CTR</span>
                        <span>$50+ CPL</span>
                        <span>Low Trust</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Phone Preview */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Preview</h2>

            {/* Instagram-style phone mockup */}
            <div className="bg-black rounded-[2.5rem] p-3 shadow-2xl mx-auto max-w-[280px]">
              <div className="bg-gray-900 rounded-[2rem] overflow-hidden">
                {/* Status bar */}
                <div className="flex items-center justify-between px-6 py-2 text-xs text-white">
                  <span>9:41</span>
                  <div className="flex items-center gap-1">
                    <div className="w-4 h-2 border border-white rounded-sm">
                      <div className="w-2/3 h-full bg-white rounded-sm" />
                    </div>
                  </div>
                </div>

                {/* Instagram header */}
                <div className="flex items-center justify-between px-4 py-2 border-b border-white/5">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center text-xs font-bold">
                      TR
                    </div>
                    <div>
                      <p className="text-xs font-semibold">thompsonremodeling</p>
                      <p className="text-[10px] text-gray-400">Sponsored</p>
                    </div>
                  </div>
                  <MoreHorizontal className="w-4 h-4 text-gray-400" />
                </div>

                {/* Video area */}
                <div className="aspect-square bg-gradient-to-br from-gray-800 to-gray-700 relative">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <button
                      onClick={() => setIsPlaying(!isPlaying)}
                      className="w-16 h-16 rounded-full bg-white/10 backdrop-blur flex items-center justify-center transition-transform hover:scale-110"
                    >
                      {isPlaying ? (
                        <Pause className="w-6 h-6 text-white" />
                      ) : (
                        <Play className="w-6 h-6 text-white ml-1" />
                      )}
                    </button>
                  </div>
                  {/* Progress bar */}
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gray-600">
                    <div className="h-full w-1/3 bg-white" />
                  </div>
                </div>

                {/* Engagement buttons */}
                <div className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-4">
                    <Heart className="w-6 h-6" />
                    <MessageCircle className="w-6 h-6" />
                    <Share className="w-6 h-6" />
                  </div>
                  <Bookmark className="w-6 h-6" />
                </div>

                {/* Likes */}
                <div className="px-4 pb-2">
                  <p className="text-xs font-semibold">2,847 likes</p>
                </div>

                {/* Caption */}
                <div className="px-4 pb-4">
                  <p className="text-xs">
                    <span className="font-semibold">thompsonremodeling</span>
                    <span className="text-gray-300 ml-1">{selectedAd.copy.substring(0, 100)}...</span>
                  </p>
                  <p className="text-xs text-gray-500 mt-1">View all 124 comments</p>
                </div>
              </div>
            </div>

            {/* Platform Toggle */}
            <div className="flex items-center justify-center gap-4 mt-4">
              <button className="px-4 py-2 bg-gradient-to-r from-purple-600 via-pink-500 to-orange-400 rounded-lg text-sm font-medium">
                Instagram
              </button>
              <button className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm">
                Facebook
              </button>
            </div>

            {/* Ad Performance */}
            <div className="bg-gray-900 border border-white/5 rounded-xl p-4 mt-4">
              <h3 className="font-medium mb-3">This Ad&apos;s Performance</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-400">Impressions</span>
                  <span className="font-medium">{selectedAd.metrics.impressions.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-400">Clicks</span>
                  <span className="font-medium">{selectedAd.metrics.clicks.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-400">CTR</span>
                  <span className="font-medium text-green-400">{selectedAd.metrics.ctr}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-400">Leads Generated</span>
                  <span className="font-medium text-green-400">{selectedAd.metrics.leads}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-400">Cost Per Lead</span>
                  <span className="font-medium">${selectedAd.metrics.cpl}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-400">Amount Spent</span>
                  <span className="font-medium">${selectedAd.metrics.spent}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
