const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL
const publicKey = process.env.SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

if (!supabaseUrl || !publicKey) {
  console.error(`Missing names: ${[!supabaseUrl && 'SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL', !publicKey && 'SUPABASE_ANON_KEY/NEXT_PUBLIC_SUPABASE_ANON_KEY/NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY'].filter(Boolean).join(', ')}`)
  process.exitCode = 2
} else {
  console.log(`Supabase project host: ${new URL(supabaseUrl).hostname}`)
  try {
    const authResponse = await fetch(new URL('/auth/v1/settings', supabaseUrl), { headers: { apikey: publicKey, authorization: `Bearer ${publicKey}` } })
    console.log(`Supabase Auth settings: ${authResponse.status}`)
  } catch {
    console.log('Supabase Auth settings: network_error')
    process.exitCode = 1
  }
  const tables = [['profiles', 'id'], ['training_plans', 'id'], ['exercises', 'id'], ['training_plan_exercises', 'id'], ['workout_sessions', 'id'], ['exercise_logs', 'id'], ['set_logs', 'id'], ['body_measurements', 'id'], ['user_preferences', 'user_id'], ['plan_days', 'id'], ['nutrition_days', 'id'], ['nutrition_entries', 'id'], ['coaching_checkins', 'id'], ['coaching_recommendations', 'id'], ['progress_photos', 'id'], ['sync_operations', 'operation_id']]
  for (const [table, keyColumn] of tables) {
    try {
      const endpoint = new URL(`/rest/v1/${table}?select=${keyColumn}&limit=0`, supabaseUrl)
      const response = await fetch(endpoint, { headers: { apikey: publicKey, authorization: `Bearer ${publicKey}` } })
      let code = 'ok'
      if (!response.ok) {
        try { code = (await response.json()).code ?? 'request_failed' } catch { code = 'request_failed' }
      }
      console.log(`${table}: ${response.status} ${code}`)
    } catch {
      console.log(`${table}: network_error`)
      process.exitCode = 1
    }
  }
}
