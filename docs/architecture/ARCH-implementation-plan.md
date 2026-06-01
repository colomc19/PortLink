# ARCH-implementation-plan: Step-by-Step Build Plan

**Product:** PortLink
**Author:** Architect (AI-assisted)
**Date:** 2026-03-24
**Status:** Draft

---

## Overview

This plan sequences the MVP build into 9 phases. Each phase produces something testable. Dependencies are strict — do not skip ahead.

The Developer agent should follow each step in order, verifying the "Done when" criteria before moving to the next step.

---

## Phase 1: Project Setup & Configuration

### Step 1.1: Initialize Next.js Project

**What:** Create the Next.js app with App Router, TypeScript, and Tailwind CSS.

**Files to create/modify:**
- Initialize with `npx create-next-app@latest` in the project root (or configure existing)
- `src/app/layout.tsx` — root layout with Inter font, Tailwind
- `src/app/page.tsx` — placeholder home page
- `tailwind.config.ts` — custom theme (colors, fonts, spacing from DES-style-guide.md)
- `src/styles/globals.css` — Tailwind directives, custom CSS variables
- `.env.local` — environment variable template (no real secrets)
- `.env.example` — documented env var list for other developers

**Dependencies:** None.

**Done when:** `npm run dev` starts, page loads at `localhost:3000` with the correct Inter font and a navy-colored "PortLink" heading. Tailwind custom colors (navy, bay-blue, gulf-gold, crimson, etc.) are available in CSS.

---

### Step 1.2: Supabase Client Setup

**What:** Configure Supabase client for both server-side and client-side usage.

**Files to create:**
- `src/lib/supabase/client.ts` — browser Supabase client (uses `NEXT_PUBLIC_` keys)
- `src/lib/supabase/server.ts` — server-side Supabase client (uses `createServerClient` from `@supabase/ssr`)
- `src/lib/supabase/admin.ts` — service role client (for webhooks and cron)
- `src/lib/supabase/middleware.ts` — session refresh middleware
- `src/middleware.ts` — Next.js middleware that refreshes Supabase session on every request
- `src/types/database.ts` — TypeScript types generated from Supabase schema (placeholder, will be generated after migration)

**Dependencies:** Step 1.1, Supabase project running (`supabase start`).

**Done when:** Can import Supabase client in a server component and query (even if tables do not exist yet). Middleware is active.

---

### Step 1.3: Project Structure

**What:** Create the folder structure that all subsequent work follows.

**Directories to create:**
```
src/
  app/
    (auth)/
      login/
        page.tsx
    (app)/
      layout.tsx        -- authenticated layout with nav
      page.tsx           -- dashboard (home)
      vessels/
        [id]/
          page.tsx       -- vessel detail
        new/
          page.tsx       -- manual vessel entry (admin)
      devices/
        page.tsx         -- device inventory
        [id]/
          page.tsx       -- device detail
      alerts/
        page.tsx         -- alert log
      settings/
        page.tsx         -- settings (admin)
    api/
      ingest/
        pilot-report/
          route.ts
      vessels/
        route.ts
        [id]/
          route.ts
          clear-override/
            route.ts
          dismiss-new/
            route.ts
          resolve-review/
            route.ts
      devices/
        route.ts
        [id]/
          route.ts
          checkout/
            route.ts
          checkin/
            route.ts
      alerts/
        route.ts
        [id]/
          dismiss/
            route.ts
      auth/
        profile/
          route.ts
      admin/
        users/
          route.ts
          invite/
            route.ts
          [id]/
            route.ts
            role/
              route.ts
        alert-recipients/
          route.ts
          [id]/
            route.ts
        ingestion-status/
          route.ts
      cron/
        process-alerts/
          route.ts
        cleanup-stale/
          route.ts
        check-ingestion/
          route.ts
  components/
    ui/                  -- reusable primitives (Button, Badge, Card, Input, etc.)
    vessels/             -- vessel-specific components
    devices/             -- device-specific components
    alerts/              -- alert-specific components
    layout/              -- Nav, Header, Footer, etc.
  lib/
    supabase/            -- (from Step 1.2)
    parser/              -- Pilot Report parser
    alerts/              -- Alert scheduling logic
    utils/               -- Shared utilities
  hooks/                 -- Custom React hooks
  types/                 -- TypeScript type definitions
```

