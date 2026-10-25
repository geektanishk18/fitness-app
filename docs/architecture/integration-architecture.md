# Backend Integration Architecture

This document specifies the deployed Supabase integration and its remaining operator constraints.

## Domain entities and relationships

| Entity | Ownership and relationship | Local source / future table |
|---|---|---|
| Profile and preferences | One row per authenticated user | local settings / `profiles`, `user_preferences` |
| Training plan | Owned by user; has ordered plan days and exercises | deterministic template / `training_plans`, `plan_days`, `plan_exercises` |
| Exercise catalog | Shared read-only records or user-owned custom records | bundled catalog / `exercises` |
| Workout session | Owned by user; references optional plan and day | local workout/history / `workout_sessions` |
| Exercise log | Child of session; unique by exercise identity and order | session payload / `exercise_logs` |
| Set log | Child of exercise log; unique set number | active workout / `set_logs` |
| Nutrition day | Owned by user; unique per local calendar date; contains meal entries | local nutrition / `nutrition_days`, `nutrition_entries` |
| Body measurement | Owned by user; dated measurements | local transformation / `body_measurements` |
| Progress photo | Owned by user; private object plus metadata row | IndexedDB blob / private Storage bucket and `progress_photos` |
| Coaching check-in and recommendation | Owned by user; immutable dated snapshot referencing only minimized summary inputs | local coaching history / `coaching_checkins`, `coaching_recommendations` |
| Sync operation | Device queue item with stable operation ID and status; never treated as identity authority | `v-taper-offline-mutations`; future server idempotency ledger |

All user-owned remote rows carry `user_id` (or derive it through a parent with enforced RLS). Child insert/update policies must verify parent ownership. Never accept a client-supplied owner ID as authorization evidence.

## Repository contracts

Feature code depends on domain-shaped interfaces, not Supabase SDK types. Workout repositories expose `loadActive(date)`, `saveActive(session)`, `appendHistory(session)`, and `listHistory(range)`. Nutrition exposes `getDay(date)`, `saveDay(day)`, `getTargets()`, `saveTargets(targets)`. Transformation exposes measurement CRUD and photo metadata/blob operations. Profile exposes `getPreferences()` and `savePreferences()`. Each remote implementation derives identity from the authenticated session internally.

The synchronization transport accepts `{ operationId, entity, operation, recordId, baseVersion?, payload }` and returns one of four typed outcomes: `acknowledged` with server version, `conflict` with canonical record, `retryable_error`, or `permanent_error`. The queue processes in creation order, retains transient failures for a later attempt, and stops at the first blocked conflict or permanent error so later writes cannot pass it. A future coordinator will schedule bounded backoff. Conflict policy: field-level merge only for independent profile preferences; append-only records use stable IDs and idempotent upsert; active set records use server version compare-and-swap and require user resolution when both server and device changed the same set. Acknowledgement removal occurs only after durable server confirmation. The local queue covers profile, training, workout, nutrition, measurements, coaching check-ins, and photo metadata; photo bytes remain in local IndexedDB and require a later upload adapter. Queue behavior is tested without a transport implementation.

## Supabase migration strategy

Use forward-only timestamped SQL migrations. Baseline migration 001 contains profiles, training plans, exercise catalog, sessions, set logs, and measurements. Proposed migration 002 adds plan days, nutrition, preferences, measurements, coaching snapshots, photo metadata, version fields, uniqueness constraints, indexes, and private Storage policies. A later migration must add the server idempotency ledger before a remote sync adapter is enabled. Neither proposed migrations have been applied. Never edit an applied migration. Review SQL, apply to a disposable project, test cross-user access, then promote the migration separately from frontend deployment. Schema rollback is a new compensating migration, not destructive history rewrite.

RLS is enabled on every user-owned table. Profiles/preferences/measurements/nutrition/check-ins/recommendations are scoped to `auth.uid()`. Plans and sessions are user-owned. Child logs and plan joins use `exists` checks through the owning parent. Shared exercise rows are SELECT-only for clients. Storage object paths begin with the authenticated user's UUID and policies validate that first path segment. No service-role key ships to a client.

## Authentication and AI boundaries

Browser auth uses the public project URL and anon key only; each data request is still constrained by RLS. UI routes may hide signed-out features for usability but do not authorize data. Server endpoints validate the access token, derive the user ID, validate Zod request/response schemas, rate-limit, minimize context, and return bounded recommendations. Groq or another model credential is server-only. Provider output is untrusted data, validated and screened before display; it cannot write workouts, settings, or logs. The current mock provider is local and deterministic.

## Configuration and data portability

Validated names: `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are public browser values; `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and `GROQ_API_KEY` are server-only. Typed Zod schemas require a matching public URL/key pair or all required server values before an adapter starts. `.env.example` contains placeholders only. Never prefix a privileged key with `VITE_`.

The typed archive contract covers schema version, export timestamp, settings and training preferences, workout history, nutrition, measurements, and coaching notes; binary photos are exported separately or explicitly omitted with notice. Custom plans will be added if they become user-editable. Import validates every row, previews counts/errors, preserves stable IDs where safe, and commits transactionally. Migration from local-only state keeps an untouched export and uses idempotent operation IDs; local deletion is offered only after remote acknowledgement and user confirmation. No import/export UI or cloud migration is claimed complete yet.

## Environment states

The runtime remains local-first. Only mutations created after the device is linked to the first signed-in account are eligible for cloud sync; pre-existing queue entries are retained locally. The queue is account-bound and refuses to send another account's writes. Online authenticated sessions replay eligible operations in order using the public Supabase key and RLS. Retryable errors remain queued, permanent failures and conflicts block later eligible writes, and the database idempotency ledger prevents duplicate acknowledgement. A retry after a partial multi-request nutrition sync is idempotent by stable row IDs, but is not a database transaction. Legacy local records are not bulk-uploaded. Cloud reads hydrate only where a corresponding local record is absent, preserving local data.

The existing Vercel Production configuration supplies `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (or `NEXT_PUBLIC_SUPABASE_ANON_KEY`). Vite maps only these named public values, plus the legacy `VITE_SUPABASE_*` pair, into the client bundle. Preview and Development do not currently have those public variables. Service-role and database secrets are never read by client code. Groq remains a mock/local provider.

Migrations 001, 002, and the idempotency migration 003 were applied to the verified fresh Supabase project through its SQL Editor. A read-only preflight verified all 16 application tables, RLS, and the private photo bucket. The standard `supabase_migrations.schema_migrations` table records the three version/name pairs; because they were applied in the dashboard, their `statements` arrays are empty. The repository migration files remain canonical. To restore full CLI-generated statement history, link/authenticate the Supabase CLI and run `migration repair` for each version after marking the current ledger entries reverted; do not re-run the SQL migrations. The local Vercel CLI cannot pull the project's secret Postgres connection values.
