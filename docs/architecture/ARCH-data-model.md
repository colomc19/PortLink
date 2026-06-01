# ARCH-data-model: Database Schema & Data Model

**Product:** PortLink
**Author:** Architect (AI-assisted)
**Date:** 2026-03-24
**Status:** Draft

---

## Design Principles

1. **Pilot Report is the primary data source.** Raw emails are always stored. Parsed data is derived and correctable.
2. **Manual overrides take precedence.** Any field manually edited by an admin is "pinned" until the admin clears it.
3. **Vessel identity is by normalized name + visit.** The same vessel name visiting the port at different times produces separate vessel records (visits). Within a single visit window, multiple Pilot Report mentions merge into one record.
4. **Device safety is enforced at the data layer.** A device cannot be in two places at once. Constraints prevent double-assignment.
5. **All timestamps are stored in UTC.** Display layer converts to Central Time (America/Chicago).

---

## Entity Relationship Overview

```
profiles (extends auth.users)
    |
    +-- audit fields on most tables (created_by, updated_by)

pilot_reports (raw email storage)
    |
    +-- pilot_report_rows (individual parsed rows)
         |
         +-- links to --> vessels (via vessel_id after merge)

vessels (the core entity)
    |
    +-- vessel_status_history (timeline of changes)
    |
    +-- device_assignments (which device is on this vessel)
    |     |
    |     +-- links to --> devices
    |
    +-- alerts (scheduled/sent notifications)

devices (the 8 wifi hotspots)

alert_recipients (who gets SMS alerts)
```

---

## Tables

### 1. `profiles`

Extends Supabase `auth.users`. Stores app-specific user data.

```sql
CREATE TABLE profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name   TEXT NOT NULL,
  phone       TEXT,                          -- E.164 format for SMS
  role        TEXT NOT NULL DEFAULT 'volunteer'
              CHECK (role IN ('admin', 'volunteer')),
  receives_alerts BOOLEAN NOT NULL DEFAULT FALSE,
  view_preference TEXT NOT NULL DEFAULT 'table'
              CHECK (view_preference IN ('table', 'card')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
```

---

### 2. `pilot_reports`

Stores every raw Pilot Report email for audit and debugging.

```sql
CREATE TABLE pilot_reports (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  received_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sender_email    TEXT,
  subject         TEXT,
  raw_html        TEXT NOT NULL,              -- Full email HTML body
  raw_text        TEXT,                       -- Plain text fallback
  parsed_at       TIMESTAMPTZ,
  parse_status    TEXT NOT NULL DEFAULT 'pending'
                  CHECK (parse_status IN ('pending', 'parsed', 'partial', 'failed')),
  parse_errors    JSONB,                      -- Array of error descriptions
  row_count       INT DEFAULT 0,              -- How many rows were extracted
  report_date     DATE,                       -- The date the report covers
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_pilot_reports_received ON pilot_reports (received_at DESC);
CREATE INDEX idx_pilot_reports_status ON pilot_reports (parse_status)
  WHERE parse_status != 'parsed';
```

---

### 3. `pilot_report_rows`

Individual rows parsed from a Pilot Report. One row per vessel mention per report.

```sql
CREATE TABLE pilot_report_rows (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pilot_report_id UUID NOT NULL REFERENCES pilot_reports(id) ON DELETE CASCADE,
  vessel_id       UUID REFERENCES vessels(id) ON DELETE SET NULL,  -- linked after merge

  -- Raw parsed fields (exactly as extracted from HTML)
  raw_vessel_name TEXT NOT NULL,
  raw_date        TEXT,
  raw_time_status TEXT,                       -- e.g. "0800 ANCHOR--1800 PILOT"
  raw_terminal    TEXT,
  raw_agent       TEXT,
  raw_notes       TEXT,

  -- Parsed/interpreted fields
  section         TEXT NOT NULL CHECK (section IN ('arrivals', 'sailings')),
  parsed_date     DATE,
  parsed_time     TIME,                       -- Best-effort; NULL if ambiguous
  parsed_time_end TIME,                       -- For ranges like "17-1800"
  parsed_status   TEXT,                       -- 'anchor', 'pilot', 'boarded', 'docked', etc.
  time_confidence TEXT NOT NULL DEFAULT 'exact'
                  CHECK (time_confidence IN ('exact', 'range', 'approximate', 'unknown')),

  -- Flags
  needs_review    BOOLEAN NOT NULL DEFAULT FALSE,
  review_reason   TEXT,                       -- Why it was flagged

  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_prr_pilot_report ON pilot_report_rows (pilot_report_id);
CREATE INDEX idx_prr_vessel ON pilot_report_rows (vessel_id) WHERE vessel_id IS NOT NULL;
CREATE INDEX idx_prr_needs_review ON pilot_report_rows (needs_review) WHERE needs_review = TRUE;
```

