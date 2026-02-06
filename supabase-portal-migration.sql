-- ============================================================
-- HomeField Hub - Client Portal Migration
-- Run in Supabase SQL Editor (Dashboard → SQL Editor → New query)
-- ============================================================
-- This adds what the portal needs ON TOP of existing tables.
-- Safe to run multiple times (all IF NOT EXISTS / IF NOT EXISTS).
-- ============================================================


-- 1. Add portal auth columns to agency_clients
-- ============================================================
ALTER TABLE agency_clients ADD COLUMN IF NOT EXISTS auth_user_id UUID REFERENCES auth.users(id);
ALTER TABLE agency_clients ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'client' CHECK (role IN ('client', 'admin'));
ALTER TABLE agency_clients ADD COLUMN IF NOT EXISTS service_type TEXT;

-- Index for fast auth lookups
CREATE INDEX IF NOT EXISTS idx_agency_clients_auth_user_id ON agency_clients(auth_user_id);


-- 2. Add 'showed' and 'rescheduled' to appointments status
-- ============================================================
-- The existing CHECK constraint only allows: scheduled, confirmed, completed, cancelled, no_show
-- We need to add: showed, rescheduled
ALTER TABLE appointments DROP CONSTRAINT IF EXISTS appointments_status_check;
ALTER TABLE appointments ADD CONSTRAINT appointments_status_check
  CHECK (status IN ('scheduled', 'confirmed', 'showed', 'completed', 'cancelled', 'no_show', 'rescheduled'));

-- Add outcome columns for the portal
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS outcome_quote_given BOOLEAN;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS outcome_quote_amount DECIMAL(10,2);
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS outcome_job_sold BOOLEAN;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS outcome_job_amount DECIMAL(10,2);


-- 3. Create push_subscriptions table (for web push notifications)
-- ============================================================
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  keys JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(endpoint)
);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id ON push_subscriptions(user_id);


-- 4. Enable RLS on all portal tables
-- ============================================================
ALTER TABLE agency_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;


-- 5. RLS Policies - Clients see only their own data
-- ============================================================
-- Drop if they exist (safe re-run)
DROP POLICY IF EXISTS "clients_read_own" ON agency_clients;
DROP POLICY IF EXISTS "client_leads_read" ON leads;
DROP POLICY IF EXISTS "client_appointments_read" ON appointments;
DROP POLICY IF EXISTS "client_conversations_read" ON sms_conversations;
DROP POLICY IF EXISTS "client_payments_read" ON payments;
DROP POLICY IF EXISTS "push_subscriptions_own" ON push_subscriptions;

-- agency_clients: users can read their own record
CREATE POLICY "clients_read_own" ON agency_clients
  FOR SELECT USING (auth_user_id = auth.uid());

-- leads: clients see leads belonging to their agency_client record
CREATE POLICY "client_leads_read" ON leads
  FOR SELECT USING (
    client_id IN (SELECT id FROM agency_clients WHERE auth_user_id = auth.uid())
  );

-- appointments: clients see their own appointments
CREATE POLICY "client_appointments_read" ON appointments
  FOR SELECT USING (
    client_id IN (SELECT id FROM agency_clients WHERE auth_user_id = auth.uid())
  );

-- sms_conversations: clients see conversations for their leads
CREATE POLICY "client_conversations_read" ON sms_conversations
  FOR SELECT USING (
    lead_id IN (
      SELECT id FROM leads WHERE client_id IN (
        SELECT id FROM agency_clients WHERE auth_user_id = auth.uid()
      )
    )
  );

-- payments: clients see their own payments
CREATE POLICY "client_payments_read" ON payments
  FOR SELECT USING (
    client_id IN (SELECT id FROM agency_clients WHERE auth_user_id = auth.uid())
  );

-- push_subscriptions: users manage their own subscriptions
CREATE POLICY "push_subscriptions_own" ON push_subscriptions
  FOR ALL USING (user_id = auth.uid());


-- 6. Admin policies - admins can see everything
-- ============================================================
DROP POLICY IF EXISTS "admin_read_all_clients" ON agency_clients;
DROP POLICY IF EXISTS "admin_read_all_leads" ON leads;
DROP POLICY IF EXISTS "admin_read_all_appointments" ON appointments;
DROP POLICY IF EXISTS "admin_read_all_conversations" ON sms_conversations;
DROP POLICY IF EXISTS "admin_read_all_payments" ON payments;

CREATE POLICY "admin_read_all_clients" ON agency_clients
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM agency_clients WHERE auth_user_id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "admin_read_all_leads" ON leads
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM agency_clients WHERE auth_user_id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "admin_read_all_appointments" ON appointments
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM agency_clients WHERE auth_user_id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "admin_read_all_conversations" ON sms_conversations
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM agency_clients WHERE auth_user_id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "admin_read_all_payments" ON payments
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM agency_clients WHERE auth_user_id = auth.uid() AND role = 'admin')
  );


-- 7. Allow appointment updates from authenticated users (for Mark Showed/No-Show)
-- ============================================================
DROP POLICY IF EXISTS "client_appointments_update" ON appointments;

CREATE POLICY "client_appointments_update" ON appointments
  FOR UPDATE USING (
    client_id IN (SELECT id FROM agency_clients WHERE auth_user_id = auth.uid())
  );


-- 8. Service role bypass (for n8n/backend operations)
-- ============================================================
-- The Supabase service_role key already bypasses RLS.
-- No additional policies needed for backend operations.


-- ============================================================
-- SETUP INSTRUCTIONS (after running this SQL):
-- ============================================================
--
-- 1. Create an auth user:
--    Supabase Dashboard → Authentication → Users → Add User
--    Email: anthony@homefieldhub.com (or your email)
--    Password: (choose one)
--
-- 2. Link it to your agency_clients record:
--    UPDATE agency_clients
--    SET auth_user_id = '<paste-auth-user-uuid-here>',
--        role = 'admin'
--    WHERE id = '661a1b96-709a-4ef5-ac06-318a5a46c8e6';
--
-- 3. Enable Realtime on tables you want live updates for:
--    Supabase Dashboard → Database → Replication
--    Enable for: leads, sms_conversations, appointments
--
-- 4. Test: go to homefieldhub.com/portal/login and sign in
-- ============================================================
