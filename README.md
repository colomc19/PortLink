# PortLink ⚓

**An operations hub for Catholic maritime ministry at the Port of Mobile, Alabama.**

Volunteers from a port-ministry outreach meet inbound ships, lend vessel crews temporary
Wi-Fi hotspots, and drive seafarers to local stores so they can run errands and stay
connected with their families while in port. PortLink replaces a fragile, manual Google
Sheet with an automated dashboard that ingests vessel schedules, tracks the ministry's
loaner Wi-Fi devices, and alerts the team **before** a ship carrying a borrowed device sails.

> 💙 **This is a pro-bono, community-built project**, organized through
> [Lower Alabama AI](#about--acknowledgments). Contributors of all experience levels are
> welcome — see [Contributing](#contributing) and our
> [good first issues](https://github.com/ktg-motive/PortLink/labels/good%20first%20issue).

---

## Why it exists

The ministry's coordinator currently transcribes "Pilot Report" emails into a spreadsheet by
hand, several times a day, and tries to remember which ships are holding the ministry's eight
Wi-Fi hotspots. A ship can sail with a borrowed device, and there is no automatic warning.

PortLink solves three problems:

1. **Ingest** — vessel schedule data is parsed automatically from Pilot Report emails.
2. **Surface** — arrivals and sailings appear on a real-time dashboard the whole team shares.
3. **Protect** — the team gets an SMS alert before a ship holding a loaned device departs.

The goal: give the coordinator their mornings back, and never lose a Wi-Fi device to a
departing ship again.

---

## Features

- 📋 **Vessel dashboard** — table (default, spreadsheet-familiar) and card views of arrivals and sailings
- 📡 **Pilot Report email ingestion** — incoming emails are parsed into structured vessel rows
- 🔌 **Device tracking** — check the ministry's 8 Wi-Fi hotspots in and out, assigned to vessels
- 🔔 **Sailing alerts** — tiered SMS warnings before a ship holding a loaned device sails
- ✏️ **Manual overrides** — the coordinator can pin individual fields; the parser updates the rest
- 🔁 **Realtime updates** — the dashboard reflects changes live across all signed-in users
- 🔐 **Roles** — Admin (full control) and Volunteer (view + check devices in/out)

---

## Tech stack

| Layer | Technology |
|-------|------------|
| Framework | [Next.js](https://nextjs.org/) 16 (App Router) + TypeScript |
| UI | React 19, [Tailwind CSS](https://tailwindcss.com/) 4, [Heroicons](https://heroicons.com/) |
| Database / Auth / Realtime | [Supabase](https://supabase.com/) (Postgres) |
| Email parsing | [cheerio](https://cheerio.js.org/) (Pilot Report HTML → structured rows) |
| SMS alerts | [Twilio](https://www.twilio.com/) |
| Email ingestion | [SendGrid Inbound Parse](https://docs.sendgrid.com/for-developers/parsing-email/inbound-email) |
| Tests | [Vitest](https://vitest.dev/) |
| Deployment | [Vercel](https://vercel.com/) (incl. Cron for the alert engine) |

---

## Getting started

### Prerequisites

- **Node.js 20+** and npm
- **[Docker](https://www.docker.com/)** (the local Supabase stack runs in containers)
- **[Supabase CLI](https://supabase.com/docs/guides/local-development)** — `npm install -g supabase` or `brew install supabase/tap/supabase`

### First time? Start here

```bash
git clone https://github.com/ktg-motive/PortLink.git
cd PortLink
npm install
npm run setup      # starts Supabase, writes .env.local, applies migrations + seed
npm run dev        # → http://localhost:3000
```

`npm run setup` checks your prerequisites, boots the local Supabase stack, writes a
ready-to-use `.env.local`, and seeds the device fleet. When it finishes, `npm run dev`
is all that's left. That's the whole loop.

- **App**: http://localhost:3000
- **Supabase Studio** (DB browser): http://localhost:54323
- **Inbucket** (catches local auth/magic-link emails): http://localhost:54324

> The app authenticates with Supabase Auth (magic link or password). In local development,
> magic-link emails are delivered to Inbucket — submit your email on the login page, then
> open the message in Inbucket to follow the link.

<details>
<summary>Prefer to run the steps manually?</summary>

```bash
npm install
supabase start                     # Postgres, Auth, Studio, mail server (Docker)
cp .env.local.example .env.local   # then paste keys from `supabase status`
supabase status                    # prints the API URL + anon/service keys
supabase db reset                  # apply migrations + seed the device fleet
npm run dev
```
</details>

### Troubleshooting

| Symptom | Fix |
|---------|-----|
| `Docker is not running` | Open Docker Desktop and wait for it to finish starting, then re-run. |
| `supabase start` hangs on first run | It's downloading container images (~hundreds of MB). Give it a few minutes. |
| `npm install` errors | Confirm you're on **Node.js 20+** (`node -v`). |
| Magic-link email never arrives | In local dev it goes to **Inbucket** (http://localhost:54324), not a real inbox. |
| Want a clean database | `npm run db:reset` re-applies all migrations and re-seeds from scratch. |
| Lint/test/build before a PR | `npm run lint && npm test && npm run build` — CI runs the same checks. |

### Useful commands

| Command | Description |
|---------|-------------|
| `npm run setup` | One-command local setup (Supabase + `.env.local` + migrations + seed) |
| `npm run dev` | Start the dev server |
| `npm run build` | Production build |
| `npm test` | Run the Vitest suite once |
| `npm run test:watch` | Run tests in watch mode |
| `npm run lint` | Lint with ESLint |
| `npm run db:reset` | Re-apply all migrations + seed from scratch |
| `npm run db:types` | Regenerate `src/types/database.ts` from the local schema |
| `npm run db:stop` | Stop the local Supabase stack |

---

## Project structure

```
src/
  app/                 # Next.js App Router (pages, layouts, API routes)
    (app)/             #   authenticated app: dashboard, vessels, devices, alerts, settings
    (auth)/            #   login flow
    api/               #   route handlers: ingestion webhook, vessels, devices, cron
  components/          # Reusable UI (layout, vessels, devices, alerts, settings, ui/)
  contexts/            # React context providers
  hooks/               # Custom React hooks (data fetching, realtime)
  lib/
    supabase/          # Supabase client/server/admin/middleware helpers
    parser/            # Pilot Report email parser (+ tests)
    alerts/            # Sailing-alert scheduler (+ tests)
  types/               # Shared + generated database types
supabase/
  migrations/          # Database schema, RLS policies, device seed
docs/
  product/             # PRD: vision, features, user flows
  design/              # Design: style guide, layout, components, screens
  architecture/        # Data model, system design, API routes, implementation plan
  data_samples/        # Real Pilot Report / schedule samples used to design the parser
```

📚 **New contributors:** the `docs/` folder is the best place to understand the product and
its architecture before diving into code. Start with `docs/product/PRD-vision.md` and
`docs/architecture/ARCH-system-design.md`.

---

## Contributing

We'd love your help. This project is built by volunteers, and there's room for frontend,
backend, data-parsing, design, and docs work.

1. Read **[CONTRIBUTING.md](CONTRIBUTING.md)** for setup, branch, and PR conventions.
2. Browse [open issues](https://github.com/ktg-motive/PortLink/issues) — look for the
   **`good first issue`** label if you're getting started.
3. Comment on an issue to claim it, fork, branch, and open a PR.

Questions, setup help, or ideas? Start a
**[GitHub Discussion](https://github.com/ktg-motive/PortLink/discussions)**.

All contributors are expected to follow our **[Code of Conduct](CODE_OF_CONDUCT.md)**.

Found a security issue? Please see **[SECURITY.md](SECURITY.md)** — don't open a public issue.

## Deployment

Ready to take it live (hosted Supabase + Vercel)? See **[DEPLOYMENT.md](DEPLOYMENT.md)** for a
step-by-step guide.

---

## About & acknowledgments

PortLink is developed pro bono by the **Lower Alabama AI** community — a Gulf-Coast meetup of
developers, designers, and AI practitioners — in service of the Catholic maritime ministry at
the Port of Mobile and the seafarers it serves.

Licensed under the [MIT License](LICENSE).
