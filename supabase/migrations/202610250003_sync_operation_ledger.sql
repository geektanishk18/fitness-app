-- Idempotency ledger for retrying browser outbox operations safely.
create table public.sync_operations (
  user_id uuid not null references auth.users(id) on delete cascade,
  operation_id text not null,
  entity text not null check (entity in ('workout_set', 'workout_session', 'nutrition_day', 'measurement', 'profile', 'coaching_checkin', 'progress_photo')),
  operation text not null check (operation in ('upsert', 'delete')),
  status text not null default 'pending' check (status in ('pending', 'acknowledged', 'conflict', 'permanent_error')),
  reason_code text,
  server_version integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, operation_id)
);
create index sync_operations_user_status_idx on public.sync_operations(user_id, status, created_at);
alter table public.sync_operations enable row level security;
create policy "users manage own sync operations" on public.sync_operations for all using (user_id = auth.uid()) with check (user_id = auth.uid());
