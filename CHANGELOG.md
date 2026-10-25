# Changelog

All notable project changes are recorded here.

## Unreleased

- Added Phase 0 engineering governance, project playbooks, documentation structure, and implementation plan.
- Added Phase 2 Supabase-ready workout persistence, schema migration, RLS policies, history retrieval, and explicit demo fallback.
- Reframed the roadmap as an architecture-first sequence: local/mock runtime first, backend adapters later.
- Added deterministic six-day training schedule contracts with 4/5/6-day selection, completion history, and explicit overrides.
- Added a lightweight SVG replacement for the decorative physique visual to remove WebGL startup and bundle cost.
- Added a local nutrition module with validated targets, Indian food catalog, deterministic macro calculations, dated meals, water logs, and dashboard summary.
- Verified nutrition add/edit/delete, serving-based recalculation, date history, water, refresh persistence, and dashboard consistency on Vercel Preview.
- Added local transformation measurements, dated history, weight and waist trend summaries, charting, and device-only IndexedDB photo storage.
- Verified multi-date measurement trends, history persistence after refresh, and chart rendering on Vercel Preview.
- Added local AI coaching architecture with typed provider contracts, deterministic summaries, mock recommendations, weekly check-ins, and recommendation history.
- Added local personalization settings for goals, target weight, training availability, units, nutrition targets, and privacy-first data controls.
- Added insufficient-data states and explicit separation between calculated insights and simulated coaching content.

- Added installable PWA metadata, a maskable SVG icon, service worker shell caching, and same-origin runtime asset caching.
- Made active workout edits persist locally immediately and queue future set/session mutations with retry and conflict contracts.
- Added explicit local-only online/offline and pending mutation status; no cloud synchronization is active.
- Documented backend entities, Supabase migration/RLS strategy, repository contracts, auth/AI boundaries, environment names, and portability requirements.
- Removed unused Three.js packages from the browser bundle while retaining the approved wireframe silhouette in SVG.
- Queued local profile, nutrition, measurement, check-in, and photo metadata mutations alongside workout changes.
- Added explicit conflict blocking, typed integration schemas, and a proposed unapplied Supabase integration migration.
- Verified offline reload and workout persistence in Chrome/Playwright; final JavaScript chunks remain below the Vite warning threshold.
- Connected Supabase email/password auth and authenticated outbox transport using Vercel Marketplace public variables with an explicit Vite allowlist.
- Added read-through hydration for remote workout history, nutrition, profile settings, measurements, coaching check-ins, and private progress photos while preserving existing local records.
- Applied migrations 001–003 to the linked Supabase project and verified all 16 tables, RLS, and private photo storage policies.