**Dependencies:** Step 1.1.

**Done when:** All directories exist. Each page file has a placeholder component that renders the page name. Navigating to `/`, `/devices`, `/alerts`, `/settings` shows the correct placeholder.

---

## Phase 2: Database Schema & Migrations

### Step 2.1: Core Schema Migration

**What:** Create the Supabase migration with all tables, indexes, triggers, and RLS policies from ARCH-data-model.md.

**Files to create:**
- `supabase/migrations/00002_core_schema.sql` — all tables, indexes, triggers, functions
- `supabase/migrations/00003_rls_policies.sql` — all RLS policies
- `supabase/migrations/00004_seed_devices.sql` — seed the 8 devices

**Dependencies:** Supabase running locally (`supabase start`).

**Done when:** `supabase db reset` runs cleanly. All tables exist in local Supabase Studio. The 8 devices appear in the `devices` table. RLS is enabled on all tables.

---

### Step 2.2: Generate TypeScript Types

**What:** Generate TypeScript types from the Supabase schema.

**Commands:** `supabase gen types typescript --local > src/types/database.ts`

**Files to modify:**
- `src/types/database.ts` — generated types
- `src/lib/supabase/client.ts` — add generic type parameter
- `src/lib/supabase/server.ts` — add generic type parameter

**Dependencies:** Step 2.1.

**Done when:** TypeScript types exist for all tables. Supabase client is typed. IDE autocompletion works for `supabase.from('vessels').select(...)`.

---

## Phase 3: Authentication

### Step 3.1: Login Page

**What:** Build the login page with magic link authentication.

**Files to create/modify:**
- `src/app/(auth)/login/page.tsx` — login form (email input, send magic link button)
- `src/app/(auth)/layout.tsx` — centered card layout for auth pages
- `src/app/auth/callback/route.ts` — handle magic link callback (exchange code for session)

**Dependencies:** Steps 1.2, 2.1.

**Done when:** User can enter email, receive magic link (visible in Inbucket on local dev at `localhost:54324`), click the link, and be redirected to the dashboard. Session persists across page refreshes.

---

### Step 3.2: Auth Middleware & Protected Routes

**What:** Protect all `(app)` routes. Redirect unauthenticated users to `/login`.

**Files to modify:**
- `src/middleware.ts` — check session, redirect if missing
- `src/app/(app)/layout.tsx` — fetch profile, provide via context

**Files to create:**
- `src/hooks/useProfile.ts` — React hook for current user profile
- `src/lib/auth/require-admin.ts` — helper to check admin role in API routes
- `src/lib/auth/require-auth.ts` — helper to check auth in API routes

**Dependencies:** Step 3.1.

**Done when:** Visiting `/` while not logged in redirects to `/login`. After login, `/` loads the dashboard layout. The `useProfile` hook returns the current user with role.

---

### Step 3.3: Profile API

**What:** Implement the profile read/update API route.

**Files to create/modify:**
- `src/app/api/auth/profile/route.ts` — GET and PATCH

**Dependencies:** Step 3.2.

**Done when:** GET returns the current user's profile. PATCH updates `full_name`, `phone`, `view_preference`.

---

## Phase 4: UI Foundation

### Step 4.1: Core UI Components

**What:** Build the reusable component library based on DES-style-guide.md and DES-components.md.

