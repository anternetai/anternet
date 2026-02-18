-- Power Dialer System
-- Migration: 2026-02-18 (after cold_call_tracker)
-- Creates dialer_leads table for power dialer queue management

-- Dialer leads table
create table if not exists dialer_leads (
  id uuid default gen_random_uuid() primary key,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),

  -- Lead info
  state text,
  business_name text,
  phone_number text unique,
  owner_name text,
  first_name text,
  website text,
  timezone text, -- ET, CT, MT, PT (derived from state)

  -- Call tracking
  status text default 'queued' check (status in (
    'queued', 'in_progress', 'callback', 'completed', 'archived'
  )),
  attempt_count int default 0,
  max_attempts int default 5,
  last_called_at timestamptz,
  next_call_at timestamptz, -- for callbacks
  last_outcome text check (last_outcome is null or last_outcome in (
    'no_answer', 'voicemail', 'gatekeeper', 'conversation',
    'demo_booked', 'not_interested', 'wrong_number', 'callback'
  )),

  -- Results
  demo_booked boolean default false,
  demo_date timestamptz,
  not_interested boolean default false,
  wrong_number boolean default false,

  -- Notes
  notes text,

  -- Source
  import_batch text,
  sheet_row_id text
);

-- Call history per lead (tracks each attempt)
create table if not exists dialer_call_history (
  id uuid default gen_random_uuid() primary key,
  created_at timestamptz default now(),
  lead_id uuid references dialer_leads(id) on delete cascade,
  attempt_number int not null,
  outcome text not null check (outcome in (
    'no_answer', 'voicemail', 'gatekeeper', 'conversation',
    'demo_booked', 'not_interested', 'wrong_number', 'callback'
  )),
  notes text,
  demo_date timestamptz,
  callback_at timestamptz,
  call_date date default current_date,
  call_time time default localtime
);

-- Indexes for fast queue queries
create index if not exists idx_dialer_leads_status on dialer_leads(status);
create index if not exists idx_dialer_leads_timezone on dialer_leads(timezone);
create index if not exists idx_dialer_leads_next_call on dialer_leads(next_call_at);
create index if not exists idx_dialer_leads_phone on dialer_leads(phone_number);
create index if not exists idx_dialer_leads_last_called on dialer_leads(last_called_at);
create index if not exists idx_dialer_leads_status_tz on dialer_leads(status, timezone);
create index if not exists idx_dialer_call_history_lead on dialer_call_history(lead_id);
create index if not exists idx_dialer_call_history_date on dialer_call_history(call_date desc);

-- Enable RLS but allow all operations (admin-only feature)
alter table dialer_leads enable row level security;
alter table dialer_call_history enable row level security;

create policy "Allow all for authenticated users" on dialer_leads
  for all using (true) with check (true);

create policy "Allow all for authenticated users" on dialer_call_history
  for all using (true) with check (true);

-- Call transcripts (AI-powered transcription & summarization)
create table if not exists call_transcripts (
  id uuid default gen_random_uuid() primary key,
  created_at timestamptz default now(),
  lead_id uuid references dialer_leads(id) on delete set null,
  call_log_id uuid references call_logs(id) on delete set null,
  phone_number text,
  duration_seconds int,
  raw_transcript text,
  ai_summary text,
  ai_disposition text,
  ai_notes text
);

create index if not exists idx_call_transcripts_lead on call_transcripts(lead_id);
create index if not exists idx_call_transcripts_created on call_transcripts(created_at desc);

alter table call_transcripts enable row level security;

create policy "Allow all for authenticated users" on call_transcripts
  for all using (true) with check (true);

-- Phone number pool (rotation to prevent spam flagging)
create table if not exists dialer_phone_numbers (
  id uuid default gen_random_uuid() primary key,
  created_at timestamptz default now(),
  phone_number text unique not null,
  friendly_name text,
  area_code text,
  state text,
  twilio_sid text,
  status text default 'active' check (status in ('active', 'cooling', 'retired', 'flagged')),
  calls_today int default 0,
  calls_this_hour int default 0,
  last_used_at timestamptz,
  total_calls int default 0,
  spam_reports int default 0,
  max_calls_per_hour int default 20,
  cooldown_minutes int default 30
);

create index if not exists idx_dialer_phone_numbers_status on dialer_phone_numbers(status);

alter table dialer_phone_numbers enable row level security;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'dialer_phone_numbers' AND policyname = 'allow_all_phone_numbers') THEN
    create policy "allow_all_phone_numbers" on dialer_phone_numbers for all using (true) with check (true);
  END IF;
END $$;

-- Auto-update updated_at trigger
create or replace function update_dialer_leads_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger dialer_leads_updated_at
  before update on dialer_leads
  for each row
  execute function update_dialer_leads_updated_at();
