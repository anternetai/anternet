"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";

function PreCallContent() {
  const searchParams = useSearchParams();
  const [showCalendarOptions, setShowCalendarOptions] = useState(false);
  const [calendarAdded, setCalendarAdded] = useState(false);

  // Get details from URL params or use defaults
  const prospectName = searchParams.get("name") || "there";
  const callDate = searchParams.get("date") || ""; // Format: 2026-01-15
  const callTime = searchParams.get("time") || ""; // Format: 14:00
  const meetLink = searchParams.get("meet") || "https://meet.google.com";

  // Meeting config
  const MEETING_TITLE = "HomeField Hub Strategy Call";
  const MEETING_DURATION_MINUTES = 15;
  const MEETING_DESCRIPTION = `Strategy call with HomeField Hub team.\n\nJoin: ${meetLink}\n\nWhat we'll cover:\n• Your current situation\n• How we generate qualified leads\n• Next steps if it's a fit`;

  // Generate calendar URLs
  const getGoogleCalendarUrl = () => {
    if (!callDate || !callTime) return null;

    const startDate = new Date(`${callDate}T${callTime}:00`);
    const endDate = new Date(startDate.getTime() + MEETING_DURATION_MINUTES * 60000);

    const formatDate = (date: Date) => {
      return date.toISOString().replace(/-|:|\.\d{3}/g, "").slice(0, -1);
    };

    const params = new URLSearchParams({
      action: "TEMPLATE",
      text: MEETING_TITLE,
      dates: `${formatDate(startDate)}/${formatDate(endDate)}`,
      details: MEETING_DESCRIPTION,
      location: meetLink,
    });

    return `https://calendar.google.com/calendar/render?${params.toString()}`;
  };

  const downloadIcsFile = () => {
    if (!callDate || !callTime) return;

    const startDate = new Date(`${callDate}T${callTime}:00`);
    const endDate = new Date(startDate.getTime() + MEETING_DURATION_MINUTES * 60000);

    const formatIcsDate = (date: Date) => {
      return date.toISOString().replace(/-|:|\.\d{3}/g, "").slice(0, -1) + "Z";
    };

    const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//HomeField Hub//NONSGML v1.0//EN
BEGIN:VEVENT
UID:${Date.now()}@homefieldhub.com
DTSTAMP:${formatIcsDate(new Date())}
DTSTART:${formatIcsDate(startDate)}
DTEND:${formatIcsDate(endDate)}
SUMMARY:${MEETING_TITLE}
DESCRIPTION:${MEETING_DESCRIPTION.replace(/\n/g, "\\n")}
LOCATION:${meetLink}
END:VEVENT
END:VCALENDAR`;

    const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "homefield-hub-call.ics";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setCalendarAdded(true);
    setShowCalendarOptions(false);
  };

  const handleGoogleCalendar = () => {
    const url = getGoogleCalendarUrl();
    if (url) {
      window.open(url, "_blank");
      setCalendarAdded(true);
      setShowCalendarOptions(false);
    }
  };

  const hasScheduledTime = callDate && callTime;

  // Format date for display
  const getFormattedDateTime = () => {
    if (!callDate || !callTime) return null;
    const date = new Date(`${callDate}T${callTime}:00`);
    return date.toLocaleString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Header */}
      <header className="py-6 px-4 border-b border-zinc-800">
        <div className="max-w-4xl mx-auto flex items-center justify-center">
          <h1 className="text-2xl font-bold tracking-tight">
            <span className="text-orange-500">HomeField</span> Hub
          </h1>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-12">
        {/* Pre-headline */}
        <p className="text-orange-500 font-medium text-center mb-2">
          WATCH BEFORE YOUR CALL
        </p>

        {/* Headline */}
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-8">
          How We Fill Your Calendar With <br className="hidden md:block" />
          <span className="text-orange-500">Qualified Appointments</span>
        </h2>

        {/* Trust Badges */}
        <div className="flex flex-wrap justify-center gap-6 mb-8 text-sm text-zinc-400">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-orange-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span>Pay-Per-Appointment</span>
          </div>
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-orange-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span>No Risk Guarantee</span>
          </div>
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
            <span>Home Service Specialists</span>
          </div>
        </div>

        {/* Video */}
        <div className="aspect-video bg-zinc-900 rounded-xl overflow-hidden mb-8 border border-zinc-800">
          <video
            controls
            className="w-full h-full"
            poster=""
            preload="metadata"
          >
            <source src="/vsl.mp4" type="video/mp4" />
            Your browser does not support the video tag.
          </video>
        </div>

        {/* Action Section */}
        <div className="bg-zinc-900 rounded-xl p-6 md:p-8 border border-zinc-800 text-center">
          <h3 className="text-xl font-semibold mb-3">
            {hasScheduledTime ? "Your Call is Confirmed" : "Ready to Get Started?"}
          </h3>

          {hasScheduledTime && getFormattedDateTime() && (
            <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg py-3 px-4 mb-4 inline-block">
              <p className="text-orange-400 font-medium">{getFormattedDateTime()}</p>
            </div>
          )}

          <p className="text-zinc-400 mb-6 max-w-md mx-auto">
            {hasScheduledTime
              ? "Watch the video above so we can hit the ground running. Add this call to your calendar so you don't miss it."
              : "Watch the video above, then book a quick 15-minute call to see if we're a fit."}
          </p>

          {hasScheduledTime ? (
            <div className="relative inline-block">
              {!calendarAdded ? (
                <>
                  <button
                    onClick={() => setShowCalendarOptions(!showCalendarOptions)}
                    className="bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 px-8 rounded-lg transition-colors inline-flex items-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    Add to Calendar
                    <svg className={`w-4 h-4 transition-transform ${showCalendarOptions ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {showCalendarOptions && (
                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl overflow-hidden z-10 min-w-[200px]">
                      <button
                        onClick={handleGoogleCalendar}
                        className="w-full px-4 py-3 text-left hover:bg-zinc-700 transition-colors flex items-center gap-3"
                      >
                        <svg className="w-5 h-5" viewBox="0 0 24 24">
                          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                        </svg>
                        Google Calendar
                      </button>
                      <button
                        onClick={downloadIcsFile}
                        className="w-full px-4 py-3 text-left hover:bg-zinc-700 transition-colors flex items-center gap-3 border-t border-zinc-700"
                      >
                        <svg className="w-5 h-5 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        Apple / Outlook (.ics)
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <div className="bg-green-500/20 text-green-400 py-3 px-6 rounded-lg inline-flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Added to Calendar
                </div>
              )}
            </div>
          ) : (
            <a
              href="/demo"
              className="bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 px-8 rounded-lg transition-colors inline-flex items-center gap-2"
            >
              Book Your Call
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </a>
          )}

          {/* Meeting Details */}
          <div className="mt-8 pt-6 border-t border-zinc-800">
            <div className="grid md:grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-zinc-500 mb-1">Duration</p>
                <p className="font-medium">15 Minutes</p>
              </div>
              <div>
                <p className="text-zinc-500 mb-1">Platform</p>
                <p className="font-medium">Google Meet</p>
              </div>
              <div>
                <p className="text-zinc-500 mb-1">What to Expect</p>
                <p className="font-medium">Strategy Discussion</p>
              </div>
            </div>
          </div>
        </div>

        {/* What We'll Cover */}
        <div className="mt-8 grid md:grid-cols-3 gap-4">
          <div className="bg-zinc-900/50 rounded-lg p-5 border border-zinc-800">
            <div className="text-orange-500 text-2xl mb-3">1</div>
            <h4 className="font-semibold mb-2">Your Current Situation</h4>
            <p className="text-zinc-400 text-sm">We'll look at your market, current lead flow, and goals.</p>
          </div>
          <div className="bg-zinc-900/50 rounded-lg p-5 border border-zinc-800">
            <div className="text-orange-500 text-2xl mb-3">2</div>
            <h4 className="font-semibold mb-2">The System</h4>
            <p className="text-zinc-400 text-sm">How we generate and qualify leads specifically for your service area.</p>
          </div>
          <div className="bg-zinc-900/50 rounded-lg p-5 border border-zinc-800">
            <div className="text-orange-500 text-2xl mb-3">3</div>
            <h4 className="font-semibold mb-2">Next Steps</h4>
            <p className="text-zinc-400 text-sm">If it's a fit, we'll map out exactly how to get started.</p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-6 px-4 border-t border-zinc-800 mt-12">
        <div className="max-w-4xl mx-auto text-center text-zinc-500 text-sm">
          HomeField Hub
        </div>
      </footer>
    </div>
  );
}

export default function PreCallPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-zinc-950" />}>
      <PreCallContent />
    </Suspense>
  );
}
