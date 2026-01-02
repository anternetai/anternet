"use client"

import { useState } from "react"
import { Phone, MessageSquare, Clock, User, Play, ChevronRight, Search, Filter, PhoneIncoming, PhoneOutgoing, Bot, CheckCircle } from "lucide-react"

// Fake conversation data
const CONVERSATIONS = [
  {
    id: 1,
    leadName: "Michael Thompson",
    phone: "(704) 555-0123",
    project: "Kitchen Remodel",
    lastContact: "2 min ago",
    status: "active",
    callDuration: "4:32",
    type: "inbound",
    aiHandled: true,
    transcript: [
      { speaker: "ai", text: "Hi, this is HomeField Hub calling on behalf of Thompson Remodeling. Am I speaking with Michael?", time: "0:00" },
      { speaker: "customer", text: "Yes, this is Michael. I filled out the form about a kitchen remodel.", time: "0:08" },
      { speaker: "ai", text: "That's right! Thanks for reaching out. I see you're interested in a kitchen remodel. Can you tell me a bit about what you're looking to do?", time: "0:15" },
      { speaker: "customer", text: "We've got an older kitchen, probably from the 90s. We want to completely gut it and modernize everything - new cabinets, countertops, appliances, the works.", time: "0:28" },
      { speaker: "ai", text: "Got it! A full kitchen renovation. That's a great investment in your home. Do you have a rough budget range in mind for this project?", time: "0:45" },
      { speaker: "customer", text: "We're thinking somewhere between 75 and 100 thousand. We've been saving up for this.", time: "0:55" },
      { speaker: "ai", text: "Perfect, that's a solid budget for a quality kitchen remodel. And are you the homeowner and primary decision maker on this project?", time: "1:05" },
      { speaker: "customer", text: "Yes, my wife and I own the home. She's on board with this too.", time: "1:15" },
      { speaker: "ai", text: "Excellent! One last question - how soon are you looking to get started?", time: "1:22" },
      { speaker: "customer", text: "As soon as possible honestly. Our contractor fell through last month and we're ready to go.", time: "1:30" },
      { speaker: "ai", text: "I understand - that's frustrating when that happens. The good news is Thompson Remodeling has availability. I'd like to schedule a free consultation where they can come see your space and give you a detailed quote. Would tomorrow afternoon work for you?", time: "1:42" },
      { speaker: "customer", text: "Tomorrow works great. How about 2pm?", time: "2:00" },
      { speaker: "ai", text: "2pm tomorrow is perfect. I've got you scheduled. You'll receive a confirmation text shortly with all the details. Is there anything else I can help you with?", time: "2:08" },
      { speaker: "customer", text: "No, that's everything. Thanks!", time: "2:20" },
      { speaker: "ai", text: "You're welcome, Michael! Thompson Remodeling is looking forward to meeting you tomorrow. Have a great day!", time: "2:25" },
    ],
    qualificationData: {
      budget: "$75K - $100K",
      timeline: "ASAP",
      homeowner: true,
      decisionMaker: true,
      appointmentBooked: true,
    }
  },
  {
    id: 2,
    leadName: "Sarah Mitchell",
    phone: "(980) 555-0456",
    project: "Bathroom Remodel",
    lastContact: "15 min ago",
    status: "pending",
    callDuration: "3:15",
    type: "inbound",
    aiHandled: true,
    transcript: [
      { speaker: "ai", text: "Hi, this is HomeField Hub. Am I speaking with Sarah?", time: "0:00" },
      { speaker: "customer", text: "Yes, hi! I submitted a quote request for bathroom work.", time: "0:06" },
      { speaker: "ai", text: "Great, thanks for reaching out! I see you're interested in a bathroom remodel. Tell me more about what you have in mind.", time: "0:12" },
      { speaker: "customer", text: "We want to redo our master bathroom and the guest bath. The master is the priority.", time: "0:22" },
    ],
    qualificationData: {
      budget: "$25K - $50K",
      timeline: "1-3 months",
      homeowner: true,
      decisionMaker: false,
      appointmentBooked: false,
    }
  },
  {
    id: 3,
    leadName: "David Chen",
    phone: "(704) 555-0789",
    project: "Full Home Remodel",
    lastContact: "32 min ago",
    status: "completed",
    callDuration: "6:45",
    type: "outbound",
    aiHandled: true,
    transcript: [],
    qualificationData: {
      budget: "$200K+",
      timeline: "3-6 months",
      homeowner: true,
      decisionMaker: true,
      appointmentBooked: true,
    }
  },
]

