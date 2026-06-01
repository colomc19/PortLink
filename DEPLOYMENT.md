# Deploying PortLink

This guide takes PortLink from local development to a live deployment on **hosted Supabase**
(database, auth, realtime) and **Vercel** (the Next.js app + the alert cron job).

You only need to do this once per environment. Day-to-day contributors can ignore it and work
entirely locally — see the [README](README.md#getting-started).

> **Heads up:** going live touches real credentials and can send real SMS. Coordinate with the
> maintainer before deploying to the ministry's production project.

---

## Overview

| Piece | Hosted on | Purpose |
|-------|-----------|---------|
| Database / Auth / Realtime | Supabase | Postgres schema, magic-link auth, live dashboard |
| Web app | Vercel | Next.js App Router, API routes |
| Alert engine | Vercel Cron | Runs every few minutes, sends sailing alerts |
| Email ingestion | SendGrid Inbound Parse | Forwards Pilot Report emails to the webhook |
| SMS | Twilio | Delivers the sailing alerts |

---

## 1. Create the hosted Supabase project

1. Create a project at <https://supabase.com/dashboard>. Choose a strong database password and
   a region close to the Gulf Coast (e.g. `us-east-1`).
2. From the project's **Settings → API**, note:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon / public key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role key** → `SUPABASE_SERVICE_ROLE_KEY` *(server-side only — never expose this client-side)*

## 2. Push the schema

Link your local checkout to the hosted project and push the migrations:

```bash
supabase login
supabase link --project-ref <your-project-ref>   # the ref is in the project URL/dashboard
supabase db push                                  # applies supabase/migrations/* to the hosted DB
```

`db push` applies the versioned migrations (core schema, RLS policies, device seed). Verify the
tables and the 8 seeded devices appear under **Table Editor** in the dashboard.

> RLS (row-level security) policies ship in the migrations and are required in production — do
> not disable them.

## 3. Configure auth

In **Authentication → URL Configuration**, set the **Site URL** to your production domain (e.g.
`https://portlink.example.org`) and add it to the **Redirect URLs** allow-list so magic links
resolve correctly. Configure an SMTP sender (or use Supabase's built-in email for low volume).

## 4. Deploy to Vercel

1. Import the GitHub repo at <https://vercel.com/new>. Framework preset: **Next.js**.
2. Add the environment variables (**Settings → Environment Variables**) for Production:

   ```
   NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key>
   SUPABASE_SERVICE_ROLE_KEY=<service_role key>
   SENDGRID_INBOUND_PARSE_WEBHOOK_SECRET=<a strong shared secret>
   TWILIO_ACCOUNT_SID=AC...
   TWILIO_AUTH_TOKEN=<twilio auth token>
   TWILIO_FROM_NUMBER=+1XXXXXXXXXX
   CRON_SECRET=<generate with: openssl rand -hex 32>
   ```

3. Deploy. Vercel builds and hosts the app at your project domain.

The alert cron schedule is defined in the repo (`vercel.json`); Vercel registers it
automatically and authenticates each invocation with `CRON_SECRET`.

## 5. Wire up email ingestion (SendGrid Inbound Parse)

1. In SendGrid, go to **Settings → Inbound Parse** and add a host/URL pointing at your
   deployed webhook (e.g. `https://portlink.example.org/api/ingest/pilot-report`).
2. The webhook verifies requests against `SENDGRID_INBOUND_PARSE_WEBHOOK_SECRET` — set the same
   value in both SendGrid and Vercel.
3. Forward (or MX-route) the Pilot Report emails to the parse address.

## 6. Wire up SMS (Twilio)

1. Provision a phone number in the [Twilio console](https://www.twilio.com/console) capable of
   SMS.
2. Set `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, and `TWILIO_FROM_NUMBER` (E.164, e.g.
   `+12515551234`) in Vercel.
3. Add alert recipients in the app (Settings → Alert Recipients).

---

## Post-deploy checklist

- [ ] App loads at the production domain and you can sign in via magic link.
- [ ] The 8 devices appear in the Devices page.
- [ ] Sending a sample Pilot Report to the parse address creates vessel rows.
- [ ] A test alert recipient receives an SMS (use a real but safe number first).
- [ ] The cron endpoint rejects requests without the correct `CRON_SECRET`.
- [ ] RLS is enabled — a signed-out request to a protected table is denied.

## Updating after launch

- **Code changes** merge to `main` → Vercel auto-deploys.
- **Schema changes**: add a migration, then `supabase db push` against the linked hosted
  project. (See [CONTRIBUTING.md](CONTRIBUTING.md#database-changes).)

## Rolling back

- **App**: redeploy a previous deployment from the Vercel dashboard.
- **Schema**: write a new forward migration that reverses the change — never edit a migration
  that has already been pushed.
