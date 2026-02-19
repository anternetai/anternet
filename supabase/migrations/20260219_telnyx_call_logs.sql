-- Telnyx Call Logs
-- Migration: 2026-02-19
-- Creates telnyx_call_logs table to store call events from Telnyx webhooks

create table if not exists telnyx_call_logs (
  id uuid default gen_random_uuid() primary key,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),

  -- Lead linkage (nullable — not all calls may be linked to a known lead)
  lead_id uuid,

  -- Call identifiers from Telnyx
  telnyx_call_control_id text,
  telnyx_call_session_id text,
  telnyx_call_leg_id text,

  -- Call details
  direction text not null default 'outbound' check (direction in ('inbound', 'outbound')),
  from_number text,
  to_number text,
  status text not null default 'initiated' check (status in (
    'initiated', 'ringing', 'answered', 'bridged', 'completed', 'failed', 'busy', 'no_answer', 'cancelled'
  )),

  -- Duration in seconds (populated on call.hangup)
  duration integer default 0,

  -- Recording
  recording_url text,
  recording_id text,

  -- AI-powered transcription/summary
  transcription text,
  ai_summary text,

  -- User notes
  notes text,

  -- Metadata (raw event data for debugging)
  metadata jsonb default '{}'::jsonb
);

-- Indexes for fast lookups
create index if not exists idx_telnyx_call_logs_lead_id on telnyx_call_logs(lead_id);
create index if not exists idx_telnyx_call_logs_status on telnyx_call_logs(status);
create index if not exists idx_telnyx_call_logs_direction on telnyx_call_logs(direction);
create index if not exists idx_telnyx_call_logs_created_at on telnyx_call_logs(created_at desc);
create index if not exists idx_telnyx_call_logs_from_number on telnyx_call_logs(from_number);
create index if not exists idx_telnyx_call_logs_to_number on telnyx_call_logs(to_number);
create index if not exists idx_telnyx_call_logs_session_id on telnyx_call_logs(telnyx_call_session_id);
create index if not exists idx_telnyx_call_logs_control_id on telnyx_call_logs(telnyx_call_control_id);

-- Enable RLS (admin-only feature, allow all for authenticated)
alter table telnyx_call_logs enable row level security;

create policy "Allow all for authenticated users" on telnyx_call_logs
  for all using (true) with check (true);

-- Auto-update updated_at trigger
create or replace function update_telnyx_call_logs_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger telnyx_call_logs_updated_at
  before update on telnyx_call_logs
  for each row
  execute function update_telnyx_call_logs_updated_at();
