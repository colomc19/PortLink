# PRD: Product Vision & Strategy

**Product:** PortLink
**Author:** Product Manager (AI-assisted)
**Date:** 2026-03-24
**Status:** Draft

---

## Problem Statement

The Apostleship of the Sea ministry at the Port of Mobile serves international vessel crews by providing wifi hotspot devices and transportation to local stores. These crews arrive with no internet access and limited time in port — the ministry helps them connect with their families and take care of personal errands.

Today, the entire operation runs on a manual workflow:

1. **Data entry is tedious and error-prone.** Daniel Stover, the team leader, wakes early each morning to manually transcribe vessel schedules from "Pilot Report" emails into a Google Sheet. These emails arrive roughly 4 times per day with evolving statuses, and the data must be re-checked and updated continuously.

2. **There is no proactive notification system.** Volunteers must remember to check the Google Sheet on their own. There is no push notification when a ship's status changes, a new vessel arrives, or — critically — when a ship is about to sail.

3. **Device loss is a real and ongoing risk.** The ministry loans 8 portable wifi hotspots to ships in port. Each device supports 5-6 connections and costs money to replace. If a device is not retrieved before a ship sails, it is lost. The current system offers no automated warning when a ship with a loaned device is about to depart.

4. **Long-range planning is disconnected.** The Harbor Master publishes vessel schedules weeks or months in advance at alports.com, but this data lives in a separate system from the day-of Pilot Reports. There is no unified view of what is coming, what is here, and what is leaving.

The net effect: Daniel spends significant time on clerical work that could be automated, the team operates reactively instead of proactively, and every sailing carries a risk of losing expensive equipment.

---

## Target Users

### Primary: Daniel Stover (Team Leader)
- Sailor by trade; deep domain expertise on port operations, vessel tracking, and schedule reliability
- Currently the single point of failure for all data entry and schedule interpretation
- Needs: automated data ingestion, a single dashboard to monitor all vessel activity, and confidence that no sailing will be missed
- Tech comfort: moderate — uses Google Sheets, email, MarineTraffic, but is not a developer

### Secondary: Volunteer Team (3-6 people)
- Varying levels of tech comfort; some are older, some less digitally fluent
- Their needs are simple: "What ships are in port? Do any need a ride or a hotspot? Is anything about to sail?"
- Interaction is primarily mobile (checking status while driving, at the port, or between errands)
- Need: a dead-simple, mobile-first interface that shows them exactly what to do and when

### Tertiary: Ministry Leadership
- Wants visibility into ministry activity for reporting (how many ships served, how many crew helped)
- Not a day-to-day user but benefits from aggregate data

---

## Product Vision

**PortLink replaces the manual Google Sheet workflow with an automated, mobile-first operations hub that ingests vessel schedules, tracks wifi device assignments, and alerts the team before ships sail — so no device is ever lost and no crew is ever missed.**

The product sits at the intersection of four data streams:

| Timeframe | Source | Role in PortLink |
|-----------|--------|------------------|
| Weeks/months out | Harbor Master (alports.com) | Long-range planning: what is coming |
| Reliability check | MarineTraffic position + expert judgment | Confidence scoring: is the date realistic |
| Day-of operations | Pilot Report emails (~4x daily) | Real-time status: what is here, what is moving |
| Same-day disruption | Weather conditions | Delay awareness: fog holds, extended anchorage |

The core value proposition is **time saved and risk eliminated**:
- Daniel gets his mornings back (no more manual transcription)
- The team gets proactive alerts instead of reactive checking
- The ministry never loses a wifi device to a departing ship

---

## Success Metrics

### Primary (MVP)

| Metric | Target | How Measured |
|--------|--------|--------------|
| Manual data entry time | Reduce by 90%+ | Daniel's self-report; Pilot Report emails auto-parsed |
| Wifi devices lost to sailings | Zero | Device tracking log; no unrecovered devices |
| Sailing alert reliability | 100% of sailings preceded by alert | Alert log vs. actual sailings |
| Volunteer adoption | All active volunteers using app within 2 weeks | Login/usage data |

### Secondary (Post-MVP)

| Metric | Target | How Measured |
|--------|--------|--------------|
| Ships served per month | Maintain or increase current rate | Service log |
| Volunteer response time | Decrease by 50% | Time from alert to action |
| Daniel's daily time on scheduling | Under 15 minutes | Self-report |

---

## Key Assumptions

1. **Pilot Report email format is stable.** The tabular email format from `mobilebarpilots@mobilebarpilots.com` has been consistent. If it changes significantly, the parser will need updating — but the structure (Arrivals/Sailings sections, tabular rows) appears to be a long-standing format.

2. **Email forwarding or inbound parse is feasible.** Daniel can set up email forwarding from his inbox (or the pilot report can be CC'd) to a SendGrid Inbound Parse endpoint. No direct API access to the pilot service exists.

3. **The Harbor Master website can be scraped.** The alports.com arrivals/sailings page is publicly accessible and its structure is scrapable. If the site changes, the scraper will need maintenance.

4. **Volunteers will use a web app on their phones.** A responsive web app (not a native app) is sufficient. Push notifications can be delivered via browser notifications, SMS, or a simple messaging integration.

5. **8 wifi devices is a manageable fleet.** The current inventory is small enough that device tracking does not need barcode scanning or RFID — a simple manual check-in/check-out flow is adequate.

6. **The team is small and trust-based.** There is no need for complex role-based permissions. All volunteers see the same data. Daniel may have a few admin-only actions (e.g., editing parsed data, managing devices).

---

## Key Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| **Pilot Report format changes** | High | Build parser with fuzzy matching; keep manual override for Daniel to correct parsed data |
| **Email delivery delays** | Medium | Monitor ingestion timestamps; alert Daniel if no report received by expected time |
| **Device not retrieved before sailing** | Critical | Tiered alert system (6h, 2h, 1h before sailing); require explicit "retrieved" confirmation |
| **Harbor Master site structure changes** | Low | Scraper with error alerting; graceful degradation (long-range data is nice-to-have, not critical) |
| **Volunteer non-adoption** | Medium | Keep UI extremely simple; get Daniel's buy-in as champion; provide brief onboarding |
| **Incorrect time parsing** | Medium | Flag ambiguous times (e.g., "AM", "PM ANCHOR") for human review; show raw source alongside parsed data |
| **Single point of failure (Daniel)** | Low | App reduces dependency on Daniel by automating his manual work; other volunteers can see the same data |

---

## Constraints

- **Budget:** Volunteer ministry with limited funds. All infrastructure should use free tiers where possible (Supabase free tier, Vercel hobby plan, SendGrid free tier).
- **Maintenance:** No dedicated ops team. The system must be low-maintenance and fail gracefully with clear error messages.
- **Simplicity:** Every feature must pass the test: "Would a 65-year-old volunteer understand this without training?"
- **Mobile-first:** The primary use context is a phone screen, often in a parking lot or at the port.
