# Adaptive Training Scheduler

**Purpose:** Keep workout scheduling deterministic and history-safe.

**Use when:** Changing availability, scheduling 4/5/6-day weeks, adding recovery rules, or supporting overrides.

**Principles:** The six-day template is authoritative; schedule selection is pure; completed history is immutable; manual overrides are explicit; AI is advisory only.

**Workflow:** Model template and availability, define deterministic ordering and recovery constraints, preserve completed sessions, apply override precedence, and test edge cases.

**Verification:** Unit-test all day counts, midweek changes, missing data, repeated runs, and history preservation.

**Avoid:** Randomness, date-dependent hidden behavior, rewriting completed workouts, or allowing AI output to mutate the program.
