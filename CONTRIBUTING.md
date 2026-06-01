# Contributing to PortLink

Thanks for helping build PortLink! This is a volunteer, pro-bono project for a Catholic
maritime ministry at the Port of Mobile, organized through the Lower Alabama AI community.
Contributors of every experience level are welcome.

## Code of Conduct

By participating, you agree to uphold our [Code of Conduct](CODE_OF_CONDUCT.md). Please be
kind, patient, and welcoming — many contributors here are learning.

## Getting set up

See the [Getting started](README.md#getting-started) section of the README for full local
setup. The short version:

```bash
npm install
npm run setup   # starts Supabase, writes .env.local, applies migrations + seed
npm run dev
```

You'll need **Node.js 20+**, **Docker**, and the **Supabase CLI** installed first — the
README lists install commands.

## Finding something to work on

- Browse [open issues](https://github.com/ktg-motive/PortLink/issues).
- New here? Filter for the **`good first issue`** label — these are small and well-scoped.
- **Comment on an issue to claim it** before starting, so we don't duplicate work.
- Have an idea that isn't filed yet? Open an issue to discuss it before writing a large PR.

## Development workflow

1. **Fork** the repo and clone your fork.
2. **Branch** from `main` with a descriptive name:
   - `feat/device-checkout-confirmation`
   - `fix/pilot-report-time-parsing`
   - `docs/clarify-supabase-setup`
3. **Make your change.** Keep PRs focused — one logical change per PR.
4. **Check your work locally before pushing:**
   ```bash
   npm run lint     # must pass with no errors
   npm test         # must pass
   npm run build    # must succeed
   ```
5. **Commit** with a clear message (see below).
6. **Open a pull request** against `main` and fill out the PR template.

CI runs `lint`, `test`, and `build` on every PR — green checks are required before merge.

## Commit messages

Use clear, present-tense messages. A [Conventional Commits](https://www.conventionalcommits.org/)
style is appreciated but not required:

```
feat: add confirmation dialog before device checkout
fix: parse "AM"/"PM"-only sailing times as earliest reasonable hour
docs: document Inbucket for local magic-link testing
```

## Coding conventions

- **TypeScript** throughout — avoid `any`; prefer precise types.
- **Match the surrounding code** — naming, file layout, and component patterns.
- **No mock or placeholder code** in merged PRs — features should be functional end-to-end.
- **Tailwind** for styling; reuse existing tokens and `components/ui/` primitives.
- **Tests** — add or update Vitest tests for parser, scheduler, and other logic changes.
- Keep accessibility in mind (semantic HTML, labels, keyboard support).

## Database changes

Schema changes go through Supabase **migrations** in `supabase/migrations/`. Create a new
timestamped migration rather than editing existing ones:

```bash
supabase migration new my_change   # creates a timestamped file to edit
npm run db:reset                   # wipe + re-apply ALL migrations from scratch to verify
npm run db:types                   # regenerate src/types/database.ts to match the new schema
```

Always run `npm run db:reset` (not just `db push`) before opening the PR — it confirms your
migration applies cleanly on a brand-new database, the same way a new contributor's will.
Commit the regenerated `src/types/database.ts` alongside the migration.

## Reporting bugs & requesting features

Use the issue templates:

- **Bug report** — steps to reproduce, expected vs. actual behavior.
- **Feature request** — the problem you're solving and who benefits.

For **security vulnerabilities**, do **not** open a public issue — follow [SECURITY.md](SECURITY.md).

## Questions?

Start a [GitHub Discussion](https://github.com/ktg-motive/PortLink/discussions) or open an
[issue](https://github.com/ktg-motive/PortLink/issues) — and feel free to ask in the Lower
Alabama AI community. Thanks for contributing! ⚓
