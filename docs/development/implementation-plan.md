# Project V-Taper Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Deliver a secure, testable, deployable fitness PWA in independently verifiable phases.

**Architecture:** A Vite React client separates UI from domain logic, data access, and server integrations. During the architecture-first milestone, local/mock repositories are the active runtime and Supabase/Groq adapters are preparation-only seams. Vercel hosts the app; future privileged integrations remain server-side and bounded.

**Tech Stack:** React, Vite, strict TypeScript, Tailwind CSS, Supabase, Zod, Recharts, Vitest, Playwright, Vercel, Groq.

---

## Phase 0 — Engineering setup (complete)

- [x] Inspect repository, branch, working tree, and README.
- [x] Add `AGENTS.md`, root documentation, `.agent/skills/`, and this plan.
- [x] Establish testing, security, documentation, and phase-gate conventions.

## Phase 1 — Application foundation (complete)

- [x] Define acceptance criteria and inspect current scaffold.
- [x] Initialize/configure React/Vite, TypeScript strict mode, Tailwind-ready CSS tokens, linting, Vitest, and Playwright-ready tooling.
- [x] Establish design tokens, responsive shell, navigation, and dashboard skeleton.
- [x] Add reliable PWA manifest/install foundation.
- [x] Verify lint, typecheck, unit tests, E2E smoke flow, and production build.

## Phase 2 — Training plans and adaptive scheduling

- [ ] Define the six-day template, typed availability, overrides, and history-safe schedule contracts.
- [ ] Implement pure 4/5/6-day scheduling with recovery constraints and deterministic output.
- [ ] Add a local/mock schedule repository seam and connect the dashboard/workout views.
- [ ] Verify scheduler edge cases, UI flow, lint, typecheck, and production build.

## Phase 3 — Complete workout logging, history, and progression

- [x] Reuse the local/mock workout repository seam for session state and history.
- [ ] Add progressive-overload summaries and richer history views.
- [ ] Add unit/integration tests and critical mobile E2E coverage.

## Phase 4 — Nutrition tracking (complete)

- [x] Add food records, calories, macros, and daily summaries with validation.
- [x] Add Indian food data contracts and local/mock nutrition persistence.
- [x] Verify calculations and critical mobile flows.

## Phase 5 — Transformation tracking (complete)

- [x] Add weight, measurements, photos, charts, and trend analysis.
- [x] Verify local private-record boundaries and chart behavior.

## Phase 6 — AI coaching interface and recommendation architecture (complete)

- [x] Add bounded recommendation contracts and a simulated coaching interface.
- [x] Document the future server-side provider adapter without enabling credentials.
- [x] Verify no client secret exposure and no autonomous mutations.

## Phase 7 — Profile, personalization, settings, and preferences (complete)

- [x] Add profile, goals, preferences, settings, and personalization flows.
- [x] Persist locally with validation and explicit local-state labels.
- [x] Verify accessible forms and shared nutrition target wiring.

## Phase 8 — PWA, offline functionality, and synchronization architecture (complete)

- [x] Add install metadata, app icon, service worker, and app-shell/runtime asset caching.
- [x] Persist active workout state and queue local set/session mutations with retry/conflict contracts.
- [x] Surface online/offline state and local pending changes; keep runtime sync explicitly inactive.
- [x] Verify manifest assets, app-shell cache, offline reload, workout edit persistence, and online-return pending state in Chrome/Playwright.

## Phase 9 — Backend integration architecture (complete; unapplied by design)

- [x] Keep schema, RLS, environment, and repository boundaries documented without requiring credentials.
- [x] Define entity relationships, API contracts, ownership/RLS requirements, auth/AI boundaries, migration strategy, config, and portability.
- [x] Define typed repository, sync transport, archive, and environment contracts without a remote adapter.

## Phase 10 — Final testing, visual refinement, performance, and release preparation (complete)

- [x] Run lint, type/build, unit, browser E2E, and core-module UI smoke checks.
- [x] Replace the decorative WebGL visual with an SVG treatment and split heavy vendors; largest chunk is now below the warning threshold.
- [x] Update deployment guide, known limitations, changelog, and deploy a verified Preview.

## Phase gate

After each phase: review changed files, run relevant checks, fix failures, update docs/changelog, report actual results, and stop for authorization before the next phase.
