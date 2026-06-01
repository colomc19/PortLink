# DES-style-guide: Design System & Style Guide

**Product:** PortLink
**Author:** UI Designer (AI-assisted)
**Date:** 2026-03-24
**Status:** Draft

---

## Design Philosophy

PortLink serves a small Catholic ministry team where some volunteers are older and less tech-comfortable. The design must be immediately legible — not learned. Every design decision should answer yes to: "Would a 65-year-old volunteer understand this without training?"

Three principles govern every choice:

1. **Clarity over density.** Show only what matters right now. Hide nothing critical, but do not overwhelm.
2. **Trust through calm.** The maritime/Catholic context calls for a palette that feels grounded and trustworthy — not the hyper-saturated look of consumer apps.
3. **Urgency is earned.** Reserve red and bold styling for genuine urgency. If everything looks urgent, nothing does.

---

## Color Palette

### Philosophy
The palette draws from two sources: the deep blues of Mobile Bay and the Gulf Coast, and the traditional blue/gold of Catholic maritime devotion (Our Lady Star of the Sea). These provide a natural, authentic foundation that feels familiar to the ministry team.

Alert colors use universal conventions (red, amber, green) but are calibrated to avoid overwhelming older users with high-chroma saturated tones.

### Brand Colors

| Role | Name | Hex | Tailwind Approx | Notes |
|------|------|-----|-----------------|-------|
| Primary | Navy | `#1A3556` | `blue-900` custom | Main brand, navigation, primary actions |
| Primary Light | Bay Blue | `#2C5282` | `blue-800` | Secondary actions, links |
| Accent | Gulf Gold | `#B7862B` | `yellow-700` custom | Ministry warmth, accent details |
| Accent Light | Sand | `#EDD690` | `yellow-200` custom | Gold tint backgrounds, highlights |

### Semantic / Status Colors

These are the most critical colors in the system. They must be immediately distinguishable even for users with color vision deficiencies.

| Status | Color Name | Hex | Contrast on White | Used For |
|--------|-----------|-----|-------------------|---------|
| Urgent / Sailing with device | Crimson | `#B91C1C` | 5.9:1 (AA+) | Urgent sailing alerts, device retrieval needed |
| Warning / Parsing error | Amber | `#D97706` | 3.6:1* | Parse flags, ambiguous times, approaching deadline |
| Caution / Unconfirmed | Dark Amber | `#92400E` | 6.5:1 (AA+) | Warning text on white backgrounds |
| Success / Available | Forest | `#15803D` | 5.1:1 (AA+) | Available devices, checked in, completed |
| Info / Arriving | Ocean | `#1D4ED8` | 6.2:1 (AA+) | Arriving vessel status |
| Neutral / Sailed | Slate | `#475569` | 5.9:1 (AA+) | Past events, sailed, archived |

*Amber `#D97706` fails AA on white for body text — use Dark Amber `#92400E` for text labels; use Amber only for icon/badge fills with sufficient size (18px+).

### Vessel State Colors

| Vessel State | Background | Text | Border | Usage |
|-------------|-----------|------|--------|-------|
| In Port | `#DBEAFE` (blue-100) | `#1E3A5F` | `#93C5FD` (blue-300) | Standard in-port card |
| Arriving | `#E0F2FE` (sky-100) | `#0C4A6E` | `#7DD3FC` (sky-300) | Expected arrivals |
| Sailing — no device | `#F1F5F9` (slate-100) | `#334155` | `#CBD5E1` (slate-300) | Low-urgency sailing |
| Sailing — device aboard | `#FEE2E2` (red-100) | `#7F1D1D` | `#FCA5A5` (red-300) | CRITICAL — always prominent |
| Sailed / Gone | `#F8FAFC` (slate-50) | `#94A3B8` | `#E2E8F0` | Departed, muted |
| Manual Entry | `#FFF7ED` (orange-50) | `#431407` | `#FED7AA` (orange-200) | Human-added, not from pilot report |
| Parse Error | `#FFFBEB` (amber-50) | `#78350F` | `#FDE68A` (amber-200) | Needs Daniel's review |

