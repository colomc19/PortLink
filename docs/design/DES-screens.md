# DES-screens: Screen-by-Screen Design Notes

**Product:** PortLink
**Author:** UI Designer (AI-assisted)
**Date:** 2026-03-24
**Status:** Draft

---

## Overview

This document describes each key screen in PortLink from a design perspective: what the user sees, what hierarchy the eye follows, what decisions are supported, and how the screen adapts across breakpoints.

Each screen is evaluated against the core test: **"What can a volunteer learn in 2 seconds by glancing at this screen?"**

---

## Screen 1: Vessel Dashboard

**Route:** `/` (default landing screen after login)

### Purpose
The nerve center. Every user opens this screen first, every time. It must answer three questions instantly:
1. What ships are in port right now?
2. Is anything arriving today?
3. Does anything need urgent attention? (device retrieval)

### Visual Hierarchy Priority

1. **Alert banners** — if present, they demand attention before anything else. Crimson or amber banding across the top.
2. **Sailing section** — when vessels with devices are sailing, this section has the heaviest visual weight (crimson cards, prominent header). The eye should reach this first among the three sections when urgency exists.
3. **In Port section** — the operational core. Most time is spent here.
4. **Arriving section** — planning, less urgent.
5. **Navigation** — always present but visually lightest weight.

### Two-Second Glance Test
A volunteer opens the app. In two seconds they should know:
- "There are 3 ships in port" (from the section header count)
- "One is leaving today and has our device" (from the red card in Sailing)
- "I need to act" (the alert banner tells them what to do)

### View Mode Toggle

The dashboard header includes a **Table / Card view toggle** (see `DES-components.md` and `DES-layout.md` for full specs).

- **Table view is the default.** The volunteer team is accustomed to Google Sheets — a table layout feels immediately familiar. Rows show: Vessel Name, Status, Terminal, Time, Device, Flags.
- **Card view is available** for users who prefer richer visual cards with status borders and more whitespace.
- The toggle persists per user. Both views support the same interactions (tap to open detail, same urgency signals).
- Section grouping (In Port / Arriving / Sailing) is preserved in both views — table view uses grouped sections with headers, not one flat table.

### Key Design Decisions

**Sorting within sections:** Within each section, sort by time — most urgent first. In the Sailing section, vessels with devices always appear before vessels without devices, regardless of sailing time. A vessel with a device sailing at midnight gets higher placement than a vessel without a device sailing at noon.

**Auto-refresh behavior:** The dashboard listens for real-time updates via Supabase's Realtime subscriptions. When new data arrives:
- An unobtrusive chip appears: "Updated just now · 3 vessels changed"
- Cards that changed animate with a subtle left-border pulse (1 cycle, 600ms)
- No full-page reload — only changed cards re-render
- The "updated" chip fades after 60 seconds

**Last updated timestamp:** Shown below the page header in muted text: "Last updated: 2 minutes ago." This is critical for building trust with users who are used to stale data from the Google Sheet. They can see the data is live.

**The "+ Add Vessel" button (admin only):** Positioned in the top-right of the header on mobile, far right of the header bar on desktop. Always accessible from the dashboard but visually subdued — it is an admin action, not a volunteer action.

**Empty dashboard (no vessels):** Rare but handled gracefully. All three sections show their respective empty states. No "null state" that feels broken.

### Mobile Layout Notes

On mobile, the three sections are stacked vertically in order: In Port → Arriving → Sailing.

There is debate about this order. Why not Sailing first (most urgent)?

The answer: most of the time there is no urgent sailing. Putting Sailing first would be wrong 80% of the time and feel like a false alarm. Instead:
- **Alert banners** handle urgency proactively — they interrupt regardless of scroll position
- When there IS an urgent sailing, the top alert banner is impossible to miss
- The standard order (In Port first) reflects what most volunteers need most often

This avoids cry-wolf design where everything screams urgency all the time.

Section headers stick as you scroll so the user always knows which section they are in.

### Tablet Layout Notes

Two-column layout: In Port left, Arriving right. Sailing below, full width.

The Sailing section being full-width is intentional even when empty. Its consistent position at the bottom of the viewport trains the eye. After a few days of use, a volunteer's eye will automatically check the bottom of the screen for sailing urgency.

### Desktop Layout Notes

Three-column layout. All three sections simultaneously visible without scrolling (in normal port conditions with 2-5 vessels per section).

The right detail panel: when a vessel card is tapped, a panel slides in from the right at 480px wide. The three-column layout behind it shifts slightly to accommodate. The user never loses context — they can see which card is selected (highlighted), and the rest of the dashboard is still visible and interactive.

