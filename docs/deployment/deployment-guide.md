# Deployment Guide

The target is Vercel with Supabase project configuration and server-side Groq credentials. For the Phase 2 frontend, configure only `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` as public client variables. Secrets must be configured in the deployment environment, never committed. Production verification must cover build output, authentication, RLS isolation, PWA installation, offline behavior, and critical user workflows.
