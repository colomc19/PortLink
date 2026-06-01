# PRD: Feature Scope & Prioritization

**Product:** PortLink
**Author:** Product Manager (AI-assisted)
**Date:** 2026-03-24
**Status:** Draft

---

## Prioritization Framework

Features are organized into three tiers:

- **MVP** — The minimum feature set to replace the Google Sheet and eliminate the risk of losing a wifi device. Ship it fast.
- **Phase 2** — High-value additions that improve efficiency and planning once the core is solid.
- **Future** — Nice-to-haves, optimizations, and expansions that can wait.

The guiding principle: **automate the data in, surface the decisions out, and never lose a hotspot.**

---

## MVP Features

### F1. Pilot Report Email Ingestion

**Description:** Automatically receive, parse, and store Pilot Report emails. Each email contains two sections (Arrivals and Sailings) in a tabular format. The parser must handle the full range of time formats observed in real data.

**User Story:** As Daniel, I want Pilot Report data to flow into the app automatically so that I no longer spend my mornings copying rows into a Google Sheet.

**Acceptance Criteria:**
- [ ] Inbound emails from `mobilebarpilots@mobilebarpilots.com` are received via SendGrid Inbound Parse (or equivalent)
- [ ] Parser extracts: Vessel Name, Date, Time+Status, Terminal/Dock, Agent/Shipping Line, Tug/Pilot Notes
- [ ] Parser handles known time formats: exact ("1300"), ranges ("17-1800", "05-0600"), approximate ("AM", "PM", "LPM"), with status suffixes ("boarded", "ANCHOR", "PILOT")
- [ ] Arrivals and Sailings are categorized correctly
- [ ] Duplicate vessels across multiple reports are merged into a single vessel record with updated status
- [ ] Each raw email is stored for audit/debugging
- [ ] Failed parses are flagged for manual review (not silently dropped)
- [ ] Daniel receives a confirmation when a new report is ingested (e.g., in-app indicator or brief notification)

**Edge Cases:**
- Email with unusual formatting or empty sections
- Vessel name variations across reports (e.g., minor typos, abbreviations)
- Time fields like "0300 ANCHOR 06-0700 PILOT" (compound entries with multiple status changes)
- Reports arriving out of order

---

### F2. Vessel Dashboard (Home Screen)

**Description:** A single-screen, mobile-first view showing all vessels currently relevant to operations. This is the Google Sheet replacement — but better, because it updates itself and highlights what matters.

**User Story:** As a volunteer, I want to open the app and immediately see what ships are in port, what is arriving, and what is sailing — so I know where I am needed today.

**Acceptance Criteria:**
- [ ] Three clear sections or filters: **In Port**, **Arriving**, **Sailing**
- [ ] Each vessel card shows: name, terminal/dock, time (arrival or departure), status, and whether a wifi device is assigned
- [ ] Sailing vessels with assigned devices are visually highlighted (red/urgent styling)
- [ ] Vessels are sorted by time (soonest action first)
- [ ] Dashboard auto-refreshes when new Pilot Report data is ingested (or pull-to-refresh on mobile)
- [ ] Tapping a vessel opens a detail view with full information and action buttons
- [ ] Works well on phone screens (minimum 375px width); touch-friendly tap targets
- [ ] Loads in under 2 seconds on a typical mobile connection

**Edge Cases:**
- No vessels currently in port (empty state messaging)
- Vessels with ambiguous times ("AM") — show the raw text, do not fabricate precision
- Large number of vessels (unlikely at Mobile but should scroll gracefully)

---

### F3. Wifi Device Tracking

**Description:** Track which of the 8 wifi hotspot devices is assigned to which vessel, and surface urgent alerts when a vessel with an assigned device is about to sail.

**User Story:** As Daniel, I want to know exactly which devices are on which ships at all times, and I want the app to warn me before a ship with a device sails — so we never lose a hotspot.

**Acceptance Criteria:**
- [ ] Device inventory: 8 devices, each with a simple identifier (e.g., Device 1-8)
- [ ] Check-out flow: assign a device to a vessel (select device, select vessel, confirm)
- [ ] Check-in flow: mark a device as retrieved from a vessel
- [ ] Device status view: list of all 8 devices showing current status (Available, Assigned to [Vessel], Needs Retrieval)
- [ ] When a vessel appears in a Sailing report and has an assigned device, the device status changes to "Needs Retrieval" automatically
- [ ] A vessel card on the dashboard shows which device(s) are assigned
- [ ] Retrieval must be explicitly confirmed — the system assumes the device is still on the ship until told otherwise

**Edge Cases:**
- Device assigned to a vessel that does not appear in any Pilot Report (manual vessel entry needed)
- Multiple devices assigned to the same vessel
- Vessel name in device assignment does not exactly match Pilot Report vessel name (fuzzy matching or manual linking)

---

### F4. Sailing Alerts

