# DES-layout: Layout & Navigation Design

**Product:** PortLink
**Author:** UI Designer (AI-assisted)
**Date:** 2026-03-24
**Status:** Draft

---

## Layout Philosophy

PortLink is not a mobile-first app — it is a multi-device app where every breakpoint is a first-class experience. The team uses phones in parking lots, tablets at home before a port run, and desktops when planning. The layout must be equally functional on all three without feeling like a compromised adaptation.

The single most important layout principle: **the three vessel sections (In Port, Arriving, Sailing) must never require more than one tap to reach from anywhere in the app.** They are the mission-critical view.

---

## Information Architecture

```
PortLink App
├── Dashboard (default, home screen)
│   ├── Alert Banner Area (top — urgent only)
│   ├── In Port Section
│   │   └── Vessel Cards → Vessel Detail
│   ├── Arriving Section
│   │   └── Vessel Cards → Vessel Detail
│   └── Sailing Section
│       └── Vessel Cards → Vessel Detail
│
├── Devices (second nav item)
│   ├── Summary Bar (X available / Y assigned / Z urgent)
│   └── Device List (8 items) → Device Detail
│
├── Alerts (third nav item)
│   ├── Active Alerts
│   └── Alert History
│
└── Settings (fourth nav item, admin-gated)
    ├── Manage Volunteers
    ├── Alert Preferences
    └── Ingestion Status
```

**Secondary navigation within Dashboard:**
The three sections are not separate pages — they are sections on a single scrollable page. On mobile, section headers are sticky so the user always knows which section they are in. On desktop, all three sections are visible simultaneously.

---

## Navigation Pattern

### Mobile (< 768px): Bottom Tab Bar

```
┌─────────────────────────────────────┐
│  [Content Area]                     │
│                                     │
│                                     │
│                                     │
├─────────────────────────────────────┤
│  [⌂]      [📶]    [🔔]    [⚙️]    │
│  Home   Devices  Alerts  Settings  │
└─────────────────────────────────────┘
```

- Height: 64px
- Icon 24px + label `text-sm font-semibold` below
- Active tab: Navy icon + label, gold 3px underline accent
- Inactive: Slate-400
- Alert badge on Alerts tab: Red circle with count, top-right of icon
- Fixed to bottom, above OS safe area
- Background: White with `shadow-lg` (upward)

**Why bottom bar, not hamburger:** Older users with reduced motor precision find tab bars dramatically easier than hamburger menus. Every navigation destination is visible at a glance. No hidden layers.

### Tablet (768px – 1199px): Top Navigation Bar

```
┌─────────────────────────────────────────────────────┐
│  PortLink     Dashboard  Devices  Alerts  Settings  │
├─────────────────────────────────────────────────────┤
│  [Content Area]                                     │
│                                                     │
└─────────────────────────────────────────────────────┘
```

- Height: 64px
- Logo + wordmark left (Navy)
- Navigation links centered or right-aligned
- Active: Bold + navy underline 3px
- Sticky on scroll

### Desktop (1200px+): Top Navigation Bar + optional sidebar for detail panels

Same top bar as tablet. On desktop, a right panel opens for Vessel Detail and Device Detail rather than navigating away from the dashboard entirely. This keeps the main vessel list always visible.

```
┌────────────────────────────────────────────────────────────────┐
│  PortLink        Dashboard    Devices    Alerts    Settings     │
├────────────────────────────────────────────────────────────────┤
│                                                                 │
│  [In Port]         [Arriving]           [Sailing]              │
│  ──────────        ──────────           ─────────              │
│  [Vessel Card]     [Vessel Card]        [Vessel Card - URGENT]  │
│  [Vessel Card]     [Vessel Card]        [Vessel Card]           │
│                                                                 │
└────────────────────────────────────────────────────────────────┘
```

When a vessel is tapped on desktop, a slide-in right panel (drawer) opens at 480px wide, overlapping the right section of the three-column layout. The main list remains visible and navigable.

---

## Dashboard Layout

The dashboard is the app. Volunteers may spend 100% of their session here. It must do its job within a single glance.

### Mobile Dashboard Layout

