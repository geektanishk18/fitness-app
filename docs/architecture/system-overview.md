# System Overview

## Boundaries

The Vite React client owns presentation and user interaction. Domain modules own scheduling, nutrition calculations, and transformation summaries. Browser local storage/IndexedDB own the active offline records and durable mutation queue. A service worker caches the application shell and same-origin assets. Supabase is a future adapter target only; it is not called by the local-first workout flow. Server-side routes/functions will own privileged work and AI provider access. Vercel hosts the application.

## Data flow

User input → client validation → local repository → durable local state and mutation queue → (future authenticated adapter) server boundary → Supabase query/RLS → typed acknowledgement. Conflict responses block the ordered queue for explicit resolution; retries preserve operation IDs and order. AI requests will use bounded, minimized context through a server-only provider adapter and return validated structured recommendations; they never mutate training templates. No cloud sync is active in the current milestone.

## MVP modules

Dashboard, authentication/profile, training scheduler, active workout mode, nutrition, transformation tracking, and coaching insights. Each module must keep its data access and domain rules independently testable.
