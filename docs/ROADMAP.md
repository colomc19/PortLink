# PortLink Roadmap

A living view of where the project is and where it's headed. This is a volunteer, pro-bono
project — priorities shift with the ministry's needs and contributor availability. Want to help
with something here? Browse the [issues](https://github.com/ktg-motive/PortLink/issues) or start
a [Discussion](https://github.com/ktg-motive/PortLink/discussions).

## ✅ Phase 1 — MVP (built)

The core operations hub is implemented and runs end-to-end locally:

- Vessel dashboard (table + card views) with realtime updates
- Pilot Report email ingestion and parsing into structured vessel rows
- Device tracking — check the ministry's 8 Wi-Fi hotspots in/out, assigned to vessels
- Tiered sailing alerts (SMS via Twilio) before a ship holding a loaned device departs
- Field-level manual overrides for parsed data
- Admin / Volunteer roles with Supabase Auth (magic link + password)

## 🚧 Phase 2 — Production hardening (next)

Getting PortLink live for the ministry and dependable in daily use:

- Production deployment (hosted Supabase + Vercel) — see [DEPLOYMENT.md](../DEPLOYMENT.md)
- End-to-end QA pass against real Pilot Report emails
- Expanded automated test coverage (parser edge cases, alert scheduling)
- Accessibility audit (WCAG AA) and mobile polish
- Observability: error reporting and ingestion-health visibility

## 🔭 Phase 3 — Additional data sources (later)

Richer, earlier schedule data beyond the day-of Pilot Report:

- **Harbor Master scraper** — pull the weeks/months-out schedule from the port authority
- **Vessel tracking API** — supplement with AIS/MarineTraffic-style position data
- **Weather integration** — surface same-day disruptions that shift sailings

## 💡 Ideas & nice-to-haves

- Contributor onboarding polish (sample data, guided tours)
- Notification channels beyond SMS (email, push)
- Reporting / history views for the ministry's records

---

Have an idea that isn't here? Open a feature request or start a discussion — community input
shapes this list.