export default function ConversationsMockup() {
  const [selectedConvo, setSelectedConvo] = useState(CONVERSATIONS[0])
  const [searchQuery, setSearchQuery] = useState("")

  const statusColors = {
    active: "bg-green-500/10 text-green-400 border-green-500/20",
    pending: "bg-orange-500/10 text-orange-400 border-orange-500/20",
    completed: "bg-gray-500/10 text-gray-400 border-gray-500/20",
  }

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
              <button className="text-orange-400 font-medium">Conversations</button>
              <button className="text-gray-400 hover:text-white">Ads</button>
              <button className="text-gray-400 hover:text-white">Reports</button>
            </div>
          </div>
        </div>
      </nav>

      <div className="flex h-[calc(100vh-73px)]">
        {/* Conversations List */}
        <div className="w-[380px] border-r border-white/5 flex flex-col">
          {/* Search */}
          <div className="p-4 border-b border-white/5">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="text"
                placeholder="Search conversations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm focus:outline-none focus:border-orange-500"
              />
            </div>
            <div className="flex items-center gap-2 mt-3">
              <button className="px-3 py-1.5 bg-orange-500/10 text-orange-400 border border-orange-500/20 rounded-lg text-sm font-medium">
                All
              </button>
              <button className="px-3 py-1.5 text-gray-400 hover:bg-gray-800 rounded-lg text-sm flex items-center gap-1">
                <Phone className="w-3 h-3" />
                Calls
              </button>
              <button className="px-3 py-1.5 text-gray-400 hover:bg-gray-800 rounded-lg text-sm flex items-center gap-1">
                <MessageSquare className="w-3 h-3" />
                SMS
              </button>
            </div>
          </div>

          {/* Conversation List */}
          <div className="flex-1 overflow-auto divide-y divide-white/5">
            {CONVERSATIONS.map((convo) => (
              <button
                key={convo.id}
                onClick={() => setSelectedConvo(convo)}
                className={`w-full p-4 text-left transition-colors ${
                  selectedConvo.id === convo.id
                    ? "bg-gray-800/50"
                    : "hover:bg-gray-900"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="relative">
                    <div className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center">
                      <User className="w-5 h-5 text-gray-400" />
                    </div>
                    {convo.aiHandled && (
                      <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-orange-500 flex items-center justify-center">
                        <Bot className="w-3 h-3 text-white" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-medium text-white truncate">{convo.leadName}</h3>
                      <span className="text-xs text-gray-500">{convo.lastContact}</span>
                    </div>
                    <p className="text-sm text-gray-400 truncate">{convo.project}</p>
                    <div className="flex items-center gap-2 mt-2">
                      {convo.type === "inbound" ? (
                        <PhoneIncoming className="w-3 h-3 text-green-400" />
                      ) : (
                        <PhoneOutgoing className="w-3 h-3 text-blue-400" />
                      )}
                      <span className="text-xs text-gray-500">{convo.callDuration}</span>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium border ${statusColors[convo.status as keyof typeof statusColors]}`}>
                        {convo.status}
                      </span>
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Conversation Detail */}
        <div className="flex-1 flex flex-col">
          {selectedConvo && (
            <>
              {/* Header */}
              <div className="p-4 border-b border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center">
                    <User className="w-5 h-5 text-gray-400" />
                  </div>
                  <div>
                    <h2 className="font-semibold">{selectedConvo.leadName}</h2>
                    <p className="text-sm text-gray-400">{selectedConvo.phone}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button className="px-4 py-2 bg-gray-800 text-white rounded-lg text-sm hover:bg-gray-700 flex items-center gap-2">
                    <MessageSquare className="w-4 h-4" />
                    Send SMS
                  </button>
                  <button className="px-4 py-2 bg-gradient-to-r from-orange-600 to-orange-500 text-white rounded-lg text-sm font-medium flex items-center gap-2">
                    <Phone className="w-4 h-4" />
                    Call
                  </button>
                </div>
              </div>

              <div className="flex-1 flex">
                {/* Transcript */}
                <div className="flex-1 overflow-auto p-4 space-y-4">
                  {/* Call Recording Player */}
                  <div className="bg-gray-900 border border-white/5 rounded-xl p-4 mb-6">
                    <div className="flex items-center gap-4">
                      <button className="w-12 h-12 rounded-full bg-orange-500 flex items-center justify-center hover:bg-orange-400 transition-colors">
                        <Play className="w-5 h-5 text-white ml-0.5" />
                      </button>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium">Call Recording</span>
                          <span className="text-sm text-gray-400">{selectedConvo.callDuration}</span>
                        </div>
                        <div className="h-1.5 bg-gray-800 rounded-full">
                          <div className="h-full w-1/3 bg-orange-500 rounded-full" />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Transcript Messages */}
                  <h3 className="text-sm font-medium text-gray-400 mb-4">Transcript</h3>
                  {selectedConvo.transcript.map((msg, i) => (
                    <div
                      key={i}
                      className={`flex gap-3 ${msg.speaker === 'ai' ? '' : 'flex-row-reverse'}`}
                    >
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                        msg.speaker === 'ai' ? 'bg-orange-500/20' : 'bg-gray-800'
                      }`}>
                        {msg.speaker === 'ai' ? (
                          <Bot className="w-4 h-4 text-orange-400" />
                        ) : (
                          <User className="w-4 h-4 text-gray-400" />
                        )}
                      </div>
                      <div className={`max-w-[70%] ${msg.speaker === 'ai' ? '' : 'text-right'}`}>
                        <div className={`inline-block rounded-2xl px-4 py-2 ${
                          msg.speaker === 'ai'
                            ? 'bg-gray-800 text-gray-200'
                            : 'bg-orange-500/10 text-orange-200'
                        }`}>
                          <p className="text-sm">{msg.text}</p>
                        </div>
                        <p className="text-xs text-gray-500 mt-1 px-2">{msg.time}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Qualification Sidebar */}
                <div className="w-72 border-l border-white/5 p-4 overflow-auto">
                  <h3 className="font-semibold mb-4">Qualification Data</h3>

                  <div className="space-y-4">
                    <div className="bg-gray-900 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircle className="w-4 h-4 text-green-400" />
                        <span className="text-sm font-medium">Budget Confirmed</span>
                      </div>
                      <p className="text-lg font-semibold text-green-400">{selectedConvo.qualificationData.budget}</p>
                    </div>

                    <div className="bg-gray-900 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <Clock className="w-4 h-4 text-orange-400" />
                        <span className="text-sm font-medium">Timeline</span>
                      </div>
                      <p className="text-sm text-gray-300">{selectedConvo.qualificationData.timeline}</p>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between p-2 bg-gray-900 rounded-lg">
                        <span className="text-sm text-gray-400">Homeowner</span>
                        {selectedConvo.qualificationData.homeowner ? (
                          <CheckCircle className="w-5 h-5 text-green-400" />
                        ) : (
                          <span className="text-sm text-gray-500">No</span>
                        )}
                      </div>
                      <div className="flex items-center justify-between p-2 bg-gray-900 rounded-lg">
                        <span className="text-sm text-gray-400">Decision Maker</span>
                        {selectedConvo.qualificationData.decisionMaker ? (
                          <CheckCircle className="w-5 h-5 text-green-400" />
                        ) : (
                          <span className="text-sm text-gray-500">Pending</span>
                        )}
                      </div>
                      <div className="flex items-center justify-between p-2 bg-gray-900 rounded-lg">
                        <span className="text-sm text-gray-400">Appointment</span>
                        {selectedConvo.qualificationData.appointmentBooked ? (
                          <CheckCircle className="w-5 h-5 text-green-400" />
                        ) : (
                          <span className="text-sm text-orange-400">Not Yet</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* AI Insights */}
                  <div className="mt-6 p-4 bg-gradient-to-br from-orange-500/10 to-orange-600/5 border border-orange-500/20 rounded-xl">
                    <div className="flex items-center gap-2 mb-2">
                      <Bot className="w-4 h-4 text-orange-400" />
                      <span className="text-sm font-medium text-orange-400">AI Insights</span>
                    </div>
                    <p className="text-sm text-gray-300">
                      High intent lead. Previous contractor fell through - motivated to move quickly. Budget confirmed and decision maker verified.
                    </p>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
