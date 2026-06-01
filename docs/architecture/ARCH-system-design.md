# ARCH-system-design: System Architecture

**Product:** PortLink
**Author:** Architect (AI-assisted)
**Date:** 2026-03-24
**Status:** Draft

---

## System Overview

```
                                    ┌─────────────────────┐
                                    │   Twilio SMS API     │
                                    └──────────▲──────────┘
                                               │
┌──────────────┐    ┌──────────────┐    ┌──────┴──────────┐    ┌──────────────┐
│ Pilot Report │    │   SendGrid   │    │   Next.js App   │    │   Supabase   │
│   Email      │───>│   Inbound    │───>│   (Vercel)      │<──>│   Database   │
│ (~4x daily)  │    │   Parse      │    │                 │    │   + Auth     │
└──────────────┘    └──────────────┘    │  API Routes     │    │   + Realtime │
                                        │  - Ingestion    │    └──────────────┘
                                        │  - CRUD         │           │
                                        │  - Alert Engine │           │
                                        │                 │           │
                                        │  Frontend       │     Realtime
                                        │  - Dashboard    │     Subscriptions
                                        │  - Devices      │           │
                                        │  - Alerts       │           │
                                        │  - Settings     │◄──────────┘
                                        └─────────────────┘
                                               │
                                        ┌──────┴──────────┐
                                        │   Vercel Cron   │
                                        │   (alert check, │
                                        │    stale vessel  │
                                        │    cleanup)      │
                                        └─────────────────┘
```

---

## Data Flow: Email to Dashboard

### Step 1: Email Arrives