### Device State Colors

| Device State | Background | Text | Usage |
|-------------|-----------|------|-------|
| Available | `#F0FDF4` | `#14532D` | Ready to assign |
| Assigned | `#EFF6FF` | `#1E3A5F` | On a vessel, sailing not imminent |
| Needs Retrieval | `#FEF2F2` | `#7F1D1D` | Vessel is sailing, must act |
| Unknown | `#F8FAFC` | `#64748B` | Status uncertain |

### Neutral Palette

| Name | Hex | Use |
|------|-----|-----|
| Background | `#F8FAFC` | Page background |
| Surface | `#FFFFFF` | Cards, modals, panels |
| Border | `#E2E8F0` | Dividers, card borders |
| Border Strong | `#CBD5E1` | Input borders, section dividers |
| Text Primary | `#0F172A` | Headlines, primary labels |
| Text Secondary | `#475569` | Subtext, metadata |
| Text Muted | `#94A3B8` | Placeholders, disabled, timestamps |
| Text on Dark | `#F8FAFC` | Text on Navy/dark backgrounds |

### Dark Mode
Dark mode is explicitly out of scope for MVP. Older users benefit from the predictability and legibility of a well-designed light theme. Revisit post-MVP if there is specific user demand.

---

## Typography

### Type Scale Philosophy
Generous sizing is non-negotiable. Body text at 16px is the absolute minimum — 18px is preferred for primary content. Headlines must command the hierarchy clearly. No text under 14px appears in the main application (14px permitted only for tertiary metadata like timestamps and system labels).

### Font Family

**Primary:** `Inter` (Google Fonts, system fallback chain)
```
font-family: 'Inter', ui-sans-serif, system-ui, -apple-system, sans-serif;
```

**Rationale:** Inter was designed for screen legibility at all sizes. Its regular and medium weights read cleanly on mobile screens without feeling decorative. The letterforms are open and distinctive enough for older readers.

**Do not use** decorative or serif fonts for UI elements. Reserve serif consideration only for a future brand identity layer, not functional UI.

### Type Scale

| Token | Size | Weight | Line Height | Use |
|-------|------|--------|-------------|-----|
| `text-xs` | 12px | 500 | 1.5 | System labels only (avoid in main UI) |
| `text-sm` | 14px | 400/500 | 1.5 | Timestamps, metadata, secondary labels |
| `text-base` | 16px | 400 | 1.6 | Body text, form labels, descriptions |
| `text-lg` | 18px | 400/500 | 1.5 | Card primary content, prominent labels |
| `text-xl` | 20px | 600 | 1.4 | Section headers, vessel names on cards |
| `text-2xl` | 24px | 700 | 1.3 | Page headings, modal titles |
| `text-3xl` | 30px | 700 | 1.2 | Primary dashboard section headers |

### Type Rules

- **Vessel names:** Always `text-xl` / `font-semibold` minimum on cards. Never truncate with ellipsis unless the name exceeds 30 characters — use two-line wrap instead.
- **Times:** Use tabular numerals (`font-variant-numeric: tabular-nums`) so columns align. Never mix 12-hour and 24-hour formats — use 24-hour throughout (consistent with Pilot Report format).
- **Status labels:** `text-sm font-semibold uppercase tracking-wide` — this treatment makes status badges scannable at a glance.
- **Alert text:** Urgency comes from placement and color, not caps lock. Do not use ALL CAPS for alert content (reduces readability).
- **Minimum contrast:** All text must meet WCAG AA (4.5:1 for normal text, 3:1 for large text/18px+ bold). Aim for AAA (7:1) wherever possible given the older audience.

---

## Spacing & Sizing

### Spacing Scale

Use Tailwind's default 4px base unit. Key tokens:

