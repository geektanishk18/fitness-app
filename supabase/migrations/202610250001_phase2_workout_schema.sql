create extension if not exists pgcrypto;

create type public.workout_session_status as enum ('in_progress', 'completed');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.training_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text,
  created_at timestamptz not null default now()
);

create table public.exercises (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  name text not null,
  focus text not null,
  created_at timestamptz not null default now()
);

create table public.training_plan_exercises (
  id uuid primary key default gen_random_uuid(),
  training_plan_id uuid not null references public.training_plans(id) on delete cascade,
  exercise_id uuid not null references public.exercises(id) on delete cascade,
  sort_order integer not null check (sort_order >= 0),
  prescribed_sets integer not null check (prescribed_sets > 0),
  prescribed_reps text not null,
  target_weight_kg numeric(7,2) not null check (target_weight_kg >= 0),
  unique (training_plan_id, exercise_id)
);

create table public.workout_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  training_plan_id uuid references public.training_plans(id) on delete set null,
  session_date date not null,
  status public.workout_session_status not null default 'in_progress',
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  unique (user_id, session_date)
);

create table public.exercise_logs (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.workout_sessions(id) on delete cascade,
  exercise_name text not null,
  focus text not null default '',
  sort_order integer not null check (sort_order >= 0),
  unique (session_id, exercise_name)
);

create table public.set_logs (
  id uuid primary key default gen_random_uuid(),
  exercise_log_id uuid not null references public.exercise_logs(id) on delete cascade,
  set_number integer not null check (set_number > 0),
  weight_kg numeric(7,2) not null check (weight_kg >= 0),
  reps integer not null check (reps > 0),
  completed boolean not null default false,
  completed_at timestamptz,
  unique (exercise_log_id, set_number)
);

create table public.body_measurements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  measured_at date not null,
  weight_kg numeric(6,2) check (weight_kg > 0),
  waist_cm numeric(6,2) check (waist_cm > 0),
  shoulders_cm numeric(6,2) check (shoulders_cm > 0),
  notes text,
  created_at timestamptz not null default now()
);

create index workout_sessions_user_date_idx on public.workout_sessions(user_id, session_date desc);
create index exercise_logs_session_idx on public.exercise_logs(session_id, sort_order);
create index set_logs_exercise_idx on public.set_logs(exercise_log_id, set_number);
create index body_measurements_user_date_idx on public.body_measurements(user_id, measured_at desc);

alter table public.profiles enable row level security;
alter table public.training_plans enable row level security;
alter table public.exercises enable row level security;
alter table public.training_plan_exercises enable row level security;
alter table public.workout_sessions enable row level security;
alter table public.exercise_logs enable row level security;
alter table public.set_logs enable row level security;
alter table public.body_measurements enable row level security;

create policy "profiles are private" on public.profiles for all using (id = auth.uid()) with check (id = auth.uid());
create policy "plans are private" on public.training_plans for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "exercises are private or shared" on public.exercises for select using (user_id = auth.uid() or user_id is null);
create policy "users manage their exercises" on public.exercises for insert with check (user_id = auth.uid());
create policy "users update their exercises" on public.exercises for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "plan exercises follow plan ownership" on public.training_plan_exercises for all using (exists (select 1 from public.training_plans p where p.id = training_plan_id and p.user_id = auth.uid())) with check (exists (select 1 from public.training_plans p where p.id = training_plan_id and p.user_id = auth.uid()));
create policy "sessions are private" on public.workout_sessions for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "exercise logs follow session ownership" on public.exercise_logs for all using (exists (select 1 from public.workout_sessions s where s.id = session_id and s.user_id = auth.uid())) with check (exists (select 1 from public.workout_sessions s where s.id = session_id and s.user_id = auth.uid()));
create policy "set logs follow session ownership" on public.set_logs for all using (exists (select 1 from public.exercise_logs e join public.workout_sessions s on s.id = e.session_id where e.id = exercise_log_id and s.user_id = auth.uid())) with check (exists (select 1 from public.exercise_logs e join public.workout_sessions s on s.id = e.session_id where e.id = exercise_log_id and s.user_id = auth.uid()));
create policy "measurements are private" on public.body_measurements for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
begin insert into public.profiles (id, display_name) values (new.id, coalesce(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1))); return new; end;
$$;

create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();
