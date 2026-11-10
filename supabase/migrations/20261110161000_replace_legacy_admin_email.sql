-- Retire l'ancien compte admin theseeconomists@gmail.com : ses droits passent
-- à econglobe26@gmail.com (seul compte admin du site).

-- ── kv_store : ajout / modification / suppression ─────────────
drop policy if exists "kv_store_authenticated_insert" on public.kv_store;
drop policy if exists "kv_store_authenticated_update" on public.kv_store;
drop policy if exists "kv_store_authenticated_delete" on public.kv_store;

create policy "kv_store_authenticated_insert"
on public.kv_store for insert to authenticated
with check (
  ((path like 'articles/%') and ((value ->> 'owner_id') = (select auth.uid())::text))
  or ((path like 'users/%') and (path = 'users/' || replace(replace(lower((select auth.jwt() ->> 'email')), '.', '_'), '@', '__at__')))
  or ((path like 'password_resets/%') and (path = 'password_resets/' || replace(replace(lower((select auth.jwt() ->> 'email')), '.', '_'), '@', '__at__')))
);

create policy "kv_store_authenticated_update"
on public.kv_store for update to authenticated
using (
  ((path like 'articles/%') and ((value ->> 'owner_id') = (select auth.uid())::text))
  or ((path like 'users/%') and (path = 'users/' || replace(replace(lower((select auth.jwt() ->> 'email')), '.', '_'), '@', '__at__')))
  or ((path like 'password_resets/%') and (path = 'password_resets/' || replace(replace(lower((select auth.jwt() ->> 'email')), '.', '_'), '@', '__at__')))
  or (lower((select auth.jwt() ->> 'email')) = 'econglobe26@gmail.com')
)
with check (
  ((path like 'articles/%') and ((value ->> 'owner_id') = (select auth.uid())::text))
  or ((path like 'users/%') and (path = 'users/' || replace(replace(lower((select auth.jwt() ->> 'email')), '.', '_'), '@', '__at__')))
  or ((path like 'password_resets/%') and (path = 'password_resets/' || replace(replace(lower((select auth.jwt() ->> 'email')), '.', '_'), '@', '__at__')))
  or (lower((select auth.jwt() ->> 'email')) = 'econglobe26@gmail.com')
);

create policy "kv_store_authenticated_delete"
on public.kv_store for delete to authenticated
using (
  ((path like 'articles/%') and ((value ->> 'owner_id') = (select auth.uid())::text))
  or ((path like 'users/%') and (path = 'users/' || replace(replace(lower((select auth.jwt() ->> 'email')), '.', '_'), '@', '__at__')))
  or ((path like 'password_resets/%') and (path = 'password_resets/' || replace(replace(lower((select auth.jwt() ->> 'email')), '.', '_'), '@', '__at__')))
  or (lower((select auth.jwt() ->> 'email')) = 'econglobe26@gmail.com')
);

-- ── profiles : suppression par l'admin ────────────────────────
drop policy if exists "profiles_admin_delete" on public.profiles;
create policy "profiles_admin_delete"
on public.profiles for delete to authenticated
using (lower(coalesce((select auth.jwt() ->> 'email'), '')) = 'econglobe26@gmail.com');

-- ── Modération des articles : seul l'admin publie directement ─
create or replace function public.enforce_article_moderation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if lower(coalesce(auth.jwt() ->> 'email', '')) <> 'econglobe26@gmail.com' then
    if tg_op = 'INSERT' and new.status = 'published' then
      new.status := 'pending';
    elsif tg_op = 'UPDATE' and old.status = 'published' and new.status <> 'published' then
      new.status := old.status;
    elsif tg_op = 'UPDATE' and old.status = 'pending' and new.status = 'published' then
      new.status := 'pending';
    end if;
  end if;
  return new;
end;
$$;
