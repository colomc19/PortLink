-- PortLink Core Schema
-- Tables, indexes, triggers, and functions for the PortLink application.
-- Order matters: vessels must exist before pilot_report_rows (FK dependency).

-- ------------------------------------------------------------
-- FUNCTIONS
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION normalize_vessel_name(name TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN LOWER(
    TRIM(
      REGEXP_REPLACE(
        REGEXP_REPLACE(name, '\s+', ' ', 'g'),
        '[^a-z0-9 ]', '', 'g'
      )
    )
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ------------------------------------------------------------
-- TABLE: profiles
-- Extends auth.users with app-specific data.
-- ------------------------------------------------------------

CREATE TABLE profiles (
  id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name       TEXT NOT NULL,
  phone           TEXT,
  role            TEXT NOT NULL DEFAULT 'volunteer' CHECK (role IN ('admin', 'volunteer')),
  receives_alerts BOOLEAN NOT NULL DEFAULT FALSE,
  view_preference TEXT NOT NULL DEFAULT 'table' CHECK (view_preference IN ('table', 'card')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-create profile row when a new auth.users row is inserted.
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ------------------------------------------------------------
-- TABLE: pilot_reports
-- Raw inbound pilot report emails.
-- ------------------------------------------------------------

CREATE TABLE pilot_reports (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  received_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sender_email TEXT,
  subject      TEXT,
  raw_html     TEXT NOT NULL,
  raw_text     TEXT,
  parsed_at    TIMESTAMPTZ,
  parse_status TEXT NOT NULL DEFAULT 'pending'
               CHECK (parse_status IN ('pending', 'parsed', 'partial', 'failed')),
  parse_errors JSONB,
  row_count    INT DEFAULT 0,
  report_date  DATE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_pilot_reports_received ON pilot_reports (received_at DESC);
CREATE INDEX idx_pilot_reports_status   ON pilot_reports (parse_status) WHERE parse_status != 'parsed';

-- ------------------------------------------------------------
-- TABLE: vessels
-- Core entity — one row per vessel visit.
-- Must be created before pilot_report_rows due to FK.
-- ------------------------------------------------------------

CREATE TABLE vessels (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                    TEXT NOT NULL,
  name_normalized         TEXT NOT NULL,
  visit_start             DATE,
  visit_end               DATE,
  status                  TEXT NOT NULL DEFAULT 'arriving'
                          CHECK (status IN ('scheduled', 'arriving', 'at_anchor', 'in_port', 'sailing', 'sailed', 'cancelled')),
  terminal                TEXT,
  arrival_date            DATE,
  arrival_time            TIME,
  arrival_time_display    TEXT,
  sailing_date            DATE,
  sailing_time            TIME,
  sailing_time_display    TEXT,
  sailing_time_end        TIME,
  sailing_time_confidence TEXT NOT NULL DEFAULT 'unknown'
                          CHECK (sailing_time_confidence IN ('exact', 'range', 'approximate', 'unknown')),
  agent                   TEXT,
  notes                   TEXT,
  source                  TEXT NOT NULL DEFAULT 'pilot_report'
                          CHECK (source IN ('pilot_report', 'manual', 'harbor_master')),
  is_new                  BOOLEAN NOT NULL DEFAULT TRUE,
  new_since               TIMESTAMPTZ,
  has_manual_override     BOOLEAN NOT NULL DEFAULT FALSE,
  override_fields         JSONB DEFAULT '[]'::JSONB,
  needs_review            BOOLEAN NOT NULL DEFAULT FALSE,
  review_reason           TEXT,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by              UUID REFERENCES profiles(id),
  updated_by              UUID REFERENCES profiles(id)
);

CREATE INDEX idx_vessels_name_norm    ON vessels (name_normalized);
CREATE INDEX idx_vessels_status       ON vessels (status) WHERE status NOT IN ('sailed', 'cancelled');
CREATE INDEX idx_vessels_sailing      ON vessels (sailing_date, sailing_time) WHERE status = 'sailing' AND sailing_date IS NOT NULL;
CREATE INDEX idx_vessels_needs_review ON vessels (needs_review) WHERE needs_review = TRUE;
CREATE INDEX idx_vessels_is_new       ON vessels (is_new) WHERE is_new = TRUE;

CREATE TRIGGER vessels_updated_at
  BEFORE UPDATE ON vessels
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ------------------------------------------------------------
-- TABLE: pilot_report_rows
-- Individual parsed vessel rows from each pilot report.
-- Depends on vessels (FK), so created after vessels.
-- ------------------------------------------------------------

CREATE TABLE pilot_report_rows (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pilot_report_id UUID NOT NULL REFERENCES pilot_reports(id) ON DELETE CASCADE,
  vessel_id       UUID REFERENCES vessels(id) ON DELETE SET NULL,
  raw_vessel_name TEXT NOT NULL,
  raw_date        TEXT,
  raw_time_status TEXT,
  raw_terminal    TEXT,
  raw_agent       TEXT,
  raw_notes       TEXT,
  section         TEXT NOT NULL CHECK (section IN ('arrivals', 'sailings')),
  parsed_date     DATE,
  parsed_time     TIME,
  parsed_time_end TIME,
  parsed_status   TEXT,
  time_confidence TEXT NOT NULL DEFAULT 'exact'
                  CHECK (time_confidence IN ('exact', 'range', 'approximate', 'unknown')),
  needs_review    BOOLEAN NOT NULL DEFAULT FALSE,
  review_reason   TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_prr_pilot_report  ON pilot_report_rows (pilot_report_id);
CREATE INDEX idx_prr_vessel        ON pilot_report_rows (vessel_id) WHERE vessel_id IS NOT NULL;
CREATE INDEX idx_prr_needs_review  ON pilot_report_rows (needs_review) WHERE needs_review = TRUE;

-- ------------------------------------------------------------
-- TABLE: vessel_status_history
-- Immutable timeline of vessel status changes.
-- ------------------------------------------------------------

CREATE TABLE vessel_status_history (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vessel_id  UUID NOT NULL REFERENCES vessels(id) ON DELETE CASCADE,
  status     TEXT NOT NULL,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  source     TEXT NOT NULL CHECK (source IN ('pilot_report', 'manual', 'system', 'harbor_master')),
  source_id  UUID,
  details    JSONB,
  changed_by UUID REFERENCES profiles(id)
);

CREATE INDEX idx_vsh_vessel ON vessel_status_history (vessel_id, changed_at DESC);

-- ------------------------------------------------------------
-- TABLE: devices
-- The 8 wifi hotspot devices.
-- ------------------------------------------------------------

CREATE TABLE devices (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_number     INT NOT NULL UNIQUE CHECK (device_number BETWEEN 1 AND 20),
  label             TEXT NOT NULL,
  status            TEXT NOT NULL DEFAULT 'available'
                    CHECK (status IN ('available', 'assigned', 'needs_retrieval', 'maintenance')),
  current_vessel_id UUID REFERENCES vessels(id) ON DELETE SET NULL,
  assigned_at       TIMESTAMPTZ,
  notes             TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER devices_updated_at
  BEFORE UPDATE ON devices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ------------------------------------------------------------
-- TABLE: device_assignments
-- Checkout / checkin history for hotspot devices.
-- ------------------------------------------------------------

CREATE TABLE device_assignments (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id      UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  vessel_id      UUID NOT NULL REFERENCES vessels(id) ON DELETE CASCADE,
  checked_out_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  checked_out_by UUID REFERENCES profiles(id),
  checked_in_at  TIMESTAMPTZ,
  checked_in_by  UUID REFERENCES profiles(id),
  status         TEXT NOT NULL DEFAULT 'active'
                 CHECK (status IN ('active', 'returned', 'lost')),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_da_device_active         ON device_assignments (device_id) WHERE status = 'active';
CREATE INDEX idx_da_vessel_active         ON device_assignments (vessel_id) WHERE status = 'active';
CREATE UNIQUE INDEX idx_da_one_active_per_device ON device_assignments (device_id) WHERE status = 'active';

-- ------------------------------------------------------------
-- TABLE: alerts
-- Scheduled and sent sailing / retrieval notifications.
-- ------------------------------------------------------------

CREATE TABLE alerts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vessel_id       UUID NOT NULL REFERENCES vessels(id) ON DELETE CASCADE,
  device_id       UUID REFERENCES devices(id) ON DELETE SET NULL,
  assignment_id   UUID REFERENCES device_assignments(id) ON DELETE SET NULL,
  tier            TEXT NOT NULL CHECK (tier IN ('info', 'warning', 'urgent')),
  scheduled_for   TIMESTAMPTZ NOT NULL,
  -- Display-only copy of the vessel's sailing time (TIME, matching vessels.sailing_time).
  -- The actual alert timing lives in scheduled_for. Stored as TIME so the scheduler can
  -- insert vessel.sailing_time directly and the UI can render it as HH:MM.
  sailing_time    TIME,
  status          TEXT NOT NULL DEFAULT 'scheduled'
                  CHECK (status IN ('scheduled', 'sent', 'cancelled', 'failed')),
  message         TEXT NOT NULL,
  sent_at         TIMESTAMPTZ,
  cancelled_at    TIMESTAMPTZ,
  cancel_reason   TEXT,
  delivery_method TEXT CHECK (delivery_method IN ('sms', 'in_app', 'both')),
  delivery_status JSONB,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_alerts_scheduled  ON alerts (scheduled_for) WHERE status = 'scheduled';
CREATE INDEX idx_alerts_vessel     ON alerts (vessel_id);
CREATE INDEX idx_alerts_assignment ON alerts (assignment_id) WHERE status = 'scheduled';

CREATE TRIGGER alerts_updated_at
  BEFORE UPDATE ON alerts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ------------------------------------------------------------
-- TABLE: alert_recipients
-- Volunteers who receive SMS alerts.
-- ------------------------------------------------------------

CREATE TABLE alert_recipients (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  method     TEXT NOT NULL DEFAULT 'sms' CHECK (method IN ('sms', 'in_app')),
  enabled    BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_ar_profile_method ON alert_recipients (profile_id, method);

-- ------------------------------------------------------------
-- TABLE: ingestion_log
-- Email ingestion health audit trail.
-- ------------------------------------------------------------

CREATE TABLE ingestion_log (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type      TEXT NOT NULL
                  CHECK (event_type IN ('email_received', 'parse_started', 'parse_completed', 'parse_failed', 'no_report_warning')),
  pilot_report_id UUID REFERENCES pilot_reports(id),
  details         JSONB,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ingestion_log_recent ON ingestion_log (created_at DESC);
