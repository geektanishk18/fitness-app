# Deployment and Verification

**Purpose:** Ship only a demonstrably working build.

**Use when:** Preparing Vercel deployment, changing env/config, or validating production behavior.

**Principles:** Reproducible builds, explicit environment configuration, safe secrets, and end-to-end evidence.

**Workflow:** Validate local checks, configure non-secret variable names, build, deploy only with authorization, verify auth/RLS/PWA/critical flows, and document results.

**Verification:** Separate local, preview, and production evidence; record URLs and failures without exposing secrets.

**Avoid:** Deploying untested work, committing env files, skipping offline/auth checks, or claiming production success from a local build.