**Admin controls visible on desktop:** The "+ Add Vessel" button appears as a clear labeled button below the In Port section's last card. On mobile it is icon-only in the header.

### Responsive Behavior Summary

| Element | Mobile | Tablet | Desktop |
|---------|--------|--------|---------|
| Sections | Stacked, sticky headers | In Port + Arriving side-by-side; Sailing full-width below | Three equal columns |
| Vessel cards | Full width | Half width | Column-constrained |
| Add Vessel button | Icon in header | Labeled button in header | Labeled button below In Port section |
| Detail view | Navigate to new screen | Navigate to new screen | Slide-in right panel |
| Alert banners | Full width, above sections | Full width, above sections | Full width, above sections |
| Section headers | Sticky | Sticky | Non-sticky (all visible) |

---

## Screen 2: Vessel Detail

**Route:** `/vessel/[id]`
**Desktop:** Slide-in right panel from dashboard

### Purpose
Full information about a single vessel. Supports two use cases:
1. **Volunteer:** "What do I need to do for this ship?" (device status, sailing time, terminal)
2. **Daniel (admin):** "Is this data correct? Let me check and fix it." (edit, raw source, parse status)

### Visual Hierarchy Priority

1. **Vessel name and status** — immediately clear who this ship is and where it stands
2. **Sailing time** (if applicable) — the most time-critical piece of information
3. **Device assignment** — is our device on this ship?
4. **Urgent alert** (if vessel is sailing with device) — the entire top of the detail turns crimson
5. **Terminal and logistics** — where to go
6. **Status history** — context for Daniel, not primary for volunteers
7. **Edit controls** — admin only, visually subordinate

### Two-Second Glance Test
Volunteer opens vessel detail: "This is STAR SANTOS, it's in port at Cooper Marine, Device 2 is on board, no sailing time yet. Nothing to do right now."

Or: "This is MAYAN, it's sailing TONIGHT at 2300, Device 3 is still aboard. I need to retrieve it."

The urgent case must be visually unmistakable from the calm case.

### Urgent State Design

When the vessel has a device and is sailing within 6 hours:
- The entire header section background: `#FEF2F2` (red-50)
- Vessel name: `#7F1D1D` (dark red)
- Status badge: "SAILING — RETRIEVE DEVICE" in crimson
- A dedicated alert block sits between the header and the device section:
  ```
  ┌── [Crimson border] ────────────────────────┐
  │ ⚠ Device 3 must be retrieved before 2300  │
  │ MAYAN sails in approximately 4 hours       │
  │ [Confirm Device Retrieved]                 │
  └────────────────────────────────────────────┘
  ```
- The "Confirm Device Retrieved" button is the Urgent Action Button (56px, full crimson)

### Raw Source Display (Daniel's Tool)

Below the status history, a collapsible section shows the raw Pilot Report text for this vessel:

```
▼ Raw Pilot Report Source
──────────────────────────────────────────
From report received 03/24 at 0500:
  "STAR SANTOS | 03/24 | 0200 | BOARDED | Cooper Marine Terminal | Cooper Marine"

From report received 03/23 at 1700:
  "STAR SANTOS | 03/23 | 2300 PILOT | Cooper Marine Terminal"
──────────────────────────────────────────
```

Collapsed by default for volunteers. Daniel will know to look here. The section header says "View source data" with a chevron.

### Edit Mode

Tapping [Edit] replaces the read view with an inline form. The fields pre-populate. A yellow strip at the top warns: "Manual edits override automatic data. The next Pilot Report update will be flagged for your review."

On mobile, edit mode is a full-screen modal/sheet.
On desktop, it replaces the content in the detail panel.

### Responsive Behavior

| Element | Mobile | Desktop |
|---------|--------|---------|
| Navigation | Back button (← Dashboard) | Panel close button (X) |
| Device section | Stacked below header | Side-by-side in panel |
| Edit controls | Bottom sheet | Inline in panel |
| Raw source | Collapsible | Collapsible |

---

## Screen 3: Device Inventory

**Route:** `/devices`

### Purpose
Answer the question: "Where are all 8 devices right now?"

This is a secondary screen but critical for operational readiness. Volunteers check it before leaving to visit a ship.

### Visual Hierarchy Priority

1. **Summary bar** — "5 available · 2 assigned · 1 urgent" — the instant answer
2. **Urgent devices** (RETRIEVE NOW) — always first in the list, crimson
3. **Assigned devices** — middle of list, blue accents
4. **Available devices** — bottom, green, calm

### Two-Second Glance Test
"Device 3 needs retrieval — it's on MAYAN. Everything else is available."

