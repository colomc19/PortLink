-- PortLink RLS Policies
-- Enables Row Level Security on all application tables and defines access policies.
--
-- NOTE: every policy is scoped `TO authenticated`. Without an explicit role, Postgres
-- policies apply to the `public` role, which in Supabase includes the unauthenticated
-- `anon` key — that would expose every table to anyone holding the public anon key.
-- Server-side routes (cron, email ingestion) use the service_role key, which bypasses
-- RLS entirely, so they are unaffected by these policies.

-- ------------------------------------------------------------
-- HELPER FUNCTION
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ------------------------------------------------------------
-- ENABLE RLS ON ALL TABLES
-- ------------------------------------------------------------

ALTER TABLE profiles            ENABLE ROW LEVEL SECURITY;
ALTER TABLE pilot_reports       ENABLE ROW LEVEL SECURITY;
ALTER TABLE pilot_report_rows   ENABLE ROW LEVEL SECURITY;
ALTER TABLE vessels             ENABLE ROW LEVEL SECURITY;
ALTER TABLE vessel_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE devices             ENABLE ROW LEVEL SECURITY;
ALTER TABLE device_assignments  ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts              ENABLE ROW LEVEL SECURITY;
ALTER TABLE alert_recipients    ENABLE ROW LEVEL SECURITY;
ALTER TABLE ingestion_log       ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------
-- PROFILES
-- All authenticated users can read any profile.
-- Users can update their own profile; admins can update any profile.
-- Only admins (or the user themselves via the signup trigger) can insert.
-- ------------------------------------------------------------

CREATE POLICY "profiles_select"       ON profiles FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "profiles_update_own"   ON profiles FOR UPDATE TO authenticated USING (id = auth.uid());
CREATE POLICY "profiles_admin_update" ON profiles FOR UPDATE TO authenticated USING (is_admin());
CREATE POLICY "profiles_admin_insert" ON profiles FOR INSERT TO authenticated WITH CHECK (is_admin() OR id = auth.uid());

-- Privilege-escalation guard.
-- profiles_update_own lets a user update their OWN row, but `role` lives on that
-- same row — without this, any volunteer could set role = 'admin' via the public
-- Supabase client (bypassing the API route's field filtering), and requireAdmin()
-- would then trust it. Column-level privileges restrict self-service updates to
-- non-sensitive fields regardless of RLS. Admin-driven role changes go through the
-- service_role key (see /api/admin/users/[id]/role), which bypasses these grants.
REVOKE UPDATE ON profiles FROM authenticated;
GRANT UPDATE (full_name, phone, view_preference, receives_alerts, updated_at)
  ON profiles TO authenticated;

-- ------------------------------------------------------------
-- VESSELS
-- All authenticated users can read; only admins can write.
-- ------------------------------------------------------------

CREATE POLICY "vessels_select"       ON vessels FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "vessels_admin_insert" ON vessels FOR INSERT TO authenticated WITH CHECK (is_admin());
CREATE POLICY "vessels_admin_update" ON vessels FOR UPDATE TO authenticated USING (is_admin());

-- ------------------------------------------------------------
-- DEVICES
-- All authenticated users can read and update (volunteers check devices in/out).
-- ------------------------------------------------------------

CREATE POLICY "devices_select" ON devices FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "devices_update" ON devices FOR UPDATE TO authenticated USING (TRUE);

-- ------------------------------------------------------------
-- DEVICE_ASSIGNMENTS
-- All authenticated users can read, insert, and update.
-- ------------------------------------------------------------

CREATE POLICY "da_select" ON device_assignments FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "da_insert" ON device_assignments FOR INSERT TO authenticated WITH CHECK (TRUE);
CREATE POLICY "da_update" ON device_assignments FOR UPDATE TO authenticated USING (TRUE);

-- ------------------------------------------------------------
-- ALERTS
-- All authenticated users can read (service_role writes via cron).
-- ------------------------------------------------------------

CREATE POLICY "alerts_select" ON alerts FOR SELECT TO authenticated USING (TRUE);

-- ------------------------------------------------------------
-- PILOT_REPORTS & PILOT_REPORT_ROWS
-- All authenticated users can read (service_role writes via email ingest).
-- ------------------------------------------------------------

CREATE POLICY "pr_select"  ON pilot_reports     FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "prr_select" ON pilot_report_rows FOR SELECT TO authenticated USING (TRUE);

-- ------------------------------------------------------------
-- VESSEL_STATUS_HISTORY
-- All authenticated users can read (immutable — no client writes).
-- ------------------------------------------------------------

CREATE POLICY "vsh_select" ON vessel_status_history FOR SELECT TO authenticated USING (TRUE);

-- ------------------------------------------------------------
-- INGESTION_LOG
-- All authenticated users can read (service_role writes).
-- ------------------------------------------------------------

CREATE POLICY "il_select" ON ingestion_log FOR SELECT TO authenticated USING (TRUE);

-- ------------------------------------------------------------
-- ALERT_RECIPIENTS
-- All authenticated users can read; only admins can write.
-- ------------------------------------------------------------

CREATE POLICY "ar_select"      ON alert_recipients FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "ar_admin_write" ON alert_recipients FOR ALL TO authenticated USING (is_admin());
