-- =========================================================
-- Migration: call_recordings table
-- Created: 2026-02-24
-- Purpose: AI Call Intelligence — transcription, disposition,
--          coaching, and follow-up scheduling
-- =========================================================

CREATE TABLE IF NOT EXISTS call_recordings (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamptz DEFAULT now(),
  lead_id uuid REFERENCES dialer_leads(id),
  call_history_id uuid,
  duration_seconds integer,
  recording_url text,
  storage_path text,

  -- Transcription
  transcription_status text DEFAULT 'pending'
    CHECK (transcription_status IN ('pending', 'processing', 'completed', 'failed')),
  raw_transcript text,
  transcript_segments jsonb,

  -- AI Analysis
  ai_summary text,
  ai_disposition text,
  ai_coaching jsonb,
  ai_follow_up_recommendation text
    CHECK (ai_follow_up_recommendation IN ('2_days', '1_week', '1_month', 'do_not_call', 'none')),
  ai_notes text,
  processed_at timestamptz
);

-- Index for quick lead lookup
CREATE INDEX IF NOT EXISTS idx_call_recordings_lead_id
  ON call_recordings(lead_id);

-- Index for status queries
CREATE INDEX IF NOT EXISTS idx_call_recordings_transcription_status
  ON call_recordings(transcription_status);

-- Index for date-based queries
CREATE INDEX IF NOT EXISTS idx_call_recordings_created_at
  ON call_recordings(created_at DESC);
