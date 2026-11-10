import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ADMIN_EMAIL = "econglobe26@gmail.com";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return json({ error: "Missing Authorization header" }, 401);
    }

    const anonClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: { headers: { Authorization: authHeader } },
        auth: { persistSession: false, autoRefreshToken: false },
      },
    );

    const { data: userData, error: userError } =
      await anonClient.auth.getUser();
    const currentUser = userData?.user;

    if (userError || !currentUser) {
      return json({ error: "Unauthorized" }, 401);
    }

    if (
      currentUser.email?.trim().toLowerCase() !== ADMIN_EMAIL ||
      currentUser.app_metadata?.provider !== "google"
    ) {
      return json({ error: "Forbidden" }, 403);
    }

    const body = await req.json().catch(() => ({}));
    // Cible désignée par son identifiant de compte (immuable), jamais par e-mail
    const userId = String(body?.id || "").trim();
    if (!/^[0-9a-f-]{36}$/i.test(userId)) {
      return json({ error: "Missing or invalid user id" }, 400);
    }

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false, autoRefreshToken: false } },
    );

    const { data: target, error: getError } = await adminClient.auth.admin.getUserById(userId);
    if (getError || !target?.user) {
      return json({ error: "User not found in Supabase Auth" }, 404);
    }
    const targetUser = target.user;
    const email = (targetUser.email || "").trim().toLowerCase();

    if (targetUser.id === currentUser.id || email === ADMIN_EMAIL) {
      return json({ error: "Cannot delete the admin account" }, 400);
    }

    const { error: deleteAuthError } = await adminClient.auth.admin.deleteUser(targetUser.id);
    if (deleteAuthError) {
      return json({ error: deleteAuthError.message }, 500);
    }

    // Profil et données associées, par identifiant (et e-mail du compte pour les propositions)
    const { error: deleteProfileError } = await adminClient.from("profiles").delete().eq("id", targetUser.id);
    if (deleteProfileError) {
      return json({ error: deleteProfileError.message }, 500);
    }
    await adminClient.from("kv_store").delete().eq("path", "writer_sessions/" + targetUser.id);
    await adminClient.from("writer_grants").delete().eq("user_id", targetUser.id);
    if (email) {
      await adminClient.from("kv_store").delete().like("path", "proposals/%").eq("value->>email", email);
    }

    return json({ ok: true, deletedUserId: targetUser.id }, 200);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return json({ error: message }, 500);
  }
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