```
┌────────────────────────────┐
│ PortLink            [Menu] │  <- Header: 56px
├────────────────────────────┤
│ ⚠ URGENT: MAYAN sails in  │  <- Alert Banner (conditional)
│ 1h. Device 3 aboard.       │
│ [View Vessel]              │
├────────────────────────────┤
│ ● IN PORT  (3)             │  <- Sticky section header: 44px
├────────────────────────────┤
│ ┌──────────────────────┐   │
│ │ STAR SANTOS          │   │  <- Vessel card
│ │ Cooper Marine        │   │
│ │ In port since 0200   │   │
│ │ [📶 Device 2]        │   │
│ └──────────────────────┘   │
│ ┌──────────────────────┐   │
│ │ XIN YA ZHOU          │   │
│ │ Austal Shipyard      │   │
│ │ In port since 0800   │   │
│ │ No device            │   │
│ └──────────────────────┘   │
├────────────────────────────┤
│ ↑ ARRIVING  (2)            │  <- Sticky section header
├────────────────────────────┤
│ ┌──────────────────────┐   │
│ │ FEDERAL KUDOS        │   │
│ │ McDermott            │   │
│ │ Expected today 1300  │   │
│ └──────────────────────┘   │
├────────────────────────────┤
│ ↗ SAILING  (1)             │  <- Red section header when urgent
├────────────────────────────┤
│ ┌──────────────────────┐   │
│ │ MAYAN            🔴  │   │  <- URGENT card (crimson border)
│ │ Cooper Marine        │   │
│ │ Sails today 2300     │   │
│ │ [⚠ Device 3 aboard]  │   │
│ └──────────────────────┘   │
├────────────────────────────┤
│  [⌂]  [📶]  [🔔]  [⚙️]   │  <- Bottom nav: 64px
└────────────────────────────┘
```

**Mobile-specific behaviors:**
- Section headers are sticky (`position: sticky; top: 56px`) so the section label is always visible as you scroll through many vessels
- Section header shows the count in parentheses — fast orientation
- The Sailing section header turns the crimson accent color when any sailing vessel has a device assigned
- Pull-to-refresh: standard iOS/Android gesture, with "Updated: 2 min ago" feedback
- "Last updated" timestamp shown under the header: small, muted, but always present

### Tablet Dashboard Layout (768px – 1199px)

Two-column layout: In Port and Arriving side-by-side, Sailing full-width below (because Sailing with urgent devices always deserves the most prominent treatment):

```
┌───────────────────────────────────────────────────┐
│ PortLink     Dashboard   Devices   Alerts  Settings│
├───────────────────────────────────────────────────┤
│ [Alert Banner if active]                          │
├────────────────────────┬──────────────────────────┤
│  ● IN PORT (3)         │  ↑ ARRIVING (2)          │
│  ─────────────────     │  ──────────────────       │
│  [Vessel Card]         │  [Vessel Card]            │
│  [Vessel Card]         │  [Vessel Card]            │
│  [Vessel Card]         │                           │
├────────────────────────┴──────────────────────────┤
│  ↗ SAILING (1)                                    │
│  ──────────────────────────────────────────────   │
│  [URGENT Vessel Card — full width]                │
└───────────────────────────────────────────────────┘
```

The Sailing section always occupies a full-width band at the bottom. Even when there are no urgent sailings, it remains visible (showing "No departures today" in the empty state). This consistent position trains the eye — you always look at the same place for sailing status.

### Desktop Dashboard Layout (1200px+)

True three-column layout. All sections visible simultaneously without scrolling in most use cases:

```
┌──────────────────────────────────────────────────────────────────────┐
│ PortLink            Dashboard     Devices     Alerts     Settings     │
├──────────────────────────────────────────────────────────────────────┤
│ [Alert Banner — full width, conditional]                             │
├──────────────────┬──────────────────┬─────────────────────────────────┤
│  ● IN PORT       │  ↑ ARRIVING      │  ↗ SAILING                     │
│  ────────────    │  ───────────     │  ───────────                    │
│                  │                  │  [URGENT Card - crimson]         │
│  [Card]          │  [Card]          │                                 │
│  [Card]          │  [Card]          │                                 │
│  [Card]          │                  │                                 │
│                  │                  │                                 │
│  [+ Add Vessel]  │                  │                                 │
│  (admin only)    │                  │                                 │
└──────────────────┴──────────────────┴─────────────────────────────────┘
```

Column widths: `1fr 1fr 1fr` in normal state. If Sailing section has urgent items, it can be given `1.2fr` weight to draw the eye. The three columns scroll independently if one has many more items.

**Desktop Vessel Detail Panel:**
Clicking a vessel on desktop slides open a right panel (480px wide) that overlays the Sailing column partially. The main dashboard columns remain visible and interactive. This is a major improvement over full-page navigation for power users like Daniel who need to quickly check multiple vessels.

