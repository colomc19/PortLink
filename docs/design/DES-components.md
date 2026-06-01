# DES-components: Component Design Specifications

**Product:** PortLink
**Author:** UI Designer (AI-assisted)
**Date:** 2026-03-24
**Status:** Draft

---

## Overview

This document specifies the detailed design of every reusable component in PortLink. Each spec includes: anatomy, all states, responsive behavior, interaction notes, and accessibility requirements.

Components are ordered by frequency of use. The Vessel Card and Device Card are the most important — get them right first.

**Important:** The dashboard supports both **table/list view** (default) and **card view**, toggled by the user. See `DES-layout.md` for full table layout specs. Components below are specified in card form, but the same data and status styling applies to table rows. The View Mode Toggle component is specified in this document.

---

## 0. View Mode Toggle

A segmented control that switches between table and card views. Appears in the dashboard header area.

### Anatomy

```
┌─────────────────────────────────┐
│  [≡ Table]    [⊞ Cards]         │
│    ↑ active (filled)            │
└─────────────────────────────────┘
```

### Specifications

| Element | Style | Notes |
|---------|-------|-------|
| Container | `inline-flex rounded-lg border border-slate-300 overflow-hidden` | Segmented control |
| Active segment | `bg-navy text-white font-semibold px-4 py-2` | Navy `#1A3556` background |
| Inactive segment | `bg-white text-slate-600 px-4 py-2 hover:bg-slate-50` | Light, clickable |
| Icons | 16px, paired with text label | `≡` for table, `⊞` for cards — always show text labels alongside |
| Min tap target | 48px height | Accessible for older users |

### Behavior
- **Default: Table view** — the team is used to spreadsheets
- Persists to user profile (`view_preference` column in Supabase)
- Applies to both vessel dashboard and device inventory
- Transition between views: instant swap, no animation (avoids disorientation)
- On mobile: toggle is slightly smaller (`px-3 py-1.5 text-sm`) but still 44px min height

### Accessibility
- `role="tablist"` with `role="tab"` on each segment
- `aria-selected="true"` on active segment
- Keyboard: arrow keys to switch, Enter/Space to activate

---

## 1. Vessel Card

The vessel card is the core unit of the entire application. Every volunteer interaction begins here.

### Purpose
Display a vessel's most critical information at a glance. Enable one-tap access to full detail. Signal urgency immediately through visual styling.

### Anatomy

```
┌──[4px status border]──────────────────────────────┐
│                                                    │
│  VESSEL NAME                    [STATUS BADGE]    │
│  Terminal · Time info                             │
│  ─────────────────────────────────────────────   │
│  [Device badge, if assigned]   [Warning, if any] │
│                                                    │
└────────────────────────────────────────────────────┘
```

**Element specifications:**

| Element | Typography | Color | Notes |
|---------|-----------|-------|-------|
| Vessel Name | `text-xl font-semibold` | `#0F172A` | Max 2 lines, wrap (no truncation) |
| Status Badge | `text-sm font-semibold uppercase tracking-wide` | Per status | Top-right aligned |
| Terminal | `text-base text-secondary` | `#475569` | "Cooper Marine Terminal" |
| Time info | `text-base text-secondary` | `#475569` | "Arriving at 1300" / "Sails today at 2300" |
| Device Badge | `text-sm font-semibold` | Per device state | Wifi icon + "Device 3" |
| Warning icon | 20px icon | `#D97706` Amber | Pairs with tooltip/accessible label |
| Left border | 4px solid | Per status | The first visual signal |

### States

#### State: In Port (Normal)
```
┌── [4px Bay Blue #2C5282] ─────────────────────────────┐
│                                                        │
│  STAR SANTOS                           [● IN PORT]    │
│  Cooper Marine Terminal · In port since 0200          │
│  ─────────────────────────────────────────────────   │
│  📶 Device 2                                         │
│                                                        │
└────────────────────────────────────────────────────────┘
```
- Background: White
- Border: 1px `#E2E8F0`
- Left border: 4px `#2C5282`
- Shadow: `shadow-sm`

