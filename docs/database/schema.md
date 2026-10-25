# Database Schema

See [integration-architecture.md](../architecture/integration-architecture.md) for the canonical entity map, adapter contracts, migration sequence, ownership rules, and auth/provider boundaries. Migrations `202610250001_phase2_workout_schema.sql`, `202610250002_localfirst_integration_schema.sql`, and `202610250003_sync_operation_ledger.sql` have been applied to the linked Supabase project. They were run in order after checking for conflicting tables/types/policies/triggers/buckets.

The workout flow creates one session per user/date, stores exercise and set logs, marks completion, and retrieves recent session history. The client uses only the public Supabase URL and anon key; the service-role key is not required by the browser and must never be exposed there.

The read-only schema check returned HTTP 200 for all 16 application tables. A database catalog contract query confirmed RLS and at least one `auth.uid()` policy on every table, plus a private `progress-photos` bucket with three owner-scoped object policies. `supabase/tests/rls-policy-contract.sql` preserves this check. Migration versions are registered in Supabase, but the SQL Editor-applied ledger entries have empty statement arrays; the linked CLI can repair these without reapplying schema SQL.