**Files to create:**
- `src/components/ui/Button.tsx` — Primary, Secondary, Destructive, Ghost, Urgent variants
- `src/components/ui/Badge.tsx` — Status badges (vessel and device states)
- `src/components/ui/Card.tsx` — Base card with left border stripe
- `src/components/ui/Input.tsx` — Text input, Select, Textarea
- `src/components/ui/Modal.tsx` — Confirmation dialog / bottom sheet
- `src/components/ui/Skeleton.tsx` — Loading skeletons
- `src/components/ui/EmptyState.tsx` — Empty state with icon and message
- `src/components/ui/AlertBanner.tsx` — Tiered alert banner (info, warning, urgent)
- `src/components/ui/ViewToggle.tsx` — Table/card view toggle switch

**Dependencies:** Step 1.1 (Tailwind config).

**Done when:** A Storybook-style test page (or a `/dev/components` route) renders all component variants. Buttons, badges, cards, inputs all match the design spec. Touch targets meet 48px minimum.

---

### Step 4.2: Layout & Navigation

**What:** Build the app shell — navigation bar, bottom tab bar, page layout.

**Files to create:**
- `src/components/layout/AppShell.tsx` — wraps page content with nav
- `src/components/layout/BottomNav.tsx` — mobile bottom tab bar (Dashboard, Devices, Alerts, Settings)
- `src/components/layout/TopNav.tsx` — desktop/tablet top navigation bar
- `src/components/layout/PageHeader.tsx` — page title, action buttons, last-updated timestamp
- `src/components/layout/DetailPanel.tsx` — slide-in right panel for desktop vessel detail

**Files to modify:**
- `src/app/(app)/layout.tsx` — use AppShell

**Dependencies:** Step 4.1.

**Done when:** Navigation works at all breakpoints. Bottom nav on mobile (< 768px), top nav on tablet/desktop. Active tab is highlighted. Navigating between Dashboard, Devices, Alerts, Settings works.

---

## Phase 5: Email Ingestion Pipeline

### Step 5.1: Pilot Report Parser

**What:** Build the parser that extracts vessel data from Pilot Report HTML emails.

**Files to create:**
- `src/lib/parser/pilot-report-parser.ts` — main parser function
- `src/lib/parser/time-parser.ts` — time/status field parser
- `src/lib/parser/vessel-name-normalizer.ts` — name normalization function
- `src/lib/parser/types.ts` — parser input/output types
- `src/lib/parser/__tests__/pilot-report-parser.test.ts` — unit tests
- `src/lib/parser/__tests__/time-parser.test.ts` — unit tests
- `src/lib/parser/__tests__/fixtures/` — sample Pilot Report HTML files for testing

**Dependencies:** None (pure functions).

**Done when:** Unit tests pass for all known time formats (exact, range, approximate, compound). Parser correctly extracts vessel rows from sample HTML. Unrecognized formats are flagged with `needs_review = true`. Tests cover at least 15 distinct input formats.

---

### Step 5.2: Vessel Merge Logic

**What:** Build the logic that merges parsed rows into the `vessels` table, handling dedup and overrides.

**Files to create:**
- `src/lib/parser/vessel-merger.ts` — find-or-create vessel, update respecting overrides
- `src/lib/parser/__tests__/vessel-merger.test.ts` — integration tests

**Dependencies:** Steps 2.1, 5.1.

**Done when:** Given a set of parsed rows, the merger correctly: creates new vessels, updates existing vessels, respects manual overrides, records status history, links `pilot_report_rows` to vessels. Tested against the local Supabase database.

---

### Step 5.3: Ingestion API Route

**What:** Build the SendGrid webhook endpoint that ties it all together.

**Files to create/modify:**
- `src/app/api/ingest/pilot-report/route.ts` — POST handler
- `src/lib/parser/ingestion-pipeline.ts` — orchestrates: store raw -> parse -> merge -> alert recalc

**Dependencies:** Steps 5.1, 5.2.

**Done when:** A curl POST to `/api/ingest/pilot-report` with sample Pilot Report HTML creates the `pilot_reports` record, parses rows, creates/updates vessels, and returns a 200 with stats. Tested with the webhook secret. Invalid secret returns 401.

