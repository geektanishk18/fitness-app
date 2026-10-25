# Architecture Decisions

## ADR-001: Supabase and Vercel

Use Supabase for managed auth, PostgreSQL, storage, and edge operations; use Vercel for the Next.js deployment. This minimizes MVP infrastructure while preserving server-side boundaries and RLS.

## ADR-002: Deterministic scheduling

Workout scheduling is a pure, deterministic domain service. Availability changes must preserve completed history, and manual overrides are explicit user data. AI is advisory only.

## ADR-003: Server-side AI

Groq calls remain behind server boundaries. Inputs are bounded and validated; outputs are schema-validated before display or storage.
