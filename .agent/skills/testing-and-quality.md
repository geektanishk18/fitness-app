# Testing and Quality

**Purpose:** Make verification part of implementation.

**Use when:** Adding behavior, changing configuration, or closing a phase.

**Principles:** Test pure logic heavily, boundaries realistically, and critical journeys end-to-end. Prefer fast targeted checks before broad checks.

**Workflow:** Define acceptance checks, write focused tests, run them, inspect failures, review the diff, then run lint/type/build checks affected by the change.

**Verification:** Record exact commands and results; distinguish skipped, blocked, and passed checks.

**Avoid:** Tests that assert implementation details, suppressed failures, or claims based on unrun commands.