1. Pilot Report email is sent from `mobilebarpilots@mobilebarpilots.com` to Daniel.
2. Daniel has set up an email forwarding rule (or the email is CC'd) to a dedicated address like `ingest@portlink.yourdomain.com`.
3. SendGrid Inbound Parse is configured to receive mail at that address and POST the parsed email to our webhook.

### Step 2: SendGrid Webhook

SendGrid sends an HTTP POST to `https://portlink.yourdomain.com/api/ingest/pilot-report` with:
- `from`: sender email
- `subject`: email subject
- `html`: HTML body (primary — the Pilot Report is an HTML table)
- `text`: plain text fallback
- `envelope`: JSON with routing info

The webhook is authenticated via a shared secret in a custom header (`X-Webhook-Secret`) or by verifying the sender domain. This prevents unauthorized submissions.

### Step 3: Parse Pipeline

The API route processes the email in this order:

```
Receive POST
    │
    ├── 1. Validate webhook secret
    │
    ├── 2. Store raw email in pilot_reports table
    │      (status: 'pending')
    │
    ├── 3. Parse HTML body
    │      ├── Extract Arrivals table rows
    │      ├── Extract Sailings table rows
    │      └── For each row:
    │          ├── Extract vessel name, date, time+status, terminal, agent
    │          ├── Parse time field (see Time Parser below)
    │          ├── Determine section (arrival vs sailing)
    │          └── Store as pilot_report_row
    │
    ├── 4. Merge parsed rows into vessels table
    │      ├── For each row:
    │      │   ├── Normalize vessel name
    │      │   ├── Find existing vessel (dedup query)
    │      │   ├── If found: update (respecting overrides)
    │      │   ├── If not found: create new vessel
    │      │   └── Record status change in vessel_status_history
    │      └── Link pilot_report_row.vessel_id
    │
    ├── 5. Trigger alert recalculation
    │      ├── For each vessel with status = 'sailing' + active device:
    │      │   ├── Cancel existing scheduled alerts for old sailing time
    │      │   └── Create new alerts based on updated sailing time
    │      └── For any new sailing with active device: create alerts
    │
    ├── 6. Update pilot_report status
    │      └── 'parsed' | 'partial' (some rows flagged) | 'failed'
    │
    └── 7. Log ingestion event
           └── ingestion_log entry
```

### Step 4: Real-Time Dashboard Update

After the parse pipeline writes to `vessels`, Supabase Realtime broadcasts the changes. The dashboard's Realtime subscription receives the event and updates the UI without a page refresh.

---

## Time Parser Design

The time parser is the hardest technical component. It must handle these known formats:

| Raw Input | Parsed Time | End Time | Confidence | Status |
|-----------|------------|----------|------------|--------|
| `1300` | 13:00 | -- | exact | -- |
| `0500 ANCHOR` | 05:00 | -- | exact | anchor |
| `17-1800` | 17:00 | 18:00 | range | -- |
| `05-0600` | 05:00 | 06:00 | range | -- |
| `17-1800 PILOT` | 17:00 | 18:00 | range | pilot |
| `0800 ANCHOR--1800 PILOT` | 08:00 | 18:00 | range | anchor (primary), pilot (secondary) |
| `AM` | 06:00 | -- | approximate | -- |
| `PM` | 12:00 | -- | approximate | -- |
| `LPM` | 15:00 | -- | approximate | -- |
| `0200 PILOT` | 02:00 | -- | exact | pilot |
| `boarded` | -- | -- | unknown | boarded |
| (empty) | -- | -- | unknown | -- |

### Parser Implementation Strategy

```
function parseTimeStatus(raw: string): ParsedTime {
  1. Trim and uppercase the input
  2. Check for compound format: split on "--" or double-dash
     If compound: parse each half separately, return range
  3. Check for range format: match /(\d{2,4})-(\d{2,4})/
     If range: parse both times, return range
  4. Check for exact time + status: match /(\d{3,4})\s*(.*)/
     If match: parse time (pad to 4 digits), extract status word
  5. Check for approximate: match /^(AM|PM|LPM|EPM)$/i
     If match: return approximate with estimated time
  6. Check for status-only: match /^(boarded|docked|arrived)$/i
     If match: return unknown time with status
  7. Else: flag as needs_review, return unknown
}
```

The parser NEVER silently drops data. If it cannot parse, it stores the raw text and flags for review.

---

## Alert Engine

### Architecture

The alert engine uses **Vercel Cron Jobs** to check for alerts that need to be sent. This is simpler and more reliable than trying to schedule individual timers.

```
Vercel Cron (every 5 minutes)
    │
    └── GET /api/cron/process-alerts
        │
        ├── Query: SELECT * FROM alerts
        │   WHERE status = 'scheduled'
        │   AND scheduled_for <= NOW()
        │
        ├── For each due alert:
        │   ├── Verify device is still assigned (not already retrieved)
        │   │   ├── If retrieved: cancel alert
        │   │   └── If still assigned: send alert
        │   │
        │   ├── Send via Twilio SMS to all enabled alert_recipients
        │   │
        │   └── Update alert status to 'sent' with delivery details
        │
        └── Return count of processed alerts
```

### Alert Scheduling

Alerts are created/updated when:
1. **New Pilot Report parsed** — if a vessel with an active device assignment appears in sailings, create alerts.
2. **Device assigned** — if the vessel already has a sailing time, create alerts.
3. **Sailing time changes** — cancel old alerts, create new ones.
4. **Device retrieved** — cancel all pending alerts for that assignment.

Alert creation logic:

```
function scheduleAlerts(vessel, assignment):
  if vessel.sailing_time is NULL:
    return  // No alerts for unknown sailing times; persistent UI warning instead

  sailing_datetime = combine(vessel.sailing_date, vessel.sailing_time)  // UTC

  tiers = [
    { tier: 'info',    offset: 6 hours },
    { tier: 'warning', offset: 2 hours },
    { tier: 'urgent',  offset: 1 hour  }
  ]

  for each tier:
    alert_time = sailing_datetime - tier.offset
    if alert_time <= NOW():
      if tier == 'urgent':
        send immediately  // Late discovery: send urgent right away
      else:
        skip  // Don't send stale info/warning alerts
    else:
      INSERT into alerts (scheduled_for = alert_time, ...)
```

### Edge Cases

| Scenario | Behavior |
|----------|----------|
| Sailing time is approximate ("AM") | Use earliest interpretation (06:00). Alert messages note "approximate sailing time." |
| Sailing time is range ("17-1800") | Use earlier bound (17:00). |
| Sailing added with < 1h notice | Send urgent alert immediately. |
| Sailing time moves earlier | Cancel existing alerts, create new ones. If any new alert is past due, send immediately. |
| Sailing time moves later | Cancel existing alerts, create new ones at new times. |
| Device retrieved before any alert fires | Cancel all scheduled alerts for that assignment. |
| No sailing time but device assigned | No scheduled alerts. Persistent UI warning: "Device aboard — no sailing time yet." |
| Multiple devices on same vessel | Separate alert set per device/assignment. All alerts fire. |

### Cron Job Authentication

The cron endpoint is protected by a secret in the `Authorization` header, configured in `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/process-alerts",
      "schedule": "*/5 * * * *"
    },
    {
      "path": "/api/cron/cleanup-stale",
      "schedule": "0 */6 * * *"
    }
  ]
}
```

The cron route validates `request.headers.get('Authorization') === 'Bearer ' + process.env.CRON_SECRET`.

---

## SMS Delivery (Twilio)

### Setup

- Twilio account with a phone number for sending.
- Environment variables: `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER`.
- SMS messages are plain text, kept under 160 characters when possible (single segment).

### Message Templates

**6-hour (info):**
```
PortLink: Heads up — [VESSEL] sails at [TIME] today. Device [N] is aboard. ~6h remaining.
```

**2-hour (warning):**
```
PortLink: Action needed — [VESSEL] sails at [TIME]. Device [N] not yet retrieved. ~2h left.
```

**1-hour (urgent):**
```
PortLink: URGENT — [VESSEL] sails in <1h at [TIME]. Device [N] still aboard. Retrieve now.
```

### Delivery Tracking

After sending, Twilio returns a message SID. The `delivery_status` JSONB on the alert stores per-recipient results:

```json
[
  { "recipient": "profile-uuid", "phone": "+12515550100", "twilio_sid": "SM...", "status": "delivered" },
  { "recipient": "profile-uuid", "phone": "+12515550200", "twilio_sid": "SM...", "status": "delivered" }
]
```

Failed deliveries are logged but do not block the alert from being marked as sent.

---

## Authentication Flow

### Technology

Supabase Auth with **magic link** as the primary method. Password login available as fallback.

### Flow

```
User visits /login
    │
    ├── Enters email address
    │
    ├── Clicks "Send Magic Link"
    │
    ├── Supabase sends magic link email
    │
    ├── User clicks link in email
    │
    ├── Supabase verifies token, creates session
    │
    ├── Redirect to / (dashboard)
    │
    └── Session stored in httpOnly cookie
        (persists across browser sessions)
```

### Session Management

- JWT expiry: 1 hour (with refresh token rotation).
- Refresh tokens: enabled, rotating, 10-second reuse interval.
- Sessions persist on mobile — volunteers should not need to log in frequently.
- Supabase client auto-refreshes the token before expiry.

### Authorization

Two roles: `admin` and `volunteer`. Checked via the `profiles.role` column.

| Action | Admin | Volunteer |
|--------|-------|-----------|
| View dashboard | Yes | Yes |
| View devices | Yes | Yes |
| Assign/checkin device | Yes | Yes |
| Edit vessel | Yes | No |
| Add vessel manually | Yes | No |
| Manage users | Yes | No |
| Configure alerts | Yes | No |
| View settings | Yes | No |

Role is checked in two places:
1. **Client-side:** Conditionally render admin UI elements.
2. **Server-side:** API routes check `profiles.role` before write operations. RLS policies enforce at the database level.

### Invitation Flow

1. Admin enters volunteer's email in Settings > Manage Volunteers.
2. API calls `supabase.auth.admin.inviteUserByEmail(email)`.
3. Volunteer receives email with signup link.
4. On first login, the `handle_new_user` trigger creates their profile with `role = 'volunteer'`.

---

## Real-Time Updates

### Implementation

The Next.js frontend uses the Supabase JS client's Realtime subscriptions.

```typescript
// Dashboard subscription (conceptual)
supabase
  .channel('dashboard')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'vessels',
    filter: 'status=neq.sailed'
  }, handleVesselChange)
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'devices'
  }, handleDeviceChange)
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'alerts',
    filter: 'status=eq.scheduled'
  }, handleAlertChange)
  .subscribe();
```

### Update Behavior

When a Realtime event arrives:
1. The affected vessel/device card re-renders with new data.
2. A subtle "Updated just now" chip appears below the page header.
3. Changed cards show a brief left-border pulse animation (600ms).
4. No full page refresh or layout shift.

### Fallback

If the Realtime connection drops:
1. Show a small "Reconnecting..." indicator.
2. Auto-retry with exponential backoff (Supabase client handles this).
3. On reconnection, refetch the full dataset to ensure consistency.
4. Pull-to-refresh on mobile always works as a manual fallback.

---

## Error Handling & Monitoring

### Error Categories

| Category | Example | Handling |
|----------|---------|----------|
| **Ingestion failure** | SendGrid POST fails, parse error | Store raw email anyway. Log to `ingestion_log`. Flag as `failed`. |
| **Parse ambiguity** | Unrecognized time format | Store with `needs_review = true`. Dashboard shows yellow flag. |
| **Alert delivery failure** | Twilio SMS fails | Log failure in `delivery_status`. Retry once after 2 minutes. |
| **Database error** | Supabase unavailable | API returns 500. Client shows "Could not load data" with retry. |
| **Auth error** | Expired session | Auto-refresh. If refresh fails, redirect to login. |
| **Cron failure** | Alert processing cron fails | Vercel logs. No user-facing error. Alerts will be processed on next run (5 min). |

### Monitoring Strategy (MVP)

Keep it simple. No dedicated monitoring service for MVP.

1. **Ingestion health:** The Settings screen shows last report received timestamp. If no report in 8+ hours during business hours, the cron job sends an SMS to Daniel: "No Pilot Report received since [time]. Check email forwarding."
2. **Alert delivery:** The Alert Log screen shows delivery status for each alert. Failures are visible.
3. **Vercel logs:** API route errors are visible in Vercel's built-in log viewer.
4. **Supabase dashboard:** Database health, query performance visible in Supabase Studio.

### No-Report Warning

A separate cron job (`/api/cron/check-ingestion`) runs every 2 hours during expected report times (05:00-22:00 Central). If no `pilot_reports` record exists with `received_at` in the last 8 hours, it sends an SMS to admin: "PortLink: No Pilot Report received since [last_time]. Email forwarding may be down."

---

## Phase 2 Integration Points

### Harbor Master Scraper (Python)

The Python scraper is a separate service (deployed as a Vercel serverless function, a Railway service, or a simple cron on a VPS). It:

1. Scrapes `alports.com` for vessel schedules.
2. POSTs normalized data to `/api/ingest/harbor-master` (a new API route).
3. The API route creates/updates vessel records with `source = 'harbor_master'` and `status = 'scheduled'`.
4. When a scheduled vessel later appears in a Pilot Report, the records merge (Pilot Report takes precedence).

**Hook for Phase 2:** The `vessels.source` field already supports `'harbor_master'`. The `vessels.status` already includes `'scheduled'`. No schema changes needed.

### Vessel Tracking API (Phase 2)

Integration with MarineTraffic or VesselFinder for confidence scoring:

1. New table: `vessel_tracking` (vessel_id, position, last_updated, confidence_score).
2. API route: `/api/tracking/update` called by a cron or webhook.
3. Dashboard shows confidence indicator on vessel cards for `scheduled` vessels.

**Hook for Phase 2:** The vessel detail screen already has a status history section where tracking data can be displayed. No structural changes needed.

### Service Logging (Phase 2)

1. New table: `service_logs` (vessel_id, crew_count, services_provided, notes, logged_by, logged_at).
2. New section on vessel detail screen.
3. New reporting route: `/api/reports/summary`.

---

## Deployment Architecture

```
┌──────────────────────────────────────────────────┐
│  Vercel (Hobby Plan / free tier)                 │
│                                                  │
│  Next.js App                                     │
│  ├── Pages (SSR/ISR)                            │
│  ├── API Routes (serverless functions)          │
│  │   ├── /api/ingest/*     (webhook handlers)   │
│  │   ├── /api/vessels/*    (CRUD)               │
│  │   ├── /api/devices/*    (CRUD)               │
│  │   ├── /api/alerts/*     (read, manage)       │
│  │   ├── /api/auth/*       (profile management) │
│  │   ├── /api/admin/*      (settings, users)    │
│  │   └── /api/cron/*       (scheduled jobs)     │
│  └── Cron Jobs (Vercel Cron)                    │
│      ├── process-alerts     (every 5 min)       │
│      ├── cleanup-stale      (every 6 hours)     │
│      └── check-ingestion    (every 2 hours)     │
└──────────────────────────────────────────────────┘
           │                    │
           │ Supabase Client    │ Twilio REST API
           ▼                    ▼
┌───────────────────┐  ┌──────────────────┐
│  Supabase         │  │  Twilio          │
│  (Free tier)      │  │  (Pay-as-you-go) │
│  ├── Postgres     │  │  SMS delivery    │
│  ├── Auth         │  └──────────────────┘
│  ├── Realtime     │
│  └── Storage (*)  │  ┌──────────────────┐
└───────────────────┘  │  SendGrid        │
                       │  (Free tier)     │
                       │  Inbound Parse   │
                       └──────────────────┘
```

(*) Supabase Storage is not needed for MVP but available if we want to store attachments from Pilot Report emails.

### Environment Variables

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...       # Server-side only

# SendGrid
SENDGRID_WEBHOOK_SECRET=whsec_...      # Webhook authentication

# Twilio
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_FROM_NUMBER=+1...

# Cron
CRON_SECRET=...                        # Vercel cron authentication

# App
NEXT_PUBLIC_APP_URL=https://portlink.yourdomain.com
```

### Free Tier Limits (MVP)

| Service | Free Tier Limit | Expected Usage | Headroom |
|---------|----------------|----------------|----------|
| Vercel | 100GB bandwidth, 100K function invocations/month | Very low (small team) | Large |
| Supabase | 500MB DB, 50K auth MAU, Realtime connections | ~10MB data, 6-10 users | Large |
| SendGrid Inbound Parse | 100 emails/day | ~4-5 emails/day | Large |
| Twilio SMS | Pay-as-you-go, ~$0.0079/SMS | ~10-20 SMS/day | Budget: ~$5/month |

Twilio is the only paid service. At ~20 alerts/day, cost is approximately $4-5/month.