**Test command:**
```bash
curl -X POST http://localhost:3000/api/ingest/pilot-report \
  -H "X-Webhook-Secret: $SENDGRID_WEBHOOK_SECRET" \
  -F "from=mobilebarpilots@mobilebarpilots.com" \
  -F "subject=Pilot Report 03/24" \
  -F "html=@test-fixtures/sample-pilot-report.html"
```

---

## Phase 6: Vessel Dashboard

### Step 6.1: Vessel List API

**What:** Implement the GET `/api/vessels` route.

**Files to create/modify:**
- `src/app/api/vessels/route.ts` — GET handler with filters and joins

**Dependencies:** Step 2.2.

**Done when:** GET `/api/vessels` returns vessels grouped by status with active device assignments and counts. Filters by status work.

---

### Step 6.2: Dashboard Page — Card View

**What:** Build the main dashboard with three sections (In Port, Arriving, Sailing) using card view.

**Files to create:**
- `src/components/vessels/VesselCard.tsx` — vessel card per DES-components.md
- `src/components/vessels/VesselSection.tsx` — section with sticky header, vessel list
- `src/components/vessels/DashboardCardView.tsx` — three-section card layout
- `src/app/(app)/page.tsx` — dashboard page (fetches data, renders sections)

**Dependencies:** Steps 4.1, 4.2, 6.1.

**Done when:** Dashboard loads and shows vessels in three sections. Cards display vessel name, status badge, terminal, time, device assignment. Cards are colored by status (blue for in port, sky for arriving, crimson for sailing with device). Empty states show when sections are empty. Responsive across mobile/tablet/desktop.

---

### Step 6.3: Dashboard Page — Table View

**What:** Add the table/list view as an alternative to card view. Wire up the view toggle.

**Files to create:**
- `src/components/vessels/DashboardTableView.tsx` — table layout with sortable columns
- `src/components/vessels/VesselRow.tsx` — single table row per vessel

**Files to modify:**
- `src/app/(app)/page.tsx` — add ViewToggle, conditionally render card vs table view
- `src/hooks/useViewPreference.ts` — read/write view preference (persisted to profile)

**Dependencies:** Step 6.2.

**Done when:** Toggle switches between card and table views. Table view shows vessel data in columns (Name, Status, Terminal, Time, Device, Actions). Same data and actions available in both views. Preference persists via API (saves to `profiles.view_preference`).

---

### Step 6.4: Real-Time Updates

**What:** Subscribe to Supabase Realtime so the dashboard updates without refresh.

**Files to create:**
- `src/hooks/useRealtimeVessels.ts` — Realtime subscription for vessels table
- `src/hooks/useRealtimeDevices.ts` — Realtime subscription for devices table
- `src/components/vessels/UpdateIndicator.tsx` — "Updated just now" chip

**Files to modify:**
- `src/app/(app)/page.tsx` — use Realtime hooks

**Dependencies:** Step 6.2.

**Done when:** When a vessel is updated in the database (e.g., via a second ingestion call or Supabase Studio), the dashboard updates within 2 seconds without page refresh. The "Updated just now" chip appears.

---

## Phase 7: Vessel Detail & Manual Entry

### Step 7.1: Vessel Detail API

**What:** Implement GET `/api/vessels/[id]` with full history and raw source.

**Files to create/modify:**
- `src/app/api/vessels/[id]/route.ts` — GET handler with joins to status_history, pilot_report_rows, device_assignments

**Dependencies:** Step 6.1.

**Done when:** GET returns the full vessel object with status history timeline, raw pilot report excerpts, and device assignment history.

---

### Step 7.2: Vessel Detail Page

**What:** Build the vessel detail screen per DES-screens.md.

