-- Correctif : la politique d'insertion des propositions relisait kv_store dans
-- sa propre condition, ce que Postgres refuse (« infinite recursion detected in
-- policy »). Cela bloquait TOUTE écriture des membres dans kv_store
-- (propositions, sessions de rédaction). Le comptage passe par une fonction
-- security definer, qui ne déclenche pas les politiques de la table.

create or replace function public.my_pending_proposals_count()
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::integer
    from public.kv_store
   where path like 'proposals/%'
     and lower(coalesce(value ->> 'email', '')) = lower(coalesce(auth.jwt() ->> 'email', ''));
$$;
revoke execute on function public.my_pending_proposals_count() from public, anon;
grant execute on function public.my_pending_proposals_count() to authenticated;

drop policy if exists "kv_store_proposals_insert" on public.kv_store;
create policy "kv_store_proposals_insert" on public.kv_store for insert to authenticated
with check (
  path like 'proposals/%'
  and lower(coalesce(value ->> 'email', '')) = lower(coalesce(auth.jwt() ->> 'email', ''))
  and coalesce(value ->> 'status', '') = 'pending'
  and length(value::text) < 8000
  and public.my_pending_proposals_count() < 5
);