| Token | px | Common Use |
|-------|----|-----------|
| `space-1` | 4px | Icon-to-label gap |
| `space-2` | 8px | Internal badge padding, tight groups |
| `space-3` | 12px | Card internal padding (compact) |
| `space-4` | 16px | Standard internal padding |
| `space-5` | 20px | Between card sections |
| `space-6` | 24px | Card padding (standard) |
| `space-8` | 32px | Between major sections |
| `space-10` | 40px | Section top/bottom padding |
| `space-12` | 48px | Large section separation |

### Touch Target Sizing

This is a hard constraint, not a preference. Older users have reduced motor precision and often use phones without reading glasses.

| Element | Minimum Size | Recommended Size |
|---------|-------------|-----------------|
| Primary button | 48px height | 52px height |
| Secondary button | 44px height | 48px height |
| Icon button (standalone) | 44x44px | 48x48px |
| Navigation tab | 48px height | 56px height |
| List row / vessel card (tap) | 56px min height | Full card is tappable |
| Checkbox / radio | 44x44px touch area | 48x48px |
| Form input | 48px height | 52px height |

The entire vessel card is a tap target — not just a small chevron. This is critical.

### Border Radius

| Token | Value | Use |
|-------|-------|-----|
| `rounded-sm` | 4px | Badges, small pills |
| `rounded` | 6px | Buttons |
| `rounded-md` | 8px | Form inputs |
| `rounded-lg` | 12px | Cards |
| `rounded-xl` | 16px | Modal dialogs, large panels |
| `rounded-full` | 50% | Icon containers, status dots |

### Elevation / Shadow

| Level | CSS | Use |
|-------|-----|-----|
| `shadow-none` | none | In-page elements, table rows |
| `shadow-sm` | `0 1px 2px rgba(0,0,0,0.06)` | Card default state |
| `shadow` | `0 2px 8px rgba(0,0,0,0.10)` | Hovered cards, dropdowns |
| `shadow-md` | `0 4px 16px rgba(0,0,0,0.12)` | Modals, focused panels |
| `shadow-lg` | `0 8px 32px rgba(0,0,0,0.16)` | Drawers, overlays |

---

## Component Library

### Buttons

Three tiers of button. Never use more than two tiers on the same screen without good reason.

**Primary Button**
- Background: `#1A3556` (Navy)
- Text: White, `text-base font-semibold`
- Height: 52px
- Padding: `px-6`
- Border radius: `rounded`
- States: Default, Hover (`#2C5282` Bay Blue), Active (darken 10%), Disabled (60% opacity, `cursor-not-allowed`), Focus (2px Navy outline offset 2px)
- Use: The one main action on a screen ("Assign Device", "Confirm Check-In", "Save Changes")

**Secondary Button**
- Background: White
- Border: 2px `#1A3556` Navy
- Text: `#1A3556` Navy, `text-base font-semibold`
- Height: 48px
- States: Hover (Navy bg, White text), Active, Disabled (40% opacity), Focus
- Use: Alternative actions, cancel, secondary confirmations

**Destructive Button**
- Background: `#B91C1C` Crimson
- Text: White
- Same sizing as Primary
- Use: "Mark as Sailed", "Remove Assignment" — require confirmation dialog before executing

**Ghost/Link Button**
- No background, no border
- Text: `#2C5282` Bay Blue, underline on hover
- Height: 44px minimum
- Use: Tertiary actions, "View raw source", inline navigation

**Urgent Action Button**
- Background: `#B91C1C`
- Text: White, `text-base font-bold`
- Height: 56px (larger than normal — demands attention)
- Left border: 4px solid `#7F1D1D`
- Use: Only for the device retrieval confirmation when urgency is critical

### Status Badges

Badges always pair an icon with text. Never icon-only or text-only for status.

**Anatomy:** `[icon] [label]`
- Height: 28px
- Padding: `px-3 py-1`
- Font: `text-sm font-semibold`
- Border radius: `rounded-sm`
- All-caps label

**Vessel Status Badges:**

