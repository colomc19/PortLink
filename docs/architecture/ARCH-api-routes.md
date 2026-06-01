# ARCH-api-routes: API Route Specifications

**Product:** PortLink
**Author:** Architect (AI-assisted)
**Date:** 2026-03-24
**Status:** Draft

---

## Conventions

- All routes live under `src/app/api/`.
- All routes return JSON with consistent shape: `{ data?, error?, message? }`.
- Authentication: all routes except `/api/ingest/*` and `/api/cron/*` require a valid Supabase session (checked via `createRouteHandlerClient`).
- Admin-only routes check `profiles.role === 'admin'` and return 403 if not.
- Webhook routes (`/api/ingest/*`) authenticate via a shared secret header.
- Cron routes (`/api/cron/*`) authenticate via `Authorization: Bearer <CRON_SECRET>`.
- Timestamps in responses are ISO 8601 UTC. The client converts to Central Time for display.

---

## Ingestion Routes

### POST `/api/ingest/pilot-report`

Receives Pilot Report emails from SendGrid Inbound Parse.

**Auth:** Webhook secret in `X-Webhook-Secret` header.

**Request:** `multipart/form-data` (SendGrid's format)

| Field | Type | Description |
|-------|------|-------------|
| `from` | string | Sender email address |
| `subject` | string | Email subject |
| `html` | string | HTML body (primary content) |
| `text` | string | Plain text body (fallback) |
| `envelope` | string (JSON) | Routing metadata |

**Response:**

```json
// 200 OK
{
  "data": {
    "pilot_report_id": "uuid",
    "parse_status": "parsed" | "partial" | "failed",
    "vessels_created": 1,
    "vessels_updated": 3,
    "rows_parsed": 12,
    "rows_flagged": 2
  }
}

// 401 Unauthorized
{ "error": "Invalid webhook secret" }

// 500 Internal Server Error
{ "error": "Ingestion failed", "message": "..." }
```

**Side effects:**
- Creates `pilot_reports` record.
- Creates `pilot_report_rows` records.
- Creates or updates `vessels` records.
- Creates `vessel_status_history` entries.
- Triggers alert recalculation for affected vessels.
- Creates `ingestion_log` entry.

---

### POST `/api/ingest/harbor-master` (Phase 2)

Receives scraped Harbor Master data.

**Auth:** Webhook secret in `X-Webhook-Secret` header.

**Request:**
```json
{
  "vessels": [
    {
      "name": "STAR SANTOS",
      "eta": "2026-04-01",
      "terminal": "Cooper Marine Terminal",
      "agent": "Cooper Marine",
      "source_url": "https://alports.com/..."
    }
  ],
  "scraped_at": "2026-03-24T10:00:00Z"
}
```

**Response:**
```json
{
  "data": {
    "vessels_created": 2,
    "vessels_updated": 1,
    "vessels_skipped": 0
  }
}
```

---

## Vessel Routes

### GET `/api/vessels`

List vessels for the dashboard.

**Auth:** Authenticated user.

**Query params:**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `status` | string (comma-separated) | `arriving,at_anchor,in_port,sailing` | Filter by status |
| `include_sailed` | boolean | `false` | Include sailed/cancelled vessels |
| `date` | string (YYYY-MM-DD) | today | Filter by relevant date |

**Response:**
```json
{
  "data": {
    "vessels": [
      {
        "id": "uuid",
        "name": "STAR SANTOS",
        "status": "in_port",
        "terminal": "Cooper Marine Terminal",
        "arrival_date": "2026-03-24",
        "arrival_time": "02:00",
        "arrival_time_display": "0200",
        "sailing_date": null,
        "sailing_time": null,
        "sailing_time_display": null,
        "sailing_time_confidence": "unknown",
        "agent": "Cooper Marine",
        "source": "pilot_report",
        "is_new": true,
        "has_manual_override": false,
        "needs_review": false,
        "review_reason": null,
        "notes": null,
        "active_devices": [
          {
            "assignment_id": "uuid",
            "device_id": "uuid",
            "device_number": 2,
            "device_label": "Device 2",
            "checked_out_at": "2026-03-24T08:45:00Z",
            "status": "active"
          }
        ],
        "updated_at": "2026-03-24T05:14:00Z"
      }
    ],
    "counts": {
      "in_port": 3,
      "arriving": 2,
      "sailing": 1,
      "needs_review": 1
    },
    "last_report_at": "2026-03-24T05:14:00Z"
  }
}
```

---

### GET `/api/vessels/[id]`

Get full vessel detail including status history and raw source.

**Auth:** Authenticated user.

**Response:**
```json
{
  "data": {
    "vessel": { /* same fields as list + below */ },
    "status_history": [
      {
        "id": "uuid",
        "status": "in_port",
        "changed_at": "2026-03-24T02:00:00Z",
        "source": "pilot_report",
        "source_id": "pilot-report-uuid",
        "details": { "from_status": "at_anchor" }
      }
    ],
    "pilot_report_rows": [
      {
        "id": "uuid",
        "pilot_report_id": "uuid",
        "received_at": "2026-03-24T05:14:00Z",
        "raw_vessel_name": "STAR SANTOS",
        "raw_time_status": "0200 BOARDED",
        "raw_terminal": "Cooper Marine Terminal",
        "section": "arrivals"
      }
    ],
    "active_devices": [ /* same as list */ ],
    "device_history": [
      {
        "id": "uuid",
        "device_number": 2,
        "checked_out_at": "2026-03-24T08:45:00Z",
        "checked_in_at": null,
        "status": "active"
      }
    ]
  }
}
```

---

### POST `/api/vessels`

Create a new vessel manually. Admin only.

**Auth:** Admin.

**Request:**
```json
{
  "name": "PORT ARTHUR",
  "date": "2026-03-25",
  "time_display": "0600",
  "status": "arriving",
  "terminal": "McDermott",
  "agent": null,
  "notes": "Heard from port agent by phone"
}
```

**Response:**
```json
{
  "data": {
    "vessel": { /* full vessel object */ }
  }
}
```

**Side effects:**
- Sets `source = 'manual'`, `has_manual_override = true`.
- Creates `vessel_status_history` entry with `source = 'manual'`.

---

### PATCH `/api/vessels/[id]`

Update a vessel. Admin only.

**Auth:** Admin.

**Request:**
```json
{
  "name": "STAR SANTOS",
  "status": "in_port",
  "terminal": "Cooper Marine Terminal",
  "sailing_time_display": "2300",
  "notes": "Updated from phone call"
}
```

Only provided fields are updated. Each updated field is added to `override_fields`.

**Response:**
```json
{
  "data": {
    "vessel": { /* updated vessel object */ }
  }
}
```

**Side effects:**
- Adds changed fields to `override_fields`.
- Sets `has_manual_override = true`.
- Creates `vessel_status_history` entry.
- If sailing time changed and device is assigned, triggers alert recalculation.

---

### PATCH `/api/vessels/[id]/clear-override`

Clear manual overrides, allowing Pilot Report data to update freely. Admin only.

**Auth:** Admin.

**Request:**
```json
{
  "fields": ["sailing_time", "terminal"]  // or "all" to clear everything
}
```

**Response:**
```json
{ "data": { "vessel": { /* updated */ } } }
```

---

### PATCH `/api/vessels/[id]/dismiss-new`

Clear the "new" indicator on a vessel.

**Auth:** Authenticated user.

**Request:** (empty body)

**Response:**
```json
{ "data": { "success": true } }
```

---

### PATCH `/api/vessels/[id]/resolve-review`

Mark a vessel's parse review as resolved. Admin only.

**Auth:** Admin.

**Request:**
```json
{
  "status": "at_anchor",
  "arrival_time_display": "0800",
  "sailing_time_display": "1800",
  "notes": "Anchoring at 0800, pilot boards at 1800"
}
```

**Response:**
```json
{ "data": { "vessel": { /* updated, needs_review = false */ } } }
```

---

## Device Routes

### GET `/api/devices`

List all devices with their current status and assignment.

**Auth:** Authenticated user.

**Response:**
```json
{
  "data": {
    "devices": [
      {
        "id": "uuid",
        "device_number": 1,
        "label": "Device 1",
        "status": "available",
        "current_vessel": null,
        "assigned_at": null
      },
      {
        "id": "uuid",
        "device_number": 3,
        "label": "Device 3",
        "status": "needs_retrieval",
        "current_vessel": {
          "id": "uuid",
          "name": "MAYAN",
          "terminal": "Cooper Marine",
          "sailing_date": "2026-03-24",
          "sailing_time_display": "2300",
          "status": "sailing"
        },
        "assigned_at": "2026-03-24T08:30:00Z"
      }
    ],
    "summary": {
      "available": 5,
      "assigned": 2,
      "needs_retrieval": 1,
      "total": 8
    }
  }
}
```

---

### GET `/api/devices/[id]`

Get device detail with assignment history.

**Auth:** Authenticated user.

**Response:**
```json
{
  "data": {
    "device": { /* same as list entry */ },
    "assignment_history": [
      {
        "id": "uuid",
        "vessel_name": "MAYAN",
        "vessel_id": "uuid",
        "checked_out_at": "2026-03-24T08:30:00Z",
        "checked_out_by": "Daniel Stover",
        "checked_in_at": null,
        "status": "active"
      },
      {
        "id": "uuid",
        "vessel_name": "FEDERAL KUDOS",
        "vessel_id": "uuid",
        "checked_out_at": "2026-03-20T10:00:00Z",
        "checked_out_by": "Mary Hughes",
        "checked_in_at": "2026-03-22T14:00:00Z",
        "checked_in_by": "Daniel Stover",
        "status": "returned"
      }
    ]
  }
}
```

---

### POST `/api/devices/[id]/checkout`

Assign a device to a vessel.

**Auth:** Authenticated user.

**Request:**
```json
{
  "vessel_id": "uuid"
}
```

**Response:**
```json
{
  "data": {
    "assignment": {
      "id": "uuid",
      "device_id": "uuid",
      "vessel_id": "uuid",
      "checked_out_at": "2026-03-24T08:45:00Z"
    }
  }
}

// 409 Conflict (device already assigned)
{ "error": "Device is already assigned to MAYAN" }
```

**Side effects:**
- Creates `device_assignments` record.
- Updates `devices.status` to `'assigned'`, sets `current_vessel_id`.
- If vessel has a sailing time, schedules alerts.

---

### POST `/api/devices/[id]/checkin`

Retrieve a device from a vessel.

**Auth:** Authenticated user.

**Request:**
```json
{
  "assignment_id": "uuid"
}
```

**Response:**
```json
{
  "data": {
    "device": { /* updated device, status = 'available' */ },
    "alerts_cancelled": 3
  }
}
```

**Side effects:**
- Updates `device_assignments.status` to `'returned'`, sets `checked_in_at` and `checked_in_by`.
- Updates `devices.status` to `'available'`, clears `current_vessel_id`.
- Cancels all `'scheduled'` alerts for this assignment.

---

## Alert Routes

### GET `/api/alerts`

List alerts (active, upcoming, history).

**Auth:** Authenticated user.

**Query params:**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `status` | string | `all` | `scheduled`, `sent`, `cancelled`, `all` |
| `limit` | number | `50` | Max results |
| `offset` | number | `0` | Pagination offset |

**Response:**
```json
{
  "data": {
    "alerts": [
      {
        "id": "uuid",
        "vessel_id": "uuid",
        "vessel_name": "MAYAN",
        "device_number": 3,
        "tier": "urgent",
        "scheduled_for": "2026-03-24T22:00:00Z",
        "sailing_time": "2026-03-24T23:00:00Z",
        "status": "scheduled",
        "message": "URGENT: MAYAN sails in <1h at 2300. Device 3 still aboard.",
        "sent_at": null,
        "delivery_status": null
      }
    ],
    "counts": {
      "scheduled": 3,
      "sent_today": 5
    }
  }
}
```

---

### POST `/api/alerts/[id]/dismiss`

Dismiss an alert banner (does not confirm device retrieval).

**Auth:** Authenticated user.

**Request:** (empty body)

**Response:**
```json
{ "data": { "success": true } }
```

Note: Dismissing moves the alert from the active banner to the log. It does NOT cancel the alert or mark the device as retrieved.

---

## Auth / Profile Routes

### GET `/api/auth/profile`

Get the current user's profile.

**Auth:** Authenticated user.

**Response:**
```json
{
  "data": {
    "id": "uuid",
    "full_name": "Daniel Stover",
    "email": "daniel@example.com",
    "phone": "+12515550100",
    "role": "admin",
    "receives_alerts": true,
    "view_preference": "table"
  }
}
```

---

### PATCH `/api/auth/profile`

Update the current user's profile.

**Auth:** Authenticated user.

**Request:**
```json
{
  "full_name": "Daniel Stover",
  "phone": "+12515550100",
  "view_preference": "card"
}
```

**Response:**
```json
{ "data": { "profile": { /* updated */ } } }
```

---

## Admin Routes

### GET `/api/admin/users`

List all users/volunteers. Admin only.

**Auth:** Admin.

**Response:**
```json
{
  "data": {
    "users": [
      {
        "id": "uuid",
        "full_name": "Daniel Stover",
        "email": "daniel@example.com",
        "phone": "+12515550100",
        "role": "admin",
        "receives_alerts": true
      },
      {
        "id": "uuid",
        "full_name": "Mary Hughes",
        "email": "mary@example.com",
        "phone": "+12515550200",
        "role": "volunteer",
        "receives_alerts": true
      }
    ]
  }
}
```

---

### POST `/api/admin/users/invite`

Invite a new volunteer. Admin only.

**Auth:** Admin.

**Request:**
```json
{
  "email": "john@example.com",
  "full_name": "John Smith"
}
```

**Response:**
```json
{ "data": { "invited": true, "email": "john@example.com" } }
```

---

### DELETE `/api/admin/users/[id]`

Remove a volunteer. Admin only.

**Auth:** Admin.

**Response:**
```json
{ "data": { "removed": true } }
```

---

### PATCH `/api/admin/users/[id]/role`

Change a user's role. Admin only.

**Auth:** Admin.

**Request:**
```json
{ "role": "admin" }
```

---

### GET `/api/admin/alert-recipients`

List alert recipient configuration. Admin only.

**Auth:** Admin.

**Response:**
```json
{
  "data": {
    "recipients": [
      { "profile_id": "uuid", "full_name": "Daniel Stover", "phone": "+1...", "sms_enabled": true },
      { "profile_id": "uuid", "full_name": "Mary Hughes", "phone": "+1...", "sms_enabled": true },
      { "profile_id": "uuid", "full_name": "John Smith", "phone": "+1...", "sms_enabled": false }
    ]
  }
}
```

---

### PATCH `/api/admin/alert-recipients/[profile_id]`

Update a recipient's alert preferences. Admin only.

**Auth:** Admin.

**Request:**
```json
{ "sms_enabled": true }
```

---

### GET `/api/admin/ingestion-status`

Check email ingestion health. Admin only.

**Auth:** Admin.

**Response:**
```json
{
  "data": {
    "status": "active",
    "last_report_received_at": "2026-03-24T05:14:00Z",
    "reports_today": 2,
    "total_reports": 47,
    "recent_events": [
      { "type": "parse_completed", "at": "2026-03-24T05:14:12Z", "details": { "rows": 12 } },
      { "type": "email_received", "at": "2026-03-24T05:14:00Z" }
    ]
  }
}
```

---

## Cron Routes

### GET `/api/cron/process-alerts`

Process due alerts and send SMS notifications.

**Auth:** `Authorization: Bearer <CRON_SECRET>` (Vercel Cron).

**Response:**
```json
{
  "data": {
    "processed": 2,
    "sent": 2,
    "cancelled": 0,
    "failed": 0
  }
}
```

---

### GET `/api/cron/cleanup-stale`

Mark stale vessels as sailed, clear old "new" flags.

**Auth:** `Authorization: Bearer <CRON_SECRET>`.

**Logic:**
1. Vessels with `status = 'sailing'` and `sailing_date < today - 1 day`: mark as `sailed`.
2. Vessels with `is_new = true` and `new_since < now - 30 minutes`: set `is_new = false`.
3. Vessels with `status IN ('sailed', 'cancelled')` and `updated_at < now - 7 days`: no action (keep for history), but exclude from default queries.

**Response:**
```json
{
  "data": {
    "vessels_sailed": 1,
    "new_flags_cleared": 2
  }
}
```

---

### GET `/api/cron/check-ingestion`

Check if Pilot Reports are arriving on schedule. Sends warning SMS if not.

**Auth:** `Authorization: Bearer <CRON_SECRET>`.

**Logic:**
1. Query last `pilot_reports.received_at`.
2. If last report was more than 8 hours ago and current time is between 05:00-22:00 Central, send SMS to admin.

**Response:**
```json
{
  "data": {
    "last_report_at": "2026-03-24T05:14:00Z",
    "hours_since": 4.2,
    "warning_sent": false
  }
}
```

---

## Route Summary Table

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| POST | `/api/ingest/pilot-report` | Webhook secret | Receive Pilot Report email |
| POST | `/api/ingest/harbor-master` | Webhook secret | Receive Harbor Master data (Phase 2) |
| GET | `/api/vessels` | User | List vessels for dashboard |
| GET | `/api/vessels/[id]` | User | Vessel detail |
| POST | `/api/vessels` | Admin | Create vessel manually |
| PATCH | `/api/vessels/[id]` | Admin | Update vessel |
| PATCH | `/api/vessels/[id]/clear-override` | Admin | Clear manual overrides |
| PATCH | `/api/vessels/[id]/dismiss-new` | User | Dismiss "new" indicator |
| PATCH | `/api/vessels/[id]/resolve-review` | Admin | Resolve parse review |
| GET | `/api/devices` | User | List devices |
| GET | `/api/devices/[id]` | User | Device detail with history |
| POST | `/api/devices/[id]/checkout` | User | Assign device to vessel |
| POST | `/api/devices/[id]/checkin` | User | Retrieve device from vessel |
| GET | `/api/alerts` | User | List alerts |
| POST | `/api/alerts/[id]/dismiss` | User | Dismiss alert banner |
| GET | `/api/auth/profile` | User | Get own profile |
| PATCH | `/api/auth/profile` | User | Update own profile |
| GET | `/api/admin/users` | Admin | List users |
| POST | `/api/admin/users/invite` | Admin | Invite volunteer |
| DELETE | `/api/admin/users/[id]` | Admin | Remove user |
| PATCH | `/api/admin/users/[id]/role` | Admin | Change role |
| GET | `/api/admin/alert-recipients` | Admin | List alert recipients |
| PATCH | `/api/admin/alert-recipients/[profile_id]` | Admin | Update alert prefs |
| GET | `/api/admin/ingestion-status` | Admin | Ingestion health |
| GET | `/api/cron/process-alerts` | Cron secret | Process due alerts |
| GET | `/api/cron/cleanup-stale` | Cron secret | Stale vessel cleanup |
| GET | `/api/cron/check-ingestion` | Cron secret | Ingestion health check |
