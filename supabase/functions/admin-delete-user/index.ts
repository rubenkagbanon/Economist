import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const ADMIN_EMAIL = (Deno.env.get('ADMIN_EMAIL') || '').trim().toLowerCase();

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return json({ error: 'Missing Authorization header' }, 401);
    }

    const anonClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: { headers: { Authorization: authHeader } },
        auth: { persistSession: false, autoRefreshToken: false }
      }
    );

    const { data: userData, error: userError } = await anonClient.auth.getUser();
    const currentUser = userData?.user;

    if (userError || !currentUser) {
      return json({ error: 'Unauthorized' }, 401);
    }

    if (!ADMIN_EMAIL || currentUser.email?.toLowerCase() !== ADMIN_EMAIL) {
      return json({ error: 'Forbidden' }, 403);
    }

    const body = await req.json().catch(() => ({}));
    const email = String(body?.email || '').trim().toLowerCase();

    if (!email) {
      return json({ error: 'Missing email' }, 400);
    }

    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: { persistSession: false, autoRefreshToken: false }
      }
    );

    const { data: usersData, error: listUsersError } = await adminClient.auth.admin.listUsers();
    if (listUsersError) {
      return json({ error: listUsersError.message }, 500);
    }

    const targetUser = usersData.users.find(
      (u) => (u.email || '').trim().toLowerCase() === email
    );

    if (!targetUser) {
      return json({ error: 'User not found in Supabase Auth' }, 404);
    }

    if (targetUser.email?.toLowerCase() === ADMIN_EMAIL) {
      return json({ error: 'Cannot delete the admin account' }, 400);
    }

    const { error: deleteAuthError } = await adminClient.auth.admin.deleteUser(targetUser.id);
    if (deleteAuthError) {
      return json({ error: deleteAuthError.message }, 500);
    }

    const { error: deleteProfileError } = await adminClient
      .from('profiles')
      .delete()
      .eq('email', email);

    if (deleteProfileError) {
      return json({ error: deleteProfileError.message }, 500);
    }

    return json({ ok: true, deletedEmail: email, deletedUserId: targetUser.id }, 200);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error';
    return json({ error: message }, 500);
  }
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};