#### State: In Port (No Device)
Same as above but no device badge row. The empty row is hidden entirely — do not show "No device assigned" as a persistent label (would be distracting). Device absence is signaled by its absence, not a negative label.

#### State: Arriving
```
┌── [4px Sky Blue #0284C7] ─────────────────────────────┐
│                                                        │
│  FEDERAL KUDOS                      [↑ ARRIVING]     │
│  McDermott Terminal · Expected today at 1300          │
│  ─────────────────────────────────────────────────   │
│  (no device)                                         │
│                                                        │
└────────────────────────────────────────────────────────┘
```

#### State: Sailing — No Device
```
┌── [4px Slate #94A3B8] ────────────────────────────────┐
│                                                        │
│  DUBAI BEAUTY                        [↗ SAILING]     │
│  Austal · Sails today at 1800                        │
│                                                        │
└────────────────────────────────────────────────────────┘
```
Deliberately lower visual weight — no device at risk, no urgency required.

#### State: Sailing — Device Aboard (CRITICAL)
```
┌── [4px Crimson #B91C1C] ──────────────────────────────┐
│                                                        │
│  MAYAN                       [⚠ SAILING — RETRIEVE]  │
│  Cooper Marine · Sails TODAY at 2300                  │
│  ─────────────────────────────────────────────────   │
│  [🔴 Device 3 — RETRIEVE NOW]                        │
│                                                        │
└────────────────────────────────────────────────────────┘
```
- Background: `#FEF2F2` (red-50) — the entire card background shifts
- Left border: 4px Crimson
- Status badge: Crimson background, white text
- Device badge: "RETRIEVE NOW" in crimson, with exclamation icon
- Shadow: `shadow-md` — slightly elevated, draws eye

This is the most important card state in the app. It must be unmissable.

#### State: New (just appeared in latest Pilot Report)
A "NEW" indicator, styled as a small teal badge, top-left corner:
```
┌── [NEW] [4px Bay Blue] ───────────────────────────────┐
│  ↗ NEW                                                │
│  XIN YA ZHOU                           [● IN PORT]   │
│  Austal · Arrived at 0800                            │
└────────────────────────────────────────────────────────┘
```
- "NEW" badge: `#0D9488` teal background, white text, top-left, `text-xs font-bold`
- Fades after 30 minutes or after the user opens the detail

#### State: Manual Entry
```
┌── [4px Amber #D97706] ────────────────────────────────┐
│  ✏ MANUAL                                            │
│  PORT ARTHUR                         [● IN PORT]     │
│  McDermott · Arrives tomorrow 0600                   │
└────────────────────────────────────────────────────────┘
```
- "MANUAL" badge visible
- Amber left border
- No different in behavior — works identically for device assignment

#### State: Parse Error / Needs Review
```
┌── [4px Amber #D97706] ────────────────────────────────┐
│                                                        │
│  DUBAI BEAUTY                  [⚠ NEEDS REVIEW]     │
│  Cooper Marine · Time: "0800 ANCHOR--1800" (ambiguous)│
│  ─────────────────────────────────────────────────   │
│  ⚠ Time parsing needs review                        │
│                                                        │
└────────────────────────────────────────────────────────┘
```
- Warning triangle icon
- Amber accents
- Tapping opens the parse error detail view directly

#### State: Hover / Focus (desktop and keyboard navigation)
- Shadow increases from `shadow-sm` to `shadow-md`
- Left border slightly darkens
- Cursor: pointer
- Focus outline: 3px Navy, 2px offset around entire card

#### State: Sailed / Gone (shown in history or if still on-screen from a previous session)
```
┌── [4px Light Slate #CBD5E1] ──────────────────────────┐
│                                                        │
│  STAR SANTOS                          [✓ SAILED]     │
│  Cooper Marine · Sailed 03/24 at 2300               │
│                                                        │
└────────────────────────────────────────────────────────┘
```
- Background: `#F8FAFC` (very light)
- All text in muted colors
- Low visual weight — ships that have sailed are history, not action items
- By default, sailed vessels are hidden from the main dashboard. Only shown in an "Include sailed" toggle or in Vessel History.

