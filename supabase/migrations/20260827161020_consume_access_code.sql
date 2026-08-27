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
begin
  if current_email = '' then
    return jsonb_build_object('ok', false, 'error', 'Unauthorized');
  end if;

  select path, value into code_path, code_value
    from public.kv_store
   where path like 'access_codes/%'
     and value ->> 'code' = p_code
   for update;

  if code_path is null then
    return jsonb_build_object('ok', false, 'error', 'Invalid code');
  end if;

  assigned_email := lower(coalesce(code_value ->> 'forEmail', ''));
  if assigned_email <> '' and assigned_email <> current_email then
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

  return jsonb_build_object('ok', true);
end;
$$;

revoke execute on function public.consume_access_code(text) from public, anon;
grant execute on function public.consume_access_code(text) to authenticated;