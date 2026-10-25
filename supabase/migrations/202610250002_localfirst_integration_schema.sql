-- Architecture milestone: future authenticated sync schema.
-- Review and apply only after a Supabase project and migration test environment exist.

create table public.user_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  preferences jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  version integer not null default 1 check (version > 0)
);

create table public.plan_days (
  id uuid primary key default gen_random_uuid(),
  training_plan_id uuid not null references public.training_plans(id) on delete cascade,
  day_number integer not null check (day_number between 1 and 7),
  session_key text not null,
  unique (training_plan_id, day_number),
  unique (training_plan_id, session_key)
);
alter table public.training_plan_exercises add column plan_day_id uuid references public.plan_days(id) on delete cascade;
create index training_plan_exercises_day_idx on public.training_plan_exercises(plan_day_id, sort_order);

create table public.nutrition_days (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  local_date date not null,
  water_ml integer not null default 0 check (water_ml between 0 and 20000),
  updated_at timestamptz not null default now(),
  version integer not null default 1 check (version > 0),
  unique (user_id, local_date)
);
create table public.nutrition_entries (
  id uuid primary key default gen_random_uuid(),
  nutrition_day_id uuid not null references public.nutrition_days(id) on delete cascade,
  food_id text not null,
  food_name text not null,
  meal_category text not null check (meal_category in ('breakfast', 'lunch', 'dinner', 'snacks')),
  serving_grams numeric(8,2) not null check (serving_grams > 0 and serving_grams <= 5000),
  quantity numeric(7,2) not null default 1 check (quantity > 0 and quantity <= 100),
  calories_per_100g numeric(9,2) not null check (calories_per_100g >= 0),
  protein_per_100g numeric(8,2) not null check (protein_per_100g >= 0),
  carbs_per_100g numeric(8,2) not null check (carbs_per_100g >= 0),
  fat_per_100g numeric(8,2) not null check (fat_per_100g >= 0),
  updated_at timestamptz not null default now(),
  version integer not null default 1 check (version > 0)
);
create index nutrition_days_user_date_idx on public.nutrition_days(user_id, local_date desc);
create index nutrition_entries_day_idx on public.nutrition_entries(nutrition_day_id);

alter table public.body_measurements
  add column chest_cm numeric(6,2) check (chest_cm > 0),
  add column hips_cm numeric(6,2) check (hips_cm > 0),
  add column left_arm_cm numeric(6,2) check (left_arm_cm > 0),
  add column right_arm_cm numeric(6,2) check (right_arm_cm > 0),
  add column left_thigh_cm numeric(6,2) check (left_thigh_cm > 0),
  add column right_thigh_cm numeric(6,2) check (right_thigh_cm > 0),
  add column neck_cm numeric(6,2) check (neck_cm > 0),
  add column note text check (char_length(note) <= 500),
  add column version integer not null default 1 check (version > 0);
alter table public.workout_sessions add column version integer not null default 1 check (version > 0);
alter table public.exercise_logs add column version integer not null default 1 check (version > 0);
alter table public.set_logs add column version integer not null default 1 check (version > 0);

create table public.coaching_checkins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  checked_in_at timestamptz not null default now(),
  energy text check (energy in ('low', 'steady', 'high')),
  focus text check (focus in ('consistency', 'nutrition', 'progress')),
  note text check (char_length(note) <= 1000),
  created_at timestamptz not null default now()
);
create table public.coaching_recommendations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  checkin_id uuid references public.coaching_checkins(id) on delete set null,
  source text not null check (source in ('deterministic', 'mock', 'provider')),
  title text not null check (char_length(title) <= 160),
  message text not null check (char_length(message) <= 2000),
  action text check (char_length(action) <= 240),
  evidence jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index coaching_checkins_user_date_idx on public.coaching_checkins(user_id, checked_in_at desc);
create index coaching_recommendations_user_date_idx on public.coaching_recommendations(user_id, created_at desc);

create table public.progress_photos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  object_path text not null unique,
  captured_on date not null,
  content_type text not null check (content_type in ('image/jpeg', 'image/png', 'image/webp')),
  created_at timestamptz not null default now()
);
create index progress_photos_user_date_idx on public.progress_photos(user_id, captured_on desc);

alter table public.user_preferences enable row level security;
alter table public.plan_days enable row level security;
alter table public.nutrition_days enable row level security;
alter table public.nutrition_entries enable row level security;
alter table public.coaching_checkins enable row level security;
alter table public.coaching_recommendations enable row level security;
alter table public.progress_photos enable row level security;

create policy "users manage own preferences" on public.user_preferences for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "plan days follow plan ownership" on public.plan_days for all using (exists (select 1 from public.training_plans p where p.id = training_plan_id and p.user_id = auth.uid())) with check (exists (select 1 from public.training_plans p where p.id = training_plan_id and p.user_id = auth.uid()));
create policy "nutrition days are private" on public.nutrition_days for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "nutrition entries follow day ownership" on public.nutrition_entries for all using (exists (select 1 from public.nutrition_days d where d.id = nutrition_day_id and d.user_id = auth.uid())) with check (exists (select 1 from public.nutrition_days d where d.id = nutrition_day_id and d.user_id = auth.uid()));
create policy "coaching checkins are private" on public.coaching_checkins for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "coaching recommendations are private" on public.coaching_recommendations for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "progress photo metadata is private" on public.progress_photos for all using (user_id = auth.uid()) with check (user_id = auth.uid());

insert into storage.buckets (id, name, public)
values ('progress-photos', 'progress-photos', false)
on conflict (id) do update set public = false;
create policy "users read own progress photos" on storage.objects for select using (bucket_id = 'progress-photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "users upload own progress photos" on storage.objects for insert with check (bucket_id = 'progress-photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "users delete own progress photos" on storage.objects for delete using (bucket_id = 'progress-photos' and (storage.foldername(name))[1] = auth.uid()::text);
