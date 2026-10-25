# Project V-Taper Engineering Guide

## Overview

Project V-Taper is a mobile-first fitness PWA for adaptive hypertrophy training, nutrition, transformation tracking, and bounded AI coaching.

## Locked decisions

- Next.js App Router, strict TypeScript, Tailwind CSS, Zod, Vitest, and Playwright.
- Supabase Auth/PostgreSQL/Storage/Edge Functions; Vercel hosting; Groq server-side AI.
- Dark, mobile-first UI; deterministic six-day training template scheduled for 4, 5, or 6 days.
- AI may recommend and summarize, but must not rewrite training programs or execute arbitrary actions.

## Engineering standards

Keep UI, domain logic, data access, and integrations separate. Validate external input with Zod, avoid `any`, never trust client ownership identifiers, and keep functions small and testable. Prefer the simplest design that satisfies the current phase.

## Security and privacy

Use RLS for every user-owned table. Keep privileged keys and Groq credentials server-side. Do not log fitness data or secrets unnecessarily. Provide `.env.example` with placeholders only.

## Testing and review

Before a phase is complete, review the diff, run applicable lint/type/unit/E2E/build checks, inspect security and error handling, and update documentation and `CHANGELOG.md`. Report only checks actually run.

## Phase rules

Work one independently verifiable phase at a time. Do not begin a later phase early. Record dependency-driven sequence changes in `docs/development/implementation-plan.md`. Stop after each phase for user authorization.

## Local playbooks

Read only the playbooks relevant to the current task in `.agent/skills/`: architecture, spec-driven development, frontend design, backend/database, adaptive scheduling, security/privacy, testing, code review, documentation, context efficiency, and deployment verification.