**Files to create:**
- `src/components/vessels/VesselDetail.tsx` — full detail view
- `src/components/vessels/StatusTimeline.tsx` — status history timeline
- `src/components/vessels/RawSourceSection.tsx` — collapsible raw pilot report text
- `src/components/vessels/DeviceAssignmentSection.tsx` — device info + actions
- `src/app/(app)/vessels/[id]/page.tsx` — page wrapper

**Files to modify:**
- `src/components/layout/DetailPanel.tsx` — use VesselDetail on desktop

**Dependencies:** Steps 7.1, 4.1.

**Done when:** Tapping a vessel card navigates to the detail page (mobile) or opens the detail panel (desktop). Status timeline shows all changes. Raw source is collapsible. Device section shows assignment with Check In / Assign actions. Urgent state (sailing with device) shows crimson styling.

---

### Step 7.3: Vessel Edit & Manual Override

**What:** Build inline editing for admin users and the manual override system.

**Files to create/modify:**
- `src/app/api/vessels/[id]/route.ts` — add PATCH handler
- `src/app/api/vessels/[id]/clear-override/route.ts` — PATCH handler
- `src/app/api/vessels/[id]/resolve-review/route.ts` — PATCH handler
- `src/components/vessels/VesselEditForm.tsx` — inline edit form
- `src/components/vessels/ParseReviewForm.tsx` — parse error resolution form

**Dependencies:** Step 7.2.

**Done when:** Admin can tap Edit, modify fields inline, save. Fields are added to `override_fields`. "Manual override" warning appears. Admin can clear overrides. Parse review form shows raw source alongside parsed values. Non-admin users do not see edit buttons.

---

### Step 7.4: Manual Vessel Entry

**What:** Build the "Add Vessel" form for Daniel.

**Files to create/modify:**
- `src/app/api/vessels/route.ts` — add POST handler
- `src/app/(app)/vessels/new/page.tsx` — form page
- `src/components/vessels/VesselEntryForm.tsx` — the form per DES-components.md

**Dependencies:** Step 7.3.

**Done when:** Admin can tap "+ Add Vessel" on the dashboard, fill in the form (vessel name, date, time, status, terminal, agent, notes), submit. New vessel appears on the dashboard with "MANUAL" badge. Non-admin users cannot access the form.

---

## Phase 8: Device Tracking

### Step 8.1: Device API Routes

**What:** Implement all device API routes (list, detail, checkout, checkin).

**Files to create/modify:**
- `src/app/api/devices/route.ts` — GET handler
- `src/app/api/devices/[id]/route.ts` — GET handler (detail with history)
- `src/app/api/devices/[id]/checkout/route.ts` — POST handler
- `src/app/api/devices/[id]/checkin/route.ts` — POST handler

**Dependencies:** Step 2.2.

**Done when:** All four endpoints work. Checkout creates an assignment, updates device status, enforces the unique active assignment constraint. Checkin marks assignment as returned, updates device status to available. Double-checkout returns 409.

---

### Step 8.2: Device Inventory Page

**What:** Build the device inventory screen per DES-screens.md.

**Files to create:**
- `src/components/devices/DeviceCard.tsx` — device card/row per DES-components.md
- `src/components/devices/DeviceSummaryBar.tsx` — "5 available, 2 assigned, 1 urgent" bar
- `src/components/devices/DeviceList.tsx` — sorted device list
- `src/app/(app)/devices/page.tsx` — page wrapper

**Dependencies:** Steps 8.1, 4.1.

**Done when:** Device page shows all 8 devices sorted by urgency (retrieval first, then assigned, then available). Summary bar shows correct counts. Quick actions (Assign, Check In, Confirm Retrieved) appear on each row. Responsive layout works.

---

### Step 8.3: Device Checkout Flow

**What:** Build the checkout modal/flow per DES-components.md (3 steps: select vessel, select device, confirm).

**Files to create:**
- `src/components/devices/CheckoutFlow.tsx` — multi-step checkout
- `src/components/devices/VesselPicker.tsx` — searchable vessel dropdown
- `src/components/devices/DevicePicker.tsx` — grid of available devices

