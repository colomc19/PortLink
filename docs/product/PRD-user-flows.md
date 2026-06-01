# PRD: Core User Flows

**Product:** PortLink
**Author:** Product Manager (AI-assisted)
**Date:** 2026-03-24
**Status:** Draft

---

## Overview

This document describes the key user journeys in PortLink. Each flow maps to real operational patterns observed in Daniel's current workflow. The flows are written from the user's perspective and include the data movement behind each step.

---

## Flow 1: Morning Check (Daniel's Daily Start)

**Actor:** Daniel (Admin)
**Trigger:** Start of day, typically early morning
**Current process:** Wake up, open email, find Pilot Report, manually copy rows into Google Sheet, cross-reference with yesterday's data, text volunteers if anything is urgent.

### PortLink Flow

```
Daniel opens PortLink on his phone
        |
        v
Dashboard loads with current vessel status
(data was auto-ingested from overnight/early Pilot Reports)
        |
        v
Daniel scans three sections:
  [In Port] - Ships currently docked, with device assignments
  [Arriving] - Ships expected today, sorted by time
  [Sailing]  - Ships departing today, sorted by time (URGENT if device assigned)
        |
        v
Any new vessels since yesterday are marked "New"
        |
        v
Daniel checks the "Needs Attention" indicators:
  - Sailing vessels with devices assigned (red highlight)
  - Parsing errors or ambiguous times (yellow flag)
  - New arrivals that might want hotspot service
        |
        v
If parsing errors exist:
  Daniel taps the flagged vessel -> edits the incorrect field -> saves
        |
        v
If a new arrival looks like a good candidate for service:
  Daniel assigns a device: Vessel Detail -> "Assign Device" -> pick from available devices -> confirm
        |
        v
Done. Total time: 2-5 minutes (vs. 30-60 minutes previously)
```

**Data flow behind the scenes:**
```
mobilebarpilots@mobilebarpilots.com
        |  (email, ~4x daily)
        v
SendGrid Inbound Parse
        |  (webhook POST)
        v
PortLink API: /api/ingest/pilot-report
        |  (parse HTML table, extract rows)
        v
Supabase: vessels table
  - Upsert by vessel name + date
  - Update status, time, terminal
  - Flag parse ambiguities
        |
        v
Dashboard reads from vessels table
  - Joins with device_assignments table
  - Sorts and categorizes
```

---

## Flow 2: Device Checkout (Assigning a Hotspot to a Ship)

**Actor:** Daniel or Volunteer
**Trigger:** A vessel has arrived and the team decides to offer wifi service
**Current process:** Daniel texts the team, someone drives to the port with a device, hands it to the crew, Daniel notes the assignment in the Google Sheet.

### PortLink Flow

```
Volunteer arrives at the port with a device
        |
        v
Opens PortLink on phone -> taps the vessel in "In Port" section
        |
        v
Vessel Detail screen shows:
  - Vessel name, terminal, arrival time
  - Scheduled sailing time (if known)
  - Current device assignments: "None"
        |
        v
Taps "Assign Device"
        |
        v
Device picker shows 8 devices:
  [1: Available] [2: Available] [3: On MAYAN] [4: Available] ...
        |
        v
Selects Device 4 -> Confirm
        |
        v
Device 4 status: "Available" -> "Assigned to [Vessel]"
Vessel card on dashboard now shows device badge
Sailing alert timers begin (if sailing time is known)
        |
        v
Done. 3 taps, under 15 seconds.
```

**Key design requirement:** The device picker must show only available devices by default, with a clear indication of which devices are already assigned and to which vessel. This prevents double-assignments and helps the volunteer grab the right physical device.

---

## Flow 3: Sailing Alert & Device Retrieval

**Actor:** Daniel and/or designated volunteers
**Trigger:** A vessel with an assigned device appears in a Sailing report, or its sailing time approaches
**Current process:** Daniel remembers (or forgets) to check the schedule, manually texts volunteers to retrieve the device. This is the highest-risk moment in the operation.

### PortLink Flow

```
Pilot Report arrives with SAILING entry for vessel "MAYAN"
        |
        v
Parser ingests report -> MAYAN status updated to "Sailing at 2300"
        |
        v
System checks: Does MAYAN have an assigned device?
  YES -> Device 3 is assigned
        |
        v
Alert timer calculates based on sailing time:
  Sailing: 2300
  6h alert: 1700 -> "Heads up: MAYAN sails at 2300, Device 3 is aboard"
  2h alert: 2100 -> "Action needed: MAYAN sails at 2300, Device 3 not yet retrieved"
  1h alert: 2200 -> "URGENT: MAYAN sails in 1 hour, Device 3 still aboard"
        |
        v
SMS sent to Daniel (and configured volunteers)
        |
        v
Daniel sees alert -> assigns a volunteer to retrieve
(or goes himself)
        |
        v
Volunteer retrieves device from the ship
        |
        v
Opens PortLink -> Vessel Detail for MAYAN -> "Check In Device"
        |
        v
Confirms Device 3 retrieved
        |
        v
Device 3 status: "Assigned to MAYAN" -> "Available"
Remaining alerts for this device/vessel are cancelled
        |
        v
Dashboard: MAYAN sailing card no longer shows urgent device highlight
```

