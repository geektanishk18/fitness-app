# Project V-Taper Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Deliver a secure, testable, deployable fitness PWA in independently verifiable phases.

**Architecture:** A Vite React client separates UI from domain logic, data access, and server integrations. Supabase provides auth and persistence with RLS; Vercel hosts the app; Groq is accessed only server-side through bounded, validated requests.

**Tech Stack:** React, Vite, strict TypeScript, Tailwind CSS, Supabase, Zod, Recharts, Vitest, Playwright, Vercel, Groq.

---

## Phase 0 — Engineering setup (complete)

- [x] Inspect repository, branch, working tree, and README.
- [x] Add `AGENTS.md`, root documentation, `.agent/skills/`, and this plan.
- [x] Establish testing, security, documentation, and phase-gate conventions.

## Phase 1 — Application foundation

- [ ] Define acceptance criteria and inspect current scaffold.
- [x] Initialize/configure React/Vite, TypeScript strict mode, Tailwind-ready CSS tokens, linting, Vitest, and Playwright-ready tooling.
- [ ] Establish design tokens, responsive shell, navigation, and dashboard skeleton.
- [ ] Add reliable PWA manifest/install foundation.
- [ ] Verify lint, typecheck, unit tests, E2E smoke flow, and production build.

## Phase 2 — Supabase integration

- [ ] Define migrations for profiles and user-owned domain tables.
- [ ] Add RLS policies and server-side access patterns.
- [ ] Add auth/profile flows, seed strategy, `.env.example`, and schema documentation.
- [ ] Verify authenticated isolation and migration checks.

## Phase 3 — Adaptive scheduler

- [ ] Define training domain types and six-day template.
- [ ] Implement pure 4/5/6-day scheduling, recovery constraints, availability changes, and manual overrides.
- [ ] Add deterministic unit tests for history preservation and edge cases.

## Phase 4 — Active workout mode

- [ ] Implement sessions, exercise logging, rest timer, history, and progressive-overload summaries.
- [ ] Add unit/integration tests and critical mobile E2E coverage.

## Phase 5 — Nutrition

- [ ] Add food records, calories, macros, and daily summaries with validation.
- [ ] Document data contracts and verify calculations.

## Phase 6 — Transformation tracking

- [ ] Add weight, measurements, photos, charts, and trend analysis.
- [ ] Verify private storage access and chart behavior.

## Phase 7 — Basic AI coaching

- [ ] Add bounded server-side Groq integration and schemas.
- [ ] Store validated insights with explicit failure handling.
- [ ] Verify no client secret exposure and no autonomous mutations.

## Phase 8 — Deployment and verification

- [ ] Configure Vercel environment variables and deployment procedure.
- [ ] Verify production build, PWA installation, offline behavior, auth isolation, and critical workflows.
- [ ] Update deployment guide, known limitations, and changelog.

## Phase gate

After each phase: review changed files, run relevant checks, fix failures, update docs/changelog, report actual results, and stop for authorization before the next phase.
