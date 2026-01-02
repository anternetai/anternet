"use client"

import { useState } from "react"
import { Phone, Mail, MapPin, Clock, DollarSign, ChevronRight, Search, Bell, Settings, User, Filter, MoreVertical, CheckCircle, AlertCircle, Calendar } from "lucide-react"

// Fake lead data
const LEADS = [
  {
    id: 1,
    name: "Michael Thompson",
    phone: "(704) 555-0123",
    email: "mthompson@email.com",
    address: "1247 Settlers Lane, Charlotte, NC 28277",
    projectType: "Kitchen Remodel",
    budget: "$75,000 - $100,000",
    timeline: "Ready to start ASAP",
    paymentMethod: "Home Equity",
    homeAge: "10-30 years",
    status: "hot",
    score: 92,
    createdAt: "2 min ago",
    aiNotes: "Homeowner mentioned previous contractor fell through. Highly motivated. Decision maker confirmed.",
  },
  {
    id: 2,
    name: "Sarah Mitchell",
    phone: "(980) 555-0456",
    email: "sarah.m@gmail.com",
    address: "892 Providence Rd, Charlotte, NC 28207",
    projectType: "Bathroom Remodel",
    budget: "$25,000 - $50,000",
    timeline: "Within 1-3 months",
    paymentMethod: "Cash",
    homeAge: "30-50 years",
    status: "warm",
    score: 78,
    createdAt: "15 min ago",
    aiNotes: "Wants master bath + guest bath. Has design ideas ready. Waiting for spouse to join call.",
  },
  {
    id: 3,
    name: "David Chen",
    phone: "(704) 555-0789",
    email: "dchen@work.com",
    address: "3421 Colony Rd, Charlotte, NC 28211",
    projectType: "Full Home Remodel",
    budget: "$200,000+",
    timeline: "3-6 months out",
    paymentMethod: "Financing",
    homeAge: "50+ years",
    status: "hot",
    score: 95,
    createdAt: "32 min ago",
    aiNotes: "Recently purchased 1960s home. Full renovation planned. Has architect involved. Budget confirmed.",
  },
  {
    id: 4,
    name: "Jennifer Adams",
    phone: "(980) 555-1234",
    email: "jadams@email.com",
    address: "567 Sharon View Rd, Charlotte, NC 28226",
    projectType: "Deck / Patio",
    budget: "$25,000 - $50,000",
    timeline: "Ready to start ASAP",
    paymentMethod: "Cash",
    homeAge: "0-10 years",
    status: "warm",
    score: 81,
    createdAt: "1 hour ago",
    aiNotes: "Looking for covered outdoor living space. Has Pinterest board ready. Prefers composite materials.",
  },
  {
    id: 5,
    name: "Robert Williams",
    phone: "(704) 555-5678",
    email: "rwilliams@business.com",
    address: "2890 Carmel Rd, Charlotte, NC 28226",
    projectType: "Basement Finish",
    budget: "$50,000 - $100,000",
    timeline: "Within 1-3 months",
    paymentMethod: "Home Equity",
    homeAge: "10-30 years",
    status: "new",
    score: 65,
    createdAt: "2 hours ago",
    aiNotes: "Wants home theater + wet bar. Needs to confirm HOA approval. Follow up scheduled.",
  },
]

const statusColors = {
  hot: "bg-red-500/10 text-red-400 border-red-500/20",
  warm: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  new: "bg-blue-500/10 text-blue-400 border-blue-500/20",
}

const statusLabels = {
  hot: "Hot Lead",
  warm: "Warm",
  new: "New",
}