The summary bar at the top provides the macro view. The sorted list provides the micro view. No one has to search for the urgent device.

### Summary Bar Design

```
┌────────────────────────────────────────────────────────┐
│  5 available  ·  2 assigned  ·  1 urgent              │
└────────────────────────────────────────────────────────┘
```

- Background: White with subtle border-bottom
- Numbers are color-coded: Green for available count, Blue for assigned, Crimson for urgent
- The bar stays sticky at the top of the device list as you scroll (desktop and tablet)

### Last-Assigned Context

For assigned devices, show not just the vessel name but enough to act:
```
Device 4  [ASSIGNED]
On XIN YA ZHOU · Austal Shipyard · No sailing time yet
```

The terminal is included because a volunteer needs to know where to go to retrieve it.

For urgent devices:
```
Device 3  [RETRIEVE NOW]
On MAYAN · Cooper Marine Terminal · Sails TONIGHT at 2300
```

"Sails TONIGHT" uses bold emphasis and the word "tonight" (not just the time) to make the urgency visceral.

### Quick Actions on the Device List

For each device row, show the most relevant action as a secondary button:
- Available: "Assign" button (low prominence — secondary style)
- Assigned: "Check In" button (medium prominence — secondary style with blue tint)
- Needs Retrieval: "Confirm Retrieved" button (high prominence — crimson outline with icon)

These buttons on the list itself save the extra tap into the device detail for common actions.

### Responsive Behavior

| Element | Mobile | Tablet | Desktop |
|---------|--------|--------|---------|
| Layout | Single-column list | Two-column card grid | Two-column card grid |
| Sort order | Urgent → Assigned → Available | Same | Same |
| Summary bar | Sticky top | Sticky top | Static top |
| Quick actions | Visible on each row | Visible on each card | Visible on each row |

### Edge Case: All Devices Available

This is the ideal state. Celebrate it:
```
┌────────────────────────────────────────────────────────┐
│  ✓ All 8 devices available                            │
└────────────────────────────────────────────────────────┘

All your devices are in.
Assign a device from a vessel's detail screen.
```

No list needed — just the success state. List appears when any device is assigned.

---

## Screen 4: Device Checkout Flow

**Route:** Accessed via Vessel Detail → "Assign Device" or Device List → "Assign"

**Mode:** Modal / bottom sheet (not a full page navigation)

### Purpose
Assign a device to a vessel. Fast. Three taps. No typing.

### Two-Second Glance Test
"I'm assigning Device 2 to STAR SANTOS. I can see Device 2 is available. Tap, tap, done."

### Design Principle: The Physical Object
Volunteers are holding a physical device when they do this flow. The UI must map to the physical reality — large tap targets, clear device identifiers (D1, D2, etc. matches the label on the physical device), and confirmation that states which physical device they are about to assign.

### Flow Design (see DES-components.md for full spec)

Step 1 is skipped if entering from Vessel Detail (vessel already known).
Step 2: Available device grid — large enough to tap with one finger, unavailable devices muted and labeled.
Step 3: Confirmation screen with vessel name, device number, terminal, and sailing status.

### Error Prevention
If assigning a device to a vessel that is sailing within 2 hours, show a warning:
```
⚠ MAYAN is scheduled to sail in 90 minutes.
Are you sure you want to assign a device now?

This will immediately start the retrieval alert sequence.

[Cancel]    [Assign Anyway — Start Alerts]
```

This prevents accidental assignments that would immediately trigger urgent alerts.

---

## Screen 5: Device Check-In

**Route:** Accessed via Vessel Detail, Device Detail, or Alert Banner action

**Mode:** Modal / bottom sheet

### Purpose
Confirm that a device has been physically retrieved from a vessel.

### Two-Second Glance Test
"I'm holding Device 3. Confirm it's retrieved. Done."

### Design Philosophy
This is the most consequential single action in the app. Getting it right means no device is ever lost.

The UI must:
1. State clearly what is being confirmed (device number, vessel name)
2. Include a physical confirmation prompt: "I have Device 3 in hand"
3. Not be triggerable by accident

**Why a checkbox prompt?** A confirmation dialog with Cancel/Confirm can be accidentally triggered by a misclick. Adding "I have Device 3 in hand" as a required acknowledgment forces a deliberate action. The volunteer must read and tap the checkbox, then tap the confirm button.

```
┌─────────────────────────────────────────────────────┐
│  Confirm Retrieval                              [X] │
├─────────────────────────────────────────────────────┤
│                                                     │
│  Device 3 from MAYAN                               │
│                                                     │
│  [☐] I have Device 3 in my hands right now.        │
│                                                     │
│  [Cancel]              [Confirm Retrieved]          │
│                         (disabled until checked)    │
└─────────────────────────────────────────────────────┘
```