| Badge | Icon | Label | Colors |
|-------|------|-------|--------|
| In Port | Anchor icon | "IN PORT" | Blue-100 bg, Navy text |
| Arriving | Arrow-right-circle | "ARRIVING" | Sky-100 bg, ocean blue text |
| Sailing | Ship/wave icon | "SAILING" | Slate-100 bg, slate text |
| Sailing + Device | Ship + exclamation | "SAILING — RETRIEVE DEVICE" | Red-100 bg, Crimson text |
| Sailed | Check circle | "SAILED" | Slate-50 bg, muted text |
| Manual Entry | Pencil | "MANUAL" | Orange-50 bg, dark orange text |
| Parse Error | Warning triangle | "NEEDS REVIEW" | Amber-50 bg, dark amber text |

**Device Status Badges:**

| Badge | Icon | Label | Colors |
|-------|------|-------|--------|
| Available | Green circle dot | "AVAILABLE" | Green-50 bg, forest text |
| Assigned | Blue circle dot | "ASSIGNED" | Blue-50 bg, navy text |
| Needs Retrieval | Red exclamation | "RETRIEVE NOW" | Red-100 bg, crimson text |

### Cards

Cards are the primary content unit. Every vessel and device is a card.

**Vessel Card:**
- Background: White
- Border: 1px solid `#E2E8F0`
- Border-left: 4px solid (status color — the only decoration that varies by state)
- Border radius: `rounded-lg`
- Shadow: `shadow-sm`, `shadow` on hover
- Padding: `p-4` mobile, `p-6` desktop
- Entire card is a tap target
- Minimum height: 80px (prevents accidental taps on adjacent cards)

The left border stripe is the single most efficient status signal on the card. It reads before any text.

| Status | Left Border |
|--------|-------------|
| In Port | `#2C5282` Bay Blue |
| Arriving | `#0284C7` Sky Blue |
| Sailing — no device | `#94A3B8` Slate |
| Sailing — device aboard | `#B91C1C` Crimson |
| Sailed | `#CBD5E1` Light Slate |
| Manual Entry | `#D97706` Amber |
| Parse Error | `#D97706` Amber |

**Device Card:**
- Horizontal list row style on desktop
- Full card style on mobile (same as vessel card pattern)
- Clear device number in large bold type: Device 3, Device 7, etc.
- Status badge always visible

### Form Inputs

Forms appear for: manual vessel entry, device checkout confirmation, vessel edit. Keep them minimal.

**Text Input:**
- Height: 52px
- Border: 2px solid `#CBD5E1` (normal), `#2C5282` Navy (focus), `#B91C1C` Crimson (error)
- Border radius: `rounded-md`
- Font: `text-base`
- Label: above input, `text-sm font-semibold text-slate-700`
- Placeholder: `text-slate-400` (never a substitute for a label)
- Error message: Below input, `text-sm text-crimson`, with warning icon

**Select / Dropdown:**
- Same sizing as text input
- Chevron-down icon on right
- Dropdown list items: 48px height each

**Date/Time Input:**
- Use native `<input type="date">` and `<input type="time">` on mobile — better support for touch
- On desktop, enhance with a simple picker
- Free text field also available for ambiguous times like "AM" or "afternoon"

**Form Layout Rules:**
- One column only on mobile
- One or two columns max on desktop (never three)
- Required fields marked with asterisk and label note "(required)" — never rely on asterisk alone
- Submit button always at the bottom, full-width on mobile

### Navigation

The navigation is the skeleton of the app. It must be visible and obvious at all times.

**Bottom Tab Bar (Mobile):**
- Height: 64px (touch-safe)
- 4 tabs: Dashboard, Devices, Alerts, Settings
- Icon + label always (never icon-only)
- Active state: Navy fill with gold underline accent
- Inactive: slate-400 icon and label
- Badge indicator on Alerts tab when unread alerts exist

**Top Navigation Bar (Desktop/Tablet):**
- Height: 64px
- Logo/wordmark left
- Horizontal navigation links center/right
- Active state: Navy with underline
- Sticky — always visible on scroll

**No hamburger menus.** On any breakpoint, navigation must be directly visible, not hidden behind an icon.

### Alert Banners

Alert banners appear at the top of the screen, above the main content. They interrupt attention because they should.

