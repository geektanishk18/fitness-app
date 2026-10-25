# Code Review

**Purpose:** Catch correctness, security, complexity, and scope problems before phase completion.

**Use when:** Reviewing a diff, preparing a commit, or closing a phase.

**Principles:** Review behavior and boundaries before style; prioritize actionable findings by impact.

**Workflow:** Read the diff, trace changed flows, inspect error and auth paths, check tests/docs, run relevant checks, and distinguish blockers from follow-ups.

**Verification:** Every finding cites a file/line and observable consequence; no finding is based only on preference.

**Avoid:** Rubber-stamping, broad rewrites, and feedback without a reproduction or clear fix.