The "Confirm Retrieved" button is disabled until the checkbox is ticked. Once ticked, the button becomes the full Urgent Action Button styling (if this was an urgent retrieval) or standard Primary Button styling.

### Success Feedback
```
✓ Device 3 retrieved
All pending alerts for MAYAN have been cancelled.
```
Auto-dismiss after 2 seconds. Return to previous screen.

---

## Screen 6: Alert Log

**Route:** `/alerts`

### Purpose
Audit trail of all alerts sent, alerts acknowledged, and upcoming scheduled alerts. Primarily useful for Daniel to verify the alert system is working and to review historical activity.

### Visual Hierarchy Priority

1. **Active / Unacknowledged alerts** — if any exist, they appear at the top with the same styling as alert banners
2. **Upcoming alerts** — what is scheduled to fire and when
3. **Alert history** — scrollable log of past alerts

### Two-Second Glance Test
"No active alerts. Next alert fires at 1700 for FEDERAL KUDOS."

### Alert Log Entry Design

Each log entry:
```
┌────────────────────────────────────────────────────────┐
│  [⚠ Sent] 03/24 at 1700                              │
│  Heads up: FEDERAL KUDOS sails at 2300.              │
│  Device 6 is aboard. About 6 hours remaining.        │
│  Delivered via SMS to Daniel Stover                  │
└────────────────────────────────────────────────────────┘
```

Delivery status is important — Daniel needs to know the alert actually went out. Show: "Delivered via SMS to Daniel Stover" or "SMS delivery failed — check Twilio".

### Upcoming Alerts Section

```
UPCOMING ALERTS
──────────────────────────────────────────────────
  2100  2h warning · FEDERAL KUDOS / Device 6
  2200  1h urgent  · FEDERAL KUDOS / Device 6
  [No alerts scheduled for after tonight]
──────────────────────────────────────────────────
```

This gives Daniel visibility into what the system will do, not just what it has done.

### Empty State
```
No alerts in the past 24 hours.
No upcoming alerts scheduled.

The system will automatically alert when vessels
with assigned devices are approaching sailing time.
```

---

## Screen 7: Manual Vessel Entry Form

**Route:** `/vessel/new` or modal from dashboard

### Purpose
Allow Daniel to add a vessel that did not come through the Pilot Report system.

### Context
Daniel uses this when he gets information through other channels — a phone call from the port agent, word of mouth at the marina, advance notice from Harbor Master that hasn't appeared in the Pilot Report yet.

The form must be fast and forgiving. Daniel should be able to add a vessel in under 60 seconds, including fields he does not know yet (all non-required fields can be left blank and filled in later).

### Two-Second Glance Test (of the completed form)
"I'm adding XIN YA ZHOU, arriving tomorrow morning, Cooper Marine. Done."

### Form Design

(Full spec in DES-components.md)

Key design notes specific to this screen:
- Time field accepts free text — "tomorrow morning", "AM", "0600" are all valid inputs
- A hint below the time field: "Enter a time like '1300', or descriptive text like 'AM' or 'afternoon' — we'll show it as you entered it."
- Terminal dropdown is pre-populated with Mobile's known terminals: Cooper Marine, McDermott, Austal, Alabama Shipyard, plus "Other (specify)"
- After saving, the user is taken directly to the new vessel's detail page, not back to the dashboard. This gives them the option to immediately assign a device if needed.

### Validation

Required fields (Vessel Name, Date, Status) are validated on submit. All other fields are optional.

**Time field validation:** No format enforcement. If Daniel types "1300", it is stored as "1300". If he types "AM", it is stored as "AM". The system never tries to parse manual entries — it shows them exactly as entered, with a small "as entered" note beside ambiguous formats.

---

## Screen 8: Settings

**Route:** `/settings`
**Access:** Admin only (Daniel)

### Purpose
Low-frequency configuration screen. Daniel visits this to: add/remove volunteers, change who receives SMS alerts, check the email ingestion status.

### Visual Hierarchy Priority

This screen is not about urgency — it is about configuration. The visual weight is deliberately calm and utilitarian.

### Sections

**Users & Volunteers**
```
TEAM MEMBERS
──────────────────────────────────────────────────
  Daniel Stover   Admin   daniel@example.com     [Remove]
  Mary Hughes     Volunteer  mary@example.com    [Remove]
  John Smith      Volunteer  john@example.com    [Remove]
                                          [Invite Volunteer]
──────────────────────────────────────────────────
```

[Invite Volunteer] opens a simple modal: email address field + Send Invite button.