**Critical edge cases and how the system handles them:**

| Scenario | System Behavior |
|----------|----------------|
| Sailing time is "AM" (no exact time) | Treat as 0600 for alert purposes; show "AM (estimated)" in UI |
| Sailing time is a range "17-1800" | Use the earlier time (1700) for alert calculation |
| Sailing time updates in a later Pilot Report | Reset alert timers to new time; note the change in vessel history |
| Pilot Report arrives with < 1h before sailing | Send immediate URGENT alert |
| Device already retrieved before first alert | No alerts sent (device no longer assigned) |
| No sailing time yet but vessel has device | Show persistent "Device aboard — no sailing time yet" warning |

---

## Flow 4: New Pilot Report Arrives (Mid-Day Update)

**Actor:** System (automatic), observed by Daniel and volunteers
**Trigger:** New Pilot Report email received (~4x daily)
**Current process:** Daniel checks email, manually updates Google Sheet, texts relevant changes to volunteers.

### PortLink Flow

```
Email arrives from mobilebarpilots@mobilebarpilots.com
        |
        v
SendGrid forwards to PortLink webhook
        |
        v
Parser processes email:
  - Extracts Arrivals section -> new/updated vessel records
  - Extracts Sailings section -> new/updated vessel records
  - Identifies changes vs. last known state
        |
        v
For each vessel row:
  Is this vessel already in the system?
    YES -> Update status, time, terminal (unless manually overridden)
    NO  -> Create new vessel record, mark as "New"
        |
        v
Changes are categorized:
  - New vessels (not seen before)
  - Status changes (e.g., ANCHOR -> boarded -> docked)
  - Time changes (sailing moved earlier or later)
  - New sailings for vessels with assigned devices (CRITICAL)
        |
        v
Dashboard reflects updates immediately
        |
        v
If any sailing affects a vessel with an assigned device:
  -> Trigger alert flow (Flow 3)
        |
        v
If parsing errors occurred:
  -> Flag specific rows for Daniel's review (yellow indicator on dashboard)
  -> Raw email stored and accessible from the flagged record
```

**Status progression example (single vessel across multiple reports):**
```
Report 1 (05:00): STAR SANTOS | 03/24 | 0500 ANCHOR | Cooper Marine Terminal
  -> Status: "At Anchor"

Report 2 (10:00): STAR SANTOS | 03/25 | 0200 PILOT | Cooper Marine Terminal
  -> Status: "Pilot Assigned" (date moved to 03/25, time is 0200)

Report 3 (17:00): [STAR SANTOS appears in Sailings] | 03/25 | PM
  -> Status: "Sailing Scheduled" (estimated PM)
  -> If device assigned: begin alert sequence
```

---

## Flow 5: Manual Vessel Entry

**Actor:** Daniel (Admin)
**Trigger:** Daniel learns about a vessel from a source other than the Pilot Report (phone call, Harbor Master, word of mouth)
**Current process:** Daniel adds a row to the Google Sheet manually.

### PortLink Flow

```
Daniel taps "+" button on dashboard
        |
        v
Manual Entry form:
  - Vessel Name (required)
  - Date (required)
  - Time (optional, free text to accommodate "AM", "afternoon", etc.)
  - Terminal/Dock (optional, dropdown of known terminals + free text)
  - Type: Arriving / In Port / Sailing (required)
  - Agent/Shipping Line (optional)
  - Notes (optional, free text)
        |
        v
Saves -> vessel appears on dashboard
  - Marked with "Manual Entry" indicator
  - If Pilot Report later mentions this vessel, records are linked
    and Pilot Report data supplements (not overwrites) the manual entry
        |
        v
Device assignment and alerts work identically to auto-ingested vessels
```

---

## Flow 6: Device Inventory Check

**Actor:** Daniel or Volunteer
**Trigger:** Periodic check, or when preparing to visit a ship
**Question:** "Where are all our devices right now?"

### PortLink Flow

