# Project V-Taper

Mobile-first fitness PWA for adaptive hypertrophy training, nutrition tracking, transformation monitoring, and bounded data-driven coaching.

## Status

Phase 2 workout data integration is implemented. With Supabase variables and an authenticated user, sessions and set logs sync to PostgreSQL; without them, the app clearly remains in local demo mode.

## Documentation

- `AGENTS.md` — project rules and locked architecture.
- `docs/development/implementation-plan.md` — phased delivery plan.
- `docs/architecture/system-overview.md` — intended system boundaries and data flow.
- `docs/product/requirements.md` and `docs/product/scope.md` — MVP requirements and boundaries.
- `.agent/skills/` — concise phase-specific engineering playbooks.
- `supabase/migrations/` — database schema and RLS migration.

## Planned stack

React + Vite, strict TypeScript, Tailwind CSS, Supabase, Zod, Vitest, Playwright, Recharts, and Vercel. See `docs/architecture/decisions.md` for rationale and constraints.

## Supabase setup

Copy `.env.example` to `.env.local`, set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`, and apply the migration in `supabase/migrations/`. The browser uses only the public anon key and RLS; never put `SUPABASE_SERVICE_ROLE_KEY` in a `VITE_` variable.
