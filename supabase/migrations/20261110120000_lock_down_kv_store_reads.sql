-- Sécurité kv_store (audit de lancement du 10/11/2026)
--
-- 1. "kv_store_authenticated_select" (using true) permettait à TOUT utilisateur
--    connecté de lire toute la table : codes d'accès, propositions (e-mails),
--    password_resets. On la remplace par des lectures ciblées.
-- 2. Les codes d'accès "génériques" (forEmail vide) étaient lisibles et
--    modifiables par n'importe qui. Désormais : admin uniquement. Les rédacteurs
--    valident leur code via la RPC consume_access_code (security definer).
-- 3. "kv_store_public_create_proposals" autorisait les visiteurs anonymes à
--    créer des propositions sans limite. Désormais : utilisateurs connectés,
--    statut "pending" et taille bornée.
--
-- ⚠️ Déployer d'abord la nouvelle version du site (js/editor.js ne lit plus
--    les codes côté client), puis appliquer cette migration.

-- ── 1. Lecture générale ──────────────────────────────────────
drop policy if exists "kv_store_authenticated_select" on public.kv_store;

create policy "kv_store_admin_select"
on public.kv_store
for select
to authenticated
using (lower(coalesce((select auth.jwt() ->> 'email'), '')) = 'econglobe26@gmail.com');

create policy "kv_store_own_password_reset_select"
on public.kv_store
for select
to authenticated
using (
  path = 'password_resets/' || replace(replace(lower((select auth.jwt() ->> 'email')), '.', '_'), '@', '__at__')
);

-- ── 2. Codes d'accès : admin uniquement ──────────────────────
drop policy if exists "kv_store_access_codes_select" on public.kv_store;
drop policy if exists "kv_store_access_codes_insert" on public.kv_store;
drop policy if exists "kv_store_access_codes_update" on public.kv_store;
drop policy if exists "kv_store_access_codes_delete" on public.kv_store;

create policy "kv_store_access_codes_admin_all"
on public.kv_store
for all
to authenticated
using (
  path like 'access_codes/%'
  and lower(coalesce((select auth.jwt() ->> 'email'), '')) = 'econglobe26@gmail.com'
)
with check (
  path like 'access_codes/%'
  and lower(coalesce((select auth.jwt() ->> 'email'), '')) = 'econglobe26@gmail.com'
);

-- ── 3. Propositions : connectés uniquement, taille bornée ────
drop policy if exists "kv_store_public_create_proposals" on public.kv_store;

create policy "kv_store_authenticated_create_proposals"
on public.kv_store
for insert
to authenticated
with check (
  path like 'proposals/%'
  and coalesce(value ->> 'status', '') = 'pending'
  and length(value::text) < 8000
);