**Alert Recipients**
```
SMS ALERT RECIPIENTS
──────────────────────────────────────────────────
  Who receives sailing alerts via SMS?

  [✓] Daniel Stover  +1 (251) 555-0100
  [✓] Mary Hughes    +1 (251) 555-0200
  [ ] John Smith     +1 (251) 555-0300

  All checked recipients receive: 6-hour, 2-hour,
  and 1-hour alerts when a vessel with a device
  is approaching its sailing time.
──────────────────────────────────────────────────
```

Checkboxes here are 24px minimum, with 44px touch areas.

**Email Ingestion Status**
```
PILOT REPORT INGESTION
──────────────────────────────────────────────────
  Status: ✓ Active
  Last report received: Today at 05:14 AM
  Reports today: 2
  Next expected: ~9:00 AM - 11:00 AM

  If no report arrives by noon, you will receive
  an SMS notification.

  [View Raw Email Log]      (for debugging)
──────────────────────────────────────────────────
```

This section is important for Daniel's peace of mind. He needs to know the system is receiving data. "Status: Active" with a timestamp is reassuring. "No reports in 6+ hours" would show a warning state here.

### Responsive Behavior

Settings is a single-column layout at all breakpoints. No complex responsive behavior needed — it is a simple list of forms and toggles.

---

## Screen 9: Login

**Route:** `/login`

### Purpose
Simple, clean login. The team uses magic link or password via Supabase Auth.

### Design Philosophy

Login is a barrier. Make it as thin as possible. For a small team of trusted volunteers, the login experience should feel like "proving you belong here" not "passing a security gauntlet."

### Layout

Centered card, max-width 400px, vertically centered in viewport.

```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│  [PortLink wordmark/logo]                              │
│                                                         │
│  Apostleship of the Sea                                │
│  Port of Mobile                                        │
│                                                         │
│  ─────────────────────────────────────────────────    │
│                                                         │
│  Email address                                         │
│  [                                          ]          │
│                                                         │
│  [Send Magic Link]                                     │
│                                                         │
│  ─────────────────────────────────────────────────    │
│                                                         │
│  We will send you a secure login link.                 │
│  No password needed.                                   │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**Magic link is preferred over password:**
- Older users forget passwords
- Magic links work reliably on mobile
- Eliminates password reset flows entirely
- Sessions persist on mobile so they rarely need to log in again

**After magic link sent:**
```
Check your email

We sent a login link to daniel@example.com.
Tap the link in the email to sign in.

Didn't get it? [Send again]
```

**Branding note:** The login page is the first thing new volunteers see. Include the ministry name ("Apostleship of the Sea, Port of Mobile") and a simple, warm logo mark. The brand identity should feel maritime and Catholic without being heavy-handed. A simple anchor or compass rose in the Navy palette is appropriate.

---

## Cross-Screen Interaction Patterns

### Back Navigation

Mobile: Back button in top-left, always labeled (not just a chevron). "← Dashboard", "← Devices".

Desktop: No back navigation needed — detail views are panels, not pages. The X closes the panel.

### Confirmation Dialogs

Used for: Mark as Sailed, Remove Device Assignment, Delete Vessel, Remove Team Member.

Pattern: Bottom sheet on mobile, centered modal on desktop. Always two buttons: Cancel (left) + Destructive action (right). Cancel is always secondary style — visually it should be the easier path to avoid accidental confirmations.

### Pull to Refresh

Mobile only. Supported on the Dashboard, Device List, and Alert Log screens. Shows "Last updated: X minutes ago" text when released.

### Keyboard Navigation (Desktop)

Tab order follows visual reading order (left to right, top to bottom). All interactive elements reachable by keyboard. Enter activates buttons and links. Escape closes modals and drawers. Arrow keys navigate within device picker grid.

---

## Screen Transition Guidelines

| Transition | Animation | Duration |
|-----------|-----------|---------|
| Dashboard → Vessel Detail (mobile) | Push right (new screen slides in from right) | 250ms ease |
| Vessel Detail → Dashboard (back) | Push left (screen slides back) | 200ms ease |
| Modal/sheet appear | Slide up from bottom | 250ms ease-out |
| Modal/sheet dismiss | Slide down | 200ms ease-in |
| Alert banner appear | Slide down from top | 250ms ease-out |
| Desktop detail panel open | Slide in from right | 300ms ease-out |
| Card update (new data) | Left border pulse once | 600ms ease |
| Success feedback | Fade in, then fade out | 300ms in, hold 1.5s, 300ms out |

All animations respect `prefers-reduced-motion`. When set, transitions are instant (no animation).