---

### 4. `vessels`

The core entity. Represents a single vessel visit to the Port of Mobile.

```sql
CREATE TABLE vessels (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identity
  name            TEXT NOT NULL,              -- Display name (may be cleaned/normalized)
  name_normalized TEXT NOT NULL,              -- Lowercase, trimmed, for dedup matching

  -- Visit window
  visit_start     DATE,                       -- Earliest date this vessel was seen
  visit_end       DATE,                       -- Date the vessel sailed (NULL if still in port)

  -- Current state (latest known)
  status          TEXT NOT NULL DEFAULT 'arriving'
                  CHECK (status IN (
                    'scheduled',    -- Harbor Master only (Phase 2)
                    'arriving',     -- Expected to arrive
                    'at_anchor',    -- Arrived but not docked
                    'in_port',      -- Docked at terminal
                    'sailing',      -- Departure scheduled
                    'sailed',       -- Has left
                    'cancelled'     -- Won't arrive / removed
                  )),

  -- Location & schedule
  terminal        TEXT,
  arrival_date    DATE,
  arrival_time    TIME,                       -- NULL if unknown
  arrival_time_display TEXT,                  -- Original text: "0200", "AM", etc.
  sailing_date    DATE,
  sailing_time    TIME,                       -- NULL if ambiguous; used for alert calc
  sailing_time_display TEXT,                  -- Original text for UI display
  sailing_time_end TIME,                      -- End of range if "17-1800" type
  sailing_time_confidence TEXT NOT NULL DEFAULT 'unknown'
                  CHECK (sailing_time_confidence IN ('exact', 'range', 'approximate', 'unknown')),

  -- Metadata
  agent           TEXT,                       -- Shipping agent / line
  notes           TEXT,

  -- Data provenance
  source          TEXT NOT NULL DEFAULT 'pilot_report'
                  CHECK (source IN ('pilot_report', 'manual', 'harbor_master')),
  is_new          BOOLEAN NOT NULL DEFAULT TRUE,  -- "New" badge; cleared after 30 min or view
  new_since       TIMESTAMPTZ,                    -- When it became "new"

  -- Manual override tracking
  has_manual_override BOOLEAN NOT NULL DEFAULT FALSE,
  override_fields JSONB DEFAULT '[]'::JSONB,  -- List of field names that are manually pinned

  -- Parse status
  needs_review    BOOLEAN NOT NULL DEFAULT FALSE,
  review_reason   TEXT,

  -- Audit
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by      UUID REFERENCES profiles(id),
  updated_by      UUID REFERENCES profiles(id)
);

-- Deduplication index: normalized name + overlapping visit window
CREATE INDEX idx_vessels_name_norm ON vessels (name_normalized);
CREATE INDEX idx_vessels_status ON vessels (status) WHERE status NOT IN ('sailed', 'cancelled');
CREATE INDEX idx_vessels_sailing ON vessels (sailing_date, sailing_time)
  WHERE status = 'sailing' AND sailing_date IS NOT NULL;
CREATE INDEX idx_vessels_needs_review ON vessels (needs_review) WHERE needs_review = TRUE;
CREATE INDEX idx_vessels_is_new ON vessels (is_new) WHERE is_new = TRUE;

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER vessels_updated_at
  BEFORE UPDATE ON vessels
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

**Vessel Name Normalization Strategy:**

```sql
-- Normalization function for vessel dedup
CREATE OR REPLACE FUNCTION normalize_vessel_name(name TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN LOWER(
    TRIM(
      REGEXP_REPLACE(
        REGEXP_REPLACE(name, '\s+', ' ', 'g'),  -- collapse whitespace
        '[^a-z0-9 ]', '', 'g'                    -- remove punctuation
      )
    )
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;
```

The dedup algorithm (in application code) works as follows:
1. Normalize the incoming vessel name.
2. Search `vessels` where `name_normalized` matches AND `status NOT IN ('sailed', 'cancelled')` AND `visit_start` is within a reasonable window (7 days).
3. If found, update the existing record (respecting manual overrides).
4. If not found, create a new vessel record.

This handles: minor spacing differences, case variations, punctuation. It does NOT handle abbreviations or typos (those are flagged for manual review in Phase 2).

---

### 5. `vessel_status_history`

Timeline of all status changes for audit and the detail view.

```sql
CREATE TABLE vessel_status_history (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vessel_id       UUID NOT NULL REFERENCES vessels(id) ON DELETE CASCADE,
  status          TEXT NOT NULL,
  changed_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  source          TEXT NOT NULL CHECK (source IN ('pilot_report', 'manual', 'system', 'harbor_master')),
  source_id       UUID,                       -- pilot_report_id or NULL
  details         JSONB,                      -- Any extra context (e.g., old vs new time)
  changed_by      UUID REFERENCES profiles(id)
);

CREATE INDEX idx_vsh_vessel ON vessel_status_history (vessel_id, changed_at DESC);
```

---

### 6. `devices`

The 8 wifi hotspot devices.

```sql
CREATE TABLE devices (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_number   INT NOT NULL UNIQUE CHECK (device_number BETWEEN 1 AND 20),
  label           TEXT NOT NULL,              -- "Device 1", "Device 2", etc.
  status          TEXT NOT NULL DEFAULT 'available'
                  CHECK (status IN ('available', 'assigned', 'needs_retrieval', 'maintenance')),
  current_vessel_id UUID REFERENCES vessels(id) ON DELETE SET NULL,
  assigned_at     TIMESTAMPTZ,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER devices_updated_at
  BEFORE UPDATE ON devices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Seed the initial 8 devices
INSERT INTO devices (device_number, label) VALUES
  (1, 'Device 1'), (2, 'Device 2'), (3, 'Device 3'), (4, 'Device 4'),
  (5, 'Device 5'), (6, 'Device 6'), (7, 'Device 7'), (8, 'Device 8');
```

---

### 7. `device_assignments`

History of all device assignments (checkout/checkin log).

```sql
CREATE TABLE device_assignments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id       UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  vessel_id       UUID NOT NULL REFERENCES vessels(id) ON DELETE CASCADE,
  checked_out_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  checked_out_by  UUID REFERENCES profiles(id),
  checked_in_at   TIMESTAMPTZ,
  checked_in_by   UUID REFERENCES profiles(id),
  status          TEXT NOT NULL DEFAULT 'active'
                  CHECK (status IN ('active', 'returned', 'lost')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_da_device_active ON device_assignments (device_id)
  WHERE status = 'active';
CREATE INDEX idx_da_vessel_active ON device_assignments (vessel_id)
  WHERE status = 'active';

-- Constraint: a device can only have one active assignment at a time
CREATE UNIQUE INDEX idx_da_one_active_per_device
  ON device_assignments (device_id) WHERE status = 'active';
```

---

### 8. `alerts`

All scheduled and sent alerts.

```sql
CREATE TABLE alerts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vessel_id       UUID NOT NULL REFERENCES vessels(id) ON DELETE CASCADE,
  device_id       UUID REFERENCES devices(id) ON DELETE SET NULL,
  assignment_id   UUID REFERENCES device_assignments(id) ON DELETE SET NULL,

  tier            TEXT NOT NULL CHECK (tier IN ('info', 'warning', 'urgent')),
  -- info = 6h, warning = 2h, urgent = 1h

  scheduled_for   TIMESTAMPTZ NOT NULL,       -- When this alert should fire
  sailing_time    TIMESTAMPTZ,                -- The sailing time it references

  status          TEXT NOT NULL DEFAULT 'scheduled'
                  CHECK (status IN ('scheduled', 'sent', 'cancelled', 'failed')),

  message         TEXT NOT NULL,

  sent_at         TIMESTAMPTZ,
  cancelled_at    TIMESTAMPTZ,
  cancel_reason   TEXT,                       -- 'device_retrieved', 'sailing_time_changed', 'manual'

  -- Delivery tracking
  delivery_method TEXT CHECK (delivery_method IN ('sms', 'in_app', 'both')),
  delivery_status JSONB,                      -- Per-recipient delivery results

  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_alerts_scheduled ON alerts (scheduled_for)
  WHERE status = 'scheduled';
CREATE INDEX idx_alerts_vessel ON alerts (vessel_id);
CREATE INDEX idx_alerts_assignment ON alerts (assignment_id)
  WHERE status = 'scheduled';

CREATE TRIGGER alerts_updated_at
  BEFORE UPDATE ON alerts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

---

### 9. `alert_recipients`

Which users receive which alert tiers. Managed in Settings.

```sql
CREATE TABLE alert_recipients (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  method          TEXT NOT NULL DEFAULT 'sms' CHECK (method IN ('sms', 'in_app')),
  enabled         BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_ar_profile_method ON alert_recipients (profile_id, method);
```

---

### 10. `ingestion_log`

Tracks email ingestion health for the Settings status panel.

```sql
CREATE TABLE ingestion_log (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type      TEXT NOT NULL CHECK (event_type IN (
    'email_received', 'parse_started', 'parse_completed', 'parse_failed',
    'no_report_warning'
  )),
  pilot_report_id UUID REFERENCES pilot_reports(id),
  details         JSONB,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ingestion_log_recent ON ingestion_log (created_at DESC);
```

---

## Row-Level Security (RLS) Policies

All tables have RLS enabled. The policies are intentionally simple given the small, trusted team.

```sql
-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE pilot_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE pilot_report_rows ENABLE ROW LEVEL SECURITY;
ALTER TABLE vessels ENABLE ROW LEVEL SECURITY;
ALTER TABLE vessel_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE device_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE alert_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE ingestion_log ENABLE ROW LEVEL SECURITY;

-- Helper: check if user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- PROFILES: users can read all profiles, update only their own
CREATE POLICY "profiles_select" ON profiles FOR SELECT USING (TRUE);
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE USING (id = auth.uid());
CREATE POLICY "profiles_admin_update" ON profiles FOR UPDATE USING (is_admin());
CREATE POLICY "profiles_admin_insert" ON profiles FOR INSERT WITH CHECK (is_admin() OR id = auth.uid());

-- VESSELS: all authenticated users can read; admin can write
CREATE POLICY "vessels_select" ON vessels FOR SELECT USING (TRUE);
CREATE POLICY "vessels_admin_insert" ON vessels FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "vessels_admin_update" ON vessels FOR UPDATE USING (is_admin());

-- DEVICES: all can read; all can update (for check-in/check-out)
CREATE POLICY "devices_select" ON devices FOR SELECT USING (TRUE);
CREATE POLICY "devices_update" ON devices FOR UPDATE USING (TRUE);

-- DEVICE_ASSIGNMENTS: all can read; all can insert (checkout); all can update (checkin)
CREATE POLICY "da_select" ON device_assignments FOR SELECT USING (TRUE);
CREATE POLICY "da_insert" ON device_assignments FOR INSERT WITH CHECK (TRUE);
CREATE POLICY "da_update" ON device_assignments FOR UPDATE USING (TRUE);

-- ALERTS: all can read
CREATE POLICY "alerts_select" ON alerts FOR SELECT USING (TRUE);

-- PILOT_REPORTS / ROWS: all can read; system (service_role) writes via API
CREATE POLICY "pr_select" ON pilot_reports FOR SELECT USING (TRUE);
CREATE POLICY "prr_select" ON pilot_report_rows FOR SELECT USING (TRUE);

-- STATUS HISTORY: all can read
CREATE POLICY "vsh_select" ON vessel_status_history FOR SELECT USING (TRUE);

-- INGESTION_LOG: all can read
CREATE POLICY "il_select" ON ingestion_log FOR SELECT USING (TRUE);

-- ALERT_RECIPIENTS: all can read; admin can write
CREATE POLICY "ar_select" ON alert_recipients FOR SELECT USING (TRUE);
CREATE POLICY "ar_admin_write" ON alert_recipients FOR ALL USING (is_admin());
```

**Note:** The ingestion webhook (`/api/ingest/pilot-report`) uses the Supabase `service_role` key to bypass RLS when inserting pilot reports and updating vessels. This key is server-side only, never exposed to the client.

---

## Supabase Realtime Subscriptions

The dashboard subscribes to real-time changes on these tables:

| Table | Events | Purpose |
|-------|--------|---------|
| `vessels` | INSERT, UPDATE | Dashboard auto-refresh when new data is parsed |
| `devices` | UPDATE | Device status changes reflected immediately |
| `device_assignments` | INSERT, UPDATE | Assignment/checkin reflected on vessel cards |
| `alerts` | INSERT, UPDATE | Alert banners appear/update in real time |

Subscription filter: `status NOT IN ('sailed', 'cancelled')` for vessels (avoid noise from historical records).

---

## Status Progression Logic

Vessel status follows this state machine:

```
scheduled ──────────────────────────────┐
                                        │
arriving ──> at_anchor ──> in_port ──> sailing ──> sailed
    │                        │            │
    │                        └── sailing ─┘
    │
    └── cancelled
```

Rules:
- Status can only move forward (arriving -> at_anchor -> in_port -> sailing -> sailed) except via manual override.
- When a vessel appears in the "Sailings" section of a Pilot Report, its status becomes `sailing`.
- When a vessel with status `sailing` is no longer in the next Pilot Report's sailings section and does not appear in arrivals, it is assumed to have sailed. A background job marks it `sailed` after 6 hours.
- `cancelled` is manual-only.

---

## Manual Override Behavior

When Daniel edits a field:
1. The edited field name is added to `override_fields` JSONB array.
2. `has_manual_override` is set to TRUE.
3. On the next Pilot Report ingestion, if the vessel is found:
   - Fields NOT in `override_fields` are updated normally.
   - Fields IN `override_fields` are NOT overwritten. The new parsed value is stored in `vessel_status_history` for reference but the vessel record retains Daniel's value.
   - The vessel is flagged (`needs_review = TRUE`) with a reason like "New Pilot Report data differs from your override."
4. Daniel can "clear override" on the vessel detail screen, which empties `override_fields` and allows the next Pilot Report to update freely.

---

## Sailing Time Interpretation for Alerts

The alert engine must compute a concrete `TIMESTAMPTZ` for alert scheduling. Rules:

| Raw Time Format | `sailing_time` | `sailing_time_confidence` | Alert Base Time |
|-----------------|----------------|--------------------------|-----------------|
| "1300" | 13:00 | exact | 13:00 on sailing_date |
| "17-1800" | 17:00 | range | 17:00 (earlier bound) |
| "AM" | 06:00 | approximate | 06:00 (earliest reasonable) |
| "PM" | 12:00 | approximate | 12:00 (earliest reasonable) |
| "LPM" | 15:00 | approximate | 15:00 (late PM estimate) |
| NULL / unparseable | NULL | unknown | No alert; show persistent warning |

When `sailing_time_confidence` is `approximate`, the UI shows the original text with "(estimated)" and the alert message includes "approximate sailing time."
