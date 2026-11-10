-- Limite les tentatives de code d'accès rédacteur (anti force brute).
-- Après 5 codes invalides en 1 heure, le compte est bloqué jusqu'à ce que
-- la plus ancienne tentative ait plus d'une heure.

create table if not exists public.access_code_attempts (
  id bigint generated always as identity primary key,
  email text not null,
  attempted_at timestamptz not null default now()
);

create index if not exists access_code_attempts_email_time_idx
  on public.access_code_attempts (email, attempted_at desc);

-- Aucune policy : seule la fonction security definer ci-dessous y accède.
alter table public.access_code_attempts enable row level security;
revoke all on public.access_code_attempts from anon, authenticated;

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
  if current_email = '' then
    return jsonb_build_object('ok', false, 'error', 'Unauthorized');
  end if;

  delete from public.access_code_attempts
   where email = current_email
     and attempted_at <= now() - interval '1 hour';

  select count(*) into recent_failures
    from public.access_code_attempts
   where email = current_email
     and attempted_at > now() - interval '1 hour';

  if recent_failures >= 5 then
    return jsonb_build_object('ok', false, 'error', 'Too many attempts');
  end if;

  select path, value into code_path, code_value
    from public.kv_store
   where path like 'access_codes/%'
     and value ->> 'code' = p_code
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

  -- Succès : on efface les échecs précédents de ce compte
  delete from public.access_code_attempts where email = current_email;

  return jsonb_build_object('ok', true);
end;
$$;

revoke execute on function public.consume_access_code(text) from public, anon;
grant execute on function public.consume_access_code(text) to authenticated;

-- Nettoyage : on ne garde pas les tentatives au-delà de 24 h
delete from public.access_code_attempts where attempted_at < now() - interval '24 hours';
