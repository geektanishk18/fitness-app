# Database Schema

Phase 2 adds `supabase/migrations/202610250001_phase2_workout_schema.sql` with profiles, training plans, exercises, plan exercises, workout sessions, exercise logs, set logs, and body measurements. User-owned records reference `auth.users(id)` and every table has RLS enabled.

The workout flow creates one session per user/date, stores exercise and set logs, marks completion, and retrieves recent session history. The client uses only the public Supabase URL and anon key; the service-role key is not required by the browser and must never be exposed there.

Apply the migration through the Supabase SQL editor or CLI before enabling real sync. Verify both a signed-in user's access and a second user's denial for each user-owned table.
