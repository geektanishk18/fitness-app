# Security and Privacy

**Purpose:** Protect personal fitness data and credentials.

**Use when:** Handling auth, user data, storage, logs, AI context, or deployment variables.

**Principles:** Least privilege, RLS, server-side secrets, input validation, minimized data exposure, and actionable but non-sensitive errors.

**Workflow:** Classify data, define ownership, enforce server and database controls, minimize logs/context, and test unauthorized paths.

**Verification:** Review env usage, RLS policies, logs, client bundles, and negative authorization tests.

**Avoid:** Committing secrets, logging photos/health details, public storage by default, or treating AI output as trusted commands.