**Tiered appearance:**

| Tier | Background | Left Border | Icon | When |
|------|-----------|-------------|------|------|
| Informational (6h) | `#EFF6FF` | 4px `#2C5282` | Info circle | Heads up: vessel sails in 6 hours |
| Warning (2h) | `#FFFBEB` | 4px `#D97706` | Warning triangle | Action needed: 2 hours |
| Urgent (1h) | `#FEF2F2` | 4px `#B91C1C` | Exclamation circle | URGENT: 1 hour or less |

- Font: `text-base font-semibold` for the main message
- Show vessel name, device number, and sailing time prominently
- Always include a direct action button: "View Vessel" or "Confirm Retrieved"
- Dismissible — but dismissed alerts remain in the alert log
- Multiple alerts stack vertically; urgent alerts always appear first

### Empty States

Every section that can be empty needs a message. Empty states must feel reassuring, not broken.

**In Port (empty):** Icon of calm water. "No vessels currently in port."
**Arriving (empty):** Icon of horizon. "No arrivals expected today."
**Sailing (empty):** Icon of checkmark. "No departures today — all devices are safe." (This is the best possible state.)
**Devices (all available):** Green indicator summary: "All 8 devices available."
**Alerts (none):** "No active alerts. All devices accounted for."

Empty states should never show raw technical messages or loading spinners that persist more than 2 seconds.

### Loading States

- Use skeleton screens (gray shimmer placeholders) rather than spinners for page-level loads
- Spinner only for single-action confirmations (e.g., saving a form)
- Maximum acceptable load time: 2 seconds. If the dashboard takes longer, show a skeleton with "Loading latest vessel data..." text
- Never show "Loading..." text alone without a visual indicator

### Modals & Confirmation Dialogs

Used for destructive or irreversible actions: mark as sailed, remove device assignment, delete vessel.

- Background overlay: `rgba(0,0,0,0.5)`
- Modal card: White, `rounded-xl shadow-lg`, max-width 480px
- Always include: clear title, brief explanation, Cancel (Secondary button), Confirm (Primary or Destructive button)
- Tab order: Cancel first, Confirm second — this reduces accidental confirmations
- On mobile: slide up from bottom (bottom sheet style), not center modal

---

## Iconography

### Principles

