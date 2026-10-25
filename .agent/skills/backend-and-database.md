# Backend and Database

**Purpose:** Build secure Supabase-backed server flows.

**Use when:** Adding migrations, auth, persistence, server actions/routes, storage, or Edge Functions.

**Principles:** Validate inputs with Zod, derive ownership from the authenticated session, use RLS, and keep privileged keys server-side.

**Workflow:** Define the data contract, migration, indexes, RLS policy, server access function, error mapping, and tests together.

**Verification:** Apply migrations, test authorized and unauthorized access, inspect query boundaries, and confirm secrets are absent from client bundles.

**Avoid:** Trusting client IDs, service-role access from the browser, unbounded queries, and schema changes without documentation.