**Dependencies:** Steps 8.1, 8.2.

**Done when:** From vessel detail: tapping "Assign Device" opens picker with vessel pre-selected. From device list: tapping "Assign" shows vessel picker first. Available devices are large, tappable squares. Unavailable devices are grayed out with vessel name. Confirmation screen shows vessel name, device number, terminal. After confirm, device appears as assigned on both the device list and the vessel card.

---

### Step 8.4: Device Check-In Flow

**What:** Build the check-in confirmation per DES-components.md.

**Files to create:**
- `src/components/devices/CheckinConfirmation.tsx` — modal with checkbox "I have Device N in hand"

**Dependencies:** Steps 8.1, 8.2.

**Done when:** From vessel detail or device list: tapping "Check In" opens modal. Checkbox must be ticked before Confirm is enabled. After confirm: device status becomes available, vessel card no longer shows device badge, success message shows "Device N retrieved. All pending alerts cancelled."

---

### Step 8.5: Auto-Status Update on Sailing

**What:** When a vessel appears in a Pilot Report's Sailings section and has an active device, automatically update the device status to `needs_retrieval`.

**Files to modify:**
- `src/lib/parser/vessel-merger.ts` — after updating a vessel to `sailing` status, check for active device assignments and update device status

**Dependencies:** Steps 5.2, 8.1.

**Done when:** Ingest a Pilot Report where a vessel with an assigned device appears in Sailings. The device status automatically changes from `assigned` to `needs_retrieval`. The vessel card shows the urgent red styling.

---

## Phase 9: Alert Engine

### Step 9.1: Alert Scheduling Logic

**What:** Build the alert creation/cancellation logic.

**Files to create:**
- `src/lib/alerts/scheduler.ts` — `scheduleAlerts(vessel, assignment)`, `cancelAlerts(assignmentId)`, `recalculateAlerts(vesselId)`
- `src/lib/alerts/__tests__/scheduler.test.ts` — unit tests

**Dependencies:** Step 2.2.

**Done when:** Tests pass for: creating 3-tier alerts for a vessel with exact sailing time; creating alerts with approximate time using earliest interpretation; cancelling alerts when device is retrieved; recalculating when sailing time changes; handling late discovery (< 1h notice) with immediate urgent alert.

---

### Step 9.2: Wire Alert Scheduling into Ingestion & Device Flows

**What:** Trigger alert scheduling at the right moments.

**Files to modify:**
- `src/lib/parser/ingestion-pipeline.ts` — call `recalculateAlerts` after merge
- `src/app/api/devices/[id]/checkout/route.ts` — call `scheduleAlerts` after checkout
- `src/app/api/devices/[id]/checkin/route.ts` — call `cancelAlerts` after checkin
- `src/app/api/vessels/[id]/route.ts` — call `recalculateAlerts` after PATCH if sailing time changed

**Dependencies:** Step 9.1.

**Done when:** After device checkout, alerts appear in the `alerts` table with correct `scheduled_for` times. After checkin, pending alerts are cancelled. After ingestion with sailing time update, old alerts are cancelled and new ones created.

---

### Step 9.3: Cron Job — Process Alerts

**What:** Build the cron endpoint that sends due alerts via Twilio SMS.

**Files to create:**
- `src/app/api/cron/process-alerts/route.ts` — GET handler
- `src/lib/alerts/sms-sender.ts` — Twilio integration (send SMS, format messages)
- `vercel.json` — cron configuration

**Dependencies:** Steps 9.2, Twilio account.

**Done when:** Manually hitting `/api/cron/process-alerts` with the cron secret processes due alerts: verifies device is still assigned, sends SMS to all enabled recipients, updates alert status to `sent` with delivery details. Test by creating an alert with `scheduled_for` in the past and calling the endpoint.

---

### Step 9.4: Alert UI — Banners and Log