```
Tap "Devices" tab (or section on dashboard)
        |
        v
Device Inventory view:

  Device 1  [Available]
  Device 2  [Available]
  Device 3  [On MAYAN - sails 2300 today]     <- highlighted urgent
  Device 4  [On XIN YA ZHOU - no sailing yet]
  Device 5  [Available]
  Device 6  [On FEDERAL KUDOS - sails tomorrow AM]
  Device 7  [Available]
  Device 8  [Available]

  Summary: 5 available / 3 assigned / 0 needs retrieval
        |
        v
Tapping a device row shows:
  - Current assignment (vessel, terminal, assigned date/time)
  - Assignment history (last 5 assignments)
  - Quick actions: "Check In" (if assigned), "Assign" (if available)
```

---

## Flow 7: Parsing Error Resolution

**Actor:** Daniel (Admin)
**Trigger:** Parser encounters ambiguous or unparseable data in a Pilot Report
**Current process:** Not applicable (all manual today)

### PortLink Flow

```
Dashboard shows a yellow flag on the notification area:
  "1 vessel needs review"
        |
        v
Daniel taps the flag
        |
        v
Review screen shows:
  Vessel: DUBAI BEAUTY
  Parsed time: "0800"
  Raw text: "0800 ANCHOR--1800 PILOT"
  Issue: "Compound time entry — which time should be used?"
        |
        v
Daniel sees the raw source and understands:
  "This means anchoring at 0800, pilot boards at 1800"
        |
        v
Daniel sets:
  Status: "At Anchor"
  Expected dock time: 1800
  (or whatever fields are appropriate)
        |
        v
Saves -> yellow flag cleared
Vessel record updated with Daniel's interpretation
Marked as "manually reviewed"
```

**Design principle:** Always show the raw source alongside the parsed interpretation. Daniel has decades of domain expertise — the app should present the data and let him correct it, not hide the original behind a guess.

---

## Data Flow Summary

```
                    Harbor Master (alports.com)
                         |
                    [Python scraper, 1-2x daily]     <- Phase 2
                         |
                         v
Pilot Report Email ---> PortLink Ingestion API ---> Supabase
  (4x daily)              |                          (vessels, devices,
                           |                           assignments, alerts)
                           v                               |
                    Parser + Merge Logic                   |
                      - Dedup by vessel name               |
                      - Status progression                 |
                      - Flag ambiguities                   |
                           |                               |
                           v                               v
                    Alert Engine  <-------- Device Assignment joins
                      - Check sailing times                |
                      - Check device assignments           |
                      - Calculate alert windows            |
                      - Send SMS/notifications             |
                           |                               |
                           v                               v
                    Notification Service           Dashboard (Next.js)
                      - SMS via Twilio/similar       - Real-time updates
                      - In-app notifications         - Mobile-first
                                                     - Vessel cards
                                                     - Device status
                                                     - Manual overrides
```

---

## Information Architecture

```
[Dashboard]                          <- Default screen, always visible
  |
  +-- [In Port] vessels
  |     +-- Vessel Card -> [Vessel Detail]
  |                           +-- Status timeline
  |                           +-- Device assignment
  |                           +-- Service log (Phase 2)
  |                           +-- Edit (admin)
  |
  +-- [Arriving] vessels
  |     +-- Vessel Card -> [Vessel Detail]
  |
  +-- [Sailing] vessels
  |     +-- Vessel Card -> [Vessel Detail]
  |
  +-- [+ Add Vessel] (admin)
  |
[Devices]                            <- Second tab
  |
  +-- Device list (8 items)
  |     +-- Device Detail -> assignment history, quick actions
  |
[Alerts]                             <- Third tab (or integrated into dashboard)
  |
  +-- Alert log (sent alerts, upcoming alerts)
  |
[Settings] (admin only)
  |
  +-- Manage volunteers
  +-- Alert preferences
  +-- Email ingestion status
```

---

## Key Decision Points

These are the moments where users need information to make a decision. The app must surface the right data at the right time.

| Decision | Who | Information Needed | Where in App |
|----------|-----|--------------------|--------------|
| "Should we offer this ship a device?" | Daniel | Vessel expected duration in port, how many devices are available, crew size (if known) | Vessel Detail + Device Inventory |
| "Which device should I bring?" | Volunteer | Which devices are available, which am I closest to physically | Device Inventory |
| "Do we need to retrieve a device today?" | Daniel | Which vessels with devices are sailing, when | Dashboard (Sailing section, red highlights) |
| "Is this schedule accurate?" | Daniel | Raw Pilot Report text, time parsing, historical updates | Vessel Detail (timeline + raw source) |
| "Who should go retrieve the device?" | Daniel | Volunteer availability (manual/text for MVP; in-app for Future) | Outside app for MVP |
| "Is this ship really coming on that date?" | Daniel | Harbor Master schedule + vessel current position | Vessel Detail with confidence score (Phase 2) |