```
┌────────────────────┬──────────────┬──────────────┬────────────────┐
│  ● IN PORT         │  ↑ ARRIVING  │  ↗ SAILING   │ VESSEL DETAIL  │
│                    │              │              │ ─────────────  │
│  [Card ←selected]  │  [Card]      │  [Card]      │ STAR SANTOS    │
│  [Card]            │  [Card]      │              │ Status: In Port│
│  [Card]            │              │              │ Terminal: ...  │
│                    │              │              │ [Assign Device]│
│                    │              │              │ [Edit] (admin) │
└────────────────────┴──────────────┴──────────────┴────────────────┘
```

---

## Dashboard Section Headers

Section headers are the visual anchor of the dashboard. They must be prominent enough to orient the user instantly.

**Anatomy:**
```
[Status icon]  SECTION NAME  (count)          [last-updated chip]
```

| Element | Style |
|---------|-------|
| Status icon | 20px, status color |
| Name | `text-xl font-bold` |
| Count | `text-xl font-bold text-muted` in parentheses |
| Last updated | `text-sm text-muted` far right — "Updated 3 min ago" |

**State changes:**
- In Port header: Always navy/blue
- Arriving header: Sky blue when vessels present, muted when empty
- Sailing header: Crimson/red when any vessel has a device, slate when no devices at risk

---

## Vessel Card Anatomy

The vessel card must be glanceable in under 2 seconds. Information hierarchy inside the card:

### Mobile Card Layout (full width)

```
┌─────────────────────────────────────────┐
│ [left border: status color — 4px]       │
│                                         │
│  STAR SANTOS               [IN PORT]   │
│  Cooper Marine Terminal · since 0200    │
│  ─────────────────────────────────────  │
│  📶 Device 2                           │
│                                         │
└─────────────────────────────────────────┘
```

**Information hierarchy:**
1. Left border stripe (status color) — before reading anything
2. Vessel name — large, bold, first thing read
3. Status badge — top right, bold
4. Terminal and time — secondary line
5. Device assignment — only if relevant, visual emphasis if urgent

### Tablet Card Layout (half width)

Same as mobile but with slightly more padding. Two-line vessel name never truncated.

### Desktop Card Layout (within column)

Same card format — the column constrains width, not the card design. Cards in the desktop layout are narrower but information density stays the same.

### Card Information Per Breakpoint

| Data Point | Mobile | Tablet | Desktop |
|-----------|--------|--------|---------|
| Vessel name | Full name (wrap) | Full name | Full name |
| Status badge | Yes | Yes | Yes |
| Terminal | Yes | Yes | Yes |
| Time (arrival/sailing) | Yes | Yes | Yes |
| Agent/shipping line | No | Yes | Yes |
| Device assignment | Yes (if assigned) | Yes | Yes |
| Parse warning icon | Yes | Yes | Yes |
| "New" indicator | Yes | Yes | Yes |
| Last updated timestamp | No | No | Yes |

**Rule:** Never hide vessel name, status, terminal, time, or device assignment at any breakpoint. These are the minimum viable information set.

---

## Device Inventory Layout

The device inventory is 8 items — small enough that it can always be shown in full without pagination.

### Mobile Device List

Vertical list, each device on its own row:

```
┌────────────────────────────────────────┐
│  Summary: 5 available · 3 assigned     │
├────────────────────────────────────────┤
│  Device 1        [AVAILABLE]           │
│  ─────────────────────────────────     │
│  Device 2        [AVAILABLE]           │
│  ─────────────────────────────────     │
│  Device 3        [RETRIEVE NOW]   🔴   │
│  On MAYAN · sails tonight 2300         │
│  ─────────────────────────────────     │
│  Device 4        [ASSIGNED]            │
│  On XIN YA ZHOU · no sailing yet       │
│  ─────────────────────────────────     │
│  Device 5        [AVAILABLE]           │
│  ...                                   │
└────────────────────────────────────────┘
```

Each row: 64px min height, full-width tap target.

### Tablet/Desktop Device Layout

Two-column grid showing 4 devices per row. The urgency gradient is preserved: devices needing retrieval always display first, regardless of device number.

```
┌────────────────────────────────────────────────────────┐
│  Summary: 5 available · 2 assigned · 1 urgent          │
├──────────────────────────┬─────────────────────────────┤
│ Device 3  [RETRIEVE NOW] │ Device 4  [ASSIGNED]        │
│ MAYAN · sails 2300 today │ XIN YA ZHOU · no sail time  │
├──────────────────────────┼─────────────────────────────┤
│ Device 1  [AVAILABLE]    │ Device 2  [AVAILABLE]       │
├──────────────────────────┼─────────────────────────────┤
│ Device 5  [AVAILABLE]    │ Device 6  [AVAILABLE]       │
├──────────────────────────┼─────────────────────────────┤
│ Device 7  [AVAILABLE]    │ Device 8  [AVAILABLE]       │
└──────────────────────────┴─────────────────────────────┘
```

