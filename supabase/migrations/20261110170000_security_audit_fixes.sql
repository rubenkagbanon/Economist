-- Correctifs issus de l'audit de sécurité du 10/11/2026 (run-1).
-- À exécuter UNE FOIS, en entier, dans l'éditeur SQL Supabase.
-- Le site doit être mis à jour (js/*.js) AVANT ou en même temps : le client ne
-- lit plus profiles.email directement.

-- ════════════════════════════════════════════════════════════
-- 1. Identité admin : e-mail + fournisseur Google (comme les fonctions serveur)
-- ════════════════════════════════════════════════════════════
create or replace function public.is_admin()
returns boolean
language sql
stable
set search_path = public
as $$
  select lower(coalesce(auth.jwt() ->> 'email', '')) = 'econglobe26@gmail.com'
     and (
       coalesce(auth.jwt() -> 'app_metadata' ->> 'provider', '') = 'google'
       or coalesce(auth.jwt() -> 'app_metadata' -> 'providers', '[]'::jsonb) ? 'google'
     );
$$;
grant execute on function public.is_admin() to anon, authenticated;

-- articles : politiques admin
drop policy if exists "articles_admin_delete" on public.articles;
drop policy if exists "articles_admin_read"   on public.articles;
drop policy if exists "articles_admin_update" on public.articles;
create policy "articles_admin_delete" on public.articles for delete to authenticated using (public.is_admin());
create policy "articles_admin_read"   on public.articles for select to authenticated using (public.is_admin());
create policy "articles_admin_update" on public.articles for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- profiles : suppression admin
drop policy if exists "profiles_admin_delete" on public.profiles;
create policy "profiles_admin_delete" on public.profiles for delete to authenticated using (public.is_admin());

-- ════════════════════════════════════════════════════════════
-- 2. kv_store : anciens espaces supprimés, propositions liées au compte
-- ════════════════════════════════════════════════════════════
-- Anciennes données (avant la migration vers les tables profiles/articles)
delete from public.kv_store where path like 'users/%' or path like 'articles/%' or path like 'password_resets/%';

drop policy if exists "kv_store_public_read_articles"        on public.kv_store;
drop policy if exists "kv_store_public_read_profiles"        on public.kv_store;
drop policy if exists "kv_store_own_password_reset_select"   on public.kv_store;
drop policy if exists "kv_store_authenticated_insert"        on public.kv_store;
drop policy if exists "kv_store_authenticated_update"        on public.kv_store;
drop policy if exists "kv_store_authenticated_delete"        on public.kv_store;
drop policy if exists "kv_store_authenticated_create_proposals" on public.kv_store;
drop policy if exists "kv_store_admin_select"                on public.kv_store;
drop policy if exists "kv_store_access_codes_admin_all"      on public.kv_store;
drop policy if exists "kv_store_proposals_select"            on public.kv_store;
drop policy if exists "kv_store_proposals_insert"            on public.kv_store;
drop policy if exists "kv_store_proposals_update"            on public.kv_store;
drop policy if exists "kv_store_proposals_delete"            on public.kv_store;

-- L'admin gère tout kv_store
create policy "kv_store_admin_all" on public.kv_store for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Propositions : l'e-mail est celui du compte connecté, 5 en attente maximum
create policy "kv_store_proposals_insert" on public.kv_store for insert to authenticated
with check (
  path like 'proposals/%'
  and lower(coalesce(value ->> 'email', '')) = lower(coalesce(auth.jwt() ->> 'email', ''))
  and coalesce(value ->> 'status', '') = 'pending'
  and length(value::text) < 8000
  and (select count(*) from public.kv_store k
        where k.path like 'proposals/%'
          and lower(coalesce(k.value ->> 'email', '')) = lower(coalesce(auth.jwt() ->> 'email', ''))) < 5
);
create policy "kv_store_proposals_select" on public.kv_store for select to authenticated
  using (path like 'proposals/%' and lower(coalesce(value ->> 'email', '')) = lower(coalesce(auth.jwt() ->> 'email', '')));
create policy "kv_store_proposals_delete" on public.kv_store for delete to authenticated
  using (path like 'proposals/%' and lower(coalesce(value ->> 'email', '')) = lower(coalesce(auth.jwt() ->> 'email', '')));
-- (writer_sessions/<uid> : politiques existantes conservées)

-- ════════════════════════════════════════════════════════════
-- 3. Profils : e-mail non public et lié au compte
-- ════════════════════════════════════════════════════════════
-- Synchronise les e-mails existants sur ceux des comptes
update public.profiles p set email = lower(u.email)
  from auth.users u
 where u.id = p.id and p.email is distinct from lower(u.email);

create or replace function public.bind_profile_email()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null and new.id = auth.uid() then
    new.email := lower(coalesce(auth.jwt() ->> 'email', new.email));
    new.auth_provider := coalesce(auth.jwt() -> 'app_metadata' ->> 'provider', new.auth_provider);
  end if;
  return new;
end;
$$;
drop trigger if exists profiles_bind_email on public.profiles;
create trigger profiles_bind_email before insert or update on public.profiles
  for each row execute function public.bind_profile_email();

-- Lecture publique sans e-mail ni fournisseur
revoke select on public.profiles from anon, authenticated;
grant select (id, first, last, joined, avatar, bio, level) on public.profiles to anon, authenticated;

-- L'admin obtient les e-mails par une fonction dédiée
create or replace function public.admin_profile_emails()
returns table (id uuid, email text)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    return;
  end if;
  return query select p.id, p.email from public.profiles p;
end;
$$;
revoke execute on function public.admin_profile_emails() from public, anon;
grant execute on function public.admin_profile_emails() to authenticated;

-- ════════════════════════════════════════════════════════════
-- 4. Accès rédacteur vérifié côté serveur
-- ════════════════════════════════════════════════════════════
create table if not exists public.writer_grants (
  user_id uuid primary key,
  remaining integer not null default 0,
  updated_at timestamptz not null default now()
);
alter table public.writer_grants enable row level security;
revoke all on public.writer_grants from anon, authenticated;

create or replace function public.consume_access_code(p_code text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  current_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
  code_path text;
  code_value jsonb;
  used_count integer;
  max_count integer;
  assigned_email text;
  recent_failures integer;
begin
  if current_email = '' or auth.uid() is null then
    return jsonb_build_object('ok', false, 'error', 'Unauthorized');
  end if;

  delete from public.access_code_attempts
   where email = current_email and attempted_at <= now() - interval '1 hour';

  select count(*) into recent_failures
    from public.access_code_attempts
   where email = current_email and attempted_at > now() - interval '1 hour';

  if recent_failures >= 5 then
    return jsonb_build_object('ok', false, 'error', 'Too many attempts');
  end if;

  select path, value into code_path, code_value
    from public.kv_store
   where path like 'access_codes/%' and value ->> 'code' = p_code
   for update;

  if code_path is null then
    insert into public.access_code_attempts (email) values (current_email);
    return jsonb_build_object('ok', false, 'error', 'Invalid code');
  end if;

  assigned_email := lower(coalesce(code_value ->> 'forEmail', ''));
  if assigned_email <> '' and assigned_email <> current_email then
    insert into public.access_code_attempts (email) values (current_email);
    return jsonb_build_object('ok', false, 'error', 'Code not assigned to this account');
  end if;

  used_count := coalesce((code_value ->> 'used')::integer, 0);
  max_count := coalesce((code_value ->> 'max')::integer, 2);
  if used_count >= max_count then
    return jsonb_build_object('ok', false, 'error', 'Code exhausted');
  end if;

  update public.kv_store
     set value = jsonb_set(value, '{used}', to_jsonb(used_count + 1), true)
   where path = code_path;

  -- Droit d'écrire UN article, enregistré côté serveur
  insert into public.writer_grants (user_id, remaining)
  values (auth.uid(), 1)
  on conflict (user_id) do update
    set remaining = public.writer_grants.remaining + 1, updated_at = now();

  delete from public.access_code_attempts where email = current_email;
  return jsonb_build_object('ok', true);
end;
$$;
revoke execute on function public.consume_access_code(text) from public, anon;
grant execute on function public.consume_access_code(text) to authenticated;

-- Rédacteurs ayant déjà validé un code (session « draft » en cours) : un droit d'écriture
insert into public.writer_grants (user_id, remaining)
select substring(path from 'writer_sessions/(.*)')::uuid, 1
  from public.kv_store
 where path ~ '^writer_sessions/[0-9a-fA-F-]{36}$'
   and coalesce(value ->> 'status', '') = 'draft'
on conflict (user_id) do nothing;

-- ════════════════════════════════════════════════════════════
-- 5. Modération : rien n'est publié ni modifié sans validation
-- ════════════════════════════════════════════════════════════
create or replace function public.enforce_article_moderation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Admin, ou écriture interne autorisée (compteur de lectures)
  if public.is_admin() or current_setting('app.trusted_write', true) = 'on' then
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.status := 'pending';
    new.reads := 0;
    -- L'identifiant doit venir de next_article_id() (pas de réservation d'ids futurs)
    if new.id is null or new.id > (select last_value from public.article_id_seq) then
      raise exception 'invalid article id';
    end if;
    -- Un code d'accès consommé = un article
    update public.writer_grants
       set remaining = remaining - 1, updated_at = now()
     where user_id = auth.uid() and remaining > 0;
    if not found then
      raise exception 'writer access code required';
    end if;
  else
    -- UPDATE par l'auteur : statut, compteur, id et propriétaire figés
    new.id := old.id;
    new.owner_id := old.owner_id;
    new.reads := old.reads;
    new.status := old.status;
    -- Toute modification du contenu d'un article publié le renvoie en validation
    if old.status = 'published' and
       row(new.title, new.deck, new.cat, new.author, new.img, new.body, new.body_html, new.date, new.lang)
       is distinct from
       row(old.title, old.deck, old.cat, old.author, old.img, old.body, old.body_html, old.date, old.lang) then
      new.status := 'pending';
    end if;
  end if;

  return new;
end;
$$;
-- (déclencheur articles_moderation_trigger existant : BEFORE INSERT et BEFORE UPDATE)

-- ════════════════════════════════════════════════════════════
-- 6. Compteur de lectures : articles publiés seulement, plafonné
-- ════════════════════════════════════════════════════════════
create or replace function public.record_article_read(p_article_id bigint, p_visitor_key text default null)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  effective_visitor_key text;
  inserted_rows integer;
  recent_reads integer;
  recent_anon_reads integer;
begin
  if p_article_id is null or not exists (
    select 1 from public.articles where id = p_article_id and status = 'published'
  ) then
    return;
  end if;

  effective_visitor_key := coalesce(auth.uid()::text, nullif(trim(p_visitor_key), ''));
  if effective_visitor_key is null or length(effective_visitor_key) > 128 then
    return;
  end if;

  select count(*)::integer into recent_reads
    from public.article_read_events
   where visitor_key = effective_visitor_key and recorded_at > now() - interval '1 hour';
  if recent_reads >= 60 then
    return;
  end if;

  -- Visiteurs anonymes : au plus 300 nouvelles lectures par article et par heure
  if auth.uid() is null then
    select count(*)::integer into recent_anon_reads
      from public.article_read_events
     where article_id = p_article_id and recorded_at > now() - interval '1 hour';
    if recent_anon_reads >= 300 then
      return;
    end if;
  end if;

  insert into public.article_read_events(article_id, visitor_key)
  values (p_article_id, effective_visitor_key)
  on conflict (article_id, visitor_key) do nothing;
  get diagnostics inserted_rows = row_count;
  if inserted_rows = 0 then
    return;
  end if;

  perform set_config('app.trusted_write', 'on', true);
  update public.articles set reads = coalesce(reads, 0) + 1 where id = p_article_id;
  perform set_config('app.trusted_write', 'off', true);
end;
$$;

revoke execute on function public.next_article_id() from anon;

-- ════════════════════════════════════════════════════════════
-- 7. Tailles maximales (nouvelles écritures uniquement : NOT VALID)
-- ════════════════════════════════════════════════════════════
alter table public.profiles drop constraint if exists profiles_size_chk;
alter table public.profiles add constraint profiles_size_chk check (
  length(coalesce(avatar, '')) <= 600000 and length(coalesce(bio, '')) <= 2000
  and length(coalesce(first, '')) <= 80 and length(coalesce(last, '')) <= 80
  and length(coalesce(joined, '')) <= 40 and length(coalesce(level, '')) <= 40
) not valid;

alter table public.articles drop constraint if exists articles_size_chk;
alter table public.articles add constraint articles_size_chk check (
  length(coalesce(title, '')) <= 300 and length(coalesce(deck, '')) <= 600
  and length(coalesce(author, '')) <= 160 and length(coalesce(cat, '')) <= 60
  and length(coalesce(date, '')) <= 40 and length(coalesce(lang, '')) <= 5
  and length(coalesce(body, '')) <= 300000 and length(coalesce(body_html, '')) <= 6000000
  and length(coalesce(img, '')) <= 5000000
) not valid;

-- ════════════════════════════════════════════════════════════
-- 8. Journal d'envoi d'e-mails (limites appliquées par la fonction send-email)
-- ════════════════════════════════════════════════════════════
create table if not exists public.email_send_log (
  id bigint generated always as identity primary key,
  kind text not null,
  key text not null,
  sent_at timestamptz not null default now()
);
create index if not exists email_send_log_kind_key_time_idx on public.email_send_log (kind, key, sent_at desc);
alter table public.email_send_log enable row level security;
revoke all on public.email_send_log from anon, authenticated;