export default function DashboardMockup() {
  const [selectedLead, setSelectedLead] = useState(LEADS[0])
  const [searchQuery, setSearchQuery] = useState("")

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
              <button className="text-orange-400 font-medium">Dashboard</button>
              <button className="text-gray-400 hover:text-white">Map View</button>
              <button className="text-gray-400 hover:text-white">Conversations</button>
              <button className="text-gray-400 hover:text-white">Ads</button>
              <button className="text-gray-400 hover:text-white">Reports</button>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button className="relative p-2 text-gray-400 hover:text-white">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
            </button>
            <button className="p-2 text-gray-400 hover:text-white">
              <Settings className="w-5 h-5" />
            </button>
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center text-sm font-medium">
              JD
            </div>
          </div>
        </div>
      </nav>

      <div className="flex">
        {/* Leads List */}
        <div className="w-[420px] border-r border-white/5 h-[calc(100vh-73px)] overflow-auto">
          {/* Search and Filter */}
          <div className="p-4 border-b border-white/5 space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="text"
                placeholder="Search leads..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm focus:outline-none focus:border-orange-500"
              />
            </div>
            <div className="flex items-center gap-2">
              <button className="px-3 py-1.5 bg-orange-500/10 text-orange-400 border border-orange-500/20 rounded-lg text-sm font-medium">
                All Leads (5)
              </button>
              <button className="px-3 py-1.5 text-gray-400 hover:bg-gray-800 rounded-lg text-sm">
                Hot (2)
              </button>
              <button className="px-3 py-1.5 text-gray-400 hover:bg-gray-800 rounded-lg text-sm">
                Today (3)
              </button>
              <button className="p-1.5 text-gray-400 hover:bg-gray-800 rounded-lg ml-auto">
                <Filter className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Lead Cards */}
          <div className="divide-y divide-white/5">
            {LEADS.map((lead) => (
              <button
                key={lead.id}
                onClick={() => setSelectedLead(lead)}
                className={`w-full p-4 text-left transition-colors ${
                  selectedLead.id === lead.id
                    ? "bg-gray-800/50"
                    : "hover:bg-gray-900"
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="font-medium text-white">{lead.name}</h3>
                    <p className="text-sm text-gray-400">{lead.projectType}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 rounded-md text-xs font-medium border ${statusColors[lead.status as keyof typeof statusColors]}`}>
                      {statusLabels[lead.status as keyof typeof statusLabels]}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {lead.createdAt}
                  </span>
                  <span className="flex items-center gap-1">
                    <DollarSign className="w-3 h-3" />
                    {lead.budget}
                  </span>
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        lead.score >= 90 ? "bg-green-500" :
                        lead.score >= 75 ? "bg-orange-500" :
                        "bg-blue-500"
                      }`}
                      style={{ width: `${lead.score}%` }}
                    />
                  </div>
                  <span className="text-xs text-gray-400">{lead.score}%</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Lead Detail */}
        <div className="flex-1 h-[calc(100vh-73px)] overflow-auto">
          {selectedLead && (
            <div className="p-6">
              {/* Header */}
              <div className="flex items-start justify-between mb-6">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h1 className="text-2xl font-bold">{selectedLead.name}</h1>
                    <span className={`px-3 py-1 rounded-lg text-sm font-medium border ${statusColors[selectedLead.status as keyof typeof statusColors]}`}>
                      {statusLabels[selectedLead.status as keyof typeof statusLabels]}
                    </span>
                  </div>
                  <p className="text-gray-400">{selectedLead.projectType} &bull; {selectedLead.createdAt}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button className="px-4 py-2 bg-gray-800 text-white rounded-lg text-sm hover:bg-gray-700 flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Schedule
                  </button>
                  <button className="px-4 py-2 bg-gradient-to-r from-orange-600 to-orange-500 text-white rounded-lg text-sm font-medium hover:from-orange-500 hover:to-orange-400 flex items-center gap-2">
                    <Phone className="w-4 h-4" />
                    Call Now
                  </button>
                  <button className="p-2 text-gray-400 hover:text-white">
                    <MoreVertical className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Lead Score Card */}
              <div className="bg-gray-900 border border-white/5 rounded-xl p-6 mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-semibold">Lead Quality Score</h2>
                  <span className={`text-2xl font-bold ${
                    selectedLead.score >= 90 ? "text-green-400" :
                    selectedLead.score >= 75 ? "text-orange-400" :
                    "text-blue-400"
                  }`}>
                    {selectedLead.score}/100
                  </span>
                </div>
                <div className="h-3 bg-gray-800 rounded-full overflow-hidden mb-4">
                  <div
                    className={`h-full rounded-full transition-all ${
                      selectedLead.score >= 90 ? "bg-gradient-to-r from-green-500 to-green-400" :
                      selectedLead.score >= 75 ? "bg-gradient-to-r from-orange-500 to-orange-400" :
                      "bg-gradient-to-r from-blue-500 to-blue-400"
                    }`}
                    style={{ width: `${selectedLead.score}%` }}
                  />
                </div>
                <div className="grid grid-cols-4 gap-4 text-center">
                  <div>
                    <div className="flex items-center justify-center gap-1 text-green-400 mb-1">
                      <CheckCircle className="w-4 h-4" />
                    </div>
                    <p className="text-xs text-gray-400">Budget Confirmed</p>
                  </div>
                  <div>
                    <div className="flex items-center justify-center gap-1 text-green-400 mb-1">
                      <CheckCircle className="w-4 h-4" />
                    </div>
                    <p className="text-xs text-gray-400">Homeowner</p>
                  </div>
                  <div>
                    <div className="flex items-center justify-center gap-1 text-green-400 mb-1">
                      <CheckCircle className="w-4 h-4" />
                    </div>
                    <p className="text-xs text-gray-400">Timeline Set</p>
                  </div>
                  <div>
                    <div className="flex items-center justify-center gap-1 text-green-400 mb-1">
                      <CheckCircle className="w-4 h-4" />
                    </div>
                    <p className="text-xs text-gray-400">Decision Maker</p>
                  </div>
                </div>
              </div>

              {/* Info Grid */}
              <div className="grid grid-cols-2 gap-6 mb-6">
                {/* Contact Info */}
                <div className="bg-gray-900 border border-white/5 rounded-xl p-6">
                  <h2 className="font-semibold mb-4">Contact Information</h2>
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center">
                        <Phone className="w-5 h-5 text-orange-400" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-400">Phone</p>
                        <p className="font-medium">{selectedLead.phone}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center">
                        <Mail className="w-5 h-5 text-orange-400" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-400">Email</p>
                        <p className="font-medium">{selectedLead.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center">
                        <MapPin className="w-5 h-5 text-orange-400" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-400">Address</p>
                        <p className="font-medium">{selectedLead.address}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Project Details */}
                <div className="bg-gray-900 border border-white/5 rounded-xl p-6">
                  <h2 className="font-semibold mb-4">Project Details</h2>
                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Project Type</span>
                      <span className="font-medium">{selectedLead.projectType}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Budget Range</span>
                      <span className="font-medium text-green-400">{selectedLead.budget}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Timeline</span>
                      <span className="font-medium">{selectedLead.timeline}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Payment Method</span>
                      <span className="font-medium">{selectedLead.paymentMethod}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Home Age</span>
                      <span className="font-medium">{selectedLead.homeAge}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* AI Notes */}
              <div className="bg-gradient-to-br from-orange-500/10 to-orange-600/5 border border-orange-500/20 rounded-xl p-6">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 bg-orange-500/20 rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <h2 className="font-semibold text-orange-400">AI Call Summary</h2>
                </div>
                <p className="text-gray-300 leading-relaxed">{selectedLead.aiNotes}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
