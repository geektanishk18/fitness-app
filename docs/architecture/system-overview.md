# System Overview

## Boundaries

The web client owns presentation and user interaction. Domain modules own scheduling, nutrition calculations, and transformation summaries. Supabase owns authentication, PostgreSQL persistence, storage, and selected Edge Functions. Server-side routes/functions own privileged work and the Groq integration. Vercel hosts the application.

## Data flow

User input → client validation → server boundary → authenticated Supabase query/RLS → domain result → typed UI state. AI requests use bounded, minimized context and return validated structured recommendations; they never mutate training templates.

## MVP modules

Dashboard, authentication/profile, training scheduler, active workout mode, nutrition, transformation tracking, and coaching insights. Each module must keep its data access and domain rules independently testable.
