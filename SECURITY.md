# Security Policy

PortLink handles authentication, personal contact details for SMS alerts, and operational
port data. We take security seriously and appreciate responsible disclosure.

## Reporting a vulnerability

**Please do not open a public GitHub issue for security vulnerabilities.**

Instead, report privately using one of:

- GitHub's [private vulnerability reporting](https://github.com/ktg-motive/PortLink/security/advisories/new)
  (Security → Report a vulnerability), or
- Contact a maintainer directly through the Lower Alabama AI community.

Please include:

- A description of the vulnerability and its potential impact
- Steps to reproduce (proof-of-concept if possible)
- Affected files, routes, or versions

We'll acknowledge your report as soon as we can, keep you updated on progress, and credit you
(if you wish) once a fix is released.

## Scope

Especially relevant areas:

- **Authentication & authorization** — Supabase Auth, role checks (Admin vs. Volunteer), RLS policies
- **The ingestion webhook** — `/api/ingest/pilot-report` (verify the SendGrid shared secret)
- **Cron endpoints** — the alert engine (verify the `CRON_SECRET`)
- **Data exposure** — leaking seafarer/volunteer contact details or service-role keys
- **Injection** — anywhere external input (emails, form data) reaches the database

## Good practices for contributors

- **Never commit secrets.** `.env.local` is gitignored — keep it that way. Use `.env.example`
  with placeholder values only.
- The **service-role key** is server-side only; never expose it to the browser.
- Validate and sanitize all external input (parsed emails, API request bodies).
- Keep dependencies updated; run `npm audit` and address advisories where practical.

Thank you for helping keep PortLink and the people it serves safe.
