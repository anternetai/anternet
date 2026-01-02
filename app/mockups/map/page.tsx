"use client"

import { useState } from "react"
import { MapPin, DollarSign, Home, Filter, Layers, ZoomIn, ZoomOut, Phone, ChevronRight, X } from "lucide-react"

// Fake lead locations for Charlotte area
const LEADS = [
  { id: 1, name: "Michael Thompson", lat: 35.134, lng: -80.845, project: "Kitchen Remodel", budget: "$75K-100K", status: "hot", score: 92 },
  { id: 2, name: "Sarah Mitchell", lat: 35.186, lng: -80.823, project: "Bathroom Remodel", budget: "$25K-50K", status: "warm", score: 78 },
  { id: 3, name: "David Chen", lat: 35.177, lng: -80.803, project: "Full Home Remodel", budget: "$200K+", status: "hot", score: 95 },
  { id: 4, name: "Jennifer Adams", lat: 35.112, lng: -80.856, project: "Deck / Patio", budget: "$25K-50K", status: "warm", score: 81 },
  { id: 5, name: "Robert Williams", lat: 35.125, lng: -80.789, project: "Basement Finish", budget: "$50K-100K", status: "new", score: 65 },
  { id: 6, name: "Lisa Park", lat: 35.198, lng: -80.790, project: "Kitchen Remodel", budget: "$100K-200K", status: "hot", score: 88 },
  { id: 7, name: "James Miller", lat: 35.145, lng: -80.912, project: "Room Addition", budget: "$100K-200K", status: "new", score: 71 },
]

// High income neighborhoods
const HIGH_INCOME_AREAS = [
  { name: "Myers Park", center: { lat: 35.177, lng: -80.823 }, income: "$180K+" },
  { name: "Eastover", center: { lat: 35.186, lng: -80.803 }, income: "$220K+" },
  { name: "SouthPark", center: { lat: 35.130, lng: -80.845 }, income: "$150K+" },
  { name: "Ballantyne", center: { lat: 35.053, lng: -80.845 }, income: "$140K+" },
]

const statusColors = {
  hot: "bg-red-500",
  warm: "bg-orange-500",
  new: "bg-blue-500",
}