**Description:** Proactive notifications when a vessel with an assigned wifi device is scheduled to sail. This is the single most important safety net in the entire application.

**User Story:** As Daniel, I want to receive alerts well before a ship with our device sails — so I have time to send someone to retrieve it.

**Acceptance Criteria:**
- [ ] Tiered alerts for vessels with assigned devices:
  - **6 hours before sailing** — "Heads up: [Vessel] sails at [time], Device [X] is aboard"
  - **2 hours before sailing** — "Action needed: [Vessel] sails at [time], Device [X] not yet retrieved"
  - **1 hour before sailing** — "URGENT: [Vessel] sails in 1 hour, Device [X] still aboard"
- [ ] Alerts are delivered via at least one reliable channel (SMS is preferred for reliability; push notification as backup)
- [ ] Alert is suppressed if the device has already been checked in
- [ ] If a sailing time changes (updated Pilot Report), alert timers reset to the new time
- [ ] Daniel can configure who receives alerts (at minimum: himself; ideally: selected volunteers)
- [ ] All alerts are logged for audit

**Edge Cases:**
- Sailing time is ambiguous ("AM", "PM") — alert based on earliest reasonable interpretation (e.g., "AM" triggers at 0500 for a 6h-before alert)
- Sailing time is a range ("17-1800") — alert based on the earlier time
- Vessel with no assigned device sails — no alert needed (or a low-priority informational note)
- Sailing added in a late-day Pilot Report with less than 6 hours notice — send whatever alerts are still possible

---

### F5. Manual Data Override

**Description:** Allow Daniel to correct parsed data when the parser gets something wrong, or to manually add a vessel that did not appear in a Pilot Report.

**User Story:** As Daniel, I want to fix incorrect parsed data and add vessels manually — because the parser will not be perfect and some information comes through other channels.

**Acceptance Criteria:**
- [ ] Daniel can edit any field on a vessel record (name, time, terminal, status)
- [ ] Daniel can manually add a new vessel (for cases not covered by Pilot Reports)
- [ ] Daniel can manually mark a vessel as "sailed" or "cancelled"
- [ ] Edits are flagged as manual overrides (distinguished from parsed data)
- [ ] Manual edits are preserved even when a new Pilot Report updates the same vessel — manual override takes precedence until Daniel clears it
- [ ] Edit interface is simple: inline editing or a short form, not a complex admin panel

---

### F6. Basic Authentication

**Description:** Simple login to prevent public access. Not a complex auth system — just enough to keep the app private to the team.

**User Story:** As Daniel, I want only our volunteer team to access the app — not the general public.

**Acceptance Criteria:**
- [ ] Email-based login via Supabase Auth (magic link or password)
- [ ] Daniel can invite new volunteers by email
- [ ] Two roles: Admin (Daniel) and Volunteer
- [ ] Admin can manage devices, edit vessel data, manage users
- [ ] Volunteer can view dashboard, check devices in/out, receive alerts
- [ ] Session persists on mobile (volunteers should not need to log in every time)

---

## Phase 2 Features

### F7. Harbor Master Schedule Import

**Description:** Scrape the Harbor Master's published schedule from alports.com to provide a weeks/months-out planning view. This data is less precise but valuable for anticipating busy periods.

**User Story:** As Daniel, I want to see what vessels are scheduled weeks in advance — so I can plan volunteer coverage and know what is coming.

**Acceptance Criteria:**
- [ ] Python scraper runs on a schedule (daily or twice-daily)
- [ ] Scraped data populates a "Scheduled" section or tab on the dashboard
- [ ] Scheduled vessels are clearly distinguished from confirmed Pilot Report data (different visual treatment, labeled as "Harbor Master estimate")
- [ ] When a scheduled vessel appears in a Pilot Report, the records are linked and the Pilot Report data takes precedence
- [ ] Scraper failures are logged and Daniel is notified

---

### F8. Vessel Detail & History

**Description:** A detail view for each vessel showing its full lifecycle at the port: scheduled arrival, actual arrival, terminal assignments, device assignments, status changes across multiple Pilot Reports, and departure.

**User Story:** As Daniel, I want to see the full history of a vessel's port visit — every status update, every Pilot Report mention, every device interaction — in one place.

**Acceptance Criteria:**
- [ ] Timeline view showing all status changes with timestamps and source (which Pilot Report, manual edit, Harbor Master, etc.)
- [ ] Current and historical device assignments
- [ ] Raw Pilot Report excerpts for this vessel
- [ ] Notes field for free-text annotations (e.g., "Crew requested rides to Walmart")

---

### F9. Service Logging

**Description:** Track what services the team provided to each vessel: rides given, crew count, destinations, device usage duration.

**User Story:** As Daniel, I want to log what we did for each ship's crew — so we can report to ministry leadership on our impact.