1. Icons always accompany a text label in the main UI. Never icon-only for functional actions.
2. Use a single icon library consistently. **Recommendation: Heroicons (Tailwind's official library)** — clean, professional, and compatible with the existing tech stack.
3. Icon size: 20px for inline use, 24px for buttons and navigation, 28px for status indicators in cards.

### Core Icon Set

| Context | Icon Name (Heroicons) | Usage |
|---------|----------------------|-------|
| Vessel / Ship | `TruckIcon` (placeholder) or custom SVG | Vessel cards, navigation |
| Anchor | `AcademicCapIcon` (use anchor SVG) | In Port status |
| Arriving | `ArrowRightCircleIcon` | Arriving status |
| Sailing | `ArrowUpRightIcon` | Sailing status |
| Device / Wifi | `WifiIcon` | Devices, assignments |
| Alert / Urgent | `ExclamationTriangleIcon` | Warnings, urgent |
| Info | `InformationCircleIcon` | Parse notes, informational |
| Success / Check | `CheckCircleIcon` | Available, confirmed |
| Edit / Pencil | `PencilSquareIcon` | Edit actions (admin) |
| Add / Plus | `PlusCircleIcon` | Add vessel, add device |
| Clock / Time | `ClockIcon` | Times, scheduled events |
| Warning | `ExclamationCircleIcon` | Mild alerts |
| Settings | `Cog6ToothIcon` | Settings navigation |
| User | `UserCircleIcon` | User/volunteer |
| Logout | `ArrowRightOnRectangleIcon` | Sign out |

**Custom icons needed:** A proper ship/vessel icon is not available in Heroicons. Commission or source a simple ship silhouette SVG consistent with Heroicons' line weight (1.5px stroke, 24px viewBox).

---

## Responsive Breakpoints

PortLink targets three first-class experiences — not mobile-first with grudging desktop support.

| Breakpoint | Name | Range | Layout Strategy |
|-----------|------|-------|----------------|
| Mobile | `sm` | 0 – 767px | Single column, bottom nav, stacked cards |
| Tablet | `md` | 768px – 1199px | Two columns, top nav or sidebar, expanded cards |
| Desktop | `lg` | 1200px+ | Three columns or sidebar + content + panel layout |

**Critical:** At all breakpoints, the dashboard sections (In Port / Arriving / Sailing) must be simultaneously visible or easily reachable with one tap. On mobile, this means scrollable sections with sticky section headers. On desktop, this means side-by-side columns or a well-designed tab layout.

---

## Accessibility Standards

### WCAG Compliance
Target: WCAG 2.1 AA at minimum. AAA wherever feasible given the older user base.

| Requirement | Standard | PortLink Target |
|-------------|---------|----------------|
| Text contrast | 4.5:1 | 7:1 preferred |
| Large text contrast | 3:1 | 4.5:1+ |
| Touch target size | 24x24px | 48x48px |
| Focus visible | Required | 3px Navy outline, 2px offset |
| Color not sole differentiator | Required | All status: icon + text + color |
| Form error identification | Required | Icon + text + border color |

### Focus States
Every interactive element has a visible focus state:
- Buttons: `outline: 3px solid #2C5282; outline-offset: 2px`
- Inputs: Border changes to Navy (already used for focus)
- Cards: Outline + subtle shadow increase
- Navigation: Underline + color change

Never use `outline: none` without providing an equal or superior custom focus indicator.

### Color Independence
Every status is conveyed through three channels: color, icon, and text label. A user who cannot distinguish red from gray will still know a device needs retrieval because the badge says "RETRIEVE NOW" and shows an exclamation icon.

### Motion
Avoid gratuitous animation. Functional transitions only:
- Card expand/collapse: 150ms ease
- Modal appear: 200ms ease-out
- Alert banner appear: 250ms slide-down
- No autoplay animations
- Respect `prefers-reduced-motion`: disable all transitions when this is set

### Reading Level
All UI copy targets a 6th–8th grade reading level. Avoid jargon. Where maritime terminology is necessary (e.g., "at anchor", "pilot"), treat it as known vocabulary for this audience (Daniel's team understands it).

---

## Tailwind Configuration Notes

Key custom values to add to `tailwind.config.js`:

```js
theme: {
  extend: {
    colors: {
      navy: '#1A3556',
      'bay-blue': '#2C5282',
      'gulf-gold': '#B7862B',
      sand: '#EDD690',
      crimson: '#B91C1C',
      'dark-amber': '#92400E',
      forest: '#15803D',
    },
    fontFamily: {
      sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'sans-serif'],
    },
    fontSize: {
      // Override base to be 18px for main content legibility
    },
    minHeight: {
      'touch': '48px',
      'touch-lg': '56px',
    },
    minWidth: {
      'touch': '48px',
    },
  }
}
```

---

## Copy & Voice Guidelines

**Tone:** Calm, direct, human. Not corporate. Not techy. Write like a capable colleague giving instructions.

**Do:**
- "Device 3 is on MAYAN. MAYAN sails at 11:00 PM tonight."
- "All devices are accounted for."
- "Sailing time was updated. New alerts scheduled."
- "Mark as retrieved when you have the device in hand."

**Don't:**
- "No active assignments found for the specified query parameters."
- "Error 422: Validation failed."
- "N/A", "null", "undefined" — always show meaningful empty states
- "Are you sure?" alone — describe the consequence ("This will mark MAYAN as sailed. Any assigned devices will be flagged for retrieval.")

**Numbers and times:**
- Always 24-hour time throughout (1300, not 1:00 PM)
- Use "today" and "tomorrow" instead of just the date when applicable: "Sails today at 2300"
- Spell out ambiguous times fully: "Sailing: AM (exact time unknown — estimated before noon)"