### Responsive Behavior
- Mobile: Full width, `p-4`, stacked two-line vessel name if long
- Tablet: Half width (two per row), `p-5`
- Desktop: Column-constrained width, `p-5`, detail panel opens on tap without navigation

### Accessibility
- Entire card wrapped in `<button>` or `<a>` element (whole-card tap target)
- `aria-label="STAR SANTOS, In Port, Cooper Marine Terminal, Device 2 assigned"`
- Status changes announced via `aria-live="polite"` on the section containing the cards
- Urgent cards use `aria-live="assertive"` when they first appear

---

## 2. Device Card / Row

### Purpose
Show device status at a glance. Provide quick-action access for check-in and assignment.

### Desktop / Tablet: Row Layout

```
┌─────────────────────────────────────────────────────────────────┐
│  Device 3    [🔴 RETRIEVE NOW]    MAYAN · sails 2300     [→]    │
├─────────────────────────────────────────────────────────────────┤
│  Device 4    [● ASSIGNED]         XIN YA ZHOU · no sail  [→]    │
├─────────────────────────────────────────────────────────────────┤
│  Device 1    [✓ AVAILABLE]                               [→]    │
├─────────────────────────────────────────────────────────────────┤
│  Device 2    [✓ AVAILABLE]                               [→]    │
└─────────────────────────────────────────────────────────────────┘
```

Row height: 64px. The `[→]` is a chevron-right that indicates tappable for detail.

### Mobile: Card Layout

Same data, restructured for narrow screen:

```
┌─────────────────────────────────────────┐
│  Device 3                              │
│  [🔴 RETRIEVE NOW]                     │
│  MAYAN · Cooper Marine · sails 2300    │
│                    [View Details]      │
└─────────────────────────────────────────┘
```

### States

| State | Left Border | Badge | Vessel Info | Action |
|-------|------------|-------|-------------|--------|
| Available | Forest Green | "AVAILABLE" | — | "Assign" button |
| Assigned | Bay Blue | "ASSIGNED" | Vessel + no sail time | "Check In" button |
| Assigned + sailing soon | Amber | "ASSIGNED" | Vessel + time, "sails today" | "Check In" button |
| Needs Retrieval | Crimson | "RETRIEVE NOW" | Vessel + sailing time | "Confirm Retrieved" button |
| Unknown | Slate | "UNKNOWN" | — | "Set Status" link |

### Sort Order on Device List
Always sort: Needs Retrieval first → Assigned → Available. Within each group, sort by device number. Never sort purely by device number as it would bury urgent items.

### Quick Actions on Device Card

For Assigned and Needs Retrieval states, show a primary action button directly on the card:
- "Confirm Retrieved" (Needs Retrieval state) — immediately marks device as available
- This must require a single confirmation tap (not just one tap) to prevent accidental mark-ins

---

## 3. Alert Banner

### Purpose
Interrupt the user's attention for time-sensitive actions. These are the safety net for the entire operation.

### Anatomy

