-- Cold Call Analytics Tracker
-- Migration: 2026-02-18
-- Creates tables for individual call logging and daily aggregated stats

-- Individual call logs (for quick-log mode)
create table if not exists call_logs (
  id uuid default gen_random_uuid() primary key,
  created_at timestamptz default now(),
  call_date date default current_date,
  call_time time default localtime,
  business_name text,
  phone_number text,
  contact_made boolean default false,
  conversation boolean default false,
  demo_booked boolean default false,
  demo_held boolean default false,
  deal_closed boolean default false,
  outcome text check (outcome in (
    'no_answer', 'voicemail', 'gatekeeper', 'conversation',
    'demo_booked', 'not_interested', 'callback'
  )),
  notes text,
  call_duration_seconds int,
  lead_id text
);

-- Daily aggregated call stats
create table if not exists daily_call_stats (
  id uuid default gen_random_uuid() primary key,
  call_date date unique not null default current_date,
  total_dials int default 0,
  contacts int default 0,
  conversations int default 0,
  demos_booked int default 0,
  demos_held int default 0,
  deals_closed int default 0,
  hours_dialed numeric(4,2) default 0,
  notes text,
  created_at timestamptz default now()
);

-- Indexes for fast date-range queries
create index if not exists idx_call_logs_call_date on call_logs (call_date desc);
create index if not exists idx_call_logs_outcome on call_logs (outcome);
create index if not exists idx_call_logs_created_at on call_logs (created_at desc);
create index if not exists idx_daily_call_stats_call_date on daily_call_stats (call_date desc);

-- Enable RLS but allow all operations (admin-only feature)
alter table call_logs enable row level security;
alter table daily_call_stats enable row level security;

-- Policy: allow all operations for authenticated users (Anthony is the only admin)
create policy "Allow all for authenticated users" on call_logs
  for all using (true) with check (true);

create policy "Allow all for authenticated users" on daily_call_stats
  for all using (true) with check (true);
