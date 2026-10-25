# Project Architecture

**Purpose:** Keep module boundaries simple and explicit.

**Use when:** Adding or reorganizing a feature, route, domain service, or integration.

**Principles:** UI renders; domain services decide; data access persists; integrations wrap external systems. Keep privileged operations server-side and avoid premature abstractions.

**Workflow:** Identify the owning boundary, define typed inputs/outputs, implement the smallest seam, and document non-obvious decisions.

**Verification:** Review imports for boundary violations, run type checks and targeted tests, and update the system overview when data flow changes.

**Avoid:** God components, shared mutable state, hidden ownership rules, and introducing services or dependencies without a current MVP need.
