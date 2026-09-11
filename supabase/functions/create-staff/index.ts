import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const json = (body: Record<string, unknown>, status = 200) => new Response(
  JSON.stringify(body),
  { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
)

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  try {
    const authHeader = req.headers.get('Authorization') ?? ''
    const client = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: authHeader } } })
    const { data: { user } } = await client.auth.getUser()
    const { data: profile } = user ? await client.from('profiles').select('role').eq('id', user.id).single() : { data: null }
    if (!user || profile?.role !== 'admin') return json({ error: 'Admin access required' }, 403)

    const { name, phone, centre_id } = await req.json()
    const cleanPhone = String(phone ?? '').replace(/\D/g, '')
    if (!String(name ?? '').trim() || cleanPhone.length !== 10 || !centre_id) return json({ error: 'A name, valid 10-digit phone number, and centre are required' }, 400)

    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
    const temporary_password = crypto.randomUUID().slice(0, 12) + 'A!'
    const email = `${cleanPhone}@kisansetu.local`
    const { data, error } = await admin.auth.admin.createUser({ email, password: temporary_password, email_confirm: true, user_metadata: { name: String(name).trim(), phone: cleanPhone } })
    if (error || !data.user) return json({ error: error?.message ?? 'Could not create staff' }, 400)

    const { error: profileError } = await admin.from('profiles').update({ role: 'operator', centre_id }).eq('id', data.user.id)
    if (profileError) {
      await admin.auth.admin.deleteUser(data.user.id)
      return json({ error: profileError.message }, 500)
    }
    return json({ ok: true, temporary_password })
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'Unexpected operator service error' }, 500)
  }
})