**Acceptance Criteria:**
- [ ] Log entry per vessel: number of crew served, services provided (rides, hotspot), destinations, notes
- [ ] Simple form — fillable in under 60 seconds
- [ ] Monthly/quarterly summary report (total ships served, total crew, total rides, device utilization)

---

### F10. Confidence Scoring for Scheduled Arrivals

**Description:** For vessels scheduled via Harbor Master data, provide a rough confidence indicator based on heuristics Daniel currently applies manually (vessel's current position, number of remaining port calls before Mobile).

**User Story:** As Daniel, I want a quick sense of whether a vessel scheduled for next week is actually likely to arrive on time — so I do not over-plan for unreliable dates.

**Acceptance Criteria:**
- [ ] Integration with a vessel tracking API (MarineTraffic or VesselFinder — free tier or manual input)
- [ ] Display confidence as a simple indicator: High / Medium / Low
- [ ] Confidence factors shown: current position, distance to Mobile, number of intermediate stops
- [ ] Falls back gracefully if tracking data is unavailable (show "Unknown" rather than nothing)

---

### F11. Weather-Aware Status

**Description:** Surface weather conditions (specifically fog) that affect port operations, so the team understands why vessels are delayed.

**User Story:** As a volunteer, I want to know if fog or weather is holding up ships — so I understand why the schedule is off and can plan accordingly.

**Acceptance Criteria:**
- [ ] Weather data for Mobile Bay area (fog, visibility, wind advisories)
- [ ] Banner or indicator on the dashboard when conditions are affecting port operations
- [ ] Does not require manual input — automated via weather API

---

## Future Features

### F12. Volunteer Scheduling & Availability

**Description:** Allow volunteers to indicate their availability for rides and port visits. Match volunteer availability to vessel schedules.

**User Story:** As Daniel, I want to know which volunteers are available today — so I can quickly assign someone to a ride request.

---

### F13. Push Notifications (Native-like)

**Description:** Progressive Web App (PWA) with push notification support for devices that support it, as an alternative to SMS alerts.

**User Story:** As a volunteer, I want to get push notifications on my phone — so I do not miss important updates even when I am not looking at the app.

---

### F14. Vessel Database & Repeat Tracking

**Description:** Build a database of vessels that have visited Mobile before. Track repeat visitors, preferred services, crew size, and notes from previous visits.

**User Story:** As Daniel, I want to know when a ship has visited before and what we did for them last time — so we can provide more personalized service.

---

### F15. Reporting Dashboard

**Description:** Visual reporting for ministry leadership: ships served over time, device utilization rates, volunteer hours, crew reached.

**User Story:** As ministry leadership, I want a summary of the team's impact over the last quarter — for reporting to our diocese and supporters.

---

### F16. Multi-Port Support

**Description:** Generalize PortLink for use by other Apostleship of the Sea chapters at different ports.

**User Story:** As a port ministry at another city, I want to use PortLink for our own operations — adapted to our local pilot report format and port schedule.

---

## Feature Priority Matrix

| Feature | Business Value | User Impact | Feasibility | Priority |
|---------|---------------|-------------|-------------|----------|
| F1. Pilot Report Ingestion | Critical | Critical | Medium | **MVP** |
| F2. Vessel Dashboard | Critical | Critical | Easy | **MVP** |
| F3. Wifi Device Tracking | Critical | Critical | Easy | **MVP** |
| F4. Sailing Alerts | Critical | Critical | Medium | **MVP** |
| F5. Manual Data Override | High | High | Easy | **MVP** |
| F6. Basic Auth | High | Medium | Easy | **MVP** |
| F7. Harbor Master Import | Medium | Medium | Medium | Phase 2 |
| F8. Vessel Detail & History | Medium | Medium | Easy | Phase 2 |
| F9. Service Logging | Medium | Medium | Easy | Phase 2 |
| F10. Confidence Scoring | Medium | Medium | Hard | Phase 2 |
| F11. Weather-Aware Status | Low | Medium | Easy | Phase 2 |
| F12. Volunteer Scheduling | Low | Low | Medium | Future |
| F13. Push Notifications (PWA) | Medium | Medium | Medium | Future |
| F14. Vessel Database | Low | Low | Easy | Future |
| F15. Reporting Dashboard | Low | Low | Medium | Future |
| F16. Multi-Port | Low | Low | Hard | Future |

---

## MVP Scope Boundary

**In scope:**
- Automated Pilot Report email parsing and storage
- Vessel dashboard with In Port / Arriving / Sailing views
- Wifi device check-out / check-in / status tracking
- Tiered sailing alerts for vessels with assigned devices
- Manual data correction and vessel entry by Daniel
- Simple email-based authentication

**Out of scope for MVP:**
- Harbor Master schedule scraping (Phase 2)
- Vessel tracking / confidence scoring (Phase 2)
- Weather integration (Phase 2)
- Service/ride logging (Phase 2)
- Volunteer scheduling
- Native mobile app
- Reporting dashboards
- Multi-port support
