-- Read-only schema/RLS contract test. Run in Supabase SQL Editor after migrations.
do $$
declare
  missing_tables text[];
  missing_photo_policies integer;
begin
  with expected(name) as (values
    ('profiles'), ('training_plans'), ('exercises'), ('training_plan_exercises'),
    ('workout_sessions'), ('exercise_logs'), ('set_logs'), ('body_measurements'),
    ('user_preferences'), ('plan_days'), ('nutrition_days'), ('nutrition_entries'),
    ('coaching_checkins'), ('coaching_recommendations'), ('progress_photos'), ('sync_operations')
  )
  select array_agg(e.name order by e.name) into missing_tables
  from expected e
  left join pg_namespace n on n.nspname = 'public'
  left join pg_class c on c.relnamespace = n.oid and c.relname = e.name and c.relkind = 'r'
  where c.oid is null
     or c.relrowsecurity is not true
     or not exists (
       select 1 from pg_policies p
       where p.schemaname = 'public'
         and p.tablename = e.name
         and concat_ws(' ', p.qual, p.with_check) ilike '%auth.uid%'
     );

  if missing_tables is not null then
    raise exception 'Missing RLS-backed tables or auth.uid policies: %', array_to_string(missing_tables, ', ');
  end if;

  if not exists (select 1 from storage.buckets where id = 'progress-photos' and public is false) then
    raise exception 'Progress photo bucket is missing or public.';
  end if;

  select count(*) into missing_photo_policies
  from pg_policies p
  where p.schemaname = 'storage' and p.tablename = 'objects'
    and p.policyname in ('users read own progress photos', 'users upload own progress photos', 'users delete own progress photos')
    and concat_ws(' ', p.qual, p.with_check) ilike '%auth.uid%';

  if missing_photo_policies <> 3 then
    raise exception 'Expected three owner-scoped progress photo storage policies, found %.', missing_photo_policies;
  end if;
end;
$$;