export default function MapMockup() {
  const [selectedLead, setSelectedLead] = useState<typeof LEADS[0] | null>(null)
  const [showHighIncome, setShowHighIncome] = useState(true)
  const [showLeads, setShowLeads] = useState(true)

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
              <button className="text-orange-400 font-medium">Map View</button>
              <button className="text-gray-400 hover:text-white">Conversations</button>
              <button className="text-gray-400 hover:text-white">Ads</button>
              <button className="text-gray-400 hover:text-white">Reports</button>
            </div>
          </div>
        </div>
      </nav>

      <div className="relative h-[calc(100vh-73px)]">
        {/* Map Background - Styled dark map placeholder */}
        <div className="absolute inset-0 bg-gray-900">
          {/* Grid to simulate map */}
          <div
            className="absolute inset-0 opacity-10"
            style={{
              backgroundImage: `
                linear-gradient(rgba(255,255,255,.05) 1px, transparent 1px),
                linear-gradient(90deg, rgba(255,255,255,.05) 1px, transparent 1px)
              `,
              backgroundSize: '40px 40px'
            }}
          />

          {/* Simulated roads */}
          <div className="absolute top-1/2 left-0 right-0 h-px bg-gray-700/50" />
          <div className="absolute top-0 bottom-0 left-1/2 w-px bg-gray-700/50" />
          <div className="absolute top-1/3 left-0 right-0 h-px bg-gray-700/30" />
          <div className="absolute top-2/3 left-0 right-0 h-px bg-gray-700/30" />
          <div className="absolute top-0 bottom-0 left-1/3 w-px bg-gray-700/30" />
          <div className="absolute top-0 bottom-0 left-2/3 w-px bg-gray-700/30" />

          {/* High Income Area Highlights */}
          {showHighIncome && HIGH_INCOME_AREAS.map((area, i) => (
            <div
              key={area.name}
              className="absolute"
              style={{
                left: `${20 + (i * 20)}%`,
                top: `${25 + (i * 12)}%`,
              }}
            >
              <div className="relative">
                <div className="w-32 h-32 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center">
                  <div className="text-center">
                    <p className="text-green-400 font-medium text-sm">{area.name}</p>
                    <p className="text-green-300/70 text-xs">{area.income}</p>
                  </div>
                </div>
              </div>
            </div>
          ))}

          {/* Lead Markers */}
          {showLeads && LEADS.map((lead, i) => (
            <button
              key={lead.id}
              onClick={() => setSelectedLead(lead)}
              className="absolute transform -translate-x-1/2 -translate-y-1/2 group"
              style={{
                left: `${15 + (i * 12)}%`,
                top: `${20 + (i * 10)}%`,
              }}
            >
              <div className={`relative ${selectedLead?.id === lead.id ? 'z-20' : 'z-10'}`}>
                {/* Pulse ring for hot leads */}
                {lead.status === 'hot' && (
                  <div className="absolute inset-0 animate-ping">
                    <div className={`w-8 h-8 rounded-full ${statusColors[lead.status as keyof typeof statusColors]} opacity-30`} />
                  </div>
                )}
                {/* Marker */}
                <div className={`w-8 h-8 rounded-full ${statusColors[lead.status as keyof typeof statusColors]} flex items-center justify-center shadow-lg transform transition-transform group-hover:scale-110 ${selectedLead?.id === lead.id ? 'scale-125 ring-2 ring-white' : ''}`}>
                  <Home className="w-4 h-4 text-white" />
                </div>
                {/* Tooltip */}
                <div className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-800 rounded-lg shadow-xl whitespace-nowrap transition-opacity ${selectedLead?.id === lead.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                  <p className="font-medium text-sm">{lead.name}</p>
                  <p className="text-xs text-gray-400">{lead.project}</p>
                  <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 rotate-45 w-2 h-2 bg-gray-800" />
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Controls Panel */}
        <div className="absolute top-4 left-4 space-y-2 z-30">
          {/* Zoom controls */}
          <div className="bg-gray-900 border border-white/10 rounded-lg overflow-hidden">
            <button className="p-3 hover:bg-gray-800 block border-b border-white/5">
              <ZoomIn className="w-5 h-5 text-gray-400" />
            </button>
            <button className="p-3 hover:bg-gray-800 block">
              <ZoomOut className="w-5 h-5 text-gray-400" />
            </button>
          </div>

          {/* Layer toggles */}
          <div className="bg-gray-900 border border-white/10 rounded-lg p-3 space-y-3">
            <div className="flex items-center gap-2 text-sm">
              <Layers className="w-4 h-4 text-gray-400" />
              <span className="text-gray-400 font-medium">Layers</span>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showLeads}
                onChange={(e) => setShowLeads(e.target.checked)}
                className="rounded border-gray-600 bg-gray-800 text-orange-500 focus:ring-orange-500"
              />
              <span className="text-sm text-gray-300">Show Leads</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showHighIncome}
                onChange={(e) => setShowHighIncome(e.target.checked)}
                className="rounded border-gray-600 bg-gray-800 text-green-500 focus:ring-green-500"
              />
              <span className="text-sm text-gray-300">High Income Areas</span>
            </label>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-gray-900 border border-white/10 rounded-full px-4 py-2 flex items-center gap-4 z-30">
          <Filter className="w-4 h-4 text-gray-400" />
          <div className="flex items-center gap-2">
            <button className="px-3 py-1 bg-orange-500/10 text-orange-400 rounded-full text-sm font-medium">
              All ({LEADS.length})
            </button>
            <button className="px-3 py-1 text-gray-400 hover:bg-gray-800 rounded-full text-sm flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-red-500" />
              Hot (3)
            </button>
            <button className="px-3 py-1 text-gray-400 hover:bg-gray-800 rounded-full text-sm flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-orange-500" />
              Warm (2)
            </button>
            <button className="px-3 py-1 text-gray-400 hover:bg-gray-800 rounded-full text-sm flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              New (2)
            </button>
          </div>
        </div>

        {/* Stats Bar */}
        <div className="absolute bottom-4 left-4 bg-gray-900 border border-white/10 rounded-xl p-4 z-30">
          <div className="grid grid-cols-3 gap-6">
            <div>
              <p className="text-2xl font-bold text-white">{LEADS.length}</p>
              <p className="text-sm text-gray-400">Active Leads</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-green-400">$475K+</p>
              <p className="text-sm text-gray-400">Pipeline Value</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-orange-400">3</p>
              <p className="text-sm text-gray-400">Hot Leads</p>
            </div>
          </div>
        </div>

        {/* Territory Info */}
        <div className="absolute bottom-4 right-4 bg-gray-900 border border-white/10 rounded-xl p-4 z-30">
          <div className="flex items-center gap-3 mb-3">
            <MapPin className="w-5 h-5 text-orange-400" />
            <div>
              <p className="font-medium">Your Territory</p>
              <p className="text-sm text-gray-400">South Charlotte, NC</p>
            </div>
          </div>
          <div className="text-sm text-gray-400">
            <span className="text-green-400 font-medium">Exclusive</span> - No competing contractors
          </div>
        </div>

        {/* Selected Lead Panel */}
        {selectedLead && (
          <div className="absolute top-4 right-4 w-80 bg-gray-900 border border-white/10 rounded-xl overflow-hidden z-30 shadow-2xl">
            <div className="p-4 border-b border-white/5 flex items-center justify-between">
              <h3 className="font-semibold">Lead Details</h3>
              <button
                onClick={() => setSelectedLead(null)}
                className="p-1 hover:bg-gray-800 rounded"
              >
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full ${statusColors[selectedLead.status as keyof typeof statusColors]} flex items-center justify-center`}>
                  <Home className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="font-medium">{selectedLead.name}</p>
                  <p className="text-sm text-gray-400">{selectedLead.project}</p>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Budget</span>
                  <span className="text-green-400 font-medium">{selectedLead.budget}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Lead Score</span>
                  <span className="font-medium">{selectedLead.score}/100</span>
                </div>
              </div>
              <div className="flex gap-2">
                <button className="flex-1 py-2 px-4 bg-gray-800 text-white rounded-lg text-sm hover:bg-gray-700">
                  View Profile
                </button>
                <button className="flex-1 py-2 px-4 bg-gradient-to-r from-orange-600 to-orange-500 text-white rounded-lg text-sm font-medium flex items-center justify-center gap-2">
                  <Phone className="w-4 h-4" />
                  Call
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