**What:** Build alert banners on the dashboard and the alert log page.

**Files to create/modify:**
- `src/hooks/useAlerts.ts` — fetch active and upcoming alerts
- `src/components/alerts/AlertBannerStack.tsx` — renders active alert banners at top of dashboard
- `src/components/alerts/AlertLogEntry.tsx` — single alert in the log
- `src/components/alerts/UpcomingAlerts.tsx` — list of upcoming scheduled alerts
- `src/app/(app)/alerts/page.tsx` — alert log page with active, upcoming, and history sections
- `src/app/api/alerts/route.ts` — GET handler
- `src/app/api/alerts/[id]/dismiss/route.ts` — POST handler
- `src/app/(app)/page.tsx` — add AlertBannerStack above vessel sections

**Dependencies:** Steps 9.3, 4.1.

**Done when:** Dashboard shows alert banners for scheduled/sent alerts affecting vessels with devices. Banners match the three tiers (info=blue, warning=amber, urgent=crimson). Banners have "View Vessel" and "Confirm Retrieved" buttons. Alert log page shows all alerts with delivery status. Upcoming alerts section shows what will fire next.

---

### Step 9.5: Additional Cron Jobs

**What:** Build the cleanup and ingestion health check crons.

**Files to create:**
- `src/app/api/cron/cleanup-stale/route.ts` — mark stale vessels as sailed, clear old "new" flags
- `src/app/api/cron/check-ingestion/route.ts` — warn if no Pilot Report received recently

**Files to modify:**
- `vercel.json` — add cron entries

**Dependencies:** Step 9.3.

**Done when:** Cleanup cron correctly transitions stale sailing vessels to sailed. Ingestion check cron sends SMS warning if no report in 8+ hours during business hours.

---

## Phase 10: Admin & Settings

### Step 10.1: Settings Page — User Management

**What:** Build the admin settings screen for managing volunteers.

**Files to create/modify:**
- `src/app/api/admin/users/route.ts` — GET handler
- `src/app/api/admin/users/invite/route.ts` — POST handler
- `src/app/api/admin/users/[id]/route.ts` — DELETE handler
- `src/app/api/admin/users/[id]/role/route.ts` — PATCH handler
- `src/components/settings/UserList.tsx` — team member list
- `src/components/settings/InviteForm.tsx` — invite modal
- `src/app/(app)/settings/page.tsx` — settings page

**Dependencies:** Steps 3.2, 3.3.

**Done when:** Admin can see all team members, invite new volunteers by email, remove volunteers, change roles. Non-admin users are redirected away from settings.

---

### Step 10.2: Settings Page — Alert Recipients

**What:** Build the alert recipient configuration.

**Files to create/modify:**
- `src/app/api/admin/alert-recipients/route.ts` — GET handler
- `src/app/api/admin/alert-recipients/[id]/route.ts` — PATCH handler
- `src/components/settings/AlertRecipientList.tsx` — checkbox list of recipients

**Dependencies:** Step 10.1.

**Done when:** Admin can toggle SMS alert delivery on/off for each team member. Changes persist and are used by the alert processing cron.

---

### Step 10.3: Settings Page — Ingestion Status

**What:** Build the ingestion health display.

**Files to create/modify:**
- `src/app/api/admin/ingestion-status/route.ts` — GET handler
- `src/components/settings/IngestionStatus.tsx` — status panel

**Dependencies:** Step 5.3.

**Done when:** Settings page shows: ingestion status (active/warning), last report received timestamp, reports received today, and recent ingestion events.

---

## Phase 11: Integration Testing & Polish

### Step 11.1: End-to-End Flow Test

**What:** Test the complete flow from email ingestion to dashboard display to alert delivery.