---

## Forms Layout

Forms appear in three contexts: Manual Vessel Entry, Device Checkout, Edit Vessel.

### Mobile Form Layout

- Single column, full width
- Each field stacked vertically with label above
- 12px gap between label and input
- 24px gap between fields
- CTA button: full width at bottom, 52px height
- Back/cancel: text button above the form, not a floating X

### Desktop Form Layout

For short forms (Device Checkout: 2 fields), center the form in a 480px wide panel.
For longer forms (Manual Vessel Entry: 7 fields), use a centered 640px wide card, 2-column layout for optional related fields (Terminal + Agent side by side).

### Device Checkout Form (minimal — 3 steps at most)

```
Step 1: Which vessel?
  [Vessel Name — searchable dropdown]

Step 2: Which device?
  [Available devices — visual grid, select one]
  Device 1  Device 2  Device 5  Device 7  Device 8
  (greyed-out: Device 3, 4, 6 — already assigned)

Step 3: Confirm
  "Assign Device 2 to FEDERAL KUDOS?"
  [Cancel]    [Assign Device]
```

This three-step flow requires no typing on mobile — dropdown selection + tap.

---

## Alert Banner Layout

Alert banners live at the top of the page, immediately below the navigation bar. They stack if multiple are active, with most urgent first.

```
┌─────────────────────────────────────────────────────────────┐
│ [nav bar]                                                   │
├─────────────────────────────────────────────────────────────┤
│ [🔴] URGENT: MAYAN sails in 1 hour. Device 3 still aboard. │
│      Sails at 2300 tonight · Cooper Marine Terminal         │
│      [View Vessel]              [Confirm Device Retrieved]  │
├─────────────────────────────────────────────────────────────┤
│ [⚠] Action needed: FEDERAL KUDOS sails in 2 hours.        │
│     Device 6 aboard · McDermott Terminal                    │
│     [View Vessel]                                           │
├─────────────────────────────────────────────────────────────┤
│ [Dashboard content begins here]                             │
```

On mobile, each banner is full width and takes 80–100px. If there are more than 3 active banners, collapse to a summary: "3 vessels need attention." with a tap to expand.

---

## Information Density Guidelines

### What to Show at Each Breakpoint

The goal is not to hide information on mobile — it is to show what matters most when screen real estate is limited.

**Always visible at all breakpoints:**
- Vessel name
- Vessel status (badge)
- Terminal/dock
- Sailing time (if applicable)
- Device assignment (if any)
- Parse error indicator (if any)

**Tablet and up only:**
- Agent/shipping line
- Vessel notes
- Last updated timestamp on cards