```
┌─────────────────────────────────────────────────────────────────────┐
│ [border-left: 4px urgency-color]                                   │
│                                                                     │
│ [icon]  [Primary message — bold]                                   │
│         [Secondary detail — vessel, time, terminal]                │
│                                                                     │
│         [Primary Action Button]    [Secondary Action or dismiss]   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Tier 1: Informational (6 hours before sailing)

```
┌── [4px #2C5282] ──────────────────────────────────────────────────┐
│ ℹ  Heads up: FEDERAL KUDOS sails at 1800 today.                  │
│    Device 6 is aboard. About 6 hours remaining.                   │
│    [View Vessel]                                     [Dismiss]    │
└────────────────────────────────────────────────────────────────────┘
```
- Background: `#EFF6FF` (blue-50)
- Icon: `InformationCircleIcon` in Bay Blue
- Text: Normal weight, calm phrasing

### Tier 2: Warning (2 hours before sailing)

```
┌── [4px #D97706] ──────────────────────────────────────────────────┐
│ ⚠  Action needed: MAYAN sails at 2300 tonight.                   │
│    Device 3 is still aboard. Under 2 hours remaining.             │
│    [View Vessel]  [Confirm Device Retrieved]        [Dismiss]     │
└────────────────────────────────────────────────────────────────────┘
```
- Background: `#FFFBEB` (amber-50)
- Icon: `ExclamationTriangleIcon` in Amber

### Tier 3: Urgent (1 hour or less before sailing)

```
┌── [4px #B91C1C] ──────────────────────────────────────────────────┐
│ ⚠  URGENT: MAYAN sails in less than 1 hour.                      │
│    Device 3 has NOT been retrieved. Sails at 2300 tonight.        │
│    Cooper Marine Terminal                                         │
│                                                                   │
│    [Confirm Device Retrieved]              [View Vessel]         │
└────────────────────────────────────────────────────────────────────┘
```
- Background: `#FEF2F2` (red-50)
- Icon: `ExclamationCircleIcon` in Crimson, 24px
- Primary text: `text-lg font-bold` — larger than other banners
- Primary action button: Full crimson "Urgent Action Button" (from style guide)
- "URGENT" is the only case where strong emphasis is appropriate

**Multiple alerts:** Stack with most urgent at top. If 3 or more, collapse to summary:
```
┌── [4px Crimson] ─────────────────────────────────────────────────┐
│ ⚠  3 vessels need attention — 1 urgent, 2 require action soon.  │
│    [View All Alerts]                                             │
└───────────────────────────────────────────────────────────────────┘
```

### Dismissal Behavior
- Dismissed banners move to the Alert Log — they are not deleted
- Dismissing an alert does NOT mean the device has been retrieved — this is a critical distinction
- "Confirm Device Retrieved" (the action button) is the only path to removing the alert permanently
- Urgent banners (Tier 3) require a swipe or explicit X tap to dismiss — they cannot be accidentally dismissed

---

## 4. Status Badges

### Anatomy
`[icon 16px] [label text]` within a pill/chip container.

Height: 28px. Padding: `px-3 py-1`. Border-radius: 4px. Font: `text-sm font-semibold uppercase tracking-wider`.

### Vessel Status Badges

**IN PORT**
```
Background: #DBEAFE  Text: #1E3A5F  Icon: AnchorIcon (custom)
```

**ARRIVING**
```
Background: #E0F2FE  Text: #0C4A6E  Icon: ArrowRightCircleIcon
```

**SAILING**
```
Background: #F1F5F9  Text: #334155  Icon: ArrowUpRightIcon
```

**SAILING — RETRIEVE DEVICE** (combined vessel+device state)
```
Background: #FEE2E2  Text: #7F1D1D  Icon: ExclamationCircleIcon
```
This badge is used when a sailing vessel has a device. It replaces the standard "SAILING" badge.

**SAILED**
```
Background: #F8FAFC  Text: #94A3B8  Icon: CheckCircleIcon
```

**NEEDS REVIEW**
```
Background: #FFFBEB  Text: #78350F  Icon: ExclamationTriangleIcon
```

**MANUAL ENTRY**
```
Background: #FFF7ED  Text: #431407  Icon: PencilSquareIcon
```

### Device Status Badges

**AVAILABLE**
```
Background: #F0FDF4  Text: #14532D  Icon: CheckCircleIcon (green)
```

**ASSIGNED**
```
Background: #EFF6FF  Text: #1E3A5F  Icon: WifiIcon (blue)
```

**RETRIEVE NOW**
```
Background: #FEF2F2  Text: #7F1D1D  Icon: ExclamationCircleIcon
```

### New Vessel Indicator
Not a status badge — an injection badge. Teal fill, top-left corner of card, `text-xs font-bold`:
```
Background: #0D9488  Text: white  Label: "NEW"
```

---

## 5. Forms — Manual Vessel Entry

This form is admin-only (Daniel). It must be simple enough that Daniel does not feel burdened — he is already doing more work than needed.

### Form Fields

| Field | Type | Required | Notes |
|-------|------|---------|-------|
| Vessel Name | Text | Yes | Free text, no autocomplete for MVP |
| Date | Date | Yes | Date picker, defaults to today |
| Time | Text | No | Free text: "1300", "AM", "afternoon", "unknown" |
| Status | Select | Yes | Arriving / In Port / Sailing |
| Terminal | Select + Free | No | Dropdown of known terminals + "Other (type in)" |
| Agent / Shipping Line | Text | No | Optional |
| Notes | Textarea | No | Up to 500 chars |

### Layout (Mobile)

```
┌─────────────────────────────────────┐
│  Add Vessel                    [X]  │  <- Header
├─────────────────────────────────────┤
│  Vessel Name *                      │
│  [                            ]     │
│                                     │
│  Date *                             │
│  [  03/24/2026               ]     │
│                                     │
│  Time                               │
│  [  e.g. "1300" or "AM"       ]    │
│  Note: enter what you know          │
│                                     │
│  Status *                           │
│  [  Arriving              ▼  ]     │
│                                     │
│  Terminal                           │
│  [  Cooper Marine Terminal ▼  ]    │
│                                     │
│  Agent / Shipping Line              │
│  [                            ]     │
│                                     │
│  Notes                              │
│  [                            ]     │
│  [                            ]     │
│                                     │
│  [Cancel]          [Save Vessel]    │
└─────────────────────────────────────┘
```

### Layout (Desktop)

600px wide centered card. Two-column for related fields (Terminal + Agent side by side). Everything else single-column.

### Validation Behavior
- Validate on submit, not on blur (blur validation is annoying, especially for users who Tab between fields)
- On error: scroll to first error, show error message below the field with icon
- Required field errors: "Vessel name is required" (not "This field is required")
- Save button disabled while saving, shows spinner, then success confirmation

---

## 6. Device Checkout Flow

Designed for a volunteer standing at the port. Three taps maximum, zero typing if possible.

### Step 1: Select Vessel (from Vessel Detail, or from Device List)

If reaching checkout from a Vessel Detail page, the vessel is pre-selected. Skip to Step 2.

If reaching checkout from the Device List, show a search:
```
┌─────────────────────────────────────┐
│  Assign Device                 [X]  │
├─────────────────────────────────────┤
│  Which vessel?                      │
│                                     │
│  [Search vessel name...       🔍]  │
│                                     │
│  Currently in port:                 │
│  ● STAR SANTOS                     │
│  ● XIN YA ZHOU                     │
│  ● DUBAI BEAUTY                    │
└─────────────────────────────────────┘
```

The list shows In Port vessels by default (most likely candidates for assignment). Arriving vessels also available. Sailing vessels are shown but with a warning.

### Step 2: Select Device

```
┌─────────────────────────────────────┐
│  Assign Device to STAR SANTOS  [X]  │
├─────────────────────────────────────┤
│  Which device?                      │
│                                     │
│  ┌────────┐ ┌────────┐ ┌────────┐  │
│  │  D1    │ │  D2    │ │  D5    │  │
│  │  [✓]   │ │  [✓]   │ │  [✓]   │  │
│  └────────┘ └────────┘ └────────┘  │
│  ┌────────┐ ┌────────┐             │
│  │  D7    │ │  D8    │             │
│  │  [✓]   │ │  [✓]   │             │
│  └────────┘ └────────┘             │
│                                     │
│  Unavailable:                       │
│  D3 — MAYAN  D4 — XIN YA ZHOU     │
│  D6 — FEDERAL KUDOS                │
└─────────────────────────────────────┘
```

Available devices: large tappable squares (80x80px minimum), easy to tap. Unavailable devices shown at bottom in muted state, not interactive, with vessel name to explain why.

### Step 3: Confirmation

```
┌─────────────────────────────────────┐
│  Confirm Assignment            [X]  │
├─────────────────────────────────────┤
│                                     │
│  Assign Device 2                   │
│  to STAR SANTOS?                   │
│                                     │
│  Cooper Marine Terminal             │
│  No sailing time yet                │
│                                     │
│  Sailing alerts will activate if    │
│  a sailing time is added later.     │
│                                     │
│  [Cancel]          [Assign Device]  │
└─────────────────────────────────────┘
```

On confirm: success feedback (green checkmark, "Device 2 assigned to STAR SANTOS"), auto-close after 1.5 seconds, return to previous screen with device badge now visible on vessel card.

---

## 7. Device Check-In Flow

Simpler than checkout — the volunteer has the device in hand.

### From Vessel Detail or Device List

```
┌─────────────────────────────────────┐
│  Check In Device               [X]  │
├─────────────────────────────────────┤
│                                     │
│  Confirm retrieval of               │
│  Device 3 from MAYAN?              │
│                                     │
│  ✓ I have Device 3 in hand.        │
│    (Physical device confirmed)      │
│                                     │
│  [Cancel]      [Confirm Retrieved]  │
└─────────────────────────────────────┘
```

The phrasing "I have Device 3 in hand" is deliberate — it prompts the volunteer to verify they physically have the device before tapping confirm. This is the last safety check before a ship sails.

On confirm: Device status becomes Available. Any pending alerts for this device/vessel are cancelled. Success feedback.

---

## 8. Vessel Detail Screen

The vessel detail is the full information view for a single vessel. It is also where device assignment and editing happen.

### Anatomy

```
┌─────────────────────────────────────────────────────────┐
│ [← Back]         VESSEL DETAIL       [Edit] (admin)    │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  STAR SANTOS                                           │
│  [● IN PORT]    Cooper Marine Terminal                  │
│                                                         │
│  Arrived: today at 0200                                │
│  Sailing: not yet scheduled                            │
│  Agent: Cooper Marine                                  │
│                                                         │
├─────────────────────────────────────────────────────────┤
│  DEVICE ASSIGNMENT                                     │
│                                                         │
│  📶 Device 2  [● ASSIGNED]                            │
│  Assigned 03/24 at 0845 by Daniel                     │
│                                                         │
│  [Check In Device]                                    │
│  [Assign Another Device] (if < 8 assigned)            │
├─────────────────────────────────────────────────────────┤
│  STATUS HISTORY                                        │
│                                                         │
│  ● 03/24 at 0200  Arrived (Pilot Report 03/24 0500)   │
│  ○ 03/24 at 0000  At Anchor (Pilot Report 03/23 1700) │
│  ○ 03/23 at 1700  Pilot assigned (Pilot Report 03/23) │
│                                                         │
│  [View raw Pilot Report]  (link to source text)       │
├─────────────────────────────────────────────────────────┤
│  NOTES                        [Add Note] (admin)       │
│  No notes yet.                                         │
└─────────────────────────────────────────────────────────┘
```

### Urgent State (Sailing with Device)

The detail view reflects urgency:
- Header background becomes `#FEF2F2`
- A full-width Tier 3 alert banner appears below the header section
- "Check In Device" button becomes the Urgent Action Button (56px, crimson)
- Status badge: "SAILING — RETRIEVE DEVICE"

### Edit Mode (Admin Only)

Inline editing — tapping the [Edit] button transforms the view:

```
│  Vessel Name: [STAR SANTOS                 ]           │
│  Status: [In Port ▼]                                  │
│  Terminal: [Cooper Marine Terminal ▼]                  │
│  Arrival time: [0200]                                 │
│  Sailing time: [                         ]            │
│  Notes: [                                ]            │
│                                                       │
│  [Cancel]                    [Save Changes]           │
```

Editing shows a yellow "Manual override" note below the form:
"Saving will mark this record as manually edited. Future Pilot Report updates for this vessel will be flagged for your review before applying."

---

## 9. Empty States

Empty states should never feel like errors. They should be reassuring.

### In Port — Empty
```
┌─────────────────────────────────────────────────────────┐
│  ● IN PORT                                             │
│                                                         │
│  [anchor icon, light gray, 48px]                       │
│                                                         │
│  No vessels currently in port.                         │
│  New vessels will appear here automatically            │
│  when the next Pilot Report arrives.                   │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Arriving — Empty
```
  No arrivals scheduled for today.
  [anchor horizon illustration, muted]
```

### Sailing — Empty (the best state)
```
  ✓ No departures today.
  All devices are safe and accounted for.
```
This is the only empty state with a positive icon. No departures = no risk = celebrate it.

### Devices — All Available
```
  ✓ All 8 devices available.
  None are currently assigned to a vessel.
```

### Alerts — None Active
```
  No active alerts.
  All devices are accounted for.
```

---

## 10. Notification Indicators

### Parse Error Indicator

When the system has flagged vessels for manual review, a notification chip appears in the dashboard header:

```
┌─────────────────────────────────────┐
│ PortLink          ⚠ 2 need review  │
└─────────────────────────────────────┘
```

Tapping "2 need review" navigates to a filtered view showing only the flagged vessels.

### New Data Indicator

After a Pilot Report is ingested:

```
[↻ Updated just now · 3 vessels changed]
```

This appears as a pill below the dashboard header. Tapping it does nothing (just informational). It fades after 60 seconds. It is not a blocking banner.

### Alert Tab Badge

On the bottom nav (mobile), the Alerts tab shows a red badge with the count of unacknowledged alerts:

```
[🔔] (2)   <- red dot with "2"
Alerts
```

The count goes away when the user opens the Alerts screen. The dot changes to a red filled circle for urgent alerts vs. an outline indicator for informational ones.

---

## 11. Parse Error Resolution Screen

Accessed via "Needs Review" badge on a vessel card or the "X need review" chip in the header.

### Layout

```
┌─────────────────────────────────────────────────────────┐
│ [← Back]          NEEDS REVIEW                         │
├─────────────────────────────────────────────────────────┤
│  DUBAI BEAUTY                         [⚠ NEEDS REVIEW] │
│  Cooper Marine Terminal                                 │
│                                                         │
│  WHAT THE SYSTEM PARSED                                 │
│  ─────────────────────────────                         │
│  Status: Arriving                                      │
│  Time: 0800                                            │
│                                                         │
│  RAW SOURCE TEXT                                       │
│  ─────────────────────────────                         │
│  "0800 ANCHOR--1800 PILOT"                             │
│                                                         │
│  WHAT MIGHT THIS MEAN?                                 │
│  ─────────────────────────────                         │
│  The system is uncertain whether 0800 or 1800 is       │
│  the relevant time for this vessel's status.           │
│                                                         │
│  Please review the raw text above and correct          │
│  the fields below:                                     │
│                                                         │
│  Status: [At Anchor ▼]                                │
│  Time: [0800      ] (or leave as-is if correct)       │
│  Expected dock: [1800     ] (optional)                 │
│  Notes: [Pilot boards at 1800             ]           │
│                                                         │
│  [Skip for Now]            [Save & Mark Reviewed]      │
└─────────────────────────────────────────────────────────┘
```

Always show the raw source text. Daniel is the expert. Let him interpret it.

---

## 12. Loading States

### Dashboard Skeleton

Show shimmer placeholders matching card dimensions while data loads:

```
┌─────────────────────────────────────┐
│  ████████████████                  │  <- Section header shimmer
├─────────────────────────────────────┤
│  ┌─────────────────────────────┐   │
│  │  ██████████          ████  │   │  <- Card shimmer
│  │  ████████████               │   │
│  └─────────────────────────────┘   │
│  ┌─────────────────────────────┐   │
│  │  ██████████          ████  │   │
│  │  ████████████               │   │
│  └─────────────────────────────┘   │
└─────────────────────────────────────┘
```

Shimmer animation: CSS gradient sweep left-to-right, 1.5s cycle, `#E2E8F0` to `#F1F5F9`.

### Action Loading (Button Spinner)

When an action is in-flight (device assignment saving, form submitting):
- Button text replaced with spinner icon
- Button disabled
- No page-level spinner
- Timeout: if action takes > 5 seconds, show "Still saving..." and offer retry

### Error States (Network/Server Failure)

If dashboard fails to load:
```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│  Could not load vessel data.                           │
│  Check your connection and try again.                  │
│                                                         │
│  [Try Again]                                           │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

Never show technical error messages to volunteers. Log them internally but surface only human-readable messages.