**Test procedure:**
1. Start local Supabase and Next.js dev server.
2. Create an admin user and a volunteer user.
3. POST a sample Pilot Report to the ingestion endpoint.
4. Verify vessels appear on the dashboard.
5. Assign a device to a vessel.
6. POST a second Pilot Report that shows the vessel as sailing.
7. Verify the device status changes to `needs_retrieval`.
8. Verify alerts are created in the `alerts` table.
9. Call the process-alerts cron endpoint.
10. Verify SMS would be sent (check Twilio test mode or logs).
11. Check in the device.
12. Verify alerts are cancelled.
13. Verify the vessel card updates to non-urgent styling.

**Dependencies:** All previous phases.

**Done when:** All 13 steps pass without manual database intervention.

---

### Step 11.2: Responsive & Accessibility Audit

**What:** Verify all screens at mobile (375px), tablet (768px), and desktop (1200px) breakpoints. Check accessibility.

**Checklist:**
- [ ] Dashboard three-column layout on desktop, two on tablet, stacked on mobile
- [ ] Vessel cards readable at all breakpoints
- [ ] Touch targets >= 48px on all interactive elements
- [ ] Bottom nav on mobile, top nav on tablet/desktop
- [ ] Detail panel slides in on desktop, navigates on mobile
- [ ] All status badges have icon + text (not color alone)
- [ ] Focus states visible on all interactive elements
- [ ] Keyboard navigation works on desktop (Tab, Enter, Escape)
- [ ] `aria-label` on vessel cards
- [ ] Contrast meets WCAG AA on all text

**Dependencies:** All previous phases.

**Done when:** All checklist items pass.

---

### Step 11.3: Error States & Edge Cases

**What:** Verify all error and empty states render correctly.

**Checklist:**
- [ ] Empty dashboard (no vessels) shows all three empty states
- [ ] All devices available shows success state
- [ ] No alerts shows calm empty state
- [ ] Network error on dashboard shows "Could not load" with retry
- [ ] Parse error vessels show yellow flag and "Needs Review" badge
- [ ] Manual entry vessels show "Manual" badge
- [ ] Sailed vessels hidden by default, visible with toggle
- [ ] Double device checkout returns error message
- [ ] Webhook with invalid secret returns 401

**Dependencies:** All previous phases.

**Done when:** All checklist items pass.

---

### Step 11.4: Performance Check

**What:** Verify the app meets performance targets.

**Targets:**
- Dashboard loads in < 2 seconds on throttled 3G
- Realtime updates appear within 2 seconds
- No layout shift during loading (skeleton screens)
- Bundle size reasonable (< 300KB initial JS)

**Dependencies:** All previous phases.

**Done when:** Lighthouse performance score >= 80 on mobile. No visible layout shift.

---

## Phase Dependency Graph

```
Phase 1 (Setup)
    │
    ├── Phase 2 (Database) ──────────────────────┐
    │       │                                     │
    │       ├── Phase 3 (Auth)                   │
    │       │       │                             │
    │       │       └── Phase 10 (Admin)         │
    │       │                                     │
    │       ├── Phase 5 (Ingestion) ─────────────┤
    │       │       │                             │
    │       │       └── Phase 8.5 (Auto-status)  │
    │       │                                     │
    │       └── Phase 8 (Devices)                │
    │               │                             │
    │               └── Phase 9 (Alerts) ────────┘
    │                                             │
    ├── Phase 4 (UI Foundation)                  │
    │       │                                     │
    │       ├── Phase 6 (Dashboard) ─────────────┘
    │       │       │
    │       │       └── Phase 7 (Detail/Edit)
    │       │
    │       └── Phase 8.2-8.4 (Device UI)
    │
    └── Phase 11 (Integration & Polish)
```

**Critical path:** 1 -> 2 -> 5 -> 6 -> 9 -> 11

Phases 4 (UI) and 5 (Ingestion) can be worked in parallel once Phase 2 is done. Phase 8 (Devices) can be worked in parallel with Phase 7 (Detail/Edit). Phase 9 (Alerts) depends on both ingestion and device flows being complete.