**Desktop only:**
- Full status history timeline in the detail panel
- Raw parsed source text (for Daniel's review)
- Device assignment history

## View Mode Toggle: Table vs Cards

The volunteer team currently works in Google Sheets and is comfortable with table/list views. Jumping straight to an all-card UI could feel alien. PortLink must offer **both views** with a simple toggle.

### Toggle Control

A segmented button in the dashboard header area, next to the section headers:

```
[Table View]  [Card View]
     ↑ default
```

- **Table view (default):** Familiar spreadsheet-style rows. One vessel per row. Columns: Vessel Name, Status, Terminal, Time, Device, Flags.
- **Card view:** The card layout described elsewhere in this document.
- Toggle persists to the user's profile (`view_preference` in Supabase) so it remembers their choice across sessions and devices.
- Toggle applies to both the vessel dashboard and the device inventory.

### Table View Layout

#### Mobile Table (< 768px)
On narrow screens, the "table" is rendered as a **compact list** — one vessel per row, key info stacked:

```
┌────────────────────────────────────────┐
│ STAR SANTOS      IN PORT    📶 Dev 2  │
│ Cooper Marine · since 0200             │
├────────────────────────────────────────┤
│ MAYAN            SAILING 🔴  📶 Dev 3 │
│ Cooper Marine · sails 2300             │
├────────────────────────────────────────┤
│ FEDERAL KUDOS    ARRIVING              │
│ McDermott · expected 1300              │
└────────────────────────────────────────┘
```

- Row height: 56-64px (two lines of text)
- Tapping a row opens vessel detail (same as tapping a card)
- Status colors via left border or row background tint
- Urgent rows (sailing with device) have crimson background tint

#### Tablet Table (768px – 1199px)
True table with visible column headers:

```
┌──────────────────┬───────────┬────────────────────┬───────┬──────────┬───────┐
│ Vessel           │ Status    │ Terminal           │ Time  │ Device   │ Flags │
├──────────────────┼───────────┼────────────────────┼───────┼──────────┼───────┤
│ STAR SANTOS      │ In Port   │ Cooper Marine      │ 0200  │ Dev 2    │       │
│ MAYAN            │ Sailing🔴 │ Cooper Marine      │ 2300  │ Dev 3 ⚠  │       │
│ FEDERAL KUDOS    │ Arriving  │ McDermott          │ 1300  │ —        │       │
└──────────────────┴───────────┴────────────────────┴───────┴──────────┴───────┘
```

- Sortable columns (tap header to sort)
- Row hover/tap highlights
- Status column uses colored badges
- Device column shows assignment or dash

#### Desktop Table (1200px+)
Full table with all columns visible, including Agent/Shipping Line:

```
┌──────────────────┬───────────┬────────────────────┬───────┬─────────────────┬──────────┬───────┐
│ Vessel           │ Status    │ Terminal           │ Time  │ Agent           │ Device   │ Flags │
├──────────────────┼───────────┼────────────────────┼───────┼─────────────────┼──────────┼───────┤
│ STAR SANTOS      │ In Port   │ Cooper Marine      │ 0200  │ Host Agency     │ Dev 2    │       │
│ MAYAN            │ Sailing🔴 │ Cooper Marine      │ 2300  │ CG Railway Inc. │ Dev 3 ⚠  │       │
│ FEDERAL KUDOS    │ Arriving  │ McDermott          │ 1300  │ Host Agency     │ —        │       │
└──────────────────┴───────────┴────────────────────┴───────┴─────────────────┴──────────┴───────┘
```

- Clicking a row opens the detail panel (slide-in on desktop, navigate on mobile/tablet)
- Sortable columns
- Row striping for readability
- Urgent rows: crimson left border + light red background tint

### Table View Design Rules

1. **Same data, same actions.** Everything accessible from card view is accessible from table view — drill into detail, device checkout, etc.
2. **Same urgency signals.** Crimson tinting, device badges, and warning flags appear in both views.
3. **Section grouping preserved.** In table view, the three sections (In Port, Arriving, Sailing) are shown as grouped table sections with headers, not mixed into one flat table.
4. **Row height minimum 48px** — generous for older users, easy tap targets.
5. **No horizontal scrolling** on any breakpoint — hide lower-priority columns on smaller screens rather than scrolling.

### Device Inventory in Table View

Same principle applies. Table view shows:

```
┌────────────┬──────────────┬─────────────────────┬────────────┐
│ Device     │ Status       │ Vessel              │ Action     │
├────────────┼──────────────┼─────────────────────┼────────────┤
│ Device 1   │ Available    │ —                   │ [Assign]   │
│ Device 2   │ Available    │ —                   │ [Assign]   │
│ Device 3   │ RETRIEVE 🔴  │ MAYAN (sails 2300)  │ [Check In] │
│ Device 4   │ Assigned     │ XIN YA ZHOU         │ [Check In] │
│ ...        │              │                     │            │
└────────────┴──────────────┴─────────────────────┴────────────┘
```

---

## Page Dimensions & Scroll Behavior

### Mobile
- Viewport: min 375px width
- Content area: 375px – 767px, single column, full width minus 16px padding each side
- Scroll: vertical, native momentum scrolling
- No horizontal scroll anywhere
- The bottom nav is fixed; content area height = `100vh - nav height - header height`

### Tablet
- Viewport: 768px – 1199px
- Content area: max-width `960px`, centered, `24px` padding each side
- Two-column grid: `calc(50% - 12px)` each

### Desktop
- Viewport: 1200px+
- Content area: max-width `1400px`, centered, `40px` padding each side
- Three-column grid: `1fr 1fr 1fr` with `24px` gap
- Right detail panel: fixed position, 480px wide, slides in from right edge of content area

### Sticky Elements
- Navigation bar: sticky top
- Section headers (mobile): sticky, offset by nav height
- Alert banners: sticky top, below nav
- Nothing else sticky — excessive stickiness reduces usable scroll area

---

## Viewport Height Considerations

On mobile, the bottom navigation bar consumes 64px. Alert banners consume 80–100px each. The content viewport shrinks accordingly. Design for 550–600px usable height minimum (iPhone SE at 667px total height, minus nav and potential alert).

**Minimum vessel card height:** 80px. At 550px usable height, the user sees 5–6 vessel cards in a section before scrolling. This is adequate for typical port conditions (rarely more than 5 vessels in port simultaneously at Mobile).

If the vessel count ever exceeds 8 per section, introduce a "Show more" collapse with the 5 most relevant cards visible by default (sorted by urgency + time).
